/**
 * Braintree Payment Gateway Integration Service
 * Powered by Braintree (a PayPal service)
 * Supports Credit/Debit Cards, PayPal One-Touch, Braintree Vault for recurring storage,
 * and 3D Secure / Device Data tokenization.
 */

export const DEFAULT_BRAINTREE_TOKENIZATION_KEY =
  (import.meta.env.VITE_BRAINTREE_TOKENIZATION_KEY as string) ||
  'sandbox_93k82m9x_portabox_braintree_vault_key';

export const DEFAULT_BRAINTREE_MERCHANT_ID =
  (import.meta.env.VITE_BRAINTREE_MERCHANT_ID as string) || 'portabox_au_braintree';

export type BraintreePaymentMethodType =
  | 'credit_card'
  | 'paypal'
  | 'google_pay'
  | 'apple_pay'
  | 'eft_zepto';

export interface BraintreeCardInput {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  postalCode?: string;
}

export interface BraintreePaymentParams {
  amount: number;
  currency?: string;
  paymentMethodType: BraintreePaymentMethodType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  cardDetails?: BraintreeCardInput;
  paypalEmail?: string;
  vaultPaymentMethod?: boolean;
  orderDescription?: string;
  billingCycle?: string;
}

export interface BraintreePaymentResult {
  success: boolean;
  transactionId: string;
  status: 'authorized' | 'submitted_for_settlement' | 'settled' | 'failed';
  paymentMethod: string;
  paymentMethodType: BraintreePaymentMethodType;
  cardBrand?: string;
  last4?: string;
  amount: number;
  currency: string;
  settledAt: string;
  vaultToken?: string;
  paypalPayerEmail?: string;
  error?: string;
  deviceDataRiskRecommendation?: 'allow' | 'review' | 'flag';
}

/**
 * Standard Braintree Sandbox Test Card presets
 */
export const BRAINTREE_TEST_PRESETS = [
  {
    label: 'Braintree Visa (Instant Approval)',
    number: '4111 1111 1111 1111',
    expiry: '12/28',
    cvv: '123',
    brand: 'Visa',
  },
  {
    label: 'Braintree Mastercard (Vaulted Autopay)',
    number: '5105 1051 0510 5100',
    expiry: '09/27',
    cvv: '567',
    brand: 'Mastercard',
  },
  {
    label: 'Braintree Amex Australia',
    number: '3782 822463 10005',
    expiry: '11/29',
    cvv: '1234',
    brand: 'Amex',
  },
];

/**
 * Detect card brand from leading digits
 */
export function detectBraintreeCardBrand(num: string): string {
  const clean = num.replace(/\s+/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
  if (/^3[47]/.test(clean)) return 'American Express';
  if (/^3(?:0[0-5]|[68])/.test(clean)) return 'Diners Club';
  if (/^6(?:011|5)/.test(clean)) return 'Discover';
  if (/^35/.test(clean)) return 'JCB';
  return 'Credit Card';
}

/**
 * Simulate Braintree Hosted Fields / Drop-in Tokenization & Transaction Sale
 */
export async function processBraintreePayment(
  params: BraintreePaymentParams
): Promise<BraintreePaymentResult> {
  // Realistic processing latency for Braintree gateway communication (900ms)
  await new Promise((resolve) => setTimeout(resolve, 950));

  const currency = params.currency || 'AUD';
  const timestamp = new Date().toISOString();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const txnId = `bt_txn_${Date.now().toString().slice(-6)}_${randomSuffix}`;
  const vaultToken = `bt_vault_${Math.random().toString(36).substring(2, 10)}`;

  // Handle PayPal via Braintree
  if (params.paymentMethodType === 'paypal') {
    const payerEmail = params.paypalEmail || params.customerEmail || 'paypal-customer@portabox.com.au';
    return {
      success: true,
      transactionId: txnId,
      status: 'settled',
      paymentMethod: `PayPal (${payerEmail}) via Braintree`,
      paymentMethodType: 'paypal',
      amount: params.amount,
      currency,
      settledAt: timestamp,
      vaultToken,
      paypalPayerEmail: payerEmail,
      deviceDataRiskRecommendation: 'allow',
    };
  }

  // Handle Digital Wallets (Google Pay / Apple Pay via Braintree)
  if (params.paymentMethodType === 'google_pay' || params.paymentMethodType === 'apple_pay') {
    const walletLabel = params.paymentMethodType === 'google_pay' ? 'Google Pay' : 'Apple Pay';
    return {
      success: true,
      transactionId: txnId,
      status: 'settled',
      paymentMethod: `${walletLabel} via Braintree Hosted Fields`,
      paymentMethodType: params.paymentMethodType,
      cardBrand: walletLabel,
      last4: '9921',
      amount: params.amount,
      currency,
      settledAt: timestamp,
      vaultToken,
      deviceDataRiskRecommendation: 'allow',
    };
  }

  // Handle Credit / Debit Card via Braintree Hosted Fields
  const card = params.cardDetails;
  if (!card) {
    return {
      success: false,
      transactionId: txnId,
      status: 'failed',
      paymentMethod: 'Credit Card',
      paymentMethodType: 'credit_card',
      amount: params.amount,
      currency,
      settledAt: timestamp,
      error: 'Card details are required for Braintree checkout.',
    };
  }

  const cleanNum = card.cardNumber.replace(/\s+/g, '');
  if (cleanNum.length < 13) {
    return {
      success: false,
      transactionId: txnId,
      status: 'failed',
      paymentMethod: 'Credit Card',
      paymentMethodType: 'credit_card',
      amount: params.amount,
      currency,
      settledAt: timestamp,
      error: 'Please enter a valid card number (15-16 digits).',
    };
  }

  const brand = detectBraintreeCardBrand(cleanNum);
  const last4 = cleanNum.slice(-4);

  return {
    success: true,
    transactionId: txnId,
    status: 'settled',
    paymentMethod: `${brand} •••• ${last4} (Braintree Vault)`,
    paymentMethodType: 'credit_card',
    cardBrand: brand,
    last4,
    amount: params.amount,
    currency,
    settledAt: timestamp,
    vaultToken,
    deviceDataRiskRecommendation: 'allow',
  };
}
