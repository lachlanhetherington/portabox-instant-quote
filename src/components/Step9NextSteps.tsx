import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Truck,
  ShieldCheck,
  Package,
  Download,
  Share2,
  Phone,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  FileText,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { QuoteBreakdown } from '../types/quote';
import { CustomerLifecycleRoadmap } from './CustomerLifecycleRoadmap';
import { DeliveryMilestoneTracker } from './DeliveryMilestoneTracker';
import {
  signInWithGoogleCalendar,
  getCalendarAccessToken,
  scheduleDeliveryOnGoogleCalendar,
  STANDARD_DELIVERY_SLOTS,
} from '../services/googleCalendarService';
import { getMetroHubForPostcode } from '../services/pricingEngine';

export interface Step9NextStepsProps {
  quote: QuoteBreakdown;
  customerData?: {
    firstName: string;
    mobile: string;
    email: string;
    agreedToContact: boolean;
  } | null;
  paymentResult?: {
    transactionId?: string;
    amount?: number;
    paymentMethod?: string;
  } | null;
  onOpenPlacementChecker?: () => void;
  onOpenCustomerPortal?: () => void;
  onBackToQuote?: () => void;
  onResetQuote?: () => void;
  phone?: string;
}

export const Step9NextSteps: React.FC<Step9NextStepsProps> = ({
  quote,
  customerData,
  paymentResult,
  onOpenPlacementChecker,
  onOpenCustomerPortal,
  onBackToQuote,
  onResetQuote,
  phone = '1800 467 637',
}) => {
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isSchedulingCalendar, setIsSchedulingCalendar] = useState(false);
  const [calendarEventLink, setCalendarEventLink] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [hasCopiedRef, setHasCopiedRef] = useState(false);

  // Fallback transaction reference
  const bookingReference =
    paymentResult?.transactionId ||
    `PBO-${quote.originPostcode.postcode}-${Math.floor(100000 + Math.random() * 900000)}`;

  const hub = getMetroHubForPostcode(quote.originPostcode);
  const effectiveSlot = quote.selectedSlot || {
    ...STANDARD_DELIVERY_SLOTS[0],
    available: true,
    slotsRemaining: 2,
  };

  const handleCopyReference = () => {
    navigator.clipboard.writeText(bookingReference);
    setHasCopiedRef(true);
    setTimeout(() => setHasCopiedRef(false), 2000);
  };

  const handleInitiateCalendarBooking = async () => {
    const token = getCalendarAccessToken();
    if (!token) {
      try {
        await signInWithGoogleCalendar();
      } catch (err: any) {
        setCalendarError('Please connect your Google account to add delivery to your calendar.');
        return;
      }
    }
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
        setIsCalendarModalOpen(false);
      } else {
        setCalendarError(result.error || 'Failed to create calendar appointment.');
      }
    } catch (err: any) {
      setCalendarError(err.message || 'Error communicating with Google Calendar.');
    } finally {
      setIsSchedulingCalendar(false);
    }
  };

  return (
    <div className="next-steps-container space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Breadcrumb & Status Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                Booking Confirmed
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono font-bold text-slate-600">
                Ref: {bookingReference}
              </span>
              <button
                type="button"
                onClick={handleCopyReference}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer underline ml-1"
              >
                {hasCopiedRef ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirmation sent to{' '}
              <strong className="text-slate-700">{customerData?.email || 'your email'}</strong> and{' '}
              <strong className="text-slate-700">{customerData?.mobile || 'SMS'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onBackToQuote && (
            <button
              type="button"
              onClick={onBackToQuote}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Review Invoice</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#15385E] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 print:hidden"
          >
            <Download className="w-3.5 h-3.5 text-[#15385E]" />
            <span>Save Receipt (PDF)</span>
          </button>
        </div>
      </div>

      {/* Hero Congratulations Banner */}
      <div className="bg-linear-to-r from-[#15385E] to-[#1e4e82] text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Truck className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold text-[#F7D347] border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deposit Received · Fleet Allocated</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            You're all set{customerData?.firstName ? `, ${customerData.firstName}` : ''}!
          </h1>

          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
            Your <strong className="text-white font-bold">{quote.containerCount}x {quote.containerName}</strong> is reserved at our <strong className="text-white">{quote.originDepot.name}</strong> hub. Our precision level-lift vehicle is scheduled for delivery on:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
              <span className="text-[11px] uppercase font-bold text-slate-300 block">Delivery Date</span>
              <span className="text-sm sm:text-base font-black text-white">{quote.preferredDate}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
              <span className="text-[11px] uppercase font-bold text-slate-300 block">Arrival Window</span>
              <span className="text-sm sm:text-base font-black text-[#F7D347]">{effectiveSlot.label}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
              <span className="text-[11px] uppercase font-bold text-slate-300 block">Rate Protection</span>
              <span className="text-sm sm:text-base font-black text-emerald-300">12-Mo Rate Freeze</span>
            </div>
          </div>
        </div>
      </div>

      {/* THE CUSTOMER LIFECYCLE ROADMAP (Moved here per user request) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-[#DAD7D1]">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#15385E] bg-[#5CC1EF]/15 border border-[#5CC1EF]/30 px-3 py-1 rounded-md">
              YOUR JOURNEY ROADMAP
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Stage 2 Complete · Preparing Stage 3
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#15385E] mt-2">
            What Happens Next
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Follow along every milestone from today's reservation through driveway placement, packing, and safe storage in our temperature-moderated depot.
          </p>
        </div>

        {/* CustomerLifecycleRoadmap rendered with stage 2/3 active */}
        <CustomerLifecycleRoadmap
          currentStage={2}
          quote={quote}
          onOpenPlacementChecker={onOpenPlacementChecker}
          onOpenCustomerPortal={onOpenCustomerPortal}
          phone={phone}
          variant="portal_dashboard"
        />
      </div>

      {/* Immediate Next Step: Driveway & Site Preparation Card */}
      <div className="bg-amber-50/60 rounded-3xl p-6 sm:p-8 border-2 border-amber-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
              <span>Immediate Customer Action: Driveway Clearance</span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-[#15385E]">
              Preparing Your Drop-Off Site For Delivery Day
            </h3>

            <p className="text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed">
              Our level-lift delivery vehicle places your container horizontally flat without tilting your goods. To ensure seamless arrival, please check these 3 simple items:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white rounded-2xl p-3.5 border border-amber-200 space-y-1">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  1. Gate & Path Clearance
                </span>
                <p className="text-[11px] text-slate-600">
                  Ensure minimum <strong>3.5 metres</strong> width clearance through gates and driveways.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-amber-200 space-y-1">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  2. Overhead Clearance
                </span>
                <p className="text-[11px] text-slate-600">
                  Check for low branches, overhead wires, or carport eaves below <strong>4.5 metres</strong>.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-3.5 border border-amber-200 space-y-1">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  3. Paver Protection Included
                </span>
                <p className="text-[11px] text-slate-600">
                  Driver brings complimentary high-density ground pads so pavers and concrete never get scratched.
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-2 self-start md:self-center">
            {onOpenPlacementChecker && (
              <button
                type="button"
                onClick={onOpenPlacementChecker}
                className="px-5 py-3 rounded-2xl bg-[#15385E] hover:bg-[#0f2844] text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4 text-[#F7D347]" />
                <span>Driveway Fit Checker</span>
              </button>
            )}
            <span className="text-[11px] text-center text-slate-500">
              100% Fit & Surface Guarantee
            </span>
          </div>
        </div>
      </div>

      {/* Live "Zero-Anxiety" Level-Lift Delivery Milestone Tracker */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border-2 border-[#DAD7D1] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                LIVE DISPATCH STATUS
              </span>
            </div>
            <h3 className="text-lg font-black text-[#15385E] mt-1">
              Level-Lift Delivery Day Tracking
            </h3>
            <p className="text-xs text-slate-500">
              Real-time telemetry and arrival notifications for {quote.preferredDate}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!calendarEventLink ? (
              <button
                type="button"
                onClick={handleInitiateCalendarBooking}
                className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#00c0f3] border border-sky-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-[#00c0f3]" />
                <span>Add to Google Calendar</span>
              </button>
            ) : (
              <a
                href={calendarEventLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>Added to Calendar</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            )}
          </div>
        </div>

        <DeliveryMilestoneTracker
          orderNumber={bookingReference}
          containerId={`${quote.containerName.replace(/\s+/g, '-').toUpperCase()}-01`}
          destinationAddress={`${quote.originPostcode.suburb} ${quote.originPostcode.state} ${quote.originPostcode.postcode}`}
          scheduledDate={quote.preferredDate}
          deliveryWindow={effectiveSlot.label}
          phone={phone}
        />
      </div>

      {/* Customer Portal & Post-Booking Resource Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Portal Access */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#15385E] bg-slate-100 px-2.5 py-0.5 rounded-md">
              CUSTOMER SELF-SERVICE
            </span>
            <h4 className="text-base font-black text-[#15385E]">
              Access Your Customer Portal
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track your container lifecycle, manage redelivery or warehouse pickup, view all paid tax invoices, and refer friends for $50 account credits.
            </p>
          </div>

          <div className="pt-2">
            {onOpenCustomerPortal && (
              <button
                type="button"
                onClick={onOpenCustomerPortal}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#15385E] hover:bg-[#0f2844] text-white font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Launch Customer Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Local Depot Hotline */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#15385E] bg-slate-100 px-2.5 py-0.5 rounded-md">
              LOCAL DISPATCH HUB
            </span>
            <h4 className="text-base font-black text-[#15385E]">
              {quote.originDepot.name} Local Team
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Have specific placement notes (e.g. left side of driveway, facing inward)? Call our local dispatch team anytime.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="px-5 py-2.5 rounded-xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] border-2 border-[#e6c338] font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Phone className="w-4 h-4 text-[#1A1A1A]" />
              <span>Call Dispatch: {phone}</span>
            </a>
            {onResetQuote && (
              <button
                type="button"
                onClick={onResetQuote}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Quote</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Confirmation Modal */}
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
                <span className="font-bold text-[#00c0f3]">{effectiveSlot.label}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Container Details:</span>
                <span className="font-bold text-[#0b2942]">{quote.containerCount}x {quote.containerName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Delivery Suburb:</span>
                <span className="font-bold text-[#0b2942]">{quote.originPostcode.suburb}, {quote.originPostcode.state}</span>
              </div>
            </div>

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
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
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
                    <span>Scheduling...</span>
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
    </div>
  );
};
