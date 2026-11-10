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
  Sunrise,
  Sun,
  Sunset,
  Sprout,
  CalendarCheck,
  Info,
  Compass,
  Layers,
  Home,
  Warehouse,
} from 'lucide-react';
import { QuoteBreakdown, DeliverySlotWindow, DepotCalendarConfig } from '../types/quote';
import { CustomerLifecycleRoadmap } from './CustomerLifecycleRoadmap';
import { DeliveryMilestoneTracker } from './DeliveryMilestoneTracker';
import {
  signInWithGoogleCalendar,
  getCalendarAccessToken,
  scheduleDeliveryOnGoogleCalendar,
  STANDARD_DELIVERY_SLOTS,
} from '../services/googleCalendarService';
import { getMetroHubForPostcode } from '../services/pricingEngine';
import {
  loadCustomerAccounts,
  saveCustomerAccounts,
} from '../services/customerPortalService';
import { syncCustomerPortalActionToSmartsheet } from '../services/smartsheetService';

export interface Step9NextStepsProps {
  quote: QuoteBreakdown;
  customerData?: {
    firstName: string;
    companyName?: string;
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
  onSelectSlot?: (slot: DeliverySlotWindow) => void;
  onSelectDate?: (date: string) => void;
  depotCalendarConfig?: DepotCalendarConfig;
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
  onSelectSlot,
  onSelectDate,
  depotCalendarConfig,
  phone = '1800 467 637',
}) => {
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isSchedulingCalendar, setIsSchedulingCalendar] = useState(false);
  const [calendarEventLink, setCalendarEventLink] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [hasCopiedRef, setHasCopiedRef] = useState(false);

  // Helper date utilities
  const formatIsoDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr + 'T00:00:00');
      return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const getOffsetIso = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString().split('T')[0];
  };

  const initialIso = () => {
    if (quote.preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(quote.preferredDate)) {
      return quote.preferredDate;
    }
    return getOffsetIso(3);
  };

  const [deliveryDateIso, setDeliveryDateIso] = useState<string>(initialIso);
  const [deliveryDateFormatted, setDeliveryDateFormatted] = useState<string>(() => {
    if (quote.preferredDate && quote.preferredDate !== 'Wed 14 Oct 2026') {
      return quote.preferredDate;
    }
    return formatIsoDate(getOffsetIso(3));
  });

  const [selectedSlotState, setSelectedSlotState] = useState<DeliverySlotWindow>(() => {
    return quote.selectedSlot || {
      id: 'morning',
      label: 'Morning Window',
      timeRange: '8:00 AM – 10:30 AM',
      startHour: 8,
      startMinute: 0,
      endHour: 10,
      endMinute: 30,
      available: true,
      slotsRemaining: 3,
    };
  });

  const [slotConfirmedNotice, setSlotConfirmedNotice] = useState<string | null>(null);

  // Available 2.5-hour Portabox windows
  const availableSlots: (DeliverySlotWindow & { icon: string; description: string; badge: string })[] = [
    {
      id: 'morning',
      label: 'Morning Window',
      timeRange: '8:00 AM – 10:30 AM',
      startHour: 8,
      startMinute: 0,
      endHour: 10,
      endMinute: 30,
      available: true,
      slotsRemaining: 3,
      icon: '🌅',
      description: 'Priority morning delivery — ideal for full-day loading',
      badge: 'Most Popular',
    },
    {
      id: 'midday',
      label: 'Midday Window',
      timeRange: '11:00 AM – 1:30 PM',
      startHour: 11,
      startMinute: 0,
      endHour: 13,
      endMinute: 30,
      available: true,
      slotsRemaining: 4,
      icon: '☀️',
      description: 'Midday delivery window with live telemetry updates',
      badge: 'Available',
    },
    {
      id: 'afternoon',
      label: 'Afternoon Window',
      timeRange: '2:00 PM – 4:30 PM',
      startHour: 14,
      startMinute: 0,
      endHour: 16,
      endMinute: 30,
      available: true,
      slotsRemaining: 2,
      icon: '🌇',
      description: 'Afternoon placement before evening hours',
      badge: 'Available',
    },
    {
      id: 'eco_cluster',
      label: 'Eco-Optimized Window',
      timeRange: 'Flexible Route (Avoids ~26 kg CO₂)',
      startHour: 9,
      startMinute: 0,
      endHour: 15,
      endMinute: 0,
      available: true,
      slotsRemaining: 5,
      icon: '🌱',
      description: 'Clusters with nearby runs to cut fuel transit emissions',
      badge: 'Green Route Priority',
    },
  ];

  const handleSelectSlot = (slot: DeliverySlotWindow) => {
    setSelectedSlotState(slot);
    if (onSelectSlot) onSelectSlot(slot);
    setSlotConfirmedNotice(`Locked in: ${slot.label} (${slot.timeRange}) on ${deliveryDateFormatted}`);
    // Sync to active customer accounts
    try {
      const accounts = loadCustomerAccounts();
      const email = customerData?.email?.toLowerCase().trim();
      const acc = accounts.find((a) => a.email.toLowerCase() === email);
      if (acc && acc.orders.length > 0) {
        acc.orders[0].deliveryWindow = slot.label;
        saveCustomerAccounts(accounts);
        syncCustomerPortalActionToSmartsheet({
          customerId: acc.id,
          customerName: `${acc.firstName} ${acc.lastName || ''}`.trim(),
          orderNumber: acc.orders[0].orderNumber,
          actionType: 'booking_updated',
          details: `Delivery window updated to ${slot.label} (${slot.timeRange})`,
        });
      }
    } catch (e) {
      console.warn('Could not sync slot to portal accounts:', e);
    }
  };

  const handleDateChange = (isoDate: string) => {
    setDeliveryDateIso(isoDate);
    const formatted = formatIsoDate(isoDate);
    setDeliveryDateFormatted(formatted);
    if (onSelectDate) onSelectDate(formatted);
    setSlotConfirmedNotice(`Locked in: ${selectedSlotState.label} on ${formatted}`);
    // Sync to active customer accounts
    try {
      const accounts = loadCustomerAccounts();
      const email = customerData?.email?.toLowerCase().trim();
      const acc = accounts.find((a) => a.email.toLowerCase() === email);
      if (acc && acc.orders.length > 0) {
        acc.orders[0].scheduledDeliveryDate = isoDate;
        saveCustomerAccounts(accounts);
        syncCustomerPortalActionToSmartsheet({
          customerId: acc.id,
          customerName: `${acc.firstName} ${acc.lastName || ''}`.trim(),
          orderNumber: acc.orders[0].orderNumber,
          actionType: 'booking_updated',
          details: `Delivery date updated to ${formatted}`,
        });
      }
    } catch (e) {
      console.warn('Could not sync date to portal accounts:', e);
    }
  };

  const handlePresetDays = (days: number) => {
    const iso = getOffsetIso(days);
    handleDateChange(iso);
  };

  // Placement Information State
  const initialAddress = () => {
    return `${quote.originPostcode.suburb}, ${quote.originPostcode.state} ${quote.originPostcode.postcode}`;
  };

  const initialDestAddress = () => {
    if (quote.destinationPostcode) {
      return `${quote.destinationPostcode.suburb}, ${quote.destinationPostcode.state} ${quote.destinationPostcode.postcode}`;
    }
    return '';
  };

  const [deliveryAddress, setDeliveryAddress] = useState<string>(initialAddress);
  const [destDeliveryAddress, setDestDeliveryAddress] = useState<string>(initialDestAddress);
  const [surfaceType, setSurfaceType] = useState<string>('Concrete Driveway');
  const [doorOrientation, setDoorOrientation] = useState<'house' | 'street' | 'discretion'>('house');
  const [clearanceWidth, setClearanceWidth] = useState<boolean>(true);
  const [clearanceHeight, setClearanceHeight] = useState<boolean>(true);
  const [clearanceLength, setClearanceLength] = useState<boolean>(true);
  const [placementNotes, setPlacementNotes] = useState<string>('');
  const [placementSavedNotice, setPlacementSavedNotice] = useState<string | null>(null);

  const handleSavePlacement = (updated?: {
    address?: string;
    destAddress?: string;
    surface?: string;
    door?: 'house' | 'street' | 'discretion';
    notes?: string;
    width?: boolean;
    height?: boolean;
    length?: boolean;
  }) => {
    const targetAddress = updated?.address ?? deliveryAddress;
    const targetSurface = updated?.surface ?? surfaceType;
    const targetDoor = updated?.door ?? doorOrientation;
    const targetNotes = updated?.notes ?? placementNotes;
    const targetWidth = updated?.width ?? clearanceWidth;
    const targetHeight = updated?.height ?? clearanceHeight;

    const doorLabel =
      targetDoor === 'house'
        ? 'Doors Facing House / Property'
        : targetDoor === 'street'
        ? 'Doors Facing Street / Road'
        : 'Driver Discretion';

    setPlacementSavedNotice('✓ Placement instructions confirmed and synced with fleet dispatch.');

    // Sync to active customer account
    try {
      const accounts = loadCustomerAccounts();
      const email = customerData?.email?.toLowerCase().trim();
      const acc = accounts.find((a) => a.email.toLowerCase() === email);
      if (acc && acc.orders.length > 0) {
        const order = acc.orders[0];
        order.originAddress = targetAddress;
        order.placementSurface = targetSurface as any;
        order.doorOrientation = doorLabel as any;
        order.accessNotes = targetNotes;
        order.accessGateWidth = targetWidth ? 'Wide Open (>3.5m)' : 'Standard (3.0m - 3.5m)';
        order.overheadClearanceClear = targetHeight;
        saveCustomerAccounts(accounts);

        syncCustomerPortalActionToSmartsheet({
          customerId: acc.id,
          customerName: `${acc.firstName} ${acc.lastName || ''}`.trim(),
          orderNumber: order.orderNumber,
          actionType: 'access_notes_updated',
          details: `Placement: ${targetSurface}, ${doorLabel}. Address: ${targetAddress}. Notes: ${targetNotes || 'Standard placement'}`,
        });
      }
    } catch (e) {
      console.warn('Could not sync placement to customer accounts:', e);
    }
  };

  // Fallback transaction reference
  const bookingReference =
    paymentResult?.transactionId ||
    `PBO-${quote.originPostcode.postcode}-${Math.floor(100000 + Math.random() * 900000)}`;

  const hub = getMetroHubForPostcode(quote.originPostcode);

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
        deliveryDateStr: deliveryDateFormatted,
        slot: selectedSlotState,
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
              <span>Review Quotation</span>
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
              <span className="text-sm sm:text-base font-black text-white">{deliveryDateFormatted}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
              <span className="text-[11px] uppercase font-bold text-slate-300 block">Arrival Window</span>
              <span className="text-sm sm:text-base font-black text-[#F7D347]">{selectedSlotState.label}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15">
              <span className="text-[11px] uppercase font-bold text-slate-300 block">Rate Protection</span>
              <span className="text-sm sm:text-base font-black text-emerald-300">1-Year Booking Price Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE NEXT STEP: SELECT DELIVERY DATE & ARRIVAL WINDOW */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-[#15385E]/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#15385E] text-[#F7D347] flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
              1
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-[#15385E] bg-[#5CC1EF]/20 border border-[#5CC1EF]/40 px-2.5 py-0.5 rounded-md">
                  CORE NEXT STEP
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Select Delivery Window
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#15385E] mt-1">
                Select Your Delivery Date &amp; Arrival Window
              </h2>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Servicing Facility: <strong className="text-slate-800">{quote.originDepot.name}</strong>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Now that your quotation has been generated, select the exact drop-off day and 2.5-hour arrival window for our precision level-lift vehicle to deliver your empty container to your driveway.
        </p>

        {/* Section A: Preferred Drop-Off Date */}
        <div className="space-y-2.5 pt-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
            A. Preferred Drop-Off Date
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePresetDays(2)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                deliveryDateIso === getOffsetIso(2)
                  ? 'bg-[#15385E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              Earliest Available (+2 Days)
            </button>
            <button
              type="button"
              onClick={() => handlePresetDays(4)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                deliveryDateIso === getOffsetIso(4)
                  ? 'bg-[#15385E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              +4 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetDays(7)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                deliveryDateIso === getOffsetIso(7)
                  ? 'bg-[#15385E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              +1 Week
            </button>
            <button
              type="button"
              onClick={() => handlePresetDays(14)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                deliveryDateIso === getOffsetIso(14)
                  ? 'bg-[#15385E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              +2 Weeks
            </button>

            {/* Custom Date Input */}
            <div className="relative inline-flex items-center">
              <input
                type="date"
                min={getOffsetIso(1)}
                value={deliveryDateIso}
                onChange={(e) => handleDateChange(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl border-2 border-slate-300 hover:border-slate-400 focus:border-[#00c0f3] text-xs font-bold text-[#15385E] bg-white cursor-pointer transition-colors shadow-2xs"
              />
              <Calendar className="w-4 h-4 text-slate-500 absolute left-2.5 pointer-events-none" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Selected Date: <strong className="text-[#15385E]">{deliveryDateFormatted}</strong> (Operating Monday – Saturday)
          </p>
        </div>

        {/* Section B: Delivery Window Cards */}
        <div className="space-y-2.5 pt-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
            B. Select Arrival Window
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableSlots.map((slot) => {
              const isSelected = selectedSlotState.id === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSelectSlot(slot)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-[#00c0f3] bg-sky-50/70 shadow-sm ring-2 ring-[#00c0f3]/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {slot.badge}
                      </span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-[#00c0f3] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{slot.icon}</span>
                      <h3 className="text-sm font-black text-[#15385E]">
                        {slot.label}
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-[#00a9d7] font-mono mt-1">
                      {slot.timeRange}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {slot.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      {slot.id === 'eco_cluster' ? 'Green Route' : 'Fleet Slot'}
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${
                      slot.id === 'eco_cluster'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isSelected
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {slot.slotsRemaining} slots left
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section C: Live Schedule Confirmation & Actions */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Confirmed Delivery Schedule
              </p>
              <p className="text-sm font-black text-[#15385E]">
                {selectedSlotState.label} ({selectedSlotState.timeRange}) on {deliveryDateFormatted}
              </p>
              <p className="text-[11px] text-slate-500">
                Driver Dave Higgins (#03) will send live SMS telemetry 30 minutes prior to arrival.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!calendarEventLink ? (
              <button
                type="button"
                onClick={handleInitiateCalendarBooking}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-[#15385E] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Add to Google Calendar</span>
              </button>
            ) : (
              <a
                href={calendarEventLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>View Google Calendar Event</span>
              </a>
            )}
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

      {/* MILESTONE 2: CONTAINER PLACEMENT & DRIVEWAY ACCESS DETAILS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-[#15385E]/30 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#15385E] text-[#F7D347] flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
              2
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-[#15385E] bg-[#5CC1EF]/20 border border-[#5CC1EF]/40 px-2.5 py-0.5 rounded-md">
                  CORE NEXT STEP
                </span>
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Placement Information
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#15385E] mt-1">
                Confirm Drop-Off Location &amp; Driveway Placement
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenPlacementChecker && (
              <button
                type="button"
                onClick={onOpenPlacementChecker}
                className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Launch Driveway Fit Checker</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Provide your exact street delivery address, surface type, and preferred container door orientation so our driver Dave Higgins (#03) places your container in the safest, most accessible spot.
        </p>

        {/* Section A: Street Delivery Address(es) or Depot Self-Service */}
        {quote.requiredAddressesCount === 0 ? (
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200">
            <div className="flex items-start gap-3">
              <Warehouse className="w-5 h-5 text-[#15385E] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#15385E]">
                  Self-Service Loading & Unloading at Portabox Location
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  You have selected self-loading and self-unloading directly at our Portabox Location. No home delivery address is required.
                </p>
                <div className="mt-2 text-xs font-semibold text-slate-800">
                  Portabox Depot: {quote.originDepot.name} · {quote.originDepot.address}, {quote.originDepot.suburb} {quote.originDepot.postcode}
                </div>
              </div>
            </div>
          </div>
        ) : quote.requiredAddressesCount === 2 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>A1. Origin Loading Address (Initial Container Drop-Off)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    handleSavePlacement({ address: e.target.value });
                  }}
                  placeholder="e.g. 14 Kensington Road, Norwood SA 5067"
                  className="w-full pl-4 pr-10 py-3 rounded-2xl border-2 border-slate-300 focus:border-[#00c0f3] focus:ring-2 focus:ring-[#00c0f3]/20 text-xs sm:text-sm font-bold text-[#15385E] bg-white transition-all shadow-2xs"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Origin Depot: {quote.originDepot.name}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#15385E]" />
                <span>A2. Destination Unloading Address (Final Container Delivery)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={destDeliveryAddress}
                  onChange={(e) => {
                    setDestDeliveryAddress(e.target.value);
                    handleSavePlacement({ destAddress: e.target.value });
                  }}
                  placeholder="e.g. 88 King William Street, Adelaide SA 5000"
                  className="w-full pl-4 pr-10 py-3 rounded-2xl border-2 border-slate-300 focus:border-[#15385E] focus:ring-2 focus:ring-[#15385E]/20 text-xs sm:text-sm font-bold text-[#15385E] bg-white transition-all shadow-2xs"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-sky-800 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Destination: {quote.destinationPostcode?.suburb || 'New Address'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>A. Exact Delivery / Placement Address</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => {
                  setDeliveryAddress(e.target.value);
                  handleSavePlacement({ address: e.target.value });
                }}
                placeholder="e.g. 14 Kensington Road, Norwood SA 5067"
                className="w-full pl-4 pr-10 py-3 rounded-2xl border-2 border-slate-300 focus:border-[#00c0f3] focus:ring-2 focus:ring-[#00c0f3]/20 text-xs sm:text-sm font-bold text-[#15385E] bg-white transition-all shadow-2xs"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Serviced Depot: {quote.originDepot.name}
              </div>
            </div>
          </div>
        )}

        {/* Section B & C: Surface Type & Door Orientation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Surface Type */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>B. Driveway / Placement Ground Surface</span>
            </label>
            <select
              value={surfaceType}
              onChange={(e) => {
                const val = e.target.value;
                setSurfaceType(val);
                handleSavePlacement({ surface: val });
              }}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 focus:border-[#00c0f3] text-xs font-bold text-[#15385E] bg-white cursor-pointer shadow-2xs"
            >
              <option value="Concrete Driveway">Concrete Driveway (Standard Level Placement)</option>
              <option value="Paved Asphalt">Paved Asphalt / Bitumen</option>
              <option value="Pavers / Bricks">Pavers / Bricks (Driver supplies protective rubber pads)</option>
              <option value="Grass / Lawn">Grass / Lawn (Firm dry turf)</option>
              <option value="Gravel / Crushed Rock">Gravel / Crushed Rock Driveway</option>
              <option value="Roadside / Nature Strip">Roadside / Nature Strip (Permit check advised)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              * Driver carries complimentary heavy-duty rubber pads so driveways and decorative pavers are never scratched.
            </p>
          </div>

          {/* Door Orientation */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>C. Container Door Orientation</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDoorOrientation('house');
                  handleSavePlacement({ door: 'house' });
                }}
                className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  doorOrientation === 'house'
                    ? 'border-[#00c0f3] bg-sky-50 text-[#15385E] font-black shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-base mb-0.5">🏡</div>
                <div className="text-[11px] font-bold leading-tight">Facing House</div>
                <span className="text-[9px] text-slate-500">Direct loading</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDoorOrientation('street');
                  handleSavePlacement({ door: 'street' });
                }}
                className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  doorOrientation === 'street'
                    ? 'border-[#00c0f3] bg-sky-50 text-[#15385E] font-black shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-base mb-0.5">🛣️</div>
                <div className="text-[11px] font-bold leading-tight">Facing Street</div>
                <span className="text-[9px] text-slate-500">Road access</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDoorOrientation('discretion');
                  handleSavePlacement({ door: 'discretion' });
                }}
                className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  doorOrientation === 'discretion'
                    ? 'border-[#00c0f3] bg-sky-50 text-[#15385E] font-black shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="text-base mb-0.5">🚛</div>
                <div className="text-[11px] font-bold leading-tight">Driver Choice</div>
                <span className="text-[9px] text-slate-500">Safest level</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Orientation: <strong>{doorOrientation === 'house' ? 'Doors Facing House / Property' : doorOrientation === 'street' ? 'Doors Facing Street / Driveway Entry' : 'Driver Discretion for Best Slope'}</strong>
            </p>
          </div>
        </div>

        {/* Section D: Clearances Checklist */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
            D. Driveway Clearance Confirmations
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !clearanceWidth;
                setClearanceWidth(next);
                handleSavePlacement({ width: next });
              }}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                clearanceWidth ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                clearanceWidth ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'
              }`}>
                {clearanceWidth && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="text-xs">
                <span className="font-black text-[#15385E] block">Width Clearance (≥ 3.5m)</span>
                <span className="text-[11px] text-slate-500">Gate and driveway width</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !clearanceHeight;
                setClearanceHeight(next);
                handleSavePlacement({ height: next });
              }}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                clearanceHeight ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                clearanceHeight ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'
              }`}>
                {clearanceHeight && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="text-xs">
                <span className="font-black text-[#15385E] block">Height Clearance (≥ 4.5m)</span>
                <span className="text-[11px] text-slate-500">Clear of low eaves &amp; wires</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !clearanceLength;
                setClearanceLength(next);
                handleSavePlacement({ length: next });
              }}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                clearanceLength ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                clearanceLength ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'
              }`}>
                {clearanceLength && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="text-xs">
                <span className="font-black text-[#15385E] block">Truck Run Length (≥ 10m)</span>
                <span className="text-[11px] text-slate-500">Horizontal level-lift space</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section E: Placement Notes & Special Instructions */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
            E. Specific Driver Placement Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={placementNotes}
            onChange={(e) => {
              setPlacementNotes(e.target.value);
              handleSavePlacement({ notes: e.target.value });
            }}
            placeholder="e.g. Please place on the left side of driveway next to the garage. Leave 1 metre clearance for the side gate path. Call mobile when 10 mins away."
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-300 focus:border-[#00c0f3] focus:ring-2 focus:ring-[#00c0f3]/20 text-xs font-medium text-[#15385E] bg-white transition-all shadow-2xs placeholder:text-slate-400"
          />
        </div>

        {/* Section F: Live Status Banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-emerald-950">
              Placement Confirmed: {surfaceType} · {doorOrientation === 'house' ? 'Doors Facing House' : doorOrientation === 'street' ? 'Doors Facing Street' : 'Driver Discretion'} at {deliveryAddress}
            </span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md shrink-0">
            Synced with Driver #03 Dispatch Sheet
          </span>
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
              Real-time telemetry and arrival notifications for {deliveryDateFormatted} ({selectedSlotState.timeRange}).
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
          destinationAddress={deliveryAddress}
          scheduledDate={deliveryDateFormatted}
          deliveryWindow={selectedSlotState.label}
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
                <span className="font-bold text-[#0b2942]">{deliveryDateFormatted}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Arrival Window:</span>
                <span className="font-bold text-[#00c0f3]">{selectedSlotState.label} ({selectedSlotState.timeRange})</span>
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
