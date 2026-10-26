import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Package,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  Check,
  Sparkles,
  CalendarDays,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { PostcodeRecord } from '../data/australianPostcodes';
import { AppConfig, ContainerSizeId, DeliverySlotWindow } from '../types/quote';
import {
  calculateBlanketPrice,
  calculateBoxPrice,
  getMetroHubForPostcode,
} from '../services/pricingEngine';
import {
  findNextAvailableDeliveryWindow,
  generateGoogleCalendarUrl,
} from '../services/deliveryCalendarService';
import { AreYouStuckBanner } from './AreYouStuckBanner';
import { DeliverySlotPicker } from './DeliverySlotPicker';
import { DrivewayPlacementCheckerModal } from './DrivewayPlacementCheckerModal';

interface Step5DeliveryAndSuppliesProps {
  originPostcode: PostcodeRecord;
  containerSize?: ContainerSizeId;
  containerCount?: number;
  preferredDate: string;
  onSelectDate: (date: string) => void;
  selectedSlot?: DeliverySlotWindow;
  onSelectSlot?: (slot: DeliverySlotWindow) => void;
  boxesCount: number;
  onUpdateBoxesCount: (count: number) => void;
  blanketsCount: number;
  onUpdateBlanketsCount: (count: number) => void;
  config: AppConfig;
  onContinue: () => void;
  onBack: () => void;
}

export const Step5DeliveryAndSupplies: React.FC<Step5DeliveryAndSuppliesProps> = ({
  originPostcode,
  containerSize = 'large_25m3',
  containerCount = 1,
  preferredDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
  boxesCount,
  onUpdateBoxesCount,
  blanketsCount,
  onUpdateBlanketsCount,
  config,
  onContinue,
  onBack,
}) => {
  const metroHub = getMetroHubForPostcode(originPostcode);
  const depotCalendar = config.depotCalendars?.[metroHub];

  // Compute default date (3 days ahead)
  const today = new Date();
  const defaultDateObj = new Date(today);
  defaultDateObj.setDate(today.getDate() + 3);
  const formattedDefault = defaultDateObj.toISOString().split('T')[0];

  const [dateInputValue, setDateInputValue] = useState(formattedDefault);
  const [placementArea, setPlacementArea] = useState<'driveway' | 'carport' | 'street' | 'lawn'>('driveway');
  const [placementSurface, setPlacementSurface] = useState<string>('concrete');
  const [doorOrientation, setDoorOrientation] = useState<string>('doors_facing_street');
  const [overheadConfirmed, setOverheadConfirmed] = useState<boolean>(true);
  const [driverAccessNotes, setDriverAccessNotes] = useState<string>('');
  const [isPlacementCheckerOpen, setIsPlacementCheckerOpen] = useState<boolean>(false);
  const [quickScheduleToast, setQuickScheduleToast] = useState<string | null>(null);

  // Compute the next available compliant delivery window (48h cutoff, skipping Sundays and blackout days)
  const nextAvailable = useMemo(() => {
    return findNextAvailableDeliveryWindow({
      originHub: metroHub,
      depotCalendarConfig: depotCalendar,
    });
  }, [metroHub, depotCalendar]);

  const handleDateChange = (val: string) => {
    setDateInputValue(val);
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      onSelectDate(formatted);
    }
  };

  const handleFindNextAvailableWindow = () => {
    handleDateChange(nextAvailable.isoDate);
    if (onSelectSlot) {
      onSelectSlot(nextAvailable.recommendedSlot);
    }
    setQuickScheduleToast(
      `✓ Selected earliest available window: ${nextAvailable.formattedDate} · ${nextAvailable.recommendedSlot.label} (${nextAvailable.explanation})`
    );
    setTimeout(() => setQuickScheduleToast(null), 5000);
  };

  // Direct Google Calendar event URL for checking schedule & saving the slot
  const googleCalUrl = useMemo(() => {
    return generateGoogleCalendarUrl({
      deliveryDate: preferredDate || dateInputValue,
      slot: selectedSlot || nextAvailable.recommendedSlot,
      suburb: originPostcode.suburb,
      state: originPostcode.state,
      postcode: originPostcode.postcode,
      containerName:
        containerSize === 'small_10m3'
          ? 'Small Portabox (10 m³)'
          : containerSize === 'medium_19m3'
          ? 'Medium Portabox (19 m³)'
          : 'Large Portabox (25 m³)',
      containerCount,
      metroHub,
      accessNotes: driverAccessNotes,
    });
  }, [
    preferredDate,
    dateInputValue,
    selectedSlot,
    nextAvailable,
    originPostcode,
    containerSize,
    containerCount,
    metroHub,
    driverAccessNotes,
  ]);

  const currentBoxPrice = calculateBoxPrice(boxesCount, config.packingSupplies);
  const currentBlanketPrice = calculateBlanketPrice(blanketsCount, config.packingSupplies);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      {/* Header kicker: #F7D347 Vibrant Gold with #1A1A1A text */}
      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
        STEP 6 OF 8 · SCHEDULE &amp; PLACEMENT
      </span>

      <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mt-1 mb-2">
        Schedule &amp; Placement
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-2xl">
        Pick your preferred delivery date, delivery time window, and placement instructions. Packing supplies and insurance protection are configured in the next step!
      </p>

      {/* Section 1: Schedule Your Container Flow */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-6">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-[#15385E] tracking-tight">
            1. Schedule Container Delivery
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Easy and simple booking in two quick steps:
          </p>
        </div>

        {/* Step 1: Pick a date */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs sm:text-sm font-black text-[#15385E] uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#5CC1EF] text-[#15385E] text-xs flex items-center justify-center font-bold">1</span>
              <span>Pick a delivery date</span>
            </label>

            {/* Next Available Window Quick Action */}
            <button
              type="button"
              onClick={handleFindNextAvailableWindow}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#15385E] to-[#1c4777] text-white hover:from-[#1c4777] hover:to-[#245892] text-xs font-bold transition-all shadow-xs border border-[#15385E] cursor-pointer group active:scale-98 w-fit"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F7D347] group-hover:rotate-12 transition-transform" />
              <span>Find Next Available Window</span>
              <span className="text-[10px] text-amber-300 font-mono font-semibold bg-white/10 px-2 py-0.5 rounded-md">
                Earliest: {nextAvailable.formattedDate}
              </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5CC1EF]">
                <Calendar className="w-5 h-5" />
              </div>
              <input
                type="date"
                value={dateInputValue}
                min={formattedDefault}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#5CC1EF] focus:ring-4 focus:ring-[#5CC1EF]/20 bg-white text-sm font-bold text-[#15385E] transition-all shadow-xs"
              />
            </div>

            {/* Direct Google Calendar Availability Link (controlled by Admin Option: enableGoogleCalendarLink) */}
            {config.enableGoogleCalendarLink && (
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-white hover:bg-sky-50/50 text-[#15385E] border-2 border-slate-200 hover:border-[#5CC1EF] text-xs font-bold transition-all shadow-xs w-fit active:scale-98"
                title="Open Google Calendar to check availability and view this delivery slot"
              >
                <CalendarDays className="w-4 h-4 text-[#5CC1EF]" />
                <span>Open Google Calendar Availability</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
          </div>

          {/* Toast / confirmation banner when next window is picked */}
          {quickScheduleToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{quickScheduleToast}</span>
            </div>
          )}
        </div>

        {/* Step 2: Pick a delivery time window */}
        <div className="space-y-2 pt-3 border-t border-slate-200/70">
          <label className="block text-xs sm:text-sm font-black text-[#15385E] uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#5CC1EF] text-[#15385E] text-xs flex items-center justify-center font-bold">2</span>
            <span>Pick a delivery time window</span>
          </label>

          {/* Delivery Window Slot Picker */}
          <DeliverySlotPicker
            metroHub={metroHub}
            preferredDate={preferredDate}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => {
              if (onSelectSlot) onSelectSlot(slot);
            }}
            depotCalendarConfig={depotCalendar}
          />
        </div>
      </div>

      {/* Section 2: Driveway Placement & Ground Protection */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-[#15385E] tracking-tight">
              2. Driveway Placement &amp; Ground Protection
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify where our driver should place your container for easiest access.
            </p>
          </div>

          {config.enableDrivewayFitGuarantee && (
            <button
              type="button"
              onClick={() => setIsPlacementCheckerOpen(true)}
              className="text-xs font-black text-[#15385E] hover:text-[#5CC1EF] flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-[#5CC1EF]" />
              <span className="underline">Will it fit? Open Placement Guide</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Placement Area */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Container Location
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'driveway', label: 'Driveway' },
                { id: 'carport', label: 'Carport' },
                { id: 'street', label: 'Curbside Street' },
                { id: 'lawn', label: 'Front Lawn' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPlacementArea(item.id as any)}
                  className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    placementArea === item.id
                      ? 'bg-[#15385E] text-white border-[#15385E] shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Surface Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Driveway Surface
            </label>
            <select
              value={placementSurface}
              onChange={(e) => setPlacementSurface(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold text-[#15385E] focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
            >
              <option value="concrete">Concrete (Protective Pads Included)</option>
              <option value="exposed_aggregate">Exposed Aggregate (Soft-Touch Pads)</option>
              <option value="pavers">Paved Brick / Tile (Zero-Scratch)</option>
              <option value="bitumen">Bitumen / Asphalt</option>
              <option value="lawn">Grass / Lawn (Heavy Timber Dunnage)</option>
            </select>
            <span className="text-[10px] text-emerald-700 font-bold block mt-1">
              ✓ Free poly ground protection pads placed under container corners
            </span>
          </div>
        </div>

        {/* Door Orientation & Overhead Clearance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Container Door Direction
            </label>
            <select
              value={doorOrientation}
              onChange={(e) => setDoorOrientation(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
            >
              <option value="doors_facing_street">Doors Facing Street / Road</option>
              <option value="doors_facing_house">Doors Facing House / Garage</option>
              <option value="driver_discretion">Driver Discretion (Best Safe Access)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Overhead Tree &amp; Wire Clearance
            </label>
            <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overheadConfirmed}
                onChange={(e) => setOverheadConfirmed(e.target.checked)}
                className="w-4 h-4 text-[#15385E] rounded accent-[#15385E]"
              />
              <span className="text-xs text-[#15385E] font-bold">
                I confirm 3.5m overhead clearance
              </span>
            </label>
          </div>
        </div>

        {/* Optional Driver Note */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Special Driver Instructions (Optional)
          </label>
          <input
            type="text"
            value={driverAccessNotes}
            onChange={(e) => setDriverAccessNotes(e.target.value)}
            placeholder="e.g. Place on left side of driveway facing garage; gate code is 2841"
            className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
          />
        </div>
      </div>

      {/* Next Step Preview Card */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-50 to-blue-50/50 border-2 border-sky-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#5CC1EF] text-[#15385E] px-2.5 py-0.5 rounded-full font-mono">
              COMING UP NEXT · STEP 6
            </span>
            <h4 className="text-base sm:text-lg font-black text-[#15385E]">
              Packing Supplies &amp; Insurance Protection (CPO)
            </h4>
            <p className="text-xs text-slate-600 max-w-xl">
              Next, claim your <strong>first 10 FREE moving blankets</strong> per container, choose optional heavy-duty disc padlocks, moving boxes, and select Container Protection Option (CPO) cover.
            </p>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="px-5 py-2.5 rounded-xl bg-white border border-sky-300 text-xs font-black text-[#15385E] hover:bg-sky-100 transition-colors shadow-2xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Review Supplies &amp; Insurance →
          </button>
        </div>
      </div>

      {/* Are You Stuck Banner */}
      <div className="mt-8">
        <AreYouStuckBanner />
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* CTA Continue Button: #F7D347 Vibrant Gold with #1A1A1A text */}
        <button
          onClick={onContinue}
          className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
        </button>
      </div>

      {/* Driveway Placement & Site Feasibility Modal (Feature-flagged) */}
      {config.enableDrivewayFitGuarantee && (
        <DrivewayPlacementCheckerModal
          isOpen={isPlacementCheckerOpen}
          onClose={() => setIsPlacementCheckerOpen(false)}
          selectedContainerSize={containerSize}
          suburbName={originPostcode?.suburb}
          stateCode={originPostcode?.state}
          onConfirmPlacement={(prefs) => {
            setPlacementArea(prefs.locationType === 'street_curbside' ? 'street' : prefs.locationType === 'carport' ? 'carport' : prefs.locationType === 'lawn_front_yard' ? 'lawn' : 'driveway');
            setPlacementSurface(prefs.groundSurface);
            if (prefs.notes) setDriverAccessNotes(prefs.notes);
          }}
        />
      )}
    </div>
  );
};
