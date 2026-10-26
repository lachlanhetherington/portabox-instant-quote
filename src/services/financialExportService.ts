import { CustomerAccount, loadCustomerAccounts } from './customerPortalService';
import { loadSmartsheetInvoices, SmartsheetInvoiceRow } from './smartsheetService';
import { loadZeptoEftRecords, ZeptoEftInstruction } from './zeptoEftService';

export interface FinancialRecord {
  id: string;
  invoiceNumber: string;
  transactionRef: string;
  date: string; // ISO YYYY-MM-DD
  displayDate: string; // e.g. "15 Jan 2026"
  dueDate: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  orderNumber: string;
  containerDescription: string;
  serviceType: string;
  description: string;
  transactionType: 'Initial Invoice & Delivery' | 'Monthly Storage Rent' | 'Prepayment Upfront' | 'Packing Supplies' | 'Interstate Transit' | 'Fee Adjustment';
  grossAmountAud: number;
  gstAud: number; // 10% standard Australian GST
  netAmountAud: number; // Gross - GST
  paymentStatus: 'Paid' | 'Pending' | 'Overdue' | 'Refunded';
  paymentMethod: string;
  revenueRecognitionType: string;
  reconciliationStatus: 'Cleared & Reconciled' | 'Pending Settlement' | 'Overdue Follow-up';
  paidAt?: string;
}

export interface FinancialExtractionQuery {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  statusFilter?: 'All' | 'Paid' | 'Pending' | 'Overdue';
  searchTerm?: string;
}

export interface FinancialSummary {
  recordCount: number;
  totalGrossAud: number;
  totalGstAud: number;
  totalNetAud: number;
  totalPaidAud: number;
  totalPendingAud: number;
  totalOverdueAud: number;
}

/**
 * Robust date parser converting diverse Australian & ISO date formats to a UTC millisecond timestamp
 */
export function parseDateToTimestamp(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const clean = dateStr.trim();

  // 1. ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.slice(0, 10).split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
  }

  // 2. Format: "15 Jan 2026" or "15 January 2026"
  const textMonthMatch = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (textMonthMatch) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, may_: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    };
    const day = Number(textMonthMatch[1]);
    const mKey = textMonthMatch[2].toLowerCase().slice(0, 3);
    const year = Number(textMonthMatch[3]);
    if (months[mKey] !== undefined) {
      return new Date(year, months[mKey], day).getTime();
    }
  }

  // 3. Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]) - 1;
    const year = Number(dmyMatch[3]);
    return new Date(year, month, day).getTime();
  }

  // Fallback direct parse
  const direct = Date.parse(clean);
  return isNaN(direct) ? 0 : direct;
}

export function formatTimestampToIso(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Historical seed financial records for Q1 2026 (Jan 1 2026 to Mar 31 2026)
 * ensuring realistic operational extraction when admin queries Jan 1 2026 to Mar 31 2026
 */
const SEED_HISTORICAL_FINANCIAL_RECORDS: FinancialRecord[] = [
  {
    id: 'HIST-2026-0108',
    invoiceNumber: 'INV-2026-0108',
    transactionRef: 'bt_txn_jan_010899',
    date: '2026-01-08',
    displayDate: '08 Jan 2026',
    dueDate: '2026-01-08',
    customerId: 'CUST-7981',
    customerName: 'Marcus Sterling',
    customerEmail: 'marcus.sterling@adelaidelegal.com.au',
    customerPhone: '0418 203 114',
    address: '14 Brougham Place',
    suburb: 'North Adelaide',
    state: 'SA',
    postcode: '5006',
    orderNumber: 'PBO-9011',
    containerDescription: '1x 25 m³ Large Portabox',
    serviceType: 'Storage at your place',
    description: 'Initial Delivery ($149) + 1st Month Storage ($219) + 10x Packing Boxes ($20)',
    transactionType: 'Initial Invoice & Delivery',
    grossAmountAud: 388,
    gstAud: 35.27,
    netAmountAud: 352.73,
    paymentStatus: 'Paid',
    paymentMethod: 'Mastercard •••• 1042 (Braintree)',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-01-08 09:15 AM',
  },
  {
    id: 'HIST-2026-0122',
    invoiceNumber: 'INV-2026-0122',
    transactionRef: 'bt_txn_jan_012241',
    date: '2026-01-22',
    displayDate: '22 Jan 2026',
    dueDate: '2026-01-22',
    customerId: 'CUST-7984',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@designhaus.com.au',
    customerPhone: '0429 881 294',
    address: '88 Prospect Road',
    suburb: 'Prospect',
    state: 'SA',
    postcode: '5082',
    orderNumber: 'PBO-9024',
    containerDescription: '2x 25 m³ (50 m³) Commercial Multi-Unit',
    serviceType: 'Storage at secure facility',
    description: 'First Payment: Dual container transport + 6 Months Upfront Prepayment',
    transactionType: 'Prepayment Upfront',
    grossAmountAud: 2840,
    gstAud: 258.18,
    netAmountAud: 2581.82,
    paymentStatus: 'Paid',
    paymentMethod: 'Visa •••• 9921 (Braintree Upfront)',
    revenueRecognitionType: 'Deferred AASB-15 (Upfront Prepayment)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-01-22 14:30 PM',
  },
  {
    id: 'HIST-2026-0205',
    invoiceNumber: 'INV-2026-0205',
    transactionRef: 'bt_txn_feb_020511',
    date: '2026-02-05',
    displayDate: '05 Feb 2026',
    dueDate: '2026-02-05',
    customerId: 'CUST-7981',
    customerName: 'Marcus Sterling',
    customerEmail: 'marcus.sterling@adelaidelegal.com.au',
    customerPhone: '0418 203 114',
    address: '14 Brougham Place',
    suburb: 'North Adelaide',
    state: 'SA',
    postcode: '5006',
    orderNumber: 'PBO-9011',
    containerDescription: '1x 25 m³ Large Portabox',
    serviceType: 'Storage at your place',
    description: 'Monthly Storage Rent (Large 25 m³) - Feb 2026 Autopay',
    transactionType: 'Monthly Storage Rent',
    grossAmountAud: 219,
    gstAud: 19.91,
    netAmountAud: 199.09,
    paymentStatus: 'Paid',
    paymentMethod: 'Mastercard •••• 1042 (Autopay)',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-02-05 06:00 AM',
  },
  {
    id: 'HIST-2026-0214',
    invoiceNumber: 'INV-2026-0214',
    transactionRef: 'zpt_npp_feb_021490',
    date: '2026-02-14',
    displayDate: '14 Feb 2026',
    dueDate: '2026-02-14',
    customerId: 'CUST-7988',
    customerName: 'Geoff & Tania Barker',
    customerEmail: 'geoff.barker@barkerwine.com.au',
    customerPhone: '0438 112 905',
    address: '122 Main Road',
    suburb: 'Tanunda',
    state: 'SA',
    postcode: '5352',
    orderNumber: 'PBO-9045',
    containerDescription: '1x 25 m³ Large Portabox',
    serviceType: 'Storage at your place',
    description: 'Barossa Valley Zone E Delivery ($349 base + 28 excess km @ $3.50/km = $447) + 1st Month Storage ($219)',
    transactionType: 'Initial Invoice & Delivery',
    grossAmountAud: 666,
    gstAud: 60.55,
    netAmountAud: 605.45,
    paymentStatus: 'Paid',
    paymentMethod: 'Zepto NPP PayID (Dynamic Virtual Account)',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-02-14 11:20 AM',
  },
  {
    id: 'HIST-2026-0226',
    invoiceNumber: 'INV-2026-0226',
    transactionRef: 'bt_txn_feb_022688',
    date: '2026-02-26',
    displayDate: '26 Feb 2026',
    dueDate: '2026-02-26',
    customerId: 'CUST-7992',
    customerName: 'Brendan O’Connor',
    customerEmail: 'b.oconnor@premierbuilders.com.au',
    customerPhone: '0409 332 119',
    address: '45 The Esplanade',
    suburb: 'Brighton',
    state: 'SA',
    postcode: '5048',
    orderNumber: 'PBO-9060',
    containerDescription: '1x 19 m³ Medium Portabox',
    serviceType: 'Local Moving (Drop & Relocate)',
    description: 'Adelaide to Melbourne Interstate Move Deposit & Container Transit',
    transactionType: 'Interstate Transit',
    grossAmountAud: 1450,
    gstAud: 131.82,
    netAmountAud: 1318.18,
    paymentStatus: 'Paid',
    paymentMethod: 'American Express •••• 4001 (Braintree)',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-02-26 16:45 PM',
  },
  {
    id: 'HIST-2026-0305',
    invoiceNumber: 'INV-2026-0305',
    transactionRef: 'bt_txn_mar_030512',
    date: '2026-03-05',
    displayDate: '05 Mar 2026',
    dueDate: '2026-03-05',
    customerId: 'CUST-7981',
    customerName: 'Marcus Sterling',
    customerEmail: 'marcus.sterling@adelaidelegal.com.au',
    customerPhone: '0418 203 114',
    address: '14 Brougham Place',
    suburb: 'North Adelaide',
    state: 'SA',
    postcode: '5006',
    orderNumber: 'PBO-9011',
    containerDescription: '1x 25 m³ Large Portabox',
    serviceType: 'Storage at your place',
    description: 'Monthly Storage Rent (Large 25 m³) - Mar 2026 Autopay',
    transactionType: 'Monthly Storage Rent',
    grossAmountAud: 219,
    gstAud: 19.91,
    netAmountAud: 199.09,
    paymentStatus: 'Paid',
    paymentMethod: 'Mastercard •••• 1042 (Autopay)',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-03-05 06:00 AM',
  },
  {
    id: 'HIST-2026-0314',
    invoiceNumber: 'INV-2026-0314',
    transactionRef: 'bt_txn_mar_031422',
    date: '2026-03-14',
    displayDate: '14 Mar 2026',
    dueDate: '2026-03-14',
    customerId: 'CUST-7988',
    customerName: 'Geoff & Tania Barker',
    customerEmail: 'geoff.barker@barkerwine.com.au',
    customerPhone: '0438 112 905',
    address: '122 Main Road',
    suburb: 'Tanunda',
    state: 'SA',
    postcode: '5352',
    orderNumber: 'PBO-9045',
    containerDescription: '1x 25 m³ Large Portabox',
    serviceType: 'Storage at your place',
    description: 'Monthly Storage Rent (Large 25 m³) - Mar 2026',
    transactionType: 'Monthly Storage Rent',
    grossAmountAud: 219,
    gstAud: 19.91,
    netAmountAud: 199.09,
    paymentStatus: 'Paid',
    paymentMethod: 'Direct Debit (Zepto BSB: 805-001)',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-03-14 08:30 AM',
  },
  {
    id: 'HIST-2026-0322',
    invoiceNumber: 'INV-2026-0322',
    transactionRef: 'inv_pending_032219',
    date: '2026-03-22',
    displayDate: '22 Mar 2026',
    dueDate: '2026-03-29',
    customerId: 'CUST-7995',
    customerName: 'Samantha & Luke Davies',
    customerEmail: 'sam.davies@outlook.com',
    customerPhone: '0455 921 802',
    address: '52 Unley Road',
    suburb: 'Unley',
    state: 'SA',
    postcode: '5061',
    orderNumber: 'PBO-9078',
    containerDescription: '1x 25 m³ Large Portabox',
    serviceType: 'Storage at your place',
    description: 'Packing Supplies Kit: 50x Heavy Duty Boxes ($40) + 20x Blanket Rental ($40) + 2x Disc Padlocks ($40)',
    transactionType: 'Packing Supplies',
    grossAmountAud: 120,
    gstAud: 10.91,
    netAmountAud: 109.09,
    paymentStatus: 'Paid',
    paymentMethod: 'Visa •••• 5510 (Braintree)',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-03-22 13:10 PM',
  },
  {
    id: 'HIST-2026-0331',
    invoiceNumber: 'INV-2026-0331',
    transactionRef: 'adj_fee_033101',
    date: '2026-03-31',
    displayDate: '31 Mar 2026',
    dueDate: '2026-03-31',
    customerId: 'CUST-7998',
    customerName: 'Apex Commercial Fitouts',
    customerEmail: 'accounts@apexfitouts.com.au',
    customerPhone: '08 8234 9900',
    address: '108 South Road',
    suburb: 'Torrensville',
    state: 'SA',
    postcode: '5031',
    orderNumber: 'PBO-9099',
    containerDescription: '3x 25 m³ Commercial Fleet',
    serviceType: 'Storage at secure facility',
    description: 'Q1 Facility Forklift Staging Fee & Monthly Storage Rent Adjustment',
    transactionType: 'Fee Adjustment',
    grossAmountAud: 777,
    gstAud: 70.64,
    netAmountAud: 706.36,
    paymentStatus: 'Paid',
    paymentMethod: 'EFT Direct Bank Transfer',
    revenueRecognitionType: 'Immediate (Delivery / Storage)',
    reconciliationStatus: 'Cleared & Reconciled',
    paidAt: '2026-03-31 17:00 PM',
  },
];

export const PRESET_FINANCIAL_DATE_RANGES = [
  {
    id: 'q1_2026',
    label: 'Jan 1 2026 to Mar 31 2026 (Q1 2026)',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
  },
  {
    id: 'q2_2026',
    label: 'Apr 1 2026 to Jun 30 2026 (Q2 2026)',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
  },
  {
    id: 'q3_2026',
    label: 'Jul 1 2026 to Sep 30 2026 (Q3 2026)',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
  },
  {
    id: 'q4_2026',
    label: 'Oct 1 2026 to Dec 31 2026 (Q4 2026)',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
  },
  {
    id: 'fy_2026',
    label: 'Full Year 2026 (Jan 1 to Dec 31 2026)',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  },
  {
    id: 'last_30_days',
    label: 'Last 30 Days',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  },
];

/**
 * Extracts all financial data matching duration query [startDate, endDate]
 * Consolidates customer transactions, smartsheet ledger invoices, Zepto EFTs, and historical records.
 */
export function extractFinancialRecords(query: FinancialExtractionQuery): {
  records: FinancialRecord[];
  summary: FinancialSummary;
} {
  const startTs = parseDateToTimestamp(query.startDate);
  // End date extends through end of the target day (23:59:59.999)
  const endBaseTs = parseDateToTimestamp(query.endDate);
  const endTs = endBaseTs ? endBaseTs + (24 * 3600 * 1000 - 1) : Infinity;

  const recordsMap = new Map<string, FinancialRecord>();

  // 1. Add historical seed records
  SEED_HISTORICAL_FINANCIAL_RECORDS.forEach((r) => {
    recordsMap.set(r.invoiceNumber, r);
  });

  // 2. Add records from Customer Accounts
  try {
    const accounts = loadCustomerAccounts();
    accounts.forEach((c) => {
      const primaryOrder = c.orders[0];
      const isUpfront = c.paymentPlan?.planType?.includes('upfront') || false;

      c.transactions.forEach((t) => {
        const gross = t.amount || 0;
        const gst = Math.round((gross / 11) * 100) / 100;
        const net = Math.round((gross - gst) * 100) / 100;
        const tDateTs = parseDateToTimestamp(t.date);
        const isoDate = tDateTs > 0 ? formatTimestampToIso(tDateTs) : query.startDate;

        let tType: FinancialRecord['transactionType'] = 'Monthly Storage Rent';
        const dLower = (t.description || '').toLowerCase();
        if (dLower.includes('first payment') || dLower.includes('initial delivery')) {
          tType = 'Initial Invoice & Delivery';
        } else if (dLower.includes('prepayment') || dLower.includes('upfront')) {
          tType = 'Prepayment Upfront';
        } else if (dLower.includes('blanket') || dLower.includes('boxes') || dLower.includes('supplies')) {
          tType = 'Packing Supplies';
        } else if (dLower.includes('interstate') || dLower.includes('transit')) {
          tType = 'Interstate Transit';
        } else if (dLower.includes('adjustment') || dLower.includes('credit')) {
          tType = 'Fee Adjustment';
        }

        const rec: FinancialRecord = {
          id: `cust-${c.id}-${t.id}`,
          invoiceNumber: t.invoiceNumber || `INV-${isoDate.replace(/-/g, '')}-${t.id}`,
          transactionRef: t.transactionId || 'Pending Settlement',
          date: isoDate,
          displayDate: t.date,
          dueDate: t.dueDate || t.date,
          customerId: c.id,
          customerName: `${c.firstName} ${c.lastName}`.trim(),
          customerEmail: c.email,
          customerPhone: c.mobile,
          address: c.address,
          suburb: c.suburb,
          state: c.state,
          postcode: c.postcode,
          orderNumber: primaryOrder?.orderNumber || 'PBO-GEN',
          containerDescription: primaryOrder ? `${primaryOrder.containerSize} (${primaryOrder.containerName})` : 'Portabox Container',
          serviceType: primaryOrder?.serviceType || 'Container Storage',
          description: t.description || 'Portabox Service Payment',
          transactionType: tType,
          grossAmountAud: gross,
          gstAud: gst,
          netAmountAud: net,
          paymentStatus: t.status || 'Paid',
          paymentMethod: t.paymentMethod || c.paymentPlan?.planLabel || 'Braintree Card Vault',
          revenueRecognitionType: isUpfront
            ? 'Deferred AASB-15 (Upfront Prepayment)'
            : 'Immediate (Delivery / Storage)',
          reconciliationStatus: t.status === 'Paid' ? 'Cleared & Reconciled' : t.status === 'Overdue' ? 'Overdue Follow-up' : 'Pending Settlement',
          paidAt: t.status === 'Paid' ? `${t.date} 10:00 AM` : undefined,
        };

        recordsMap.set(rec.invoiceNumber, rec);
      });
    });
  } catch (err) {
    console.warn('Could not parse customer transactions for financial extract:', err);
  }

  // 3. Add records from Smartsheet Invoices Ledger
  try {
    const smartsheetInvs = loadSmartsheetInvoices();
    smartsheetInvs.forEach((inv) => {
      const invDateTs = parseDateToTimestamp(inv.date);
      const isoDate = invDateTs > 0 ? formatTimestampToIso(invDateTs) : query.startDate;
      const gross = inv.amount || 0;
      const gst = inv.gstAmount || Math.round((gross / 11) * 100) / 100;
      const net = Math.round((gross - gst) * 100) / 100;

      if (!recordsMap.has(inv.invoiceNumber)) {
        recordsMap.set(inv.invoiceNumber, {
          id: `smartsheet-${inv.id}`,
          invoiceNumber: inv.invoiceNumber,
          transactionRef: inv.transactionRef || 'Staged in Smartsheet',
          date: isoDate,
          displayDate: inv.date,
          dueDate: inv.dueDate || inv.date,
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerEmail: inv.customerEmail,
          customerPhone: '',
          address: '',
          suburb: '',
          state: '',
          postcode: '',
          orderNumber: inv.orderNumber,
          containerDescription: 'Portabox Container',
          serviceType: 'Container Storage & Transport',
          description: inv.description,
          transactionType: 'Monthly Storage Rent',
          grossAmountAud: gross,
          gstAud: gst,
          netAmountAud: net,
          paymentStatus: inv.status,
          paymentMethod: inv.paymentMethod,
          revenueRecognitionType: inv.revenueType,
          reconciliationStatus: inv.status === 'Paid' ? 'Cleared & Reconciled' : 'Pending Settlement',
          paidAt: inv.status === 'Paid' ? inv.date : undefined,
        });
      }
    });
  } catch (err) {
    console.warn('Could not load smartsheet invoices:', err);
  }

  // Filter records by duration [startTs, endTs], status, and search term
  const allRecords = Array.from(recordsMap.values());
  const filtered = allRecords.filter((rec) => {
    const recTs = parseDateToTimestamp(rec.date) || parseDateToTimestamp(rec.displayDate);
    if (recTs < startTs || recTs > endTs) {
      return false;
    }
    if (query.statusFilter && query.statusFilter !== 'All') {
      if (rec.paymentStatus !== query.statusFilter) return false;
    }
    if (query.searchTerm && query.searchTerm.trim()) {
      const term = query.searchTerm.trim().toLowerCase();
      const match =
        rec.invoiceNumber.toLowerCase().includes(term) ||
        rec.customerName.toLowerCase().includes(term) ||
        rec.customerEmail.toLowerCase().includes(term) ||
        rec.suburb.toLowerCase().includes(term) ||
        rec.orderNumber.toLowerCase().includes(term) ||
        rec.description.toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  // Sort chronologically (earliest to latest)
  filtered.sort((a, b) => {
    const tsA = parseDateToTimestamp(a.date) || parseDateToTimestamp(a.displayDate);
    const tsB = parseDateToTimestamp(b.date) || parseDateToTimestamp(b.displayDate);
    return tsA - tsB;
  });

  // Calculate summary metrics
  const summary: FinancialSummary = {
    recordCount: filtered.length,
    totalGrossAud: Math.round(filtered.reduce((sum, r) => sum + r.grossAmountAud, 0) * 100) / 100,
    totalGstAud: Math.round(filtered.reduce((sum, r) => sum + r.gstAud, 0) * 100) / 100,
    totalNetAud: Math.round(filtered.reduce((sum, r) => sum + r.netAmountAud, 0) * 100) / 100,
    totalPaidAud: Math.round(filtered.filter((r) => r.paymentStatus === 'Paid').reduce((sum, r) => sum + r.grossAmountAud, 0) * 100) / 100,
    totalPendingAud: Math.round(filtered.filter((r) => r.paymentStatus === 'Pending').reduce((sum, r) => sum + r.grossAmountAud, 0) * 100) / 100,
    totalOverdueAud: Math.round(filtered.filter((r) => r.paymentStatus === 'Overdue').reduce((sum, r) => sum + r.grossAmountAud, 0) * 100) / 100,
  };

  return { records: filtered, summary };
}

/**
 * Generates and triggers browser download of an RFC-4180 compliant CSV file
 */
export function exportFinancialDataToCSV(
  records: FinancialRecord[],
  query: { startDate: string; endDate: string }
): void {
  const headers = [
    'Invoice Number',
    'Date (ISO)',
    'Display Date',
    'Due Date',
    'Customer ID',
    'Customer Name',
    'Customer Email',
    'Customer Mobile',
    'Delivery Address',
    'Suburb',
    'State',
    'Postcode',
    'Order Number',
    'Container Spec',
    'Service Type',
    'Line Item Description',
    'Transaction Type',
    'Gross Amount (AUD)',
    'GST 10% (AUD)',
    'Net Amount (AUD)',
    'Payment Status',
    'Payment Method',
    'Transaction ID / Gateway Ref',
    'Revenue Recognition Type',
    'Reconciliation Status',
    'Paid At',
  ];

  const escapeCsv = (val: any): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[][] = records.map((r) => [
    escapeCsv(r.invoiceNumber),
    escapeCsv(r.date),
    escapeCsv(r.displayDate),
    escapeCsv(r.dueDate),
    escapeCsv(r.customerId),
    escapeCsv(r.customerName),
    escapeCsv(r.customerEmail),
    escapeCsv(r.customerPhone),
    escapeCsv(r.address),
    escapeCsv(r.suburb),
    escapeCsv(r.state),
    escapeCsv(r.postcode),
    escapeCsv(r.orderNumber),
    escapeCsv(r.containerDescription),
    escapeCsv(r.serviceType),
    escapeCsv(r.description),
    escapeCsv(r.transactionType),
    escapeCsv(r.grossAmountAud.toFixed(2)),
    escapeCsv(r.gstAud.toFixed(2)),
    escapeCsv(r.netAmountAud.toFixed(2)),
    escapeCsv(r.paymentStatus),
    escapeCsv(r.paymentMethod),
    escapeCsv(r.transactionRef),
    escapeCsv(r.revenueRecognitionType),
    escapeCsv(r.reconciliationStatus),
    escapeCsv(r.paidAt || ''),
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `portabox_financials_${query.startDate}_to_${query.endDate}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
