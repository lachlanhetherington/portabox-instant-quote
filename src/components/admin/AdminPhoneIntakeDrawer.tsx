import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  X,
  User,
  MapPin,
  Calendar,
  Box,
  Truck,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Layers,
  Sparkles,
  ShieldCheck,
  Compass,
  CreditCard,
  Printer,
  FileText,
  Lock,
  Mail,
  Smartphone,
  Globe,
  ExternalLink,
  Share2,
  Eye,
} from 'lucide-react';
import {
  AUSTRALIAN_POSTCODES,
  PostcodeRecord,
  searchPostcodes,
} from '../../data/australianPostcodes';
import {
  AppConfig,
  ContainerSizeId,
  ServiceType,
  MetroHub,
} from '../../types/quote';
import { calculateQuote, getLocationPricingForHub } from '../../services/pricingEngine';
import {
  createPhoneBookingSmartsheetRow,
  SmartsheetRow,
} from '../../services/smartsheetService';
import { TraditionalQuoteDocument } from '../TraditionalQuoteDocument';
import {
  dispatchQuoteToCustomer,
  QuoteDispatchResult,
} from '../../services/quoteDispatchService';

interface AdminPhoneIntakeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onBookingCreated?: (row: SmartsheetRow) => void;
  initialNoPhoneOrEmail?: boolean;
}

export const AdminPhoneIntakeDrawer: React.FC<AdminPhoneIntakeDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onBookingCreated,
  initialNoPhoneOrEmail = false,
}) => {
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [referralSource, setReferralSource] = useState('Google Search');

  // Address & Postcode
  const [addressLine, setAddressLine] = useState('');
  const [postcodeQuery, setPostcodeQuery] = useState('5061 Hyde Park');
  const [selectedPostcode, setSelectedPostcode] = useState<PostcodeRecord>(AUSTRALIAN_POSTCODES[0]);
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<PostcodeRecord[]>([]);

  // Container & Service
  const [serviceType, setServiceType] = useState<ServiceType>('storage_at_place');
  const [containerSize, setContainerSize] = useState<ContainerSizeId>('large_25m3');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [deliveryWindow, setDeliveryWindow] = useState('09:00 AM – 11:30 AM (Morning Window)');

  // Physical Logistics & Site Access (Smartsheet fields)
  const [placementSurface, setPlacementSurface] = useState<
    'Concrete Driveway' | 'Paved Asphalt' | 'Grass / Lawn' | 'Gravel / Dirt' | 'Roadside / Nature Strip'
  >('Concrete Driveway');
  const [doorOrientation, setDoorOrientation] = useState<
    'Doors Facing Street / Road' | 'Doors Facing House / Property' | 'Driver Discretion'
  >('Doors Facing Street / Road');
  const [accessGateWidth, setAccessGateWidth] = useState<
    'Wide Open (>3.5m)' | 'Standard (3.0m - 3.5m)' | 'Narrow (<3.0m - Caution)'
  >('Wide Open (>3.5m)');
  const [overheadClearanceClear, setOverheadClearanceClear] = useState(true);
  const [siteNotes, setSiteNotes] = useState('');

  // Commercial adjustments
  const [adminDiscount, setAdminDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('Phone Call Courteous Rate Match');
  const [paymentPreference, setPaymentPreference] = useState('Credit Card (Phone Authorization)');

  // Call Center Operative: Customer does not have mobile phone or email
  const [hasNoPhoneOrEmail, setHasNoPhoneOrEmail] = useState(initialNoPhoneOrEmail || false);
  const [landlinePhone, setLandlinePhone] = useState('');

  // Credit Card Details for Phone MOTO Booking
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardAuthCode, setCardAuthCode] = useState('');
  const [isCardAuthorized, setIsCardAuthorized] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // Quote Document Modal
  const [showQuoteDocumentModal, setShowQuoteDocumentModal] = useState(false);

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    orderNumber: string;
    customerName: string;
    authCode?: string;
    cardLast4?: string;
  } | null>(null);
  const [copiedQuote, setCopiedQuote] = useState(false);

  // 15% Call-In: Quote Dispatch to Email, SMS, or In-Portal
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [sendViaSms, setSendViaSms] = useState(true);
  const [publishToPortal, setPublishToPortal] = useState(true);
  const [agentName, setAgentName] = useState('Admin Call Center Agent');
  const [agentNotes, setAgentNotes] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<QuoteDispatchResult | null>(null);
  const [previewChannel, setPreviewChannel] = useState<'email' | 'sms' | null>(null);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const [copiedSmsText, setCopiedSmsText] = useState(false);

  // Live Quote calculation
  const quote = useMemo(() => {
    return calculateQuote({
      originPostcode: selectedPostcode,
      serviceType,
      containerSize,
      containerCount: 1,
      billingCycle: 'monthly',
      storageDuration: '1_to_3_months',
      storageDurationMonths: 1,
      preferredDate: scheduledDate,
      config,
    });
  }, [selectedPostcode, serviceType, containerSize, scheduledDate, config]);

  const finalFirstPayment = Math.max(0, (quote?.firstPaymentTotal || 368) - adminDiscount);

  // Postcode search handler
  const handleSearchPostcode = (q: string) => {
    setPostcodeQuery(q);
    if (q.trim().length >= 2) {
      setPostcodeSuggestions(searchPostcodes(q).slice(0, 6));
    } else {
      setPostcodeSuggestions([]);
    }
  };

  const handleSelectPostcode = (p: PostcodeRecord) => {
    setSelectedPostcode(p);
    setPostcodeQuery(`${p.postcode} ${p.suburb} (${p.state})`);
    setPostcodeSuggestions([]);
  };

  const detectCardBrand = (num: string): string => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'American Express';
    return 'Visa';
  };

  const handleAuthorizeCard = () => {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.length < 12) {
      alert('Please enter a valid credit card number for phone authorization.');
      return;
    }
    setIsProcessingCard(true);
    setTimeout(() => {
      const code = `AUTH-MOTO-${Math.floor(100000 + Math.random() * 900000)}`;
      setCardAuthCode(code);
      setIsCardAuthorized(true);
      setIsProcessingCard(false);
      setPaymentPreference('Credit Card (Phone Authorization)');
    }, 600);
  };

  // Submit and create booking
  const handleConfirmBooking = () => {
    if (!customerName.trim()) {
      alert('Please enter the customer full name.');
      return;
    }
    if (!hasNoPhoneOrEmail && !customerPhone.trim()) {
      alert('Please enter customer phone number.');
      return;
    }

    const isCardBooking = hasNoPhoneOrEmail || paymentPreference.includes('Credit Card');
    const cleanCard = cardNumber.replace(/\D/g, '');
    const cardLast4 = cleanCard.slice(-4) || '4242';
    const cardBrand = detectCardBrand(cleanCard);
    const effectiveAuthCode = cardAuthCode || `AUTH-MOTO-${Math.floor(100000 + Math.random() * 900000)}`;

    setIsSubmitting(true);
    try {
      const fullAddress = addressLine.trim()
        ? `${addressLine.trim()}, ${selectedPostcode.suburb} ${selectedPostcode.state} ${selectedPostcode.postcode}`
        : `${selectedPostcode.suburb} ${selectedPostcode.state} ${selectedPostcode.postcode}`;

      const { row } = createPhoneBookingSmartsheetRow({
        customerName: customerName.trim(),
        customerPhone: hasNoPhoneOrEmail
          ? (landlinePhone.trim() || 'None (No Mobile - Phone Order)')
          : customerPhone.trim(),
        customerEmail: hasNoPhoneOrEmail
          ? `no-email-phone-order-${Date.now().toString().slice(-4)}@portabox.com.au`
          : customerEmail.trim(),
        deliveryAddress: fullAddress,
        suburb: selectedPostcode.suburb,
        postcode: selectedPostcode.postcode,
        state: selectedPostcode.state,
        deliveryZone: `Zone ${quote?.deliveryZone || 'A'}`,
        containerSize:
          containerSize === 'small_10m3'
            ? '10 m³'
            : containerSize === 'medium_19m3'
            ? '19 m³'
            : containerSize === 'large_25m3'
            ? '25 m³'
            : '50 m³ (2x 25m³)',
        serviceType: serviceType === 'storage_at_place' ? 'Storage at Your Place' : 'Depot Facility Storage',
        scheduledDeliveryDate: scheduledDate,
        deliveryWindow,
        placementSurface,
        doorOrientation,
        accessGateWidth,
        overheadClearanceClear,
        secondaryContactName: secondaryName.trim(),
        secondaryContactPhone: secondaryPhone.trim(),
        referralSource,
        accessNotes: siteNotes.trim(),
        monthlyRateAud: quote?.monthlyContainerRate || 219,
        legFeeAud: quote?.domesticLegFeePerContainer || 149,
        discountAud: adminDiscount,
        discountReason: adminDiscount > 0 ? discountReason : undefined,
        paymentMethod: isCardBooking
          ? `Credit Card (${cardBrand} •••• ${cardLast4}) - MOTO Auth: ${effectiveAuthCode}`
          : paymentPreference,
        isCreditCardPaid: isCardBooking,
        creditCardLast4: cardLast4,
        creditCardBrand: cardBrand,
        creditCardExpiry: cardExpiry || '12/28',
        creditCardAuthCode: effectiveAuthCode,
        hasNoPhoneOrEmail,
      });

      setSuccessResult({
        orderNumber: row.orderNumber,
        customerName: row.customerName,
        authCode: isCardBooking ? effectiveAuthCode : undefined,
        cardLast4: isCardBooking ? cardLast4 : undefined,
      });

      if (onBookingCreated) {
        onBookingCreated(row);
      }
    } catch (err) {
      console.error('Error creating phone booking:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyVerbalSummary = () => {
    const summary = `PORTABOX PHONE QUOTE:
Customer: ${customerName || 'Inquirer'} (${hasNoPhoneOrEmail ? 'No Mobile/Email - Phone CC Order' : customerPhone || 'N/A'})
Location: ${selectedPostcode.suburb} ${selectedPostcode.postcode} (Zone ${quote?.deliveryZone || 'A'})
Container: ${containerSize === 'small_10m3' ? '10m³' : containerSize === 'medium_19m3' ? '19m³' : '25m³'}
Surface: ${placementSurface} · Doors: ${doorOrientation}
Monthly Rate: $${quote?.monthlyContainerRate}/mo
Delivery Leg: $${quote?.domesticLegFeePerContainer}
${adminDiscount > 0 ? `Phone Courtesy Discount: -$${adminDiscount}\n` : ''}Total First Month + Delivery: $${finalFirstPayment}
Payment: ${hasNoPhoneOrEmail || paymentPreference.includes('Credit Card') ? 'Credit Card (Over-The-Phone Auth)' : paymentPreference}`;

    navigator.clipboard.writeText(summary);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  const handleDispatchQuote = () => {
    if (!customerName.trim()) {
      alert('Please enter the customer name before dispatching the quote.');
      return;
    }
    if (!sendViaEmail && !sendViaSms && !publishToPortal) {
      alert('Please select at least one channel (Email, SMS, or In-Portal) to send the quote.');
      return;
    }
    if (sendViaEmail && !customerEmail.trim() && !hasNoPhoneOrEmail) {
      alert('Please enter customer email address to send via Email.');
      return;
    }
    if (sendViaSms && !customerPhone.trim() && !hasNoPhoneOrEmail) {
      alert('Please enter customer mobile phone to send via SMS.');
      return;
    }
    if (!quote) return;

    setIsDispatching(true);
    try {
      const result = dispatchQuoteToCustomer({
        quote,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerMobile: (hasNoPhoneOrEmail ? landlinePhone : customerPhone).trim() || undefined,
        channels: {
          email: sendViaEmail && Boolean(customerEmail.trim()),
          sms: sendViaSms && Boolean((hasNoPhoneOrEmail ? landlinePhone : customerPhone).trim()),
          portal: publishToPortal,
        },
        agentNotes: agentNotes.trim() || siteNotes.trim(),
        agentName: agentName.trim() || 'Admin Call Center Agent',
      });

      setDispatchResult(result);
    } catch (err) {
      console.error('Error dispatching quote:', err);
      alert('An error occurred while dispatching the quote.');
    } finally {
      setIsDispatching(false);
    }
  };

  const handleReset = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setLandlinePhone('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardholderName('');
    setCardAuthCode('');
    setIsCardAuthorized(false);
    setAddressLine('');
    setSecondaryName('');
    setSecondaryPhone('');
    setSiteNotes('');
    setAdminDiscount(0);
    setSuccessResult(null);
    setDispatchResult(null);
    setPreviewChannel(null);
    setCopiedPortalLink(false);
    setCopiedSmsText(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-[#0b2942] text-white p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#00c0f3] text-white shadow-xs">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FEBD69] bg-[#FEBD69]/20 px-2 py-0.5 rounded">
                  15% INBOUND CALL INTAKE
                </span>
                <span className="text-[10px] font-extrabold text-sky-200">
                  Agent Phone Console
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Fill Form &amp; Send Quote (Email / SMS / Portal)
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-700">
          {/* Dispatch Result Success Screen */}
          {dispatchResult && !successResult && (
            <div className="p-6 rounded-3xl bg-linear-to-b from-sky-50 to-emerald-50 border-2 border-sky-300 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  15% Call-In Quote Dispatched
                </span>
                <h4 className="text-lg font-black text-[#0b2942] mt-1.5">
                  Quote #{dispatchResult.quoteNumber} Sent to Caller!
                </h4>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Prepared for <strong className="text-slate-900">{customerName}</strong> ({quote?.containerName} for {selectedPostcode.suburb})
                </p>
              </div>

              {/* Channels Dispatched Breakdown */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Channels Dispatched:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    dispatchResult.emailSent
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <Mail className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase block">Email</span>
                      <span className="text-[11px] font-medium truncate block">
                        {dispatchResult.emailSent ? (customerEmail || 'Sent to caller') : 'Skipped'}
                      </span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    dispatchResult.smsSent
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase block">SMS Text</span>
                      <span className="text-[11px] font-medium truncate block">
                        {dispatchResult.smsSent ? (customerPhone || landlinePhone || 'Sent to caller') : 'Skipped'}
                      </span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    dispatchResult.portalPublished
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    <Globe className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase block">Customer Portal</span>
                      <span className="text-[11px] font-medium truncate block">
                        {dispatchResult.portalPublished ? 'Published & Active' : 'Skipped'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct 1-Click Customer Portal Link */}
                {dispatchResult.portalPublished && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 block">
                        Customer Portal 1-Click Access Link:
                      </span>
                      <span className="text-[11px] font-mono text-[#00c0f3] font-bold truncate block">
                        {dispatchResult.portalLink}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(dispatchResult.portalLink);
                          setCopiedPortalLink(true);
                          setTimeout(() => setCopiedPortalLink(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {copiedPortalLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPortalLink ? 'Copied' : 'Copy Link'}</span>
                      </button>
                      <a
                        href={dispatchResult.portalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#00c0f3] hover:bg-[#00a6d2] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Portal</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Previews Toggle */}
              <div className="flex items-center gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setPreviewChannel(previewChannel === 'sms' ? null : 'sms')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>{previewChannel === 'sms' ? 'Hide SMS Preview' : 'View SMS Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewChannel(previewChannel === 'email' ? null : 'email')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>{previewChannel === 'email' ? 'Hide Email Preview' : 'View Email Preview'}</span>
                </button>
              </div>

              {/* Collapsible Preview Box */}
              {previewChannel === 'sms' && (
                <div className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-sans">
                    <span>SMS Preview (Caller Mobile: {customerPhone || '0400 000 000'})</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(dispatchResult.smsText);
                        setCopiedSmsText(true);
                        setTimeout(() => setCopiedSmsText(false), 2000);
                      }}
                      className="text-white hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copiedSmsText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSmsText ? 'Copied' : 'Copy SMS'}</span>
                    </button>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{dispatchResult.smsText}</p>
                </div>
              )}

              {previewChannel === 'email' && (
                <div className="p-4 rounded-2xl bg-white border border-slate-300 text-slate-800 text-xs space-y-2 animate-in fade-in">
                  <div className="text-[11px] font-bold text-slate-600 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                    <span>Subject: {dispatchResult.emailSubject}</span>
                    <span className="text-[10px] text-slate-400">To: {customerEmail || 'caller@example.com'}</span>
                  </div>
                  <pre className="font-sans text-[11px] leading-relaxed whitespace-pre-wrap text-slate-700 max-h-48 overflow-y-auto">
                    {dispatchResult.emailPreview}
                  </pre>
                </div>
              )}

              {/* Follow-up Next Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Caller Wants to Book Now (Credit Card / Smartsheet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuoteDocumentModal(true)}
                  className="px-4 py-2 bg-[#00c0f3] hover:bg-[#00a6d2] text-white font-extrabold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Produce &amp; Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Take Another Phone Intake Call
                </button>
              </div>
            </div>
          )}

          {successResult ? (
            <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-[#0b2942]">
                  Booking Confirmed &amp; Pushed to Smartsheet!
                </h4>
                <p className="text-xs text-emerald-800 mt-1 font-semibold">
                  Order <span className="font-mono font-black">{successResult.orderNumber}</span> created for{' '}
                  <strong>{successResult.customerName}</strong>.
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  The row is now staged in the Yard Dispatch table and synchronized with the Customer Portal.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuoteDocumentModal(true)}
                  className="px-4 py-2 bg-[#00c0f3] hover:bg-[#00a6d2] text-white font-extrabold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Produce &amp; Print Official Quote</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Take Another Phone Call
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close &amp; View in Smartsheet
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Call Center Operative Special Option Banner */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                hasNoPhoneOrEmail
                  ? 'bg-amber-50/95 border-amber-400 ring-2 ring-amber-300/40 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasNoPhoneOrEmail}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setHasNoPhoneOrEmail(val);
                      if (val) {
                        setPaymentPreference('Credit Card (Phone Authorization)');
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-[#0b2942]">
                        Option for Call Center Operative
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md">
                        Phone Booking · Credit Card Only
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      Customer does not have mobile phone or email — make booking over phone just with credit card. Quote can be produced and printed immediately.
                    </p>
                  </div>
                </label>
              </div>

              {/* Over-The-Phone Credit Card Details (MOTO Payment Section) */}
              {hasNoPhoneOrEmail && (
                <div className="p-4 rounded-2xl bg-sky-50/90 border-2 border-[#00c0f3]/50 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#00c0f3]" />
                      <span className="font-black text-xs text-[#0b2942] uppercase tracking-wider">
                        Call Center Credit Card Intake (Over The Phone)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-600" />
                      MOTO Phone Authorization
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                        Cardholder Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder={customerName || 'Name on Credit Card'}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                        Credit Card Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                            const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                            setCardNumber(formatted);
                          }}
                          placeholder="4532 •••• •••• 4242"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                        />
                        {cardNumber && (
                          <span className="absolute right-2.5 top-1.5 text-[9px] font-black uppercase text-[#00c0f3] bg-sky-100 px-1.5 py-0.5 rounded">
                            {detectCardBrand(cardNumber)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                        Expiration (MM/YY) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/[^\d\/]/g, '').slice(0, 5);
                          if (v.length === 2 && !v.includes('/')) v = v + '/';
                          setCardExpiry(v);
                        }}
                        placeholder="12/28"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-semibold focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                        CVV / Security Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        placeholder="•••"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-semibold focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {isCardAuthorized ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-extrabold bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Card Authorized ({cardAuthCode})</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAuthorizeCard}
                        disabled={isProcessingCard}
                        className="px-3.5 py-1.5 bg-[#0b2942] hover:bg-[#133d60] text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#00c0f3]" />
                        <span>{isProcessingCard ? 'Authorizing Card...' : `Authorize Card ($${finalFirstPayment} AUD)`}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowQuoteDocumentModal(true)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0b2942] border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#00c0f3]" />
                      <span>Produce Quote Document</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 1: Customer Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b2942]">
                  <User className="w-4 h-4 text-[#00c0f3]" />
                  <span>1. Customer &amp; Caller Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Customer Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Michael Henderson"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      {hasNoPhoneOrEmail ? (
                        <>Landline (Optional) <span className="text-slate-400 font-normal">(No Mobile)</span></>
                      ) : (
                        <>Mobile Number <span className="text-rose-500">*</span></>
                      )}
                    </label>
                    <input
                      type="tel"
                      value={hasNoPhoneOrEmail ? landlinePhone : customerPhone}
                      onChange={(e) => {
                        if (hasNoPhoneOrEmail) {
                          setLandlinePhone(e.target.value);
                        } else {
                          setCustomerPhone(e.target.value);
                        }
                      }}
                      placeholder={hasNoPhoneOrEmail ? "(08) 8234 5678 (optional landline)" : "e.g. 0412 345 678"}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Email Address {hasNoPhoneOrEmail ? <span className="text-slate-400 font-normal">(Customer has no email)</span> : <span className="text-slate-400 font-normal">(Optional for quotes)</span>}
                    </label>
                    <input
                      type="email"
                      value={hasNoPhoneOrEmail ? '' : customerEmail}
                      disabled={hasNoPhoneOrEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={hasNoPhoneOrEmail ? "Postal / Verbal Contact Only" : "customer@gmail.com"}
                      className={`w-full px-3 py-2 rounded-xl border border-slate-200 font-medium ${
                        hasNoPhoneOrEmail ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-[#00c0f3] focus:outline-none'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      How Did They Hear About Us?
                    </label>
                    <select
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    >
                      <option value="Google Search">Google Search</option>
                      <option value="Word of Mouth">Word of Mouth / Friend</option>
                      <option value="Saw Portabox on Road / Truck">Saw Portabox Truck / Box</option>
                      <option value="Real Estate Agent">Real Estate Agent</option>
                      <option value="Repeat Customer">Repeat Customer</option>
                      <option value="Facebook / Social">Facebook / Instagram</option>
                    </select>
                  </div>
                </div>

                {/* Secondary Site Contact */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Secondary / On-Site Contact (Partner / Builder)
                    </label>
                    <input
                      type="text"
                      value={secondaryName}
                      onChange={(e) => setSecondaryName(e.target.value)}
                      placeholder="e.g. Dave (Site Foreman)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Secondary Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      placeholder="0488 000 111"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Delivery Location & Suburb */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b2942]">
                  <MapPin className="w-4 h-4 text-[#00c0f3]" />
                  <span>2. Delivery Address &amp; Zone Pricing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Suburb / Postcode <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={postcodeQuery}
                      onChange={(e) => handleSearchPostcode(e.target.value)}
                      placeholder="Type suburb or postcode (e.g. 5061)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-[#0b2942] focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                    {postcodeSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {postcodeSuggestions.map((p) => (
                          <button
                            key={`${p.postcode}-${p.suburb}`}
                            type="button"
                            onClick={() => handleSelectPostcode(p)}
                            className="w-full text-left px-3 py-2 hover:bg-sky-50 text-xs font-semibold flex items-center justify-between cursor-pointer"
                          >
                            <span>
                              {p.postcode} {p.suburb}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.state} · Metro
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Street Address (Unit / Number &amp; Street)
                    </label>
                    <input
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="e.g. 14 North Terrace"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#0b2942]">Calculated Delivery Zone: </span>
                    <span className="font-black text-[#00c0f3]">Zone {quote?.deliveryZone || 'A'}</span>
                    <span className="text-slate-500"> ({quote?.deliveryZoneRangeLabel || '<25km from depot'})</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    Leg Fee: ${quote?.domesticLegFeePerContainer || 149}
                  </span>
                </div>
              </div>

              {/* SECTION 3: Container Selection & Delivery Schedule */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b2942]">
                  <Box className="w-4 h-4 text-[#00c0f3]" />
                  <span>3. Container Size &amp; Delivery Window</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'small_10m3', label: '10 m³ (Studio / 1-Rm)', rate: 159 },
                    { id: 'medium_19m3', label: '19 m³ (2-3 Bed House)', rate: 199 },
                    { id: 'large_25m3', label: '25 m³ (Full 3-4 Bed)', rate: 219 },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setContainerSize(size.id as ContainerSizeId)}
                      className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        containerSize === size.id
                          ? 'border-[#00c0f3] bg-sky-50/80 shadow-xs ring-2 ring-[#00c0f3]'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-slate-900">{size.label}</div>
                      <div className="font-mono text-[11px] text-[#00c0f3] font-black mt-0.5">
                        ${size.rate}/month
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Preferred Delivery Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Delivery Time Window
                    </label>
                    <select
                      value={deliveryWindow}
                      onChange={(e) => setDeliveryWindow(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    >
                      <option value="09:00 AM – 11:30 AM (Morning Window)">09:00 AM – 11:30 AM (Morning)</option>
                      <option value="11:30 AM – 02:00 PM (Midday Window)">11:30 AM – 02:00 PM (Midday)</option>
                      <option value="02:00 PM – 04:30 PM (Afternoon Window)">02:00 PM – 04:30 PM (Afternoon)</option>
                      <option value="04:30 PM – 07:00 PM (Late Afternoon)">04:30 PM – 07:00 PM (Late)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Smartsheet Physical Logistics & Site Access */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b2942]">
                  <Truck className="w-4 h-4 text-[#00c0f3]" />
                  <span>4. Site Placement Logistics (Smartsheet Direct)</span>
                </div>

                {/* Ground surface type */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Placement Ground Surface
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      'Concrete Driveway',
                      'Paved Asphalt',
                      'Grass / Lawn',
                      'Gravel / Dirt',
                      'Roadside / Nature Strip',
                    ].map((surf) => (
                      <button
                        key={surf}
                        type="button"
                        onClick={() => setPlacementSurface(surf as any)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer text-center ${
                          placementSurface === surf
                            ? 'bg-[#0b2942] text-white border-[#0b2942]'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {surf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Container Doors Facing Direction */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Container Door Orientation
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      'Doors Facing Street / Road',
                      'Doors Facing House / Property',
                      'Driver Discretion',
                    ].map((door) => (
                      <button
                        key={door}
                        type="button"
                        onClick={() => setDoorOrientation(door as any)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer text-center ${
                          doorOrientation === door
                            ? 'bg-[#00c0f3] text-white border-[#00c0f3]'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {door}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gate & Overhead Clearance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Driveway / Gate Clearance
                    </label>
                    <select
                      value={accessGateWidth}
                      onChange={(e) => setAccessGateWidth(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    >
                      <option value="Wide Open (>3.5m)">Wide Open (&gt;3.5m clearance)</option>
                      <option value="Standard (3.0m - 3.5m)">Standard (3.0m – 3.5m)</option>
                      <option value="Narrow (<3.0m - Caution)">Narrow (&lt;3.0m - Needs driver check)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Overhead Clearances (&gt;4.2m)
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white cursor-pointer mt-0.5">
                      <input
                        type="checkbox"
                        checked={overheadClearanceClear}
                        onChange={(e) => setOverheadClearanceClear(e.target.checked)}
                        className="rounded text-[#00c0f3]"
                      />
                      <span className="text-[11px] font-bold text-slate-800">
                        No low powerlines or tree branches
                      </span>
                    </label>
                  </div>
                </div>

                {/* Specific Placement Notes */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Specific Site Placement Notes (for Driver in Yard)
                  </label>
                  <textarea
                    rows={2}
                    value={siteNotes}
                    onChange={(e) => setSiteNotes(e.target.value)}
                    placeholder="e.g. Place on left side of driveway behind brick mailbox. Dog will be secured inside."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 5: Commercial Adjustments & Payment Method */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b2942]">
                  <DollarSign className="w-4 h-4 text-[#00c0f3]" />
                  <span>5. Commercial Rates &amp; Staff Discounts</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Admin Courtesy Discount (AUD $)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={adminDiscount}
                        onChange={(e) => setAdminDiscount(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Payment Terms Preference
                    </label>
                    <select
                      value={paymentPreference}
                      onChange={(e) => setPaymentPreference(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                    >
                      <option value="EFT (Instant NPP / PayID)">EFT (Instant NPP / PayID)</option>
                      <option value="Credit Card (Braintree Vault)">Credit Card (Phone Authorization)</option>
                      <option value="Awaiting Direct Deposit">Awaiting Direct Bank Transfer</option>
                      <option value="Commercial 30-Day Account">Commercial 30-Day Account</option>
                    </select>
                  </div>
                </div>

                {/* Final Quote Summary Banner */}
                <div className="p-4 rounded-2xl bg-linear-to-r from-[#0b2942] to-[#123d60] text-white space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sky-200 font-semibold">
                      Monthly Storage Rent ({quote?.containerName})
                    </span>
                    <span className="font-mono font-bold text-sm text-white">
                      ${quote?.monthlyContainerRate}/mo
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-sky-200 font-semibold">
                      Delivery Leg (Zone {quote?.deliveryZone})
                    </span>
                    <span className="font-mono font-bold text-sm text-white">
                      ${quote?.domesticLegFeePerContainer}
                    </span>
                  </div>

                  {adminDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-300">
                      <span className="text-xs font-semibold">Staff Phone Discount Applied</span>
                      <span className="font-mono font-bold text-sm">-${adminDiscount}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/20 flex items-center justify-between font-black">
                    <span className="text-xs uppercase tracking-wider text-[#FEBD69]">
                      First Payment Due
                    </span>
                    <span className="text-xl font-mono text-[#00c0f3]">${finalFirstPayment}</span>
                  </div>
                </div>

                {/* SECTION 6: 15% Call-In: Email, SMS, or In-Portal Quote Dispatch */}
                <div className="space-y-3 pt-3 border-t-2 border-dashed border-sky-200 bg-sky-50/70 p-4 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b2942]">
                      <Send className="w-4 h-4 text-[#00c0f3]" />
                      <span>6. Dispatch Quote to Caller (15% Call-In)</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md">
                      Email · SMS · In-Portal
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium">
                    Immediately send this tailored quote to the caller over the phone across any combination of channels:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Email Option */}
                    <label className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
                      sendViaEmail ? 'bg-white border-[#00c0f3] shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sendViaEmail}
                          onChange={(e) => setSendViaEmail(e.target.checked)}
                          className="rounded text-[#00c0f3] focus:ring-[#00c0f3]"
                        />
                        <Mail className={`w-4 h-4 ${sendViaEmail ? 'text-[#00c0f3]' : 'text-slate-400'}`} />
                        <span className="font-extrabold text-xs text-[#0b2942]">Email</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 truncate">
                        {customerEmail.trim() ? customerEmail : (hasNoPhoneOrEmail ? 'No email provided' : 'Enter email above')}
                      </span>
                    </label>

                    {/* SMS Option */}
                    <label className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
                      sendViaSms ? 'bg-white border-[#00c0f3] shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sendViaSms}
                          onChange={(e) => setSendViaSms(e.target.checked)}
                          className="rounded text-[#00c0f3] focus:ring-[#00c0f3]"
                        />
                        <Smartphone className={`w-4 h-4 ${sendViaSms ? 'text-[#00c0f3]' : 'text-slate-400'}`} />
                        <span className="font-extrabold text-xs text-[#0b2942]">SMS Text</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1.5 truncate">
                        {(customerPhone || landlinePhone).trim() ? (customerPhone || landlinePhone) : 'Enter phone above'}
                      </span>
                    </label>

                    {/* In-Portal Option */}
                    <label className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
                      publishToPortal ? 'bg-white border-emerald-500 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={publishToPortal}
                          onChange={(e) => setPublishToPortal(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <Globe className={`w-4 h-4 ${publishToPortal ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="font-extrabold text-xs text-[#0b2942]">In-Portal</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold mt-1.5">
                        Instant Portal Account
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                        Agent Name
                      </label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins (Call Center)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                        Agent Call Note for Customer
                      </label>
                      <input
                        type="text"
                        value={agentNotes}
                        onChange={(e) => setAgentNotes(e.target.value)}
                        placeholder="e.g. Quoted 6-month special rate for caller"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDispatchQuote}
                    disabled={isDispatching}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00c0f3] to-sky-600 hover:from-[#00a6d2] hover:to-sky-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isDispatching ? 'Dispatching Quote...' : '⚡ Send Quote to Customer (Email / SMS / In-Portal)'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!successResult && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyVerbalSummary}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedQuote ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Verbal Quote</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQuoteDocumentModal(true)}
                className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 text-[#0b2942] border border-sky-200 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Produce physical quote document immediately"
              >
                <Printer className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Produce Quote</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchQuote}
                disabled={isDispatching}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                title="Immediately email, SMS, or publish this quote into Customer Portal"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Quote (Email/SMS/Portal)</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#00c0f3] hover:bg-[#00a6d2] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Confirm &amp; Book</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Official Quote & Tax Invoice Document Modal (Print & PDF) */}
      {showQuoteDocumentModal && quote && (
        <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-8 max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl relative border-2 border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00c0f3]" />
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#0b2942]">
                    Portabox Official Quotation &amp; Booking Statement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Produced for over-the-phone customer (Option: No mobile/email · Credit card authorized)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#00c0f3] hover:bg-[#00a6d2] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Quote / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuoteDocumentModal(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <TraditionalQuoteDocument
              quote={quote}
              customerData={{
                firstName: customerName || 'Valued Phone Customer',
                mobile: hasNoPhoneOrEmail
                  ? (landlinePhone.trim() || 'No Mobile Phone (Phone Booking)')
                  : customerPhone,
                email: hasNoPhoneOrEmail
                  ? 'No Email (Direct Over-The-Phone Booking)'
                  : customerEmail,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
