import { CustomerAccount, ContainerOrder, CustomerTransaction, loadCustomerAccounts, saveCustomerAccounts } from './customerPortalService';

export interface DamageReport {
  id: string;
  customerId: string;
  orderId: string;
  containerId: string;
  category:
    | 'Door seal leak'
    | 'Door hinge jammed'
    | 'Floor moisture / stain'
    | 'Roof dent / puncture'
    | 'Lockbox shroud bent'
    | 'Graffiti / Exterior mark'
    | 'Pest / Insect ingress';
  severity: 'Minor (Usable)' | 'Moderate (Action required)' | 'Critical (Immediate swap required)';
  reportedAt: string;
  status: 'Reported' | 'Inspection Scheduled' | 'Swapped' | 'Resolved';
  replaceContainerRequested: boolean;
  notes: string;
  assignedInspector?: string;
}

export interface InsurancePolicy {
  id: string;
  customerId: string;
  orderId: string;
  containerId: string;
  tier:
    | 'Standard (Complimentary $2,500)'
    | 'Basic ($10,000 cover · $15/mo)'
    | 'Silver ($25,000 cover · $35/mo)'
    | 'Gold ($50,000 cover · $60/mo)'
    | 'Platinum ($100,000 cover · $95/mo)';
  coverAmount: number;
  monthlyPremium: number;
  activeFrom: string;
  status: 'Active' | 'Cancelled';
  policyNumber: string;
}

export type CallDisposition =
  | 'General Inquiry'
  | 'Billing & Refund'
  | 'Payment Plan Update'
  | 'Credit Card Updated'
  | 'Rental Extension'
  | 'Order Pickup Scheduled'
  | 'Damage Logged'
  | 'Insurance Added'
  | 'SMS Sent'
  | 'Escalated to Yard Depot';

export interface TelephonyCall {
  id: string;
  direction: 'inbound' | 'outbound';
  callerPhone: string;
  callerEmail?: string;
  callerName?: string;
  customerId?: string;
  matchedCustomer?: CustomerAccount | null;
  status: 'ringing' | 'connected' | 'hold' | 'ended' | 'missed';
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  ivrStep: 'email_prompt' | 'email_verified' | 'agent_routed' | 'sms_fallback';
  ivrInputType: 'speech_recognition' | 'dtmf' | 'auto_phone_match';
  ivrTranscript: string;
  recordingUrl?: string;
  notes?: string;
  disposition?: CallDisposition;
  actionLog: Array<{ timestamp: string; action: string; details: string }>;
}

export interface SmsMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'agent' | 'system';
  text: string;
  timestamp: string;
  status: 'delivered' | 'sent' | 'failed';
  actionType?: 'eta_tracking' | 'card_update' | 'access_upload' | 'invoice_receipt' | 'pickup_booking' | 'damage_report';
  actionUrl?: string;
}

export interface SmsConversation {
  id: string;
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
  customerId?: string;
  unreadCount: number;
  lastMessageAt: string;
  messages: SmsMessage[];
}

export interface TwilioConfig {
  accountSid: string;
  authTokenMasked: string;
  twilioVoiceNumber: string;
  twilioSmsNumber: string;
  twimlAppSid: string;
  webhookBaseUrl: string;
  ivrGreetingVoice: 'Polly.Russell-Neural (Australian English Male)' | 'Polly.Nicole (Australian English Female)';
  autoScreenPop: boolean;
  soundEffectsEnabled: boolean;
  transcribeCall: boolean;
  statusCallbackUrl: string;
}

import { db } from './firebaseService';
import { collection, doc, getDocs, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

// ----------------- FIRESTORE COLLECTIONS -----------------
const TELEPHONY_CALLS_COLLECTION = 'telephony_calls';
const SMS_CONVERSATIONS_COLLECTION = 'sms_conversations';
const TWILIO_CONFIG_COLLECTION = 'twilio_config';
const DAMAGE_REPORTS_COLLECTION = 'damage_reports';
const INSURANCE_POLICIES_COLLECTION = 'insurance_policies';

// Local storage fallback keys
const TWILIO_CONFIG_KEY = 'portabox_twilio_config';
const CALLS_STORAGE_KEY = 'portabox_telephony_calls';
const ACTIVE_CALL_KEY = 'portabox_active_telephony_call';
const DAMAGE_REPORTS_KEY = 'portabox_damage_reports';
const INSURANCE_POLICIES_KEY = 'portabox_insurance_policies';

const DEFAULT_TWILIO_CONFIG: TwilioConfig = {
  accountSid: 'AC98f237a4e019b88231cba44701e4a19',
  authTokenMasked: '••••••••••••••••••••••••••••••••',
  twilioVoiceNumber: '+61 1300 767 822',
  twilioSmsNumber: '+61 488 880 123',
  twimlAppSid: 'AP55b0a701e9d84f881903429384723019',
  webhookBaseUrl: 'https://api.portabox.com.au/v1/twilio',
  ivrGreetingVoice: 'Polly.Nicole (Australian English Female)',
  autoScreenPop: true,
  soundEffectsEnabled: true,
  transcribeCall: true,
  statusCallbackUrl: 'https://api.portabox.com.au/v1/twilio/voice/status',
};

// Seed initial SMS conversations to test immediately
const SEED_SMS_CONVERSATIONS: SmsConversation[] = [
  {
    id: 'SMS-CONV-8021',
    customerPhone: '0412 849 201',
    customerEmail: 'sarah.jenkins@gmail.com',
    customerName: 'Sarah Jenkins',
    customerId: 'CUST-8021',
    unreadCount: 1,
    lastMessageAt: 'Today 10:14 AM',
    messages: [
      {
        id: 'msg-01',
        conversationId: 'SMS-CONV-8021',
        sender: 'system',
        text: 'Hi Sarah, your Portabox Pro (25 m³) is placed at 42 Osmond Terrace, Norwood. Level-lift placement verified.',
        timestamp: '01 Oct 10:20 AM',
        status: 'delivered',
        actionType: 'eta_tracking',
        actionUrl: 'https://portabox.com.au/track/PBO-9841',
      },
      {
        id: 'msg-02',
        conversationId: 'SMS-CONV-8021',
        sender: 'customer',
        text: 'Thanks! We are packing now. Can you let me know how to request collection once we are done next week?',
        timestamp: 'Today 10:14 AM',
        status: 'delivered',
      },
    ],
  },
  {
    id: 'SMS-CONV-8022',
    customerPhone: '0433 912 304',
    customerEmail: 'david.miller@builderpro.com.au',
    customerName: 'David Miller',
    customerId: 'CUST-8022',
    unreadCount: 0,
    lastMessageAt: 'Yesterday 04:30 PM',
    messages: [
      {
        id: 'msg-03',
        conversationId: 'SMS-CONV-8022',
        sender: 'agent',
        text: 'Hi David, confirmation that your 25 m³ Large rental is paid upfront. Driver Dave will arrive tomorrow at 8:30 AM.',
        timestamp: 'Yesterday 04:20 PM',
        status: 'delivered',
      },
      {
        id: 'msg-04',
        conversationId: 'SMS-CONV-8022',
        sender: 'customer',
        text: 'Spot on mate. Gate code is 4821 if the gate is closed.',
        timestamp: 'Yesterday 04:30 PM',
        status: 'delivered',
      },
    ],
  },
];

// Helper to broadcast telephony state changes across the applet
export function notifyTelephonyUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-telephony-update'));
  }
}

// Play pleasant web audio chime for incoming ring (synthesized softly)
export function playRingChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc1.frequency.setValueAtTime(480, ctx.currentTime + 0.15);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(960, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

// ----------------- STORAGE LOAD / SAVE -----------------

export function loadTwilioConfig(): TwilioConfig {
  try {
    const raw = localStorage.getItem(TWILIO_CONFIG_KEY);
    if (!raw) return DEFAULT_TWILIO_CONFIG;
    return { ...DEFAULT_TWILIO_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TWILIO_CONFIG;
  }
}

export function saveTwilioConfig(cfg: TwilioConfig): void {
  try {
    localStorage.setItem(TWILIO_CONFIG_KEY, JSON.stringify(cfg));
    notifyTelephonyUpdate();
  } catch (err) {
    console.error('Error saving Twilio config:', err);
  }
}

export function loadTelephonyCalls(): TelephonyCall[] {
  try {
    const raw = localStorage.getItem(CALLS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTelephonyCalls(calls: TelephonyCall[]): void {
  try {
    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calls));
    notifyTelephonyUpdate();
  } catch (err) {
    console.error('Error saving telephony calls:', err);
  }
}

export function getActiveCall(): TelephonyCall | null {
  try {
    const raw = localStorage.getItem(ACTIVE_CALL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setActiveCall(call: TelephonyCall | null): void {
  try {
    if (call) {
      localStorage.setItem(ACTIVE_CALL_KEY, JSON.stringify(call));
    } else {
      localStorage.removeItem(ACTIVE_CALL_KEY);
    }
    notifyTelephonyUpdate();
  } catch (err) {
    console.error('Error setting active call:', err);
  }
}

export function loadSmsConversations(): SmsConversation[] {
  return SEED_SMS_CONVERSATIONS;
}

export async function fetchSmsConversations(): Promise<SmsConversation[]> {
  const q = query(collection(db, SMS_CONVERSATIONS_COLLECTION), orderBy('lastMessageAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as SmsConversation);
}

export function subscribeToSmsConversations(callback: (convs: SmsConversation[]) => void) {
  const q = query(collection(db, SMS_CONVERSATIONS_COLLECTION), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const convs = snapshot.docs.map(doc => doc.data() as SmsConversation);
    callback(convs);
  });
}

export async function saveSmsConversations(convs: SmsConversation[]): Promise<void> {
  try {
    for (const conv of convs) {
      await setDoc(doc(db, SMS_CONVERSATIONS_COLLECTION, conv.id), conv);
    }
    notifyTelephonyUpdate();
  } catch (err) {
    console.error('Error saving SMS conversations to Firestore:', err);
  }
}

export function loadDamageReports(): DamageReport[] {
  try {
    const raw = localStorage.getItem(DAMAGE_REPORTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDamageReports(reports: DamageReport[]): void {
  try {
    localStorage.setItem(DAMAGE_REPORTS_KEY, JSON.stringify(reports));
    notifyTelephonyUpdate();
  } catch (err) {
    console.error('Error saving damage reports:', err);
  }
}

export function loadInsurancePolicies(): InsurancePolicy[] {
  try {
    const raw = localStorage.getItem(INSURANCE_POLICIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveInsurancePolicies(policies: InsurancePolicy[]): void {
  try {
    localStorage.setItem(INSURANCE_POLICIES_KEY, JSON.stringify(policies));
    notifyTelephonyUpdate();
  } catch (err) {
    console.error('Error saving insurance policies:', err);
  }
}

// ----------------- CUSTOMER LOOKUP -----------------

export function findCustomerByPhoneOrEmail(phoneOrEmail: string): CustomerAccount | null {
  const accounts = loadCustomerAccounts();
  const cleaned = phoneOrEmail.trim().toLowerCase().replace(/[\s\-()]/g, '');

  return (
    accounts.find((acc) => {
      const accEmail = acc.email.toLowerCase().trim();
      const accMobile = acc.mobile.replace(/[\s\-()]/g, '').trim();
      return (
        accEmail === phoneOrEmail.trim().toLowerCase() ||
        (cleaned.length > 5 && accMobile.includes(cleaned)) ||
        (cleaned.length > 5 && cleaned.includes(accMobile))
      );
    }) || null
  );
}

// ----------------- INBOUND CALL SIMULATION & IVR -----------------

export function initiateInboundCall(callerPhone: string, spokenEmail?: string): TelephonyCall {
  const accounts = loadCustomerAccounts();

  // 1. Phone match
  let matched = findCustomerByPhoneOrEmail(callerPhone);
  let ivrType: TelephonyCall['ivrInputType'] = 'auto_phone_match';
  let ivrTranscript = `Caller ID recognized: ${callerPhone}.`;

  // 2. If email was collected at start of call or verified via IVR:
  if (spokenEmail) {
    const matchedByEmail = findCustomerByPhoneOrEmail(spokenEmail);
    if (matchedByEmail) {
      matched = matchedByEmail;
      ivrType = 'speech_recognition';
      ivrTranscript = `Customer confirmed email address: "${spokenEmail}". Account identified. Routing to agent softphone with 360° screen-pop.`;
    } else {
      ivrTranscript = `Customer spoke email "${spokenEmail}". No prior account found; created temporary caller record.`;
    }
  } else if (matched) {
    ivrTranscript = `Caller phone ${callerPhone} matched existing account for ${matched.firstName} ${matched.lastName} (${matched.email}). Confirmed by Portabox IVR auto-lookup.`;
  } else {
    ivrTranscript = `Unrecognized caller ${callerPhone}. Prompting caller for email address via Australian voice prompt.`;
  }

  const callId = `CALL-${Date.now().toString().slice(-6)}`;
  const newCall: TelephonyCall = {
    id: callId,
    direction: 'inbound',
    callerPhone,
    callerEmail: spokenEmail || matched?.email,
    callerName: matched ? `${matched.firstName} ${matched.lastName}` : 'Portabox Inbound Caller',
    customerId: matched?.id,
    matchedCustomer: matched,
    status: 'ringing',
    startTime: Date.now(),
    durationSeconds: 0,
    ivrStep: matched ? 'agent_routed' : 'email_prompt',
    ivrInputType: ivrType,
    ivrTranscript,
    actionLog: [
      {
        timestamp: new Date().toLocaleTimeString('en-AU'),
        action: 'Inbound Call Received',
        details: `Caller dialed Portabox 1300 number from ${callerPhone}.`,
      },
      {
        timestamp: new Date().toLocaleTimeString('en-AU'),
        action: 'IVR Email Verification',
        details: ivrTranscript,
      },
    ],
  };

  setActiveCall(newCall);

  // Play incoming ring chime
  playRingChime();

  // Save to calls history
  const allCalls = loadTelephonyCalls();
  saveTelephonyCalls([newCall, ...allCalls]);

  return newCall;
}

export function answerCall(callId: string): TelephonyCall | null {
  const active = getActiveCall();
  if (!active || active.id !== callId) return null;

  active.status = 'connected';
  active.actionLog.push({
    timestamp: new Date().toLocaleTimeString('en-AU'),
    action: 'Call Answered',
    details: 'Call center agent connected via WebRTC Portabox Softphone.',
  });

  setActiveCall(active);

  const allCalls = loadTelephonyCalls();
  const idx = allCalls.findIndex((c) => c.id === callId);
  if (idx >= 0) {
    allCalls[idx] = active;
    saveTelephonyCalls(allCalls);
  }

  return active;
}

export function holdCall(callId: string): TelephonyCall | null {
  const active = getActiveCall();
  if (!active || active.id !== callId) return null;

  const nextStatus = active.status === 'hold' ? 'connected' : 'hold';
  active.status = nextStatus;
  active.actionLog.push({
    timestamp: new Date().toLocaleTimeString('en-AU'),
    action: nextStatus === 'hold' ? 'Call Placed on Hold' : 'Call Resumed from Hold',
    details: nextStatus === 'hold' ? 'Agent placed caller on pleasant hold audio.' : 'Agent resumed live conversation.',
  });

  setActiveCall(active);
  return active;
}

export function hangupCall(
  callId: string,
  disposition?: CallDisposition,
  notes?: string
): TelephonyCall | null {
  const active = getActiveCall();
  if (!active || active.id !== callId) return null;

  active.status = 'ended';
  active.endTime = Date.now();
  active.durationSeconds = Math.max(1, Math.round((active.endTime - active.startTime) / 1000));
  if (disposition) active.disposition = disposition;
  if (notes) active.notes = notes;

  active.actionLog.push({
    timestamp: new Date().toLocaleTimeString('en-AU'),
    action: 'Call Terminated',
    details: `Call ended after ${Math.floor(active.durationSeconds / 60)}m ${active.durationSeconds % 60}s. Disposition: ${disposition || 'General'}.`,
  });

  setActiveCall(null);

  const allCalls = loadTelephonyCalls();
  const idx = allCalls.findIndex((c) => c.id === callId);
  if (idx >= 0) {
    allCalls[idx] = active;
    saveTelephonyCalls(allCalls);
  }

  return active;
}

// ----------------- CUSTOMER 360 INSTANT ACTIONS -----------------

// 1. Process instant refund on an invoice
export function processCustomerRefund(params: {
  customerId: string;
  transactionId: string;
  refundAmount: number;
  reason: string;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) {
    throw new Error(`Customer ${params.customerId} not found.`);
  }

  const customer = accounts[accIndex];
  const targetTxn = customer.transactions.find((t) => t.id === params.transactionId);

  const refundTxnId = `RFD-${Date.now().toString().slice(-4)}`;
  const refundTxn: CustomerTransaction = {
    id: refundTxnId,
    invoiceNumber: `INV-RFD-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-AU'),
    description: `Refund processed: ${params.reason}${targetTxn ? ` (against ${targetTxn.invoiceNumber})` : ''}`,
    amount: -Math.abs(params.refundAmount),
    status: 'Refunded',
    paymentMethod: targetTxn?.paymentMethod || 'Original Payment Method (Braintree)',
    transactionId: `bt_rfd_${Date.now()}`,
    isAdjustment: true,
    adjustmentType: 'refund',
  };

  customer.transactions = [refundTxn, ...customer.transactions];

  // If full refund on target txn, mark target as refunded
  if (targetTxn && Math.abs(params.refundAmount) >= targetTxn.amount) {
    targetTxn.status = 'Refunded';
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  // Log to active call if present
  const active = getActiveCall();
  if (active && active.customerId === params.customerId) {
    active.actionLog.push({
      timestamp: new Date().toLocaleTimeString('en-AU'),
      action: 'Refund Issued',
      details: `$${params.refundAmount} refunded. Reason: ${params.reason}.`,
    });
    setActiveCall(active);
  }

  return {
    success: true,
    message: `Successfully processed $${params.refundAmount} refund to customer ${customer.firstName} ${customer.lastName}.`,
    customer,
  };
}

// 2. Adjust billing rate / credit note
export function applyCustomerBillingAdjustment(params: {
  customerId: string;
  type: 'credit' | 'charge';
  amount: number;
  description: string;
  updateMonthlyRate?: boolean;
}): { success: boolean; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const adjTxn: CustomerTransaction = {
    id: `ADJ-${Date.now().toString().slice(-4)}`,
    invoiceNumber: `INV-ADJ-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-AU'),
    description: `Adjustment (${params.type === 'credit' ? 'Credit Note' : 'Manual Charge'}): ${params.description}`,
    amount: params.type === 'credit' ? -Math.abs(params.amount) : Math.abs(params.amount),
    status: params.type === 'credit' ? 'Paid' : 'Pending',
    paymentMethod: customer.paymentPlan?.cardBrand ? `${customer.paymentPlan.cardBrand} •••• ${customer.paymentPlan.cardLast4}` : 'Account Ledger',
    transactionId: `adj_${Date.now()}`,
    isAdjustment: true,
    adjustmentType: params.type,
  };

  customer.transactions = [adjTxn, ...customer.transactions];

  if (params.updateMonthlyRate && customer.paymentPlan) {
    const diff = params.type === 'credit' ? -params.amount : params.amount;
    customer.paymentPlan.periodicAmount = Math.max(0, customer.paymentPlan.periodicAmount + diff);
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  return { success: true, customer };
}

// 3. Update payment plan & autopay settings
export function updateCustomerPaymentPlan(params: {
  customerId: string;
  planType: CustomerAccount['paymentPlan']['planType'];
  autopayEnabled: boolean;
  periodicAmount?: number;
  paymentsCeased?: boolean;
  ceasedReason?: string;
}): { success: boolean; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  if (!customer.paymentPlan) {
    customer.paymentPlan = {
      planType: params.planType,
      planLabel: 'Monthly Automatic Debit',
      autopayEnabled: params.autopayEnabled,
      cardBrand: 'Visa',
      cardLast4: '4242',
      cardExpiry: '12/28',
      nextBillingDate: 'Next Month',
      periodicAmount: params.periodicAmount || 259,
      termDiscountPercent: 0,
    };
  } else {
    customer.paymentPlan.planType = params.planType;
    customer.paymentPlan.autopayEnabled = params.autopayEnabled;
    if (params.periodicAmount !== undefined) {
      customer.paymentPlan.periodicAmount = params.periodicAmount;
    }
    customer.paymentPlan.paymentsCeased = params.paymentsCeased || false;
    if (params.paymentsCeased) {
      customer.paymentPlan.paymentsCeasedDate = new Date().toLocaleDateString('en-AU');
      customer.paymentPlan.paymentsCeasedReason = params.ceasedReason || 'Ceased by Call Center Agent';
    } else {
      customer.paymentPlan.paymentsCeasedDate = undefined;
      customer.paymentPlan.paymentsCeasedReason = undefined;
    }
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);
  return { success: true, customer };
}

// 4. Update credit card payment details
export function updateCustomerCreditCard(params: {
  customerId: string;
  cardBrand: string;
  cardLast4: string;
  cardExpiry: string;
}): { success: boolean; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  if (customer.paymentPlan) {
    customer.paymentPlan.cardBrand = params.cardBrand;
    customer.paymentPlan.cardLast4 = params.cardLast4;
    customer.paymentPlan.cardExpiry = params.cardExpiry;
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  const active = getActiveCall();
  if (active && active.customerId === params.customerId) {
    active.actionLog.push({
      timestamp: new Date().toLocaleTimeString('en-AU'),
      action: 'Credit Card Updated',
      details: `New payment card registered: ${params.cardBrand} ending in ${params.cardLast4} (Exp ${params.cardExpiry}). Verified via Braintree vault token.`,
    });
    setActiveCall(active);
  }

  return { success: true, customer };
}

// 5. Extend rental duration
export function extendCustomerRental(params: {
  customerId: string;
  orderId: string;
  additionalMonths: number;
  monthlyRate: number;
  discountPercent?: number;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  const discount = params.discountPercent || 0;
  const subtotal = params.additionalMonths * params.monthlyRate;
  const totalCharge = Math.round(subtotal * (1 - discount / 100));

  // Add extension invoice
  const extTxn: CustomerTransaction = {
    id: `TXN-EXT-${Date.now().toString().slice(-4)}`,
    invoiceNumber: `INV-EXT-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-AU'),
    description: `Rental Extension: +${params.additionalMonths} Month${params.additionalMonths > 1 ? 's' : ''} for container ${order.containerId} (${discount > 0 ? `${discount}% term discount applied` : 'Standard monthly rate'})`,
    amount: totalCharge,
    status: 'Paid',
    paymentMethod: customer.paymentPlan ? `${customer.paymentPlan.cardBrand} •••• ${customer.paymentPlan.cardLast4}` : 'Credit Card',
    transactionId: `bt_ext_${Date.now()}`,
  };

  customer.transactions = [extTxn, ...customer.transactions];

  // Update order history
  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Rental Extended',
    note: `Extended storage contract by +${params.additionalMonths} months ($${totalCharge} charged).`,
  });

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  const active = getActiveCall();
  if (active && active.customerId === params.customerId) {
    active.actionLog.push({
      timestamp: new Date().toLocaleTimeString('en-AU'),
      action: 'Rental Extended',
      details: `Customer extended rental of ${order.containerId} by ${params.additionalMonths} month(s) for $${totalCharge}.`,
    });
    setActiveCall(active);
  }

  return {
    success: true,
    message: `Rental extended by +${params.additionalMonths} month(s) for container ${order.containerId}. Total $${totalCharge} invoiced.`,
    customer,
  };
}

// 6. Schedule pickup / return collection of container
export function scheduleContainerPickup(params: {
  customerId: string;
  orderId: string;
  pickupDate: string;
  timeSlot: string;
  pickupAddress: string;
  accessNotes: string;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  order.pickupRequestedDate = params.pickupDate;
  order.pickupStatus = 'Scheduled in Smartsheet';
  order.accessNotes = `${order.accessNotes ? order.accessNotes + ' | ' : ''}Pickup window: ${params.timeSlot}. Notes: ${params.accessNotes}`;
  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Pickup Scheduled',
    note: `Collection booked for ${params.pickupDate} (${params.timeSlot}) at ${params.pickupAddress}. Horizontal level-lift truck scheduled.`,
  });

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  // Send automatic SMS confirmation
  sendSmsMessage({
    customerPhone: customer.mobile,
    customerEmail: customer.email,
    customerName: `${customer.firstName} ${customer.lastName}`,
    customerId: customer.id,
    text: `Hi ${customer.firstName}, your Portabox pickup is confirmed for ${params.pickupDate} (${params.timeSlot}). Please ensure clear driveway access of 3.5m width for our level-lift truck.`,
    sender: 'system',
    actionType: 'pickup_booking',
  });

  const active = getActiveCall();
  if (active && active.customerId === params.customerId) {
    active.actionLog.push({
      timestamp: new Date().toLocaleTimeString('en-AU'),
      action: 'Pickup Scheduled',
      details: `Collection booked for ${order.containerId} on ${params.pickupDate} (${params.timeSlot}). Driver pickup manifest generated.`,
    });
    setActiveCall(active);
  }

  return {
    success: true,
    message: `Pickup confirmed for ${params.pickupDate} (${params.timeSlot}). Smartsheet logistics dispatched & SMS sent.`,
    customer,
  };
}

// 7. Report Container Damage
export function submitContainerDamageReport(report: Omit<DamageReport, 'id' | 'reportedAt' | 'status'>): DamageReport {
  const reports = loadDamageReports();
  const newReport: DamageReport = {
    ...report,
    id: `DMG-${Date.now().toString().slice(-5)}`,
    reportedAt: new Date().toLocaleString('en-AU'),
    status: 'Reported',
  };

  saveDamageReports([newReport, ...reports]);

  // Update customer order history
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === report.customerId);
  if (accIndex >= 0) {
    const customer = accounts[accIndex];
    const order = customer.orders.find((o) => o.id === report.orderId);
    if (order) {
      order.history.unshift({
        timestamp: new Date().toLocaleString('en-AU'),
        stage: 'Damage Reported',
        note: `Issue reported: ${report.category} (${report.severity}). Notes: ${report.notes}. Replacement requested: ${report.replaceContainerRequested ? 'Yes' : 'No'}.`,
      });
      accounts[accIndex] = customer;
      saveCustomerAccounts(accounts);
    }
  }

  const active = getActiveCall();
  if (active && active.customerId === report.customerId) {
    active.actionLog.push({
      timestamp: new Date().toLocaleTimeString('en-AU'),
      action: 'Container Damage Logged',
      details: `${report.category} (${report.severity}) recorded for ${report.containerId}. ${report.replaceContainerRequested ? 'Replacement container order flagged for yard manager.' : ''}`,
    });
    setActiveCall(active);
  }

  return newReport;
}

// 8. Add Insurance Protection
export function addCustomerInsuranceProtection(policy: Omit<InsurancePolicy, 'id' | 'activeFrom' | 'status' | 'policyNumber'>): InsurancePolicy {
  const policies = loadInsurancePolicies();
  const policyNumber = `POL-AU-${Date.now().toString().slice(-6)}`;
  const newPolicy: InsurancePolicy = {
    ...policy,
    id: `INS-${Date.now().toString().slice(-4)}`,
    activeFrom: new Date().toLocaleDateString('en-AU'),
    status: 'Active',
    policyNumber,
  };

  saveInsurancePolicies([newPolicy, ...policies]);

  // Update customer billing and order history
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === policy.customerId);
  if (accIndex >= 0) {
    const customer = accounts[accIndex];
    if (customer.paymentPlan && policy.monthlyPremium > 0) {
      customer.paymentPlan.periodicAmount += policy.monthlyPremium;
    }

    const order = customer.orders.find((o) => o.id === policy.orderId);
    if (order) {
      order.history.unshift({
        timestamp: new Date().toLocaleString('en-AU'),
        stage: 'Insurance Added',
        note: `${policy.tier} activated (Policy #${policyNumber}). Coverage limit: $${policy.coverAmount.toLocaleString()}. Premium: $${policy.monthlyPremium}/mo.`,
      });
    }

    accounts[accIndex] = customer;
    saveCustomerAccounts(accounts);
  }

  const active = getActiveCall();
  if (active && active.customerId === policy.customerId) {
    active.actionLog.push({
      timestamp: new Date().toLocaleTimeString('en-AU'),
      action: 'Insurance Added',
      details: `${policy.tier} activated with $${policy.coverAmount.toLocaleString()} cover (Policy #${policyNumber}).`,
    });
    setActiveCall(active);
  }

  return newPolicy;
}

// ----------------- SMS CONVERSATIONS HUB -----------------

export async function sendSmsMessage(params: {
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
  customerId?: string;
  text: string;
  sender?: 'agent' | 'system';
  actionType?: SmsMessage['actionType'];
  actionUrl?: string;
}): Promise<SmsMessage> {
  const convs = await fetchSmsConversations();
  const cleanedPhone = params.customerPhone.trim();

  let convIndex = convs.findIndex(
    (c) => c.customerPhone.replace(/\s+/g, '') === cleanedPhone.replace(/\s+/g, '')
  );

  let conv: SmsConversation;
  if (convIndex === -1) {
    conv = {
      id: `SMS-CONV-${Date.now().toString().slice(-4)}`,
      customerPhone: cleanedPhone,
      customerEmail: params.customerEmail,
      customerName: params.customerName || 'Customer',
      customerId: params.customerId,
      unreadCount: 0,
      lastMessageAt: 'Just now',
      messages: [],
    };
    convs.unshift(conv);
    convIndex = 0;
  } else {
    conv = convs[convIndex];
    if (params.customerName && !conv.customerName) conv.customerName = params.customerName;
    if (params.customerEmail && !conv.customerEmail) conv.customerEmail = params.customerEmail;
    if (params.customerId && !conv.customerId) conv.customerId = params.customerId;
  }

  const newMsg: SmsMessage = {
    id: `msg-${Date.now().toString().slice(-6)}`,
    conversationId: conv.id,
    sender: params.sender || 'agent',
    text: params.text,
    timestamp: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    status: 'delivered',
    actionType: params.actionType,
    actionUrl: params.actionUrl,
  };

  conv.messages.push(newMsg);
  conv.lastMessageAt = 'Just now';

  // Move active conversation to top
  convs.splice(convIndex, 1);
  convs.unshift(conv);

  await saveSmsConversations(convs);

  // If in an active call, add to log
  const active = getActiveCall();
  if (active && active.callerPhone.replace(/\s+/g, '') === cleanedPhone.replace(/\s+/g, '')) {
    active.actionLog.push({
      timestamp: new Date().toLocaleTimeString('en-AU'),
      action: 'SMS Sent',
      details: `Sent SMS to customer: "${params.text.slice(0, 60)}${params.text.length > 60 ? '...' : ''}"`,
    });
    setActiveCall(active);
  }

  return newMsg;
}

export function simulateCustomerInboundSms(conversationId: string, replyText: string): SmsMessage {
  const convs = loadSmsConversations();
  const conv = convs.find((c) => c.id === conversationId);
  if (!conv) throw new Error('Conversation not found');

  const newMsg: SmsMessage = {
    id: `msg-in-${Date.now().toString().slice(-6)}`,
    conversationId,
    sender: 'customer',
    text: replyText,
    timestamp: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    status: 'delivered',
  };

  conv.messages.push(newMsg);
  conv.unreadCount += 1;
  conv.lastMessageAt = 'Just now';

  // Move conversation to top
  const idx = convs.indexOf(conv);
  if (idx > 0) {
    convs.splice(idx, 1);
    convs.unshift(conv);
  }

  saveSmsConversations(convs);
  return newMsg;
}

// ----------------- TWILIO TWIML SIMULATOR -----------------

export function generateTwilioTwiML(callerPhone: string, customer?: CustomerAccount | null): string {
  if (customer) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Nicole" language="en-AU">
    G'day ${customer.firstName}! Welcome back to Portabox Australian Container Moving and Storage.
    We've recognized your phone number and verified your email address as ${customer.email}.
    Connecting you now with our Australian call center support team.
  </Say>
  <Dial callerId="+611300767822" record="record-from-answer-dual" action="/v1/twilio/voice/status">
    <Client>portabox-agent-browser</Client>
  </Dial>
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" timeout="5" speechTimeout="auto" action="/v1/twilio/ivr/email-collect">
    <Say voice="Polly.Nicole" language="en-AU">
      Thank you for calling Portabox Moving and Storage Australia.
      To open your account history immediately for our call center team, please say your email address now, or press star to speak with an operator.
    </Say>
  </Gather>
  <Say voice="Polly.Nicole" language="en-AU">
    We didn't catch that. Please hold while we transfer you to an available Portabox representative.
  </Say>
  <Dial callerId="+611300767822">
    <Client>portabox-agent-browser</Client>
  </Dial>
</Response>`;
}
