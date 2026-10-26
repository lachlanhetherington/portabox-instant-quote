/**
 * Zepto NPP / PayID & Virtual Account Electronic Funds Transfer (EFT) Service
 * Implements Option 1: Auto-generated unique reference code, dynamic PayID,
 * and unique Virtual BSB/Account Number per order/invoice with instant Osko/NPP
 * webhook reconciliation synced two-way with Smartsheet and Customer Portal.
 */

import {
  CustomerAccount,
  loadCustomerAccounts,
  saveCustomerAccounts,
  setCurrentUserSession,
  getCurrentUserSession,
} from './customerPortalService';
import {
  loadSmartsheetStagingRows,
  saveSmartsheetStagingRows,
  loadSmartsheetInvoices,
  loadSmartsheetConfig,
  saveSmartsheetConfig,
  notifySmartsheetTwoWaySync,
} from './smartsheetService';

export interface ZeptoEftInstruction {
  id: string;
  referenceCode: string; // e.g. ZP-PB-9841-JENK
  payIdEmail: string; // e.g. pb.9841.jenk@pay.portabox.com.au
  virtualBsb: string; // e.g. 802-985 (Zepto / Cuscal NPP BSB)
  virtualAccountNumber: string; // Unique 9-digit virtual account number per invoice
  accountName: string; // Portabox Trust & Clearing (NPP)
  amountAud: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDescription: string;
  orderNumber?: string;
  invoiceNumber?: string;
  status: 'Awaiting Transfer' | 'Remittance Submitted' | 'Cleared (NPP Instant)' | 'Expired';
  createdAt: string;
  clearedAt?: string;
  nppTransactionId?: string;
  bankReceiptRef?: string;
}

const ZEPTO_EFT_RECORDS_KEY = 'portabox_zepto_eft_records_v1';

const SEED_ZEPTO_RECORDS: ZeptoEftInstruction[] = [
  {
    id: 'ZEP-1001',
    referenceCode: 'ZP-PB-9841-JENK',
    payIdEmail: 'pb.9841.jenk@pay.portabox.com.au',
    virtualBsb: '802-985',
    virtualAccountNumber: '904984101',
    accountName: 'Portabox Australia NPP Clearing',
    amountAud: 259,
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.jenkins@gmail.com',
    customerPhone: '0412 849 201',
    orderDescription: 'Monthly Storage Rent (Large 25 m³) - Oct 2026',
    orderNumber: 'PBO-9841',
    invoiceNumber: 'INV-2026-1012',
    status: 'Awaiting Transfer',
    createdAt: '10 Oct 2026 09:15 AM',
  },
  {
    id: 'ZEP-1002',
    referenceCode: 'ZP-PB-8912-MILL',
    payIdEmail: 'pb.8912.mill@pay.portabox.com.au',
    virtualBsb: '802-985',
    virtualAccountNumber: '904891202',
    accountName: 'Portabox Australia NPP Clearing',
    amountAud: 220,
    customerName: 'David Miller',
    customerEmail: 'david.miller@builderpro.com.au',
    customerPhone: '0433 912 304',
    orderDescription: 'Heavy duty moving blankets order (10x pack)',
    orderNumber: 'PBO-8912',
    invoiceNumber: 'INV-2026-0925',
    status: 'Remittance Submitted',
    bankReceiptRef: 'CBA-OSKO-884120',
    createdAt: '09 Oct 2026 02:40 PM',
  },
];

export function loadZeptoEftRecords(): ZeptoEftInstruction[] {
  try {
    const raw = localStorage.getItem(ZEPTO_EFT_RECORDS_KEY);
    if (!raw) {
      localStorage.setItem(ZEPTO_EFT_RECORDS_KEY, JSON.stringify(SEED_ZEPTO_RECORDS));
      return SEED_ZEPTO_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_ZEPTO_RECORDS;
  } catch {
    return SEED_ZEPTO_RECORDS;
  }
}

export function saveZeptoEftRecords(records: ZeptoEftInstruction[]): void {
  try {
    localStorage.setItem(ZEPTO_EFT_RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save Zepto EFT records:', err);
  }
}

/**
 * Deterministically or dynamically generate a Zepto NPP Payment Instruction
 * with an auto-generated reference code, unique virtual account number, and PayID.
 */
export function generateZeptoEftInstruction(params: {
  amountAud: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDescription: string;
  orderNumber?: string;
  invoiceNumber?: string;
}): ZeptoEftInstruction {
  const cleanName = (params.customerName || 'CUST')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X');

  // Create a 4-digit deterministic hash from customer + amount + description so it stays stable during checkout
  const seedStr = `${params.customerEmail}-${params.amountAud}-${params.orderNumber || params.invoiceNumber || params.orderDescription}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) % 9000;
  }
  const fourDigitCode = String(1000 + Math.abs(hash)).slice(0, 4);

  const referenceCode = `ZP-PB-${fourDigitCode}-${cleanName}`;
  const payIdEmail = `pb.${fourDigitCode}.${cleanName.toLowerCase()}@pay.portabox.com.au`;
  const virtualBsb = '802-985'; // Zepto / Cuscal NPP Virtual BSB
  const virtualAccountNumber = `904${fourDigitCode}${String(params.amountAud % 100).padStart(2, '0')}`;

  return {
    id: `ZEP-${fourDigitCode}`,
    referenceCode,
    payIdEmail,
    virtualBsb,
    virtualAccountNumber,
    accountName: 'Portabox Australia NPP Clearing',
    amountAud: params.amountAud,
    customerName: params.customerName || 'Valued Customer',
    customerEmail: params.customerEmail || 'customer@portabox.com.au',
    customerPhone: params.customerPhone || '1800 467 637',
    orderDescription: params.orderDescription,
    orderNumber: params.orderNumber,
    invoiceNumber: params.invoiceNumber,
    status: 'Awaiting Transfer',
    createdAt: new Date().toLocaleString('en-AU'),
  };
}

/**
 * Register or update a Zepto EFT instruction when a customer lodges a transfer or triggers instant NPP settlement
 */
export function settleOrRegisterZeptoEftPayment(params: {
  instruction: ZeptoEftInstruction;
  mode: 'instant_npp_webhook' | 'remittance_submitted';
  bankReceiptRef?: string;
}): {
  updatedInstruction: ZeptoEftInstruction;
  nppTransactionId: string;
} {
  const records = loadZeptoEftRecords();
  const nppTxnId =
    params.mode === 'instant_npp_webhook'
      ? `zepto_npp_${params.instruction.referenceCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`
      : `zepto_pending_${params.instruction.referenceCode}`;

  const updated: ZeptoEftInstruction = {
    ...params.instruction,
    status: params.mode === 'instant_npp_webhook' ? 'Cleared (NPP Instant)' : 'Remittance Submitted',
    clearedAt: params.mode === 'instant_npp_webhook' ? new Date().toLocaleString('en-AU') : undefined,
    nppTransactionId: nppTxnId,
    bankReceiptRef: params.bankReceiptRef || params.instruction.referenceCode,
  };

  const existingIdx = records.findIndex((r) => r.referenceCode === updated.referenceCode);
  if (existingIdx >= 0) {
    records[existingIdx] = updated;
  } else {
    records.unshift(updated);
  }
  saveZeptoEftRecords(records);

  // If cleared via Zepto NPP Webhook, also reconcile matching Customer Account, Invoice & Smartsheet rows
  if (params.mode === 'instant_npp_webhook') {
    reconcileZeptoWebhookAcrossApp(updated);
  } else {
    // Log remittance notice to Smartsheet sync history
    const config = loadSmartsheetConfig();
    config.lastSyncTime = new Date().toLocaleString('en-AU');
    config.syncHistory = [
      {
        id: `sync-zepto-${Date.now()}`,
        timestamp: config.lastSyncTime,
        direction: 'outbound_api',
        sheetName: 'Sheet 2: Invoices & EFT Ledger',
        action: `Zepto EFT Remittance Logged (${updated.referenceCode})`,
        rowsAffected: 1,
        status: 'warning',
        details: `Customer ${updated.customerName} submitted EFT transfer notification for $${updated.amountAud} using auto-generated ref ${updated.referenceCode} (PayID: ${updated.payIdEmail}). Awaiting Zepto NPP webhook clearance.`,
      },
      ...(config.syncHistory || []).slice(0, 29),
    ];
    saveSmartsheetConfig(config);
    notifySmartsheetTwoWaySync({
      source: 'zepto-eft',
      summary: `EFT Remittance ${updated.referenceCode} logged`,
    });
  }

  return {
    updatedInstruction: updated,
    nppTransactionId: nppTxnId,
  };
}

/**
 * Reconciles a Zepto EFT instruction across Customer Accounts, Smartsheet Staging Rows, and Smartsheet Invoices
 */
export function reconcileZeptoWebhookAcrossApp(instruction: ZeptoEftInstruction): void {
  const nowStr = new Date().toLocaleString('en-AU');
  const nppId =
    instruction.nppTransactionId ||
    `zepto_npp_${instruction.referenceCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  // 1. Update record in Zepto store
  const records = loadZeptoEftRecords().map((r) =>
    r.referenceCode === instruction.referenceCode
      ? {
          ...r,
          status: 'Cleared (NPP Instant)' as const,
          clearedAt: nowStr,
          nppTransactionId: nppId,
        }
      : r
  );
  saveZeptoEftRecords(records);

  // 2. Update Customer Portal accounts if matching email/invoice/order exists
  const accounts = loadCustomerAccounts();
  let matchedCustomer: CustomerAccount | null = null;
  const updatedAccounts = accounts.map((acc) => {
    const emailMatch = acc.email.toLowerCase() === instruction.customerEmail.toLowerCase();
    const orderMatch =
      instruction.orderNumber && acc.orders.some((o) => o.orderNumber === instruction.orderNumber);
    const invMatch =
      instruction.invoiceNumber &&
      acc.transactions.some((t) => t.invoiceNumber === instruction.invoiceNumber);

    if (!emailMatch && !orderMatch && !invMatch) return acc;

    const updatedTxns = acc.transactions.map((t) => {
      if (
        (instruction.invoiceNumber && t.invoiceNumber === instruction.invoiceNumber) ||
        (t.status !== 'Paid' && t.amount === instruction.amountAud)
      ) {
        return {
          ...t,
          status: 'Paid' as const,
          paymentMethod: `EFT / PayID (${instruction.referenceCode} via Zepto NPP)`,
          transactionId: nppId,
        };
      }
      return t;
    });

    const updatedAcc: CustomerAccount = {
      ...acc,
      lastSmartsheetSyncNote: `Zepto NPP Webhook reconciled $${instruction.amountAud} for ref ${instruction.referenceCode}`,
      lastSmartsheetSyncAt: nowStr,
      transactions: updatedTxns,
    };
    matchedCustomer = updatedAcc;
    return updatedAcc;
  });

  saveCustomerAccounts(updatedAccounts);
  const currentSession = getCurrentUserSession();
  if (currentSession && matchedCustomer && currentSession.id === (matchedCustomer as CustomerAccount).id) {
    setCurrentUserSession(matchedCustomer);
  }

  // 3. Update Smartsheet Staging Rows
  const stagingRows = loadSmartsheetStagingRows().map((row) => {
    if (
      (instruction.orderNumber && row.orderNumber === instruction.orderNumber) ||
      row.customerEmail.toLowerCase() === instruction.customerEmail.toLowerCase()
    ) {
      return {
        ...row,
        paymentStatus: 'Paid' as const,
        amountPaid: Math.max(row.amountPaid, instruction.amountAud),
        balanceDueAud: 0,
        braintreeTransactionId: `${instruction.referenceCode} (${nppId})`,
        operationalHold: false,
        operationalHoldReason: undefined,
        lastUpdatedBy: 'Call Center Smartsheet' as const,
        lastSyncedTimestamp: nowStr,
      };
    }
    return row;
  });
  saveSmartsheetStagingRows(stagingRows);

  // 4. Rebuild Smartsheet Invoice Rows from updated Customer Accounts
  loadSmartsheetInvoices();

  // 5. Append Smartsheet Sync Log
  const config = loadSmartsheetConfig();
  config.lastSyncTime = nowStr;
  config.syncHistory = [
    {
      id: `sync-zepto-cleared-${Date.now()}`,
      timestamp: nowStr,
      direction: 'inbound_webhook',
      sheetName: 'Sheet 2: Invoices & EFT Ledger',
      action: `Zepto NPP Webhook Auto-Reconciled (${instruction.referenceCode})`,
      rowsAffected: 2,
      status: 'success',
      details: `Received instant Osko/NPP settlement of $${instruction.amountAud} AUD for Virtual Acct ${instruction.virtualBsb} ${instruction.virtualAccountNumber} / Ref ${instruction.referenceCode}. Marked PAID & released yard dispatch hold.`,
    },
    ...(config.syncHistory || []).slice(0, 29),
  ];
  saveSmartsheetConfig(config);

  notifySmartsheetTwoWaySync({
    source: 'zepto-npp-webhook',
    summary: `Zepto EFT ${instruction.referenceCode} ($${instruction.amountAud}) auto-reconciled`,
    orderNumber: instruction.orderNumber,
  });
}
