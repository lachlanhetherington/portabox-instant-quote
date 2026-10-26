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
      <div className="flex items-center justify-between print:hidden">
        {/* Header kicker: #F7D347 Vibrant Gold with #1A1A1A text */}
        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
          FINAL QUOTE SUMMARY
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTaxInvoice}
            className="text-xs font-bold text-white bg-[#15385E] hover:bg-[#0f2844] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Download a print-ready PDF version of the formal quote sheet for your records"
          >
            <Download className="w-3.5 h-3.5 text-[#F7D347]" />
            <span>Download Tax Invoice</span>
          </button>
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

      {/* Quotation Presentation Mode Switcher */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setQuoteViewMode('traditional')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              quoteViewMode === 'traditional'
                ? 'bg-[#15385E] text-[#F7D347] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Traditional Tax Invoice Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setQuoteViewMode('interactive')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              quoteViewMode === 'interactive'
                ? 'bg-[#15385E] text-[#F7D347] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart className="w-4 h-4" />
            <span>Interactive Cost Explorer</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleDownloadTaxInvoice}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#15385E] text-xs font-black border-2 border-slate-300 hover:border-[#15385E] shadow-2xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            title="Download print-ready official tax invoice PDF"
          >
            <Download className="w-4 h-4 text-[#15385E]" />
            <span>Download Tax Invoice</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>30-Day Guaranteed Price Lock Active</span>
          </div>
        </div>
      </div>

      {/* Traditional Itemised Tax Invoice View (Default) */}
      {quoteViewMode === 'traditional' ? (
        <div className="mt-6">
          <TraditionalQuoteDocument
            quote={quote}
            customerData={customerData}
            phone={phone}
            onBookNow={onOpenBookingModal}
          />
        </div>
      ) : (
        <>
          {/* Hero Payment Banner: #112F4F Deep Container Blue Roller Door with #FFFFFF Pure White Headlines */}
          <div className="mt-4 rounded-3xl bg-[#112F4F] text-white p-6 shadow-md border-2 border-[#DAD7D1] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#5CC1EF] mb-1">
                <span className="w-2 h-2 rounded-full bg-[#5CC1EF]" />
                <span>PORTABOX INSTANT RATE</span>
              </div>
          <p className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider">
            Your first payment
          </p>
          <p className="text-xs text-slate-300 mt-0.5 max-w-md leading-relaxed">
            Includes Zone {quote.deliveryZone} ({quote.deliveryZoneRangeLabel || `< 25 km`}) initial empty container delivery {quote.containerCount > 1 ? `($${quote.domesticLegFeePerContainer}/container × ${quote.containerCount} = $${quote.initialDeliveryFee})` : `($${quote.initialDeliveryFee})`} + {getBillingPeriodDescription()} {quote.containerCount > 1 ? `($${quote.billingCycle === 'weekly' ? quote.weeklyRatePerContainer : quote.monthlyRatePerContainer}/container × ${quote.containerCount} = $${quote.currentPeriodicStorageFee})` : `($${quote.currentPeriodicStorageFee})`}{quote.packingSupplies.totalSuppliesPrice > 0 ? ` + packing supplies ($${quote.packingSupplies.totalSuppliesPrice})` : ''}
            {quote.totalDiscount > 0 ? ` - promo discount (-$${quote.totalDiscount})` : ''}
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <div className="flex items-baseline sm:justify-end gap-2.5">
            {quote.totalDiscount > 0 && (
              <span className="text-2xl sm:text-3xl font-extrabold line-through text-slate-400 font-mono">
                ${quote.firstPaymentTotal + quote.totalDiscount}
              </span>
            )}
            <div className="text-3xl sm:text-5xl font-black tracking-tight font-mono text-[#FFFFFF]">
              ${quote.firstPaymentTotal}
            </div>
          </div>
          <div className="mt-1 flex items-center sm:justify-end gap-1.5 flex-wrap">
            <span className="text-xs text-slate-300 font-medium">
              GST included · All billing in advance
            </span>
            {quote.totalDiscount > 0 && (
              <span className="bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                -${quote.totalDiscount} PROMO APPLIED
              </span>
            )}
            {totalSavedDisplay > 0 && (
              <span className="bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338] font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                TOTAL SAVED: ${totalSavedDisplay}
              </span>
            )}
          </div>
          {onOpenBookingModal && (
            <div className="mt-3 flex sm:justify-end">
              <button
                type="button"
                onClick={onOpenBookingModal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F7D347] hover:bg-[#eec939] text-[#15385E] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-[#15385E]" />
                <span>Book Now · Confirm Delivery</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Eco-Route Carbon Reduction & Horizontal Level-Lift Banner */}
      {quote.ecoEmissionsInfo?.isBestValue && (
        <div className="mt-4 p-4.5 rounded-2xl bg-emerald-50/90 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-sm">
              🌱
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                  Eco-Optimized Delivery Window
                </span>
                <span className="text-[10px] font-bold bg-white text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  {quote.ecoEmissionsInfo.co2SavedKg} kg CO₂ Emissions Prevented
                </span>
                {quote.ecoEmissionsInfo.incentiveMode === 'dollar_discount' && quote.ecoEmissionsInfo.discountAud > 0 && (
                  <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                    ${quote.ecoEmissionsInfo.discountAud} Discount Applied ({quote.ecoEmissionsInfo.discountPercent}% Savings)
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                Your delivery clusters with local fleet routes, cutting ~26 km in redundant truck transit.
                <span className="font-semibold block sm:inline sm:ml-1 text-emerald-950">
                  Portabox uses advanced horizontal level-lift trucks — keeping your container 100% flat with zero tilting.
                </span>
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-black text-emerald-800 font-mono">
              -{quote.ecoEmissionsInfo.co2SavedKg} kg
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Carbon Avoided
            </span>
          </div>
        </div>
      )}

      {/* Toast feedback for refreshing expired quote */}
      {repriceToast && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{repriceToast}</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            UPDATED
          </span>
        </div>
      )}

      {/* 30-Day Guaranteed Price Lock & 12-Month Rate Freeze Policy Card */}
      <div className={`mt-4 rounded-2xl border-2 transition-all p-4 sm:p-5 ${
        simulateDay31Expiry
          ? 'bg-rose-50/70 border-rose-300 shadow-xs'
          : 'bg-gradient-to-r from-sky-50/80 via-white to-amber-50/50 border-[#5CC1EF]/50 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              simulateDay31Expiry
                ? 'bg-rose-600 text-white'
                : 'bg-[#15385E] text-[#F7D347]'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  simulateDay31Expiry
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {simulateDay31Expiry ? 'Quote Expired (Day 31+)' : '30-Day Guaranteed Price Lock'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {simulateDay31Expiry
                    ? 'Repriced to Active Catalog Rates'
                    : `Valid through ${expiryStatus.formattedExpiresDate} (${expiryStatus.daysRemaining} days remaining)`}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {simulateDay31Expiry ? (
                  <span>
                    The 30-day window has lapsed. Your quote total has been automatically refreshed to active catalog rates. <strong>Your container specifications and postcodes are retained</strong> with no need to re-enter details.
                  </span>
                ) : (
                  <span>
                    Your quote storage rate is protected for {validityDays} days, with monthly rates frozen for <strong>{freezeMonths} months</strong> upon booking. Delivery fees reflect scheduled rates for your booking slot.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            {simulateDay31Expiry ? (
              <button
                type="button"
                onClick={() => {
                  setSimulateDay31Expiry(false);
                  setRepriceToast('✓ New 30-Day Guaranteed Price Lock window issued! Monthly storage rate locked for 30 calendar days.');
                  setTimeout(() => setRepriceToast(null), 4000);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Lock for 30 Days</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPriceLockDetails(!showPriceLockDetails)}
                className="text-xs font-extrabold text-[#15385E] hover:text-[#5CC1EF] flex items-center gap-1 cursor-pointer bg-white/80 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
              >
                <span>{showPriceLockDetails ? 'Hide Policy Rules' : 'View Policy Rules'}</span>
                {showPriceLockDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Admin / Verification Test Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextVal = !simulateDay31Expiry;
                setSimulateDay31Expiry(nextVal);
                if (nextVal) {
                  setRepriceToast('⚠️ Simulated Day 31+ Quote Expiry: Total repriced at current catalog rates; postcodes & container specs preserved.');
                } else {
                  setRepriceToast('✓ Restored Active 30-Day Price-Lock Window.');
                }
                setTimeout(() => setRepriceToast(null), 4000);
              }}
              title="Test Day 31+ quote expiration and auto-recalculation behavior"
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer transition-colors"
            >
              {simulateDay31Expiry ? 'Reset to Active' : 'Test Day 31+ Expiry'}
            </button>
          </div>
        </div>

        {/* Detailed Lifecycle Rules Accordion */}
        {showPriceLockDetails && (
          <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3 text-xs text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/90 border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider">1. Pre-Booking Window</span>
                <p className="text-xs font-bold text-[#15385E]">30 Calendar Days Locked</p>
                <p className="text-[11px] text-slate-500">
                  Quote monthly storage rates are protected for 30 calendar days. Delivery fees reflect current standard depot rates for the scheduled booking.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">2. Booking Execution</span>
                <p className="text-xs font-bold text-[#15385E]">{freezeMonths}-Month Rate Freeze</p>
                <p className="text-[11px] text-slate-500">
                  Monthly storage is contractually frozen for {freezeMonths} mandatory months. Delivery fees reflect standard catalog rates at time of service.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/90 border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">3. Year 2+ Annual Review</span>
                <p className="text-xs font-bold text-[#15385E]">Capped at +{capPercent}% Max</p>
                <p className="text-[11px] text-slate-500">
                  New rate = max(Quote, min(Catalog, Quote × (1 + {capPercent}%))). Price floor applied: rates never drop below quote. Notified only if price increases.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quote Breakdown Items */}
      <div className="mt-6 divide-y divide-slate-100 border border-slate-200/80 rounded-2xl p-5 bg-slate-50/40 space-y-4">
        {/* Container & Storage Row */}
        <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0">
              <img
                src={getImageForSize()}
                alt="Portabox unit"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {quote.containerCount > 1 ? `${quote.containerCount} X ${getContainerSizeLabel()}` : `1 X ${getContainerSizeLabel()}`}
              </p>
              <h3 className="text-base font-extrabold text-[#0b2942]">
                {quote.serviceType === 'storage_at_place'
                  ? 'Storage at your place'
                  : quote.serviceType === 'storage_facility'
                  ? 'Storage at Portabox facility'
                  : quote.serviceType === 'moving'
                  ? `Moving to ${quote.destinationPostcode?.suburb || 'Destination'}`
                  : `Moving and storage to ${quote.destinationPostcode?.suburb || 'Destination'}`}
              </h3>
              <p className="text-xs text-slate-500">
                {quote.storageDuration.replace(/_/g, ' ')} · Rate locked for 12 months
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-left sm:text-right gap-1">
            <div className="text-xl font-extrabold text-[#0b2942] font-mono">
              {quote.durationDiscountPercent && quote.durationDiscountPercent > 0 && quote.baseMonthlyStorageFee ? (
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <span className="line-through text-slate-400 text-sm font-normal">
                    ${quote.baseMonthlyStorageFee}
                  </span>
                  <span className="text-emerald-700">
                    ${quote.monthlyStorageFee}
                  </span>
                </div>
              ) : (
                quote.billingCycle === 'weekly' ? `$${quote.weeklyStorageFee}` : `$${quote.monthlyStorageFee}`
              )}
            </div>
            <div className="text-xs text-slate-500">
              {quote.billingCycleLabel || (quote.billingCycle === 'weekly' ? 'Weekly billing' : 'Monthly billing')}
            </div>
            {quote.durationDiscountPercent && quote.durationDiscountPercent > 0 && (
              <span className="text-[10px] font-black text-[#15385E] bg-[#F7D347] border border-[#e6c338] px-2 py-0.5 rounded-md self-start sm:self-auto">
                {quote.durationDiscountPercent}% DURATION DISCOUNT APPLIED
              </span>
            )}
            {quote.billingCycleSavingsText && quote.billingCycle !== 'weekly' && !quote.durationDiscountPercent && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 self-start sm:self-auto">
                {quote.billingCycleSavingsText}
              </span>
            )}
            {quote.containerCount > 1 && (
              <div className="text-[11px] font-bold text-[#00c0f3] bg-sky-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                {quote.storagePricingText}
              </div>
            )}
          </div>
        </div>

        {/* Container Protection Option (CPO Insurance) Line Item */}
        {quote.insurance && quote.insurance.selected && (
          <div className="pt-3 pb-2">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#0b2942]">
                      Container Protection Option (CPO Insurance)
                    </span>
                    {quote.insurance.isFreePromo ? (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                        Free Promotional Inclusion
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        Up to ${(quote.insurance.coverageAmount || 10000).toLocaleString()} cover/container
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 mt-1">
                    Protection for contents against water, storm, fire, transit &amp; theft across {quote.containerCount} {quote.containerCount > 1 ? 'containers' : 'container'}
                    {quote.containerCount > 1 && !quote.insurance.isFreePromo && (
                      <span className="font-semibold text-emerald-800 ml-1">
                        (${quote.insurance.monthlyPricePerContainer}/container/mo)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-extrabold text-[#0b2942] text-sm">
                  {quote.insurance.isFreePromo ? (
                    <span className="text-emerald-700 font-bold">$0 Free</span>
                  ) : (
                    `+$${quote.insurance.totalMonthlyInsuranceFee}/mo`
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {quote.insurance.isFreePromo ? 'Included in booking' : 'Billed monthly'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extra KM Charge Callout if applicable */}
        {quote.movingKmCharge !== undefined && quote.movingKmCharge > 0 && (
          <div className="pt-3 pb-2">
            <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00c0f3] shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#0b2942]">
                      Extra km delivery charge to {quote.destinationPostcode?.suburb || 'Destination'}:
                    </span>
                    <span className="text-[10px] font-bold bg-white text-[#00c0f3] px-2 py-0.5 rounded border border-sky-200">
                      Road driving distance
                    </span>
                  </div>
                  <div className="text-slate-600 mt-1">
                    <span>
                      {quote.movingDistanceKm} km road driving route · Zone {quote.movingDeliveryZone} rate (${quote.kmRatePerKm?.toFixed(2) || '2.00'}/km)
                    </span>
                    {quote.containerCount > 1 && (
                      <span className="font-bold text-[#00c0f3] ml-1.5">
                        (${quote.movingKmRatePerContainer || Math.round(quote.movingKmCharge / quote.containerCount)}/container × {quote.containerCount} containers)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-extrabold text-[#0b2942] text-sm">
                  +${quote.movingKmCharge}
                </div>
                {quote.containerCount > 1 && (
                  <div className="text-[10px] text-slate-500 font-medium">
                    ${quote.movingKmRatePerContainer || Math.round(quote.movingKmCharge / quote.containerCount)} per container
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fuel Surcharge Line Item (Set by Portabox admin, Blue Lettering, Non-Optional) */}
        {quote.isFuelSurchargeIncluded && (quote.fuelSurchargeAmount > 0 || (quote.deferredFuelSurchargeAmount && quote.deferredFuelSurchargeAmount > 0)) && (
          <div className="pt-3 pb-2">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                    <h4 className="text-xs font-extrabold text-blue-700">
                      {quote.fuelSurchargeModel === 'per_zone'
                        ? `Fuel Levy (Zone ${quote.deliveryZone} Fixed Rate: $${quote.fuelSurchargePerContainer?.toFixed(2)}/container)`
                        : `Fuel Levy (${quote.fuelSurchargeRatePerKm?.toFixed(2) || '0.50'} / km travelled)`}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-100 border-blue-300 text-blue-800">
                      Standard Transport Inclusion (Set by Portabox Admin)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {quote.fuelSurchargeModel === 'per_zone' ? 'Zone Fixed Pricing' : 'Per-Km Pricing'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    {quote.fuelSurchargeModel === 'per_zone' ? (
                      <span>
                        Fixed Zone {quote.deliveryZone} rate of <strong className="text-blue-900">${quote.fuelSurchargePerContainer?.toFixed(2)}/container</strong> on initial delivery leg
                        {quote.containerCount > 1 && (
                          <span>
                            {' '}× {quote.containerCount} containers = <strong className="text-blue-950 font-mono">${quote.fuelSurchargeAmount?.toFixed(2)}</strong> payable now.
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>
                        Calculated on road driving distance ({quote.originDistanceKm} km) at ${quote.fuelSurchargeRatePerKm?.toFixed(2)}/km:
                        {' '}
                        <strong className="text-blue-900">
                          ${quote.fuelSurchargePerContainer?.toFixed(2)}/container
                        </strong>
                        {quote.containerCount > 1 && (
                          <span>
                            {' '}× {quote.containerCount} containers = <strong className="text-blue-950 font-mono">${quote.fuelSurchargeAmount?.toFixed(2)}</strong> payable now.
                          </span>
                        )}
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-extrabold text-base text-blue-700">
                    +${quote.fuelSurchargeAmount?.toFixed(2)}
                  </span>
                  <div className="text-[10px] text-blue-600 font-semibold">
                    included in 1st payment
                  </div>
                </div>
              </div>

              {/* Deferred Future Deliveries & Interstate Return Callout */}
              <div className="pt-2 border-t border-blue-200/80 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <span className="text-blue-600 font-black">✓</span>
                  <span>Planned Future Deliveries &amp; Final Pick-Ups:</span>
                  <span className="font-normal text-blue-800">
                    Fuel levy is <strong>not charged upfront</strong> until they occur.
                    {quote.deferredFuelSurchargeAmount && quote.deferredFuelSurchargeAmount > 0 && (
                      <span className="font-semibold text-blue-950"> (Est. ${quote.deferredFuelSurchargeAmount.toFixed(2)} deferred across remaining legs)</span>
                    )}
                  </span>
                </div>
                {quote.isInterstate && (
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                    <span className="text-blue-600 font-black">✓</span>
                    <span>Interstate Move Final Collection:</span>
                    <span className="font-normal text-blue-800">
                      Empty container is returned to the <strong>destination Portabox location</strong> and the destination fuel levy is calculated based on this one-way transit distance (not return/round-trip distance), deferred until collection occurs.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legs breakdown */}
        <div className="pt-2 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Zone {quote.deliveryZone} ({quote.deliveryZoneRangeLabel || '< 25 km'} one-way · {quote.originDistanceKm} km) Transport &amp; Delivery Legs ({quote.containerCount > 1 ? `$${quote.domesticLegFeePerContainer} Zone ${quote.deliveryZone} fee per container · $${quote.domesticLegFeePerContainer * quote.containerCount} per leg` : `$${quote.domesticLegFeePerContainer} Zone ${quote.deliveryZone} fee per one-way leg`})
            </div>
            {quote.containerCount > 1 && (
              <span className="text-[10px] font-bold text-[#00c0f3] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 w-fit">
                Per-container & total breakdown shown
              </span>
            )}
          </div>

          {quote.legs.map((leg, idx) => (
            <div key={idx} className="flex items-start sm:items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-[#0b2942] flex flex-wrap items-center gap-2">
                  <span>{leg.label}</span>
                  {leg.isPayableNow && (
                    <span className="text-[10px] font-bold bg-sky-100 text-[#00c0f3] px-2 py-0.5 rounded-full">
                      Included in 1st payment
                    </span>
                  )}
                  {leg.feePerContainer && leg.containerCount && leg.containerCount > 1 && (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      ${leg.feePerContainer}/container × {leg.containerCount}
                    </span>
                  )}
                  {leg.extraKmCharge && leg.extraKmCharge > 0 && (
                    <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                      +${leg.extraKmCharge} extra km ({leg.extraKmDistanceKm} km)
                    </span>
                  )}
                  {leg.fuelSurcharge && !leg.fuelSurchargeDeferred && (
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                      Includes +${leg.fuelSurcharge} fuel levy
                    </span>
                  )}
                  {leg.fuelSurchargeDeferred && leg.fuelSurchargeEstimatedAmount !== undefined && leg.fuelSurchargeEstimatedAmount > 0 && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                      Fuel levy deferred: est. ${leg.fuelSurchargeEstimatedAmount} (Billed when leg occurs)
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500">{leg.description}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-extrabold text-[#0b2942] font-mono">
                  ${leg.fee}
                </span>
                <div className="text-[10px] text-slate-400 font-medium">
                  {leg.isPayableNow ? 'Payable now' : 'Payable upon collection'}
                </div>
              </div>
            </div>
          ))}

          {/* Waived Depot Self-Load / Unload Legs */}
          {quote.waivedLegs && quote.waivedLegs.length > 0 && (
            <div className="mt-4 pt-3 border-t border-emerald-100 space-y-2">
              <div className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Waived Delivery Legs (Depot Self-Load &amp; Self-Unload Savings)</span>
              </div>
              {quote.waivedLegs.map((wLeg, wIdx) => (
                <div key={wIdx} className="flex items-start sm:items-center justify-between gap-4 py-2 bg-emerald-50/50 rounded-xl px-3 border border-emerald-200">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      <span className="line-through text-slate-400">{wLeg.label.replace('[Waived] ', '')}</span>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        FREE · {wLeg.waivedReason}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">{wLeg.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-extrabold text-emerald-700 font-mono">
                      $0
                    </span>
                    {wLeg.waivedSavings && wLeg.waivedSavings > 0 && (
                      <div className="text-[10px] text-emerald-600 font-bold">
                        Saved ${wLeg.waivedSavings}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Packing Materials & Moving Supplies Row in Breakdown */}
          {quote.packingSupplies && quote.packingSupplies.totalSuppliesPrice > 0 ? (
            <div className="pt-3 pb-2 border-t border-slate-100">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Package className="w-4 h-4 text-[#00c0f3] shrink-0" />
                      <h4 className="text-sm font-extrabold text-[#0b2942]">
                        Packing Materials & Supplies
                      </h4>
                      <span className="text-[10px] font-bold bg-sky-50 text-[#00c0f3] px-2 py-0.5 rounded-full border border-sky-200">
                        Free delivery (packed inside container)
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pl-6">
                      {quote.packingSupplies.locksCount !== undefined && quote.packingSupplies.locksCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>
                            <strong className="text-slate-900 font-bold">{quote.packingSupplies.locksCount} × Heavy-Duty Container Padlock</strong> (Stainless-steel discus lock):
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {quote.packingSupplies.isLockFreePromo ? (
                              <span className="text-emerald-700 font-bold">$0 Free Promo</span>
                            ) : (
                              `$${quote.packingSupplies.locksPrice}`
                            )}
                          </span>
                        </div>
                      )}
                      {quote.packingSupplies.blanketsCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>
                            <strong className="text-slate-900 font-bold">{quote.packingSupplies.blanketsCount} × Moving Blankets</strong> (Quilted protective pads):
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {quote.packingSupplies.blanketsPrice === 0 ? (
                              <span className="text-emerald-700 font-bold">100% Free Included</span>
                            ) : (
                              `$${quote.packingSupplies.blanketsPrice}`
                            )}
                          </span>
                        </div>
                      )}
                      {quote.packingSupplies.boxesCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>
                            <strong className="text-slate-900 font-bold">{quote.packingSupplies.boxesCount} × Packing Boxes</strong> (Heavy-duty double-wall):
                          </span>
                          <span className="font-mono font-bold text-slate-900">${quote.packingSupplies.boxesPrice}</span>
                        </div>
                      )}
                    </div>

                    {(onUpdateBoxesCount || onUpdateBlanketsCount) && (
                      <div className="pt-1 pl-6">
                        <button
                          type="button"
                          onClick={() => setIsSuppliesEditorOpen(!isSuppliesEditorOpen)}
                          className="text-[11px] font-bold text-[#00c0f3] hover:underline cursor-pointer"
                        >
                          {isSuppliesEditorOpen ? 'Close supplies editor' : '✎ Adjust boxes or blankets'}
                        </button>
                      </div>
                    )}
                  </div>

                {/* Savings Chart */}

                  <div className="text-right shrink-0">
                    <span className="text-base font-extrabold text-[#0b2942] font-mono">
                      +${quote.packingSupplies.totalSuppliesPrice}
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Included in 1st payment
                    </div>
                  </div>
                </div>

                {/* Savings Chart */}
                <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200">
                  <h4 className="text-sm font-black text-[#15385E] mb-4">Savings vs Traditional Movers</h4>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Traditional', cost: comp.marketMonthlyCost, fill: '#64748b' },
                        { name: 'Portabox', cost: comp.portaboxMonthlyStorageFee, fill: '#00c0f3' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                        <Legend />
                        <Bar dataKey="cost" name="Monthly Cost" fill="#8884d8">
                          <Cell fill="#64748b" />
                          <Cell fill="#00c0f3" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* In-place Supplies Editor */}
                {isSuppliesEditorOpen && (onUpdateBoxesCount || onUpdateBlanketsCount) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg">
                    {onUpdateBoxesCount && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800">Packing Boxes</span>
                          <div className="text-[10px] text-slate-500">10 for $20 · 50 for $40</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateBoxesCount(Math.max(0, quote.packingSupplies.boxesCount - 10))}
                            className="w-7 h-7 rounded-lg border border-slate-300 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold w-6 text-center">{quote.packingSupplies.boxesCount}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateBoxesCount(quote.packingSupplies.boxesCount + 10)}
                            className="w-7 h-7 rounded-lg border border-slate-300 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                    {onUpdateBlanketsCount && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800">Moving Blankets</span>
                          <div className="text-[10px] text-slate-500">10 for $20 rental</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateBlanketsCount(Math.max(0, quote.packingSupplies.blanketsCount - 10))}
                            className="w-7 h-7 rounded-lg border border-slate-300 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold w-6 text-center">{quote.packingSupplies.blanketsCount}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateBlanketsCount(quote.packingSupplies.blanketsCount + 10)}
                            className="w-7 h-7 rounded-lg border border-slate-300 bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            (onUpdateBoxesCount || onUpdateBlanketsCount) && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuppliesEditorOpen(!isSuppliesEditorOpen)}
                  className="w-full p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs text-slate-600 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Package className="w-3.5 h-3.5 text-[#00c0f3]" />
                    <span>Need packing boxes or moving blankets? (Delivered inside container)</span>
                  </span>
                  <span className="text-[#00c0f3] font-bold text-xs">
                    {isSuppliesEditorOpen ? 'Close' : '+ Add supplies'}
                  </span>
                </button>
                {isSuppliesEditorOpen && (
                  <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {onUpdateBoxesCount && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800">Add Packing Boxes</span>
                          <div className="text-[10px] text-slate-500">10 for $20 · 50 for $40</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdateBoxesCount(10)}
                          className="px-3 py-1.5 bg-sky-50 text-[#00c0f3] hover:bg-sky-100 rounded-lg font-bold border border-sky-200 cursor-pointer"
                        >
                          + 10 Boxes ($20)
                        </button>
                      </div>
                    )}
                    {onUpdateBlanketsCount && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-800">Add Moving Blankets</span>
                          <div className="text-[10px] text-slate-500">10 for $20 rental</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdateBlanketsCount(10)}
                          className="px-3 py-1.5 bg-sky-50 text-[#00c0f3] hover:bg-sky-100 rounded-lg font-bold border border-sky-200 cursor-pointer"
                        >
                          + 10 Blankets ($20)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {/* Applied Promotional Discount Row in Breakdown */}
          {quote.totalDiscount > 0 && (
            <div className="pt-3 pb-1 border-t border-emerald-200">
              <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                        Promotional Discount {quote.appliedPromoCode ? `(${quote.appliedPromoCode})` : ''}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        APPLIED
                      </span>
                      {quote.isExclusivePromoApplied ? (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-full">
                          EXCLUSIVE (SOLE DISCOUNT)
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          STACKABLE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {quote.appliedPromotions?.[0]?.description || `$${quote.totalDiscount} discount applied to first payment`}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-black text-base text-emerald-700">
                    -${quote.totalDiscount}
                  </span>
                  <div className="text-[10px] text-emerald-600 font-bold">
                    Deducted at checkout
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Itemised Quote & Tax Invoice Breakdown Section */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0b2942] text-white flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-[#00c0f3]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#0b2942]">
                Itemised Quote & Tax Invoice Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Complete itemised breakdown of storage, delivery, boxes, blankets, and promo discounts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowItemisedBreakdown(!showItemisedBreakdown)}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#0b2942] flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#00c0f3]" />
            <span>{showItemisedBreakdown ? 'Hide Itemised Breakdown' : 'Request / View Itemised Breakdown'}</span>
            {showItemisedBreakdown ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {showItemisedBreakdown && (
          <div className="p-4 sm:p-6 space-y-4 text-xs animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 font-bold">Item Description</th>
                    <th className="py-2.5 font-bold text-center">Qty</th>
                    <th className="py-2.5 font-bold text-right">Unit Price</th>
                    <th className="py-2.5 font-bold text-right">Amount (AUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* 1. Container Storage */}
                  <tr>
                    <td className="py-3 pr-2">
                      <div className="font-extrabold text-[#0b2942]">{quote.containerName} ({quote.containerVolume})</div>
                      <div className="text-[11px] text-slate-500">
                        {quote.serviceType === 'storage_at_place' ? 'Storage at your place' : quote.serviceType === 'storage_facility' ? 'Storage at Portabox facility' : 'Storage / Transit'} · {quote.billingCycleLabel}
                      </div>
                    </td>
                    <td className="py-3 text-center font-mono font-medium">{quote.containerCount}</td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      ${quote.billingCycle === 'weekly' ? quote.weeklyRatePerContainer : quote.monthlyRatePerContainer}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0b2942]">
                      ${quote.currentPeriodicStorageFee}
                    </td>
                  </tr>

                  {/* 2. Initial Delivery Leg */}
                  <tr>
                    <td className="py-3 pr-2">
                      <div className="font-extrabold text-[#0b2942]">
                        Zone {quote.deliveryZone} ({quote.deliveryZoneRangeLabel || '< 25 km'}) Initial Container Delivery
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Delivery to {quote.originPostcode.suburb}, {quote.originPostcode.state} ({quote.originDistanceKm} km from {quote.originDepot.name} · Level-lift truck, 100% horizontal placement)
                      </div>
                    </td>
                    <td className="py-3 text-center font-mono font-medium">{quote.containerCount}</td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      ${quote.domesticLegFeePerContainer}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0b2942]">
                      ${quote.initialDeliveryFee}
                    </td>
                  </tr>

                  {/* 3. Packing Boxes (Itemised) */}
                  <tr>
                    <td className="py-3 pr-2">
                      <div className="font-extrabold text-[#0b2942]">Heavy-Duty Packing Boxes</div>
                      <div className="text-[11px] text-slate-500">
                        Double-wall corrugated moving boxes (delivered inside container)
                      </div>
                    </td>
                    <td className="py-3 text-center font-mono font-medium">{quote.packingSupplies.boxesCount}</td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {quote.packingSupplies.boxesCount > 0 ? `$${(quote.packingSupplies.boxesPrice / quote.packingSupplies.boxesCount).toFixed(2)}` : '$0.00'}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0b2942]">
                      ${quote.packingSupplies.boxesPrice}
                    </td>
                  </tr>

                  {/* 4. Moving Blankets (Itemised) */}
                  <tr>
                    <td className="py-3 pr-2">
                      <div className="font-extrabold text-[#0b2942]">Heavy-Duty Moving Blankets Rental</div>
                      <div className="text-[11px] text-slate-500">
                        Quilted protective furniture pads (delivered inside container)
                      </div>
                    </td>
                    <td className="py-3 text-center font-mono font-medium">{quote.packingSupplies.blanketsCount}</td>
                    <td className="py-3 text-right font-mono text-slate-600">
                      {quote.packingSupplies.blanketsCount > 0 ? `$${(quote.packingSupplies.blanketsPrice / quote.packingSupplies.blanketsCount).toFixed(2)}` : '$0.00'}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0b2942]">
                      ${quote.packingSupplies.blanketsPrice}
                    </td>
                  </tr>

                  {/* 5. Extra Distance / Fuel Surcharge if applicable */}
                  {quote.movingKmCharge !== undefined && quote.movingKmCharge > 0 && (
                    <tr>
                      <td className="py-3 pr-2">
                        <div className="font-extrabold text-[#0b2942]">Distance Route Surcharge</div>
                        <div className="text-[11px] text-slate-500">
                          {quote.movingDistanceKm} km road driving distance to destination
                        </div>
                      </td>
                      <td className="py-3 text-center font-mono font-medium">1</td>
                      <td className="py-3 text-right font-mono text-slate-600">${quote.movingKmCharge}</td>
                      <td className="py-3 text-right font-mono font-bold text-[#0b2942]">+${quote.movingKmCharge}</td>
                    </tr>
                  )}

                  {quote.isFuelSurchargeIncluded && quote.fuelSurchargeAmount > 0 && (
                    <tr>
                      <td className="py-3 pr-2">
                        <div className="font-extrabold text-[#0b2942]">
                          Fuel Levy ({quote.fuelSurchargeModel === 'per_zone' ? `Zone ${quote.deliveryZone} Fixed Rate` : `${quote.fuelSurchargeRatePerKm?.toFixed(2)}/km`})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {quote.fuelSurchargeModel === 'per_zone'
                            ? `Fixed Zone ${quote.deliveryZone} fuel levy for initial delivery leg · Future legs deferred until they occur`
                            : `${quote.fuelSurchargeRatePerKm?.toFixed(2)}/km on initial delivery road transit · Future legs deferred until they occur`}
                        </div>
                      </td>
                      <td className="py-3 text-center font-mono font-medium">{quote.containerCount}</td>
                      <td className="py-3 text-right font-mono text-slate-600">${quote.fuelSurchargePerContainer?.toFixed(2)}</td>
                      <td className="py-3 text-right font-mono font-bold text-[#0b2942]">+${quote.fuelSurchargeAmount.toFixed(2)}</td>
                    </tr>
                  )}

                  {/* 6. Promotional Discount (Itemised) */}
                  {quote.totalDiscount > 0 && (
                    <tr className="bg-emerald-50/70 font-semibold text-emerald-900">
                      <td className="py-3 pr-2">
                        <div className="font-black text-emerald-950 flex items-center gap-1.5">
                          <span>Promotional Discount</span>
                          {quote.appliedPromoCode && (
                            <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.2 rounded-md font-mono">
                              {quote.appliedPromoCode}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          {quote.appliedPromotions?.[0]?.description || 'Promotional coupon applied to initial invoice'}
                        </div>
                      </td>
                      <td className="py-3 text-center font-mono">1</td>
                      <td className="py-3 text-right font-mono text-emerald-700">-${quote.totalDiscount}</td>
                      <td className="py-3 text-right font-mono font-black text-emerald-700">-${quote.totalDiscount}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-extrabold text-sm text-[#0b2942]">
                    <td colSpan={3} className="py-3 text-right font-bold text-slate-700">
                      Total Payable Today (Final Quote Price):
                    </td>
                    <td className="py-3 text-right font-mono font-black text-lg text-[#00c0f3]">
                      ${quote.firstPaymentTotal}
                    </td>
                  </tr>
                  <tr className="text-[11px] text-slate-500">
                    <td colSpan={3} className="pt-1 text-right">
                      Includes 10% GST:
                    </td>
                    <td className="pt-1 text-right font-mono">
                      ${(quote.firstPaymentTotal / 11).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
              <span>
                Tax Invoice Reference: <strong>PB-{(quote.containerSize + quote.originPostcode.postcode).toUpperCase()}</strong> · All prices in AUD including GST
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print / Save Itemised Tax Invoice</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Price Match Guarantee Card with Check Out Competitors Prices */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-[#0b2942] text-white px-2 py-0.5 rounded-full">
            PRICE MATCH GUARANTEE
          </span>
          <h4 className="text-base font-extrabold text-[#0b2942] mt-1.5">
            Seen it cheaper? We'll beat it.
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Provide any comparable written quote from another Australian container service and we guarantee a lower rate per cubic meter.
          </p>
        </div>

        {/* Check out our competitors prices container */}
        <details className="group border border-slate-200 rounded-xl bg-white p-4 transition-all">
          <summary className="flex items-center justify-between cursor-pointer list-none select-none text-xs font-bold text-[#0b2942] hover:text-[#00c0f3] transition-colors">
            <span className="flex items-center gap-2 text-[#00c0f3]">
              <TrendingDown className="w-4 h-4 shrink-0" />
              <span className="text-[#0b2942] font-black">Check out our competitors prices</span>
            </span>
            <ChevronDown className="w-4 h-4 text-[#00c0f3] group-open:rotate-180 transition-transform shrink-0" />
          </summary>

          <div className="pt-3 mt-3 border-t border-slate-100 space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed text-xs">
              {comp.benchmark.competitorName} standardise on small modular {comp.benchmark.containerVolumeM3} m³ containers with a ${comp.competitorDeliveryFeePerUnit} delivery fee per leg and higher cubic rates (${comp.benchmark.monthlyStorageRatePerM3}/m³). Portabox provides full-size container capacity with horizontal level-lift delivery — zero tilting, fewer containers, and substantially lower overall costs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* 1. Monthly Storage Rate Comparison */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  1. Monthly Storage Rate ({totalVolumeM3} m³)
                </span>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-600">{comp.benchmark.competitorName} ({competitorSmallContainersCount} x {comp.benchmark.containerVolumeM3} m³ @ ${comp.benchmark.monthlyStorageRatePerM3}/m³):</span>
                  <span className="font-mono font-bold text-slate-700">${marketMonthlyCost}/mo</span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-900 font-semibold">Portabox ({totalVolumeM3} m³ · ${portaboxRatePerM3}/m³):</span>
                  <span className="font-mono font-bold text-[#00c0f3]">${quote.monthlyStorageFee}/mo</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-700 font-bold">
                  {monthlyCubicSavings > 0
                    ? `✓ Save $${monthlyCubicSavings}/mo on storage (${cubicSavingsPercent}% lower rate)`
                    : `✓ Guaranteed lowest cubic rate with Price Match Guarantee`}
                </div>
              </div>

              {/* 2. Excess Delivery Charges for Multiple Smaller Containers */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  2. Excess Container Delivery Fees
                </span>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-600">{competitorSmallContainersCount} x modular containers (${comp.competitorDeliveryFeePerUnit} delivery fee each):</span>
                  <span className="font-mono font-bold text-slate-700">${competitorDeliveryCost}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-900 font-semibold">{quote.containerCount} x Portabox (${quote.domesticLegFeePerContainer} level-lift delivery):</span>
                  <span className="font-mono font-bold text-[#00c0f3]">${portaboxDeliveryCost}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-700 font-bold">
                  ✓ Save ${excessDeliveryCharges} in excess delivery fees avoided
                </div>
              </div>
            </div>

            {/* Combined Savings Total */}
            <div className="p-3.5 rounded-xl bg-emerald-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  First-Month Combined Savings
                </span>
                <span className="text-[11px] text-emerald-100">
                  Storage rate saving (${monthlyCubicSavings}) + excess delivery fees avoided (${excessDeliveryCharges})
                </span>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-2xl font-black font-mono">
                  ${firstMonthTotalSavings}
                </span>
                <div className="text-[10px] text-emerald-100 font-bold">
                  Total First-Month Advantage
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 gap-1 pt-1">
              <span>
                Benchmark: {comp.benchmark.competitorName} (${comp.competitorDeliveryFeePerUnit}/box delivery & ${comp.benchmark.monthlyStorageRatePerM3}/m³ storage).
              </span>
              <span className="font-mono font-semibold text-slate-500">
                Audit: {comp.benchmark.lastCheckedDate} · {comp.benchmark.status}
              </span>
            </div>
          </div>
        </details>
      </div>

      {/* Traditional Physical Self-Storage Comparison (Kennards, Storage King vs. Portabox Depot Storage) */}
      <TraditionalStorageComparison variant="full" className="mt-6" />
        </>
      )}

      {/* Promo Code Input - Removed and NOT displayed once user has paid */}
      {!hasPaid ? (
        <div className="mt-6 space-y-2">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => {
                  setPromoCodeInput(e.target.value.toUpperCase());
                  if (promoFeedback) setPromoFeedback(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyPromo();
                  }
                }}
                placeholder="Have a promo code? (e.g. FREEDEL, HALFPRICE, SAVE50)"
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 uppercase bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#15385E] hover:bg-[#112F4F] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Apply Code
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Codes marked exclusive apply as your sole discount (replacing duration discounts). Non-exclusive codes can stack with standard duration savings.
          </p>

          {promoFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
                promoFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <span>{promoFeedback.message}</span>
              {promoFeedback.type === 'success' && quote.totalDiscount > 0 && (
                <span className="font-mono font-black text-emerald-700 shrink-0">
                  -${quote.totalDiscount}
                </span>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Driveway Placement & 100% Fit Guarantee Confidence Card (Feature-flagged) */}
      {Boolean(config?.enableDrivewayFitGuarantee) && (
        <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-sky-50 to-white border-2 border-emerald-300 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-[#15385E]">
                    Site Placement &amp; 100% Fit Guarantee Active
                  </h4>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded">
                    Zero Risk Guarantee
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Horizontal level-lift delivery requires only <strong>3.5m overhead clearance</strong> (safely under tree branches &amp; wires).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero Paver Scratches</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60 text-[11px] text-slate-700">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Free poly paver &amp; concrete ground pads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Council street reflectors &amp; safety plaques</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Free container size swap if space is tight</span>
            </div>
          </div>
        </div>
      )}

      {/* Live "Zero-Anxiety" Delivery Day Experience Preview Accordion */}
      <div className="mt-4 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-xs print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#15385E] text-[#F7D347] flex items-center justify-center font-black shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#15385E]">
                  Preview Your Delivery Day Experience
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-sky-100 text-[#15385E] px-2 py-0.5 rounded">
                  Live Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                See exactly how our level-lift driver will stage, transport, and place your container on delivery day.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
            {config?.enableGoogleCalendarLink && (
              <a
                href={generateGoogleCalendarUrl({
                  deliveryDate: quote.preferredDate,
                  slot: effectiveSlot,
                  suburb: quote.originPostcode.suburb,
                  state: quote.originPostcode.state,
                  postcode: quote.originPostcode.postcode,
                  containerName: quote.containerName,
                  containerCount: quote.containerCount,
                  serviceType: quote.serviceType,
                  metroHub: hub,
                  customerName: customerData?.firstName,
                  customerPhone: customerData?.mobile,
                  accessNotes: quote.summaryText,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100/90 text-[#15385E] font-bold text-xs rounded-xl border border-sky-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Add this delivery slot directly to your Google Calendar"
              >
                <Calendar className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Open in Google Calendar</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowDeliveryTrackerPreview(!showDeliveryTrackerPreview)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#15385E] font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>{showDeliveryTrackerPreview ? 'Hide Dispatch Tracker' : 'View Live Delivery Day Tracker'}</span>
            </button>
          </div>
        </div>

        {showDeliveryTrackerPreview && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in duration-200">
            <DeliveryMilestoneTracker
              orderNumber="PBO-QUOTE-READY"
              containerId={`${quote.containerName.replace(/\s+/g, '-').toUpperCase()}-01`}
              destinationAddress={`${quote.originPostcode.suburb} ${quote.originPostcode.state} ${quote.originPostcode.postcode}`}
              scheduledDate={quote.preferredDate}
              deliveryWindow={quote.selectedSlot?.label || '9:00 AM – 11:30 AM (Morning Window)'}
              phone={phone}
            />
          </div>
        )}
      </div>

      {/* Braintree Hosted Fields & PayPal / Digital Wallets 'Pay Now' Section */}
      <div className="print:hidden">
        <BraintreePaymentSection
          amount={quote.firstPaymentTotal}
          customerName={customerData?.firstName ? `${customerData.firstName}` : undefined}
          customerEmail={customerData?.email}
          customerPhone={customerData?.mobile}
          orderDescription={`${quote.containerName} delivery to ${quote.originPostcode.suburb} ${quote.originPostcode.state}`}
          billingCycleLabel={quote.billingCycle.replace(/_/g, ' ')}
          onPaymentSuccess={(result) => {
            setIsBooked(true);
            setHasPaid(true);
            if (onPaymentSuccess) {
              onPaymentSuccess(result);
            }
            if (onGoToNextSteps) {
              onGoToNextSteps();
            }
          }}
        />
      </div>

      {/* Booking Next Steps & Call to Action */}
      <div className="mt-8 p-6 bg-slate-50 border border-slate-200/80 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="text-base font-extrabold text-[#0b2942]">Prefer to book over the phone?</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your quote is saved. Speak with our local dispatch team or message us for immediate assistance.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="px-5 py-3 rounded-2xl bg-white border border-[#DAD7D1] hover:border-slate-300 text-[#15385E] font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Phone className="w-4 h-4 text-[#5CC1EF]" />
            <span>Call {phone}</span>
          </a>

          {!isBooked ? (
            <>
              {onOpenBookingModal && (
                <button
                  type="button"
                  onClick={onOpenBookingModal}
                  className="px-6 py-3 rounded-2xl bg-[#15385E] hover:bg-[#112F4F] text-[#F7D347] font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#F7D347]" />
                  <span>Book Now</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsBooked(true);
                  if (onPaymentSuccess) {
                    onPaymentSuccess({
                      success: true,
                      transactionId: 'RESERVE-' + Date.now(),
                      status: 'authorized',
                      paymentMethod: 'Reserve (Pay on Delivery)',
                      paymentMethodType: 'eft_zepto',
                      amount: 0,
                      currency: 'AUD',
                      settledAt: new Date().toISOString(),
                    });
                  }
                  if (onGoToNextSteps) {
                    onGoToNextSteps();
                  }
                }}
                className="px-6 py-3 rounded-2xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] border-2 border-[#e6c338] font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4 text-[#1A1A1A] stroke-[3]" />
                <span>Reserve Without Paying Now</span>
              </button>
            </>
          ) : (
            onGoToNextSteps && (
              <button
                type="button"
                onClick={onGoToNextSteps}
                className="px-6 py-3 rounded-2xl bg-[#15385E] hover:bg-[#0f2844] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Go to Next Steps Page</span>
                <ArrowRight className="w-4 h-4 text-[#F7D347]" />
              </button>
            )
          )}
        </div>
      </div>

      {isBooked && (
        <div className="mt-4 p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in print:hidden">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 stroke-[2.5]" />
            <div>
              <p className="font-bold text-sm text-emerald-950">Thank you! Your container reservation has been confirmed.</p>
              <p className="text-emerald-800 text-xs mt-0.5">Our {quote.originDepot.name} team has logged your allocation.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!calendarEventLink && (
              <button
                type="button"
                onClick={handleInitiateCalendarBooking}
                className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Add to Calendar</span>
              </button>
            )}
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
        </div>
      )}

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
          customerName={customerData ? customerData.firstName : undefined}
          customerMobile={customerData?.mobile}
          suburbOrPostcode={quote.originPostcode ? `${quote.originPostcode.postcode} ${quote.originPostcode.suburb}` : undefined}
        />
      </div>
    </div>
  );
};
