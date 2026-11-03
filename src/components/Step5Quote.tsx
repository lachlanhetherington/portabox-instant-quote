import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Check,
  CheckCircle2,
  Tag,
  Phone,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  AlertCircle,
  CalendarCheck,
  Package,
  FileText,
  Plus,
  Minus,
  Receipt,
  Printer,
  Truck,
  ShieldCheck,
  MapPin,
  Trees,
  ArrowRight,
  Download,
  Globe,
  Headphones,
  Copy,
  Mail,
  Smartphone,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PORTABOX_IMAGES } from '../assets/images';
import { QuoteBreakdown } from '../types/quote';
import { AreYouStuckBanner } from './AreYouStuckBanner';
import {
  scheduleDeliveryOnGoogleCalendar,
  signInWithGoogleCalendar,
  getCalendarAccessToken,
  STANDARD_DELIVERY_SLOTS,
} from '../services/googleCalendarService';
import { getMetroHubForPostcode, loadAppConfig } from '../services/pricingEngine';
import { checkQuoteExpiry } from '../services/quoteLifecycleService';
import { BraintreePaymentSection } from './BraintreePaymentSection';
import { BraintreePaymentResult } from '../services/braintreeService';
import { calculateCompetitorComparison } from '../services/competitorPricingService';
import { DeliverySlotWindow, DepotCalendarConfig, AppConfig } from '../types/quote';
import { TraditionalStorageComparison } from './TraditionalStorageComparison';
import { TraditionalQuoteDocument } from './TraditionalQuoteDocument';
import { QuoteShareBar } from './QuoteShareBar';
import { DeliveryMilestoneTracker } from './DeliveryMilestoneTracker';
import { generateGoogleCalendarUrl } from '../services/deliveryCalendarService';

interface Step5QuoteProps {
  quote: QuoteBreakdown;
  customerId?: string;
  config?: AppConfig;
  customerData?: {
    firstName: string;
    mobile: string;
    email: string;
    hasNoPhoneOrEmail?: boolean;
    isAgentCallIn?: boolean;
    channels?: {
      email?: boolean;
      sms?: boolean;
      portal?: boolean;
    };
    agentName?: string;
    agentNotes?: string;
  };
  onResetQuote: () => void;
  onApplyPromoCode: (code: string) => void;
  onUpdateBoxesCount?: (count: number) => void;
  onUpdateBlanketsCount?: (count: number) => void;
  onSelectSlot?: (slot: DeliverySlotWindow) => void;
  depotCalendarConfig?: DepotCalendarConfig;
  onPaymentSuccess?: (result: BraintreePaymentResult) => void;
  onGoToNextSteps?: () => void;
  onOpenBookingModal?: () => void;
  phone?: string;
}

export const Step5Quote: React.FC<Step5QuoteProps> = ({
  quote,
  config,
  customerData,
  onResetQuote,
  onApplyPromoCode,
  onUpdateBoxesCount,
  onUpdateBlanketsCount,
  onSelectSlot,
  depotCalendarConfig,
  onPaymentSuccess,
  onGoToNextSteps,
  onOpenBookingModal,
  phone = '1800 467 637',
}) => {
  const [promoCodeInput, setPromoCodeInput] = useState(quote.appliedPromoCode || '');
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [quoteViewMode, setQuoteViewMode] = useState<'traditional' | 'interactive'>('traditional');
  const [showDeliveryTrackerPreview, setShowDeliveryTrackerPreview] = useState(false);
  const [isSuppliesEditorOpen, setIsSuppliesEditorOpen] = useState(false);
  const [showItemisedBreakdown, setShowItemisedBreakdown] = useState(false);
  const [showPriceLockDetails, setShowPriceLockDetails] = useState(false);
  const [simulateDay31Expiry, setSimulateDay31Expiry] = useState(false);
  const [repriceToast, setRepriceToast] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isSchedulingCalendar, setIsSchedulingCalendar] = useState(false);
  const [calendarEventLink, setCalendarEventLink] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const effectiveConfig = config || loadAppConfig();
  const capPercent = effectiveConfig.annualPriceAdjustmentCapPercent ?? 10;
  const validityDays = effectiveConfig.quoteValidityDays || 30;
  const freezeMonths = effectiveConfig.rateLockDurationMonths || 12;

  const expiryStatus = checkQuoteExpiry(quote);

  const hub = getMetroHubForPostcode(quote.originPostcode);
  const effectiveSlot = quote.selectedSlot || {
    ...STANDARD_DELIVERY_SLOTS[0],
    available: true,
    slotsRemaining: 2,
  };

  // Sync input if appliedPromoCode changes
  useEffect(() => {
    if (quote.appliedPromoCode) {
      setPromoCodeInput(quote.appliedPromoCode);
    }
  }, [quote.appliedPromoCode]);

  // Re-calculate when competitor rates are updated in Admin Portal
  const [, setCompetitorRefresh] = useState(0);
  useEffect(() => {
    const handleRatesUpdate = () => {
      setCompetitorRefresh((prev) => prev + 1);
    };
    window.addEventListener('portabox:competitor-rates-updated', handleRatesUpdate);
    return () => window.removeEventListener('portabox:competitor-rates-updated', handleRatesUpdate);
  }, []);

  // Watch for applied promo code changes to notify the user
  useEffect(() => {
    if (quote.appliedPromoCode) {
      if (quote.promoCodeError) {
        setPromoFeedback({
          type: 'error',
          message: quote.promoCodeError,
        });
      } else if (quote.totalDiscount > 0) {
        const promoDesc = quote.appliedPromotions?.[0]?.description || `$${quote.totalDiscount} discount`;
        const exclusiveNotice = quote.isExclusivePromoApplied
          ? ' · 🔒 Exclusive Discount (Sole Promotion Applied)'
          : ' · 🔓 Stacks with duration savings';
        setPromoFeedback({
          type: 'success',
          message: `✓ Promo code "${quote.appliedPromoCode}" applied! ${promoDesc}${exclusiveNotice}. Your first payment is $${quote.firstPaymentTotal}.`,
        });
      } else {
        setPromoFeedback({
          type: 'error',
          message: `Coupon code "${quote.appliedPromoCode}" is invalid, expired, or not applicable to this quote.`,
        });
      }
    }
  }, [quote.appliedPromoCode, quote.totalDiscount, quote.firstPaymentTotal, quote.promoCodeError, quote.isExclusivePromoApplied, quote.appliedPromotions]);

  const handleInitiateCalendarBooking = async () => {
    const token = getCalendarAccessToken();
    if (!token) {
      try {
        await signInWithGoogleCalendar();
      } catch (err: any) {
        setCalendarError('Please connect your Google account to add the drop-off to your calendar.');
        return;
      }
    }
    // Open explicit user confirmation dialog
    setIsCalendarModalOpen(true);
  };

  const handleConfirmCalendarBooking = async () => {
    setIsSchedulingCalendar(true);
    setCalendarError(null);
    try {
      const result = await scheduleDeliveryOnGoogleCalendar({
        customerName: customerData?.firstName || 'Valued Customer',
        customerEmail: customerData?.email || 'customer@portabox.com.au',
        customerPhone: customerData?.mobile || '0412 345 678',
        deliveryDateStr: quote.preferredDate,
        slot: effectiveSlot,
        metroHub: hub,
        suburb: quote.originPostcode.suburb,
        state: quote.originPostcode.state,
        postcode: quote.originPostcode.postcode,
        containerName: quote.containerName,
        containerCount: quote.containerCount,
        serviceType: quote.serviceType,
        storageDuration: quote.storageDuration,
        firstPaymentTotal: quote.firstPaymentTotal,
      });

      if (result.success && result.eventLink) {
        setCalendarEventLink(result.eventLink);
        setIsBooked(true);
        setIsCalendarModalOpen(false);
      } else {
        setCalendarError(result.error || 'Failed to create calendar event.');
      }
    } catch (err: any) {
      setCalendarError(err.message || 'Error communicating with Google Calendar.');
    } finally {
      setIsSchedulingCalendar(false);
    }
  };

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoFeedback({ type: 'error', message: 'Please enter a promo code.' });
      return;
    }
    setPromoFeedback(null);
    onApplyPromoCode(code);
  };

  const handleDownloadTaxInvoice = () => {
    // If user is currently looking at the interactive cost explorer, switch to the official traditional tax invoice sheet
    if (quoteViewMode !== 'traditional') {
      setQuoteViewMode('traditional');
      setTimeout(() => {
        window.print();
      }, 150);
    } else {
      window.print();
    }
  };

  const getImageForSize = () => {
    if (quote.containerSize === 'small_10m3') return PORTABOX_IMAGES.smallContainer;
    if (quote.containerSize === 'medium_19m3') return PORTABOX_IMAGES.mediumContainer;
    return PORTABOX_IMAGES.largeContainer;
  };

  const getContainerSizeLabel = () => {
    switch (quote.containerSize) {
      case 'small_10m3':
        return 'SMALL · 10 M³';
      case 'medium_19m3':
        return 'MEDIUM · 19 M³';
      case 'two_large_50m3':
        return '2 X LARGE · 50 M³';
      case 'large_25m3':
      default:
        return 'LARGE · 25 M³';
    }
  };

  const getBillingPeriodDescription = () => {
    switch (quote.billingCycle) {
      case 'weekly':
        return 'first week storage';
      case '3_months_upfront':
        return 'first 3 months upfront storage';
      case '6_months_upfront':
        return 'first 6 months upfront storage';
      case '12_months_upfront':
        return 'first 12 months upfront storage';
      case 'monthly':
      default:
        return 'first month storage';
    }
  };

  // 1. Calculate Cubic Meter Volume & Savings Benchmarked against modular container competitors:
  const selSmall = quote.containerSelections?.small_10m3 || 0;
  const selMed = quote.containerSelections?.medium_19m3 || 0;
  const selLrg = (quote.containerSelections?.large_25m3 || 0) + ((quote.containerSelections?.two_large_50m3 || 0) * 2);
  const hasSelections = (selSmall + selMed + selLrg) > 0;

  const totalVolumeM3 = quote.totalVolumeM3 || (
    hasSelections
      ? (selSmall * 10) + (selMed * 19) + (selLrg * 25)
      : (quote.containerSize === 'small_10m3' ? 10 : quote.containerSize === 'medium_19m3' ? 19 : 25) * quote.containerCount
  );

  // Daily verified competitor comparison (Modular container competitor benchmark: $99 delivery fee per unit, 8 m³ container, $15.20/m³ storage)
  const comp = calculateCompetitorComparison({
    totalVolumeM3,
    portaboxContainerCount: quote.containerCount,
    portaboxDeliveryCost: quote.initialDeliveryFee,
    portaboxMonthlyStorageFee: quote.monthlyStorageFee,
  });

  const competitorSmallContainersCount = comp.competitorSmallContainersCount;
  const competitorDeliveryCost = comp.competitorDeliveryCost; // Modular container competitor $99 * count
  const portaboxDeliveryCost = comp.portaboxDeliveryCost;
  const excessDeliveryCharges = comp.excessDeliveryCharges;
  const monthlyCubicSavings = comp.monthlyStorageSavings;
  const cubicSavingsPercent = comp.storageSavingsPercent;
  const marketMonthlyCost = comp.marketMonthlyCost;
  const portaboxRatePerM3 = comp.portaboxRatePerM3;
  const firstMonthTotalSavings = comp.firstMonthTotalSavings;

  // 2. Billing cycle upfront savings:
  let billingUpfrontSavings = 0;
  if (quote.billingCycle === 'monthly') {
    billingUpfrontSavings = Math.round(quote.weeklyStorageFee * (52 / 12)) - quote.monthlyStorageFee;
  } else if (quote.billingCycle === '3_months_upfront') {
    billingUpfrontSavings = (quote.weeklyStorageFee * 13) - quote.currentPeriodicStorageFee;
  } else if (quote.billingCycle === '6_months_upfront') {
    billingUpfrontSavings = (quote.weeklyStorageFee * 26) - quote.currentPeriodicStorageFee;
  } else if (quote.billingCycle === '12_months_upfront') {
    billingUpfrontSavings = (quote.weeklyStorageFee * 52) - quote.currentPeriodicStorageFee;
  }

  // 3. Total Combined Savings (Includes storage savings, excess delivery avoided, and any promo code discount):
  const totalSavedDisplay = (billingUpfrontSavings > 0 ? billingUpfrontSavings : monthlyCubicSavings) + excessDeliveryCharges + (quote.totalDiscount || 0);

  return (
    <div className="final-quote-container bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1] animate-in fade-in duration-200">
      {/* Top action row */}
      <div className="flex items-center justify-end print:hidden mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onResetQuote}
            className="text-xs font-bold text-[#15385E] bg-white hover:bg-slate-50 border border-[#DAD7D1] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#15385E]" />
            <span>New Quote</span>
          </button>
        </div>
      </div>

      <div className="print:hidden">
        <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mt-1 mb-1">
          Here's your instant quote
        </h1>

        {customerData && (
          customerData.hasNoPhoneOrEmail ? (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📞</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#15385E]">Call Center Phone Booking Mode</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md">
                      Credit Card Phone Auth
                    </span>
                  </div>
                  <span className="text-amber-800 text-[11px] block mt-0.5 font-medium">
                    Customer does not have mobile phone or email. Quote has been produced; complete booking below over phone with Credit Card.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-[#15385E] hover:bg-[#1d4b7a] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs"
              >
                <span>🖨️ Print Quote</span>
              </button>
            </div>
          ) : customerData.isAgentCallIn ? (
            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-emerald-50 border-2 border-sky-300 text-slate-800 text-xs space-y-3 shadow-xs animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#00c0f3] text-white flex items-center justify-center font-black">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#15385E] text-sm">
                        15% Call-In Intake Dispatched
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">
                        Agent Dispatched
                      </span>
                    </div>
                    <span className="text-slate-600 text-[11px]">
                      Agent {customerData.agentName || 'Call Center'} filled form for <strong>{customerData.firstName}</strong> over the phone.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`${window.location.origin}?customerPortal=true&email=${encodeURIComponent(customerData.email)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#15385E] hover:bg-[#1f4a7a] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Open in Customer Portal</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const portalUrl = `${window.location.origin}?customerPortal=true&email=${encodeURIComponent(customerData.email)}`;
                      navigator.clipboard.writeText(portalUrl);
                      alert('✓ Customer Portal magic link copied to clipboard!');
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Portal Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>🖨️ Print Quote</span>
                  </button>
                </div>
              </div>

              {/* Channel Badges */}
              <div className="flex items-center gap-2 pt-2 border-t border-sky-200/60 flex-wrap text-[11px]">
                <span className="text-slate-500 font-bold">Channels Active:</span>
                {customerData.channels?.email !== false && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-800 font-semibold">
                    <Mail className="w-3 h-3 text-emerald-600" />
                    <span>Email Sent to {customerData.email}</span>
                  </span>
                )}
                {customerData.channels?.sms !== false && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-800 font-semibold">
                    <Smartphone className="w-3 h-3 text-emerald-600" />
                    <span>SMS Sent to {customerData.mobile}</span>
                  </span>
                )}
                {customerData.channels?.portal !== false && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-800 font-semibold">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>Customer Portal Synchronized</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mb-4">
              Quote sent to <strong className="text-slate-800">{customerData.email}</strong> and <strong className="text-slate-800">{customerData.mobile}</strong>
            </p>
          )
        )}
      </div>

      {/* Multi-Channel Quote Sharing Bar (WhatsApp, SMS, Email, Native Share, Print/PDF) */}
      <div className="mt-2">
        <QuoteShareBar
          quote={quote}
          customerData={customerData}
          phone={phone}
        />
      </div>

      {/* Official Quotation Document View */}
      <div className="mt-6">
        <TraditionalQuoteDocument
          quote={quote}
          customerData={customerData}
          phone={phone}
          onBookNow={onOpenBookingModal}
        />
      </div>

      {/* Navigation actions */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 print:hidden">
        <button
          type="button"
          onClick={onResetQuote}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border-2 border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          ← Back to Edit Quote
        </button>
        {onGoToNextSteps && (
          <button
            type="button"
            onClick={onGoToNextSteps}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Continue to Next Steps</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Explicit User Confirmation Modal for Google Calendar event creation (Mandatory per Skill) */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-3 bg-sky-50 text-[#00c0f3] rounded-2xl">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0b2942]">Confirm Calendar Reservation</h3>
                <p className="text-xs text-slate-500">Google Calendar dispatch event</p>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Delivery Event:</span>
                <span className="font-bold text-[#0b2942]">Portabox Container Delivery</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-bold text-[#0b2942]">{quote.preferredDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Arrival Window:</span>
                <span className="font-bold text-[#00c0f3]">{effectiveSlot.label} ({effectiveSlot.timeRange})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Container Details:</span>
                <span className="font-bold text-[#0b2942]">{quote.containerCount}x {quote.containerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Delivery Location:</span>
                <span className="font-bold text-[#0b2942]">{quote.originPostcode.suburb}, {quote.originPostcode.state} {quote.originPostcode.postcode}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Invited Attendee:</span>
                <span className="font-bold text-[#0b2942]">{customerData?.email || 'customer@portabox.com.au'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              This action will schedule a calendar appointment on your connected Google Calendar with automated reminders 24h and 2h before arrival.
            </p>

            {calendarError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {calendarError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(false)}
                disabled={isSchedulingCalendar}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCalendarBooking}
                disabled={isSchedulingCalendar}
                className="px-5 py-2.5 rounded-xl bg-[#00c0f3] hover:bg-[#00abda] text-white text-xs font-black shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSchedulingCalendar ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Scheduling Event...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirm Calendar Reservation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Are You Stuck Banner on Every Page */}
      <div className="print:hidden">
        <AreYouStuckBanner
          config={config}
          originPostcode={quote.originPostcode}
          customerName={customerData ? customerData.firstName : undefined}
          customerMobile={customerData?.mobile}
          suburbOrPostcode={quote.originPostcode ? `${quote.originPostcode.postcode} ${quote.originPostcode.suburb}` : undefined}
        />
      </div>
    </div>
  );
};
