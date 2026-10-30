import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Mic,
  MicOff,
  Volume2,
  DollarSign,
  CreditCard,
  RotateCcw,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  MapPin,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Radio,
  ArrowRight,
  Scale,
  FileCheck,
  Landmark,
  Layers,
  PenTool,
  CheckSquare,
  XCircle,
  ArrowUpRight,
  Camera,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import {
  CustomerAccount,
  ContainerOrder,
  CustomerTransaction,
  loadCustomerAccounts,
  checkDepotInventoryForUpgrade,
  modifyContainerSizeOrQuantity,
  cancelPreDeliveryOrderWithPolicy,
  rescheduleOrderDelivery,
  updatePermitAndHoaClearance,
  updateSpecificPlacementInstructions,
  resolveDeliveryDispute,
  signDigitalRentalAgreement,
} from '../../services/customerPortalService';
import { TwilioLiveIntelligencePanel } from './TwilioLiveIntelligencePanel';
import { getActiveStreamSession } from '../../services/twilioStreamService';
import { StreamSummaryData } from '../../types/twilioStream';
import {
  TelephonyCall,
  getActiveCall,
  answerCall,
  holdCall,
  hangupCall,
  processCustomerRefund,
  applyCustomerBillingAdjustment,
  updateCustomerPaymentPlan,
  updateCustomerCreditCard,
  extendCustomerRental,
  scheduleContainerPickup,
  submitContainerDamageReport,
  addCustomerInsuranceProtection,
  sendSmsMessage,
  loadSmsConversations,
  loadDamageReports,
  loadInsurancePolicies,
  CallDisposition,
  DamageReport,
  InsurancePolicy,
  SmsConversation,
} from '../../services/telephonyService';

interface Customer360DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAccount | null;
  activeCall?: TelephonyCall | null;
  onCustomerUpdated?: (updated: CustomerAccount) => void;
}

export const Customer360Drawer: React.FC<Customer360DrawerProps> = ({
  isOpen,
  onClose,
  customer,
  activeCall,
  onCustomerUpdated,
}) => {
  const [currentCustomer, setCurrentCustomer] = useState<CustomerAccount | null>(customer);
  const [activeTab, setActiveTab] = useState<
    | 'orders'
    | 'stream_ai'
    | 'size_change'
    | 'cancellation'
    | 'reschedule'
    | 'permit_hoa'
    | 'placement_site'
    | 'dispute_audit'
    | 'e_signature'
    | 'refunds'
    | 'payment_plan'
    | 'card_update'
    | 'extend'
    | 'pickup'
    | 'damage'
    | 'insurance'
    | 'sms'
  >('orders');
  const [liveStreamData, setLiveStreamData] = useState<StreamSummaryData | null>(getActiveStreamSession());

  // Call control state
  const [isMuted, setIsMuted] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [selectedDisposition, setSelectedDisposition] = useState<CallDisposition>('General Inquiry');
  const [callNotes, setCallNotes] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Refund Form State
  const [refundTargetTxnId, setRefundTargetTxnId] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<number>(149);
  const [refundReason, setRefundReason] = useState<string>('Delivery fee waiver / promotional rebate');

  // Billing Adjustment Form State
  const [adjType, setAdjType] = useState<'credit' | 'charge'>('credit');
  const [adjAmount, setAdjAmount] = useState<number>(50);
  const [adjDescription, setAdjDescription] = useState<string>('Prorated storage adjustment');
  const [adjUpdateRate, setAdjUpdateRate] = useState<boolean>(true);

  // Payment Plan Form State
  const [planTypeSelection, setPlanTypeSelection] = useState<CustomerAccount['paymentPlan']['planType']>('monthly');
  const [autopayEnabled, setAutopayEnabled] = useState<boolean>(true);

  // Credit Card Form State
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('11/28');
  const [cardCvc, setCardCvc] = useState('');

  // Rental Extension Form State
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [extensionMonths, setExtensionMonths] = useState<number>(1);

  // Pickup Scheduling Form State
  const [pickupDate, setPickupDate] = useState<string>('2026-10-22');
  const [pickupSlot, setPickupSlot] = useState<string>('Morning Window (8:00 AM – 11:30 AM)');
  const [pickupInstructions, setPickupInstructions] = useState<string>('Ground pads in place. Direct level driveway access.');

  // Damage Report Form State
  const [damageCategory, setDamageCategory] = useState<DamageReport['category']>('Door seal leak');
  const [damageSeverity, setDamageSeverity] = useState<DamageReport['severity']>('Minor (Usable)');
  const [damageNotes, setDamageNotes] = useState<string>('');
  const [damageReplaceContainer, setDamageReplaceContainer] = useState<boolean>(false);

  // Insurance Form State
  const [insuranceTier, setInsuranceTier] = useState<InsurancePolicy['tier']>('Silver ($25,000 cover · $35/mo)');

  // 1. Container Size or Quantity Change Form State
  const [sizeUpgradeTarget, setSizeUpgradeTarget] = useState<'medium_19m3' | 'large_25m3' | 'two_large_50m3'>('large_25m3');
  const [sizeUpgradeReason, setSizeUpgradeReason] = useState<string>('Mid-packing space shortage: upgrading to 16-foot (25 m³) container.');
  const [depotInventoryCheckResult, setDepotInventoryCheckResult] = useState<{ checked: boolean; available: boolean; count: number; unitIds: string[] } | null>(null);

  // 2. Pre-Delivery Cancellation Form State
  const [cancelOrderReason, setCancelOrderReason] = useState<string>('Home purchase contract aborted; move cancelled.');

  // 3. Reschedule Form State
  const [rescheduleDate, setRescheduleDate] = useState<string>('2026-10-28');
  const [rescheduleSlot, setRescheduleSlot] = useState<string>('Morning Window (8:00 AM – 11:30 AM)');
  const [rescheduleReason, setRescheduleReason] = useState<string>('Settlement and closing date delayed by 2 weeks.');

  // 4. Municipal Permit & HOA Clearance Form State
  const [permitStatusChoice, setPermitStatusChoice] = useState<'Permit Approved' | 'Permit Required (Hold)' | 'Permit Under Review'>('Permit Approved');
  const [permitCouncilName, setPermitCouncilName] = useState<string>('City of Holdfast Bay Council (Road Placement Permit #CP-2026-88)');
  const [permitDocName, setPermitDocName] = useState<string>('Council_Street_Permit_Approved.pdf');
  const [permitNotesText, setPermitNotesText] = useState<string>('Permit granted for 14-day roadside parking bay placement with reflective safety cones.');

  // 5. Specific Placement Instructions Form State
  const [specificPlacementInput, setSpecificPlacementInput] = useState<string>('Place container on the left side of driveway, door facing the garage, 5 feet from the sidewalk.');

  // 6. Failed Delivery Dispute Audit Form State
  const [disputeResolutionDecision, setDisputeResolutionDecision] = useState<'courtesy_credit' | 'uphold_fee'>('courtesy_credit');
  const [disputeExplanationText, setDisputeExplanationText] = useState<string>('One-time courtesy credit issued as goodwill gesture after customer clarified driveway was cleared 15 mins later.');
  const [disputeCreditAmountInput, setDisputeCreditAmountInput] = useState<number>(99);

  // 7. Digital Agreement E-Signature Form State
  const [eSignerName, setESignerName] = useState<string>('');
  const [eSignAgreed, setESignAgreed] = useState<boolean>(true);

  // SMS Live Thread State
  const [smsText, setSmsText] = useState('');
  const [smsConversation, setSmsConversation] = useState<SmsConversation | null>(null);

  // Keep customer updated when prop changes or on local modifications
  useEffect(() => {
    setCurrentCustomer(customer);
    if (customer?.orders?.length && !selectedOrderId) {
      setSelectedOrderId(customer.orders[0].id);
    }
    if (customer?.firstName && !eSignerName) {
      setESignerName(`${customer.firstName} ${customer.lastName || ''}`.trim());
    }
    if (customer?.paymentPlan) {
      setPlanTypeSelection(customer.paymentPlan.planType);
      setAutopayEnabled(customer.paymentPlan.autopayEnabled);
    }
  }, [customer]);

  // Sync SMS thread for this customer
  useEffect(() => {
    if (!currentCustomer) return;
    const convs = loadSmsConversations();
    const found = convs.find(
      (c) =>
        c.customerId === currentCustomer.id ||
        c.customerPhone.replace(/\s+/g, '') === currentCustomer.mobile.replace(/\s+/g, '')
    );
    setSmsConversation(found || null);
  }, [currentCustomer, activeTab]);

  // Listen to Twilio Media Stream & AI intelligence updates
  useEffect(() => {
    const handleStreamUpdate = () => {
      setLiveStreamData(getActiveStreamSession());
    };
    window.addEventListener('portabox-stream-update', handleStreamUpdate);
    return () => window.removeEventListener('portabox-stream-update', handleStreamUpdate);
  }, []);

  const handleApplyActionPayload = (tab: string, payload?: Record<string, any>) => {
    if (!payload) return;
    if (payload.additionalMonths !== undefined) setExtensionMonths(Number(payload.additionalMonths));
    if (payload.orderId) setSelectedOrderId(payload.orderId);
    if (payload.pickupDate) setPickupDate(payload.pickupDate);
    if (payload.pickupSlot) setPickupSlot(payload.pickupSlot);
    if (payload.pickupInstructions) setPickupInstructions(payload.pickupInstructions);
    if (payload.category) setDamageCategory(payload.category);
    if (payload.severity) setDamageSeverity(payload.severity);
    if (payload.replaceContainerRequested !== undefined) setDamageReplaceContainer(payload.replaceContainerRequested);
    if (payload.notes) setDamageNotes(payload.notes);

    // Scenario prefill mappings
    if (payload.targetSize) setSizeUpgradeTarget(payload.targetSize);
    if (payload.upgradeReason) setSizeUpgradeReason(payload.upgradeReason);
    if (payload.cancelReason) setCancelOrderReason(payload.cancelReason);
    if (payload.rescheduleDate) setRescheduleDate(payload.rescheduleDate);
    if (payload.rescheduleSlot) setRescheduleSlot(payload.rescheduleSlot);
    if (payload.rescheduleReason) setRescheduleReason(payload.rescheduleReason);
    if (payload.permitStatus) setPermitStatusChoice(payload.permitStatus);
    if (payload.permitNotes) setPermitNotesText(payload.permitNotes);
    if (payload.placementInstructions) setSpecificPlacementInput(payload.placementInstructions);
    if (payload.disputeOutcome) setDisputeResolutionDecision(payload.disputeOutcome);
    if (payload.disputeExplanation) setDisputeExplanationText(payload.disputeExplanation);
  };

  // Active call duration counter
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      setCallTimer(0);
      return;
    }
    const interval = setInterval(() => {
      setCallTimer(Math.floor((Date.now() - activeCall.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  const showToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers
  const handleAnswerCall = () => {
    if (activeCall) {
      answerCall(activeCall.id);
      showToast('Connected to customer on WebRTC Softphone.');
    }
  };

  const handleHoldToggle = () => {
    if (activeCall) {
      holdCall(activeCall.id);
      showToast(activeCall.status === 'hold' ? 'Call resumed from hold.' : 'Call placed on hold.');
    }
  };

  const handleEndCall = () => {
    if (activeCall) {
      hangupCall(activeCall.id, selectedDisposition, callNotes);
      showToast(`Call ended. Disposition saved: ${selectedDisposition}`);
    }
  };

  const handleProcessRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    try {
      const res = processCustomerRefund({
        customerId: currentCustomer.id,
        transactionId: refundTargetTxnId || currentCustomer.transactions[0]?.id || '',
        refundAmount: Number(refundAmount),
        reason: refundReason,
      });
      setCurrentCustomer(res.customer);
      onCustomerUpdated?.(res.customer);
      showToast(res.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    try {
      const res = applyCustomerBillingAdjustment({
        customerId: currentCustomer.id,
        type: adjType,
        amount: Number(adjAmount),
        description: adjDescription,
        updateMonthlyRate: adjUpdateRate,
      });
      setCurrentCustomer(res.customer);
      onCustomerUpdated?.(res.customer);
      showToast(`Applied $${adjAmount} ${adjType} to customer account.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePaymentPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    try {
      const res = updateCustomerPaymentPlan({
        customerId: currentCustomer.id,
        planType: planTypeSelection,
        autopayEnabled,
      });
      setCurrentCustomer(res.customer);
      onCustomerUpdated?.(res.customer);
      showToast(`Updated billing plan to ${planTypeSelection.replace('_', ' ')} (Autopay: ${autopayEnabled ? 'On' : 'Off'}).`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveCreditCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const last4 = cardNumber.slice(-4) || '9142';
    try {
      const res = updateCustomerCreditCard({
        customerId: currentCustomer.id,
        cardBrand,
        cardLast4: last4,
        cardExpiry: cardExpiry || '12/28',
      });
      setCurrentCustomer(res.customer);
      onCustomerUpdated?.(res.customer);
      setCardNumber('');
      showToast(`Registered new ${cardBrand} •••• ${last4} on Braintree vault.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendCardUpdateSms = () => {
    if (!currentCustomer) return;
    sendSmsMessage({
      customerPhone: currentCustomer.mobile,
      customerEmail: currentCustomer.email,
      customerName: `${currentCustomer.firstName} ${currentCustomer.lastName}`,
      customerId: currentCustomer.id,
      text: `Hi ${currentCustomer.firstName}, Portabox call center has sent you a secure Braintree card update link: https://portabox.com.au/pay/update-card?ref=${currentCustomer.id}`,
      actionType: 'card_update',
      actionUrl: `https://portabox.com.au/pay/update-card?ref=${currentCustomer.id}`,
    });
    showToast(`Secure payment update link dispatched via SMS to ${currentCustomer.mobile}.`);
    // Refresh conversation
    const convs = loadSmsConversations();
    const found = convs.find((c) => c.customerId === currentCustomer.id);
    setSmsConversation(found || null);
  };

  const handleExtendRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const targetOrder = currentCustomer.orders.find((o) => o.id === selectedOrderId) || currentCustomer.orders[0];
    if (!targetOrder) return;
    const monthlyRate = currentCustomer.paymentPlan?.periodicAmount || 259;
    const discount = extensionMonths >= 6 ? 10 : extensionMonths >= 3 ? 5 : 0;
    try {
      const res = extendCustomerRental({
        customerId: currentCustomer.id,
        orderId: targetOrder.id,
        additionalMonths: Number(extensionMonths),
        monthlyRate,
        discountPercent: discount,
      });
      setCurrentCustomer(res.customer);
      onCustomerUpdated?.(res.customer);
      showToast(res.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSchedulePickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const targetOrder = currentCustomer.orders.find((o) => o.id === selectedOrderId) || currentCustomer.orders[0];
    if (!targetOrder) return;
    try {
      const res = scheduleContainerPickup({
        customerId: currentCustomer.id,
        orderId: targetOrder.id,
        pickupDate,
        timeSlot: pickupSlot,
        pickupAddress: targetOrder.originAddress,
        accessNotes: pickupInstructions,
      });
      setCurrentCustomer(res.customer);
      onCustomerUpdated?.(res.customer);
      showToast(res.message);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReportDamage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const targetOrder = currentCustomer.orders.find((o) => o.id === selectedOrderId) || currentCustomer.orders[0];
    if (!targetOrder) return;
    try {
      const report = submitContainerDamageReport({
        customerId: currentCustomer.id,
        orderId: targetOrder.id,
        containerId: targetOrder.containerId,
        category: damageCategory,
        severity: damageSeverity,
        replaceContainerRequested: damageReplaceContainer,
        notes: damageNotes,
      });
      // reload customer
      const accounts = loadCustomerAccounts();
      const refreshed = accounts.find((a) => a.id === currentCustomer.id);
      if (refreshed) {
        setCurrentCustomer(refreshed);
        onCustomerUpdated?.(refreshed);
      }
      setDamageNotes('');
      showToast(`Damage report ${report.id} logged. Yard supervisor notified.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddInsurance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) return;
    const targetOrder = currentCustomer.orders.find((o) => o.id === selectedOrderId) || currentCustomer.orders[0];
    if (!targetOrder) return;

    let coverAmount = 25000;
    let premium = 35;
    if (insuranceTier.includes('10,000')) {
      coverAmount = 10000;
      premium = 15;
    } else if (insuranceTier.includes('50,000')) {
      coverAmount = 50000;
      premium = 60;
    } else if (insuranceTier.includes('100,000')) {
      coverAmount = 100000;
      premium = 95;
    }

    try {
      const policy = addCustomerInsuranceProtection({
        customerId: currentCustomer.id,
        orderId: targetOrder.id,
        containerId: targetOrder.containerId,
        tier: insuranceTier,
        coverAmount,
        monthlyPremium: premium,
      });
      const accounts = loadCustomerAccounts();
      const refreshed = accounts.find((a) => a.id === currentCustomer.id);
      if (refreshed) {
        setCurrentCustomer(refreshed);
        onCustomerUpdated?.(refreshed);
      }
      showToast(`Container Care Insurance activated (Policy #${policy.policyNumber})`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendCustomSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer || !smsText.trim()) return;
    sendSmsMessage({
      customerPhone: currentCustomer.mobile,
      customerEmail: currentCustomer.email,
      customerName: `${currentCustomer.firstName} ${currentCustomer.lastName}`,
      customerId: currentCustomer.id,
      text: smsText.trim(),
      sender: 'agent',
    });
    setSmsText('');
    const convs = loadSmsConversations();
    const found = convs.find((c) => c.customerId === currentCustomer.id);
    setSmsConversation(found || null);
    showToast('SMS message delivered to customer.');
  };

  const handleSendMacroSms = (macroType: 'eta' | 'access' | 'receipt') => {
    if (!currentCustomer) return;
    const order = currentCustomer.orders[0];
    let text = '';
    let actionType: any = undefined;
    if (macroType === 'eta') {
      text = `Hi ${currentCustomer.firstName}, your Portabox delivery window is ${order?.deliveryWindow || 'Morning Window'}. Driver Dave is on route. Track live: https://portabox.com.au/track/${order?.orderNumber || 'PBO-9841'}`;
      actionType = 'eta_tracking';
    } else if (macroType === 'access') {
      text = `Hi ${currentCustomer.firstName}, please tap here to upload a quick photo of your driveway placement site: https://portabox.com.au/site-access/upload?ref=${currentCustomer.id}`;
      actionType = 'access_upload';
    } else if (macroType === 'receipt') {
      text = `Hi ${currentCustomer.firstName}, here is your latest Portabox tax invoice receipt: https://portabox.com.au/invoices/latest?ref=${currentCustomer.id}`;
      actionType = 'invoice_receipt';
    }

    sendSmsMessage({
      customerPhone: currentCustomer.mobile,
      customerEmail: currentCustomer.email,
      customerName: `${currentCustomer.firstName} ${currentCustomer.lastName}`,
      customerId: currentCustomer.id,
      text,
      sender: 'agent',
      actionType,
    });
    const convs = loadSmsConversations();
    const found = convs.find((c) => c.customerId === currentCustomer.id);
    setSmsConversation(found || null);
    showToast('Dispatched macro template via SMS.');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity duration-300">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
        {/* ================= 1. LIVE TELEPHONY CALL BANNER ================= */}
        {activeCall ? (
          <div
            className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b transition-colors ${
              activeCall.status === 'ringing'
                ? 'bg-amber-500 text-slate-950 border-amber-600 animate-pulse'
                : activeCall.status === 'hold'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-[#0b2942] text-white border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
                  activeCall.status === 'ringing'
                    ? 'bg-slate-950 text-amber-400'
                    : activeCall.status === 'hold'
                    ? 'bg-white text-amber-700'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {activeCall.status === 'ringing' ? (
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20">
                    {activeCall.status === 'ringing'
                      ? 'INBOUND RINGING'
                      : activeCall.status === 'hold'
                      ? 'CALL ON HOLD'
                      : 'LIVE CALL CONNECTED'}
                  </span>
                  <span className="font-mono text-xs font-semibold opacity-90">
                    {activeCall.status === 'connected' ? formatTimer(callTimer) : '00:00'}
                  </span>
                </div>
                <div className="text-sm font-extrabold flex items-center gap-2 mt-0.5">
                  <span>{activeCall.callerName || activeCall.callerPhone}</span>
                  <span className="opacity-75 font-mono text-xs">({activeCall.callerPhone})</span>
                </div>
              </div>
            </div>

            {/* Inbound Call Controls */}
            <div className="flex items-center gap-2">
              {activeCall.status === 'ringing' ? (
                <>
                  <button
                    onClick={handleAnswerCall}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                  >
                    <Phone className="w-4 h-4 fill-white" />
                    ANSWER CALL
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Decline
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      isMuted ? 'bg-rose-600 text-white border-rose-600' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setActiveTab('stream_ai')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 text-xs font-bold transition-colors cursor-pointer"
                    title="View live Twilio audio stream & Gemini real-time summary"
                  >
                    <Radio className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
                    <span>Media Stream</span>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  </button>

                  <button
                    onClick={handleHoldToggle}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-colors ${
                      activeCall.status === 'hold'
                        ? 'bg-amber-400 text-slate-900 border-amber-300'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    {activeCall.status === 'hold' ? 'Resume' : 'Hold'}
                  </button>

                  <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2 py-1 text-xs">
                    <span className="text-[10px] text-white/70 font-semibold">Disposition:</span>
                    <select
                      value={selectedDisposition}
                      onChange={(e) => setSelectedDisposition(e.target.value as CallDisposition)}
                      className="bg-transparent text-white font-bold text-xs focus:outline-hidden cursor-pointer"
                    >
                      <option value="General Inquiry" className="text-slate-900">General Inquiry</option>
                      <option value="Billing & Refund" className="text-slate-900">Billing & Refund</option>
                      <option value="Payment Plan Update" className="text-slate-900">Payment Plan Update</option>
                      <option value="Credit Card Updated" className="text-slate-900">Credit Card Updated</option>
                      <option value="Rental Extension" className="text-slate-900">Rental Extension</option>
                      <option value="Order Pickup Scheduled" className="text-slate-900">Pickup Scheduled</option>
                      <option value="Damage Logged" className="text-slate-900">Damage Logged</option>
                      <option value="Insurance Added" className="text-slate-900">Insurance Added</option>
                      <option value="SMS Sent" className="text-slate-900">SMS Sent</option>
                    </select>
                  </div>

                  <button
                    onClick={handleEndCall}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    End Call
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {/* ================= 2. CUSTOMER 360 HEADER ================= */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00c0f3] text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
              {currentCustomer ? (
                `${currentCustomer.firstName.charAt(0)}${currentCustomer.lastName.charAt(0)}`
              ) : (
                <User className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-[#0b2942]">
                  {currentCustomer ? `${currentCustomer.firstName} ${currentCustomer.lastName}` : 'No Customer Selected'}
                </h2>
                {currentCustomer?.verified && (
                  <span className="flex items-center gap-1 text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ID & Email Verified
                  </span>
                )}
                {currentCustomer?.id && (
                  <span className="text-xs font-mono font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600">
                    {currentCustomer.id}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-600 mt-1 flex-wrap">
                <span className="font-semibold">{currentCustomer?.email}</span>
                <span>•</span>
                <span className="font-mono font-semibold">{currentCustomer?.mobile}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {currentCustomer?.suburb}, {currentCustomer?.state} {currentCustomer?.postcode}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sms')}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 text-[#00c0f3] hover:bg-sky-100 rounded-xl font-bold text-xs border border-sky-200 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              SMS Live Thread
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Action Success Toast Banner */}
        {actionSuccessMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-100 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= 3. NAVIGATION TABS (WORKSPACES) ================= */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'orders', label: 'Active Containers & Orders', icon: Box },
            { id: 'stream_ai', label: 'Twilio Stream & AI Summary', icon: Sparkles },
            { id: 'size_change', label: 'Size Upgrade / Add Unit', icon: Layers },
            { id: 'cancellation', label: 'Cancel & Policy Refund', icon: XCircle },
            { id: 'reschedule', label: 'Reschedule Delivery', icon: Clock },
            { id: 'permit_hoa', label: 'Permit & HOA Clearance', icon: Landmark },
            { id: 'placement_site', label: 'Placement & Site Logistics', icon: MapPin },
            { id: 'dispute_audit', label: 'Delivery Dispute & Audit', icon: Scale },
            { id: 'e_signature', label: 'Rental Agreement & E-Sign', icon: PenTool },
            { id: 'refunds', label: 'Refunds & Invoices', icon: RotateCcw },
            { id: 'payment_plan', label: 'Payment Plan & Autopay', icon: DollarSign },
            { id: 'card_update', label: 'Update Card Details', icon: CreditCard },
            { id: 'extend', label: 'Extend Rental', icon: Calendar },
            { id: 'pickup', label: 'Order Pickup', icon: Truck },
            { id: 'damage', label: 'Report Damage', icon: AlertTriangle },
            { id: 'insurance', label: 'Add Insurance', icon: ShieldCheck },
            { id: 'sms', label: 'SMS Thread', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#00c0f3] text-[#00c0f3]'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#00c0f3]' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= 4. TAB CONTENT PANELS ================= */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
          {!currentCustomer ? (
            <div className="text-center py-16 text-slate-400">
              <PhoneCall className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-extrabold text-slate-700">No Customer Profile Loaded</p>
              <p className="text-xs text-slate-500 mt-1">
                Enter a caller's phone number or email address to trigger screen-pop.
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: ORDERS & LOGISTICS */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  {/* REAL-TIME TWILIO MEDIA STREAM & AI INTELLIGENCE SUMMARY BANNER */}
                  {liveStreamData && (
                    <div className="bg-gradient-to-br from-[#0b2942] via-[#0f3456] to-slate-900 text-white rounded-3xl p-5 border border-slate-750 shadow-md space-y-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#00c0f3] flex items-center justify-center text-white shadow-xs">
                            <Radio className={`w-4 h-4 ${liveStreamData.status === 'streaming' ? 'animate-pulse' : ''}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-white">Twilio Media Stream Intelligence</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                {liveStreamData.status === 'streaming' ? 'LIVE AUDIO STREAM' : 'SYNCHRONIZED'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-300">
                              Caller Intent: <strong className="text-[#00c0f3]">{liveStreamData.customerIntent}</strong> • Sentiment: <span className="capitalize">{liveStreamData.sentiment}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setActiveTab('stream_ai')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00c0f3] hover:bg-sky-400 text-white font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>View Full Stream & AI Bullets</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-medium bg-white/5 p-3 rounded-xl border border-white/10">
                        {liveStreamData.executiveSummary}
                      </p>

                      {/* Top 3 Live Bullet Points Preview */}
                      {liveStreamData.bulletPoints?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {liveStreamData.bulletPoints.flatMap((g: any) => g.points).slice(0, 4).map((bullet: string, bIdx: number) => (
                            <div key={bIdx} className="flex items-start gap-2 text-slate-300 text-[11px] bg-white/5 px-2.5 py-1.5 rounded-lg">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00c0f3] mt-1 shrink-0" />
                              <span className="line-clamp-2">{bullet}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                      <Box className="w-4 h-4 text-[#00c0f3]" />
                      Container Orders ({currentCustomer.orders.length})
                    </h3>
                    <span className="text-xs text-slate-500">
                      Standard Horizontal Level-Lift Placement Guaranteed
                    </span>
                  </div>

                  {currentCustomer.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 hover:border-sky-200 transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                              {ord.orderNumber}
                            </span>
                            <span className="font-extrabold text-slate-900 text-sm">{ord.containerName}</span>
                            <span className="font-mono text-xs text-[#00c0f3] font-bold">
                              ID: {ord.containerId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {ord.location}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-100 text-[#00c0f3]">
                          {ord.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Delivery Window</span>
                          <span className="font-extrabold text-slate-800">{ord.deliveryWindow}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Assigned Driver</span>
                          <span className="font-extrabold text-slate-800">{ord.driverName || 'Metro Dispatch Fleet'}</span>
                          <span className="block text-slate-500 font-mono text-[11px]">{ord.driverPhone}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Pickup Status</span>
                          <span className="font-extrabold text-emerald-700">
                            {ord.pickupStatus || 'Placement Ongoing'}
                          </span>
                        </div>
                      </div>

                      {/* SCENARIO ALERT BANNERS */}
                      {/* 1. Municipal Permit & HOA Clearance Hold */}
                      {ord.permitStatus === 'Permit Required (Hold)' && (
                        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-3 text-xs animate-in fade-in">
                          <div className="flex items-center gap-2 text-amber-900">
                            <Landmark className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="font-extrabold block">MUNICIPAL PERMIT & HOA CLEARANCE REQUIRED (HOLD)</span>
                              <span className="text-[11px] text-amber-800">
                                {ord.permitNotes || 'Street/nature strip placement requires council permit. Driver dispatch locked.'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedOrderId(ord.id);
                              setActiveTab('permit_hoa');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                          >
                            Verify & Clear Permit
                          </button>
                        </div>
                      )}

                      {/* 2. Site Access Complication Alert */}
                      {ord.siteAccessComplication && (
                        <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs animate-in fade-in ${
                          ord.siteAccessComplication.resolved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-rose-50 border-rose-300 text-rose-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`w-4 h-4 shrink-0 ${ord.siteAccessComplication.resolved ? 'text-emerald-600' : 'text-rose-600'}`} />
                            <div>
                              <span className="font-extrabold block">
                                {ord.siteAccessComplication.resolved ? '✓ SITE COMPLICATION RESOLVED' : '🚨 SITE ACCESS COMPLICATION REPORTED'}
                              </span>
                              <span className="text-[11px]">
                                {ord.siteAccessComplication.reasonLabel} · GPS: {ord.siteAccessComplication.gpsLat}, {ord.siteAccessComplication.gpsLng}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedOrderId(ord.id);
                              setActiveTab('dispute_audit');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                          >
                            Audit Evidence & Dispute
                          </button>
                        </div>
                      )}

                      {/* 3. Open Delivery Fee Dispute Banner */}
                      {ord.deliveryDispute && ord.deliveryDispute.status === 'Open' && (
                        <div className="p-3 rounded-2xl bg-purple-50 border border-purple-300 flex items-center justify-between gap-3 text-xs animate-in fade-in">
                          <div className="flex items-center gap-2 text-purple-900">
                            <Scale className="w-4 h-4 text-purple-600 shrink-0" />
                            <div>
                              <span className="font-extrabold block">ACTIVE DELIVERY DISPUTE ($99 DRY-RUN FEE)</span>
                              <span className="text-[11px] text-purple-800">{ord.deliveryDispute.reason}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedOrderId(ord.id);
                              setActiveTab('dispute_audit');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                          >
                            Audit GPS & Resolve
                          </button>
                        </div>
                      )}

                      {/* 4. Placement Directives & E-Sign Chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        {ord.specificPlacementInstructions ? (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-medium flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#00c0f3]" />
                            <strong>Placement Directive:</strong> {ord.specificPlacementInstructions}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedOrderId(ord.id);
                              setActiveTab('placement_site');
                            }}
                            className="text-[#00c0f3] hover:underline font-bold cursor-pointer"
                          >
                            + Add Specific Placement Instructions
                          </button>
                        )}

                        {ord.eSignature ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <strong>Agreement Signed:</strong> {ord.eSignature.signedBy} ({ord.eSignature.documentRef})
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedOrderId(ord.id);
                              setActiveTab('e_signature');
                            }}
                            className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold hover:bg-amber-200 cursor-pointer flex items-center gap-1"
                          >
                            <PenTool className="w-3 h-3 text-amber-700" />
                            E-Sign Agreement
                          </button>
                        )}
                      </div>

                      {/* Quick action buttons for this container */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('size_change');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          Size Upgrade
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('reschedule');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Reschedule
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('permit_hoa');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Landmark className="w-3.5 h-3.5 text-amber-600" />
                          Permit / HOA
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('placement_site');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#00c0f3] hover:bg-sky-100 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#00c0f3]" />
                          Placement Notes
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('cancellation');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          Cancel Move
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('extend');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#00c0f3] hover:bg-sky-100 font-bold transition-colors cursor-pointer"
                        >
                          + Extend Rental
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('pickup');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
                        >
                          Order Pickup
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('damage');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold transition-colors cursor-pointer"
                        >
                          Report Damage
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderId(ord.id);
                            setActiveTab('insurance');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold transition-colors cursor-pointer"
                        >
                          Add Insurance
                        </button>
                      </div>

                      {/* Order Timeline History */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Logistics Milestones
                        </span>
                        {ord.history.slice(0, 3).map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-800">{h.stage}</span>
                              <span className="text-slate-400 text-[11px] ml-2">({h.timestamp})</span>
                              <p className="text-slate-600 text-[11px]">{h.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: TWILIO MEDIA STREAM & REAL-TIME AI INTELLIGENCE */}
              {activeTab === 'stream_ai' && (
                <TwilioLiveIntelligencePanel
                  customer={currentCustomer}
                  activeCall={activeCall}
                  onNavigateTab={(tab) => setActiveTab(tab as any)}
                  onApplyActionPayload={handleApplyActionPayload}
                  onExportToCallNotes={(notes) => {
                    setCallNotes(notes);
                    showToast('Exported real-time AI bullets into Call Notes.');
                  }}
                />
              )}

              {/* ========================================================================= */}
              {/* SCENARIO TAB 1: CONTAINER SIZE OR QUANTITY CHANGE */}
              {/* ========================================================================= */}
              {activeTab === 'size_change' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b2942] text-sm">
                          Container Size or Quantity Change & Fleet Reallocation
                        </h4>
                        <p className="text-xs text-slate-500">
                          Check real-time depot inventory, update active reservation asset ID, recalculate monthly rates, and generate contract addendum.
                        </p>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Target Container Order</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                      >
                        {currentCustomer.orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} · {o.containerName} (Current: {o.containerSize} · ID: {o.containerId})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Choose Target Size */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Select Requested Container Size</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { id: 'medium_19m3', label: 'Medium · 19 m³ (14-Foot)', rate: 229, diff: 30, desc: 'Apartment / 2-bedroom packing' },
                          { id: 'large_25m3', label: 'Large · 25 m³ (16-Foot Pro)', rate: 259, diff: 60, desc: 'Full home / 3-4 bedroom capacity (Most Popular)' },
                          { id: 'two_large_50m3', label: '2× Large · 50 m³ (Dual Units)', rate: 438, diff: 239, desc: 'Large estate & comprehensive home packing' },
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => {
                              setSizeUpgradeTarget(sz.id as any);
                              setDepotInventoryCheckResult(null);
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              sizeUpgradeTarget === sz.id
                                ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-200'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="font-extrabold text-xs text-slate-900 block">{sz.label}</span>
                            <span className="font-mono text-sm font-black text-indigo-700 block mt-1">
                              ${sz.rate}/mo
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{sz.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Real-time Depot Inventory Check */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Real-Time Depot Fleet Inventory Check
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Checks Dry Creek Depot (SA) for Grade A+ weatherproof level-lift units.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const res = checkDepotInventoryForUpgrade(sizeUpgradeTarget);
                            setDepotInventoryCheckResult({
                              checked: true,
                              available: res.available,
                              count: res.count,
                              unitIds: res.candidateUnitIds,
                            });
                            showToast(`Inventory verified: ${res.count} available units found.`);
                          }}
                          className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 font-bold text-xs text-slate-800 cursor-pointer shadow-2xs"
                        >
                          Check Depot Inventory
                        </button>
                      </div>

                      {depotInventoryCheckResult && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>Inventory Reserved:</strong> {depotInventoryCheckResult.count} Units Available in Depot (Allocating Unit <strong>{depotInventoryCheckResult.unitIds[0] || 'PB-BOX-25-104'}</strong>).
                            </span>
                          </div>
                          <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                            Grade A+ Mint
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reason input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Reason / Notes for Contract Addendum</label>
                      <input
                        type="text"
                        value={sizeUpgradeReason}
                        onChange={(e) => setSizeUpgradeReason(e.target.value)}
                        placeholder="e.g. Customer realized mid-packing that 12ft unit is too small"
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium"
                      />
                    </div>

                    {/* Commit Upgrade Action */}
                    <button
                      onClick={() => {
                        const targetLabel =
                          sizeUpgradeTarget === 'medium_19m3'
                            ? '19 m³ (14-Foot)'
                            : sizeUpgradeTarget === 'large_25m3'
                            ? '25 m³ (16-Foot Pro)'
                            : '2× 25 m³ (50 m³ Dual)';
                        const rate = sizeUpgradeTarget === 'medium_19m3' ? 229 : sizeUpgradeTarget === 'large_25m3' ? 259 : 438;
                        const result = modifyContainerSizeOrQuantity({
                          customerId: currentCustomer.id,
                          orderId: selectedOrderId,
                          newSizeId: sizeUpgradeTarget,
                          newSizeLabel: targetLabel,
                          newMonthlyRate: rate,
                          deliveryDifferenceAud: 0, // Waived as promotion
                          reason: sizeUpgradeReason,
                        });
                        setCurrentCustomer(result.customer);
                        if (onCustomerUpdated) onCustomerUpdated(result.customer);
                        showToast(`Size modified to ${targetLabel}. Contract Addendum #${result.addendumRef} issued!`);
                        setActiveTab('orders');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Commit Size Upgrade & Issue Contract Addendum</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCENARIO TAB 2: PRE-DELIVERY CANCELLATION & POLICY REFUND */}
              {/* ========================================================================= */}
              {activeTab === 'cancellation' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-700">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b2942] text-sm">
                          Pre-Delivery Cancellation & Deposit Refund
                        </h4>
                        <p className="text-xs text-slate-500">
                          Automated 48-hour policy check, dispatch cancellation, fleet inventory release, and gateway refund.
                        </p>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Select Order to Cancel</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                      >
                        {currentCustomer.orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} · {o.containerName} (Delivery: {o.scheduledDeliveryDate} · {o.status})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Policy Compliance Card */}
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Policy Check: &gt; 48 Hours Advance Notice Verified</span>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        Under Portabox Cancellation Policy Section 4.2: Customer cancelled prior to the 48-hour dispatch threshold.
                        The customer is eligible for a <strong>100% full refund</strong> of their booking deposit ($348) via payment gateway.
                        Reserved fleet unit will be automatically returned to the depot available pool.
                      </p>
                      <div className="pt-2 flex items-center justify-between text-xs text-emerald-800 font-bold border-t border-emerald-200">
                        <span>Deposit Refund Amount:</span>
                        <span className="font-mono text-sm font-black text-emerald-900">$348.00 (Zero Penalty Fee)</span>
                      </div>
                    </div>

                    {/* Cancellation Reason */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Cancellation Reason</label>
                      <input
                        type="text"
                        value={cancelOrderReason}
                        onChange={(e) => setCancelOrderReason(e.target.value)}
                        placeholder="e.g. Aborted home purchase / postponed move"
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium"
                      />
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        const result = cancelPreDeliveryOrderWithPolicy({
                          customerId: currentCustomer.id,
                          orderId: selectedOrderId,
                          reason: cancelOrderReason,
                        });
                        setCurrentCustomer(result.customer);
                        if (onCustomerUpdated) onCustomerUpdated(result.customer);
                        showToast(`Cancelled under ${result.policyOutcome}. $${result.refundAmount} refunded!`);
                        setActiveTab('orders');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Execute Cancellation & Process $348.00 Gateway Refund</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCENARIO TAB 3: DELIVERY RESCHEDULE & RECURRING BILLING SHIFT */}
              {/* ========================================================================= */}
              {activeTab === 'reschedule' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b2942] text-sm">
                          Delivery Reschedule (Customer-Initiated)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Reschedule dispatch window, check driver availability, and automatically shift recurring billing start triggers.
                        </p>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Target Order</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                      >
                        {currentCustomer.orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} · {o.containerName} (Currently: {o.scheduledDeliveryDate} · {o.deliveryWindow})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* New Delivery Date & Window */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">New Scheduled Drop-off Date</label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Delivery Window</label>
                        <select
                          value={rescheduleSlot}
                          onChange={(e) => setRescheduleSlot(e.target.value)}
                          className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold"
                        >
                          <option value="Morning Window (8:00 AM – 11:30 AM)">Morning Window (8:00 AM – 11:30 AM)</option>
                          <option value="Midday Window (11:30 AM – 2:30 PM)">Midday Window (11:30 AM – 2:30 PM)</option>
                          <option value="Afternoon Window (2:30 PM – 5:30 PM)">Afternoon Window (2:30 PM – 5:30 PM)</option>
                        </select>
                      </div>
                    </div>

                    {/* Driver & Billing Shift Notice */}
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-blue-900 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Driver Availability Confirmed (Adelaide Central Fleet)</span>
                      </div>
                      <p className="text-blue-800 leading-relaxed">
                        Recurring billing cycle trigger will automatically shift: Next monthly storage fee will be billed 30 days after the new drop-off date ({new Date(new Date(rescheduleDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')}).
                      </p>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Reschedule Reason</label>
                      <input
                        type="text"
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        placeholder="e.g. Closing dates postponed by two weeks"
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium"
                      />
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        const result = rescheduleOrderDelivery({
                          customerId: currentCustomer.id,
                          orderId: selectedOrderId,
                          newDeliveryDate: rescheduleDate,
                          newDeliveryWindow: rescheduleSlot,
                          reason: rescheduleReason,
                        });
                        setCurrentCustomer(result.customer);
                        if (onCustomerUpdated) onCustomerUpdated(result.customer);
                        showToast(result.message);
                        setActiveTab('orders');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Confirm Reschedule & Update Dispatch Task</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCENARIO TAB 4: MUNICIPAL PERMIT & HOA CLEARANCE VERIFICATION */}
              {/* ========================================================================= */}
              {activeTab === 'permit_hoa' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-800">
                        <Landmark className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b2942] text-sm">
                          Municipal Permit & HOA Clearance Verification
                        </h4>
                        <p className="text-xs text-slate-500">
                          Verify council street placement permits, attach HOA clearances, and control dispatch assignment holds.
                        </p>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Target Container Order</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                      >
                        {currentCustomer.orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} · {o.originAddress} (Status: {o.permitStatus || 'Standard'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Council & Permit Details */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Issuing Local Council / HOA Body</label>
                        <input
                          type="text"
                          value={permitCouncilName}
                          onChange={(e) => setPermitCouncilName(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Attached Permit Document Reference</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={permitDocName}
                            onChange={(e) => setPermitDocName(e.target.value)}
                            className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-white font-mono"
                          />
                          <span className="px-3 py-2 bg-slate-200 rounded-xl font-bold text-[11px] text-slate-700">
                            PDF Valid
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Placement Conditions & Notes</label>
                        <textarea
                          rows={2}
                          value={permitNotesText}
                          onChange={(e) => setPermitNotesText(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>
                    </div>

                    {/* Status Decision Toggle */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Permit Status Verification</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPermitStatusChoice('Permit Approved')}
                          className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                            permitStatusChoice === 'Permit Approved'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Release Dispatch Hold</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPermitStatusChoice('Permit Required (Hold)')}
                          className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                            permitStatusChoice === 'Permit Required (Hold)'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Lock Dispatch (Permit Required Hold)</span>
                        </button>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        const result = updatePermitAndHoaClearance({
                          customerId: currentCustomer.id,
                          orderId: selectedOrderId,
                          permitStatus: permitStatusChoice,
                          documentName: permitDocName,
                          notes: `${permitCouncilName} · ${permitNotesText}`,
                        });
                        setCurrentCustomer(result.customer);
                        if (onCustomerUpdated) onCustomerUpdated(result.customer);
                        showToast(result.message);
                        setActiveTab('orders');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Landmark className="w-4 h-4" />
                      <span>Update Municipal Permit Status & Sync Dispatch</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCENARIO TAB 5: SPECIFIC PLACEMENT INSTRUCTIONS */}
              {/* ========================================================================= */}
              {activeTab === 'placement_site' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-sky-50 text-[#00c0f3]">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b2942] text-sm">
                          Specific Placement Instructions & Driver Directives
                        </h4>
                        <p className="text-xs text-slate-500">
                          Append precise directional notes and site guidance directly to the active driver manifest/dispatch work order.
                        </p>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Target Container Order</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                      >
                        {currentCustomer.orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} · {o.originAddress} ({o.containerSize})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Instructions Text Area */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Field Driver Placement Directives
                      </label>
                      <textarea
                        rows={3}
                        value={specificPlacementInput}
                        onChange={(e) => setSpecificPlacementInput(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                        placeholder="e.g. Place container on the left side of driveway, door facing the garage, 5 feet from the sidewalk."
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Quick Logistics Presets
                      </span>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {[
                          'Place on left side of driveway, door facing garage, 5ft from sidewalk.',
                          'Place on right boundary. Doors facing the street for quick unloading.',
                          'Steep driveway grade: driver must place dual heavy-duty rubber level pads under front edge.',
                          'Low power lines overhead on east side. Driver to enter via west driveway entrance.',
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setSpecificPlacementInput(preset)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-[11px] font-semibold text-left transition-colors cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        const result = updateSpecificPlacementInstructions({
                          customerId: currentCustomer.id,
                          orderId: selectedOrderId,
                          instructions: specificPlacementInput,
                        });
                        setCurrentCustomer(result.customer);
                        if (onCustomerUpdated) onCustomerUpdated(result.customer);
                        showToast(result.message);
                        setActiveTab('orders');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4 text-[#00c0f3]" />
                      <span>Push Placement Directives to Active Driver Manifest</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCENARIO TAB 6: FAILED DELIVERY DISPUTE & AUDIT */}
              {/* ========================================================================= */}
              {activeTab === 'dispute_audit' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-700">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b2942] text-sm">
                          Failed Delivery Dispute & Telematics Evidence Audit
                        </h4>
                        <p className="text-xs text-slate-500">
                          Retrieve driver GPS coordinates, timestamped delivery photos, review signed clearance terms, and issue resolution.
                        </p>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Disputed Order</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                      >
                        {currentCustomer.orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} · {o.originAddress} ({o.deliveryDispute?.status === 'Open' ? '⚠️ Open Dispute ($99 Fee)' : 'Standard'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Audit Evidence Dossier */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Driver Photographic Evidence */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-slate-500" />
                            Driver Site Photo Evidence
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            Access Blocked
                          </span>
                        </div>
                        <div className="h-32 rounded-xl overflow-hidden bg-slate-200 relative border border-slate-200">
                          <img
                            src="https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80"
                            alt="Site Obstruction Proof"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1.5 left-2 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded">
                            GPS: -34.9512, 138.6044 · 10:45 AM
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Parked white utility vehicle across 3.5m entrance. Clearance under 2.4m. Driver waited 20 minutes with no response.
                        </p>
                      </div>

                      {/* Contractual Clause & Dispute Claim */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                        <span className="font-extrabold text-slate-800 block">
                          Signed Rental Agreement Terms
                        </span>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 italic">
                          "Portabox Section 3.1: Hirer certifies 3.5m wide and 4.2m high clear access is maintained. If driver arrives and is obstructed, a $99 dry-run re-delivery fee applies."
                        </div>
                        <div className="pt-1">
                          <span className="font-bold text-slate-800 block text-[11px]">Customer Claim:</span>
                          <span className="text-slate-600 text-[11px]">
                            "Customer states neighbor moved vehicle 15 minutes later and requests waiver of the $99 fee."
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Resolution Choice */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Audit Resolution Outcome</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeResolutionDecision('courtesy_credit');
                            setDisputeExplanationText('One-time courtesy credit of $99 issued as goodwill gesture after customer clarified driveway was cleared.');
                          }}
                          className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                            disputeResolutionDecision === 'courtesy_credit'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                          <span>Issue Courtesy Credit ($99 Waiver)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeResolutionDecision('uphold_fee');
                            setDisputeExplanationText('Dry-run fee upheld: Driver GPS coordinates and photographic evidence confirm 3.5m clearance was blocked for 20 minutes per signed terms.');
                          }}
                          className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                            disputeResolutionDecision === 'uphold_fee'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                          <span>Uphold $99 Dry-Run Fee</span>
                        </button>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Resolution Explanation to Customer</label>
                      <textarea
                        rows={2}
                        value={disputeExplanationText}
                        onChange={(e) => setDisputeExplanationText(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                      />
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        const result = resolveDeliveryDispute({
                          customerId: currentCustomer.id,
                          orderId: selectedOrderId,
                          outcome: disputeResolutionDecision,
                          explanation: disputeExplanationText,
                          creditAmount: 99,
                        });
                        setCurrentCustomer(result.customer);
                        if (onCustomerUpdated) onCustomerUpdated(result.customer);
                        showToast(result.message);
                        setActiveTab('orders');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Scale className="w-4 h-4" />
                      <span>Submit Dispute Audit Resolution & Reconcile Ledger</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SCENARIO TAB 7: DIGITAL RENTAL AGREEMENT & E-SIGNATURE */}
              {/* ========================================================================= */}
              {activeTab === 'e_signature' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-700">
                        <PenTool className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[#0b2942] text-sm">
                          Digital Rental Agreement & Electronic Signature Capture
                        </h4>
                        <p className="text-xs text-slate-500">
                          Legally binding electronic signature capture on the Portabox Master Rental Terms and Clearance Obligations.
                        </p>
                      </div>
                    </div>

                    {/* Order Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Target Container Order</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                      >
                        {currentCustomer.orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.orderNumber} · {o.containerName} (Signed: {o.eSignature ? '✓ Yes' : 'Pending'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Summary of Digital Terms */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <span className="font-extrabold text-[#0b2942] block">
                        Portabox Master Rental Agreement v4.2 Summary:
                      </span>
                      <ul className="space-y-1 text-slate-600 list-disc pl-4 text-[11px]">
                        <li>Level-Lift horizontal placement with zero tilt guaranteed.</li>
                        <li>Customer certifies minimum 3.5m driveway width and 4.5m overhead clearance.</li>
                        <li>Protective ground pads supplied to prevent asphalt or paver damage.</li>
                        <li>Full refund guarantee on cancellations made with greater than 48 hours notice.</li>
                      </ul>
                    </div>

                    {/* Signer Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Signatory Full Name</label>
                        <input
                          type="text"
                          value={eSignerName}
                          onChange={(e) => setESignerName(e.target.value)}
                          className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-bold"
                          placeholder="Full Name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Signature Capture Stamp</label>
                        <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 font-serif italic text-slate-700 text-center text-sm">
                          /s/ {eSignerName || 'Customer Signature'} · Verified
                        </div>
                      </div>
                    </div>

                    {/* Terms Agreement Checkbox */}
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={eSignAgreed}
                        onChange={(e) => setESignAgreed(e.target.checked)}
                        className="rounded text-[#00c0f3] focus:ring-[#00c0f3] w-4 h-4"
                      />
                      <span>I confirm that the customer has read, accepted, and electronically executed the terms.</span>
                    </label>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        const result = signDigitalRentalAgreement({
                          customerId: currentCustomer.id,
                          orderId: selectedOrderId,
                          signedBy: eSignerName,
                        });
                        setCurrentCustomer(result.customer);
                        if (onCustomerUpdated) onCustomerUpdated(result.customer);
                        showToast(`Agreement executed! Document Ref: ${result.docRef}`);
                        setActiveTab('orders');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <PenTool className="w-4 h-4" />
                      <span>Execute & Bind Digital Rental Agreement</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: REFUNDS & INVOICES */}
              {activeTab === 'refunds' && (
                <div className="space-y-6">
                  {/* Instant Refund Section */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                    <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2 mb-4">
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      Issue Instant Customer Refund
                    </h4>

                    <form onSubmit={handleProcessRefund} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Target Invoice / Transaction</label>
                        <select
                          value={refundTargetTxnId}
                          onChange={(e) => setRefundTargetTxnId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        >
                          {currentCustomer.transactions.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.invoiceNumber} - ${t.amount} ({t.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Refund Amount ($ AUD)</label>
                        <input
                          type="number"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(Number(e.target.value))}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Refund Reason / Audit Note</label>
                        <input
                          type="text"
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                          placeholder="e.g. Weather delivery waiver, goodwill"
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>

                      <div className="sm:col-span-3 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Execute Refund Now
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Billing Adjustment / Credit Note Section */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                    <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Apply Billing Adjustment / Credit Note
                    </h4>

                    <form onSubmit={handleApplyAdjustment} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Type</label>
                        <select
                          value={adjType}
                          onChange={(e) => setAdjType(e.target.value as any)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          <option value="credit">Credit Note (Discount balance)</option>
                          <option value="charge">Manual Charge / Additional Service</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Amount ($ AUD)</label>
                        <input
                          type="number"
                          value={adjAmount}
                          onChange={(e) => setAdjAmount(Number(e.target.value))}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Description</label>
                        <input
                          type="text"
                          value={adjDescription}
                          onChange={(e) => setAdjDescription(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-slate-600 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adjUpdateRate}
                            onChange={(e) => setAdjUpdateRate(e.target.checked)}
                            className="rounded text-[#00c0f3]"
                          />
                          Also update recurring monthly payment rate accordingly
                        </label>

                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          Apply Adjustment
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Transaction History Table */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                    <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      Invoices & Payment Transactions Ledger
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                            <th className="py-2">Invoice #</th>
                            <th className="py-2">Date</th>
                            <th className="py-2">Description</th>
                            <th className="py-2 text-right">Amount</th>
                            <th className="py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentCustomer.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="py-2.5 font-mono font-bold text-slate-700">{tx.invoiceNumber}</td>
                              <td className="py-2.5 text-slate-500">{tx.date}</td>
                              <td className="py-2.5 text-slate-800 font-medium">{tx.description}</td>
                              <td className={`py-2.5 text-right font-mono font-extrabold ${tx.amount < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                {tx.amount < 0 ? `-$${Math.abs(tx.amount)}` : `$${tx.amount}`}
                              </td>
                              <td className="py-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    tx.status === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : tx.status === 'Refunded'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PAYMENT PLAN & AUTOPAY */}
              {activeTab === 'payment_plan' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                  <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Recurring Payment Plan & Debit Terms
                  </h4>

                  <form onSubmit={handleSavePaymentPlan} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Billing Cadence / Term</label>
                        <select
                          value={planTypeSelection}
                          onChange={(e) => setPlanTypeSelection(e.target.value as any)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          <option value="weekly">Weekly Direct Debit ($68/wk)</option>
                          <option value="monthly">Monthly Direct Debit ($259/mo)</option>
                          <option value="3_months_upfront">3 Months Upfront Prepayment (5% Discount)</option>
                          <option value="6_months_upfront">6 Months Upfront Prepayment (10% Discount)</option>
                          <option value="12_months_upfront">12 Months Upfront Prepayment (15% Discount)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Recurring Amount ($ AUD)</label>
                        <input
                          type="number"
                          value={currentCustomer.paymentPlan?.periodicAmount || 259}
                          onChange={(e) => {
                            if (currentCustomer.paymentPlan) {
                              currentCustomer.paymentPlan.periodicAmount = Number(e.target.value);
                              setCurrentCustomer({ ...currentCustomer });
                            }
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 block">Autopay Direct Debit</span>
                        <span className="text-slate-500 text-[11px]">
                          Automatically debits on the next billing date ({currentCustomer.paymentPlan?.nextBillingDate || 'Monthly'})
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autopayEnabled}
                          onChange={(e) => setAutopayEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const res = updateCustomerPaymentPlan({
                            customerId: currentCustomer.id,
                            planType: planTypeSelection,
                            autopayEnabled: false,
                            paymentsCeased: true,
                            ceasedReason: 'Ceased in call center by customer request',
                          });
                          setCurrentCustomer(res.customer);
                          onCustomerUpdated?.(res.customer);
                          showToast('Ceased recurring payments for customer.');
                        }}
                        className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Cease Future Debits
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        Save Payment Plan
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: UPDATE CREDIT CARD DETAILS */}
              {activeTab === 'card_update' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Enter card directly on call */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#00c0f3]" />
                        Enter Card Details on Phone
                      </h4>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        Braintree Vault Level 1 PCI-DSS
                      </span>
                    </div>

                    <form onSubmit={handleSaveCreditCard} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Card Brand</label>
                        <select
                          value={cardBrand}
                          onChange={(e) => setCardBrand(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="Amex">American Express</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="•••• •••• •••• 4242"
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                          maxLength={19}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 font-bold mb-1">CVC / CVV</label>
                          <input
                            type="password"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            placeholder="•••"
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                            maxLength={4}
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          Verify & Save Card to Vault
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Send secure update SMS link */}
                  <div className="bg-sky-50/60 rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-2xl bg-[#00c0f3] text-white flex items-center justify-center mb-3">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <h4 className="font-extrabold text-[#0b2942] text-sm">
                        Prefer Not to Speak Card Number Aloud?
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        For caller privacy, you can instantly SMS a one-time secure payment link directly to{' '}
                        <strong className="text-slate-900">{currentCustomer.mobile}</strong>. The caller can enter their card details on their mobile browser with Apple Pay / Google Pay.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendCardUpdateSms}
                      className="mt-6 w-full py-2.5 bg-[#00c0f3] hover:bg-[#00ace0] text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs"
                    >
                      <Send className="w-4 h-4" />
                      Send Secure SMS Link to Customer
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: EXTEND RENTAL */}
              {activeTab === 'extend' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                  <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#00c0f3]" />
                    Extend Container Rental Duration
                  </h4>

                  <form onSubmit={handleExtendRental} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Select Container</label>
                        <select
                          value={selectedOrderId}
                          onChange={(e) => setSelectedOrderId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          {currentCustomer.orders.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.containerName} ({o.containerId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Additional Months</label>
                        <select
                          value={extensionMonths}
                          onChange={(e) => setExtensionMonths(Number(e.target.value))}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                        >
                          <option value={1}>+1 Month (Standard monthly rate)</option>
                          <option value={2}>+2 Months</option>
                          <option value={3}>+3 Months (5% Upfront discount)</option>
                          <option value={6}>+6 Months (10% Upfront discount)</option>
                          <option value={12}>+12 Months (15% Upfront discount)</option>
                        </select>
                      </div>
                    </div>

                    {/* Calculated Extension Breakdown */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 block">Total Extension Cost</span>
                        <span className="text-xl font-mono font-extrabold text-[#0b2942]">
                          $
                          {Math.round(
                            extensionMonths *
                              (currentCustomer.paymentPlan?.periodicAmount || 259) *
                              (extensionMonths >= 12
                                ? 0.85
                                : extensionMonths >= 6
                                ? 0.9
                                : extensionMonths >= 3
                                ? 0.95
                                : 1)
                          )}{' '}
                          AUD
                        </span>
                      </div>
                      <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full">
                        {extensionMonths >= 3 ? 'Term discount applied' : 'Standard rate'}
                      </span>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#00c0f3] hover:bg-[#00ace0] text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        Confirm Rental Extension & Charge
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 6: ORDER CONTAINER PICKUP */}
              {activeTab === 'pickup' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                  <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Book Container Collection / Depot Return
                  </h4>

                  <form onSubmit={handleSchedulePickup} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Container to Collect</label>
                        <select
                          value={selectedOrderId}
                          onChange={(e) => setSelectedOrderId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          {currentCustomer.orders.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.containerName} ({o.containerId}) - {o.location}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Preferred Pickup Date</label>
                        <input
                          type="date"
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Delivery Slot Window</label>
                        <select
                          value={pickupSlot}
                          onChange={(e) => setPickupSlot(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          <option value="Morning Window (8:00 AM – 11:30 AM)">Morning Window (8:00 AM – 11:30 AM)</option>
                          <option value="Midday Window (11:30 AM – 2:00 PM)">Midday Window (11:30 AM – 2:00 PM)</option>
                          <option value="Afternoon Window (2:00 PM – 4:30 PM)">Afternoon Window (2:00 PM – 4:30 PM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Driver Site Instructions</label>
                        <input
                          type="text"
                          value={pickupInstructions}
                          onChange={(e) => setPickupInstructions(e.target.value)}
                          placeholder="e.g. Ground pads in place, driveway clear"
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3 text-emerald-900">
                      <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <p className="text-xs">
                        Confirming pickup will automatically inject this job into the Smartsheet Yard Dispatch schedule and send an automated SMS confirmation to the customer.
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        Confirm & Schedule Pickup
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 7: REPORT DAMAGE */}
              {activeTab === 'damage' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                  <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Report Container Damage or Defect
                  </h4>

                  <form onSubmit={handleReportDamage} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Target Container</label>
                        <select
                          value={selectedOrderId}
                          onChange={(e) => setSelectedOrderId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          {currentCustomer.orders.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.containerName} ({o.containerId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Damage Category</label>
                        <select
                          value={damageCategory}
                          onChange={(e) => setDamageCategory(e.target.value as any)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          <option value="Door seal leak">Door seal leak (weather strip)</option>
                          <option value="Door hinge jammed">Door hinge jammed</option>
                          <option value="Floor moisture / stain">Floor moisture / stain</option>
                          <option value="Roof dent / puncture">Roof dent / puncture</option>
                          <option value="Lockbox shroud bent">Lockbox shroud bent</option>
                          <option value="Graffiti / Exterior mark">Graffiti / Exterior mark</option>
                          <option value="Pest / Insect ingress">Pest / Insect ingress</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Severity</label>
                        <select
                          value={damageSeverity}
                          onChange={(e) => setDamageSeverity(e.target.value as any)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                        >
                          <option value="Minor (Usable)">Minor (Usable)</option>
                          <option value="Moderate (Action required)">Moderate (Action required)</option>
                          <option value="Critical (Immediate swap required)">Critical (Immediate swap required)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Details & Customer Description</label>
                      <textarea
                        value={damageNotes}
                        onChange={(e) => setDamageNotes(e.target.value)}
                        placeholder="Describe issue noticed by customer on phone..."
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white h-20"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={damageReplaceContainer}
                          onChange={(e) => setDamageReplaceContainer(e.target.checked)}
                          className="rounded text-rose-600"
                        />
                        Customer requests immediate replacement container swap
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        Submit Damage Report
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 8: ADD INSURANCE */}
              {activeTab === 'insurance' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                  <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Portabox Container Care Protection Cover
                  </h4>

                  <form onSubmit={handleAddInsurance} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-2">Select Protection Plan</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            tier: 'Basic ($10,000 cover · $15/mo)',
                            name: 'Bronze Care',
                            cover: '$10,000',
                            price: '$15 / month',
                            desc: 'Covers water ingress, fire, transit collision.',
                          },
                          {
                            tier: 'Silver ($25,000 cover · $35/mo)',
                            name: 'Silver Shield (Recommended)',
                            cover: '$25,000',
                            price: '$35 / month',
                            desc: 'Full contents cover including loading, transit and yard storage.',
                          },
                          {
                            tier: 'Gold ($50,000 cover · $60/mo)',
                            name: 'Gold Premier',
                            cover: '$50,000',
                            price: '$60 / month',
                            desc: 'High-value furniture, electronics and full replacement policy.',
                          },
                          {
                            tier: 'Platinum ($100,000 cover · $95/mo)',
                            name: 'Platinum Ultra',
                            cover: '$100,000',
                            price: '$95 / month',
                            desc: 'Commercial assets, full replacement value guarantee.',
                          },
                        ].map((p) => (
                          <div
                            key={p.tier}
                            onClick={() => setInsuranceTier(p.tier as any)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              insuranceTier === p.tier
                                ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-slate-900">{p.name}</span>
                              <span className="font-mono font-bold text-purple-700">{p.price}</span>
                            </div>
                            <div className="text-slate-600 text-[11px] mb-1">Coverage Limit: {p.cover}</div>
                            <p className="text-slate-500 text-[10px]">{p.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        Activate Policy on Customer Account
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 9: INTEGRATED SMS THREAD */}
              {activeTab === 'sms' && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#00c0f3]" />
                        Two-Way SMS Conversation Thread
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Connected to Australian number {currentCustomer.mobile}
                      </p>
                    </div>

                    {/* Quick SMS Macros */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <button
                        onClick={() => handleSendMacroSms('eta')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#00c0f3] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Send Delivery ETA
                      </button>
                      <button
                        onClick={() => handleSendMacroSms('access')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#00c0f3] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Send Photo Upload Link
                      </button>
                      <button
                        onClick={() => handleSendMacroSms('receipt')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-[#00c0f3] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Send Receipt Link
                      </button>
                    </div>
                  </div>

                  {/* Messages Bubble View */}
                  <div className="h-64 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    {(!smsConversation || smsConversation.messages.length === 0) ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No previous SMS messages with this customer. Start conversation below.
                      </div>
                    ) : (
                      smsConversation.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex flex-col ${m.sender === 'customer' ? 'items-start' : 'items-end'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                              m.sender === 'customer'
                                ? 'bg-white border border-slate-200 text-slate-800'
                                : 'bg-[#00c0f3] text-white shadow-xs'
                            }`}
                          >
                            <p>{m.text}</p>
                            {m.actionUrl && (
                              <a
                                href={m.actionUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block mt-1 font-mono text-[10px] underline opacity-90"
                              >
                                {m.actionUrl}
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 px-1">
                            {m.sender === 'customer' ? currentCustomer.firstName : 'Portabox'} • {m.timestamp}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Send Input */}
                  <form onSubmit={handleSendCustomSms} className="flex gap-2">
                    <input
                      type="text"
                      value={smsText}
                      onChange={(e) => setSmsText(e.target.value)}
                      placeholder="Type SMS message to customer..."
                      className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                    <button
                      type="submit"
                      disabled={!smsText.trim()}
                      className="px-5 py-3 bg-[#00c0f3] hover:bg-[#00ace0] disabled:opacity-50 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2 text-xs"
                    >
                      <Send className="w-4 h-4" />
                      Send SMS
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
