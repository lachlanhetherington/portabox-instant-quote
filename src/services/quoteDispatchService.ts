import { QuoteBreakdown } from '../types/quote';
import {
  loadCustomerAccounts,
  saveCustomerAccounts,
  CustomerAccount,
} from './customerPortalService';
import { addSmartsheetSyncLog } from './smartsheetService';

export interface QuoteDispatchResult {
  quoteNumber: string;
  emailSent: boolean;
  smsSent: boolean;
  portalPublished: boolean;
  portalLink: string;
  smsText: string;
  emailSubject: string;
  emailPreview: string;
  timestamp: string;
  account: CustomerAccount;
}

/**
 * Dispatches an agent-prepared quote to an inbound caller via Email, SMS, or Customer Portal
 * Corresponds to: "15% call in - agent needs to fill the form for the customer on the phone
 * and then email or sms or in portal the quote to the customer"
 */
export function dispatchQuoteToCustomer(params: {
  quote: QuoteBreakdown;
  customerName: string;
  customerEmail?: string;
  customerMobile?: string;
  channels: {
    email?: boolean;
    sms?: boolean;
    portal?: boolean;
  };
  agentNotes?: string;
  agentName?: string;
}): QuoteDispatchResult {
  const {
    quote,
    customerName,
    customerEmail = '',
    customerMobile = '',
    channels,
    agentNotes = '',
    agentName = 'Admin Call Center Agent',
  } = params;

  const quoteRef = `PBQ-${(quote.quoteCreatedAt ? new Date(quote.quoteCreatedAt).getTime() : Date.now()).toString().slice(-6)}`;
  const timestamp = new Date().toLocaleString('en-AU');
  const validUntilStr = quote.quoteExpiresAt
    ? new Date(quote.quoteExpiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
      })();

  const nameParts = customerName.trim().split(' ');
  const firstName = nameParts[0] || 'Valued Caller';
  const lastName = nameParts.slice(1).join(' ') || '';

  const effectiveEmail = customerEmail.trim() || `${firstName.toLowerCase().replace(/\s+/g, '')}.${Date.now().toString().slice(-4)}@phone-quote.com.au`;
  const effectiveMobile = customerMobile.trim() || '0400 000 000';

  // 1. Generate formatted SMS message
  const smsText = `Hi ${firstName}, here is your tailored Portabox Quote #${quoteRef} from your call with ${agentName}: ${quote.containerName} for ${quote.originPostcode.suburb} at $${quote.monthlyStorageFee || quote.monthlyContainerRate}/mo (First payment $${quote.firstPaymentTotal} incl delivery). View & book in your Customer Portal: ${window.location.origin}?customerPortal=true&quoteRef=${quoteRef} (Rate locked 30 days). Call 1800 467 637 to confirm.`;

  // 2. Generate formatted Email subject & text
  const emailSubject = `Your Portabox Quotation #${quoteRef} - ${quote.containerName} (${quote.originPostcode.suburb})`;
  const emailPreview = `Dear ${firstName},

Thank you for speaking with our Call Center team today. As requested over the phone, here is your customized Portabox quotation:

QUOTATION SUMMARY:
• Quote Reference: ${quoteRef}
• Container: ${quote.containerName} (${quote.containerVolume})
• Service: ${quote.serviceType === 'storage_at_place' ? 'Storage at Your Place' : 'Depot Facility Storage'}
• Delivery Location: ${quote.originPostcode.suburb} ${quote.originPostcode.state} ${quote.originPostcode.postcode}
• Preferred Delivery Window: ${quote.selectedSlot?.label || 'Morning (9:00 AM – 11:30 AM)'}

FINANCIAL SCHEDULE:
• First Payment Due: $${quote.firstPaymentTotal} AUD (Includes delivery leg + initial month rent)
• Ongoing Monthly Rent: $${quote.monthlyStorageFee || quote.monthlyContainerRate}/month
• 12-Month Rate Freeze: Guaranteed fixed pricing with 30-day lock until ${validUntilStr}

ACCESS YOUR CUSTOMER PORTAL:
Your quotation has also been uploaded directly into your Customer Portal. You can review your inventory, choose driveway placement, and finalize your booking anytime:
${window.location.origin}?customerPortal=true&email=${encodeURIComponent(effectiveEmail)}

If you have questions or wish to book over the phone, reply to this email or call 1800 467 637.

Kind regards,
${agentName}
Portabox Australia Operations`;

  // 3. Publish into Customer Portal Account
  const accounts = loadCustomerAccounts();
  const existingIdx = accounts.findIndex(
    (a) =>
      (customerEmail && a.email.toLowerCase() === customerEmail.toLowerCase()) ||
      (customerMobile && a.mobile.replace(/\D/g, '') === customerMobile.replace(/\D/g, ''))
  );

  const portalQuoteItem = {
    id: `QUO-${Date.now().toString().slice(-5)}`,
    quoteNumber: quoteRef,
    createdAt: new Date().toLocaleDateString('en-AU'),
    validUntil: validUntilStr,
    containerSize: quote.containerName,
    containerCount: quote.containerCount || 1,
    billingCycle: quote.billingCycle || 'monthly',
    firstPaymentTotal: quote.firstPaymentTotal,
    monthlyStorageFee: quote.monthlyStorageFee || quote.monthlyContainerRate || 219,
    status: 'Active' as const,
    quoteData: quote,
  };

  let targetAccount: CustomerAccount;

  if (existingIdx >= 0) {
    targetAccount = accounts[existingIdx];
    targetAccount.quotes = [portalQuoteItem, ...(targetAccount.quotes || [])];
    targetAccount.lastSmartsheetSyncNote = `Agent ${agentName} pushed Quote #${quoteRef} into Customer Portal`;
    targetAccount.lastSmartsheetSyncAt = timestamp;
    accounts[existingIdx] = targetAccount;
  } else {
    targetAccount = {
      id: `CUST-PH-${Date.now().toString().slice(-5)}`,
      email: effectiveEmail,
      firstName,
      lastName,
      mobile: effectiveMobile,
      address: `${quote.originPostcode.suburb}, ${quote.originPostcode.state}`,
      suburb: quote.originPostcode.suburb,
      state: quote.originPostcode.state,
      postcode: quote.originPostcode.postcode,
      memberSince: new Date().toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
      verified: true,
      lastSmartsheetSyncNote: `Inbound Call Quote #${quoteRef} published to Customer Portal`,
      lastSmartsheetSyncAt: timestamp,
      quotes: [portalQuoteItem],
      orders: [],
      paymentPlan: {
        planType: 'monthly',
        planLabel: 'Standard Monthly (Phone Quote)',
        periodicAmount: quote.monthlyStorageFee || 219,
        nextBillingDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-AU'),
        autopayEnabled: false,
        cardLast4: '----',
        cardBrand: 'Pending',
        cardExpiry: '--/--',
        termDiscountPercent: 0,
      },
      transactions: [],
      discountsGiven: [],
    };
    accounts.unshift(targetAccount);
  }

  saveCustomerAccounts(accounts);

  // Broadcast sync event for open portals and tabs
  try {
    window.dispatchEvent(
      new CustomEvent('portabox-smartsheet-sync', {
        detail: {
          summary: `Quote #${quoteRef} dispatched to ${customerName} (${[
            channels.email ? 'Email' : null,
            channels.sms ? 'SMS' : null,
            channels.portal ? 'Customer Portal' : null,
          ].filter(Boolean).join(' + ')})`,
        },
      })
    );
  } catch {
    // browser env only
  }

  // Smartsheet sync log
  addSmartsheetSyncLog({
    direction: 'portal_to_sheet',
    sheetName: 'Customer Bookings & Billing Sheet',
    action: `Inbound Call Quote Dispatched (${[
      channels.email ? 'Email' : null,
      channels.sms ? 'SMS' : null,
      channels.portal ? 'In-Portal' : null,
    ].filter(Boolean).join('/')})`,
    rowsAffected: 1,
    status: 'success',
    details: `Agent ${agentName} created and dispatched Quote #${quoteRef} for caller ${customerName} (${quote.containerName} - $${quote.firstPaymentTotal})`,
    payloadPreview: JSON.stringify({ quoteRef, customerName, channels, suburb: quote.originPostcode.suburb }),
  });

  const portalLink = `${window.location.origin}?customerPortal=true&email=${encodeURIComponent(targetAccount.email)}`;

  return {
    quoteNumber: quoteRef,
    emailSent: Boolean(channels.email),
    smsSent: Boolean(channels.sms),
    portalPublished: Boolean(channels.portal),
    portalLink,
    smsText,
    emailSubject,
    emailPreview,
    timestamp,
    account: targetAccount,
  };
}
