import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, Pencil, ChevronDown, TrendingDown, ShieldCheck, Truck, Calendar, ExternalLink } from 'lucide-react';
import { PostcodeRecord } from '../data/australianPostcodes';
import { BillingCycle, ContainerSizeId, DeliverySlotWindow, LogisticsMethod, MetroHub, ServiceType, StorageDuration } from '../types/quote';
import { calculateCompetitorComparison } from '../services/competitorPricingService';
import { generateGoogleCalendarUrl } from '../services/deliveryCalendarService';

interface RightSidebarProps {
  currentStep: number;
  onJumpToStep: (step: number) => void;
  originPostcode: PostcodeRecord | null;
  destinationPostcode?: PostcodeRecord | null;
  movingDistanceKm?: number | null;
  movingKmCharge?: number;
  fuelSurchargeAmount?: number;
  serviceType: ServiceType;
  storagePlacement?: 'my_place' | 'facility';
  originLogisticsMethod?: LogisticsMethod;
  destinationLogisticsMethod?: LogisticsMethod;
  legsSavedCount?: number;
  legsSavedDollarTotal?: number;
  containerSize: ContainerSizeId;
  containerCount?: number;
  containerSelections?: Record<ContainerSizeId, number>;
  totalVolumeM3?: number;
  storageDuration: StorageDuration;
  preferredDate: string;
  selectedSlot?: DeliverySlotWindow;
  metroHubName?: string;
  billingCycle?: BillingCycle;
  boxesCount?: number;
  blanketsCount?: number;
  locksCount?: number;
  insuranceSelected?: boolean;
  insuranceMonthlyFee?: number;
  deliveryFeePerContainer?: number;
  deliveryZone?: string | number;
  deliveryZoneRangeLabel?: string;
  interstateFeePerContainer?: number;
  monthlyStorageFee?: number;
  enableDrivewayFitGuarantee?: boolean;
  enableGoogleCalendarLink?: boolean;
  onOpenPlacementChecker?: () => void;
  onBookNow?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  currentStep,
  onJumpToStep,
  originPostcode,
  destinationPostcode,
  movingDistanceKm,
  movingKmCharge,
  fuelSurchargeAmount,
  serviceType,
  storagePlacement = 'my_place',
  originLogisticsMethod = 'home_delivery',
  destinationLogisticsMethod = 'home_delivery',
  legsSavedCount = 0,
  legsSavedDollarTotal = 0,
  containerSize,
  containerCount = 1,
  containerSelections,
  totalVolumeM3: propTotalVolumeM3,
  storageDuration,
  preferredDate,
  selectedSlot,
  metroHubName = 'Adelaide',
  billingCycle = 'monthly',
  boxesCount = 0,
  blanketsCount = 0,
  locksCount = 0,
  insuranceSelected = true,
  insuranceMonthlyFee,
  deliveryFeePerContainer = 149,
  deliveryZone = 'A',
  deliveryZoneRangeLabel = '< 25 km',
  interstateFeePerContainer,
  monthlyStorageFee,
  enableDrivewayFitGuarantee = false,
  enableGoogleCalendarLink = false,
  onOpenPlacementChecker,
  onBookNow,
}) => {
  const getServiceLabel = () => {
    if (serviceType === 'storage_at_place') return 'Storage, at my place';
    if (serviceType === 'storage_facility') return 'Storage, at Portabox facility';
    if (serviceType === 'moving') {
      if (destinationPostcode) {
        return `Moving to ${destinationPostcode.suburb} ${movingDistanceKm ? `(${movingDistanceKm} km)` : ''}`;
      }
      return 'Moving door to door';
    }
    if (serviceType === 'moving_storage') {
      if (destinationPostcode) {
        return `Move & store: ${originPostcode?.suburb} → ${destinationPostcode.suburb}`;
      }
      return 'Moving and storage';
    }
    return 'Moving and storage';
  };

  const isMyPlaceStorage =
    serviceType === 'storage_at_place' ||
    (serviceType !== 'moving' && serviceType !== 'moving_storage' && storagePlacement === 'my_place');

  // Competitor benchmarking consistent with Page 6 (Modular container competitor benchmark: $99 delivery fee each, 8 m³ capacity):
  const selSmall = containerSelections?.small_10m3 || 0;
  const selMed = containerSelections?.medium_19m3 || 0;
  const selLrg = (containerSelections?.large_25m3 || 0) + ((containerSelections?.two_large_50m3 || 0) * 2);
  const hasSelections = (selSmall + selMed + selLrg) > 0;

  const totalVolumeM3 = propTotalVolumeM3 || (
    hasSelections
      ? (selSmall * 10) + (selMed * 19) + (selLrg * 25)
      : (containerSize === 'small_10m3' ? 10 : containerSize === 'medium_19m3' ? 19 : 25) * containerCount
  );

  const estimatedMonthlyStorage = monthlyStorageFee || (
    hasSelections
      ? (selSmall * 209) + (selMed * 219) + (selLrg * 219)
      : (containerSize === 'small_10m3' ? 209 * containerCount : 219 * containerCount)
  );
  const portaboxDeliveryCost = containerCount * deliveryFeePerContainer;

  const getSizeLabel = () => {
    if (containerSelections) {
      const s = containerSelections.small_10m3 || 0;
      const m = containerSelections.medium_19m3 || 0;
      const l = (containerSelections.large_25m3 || 0) + ((containerSelections.two_large_50m3 || 0) * 2);
      const activeCount = (s > 0 ? 1 : 0) + (m > 0 ? 1 : 0) + (l > 0 ? 1 : 0);
      if (activeCount > 1) {
        const parts: string[] = [];
        if (s > 0) parts.push(`${s}x 10m³ Small`);
        if (m > 0) parts.push(`${m}x 19m³ Medium`);
        if (l > 0) parts.push(`${l}x 25m³ Large`);
        return `${parts.join(' + ')} (${totalVolumeM3} m³)`;
      }
    }
    switch (containerSize) {
      case 'small_10m3':
        return containerCount > 1 ? `${containerCount} x Small (${containerCount * 10} m³)` : '1 x Small (10 m³)';
      case 'medium_19m3':
        return containerCount > 1 ? `${containerCount} x Medium (${containerCount * 19} m³)` : '1 x Medium (19 m³)';
      case 'large_25m3':
        return containerCount > 1 ? `${containerCount} x Large (${containerCount * 25} m³)` : '1 x Large (25 m³)';
      case 'two_large_50m3':
        return '2 x Large (50 m³ · 2 units)';
      default:
        return '1 x Large (25 m³)';
    }
  };

  const getDurationLabel = () => {
    let dur = storageDuration.replace(/_/g, ' ');
    if (storageDuration === '2_weeks') dur = '2 weeks';
    if (storageDuration === '1_to_3_months') dur = '1 to 3 months';
    if (storageDuration === '4_to_11_months') dur = '4 to 11 months';
    if (storageDuration === '12_plus_months') dur = '12+ months';

    let cycle = 'Monthly billing';
    if (billingCycle === 'weekly') cycle = 'Weekly billing';
    else if (billingCycle === '3_months_upfront') cycle = '3 mo upfront billing';
    else if (billingCycle === '6_months_upfront') cycle = '6 mo upfront billing';
    else if (billingCycle === '12_months_upfront') cycle = '12 mo upfront billing';

    return `${dur} · ${cycle}`;
  };

  const [, setCompetitorRefresh] = useState(0);
  useEffect(() => {
    const handleRatesUpdate = () => {
      setCompetitorRefresh((prev) => prev + 1);
    };
    window.addEventListener('portabox:competitor-rates-updated', handleRatesUpdate);
    return () => window.removeEventListener('portabox:competitor-rates-updated', handleRatesUpdate);
  }, []);

  const comp = calculateCompetitorComparison({
    totalVolumeM3,
    portaboxContainerCount: containerCount,
    portaboxDeliveryCost,
    portaboxMonthlyStorageFee: estimatedMonthlyStorage,
  });

  const competitorSmallContainersCount = comp.competitorSmallContainersCount;
  const competitorDeliveryCost = comp.competitorDeliveryCost; // $99 * count
  const excessDeliveryCharges = comp.excessDeliveryCharges;
  const monthlyCubicSavings = comp.monthlyStorageSavings;
  const cubicSavingsPercent = comp.storageSavingsPercent;
  const marketMonthlyCost = comp.marketMonthlyCost;
  const portaboxRatePerM3 = comp.portaboxRatePerM3;
  const firstMonthTotalSavings = comp.firstMonthTotalSavings;

  return (
    <div className="w-full space-y-4">
      {/* Tracker Card */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">
          {currentStep === 6 ? 'YOUR DETAILS' : 'YOUR QUOTE SO FAR'}
        </h3>

        <div className="space-y-3">
          {/* Step 1: Where */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 1
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStep > 1 && originPostcode ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 1 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    1
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 1 ? 'text-[#15385E]' : 'text-slate-700'}`}>
                  Where
                </span>
              </div>
              {currentStep > 1 && originPostcode && (
                <button
                  onClick={() => onJumpToStep(1)}
                  aria-label="Edit location"
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
            {currentStep > 1 && originPostcode && (
              <div className="mt-1.5 ml-7.5 space-y-1">
                {(serviceType === 'moving' || serviceType === 'moving_storage') ? (
                  <>
                    <div className="text-xs text-slate-700 font-medium flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">From:</span>
                      <span>{originPostcode.suburb}, {originPostcode.state} {originPostcode.postcode}</span>
                      <span className="text-[10px] font-bold text-[#15385E] bg-sky-50 px-1.5 py-0.5 rounded border border-[#5CC1EF]/40">
                        Zone {deliveryZone} ({deliveryZoneRangeLabel} one-way) · ${deliveryFeePerContainer} delivery
                      </span>
                    </div>

                    <div className="text-xs font-medium pt-0.5">
                      {destinationPostcode ? (
                        <div className="space-y-0.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#15385E]">Moving to:</span>
                            <span className="font-bold text-[#15385E]">
                              {destinationPostcode.suburb}, {destinationPostcode.state} {destinationPostcode.postcode}
                            </span>
                          </div>
                          {movingDistanceKm !== undefined && movingDistanceKm !== null && (
                            <div className="text-[11px] text-slate-500 font-medium pl-0.5 space-y-0.5">
                              {interstateFeePerContainer !== undefined && interstateFeePerContainer > 0 && (
                                <div className="text-[#15385E] font-bold text-[10px]">
                                  Interstate freight: <span className="font-mono text-[#15385E]">${interstateFeePerContainer}/container</span>
                                </div>
                              )}
                              {movingKmCharge !== undefined && movingKmCharge > 0 && (
                                <div className="text-[#15385E] font-bold text-[10px]">
                                  +${movingKmCharge} extra delivery charge {containerCount > 1 ? `(${containerCount} containers)` : ''}
                                </div>
                              )}
                              {fuelSurchargeAmount !== undefined && fuelSurchargeAmount > 0 && (
                                <div className="text-[#15385E] font-bold text-[10px]">
                                  +${fuelSurchargeAmount} fuel levy (initial leg · future legs deferred)
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">Moving to:</span>
                          <span>Select in Step 2</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 font-medium">
                      {originPostcode.suburb}, {originPostcode.state} {originPostcode.postcode}
                    </p>
                    <span className="inline-block text-[10px] font-bold text-[#15385E] bg-sky-50 px-2 py-0.5 rounded border border-[#5CC1EF]/40">
                      Zone {deliveryZone} ({deliveryZoneRangeLabel} one-way) · ${deliveryFeePerContainer} delivery fee
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: What do you need */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 2
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStep > 2 ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 2 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    2
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 2 ? 'text-[#15385E]' : 'text-slate-700'}`}>
                  What do you need
                </span>
              </div>
              {currentStep > 2 && (
                <button
                  onClick={() => onJumpToStep(2)}
                  aria-label="Edit service type"
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
            {currentStep > 2 && (
              <p className="mt-1 ml-7.5 text-xs text-slate-600 font-medium">{getServiceLabel()}</p>
            )}
          </div>

          {/* Step 3: Loading options */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 3
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {(isMyPlaceStorage ? currentStep >= 4 : currentStep > 3) ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 3 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    3
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 3 ? 'text-[#15385E]' : 'text-slate-700'}`}>
                  {isMyPlaceStorage ? 'Driveway delivery & collection' : 'Loading options'}
                </span>
              </div>
              {(isMyPlaceStorage ? currentStep >= 4 : currentStep > 3) && (
                <button
                  onClick={() => onJumpToStep(isMyPlaceStorage ? 2 : 3)}
                  aria-label={isMyPlaceStorage ? 'Edit storage placement' : 'Edit loading options'}
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
            {(isMyPlaceStorage ? currentStep >= 4 : currentStep > 3) && (
              <div className="mt-1 ml-7.5 space-y-1">
                <p className="text-xs text-slate-600 font-medium">
                  {isMyPlaceStorage ? (
                    'Delivered to your driveway & collected when done'
                  ) : (
                    <>
                      {originLogisticsMethod === 'depot_loading' ? 'Self-load at Our Location' : 'Home Delivery'}
                      {(serviceType === 'moving' || serviceType === 'moving_storage' || serviceType === 'storage_facility') && (
                        <span> → {destinationLogisticsMethod === 'depot_loading' ? 'Self-unload at Our Location' : 'Home Delivery'}</span>
                      )}
                    </>
                  )}
                </p>
                {!isMyPlaceStorage && (legsSavedDollarTotal > 0 || legsSavedCount > 0) && (
                  <span className="inline-block text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    ${legsSavedDollarTotal || (legsSavedCount === 4 ? 300 : 150)} saved
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Step 4: Which size */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 4
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStep > 4 ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 4 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    4
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 4 ? 'text-[#15385E]' : 'text-slate-700'}`}>
                  Which size
                </span>
              </div>
              {currentStep > 4 && (
                <button
                  onClick={() => onJumpToStep(4)}
                  aria-label="Edit container size"
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
            {currentStep > 4 && (
              <p className="mt-1 ml-7.5 text-xs text-slate-600 font-medium">{getSizeLabel()}</p>
            )}
          </div>

          {/* Step 5: Duration & Billing */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 5
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStep > 5 ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 5 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    5
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 5 ? 'text-[#15385E]' : 'text-slate-700'}`}>
                  Duration &amp; Billing
                </span>
              </div>
              {currentStep > 5 && (
                <button
                  onClick={() => onJumpToStep(5)}
                  aria-label="Edit duration and billing"
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
            {currentStep > 5 && (
              <div className="mt-1 ml-7.5 space-y-0.5">
                <p className="text-xs text-slate-600 font-medium">{getDurationLabel()}</p>
              </div>
            )}
          </div>

          {/* Step 6: Schedule & Placement */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 6
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStep > 6 ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 6 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    6
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 6 ? 'text-[#15385E]' : 'text-slate-700'}`}>
                  Schedule &amp; Placement
                </span>
              </div>
              {currentStep > 6 && (
                <button
                  onClick={() => onJumpToStep(6)}
                  aria-label="Edit schedule and placement"
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
            {currentStep >= 6 && preferredDate && (
              <div className="mt-1 ml-7.5 space-y-1">
                <p className="text-xs text-slate-600 font-medium">Delivery: {preferredDate}</p>
                {selectedSlot && (
                  <p className="text-[11px] text-[#15385E] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5CC1EF]" />
                    <span>Slot: {selectedSlot.label} ({selectedSlot.timeRange})</span>
                  </p>
                )}
                {enableGoogleCalendarLink && (
                  <a
                    href={generateGoogleCalendarUrl({
                      deliveryDate: preferredDate,
                      slot: selectedSlot,
                      suburb: originPostcode?.suburb,
                      state: originPostcode?.state,
                      postcode: originPostcode?.postcode,
                      metroHub: (metroHubName as MetroHub) || 'Adelaide',
                      containerCount,
                      serviceType,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15385E] hover:text-[#00c0f3] bg-sky-50 hover:bg-sky-100/80 px-2 py-1 rounded-lg border border-sky-200 transition-colors mt-0.5 cursor-pointer"
                    title="Open this delivery slot directly in Google Calendar"
                  >
                    <Calendar className="w-3 h-3 text-[#00c0f3]" />
                    <span>Google Calendar Slot</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Step 7: Supplies & Insurance */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 7
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStep > 7 ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 7 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    7
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 7 ? 'text-[#15385E]' : 'text-slate-700'}`}>
                  Supplies &amp; Insurance
                </span>
              </div>
              {currentStep > 7 && (
                <button
                  onClick={() => onJumpToStep(7)}
                  aria-label="Edit packing supplies and insurance"
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
            {currentStep > 7 && (
              <div className="mt-1 ml-7.5 space-y-0.5 text-[11px] text-[#15385E]">
                <p className="font-semibold">
                  Insurance: {insuranceSelected ? 'CPO Protected' : 'Not added'}
                </p>
                {(blanketsCount > 0 || boxesCount > 0 || locksCount > 0) && (
                  <p className="text-slate-600 font-medium">
                    Supplies: {[
                      blanketsCount > 0 ? `${blanketsCount} blankets` : null,
                      locksCount > 0 ? `${locksCount} lock${locksCount > 1 ? 's' : ''}` : null,
                      boxesCount > 0 ? `${boxesCount} boxes` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Step 8: Send Quote */}
          <div
            className={`p-3.5 rounded-xl transition-all border ${
              currentStep === 8
                ? 'border-[#F7D347] bg-[#F7D347]/15 ring-2 ring-[#F7D347]/50'
                : 'border-slate-100 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStep > 8 ? (
                  <div className="w-5 h-5 rounded-full bg-[#5CC1EF] flex items-center justify-center text-[#15385E]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black ${
                      currentStep === 8 ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    8
                  </div>
                )}
                <span className={`text-sm font-bold ${currentStep === 8 ? 'text-[#15385E]' : 'text-slate-600'}`}>
                  Send quote
                </span>
              </div>
              {currentStep > 8 && (
                <button
                  onClick={() => onJumpToStep(8)}
                  aria-label="Edit contact details"
                  className="text-slate-400 hover:text-[#15385E] transition-colors p-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#15385E]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price Match Guarantee Card with Container Photography Tones:
          - Roller Door Shadowed / Overlay: #112F4F
          - Container Exterior Panel / Trim: #DAD7D1
          - Headline Text: #FFFFFF
          - Price Match Button: #FFFFFF with #1A1A1A text
          - Displayed from Page 3 onwards (hidden on Page 1 and 2)
      */}
      {currentStep >= 4 && (
        <div className="rounded-2xl border-2 border-[#DAD7D1] bg-[#112F4F] p-4 sm:p-5 space-y-3 shadow-sm">
          <div>
            {/* Price Match Button: Pure White #FFFFFF background with #1A1A1A text */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-[#FFFFFF] text-[#1A1A1A] px-2.5 py-1 rounded-md shadow-2xs border border-white">
              <span className="w-2 h-2 rounded-full bg-[#F7D347]" />
              <span>PRICE MATCH GUARANTEE</span>
            </span>

            {/* Headline Text: Pure White #FFFFFF */}
            <h4 className="text-base font-black text-[#FFFFFF] mt-2">
              Seen it cheaper? We'll beat it.
            </h4>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
              Provide any comparable written quote from another Australian container service and we guarantee a lower rate per cubic meter.
            </p>
          </div>

          {/* Check out our competitors prices container */}
          <details open className="group border border-[#DAD7D1] rounded-xl bg-white p-3.5 transition-all">
            <summary className="flex items-center justify-between cursor-pointer list-none select-none text-xs font-bold text-[#15385E] hover:text-[#5CC1EF] transition-colors">
              <span className="flex items-center gap-2 text-[#15385E]">
                <TrendingDown className="w-4 h-4 shrink-0 text-[#15385E]" />
                <span className="text-[#15385E] font-black">Check out our competitors prices</span>
              </span>
              <ChevronDown className="w-4 h-4 text-[#15385E] group-open:rotate-180 transition-transform shrink-0" />
            </summary>

            <div className="pt-3 mt-3 border-t border-slate-100 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed text-xs">
                {comp.benchmark.competitorName} use small {comp.benchmark.containerVolumeM3} m³ boxes with a ${comp.competitorDeliveryFeePerUnit} delivery fee per leg and high ${comp.benchmark.monthlyStorageRatePerM3}/m³ storage fees. Portabox provides full-size container capacity with zero-tilt horizontal level-lift delivery, fewer boxes, and massive savings.
              </p>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {/* 1. Monthly Storage Rate Comparison */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    1. Monthly Storage Rate ({totalVolumeM3} m³)
                  </span>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-600">{comp.benchmark.competitorName} ({competitorSmallContainersCount} x {comp.benchmark.containerVolumeM3} m³ @ ${comp.benchmark.monthlyStorageRatePerM3}/m³):</span>
                    <span className="font-mono font-bold text-slate-700">${marketMonthlyCost}/mo</span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-900 font-semibold">Portabox ({totalVolumeM3} m³ · ${portaboxRatePerM3}/m³):</span>
                    <span className="font-mono font-bold text-[#15385E]">${estimatedMonthlyStorage}/mo</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-700 font-bold">
                    {monthlyCubicSavings > 0
                      ? `✓ Save $${monthlyCubicSavings}/mo on storage (${cubicSavingsPercent}% lower rate)`
                      : `✓ Guaranteed lowest cubic rate with Price Match Guarantee`}
                  </div>
                </div>

                {/* 2. Excess Delivery Charges for Multiple Smaller Containers */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    2. Excess Container Delivery Fees
                  </span>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-600">{competitorSmallContainersCount} x modular containers (${comp.competitorDeliveryFeePerUnit} fee each):</span>
                    <span className="font-mono font-bold text-slate-700">${competitorDeliveryCost}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-900 font-semibold">{containerCount} x Portabox (${deliveryFeePerContainer} level-lift):</span>
                    <span className="font-mono font-bold text-[#15385E]">${portaboxDeliveryCost}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 text-[11px] text-emerald-700 font-bold">
                    ✓ Save ${excessDeliveryCharges} in excess delivery fees avoided
                  </div>
                </div>
              </div>

              {/* Combined Savings Total */}
              <div className="p-3 rounded-xl bg-emerald-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
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
                    Total Advantage
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>Benchmark: ${comp.competitorDeliveryFeePerUnit}/fee · ${comp.benchmark.monthlyStorageRatePerM3}/m³</span>
                <span className="font-mono font-semibold">Audit: {comp.benchmark.lastCheckedDate}</span>
              </div>
            </div>
          </details>
        </div>
      )}

        {/* Driveway Placement & 100% Fit Guarantee Card (Feature-flagged) */}
        {enableDrivewayFitGuarantee && (
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-extrabold text-[#15385E]">100% Driveway Fit Guarantee</span>
              </div>
              {onOpenPlacementChecker && (
                <button
                  type="button"
                  onClick={onOpenPlacementChecker}
                  className="text-[11px] font-black text-[#15385E] hover:text-[#5CC1EF] underline cursor-pointer"
                >
                  Fit Guide
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Horizontal level-lift delivery needs only <strong>4.5m overhead clearance</strong> (safely under tree branches &amp; wires). We supply free protective paver pads, and swap container size if space is tight with zero fees.
            </p>
          </div>
        )}

        {/* 30-Day Guaranteed Rate Lock & 12-Month Freeze Card (Hidden on Page 1) */}
        {currentStep > 1 && (
          <div className="p-3.5 rounded-xl border border-sky-300 bg-sky-50/70 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#15385E]">
                <ShieldCheck className="w-4 h-4 text-[#00a9d7] shrink-0" />
                <span>30-Day Price-Lock Guarantee</span>
              </div>
              <span className="text-[10px] font-black uppercase text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                30 Days
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Quoted prices are locked for 30 days from quote date. Changes to quotes that effect pricing will result in updated pricing and a new 30 days lock period. This does not include date changes or other non pricing items.
            </p>
          </div>
        )}

        {/* Dedicated Fast 'Book Now' CTA if ready to lock in order */}
        {currentStep >= 3 && onBookNow && (
          <button
            type="button"
            onClick={onBookNow}
            className="w-full py-3 px-4 rounded-2xl bg-[#F7D347] hover:bg-[#eec939] text-[#15385E] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 text-[#15385E]" />
            <span>Ready to Book? Book Now</span>
          </button>
        )}
      </div>
  );
};
