import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  Plus,
  Minus,
  Sparkles,
  Layers,
  Truck,
  ShieldCheck,
  Info,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { PORTABOX_IMAGES } from '../assets/images';
import { PostcodeRecord } from '../data/australianPostcodes';
import { AppConfig, ContainerSizeId, ServiceType } from '../types/quote';
import {
  getInterstateRatesForRoute,
  getLocationPricingForHub,
  getMetroHubForPostcode,
} from '../services/pricingEngine';
import {
  SpaceCalculatorModal,
  calculateOptimalContainerMix,
  formatContainerMixLabel,
} from './SpaceCalculatorModal';
import { DrivewayPlacementCheckerModal } from './DrivewayPlacementCheckerModal';

interface Step3SizeProps {
  originPostcode?: PostcodeRecord | null;
  destinationPostcode?: PostcodeRecord | null;
  serviceType?: ServiceType;
  storagePlacement?: 'my_place' | 'facility';
  containerSelections: Record<ContainerSizeId, number>;
  onUpdateContainerSelections: (selections: Record<ContainerSizeId, number>) => void;
  config: AppConfig;
  onContinue: () => void;
  onBack: () => void;
}

interface ContainerDetail {
  id: ContainerSizeId;
  name: string;
  volumeM3: number;
  subtitle: string;
  idealFor: string;
  dimensions: string;
  image: string;
  highlightTag?: string;
}

const CONTAINER_DETAILS: ContainerDetail[] = [
  {
    id: 'small_10m3',
    name: 'Small Portabox',
    volumeM3: 10,
    subtitle: '10 m³ capacity',
    idealFor: '1 bedroom, home renovation, or decluttering',
    dimensions: '2.1m (L) × 2.1m (W) × 2.4m (H)',
    image: PORTABOX_IMAGES.smallContainer,
  },
  {
    id: 'medium_19m3',
    name: 'Medium Portabox',
    volumeM3: 19,
    subtitle: '19 m³ capacity',
    idealFor: '2 bedroom home',
    dimensions: '3.6m (L) × 2.4m (W) × 2.4m (H)',
    image: PORTABOX_IMAGES.mediumContainer,
  },
  {
    id: 'large_25m3',
    name: 'Large Portabox',
    volumeM3: 25,
    subtitle: '25 m³ capacity',
    idealFor: '3 bedroom home',
    dimensions: '4.8m (L) × 2.4m (W) × 2.4m (H)',
    image: PORTABOX_IMAGES.largeContainer,
  },
];

export const Step3Size: React.FC<Step3SizeProps> = ({
  originPostcode,
  destinationPostcode,
  serviceType,
  storagePlacement,
  containerSelections,
  onUpdateContainerSelections,
  config,
  onContinue,
  onBack,
}) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isPlacementCheckerOpen, setIsPlacementCheckerOpen] = useState(false);
  const [quickPresetToast, setQuickPresetToast] = useState<string | null>(null);

  const enableSunshineCoast = false;
  const activeHub = originPostcode
    ? getMetroHubForPostcode(originPostcode, enableSunshineCoast)
    : 'Adelaide';
  const destHub = destinationPostcode
    ? getMetroHubForPostcode(destinationPostcode, enableSunshineCoast)
    : null;
  const isInterstateMove =
    (serviceType === 'moving' || serviceType === 'moving_storage') &&
    destHub !== null &&
    activeHub !== destHub;
  const interstateRouteKey = isInterstateMove ? `${activeHub}->${destHub}` : '';
  const interstateRoutePrices = isInterstateMove
    ? getInterstateRatesForRoute(config, interstateRouteKey)
    : null;

  const locPricing = getLocationPricingForHub(config, activeHub);
  const isOnsite = serviceType === 'storage_at_place' || storagePlacement === 'my_place';
  const locPrices = isOnsite
    ? (locPricing.onsiteContainerPrices || config.onsiteContainerPrices || {
        small_10m3: { monthlyRate: 149, weeklyRate: 49 },
        medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
        large_25m3: { monthlyRate: 179, weeklyRate: 65 },
      })
    : locPricing.containerPrices;

  // Calculate totals across all container selections
  const smallCount = containerSelections.small_10m3 || 0;
  const mediumCount = containerSelections.medium_19m3 || 0;
  const largeCount = containerSelections.large_25m3 || 0;
  const totalContainerCount = smallCount + mediumCount + largeCount;
  const totalM3Selected = (smallCount * 10) + (mediumCount * 19) + (largeCount * 25);

  const handleContainerIncrement = (sizeId: ContainerSizeId) => {
    const updated = {
      ...containerSelections,
      [sizeId]: (containerSelections[sizeId] || 0) + 1,
    };
    onUpdateContainerSelections(updated);
  };

  const handleContainerDecrement = (sizeId: ContainerSizeId) => {
    const currentVal = containerSelections[sizeId] || 0;
    if (currentVal <= 0) return;
    const updated = {
      ...containerSelections,
      [sizeId]: Math.max(0, currentVal - 1),
    };
    onUpdateContainerSelections(updated);
  };

  const handleApplyPreset = (label: string, m3: number) => {
    const mix = calculateOptimalContainerMix(m3);
    onUpdateContainerSelections(mix);
    setQuickPresetToast(`Applied preset for ${label}: ${formatContainerMixLabel(mix)}`);
    setTimeout(() => setQuickPresetToast(null), 3000);
  };

  const handleClearSelections = () => {
    onUpdateContainerSelections({
      small_10m3: 0,
      medium_19m3: 0,
      large_25m3: 0,
      two_large_50m3: 0,
    });
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 xl:p-8 shadow-xs border-2 border-[#DAD7D1]">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
          STEP 4 OF 8 · CONTAINER CONFIGURATION
        </span>

        {totalContainerCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#15385E] bg-sky-50 border border-[#5CC1EF]/40 px-3 py-1 rounded-full">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{totalContainerCount} container{totalContainerCount > 1 ? 's' : ''} ({totalM3Selected} m³ total)</span>
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mt-2 mb-1">
        <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight">
          Which size do you need?
        </h1>
      </div>

      <p className="text-sm sm:text-base text-slate-500 max-w-2xl leading-relaxed">
        Select any combination of container sizes below. Order multiple containers of different sizes to perfectly match your space requirements.
      </p>

      {/* Preset Toast Feedback */}
      {quickPresetToast && (
        <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{quickPresetToast}</span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            UPDATED
          </span>
        </div>
      )}

      {/* 3 Main Container Cards with Number Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-4 xl:gap-5 mt-6">
        {CONTAINER_DETAILS.map((detail) => {
          const sizeId = detail.id;
          const count = containerSelections[sizeId] || 0;
          const priceConfig = locPrices[sizeId as keyof typeof locPrices];
          const isSelected = count > 0;

          return (
            <div
              key={sizeId}
              className={`rounded-2xl sm:rounded-3xl border-2 transition-all p-3.5 sm:p-4 xl:p-5 flex flex-col justify-between relative bg-white box-border ${
                isSelected
                  ? 'border-[#5CC1EF] shadow-md ring-2 ring-[#5CC1EF]/30 bg-sky-50/20'
                  : 'border-[#DAD7D1] hover:border-slate-400 hover:shadow-xs'
              }`}
            >
              {/* Highlight Tag (e.g. Up to 50% More Space) */}
              {detail.highlightTag && (
                <div className="absolute -top-3 left-4 z-10">
                  <span className="bg-[#15385E] text-[#F7D347] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs border border-white/20">
                    {detail.highlightTag}
                  </span>
                </div>
              )}

              {/* Selected Count Indicator Badge */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10">
                  <span className="bg-[#5CC1EF] text-[#15385E] text-xs font-black px-2.5 py-1 rounded-full shadow-2xs border border-white flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>{count}x Selected</span>
                  </span>
                </div>
              )}

              {/* Clickable Image & Details Area */}
              <div
                onClick={() => handleContainerIncrement(sizeId)}
                className="cursor-pointer select-none"
              >
                {/* Container Image */}
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 mb-3.5 relative border border-[#DAD7D1] group">
                  <img
                    src={detail.image}
                    alt={`${detail.name}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-2 left-2 bg-[#15385E]/90 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {detail.dimensions}
                  </div>
                </div>

                {/* Container Title & Volume */}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-[#15385E]">
                    {detail.name}
                  </h3>
                  <span className="font-mono text-xs font-black text-[#5CC1EF] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 shrink-0">
                    {detail.volumeM3} m³
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                  {detail.idealFor}
                </p>

                {/* Pricing Display */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">
                      {isOnsite ? 'Onsite Storage' : 'Facility Storage'}
                    </span>
                    <span className="text-base font-black text-[#15385E]">
                      ${priceConfig.monthlyRate}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400 block">Weekly Eq.</span>
                    <span className="text-xs font-bold text-slate-600 font-mono">
                      ${priceConfig.weeklyRate}/wk
                    </span>
                  </div>
                </div>

                {/* Direct competitor comparison highlight for large container */}
                {sizeId === 'large_25m3' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/90 px-2 py-1 rounded-md flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Replaces 3 competitor mini-boxes · Saves $298+ delivery</span>
                  </div>
                )}

                {isInterstateMove && interstateRoutePrices && (
                  <div className="mt-2 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                    Interstate Freight: ${interstateRoutePrices[sizeId as keyof typeof interstateRoutePrices]}
                  </div>
                )}
              </div>

              {/* Number of Containers Selector under each container size */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-[11px] font-black uppercase text-[#15385E] tracking-tight">
                    Quantity
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {count === 0 ? 'None selected' : `${count * detail.volumeM3} m³ total`}
                  </span>
                </div>

                <div className="flex items-center shrink-0 bg-slate-100/90 p-0.5 sm:p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContainerDecrement(sizeId);
                    }}
                    disabled={count === 0}
                    aria-label={`Decrease ${detail.name} quantity`}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                      count > 0
                        ? 'bg-white hover:bg-slate-200 text-[#15385E] shadow-2xs cursor-pointer active:scale-95'
                        : 'bg-transparent text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-6 sm:w-7 text-center font-mono font-black text-sm sm:text-base text-[#15385E]">
                    {count}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContainerIncrement(sizeId);
                    }}
                    aria-label={`Increase ${detail.name} quantity`}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white hover:bg-[#5CC1EF] hover:text-[#15385E] text-[#15385E] shadow-2xs flex items-center justify-center font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Room Presets - Moved to immediately below container quantity selectors */}
      <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#DAD7D1] shadow-2xs">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-[#15385E] tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#5CC1EF]" />
              <span>Quick Room Presets</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Click any home size preset to auto-populate container quantities above:
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => handleApplyPreset('1–2 Room / Studio', 10)}
            className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-[#5CC1EF] text-left transition-all cursor-pointer shadow-2xs group"
          >
            <div className="text-xs font-black text-[#15385E] group-hover:text-[#00a9d7]">
              1–2 Room Flat
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">~10 m³ volume</div>
            <div className="mt-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
              → 1× 10m³ Small
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('2–3 Bed Apartment', 19)}
            className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-[#5CC1EF] text-left transition-all cursor-pointer shadow-2xs group"
          >
            <div className="text-xs font-black text-[#15385E] group-hover:text-[#00a9d7]">
              2–3 Bed Unit
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">~19 m³ volume</div>
            <div className="mt-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
              → 1× 19m³ Medium
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('3–4 Bed House', 25)}
            className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-[#5CC1EF] text-left transition-all cursor-pointer shadow-2xs group"
          >
            <div className="text-xs font-black text-[#15385E] group-hover:text-[#00a9d7]">
              3 Bed Home
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">~25 m³ volume</div>
            <div className="mt-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
              → 1× 25m³ Large
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('4+ Bed Executive', 50)}
            className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-[#5CC1EF] text-left transition-all cursor-pointer shadow-2xs group"
          >
            <div className="text-xs font-black text-[#15385E] group-hover:text-[#00a9d7]">
              4+ Bed Large
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">~50 m³ volume</div>
            <div className="mt-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block">
              → 2× 25m³ Large
            </div>
          </button>
        </div>
      </div>

      {/* Selected Mix Summary Bar */}
      {totalContainerCount > 0 ? (
        <div className="mt-6 p-4 rounded-2xl bg-sky-50/70 border border-[#5CC1EF]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#15385E] text-[#F7D347] flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <div className="text-xs font-black uppercase text-[#15385E] tracking-wider">
                Current Container Combination
              </div>
              <div className="text-sm font-extrabold text-[#15385E] flex items-center gap-2 flex-wrap">
                <span>{totalContainerCount} Container{totalContainerCount > 1 ? 's' : ''}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-[#00a9d7]">{totalM3Selected} m³ Combined Volume</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-bold text-slate-600">
                  {formatContainerMixLabel(containerSelections)}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearSelections}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Reset to 0
          </button>
        </div>
      ) : (
        <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Please select at least one container above or use the space calculator below to continue your quote.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTEGRATED SPACE CALCULATOR OPTION AT THE BOTTOM OF PAGE 3               */}
      {/* ========================================================================= */}
      <div className="mt-8 rounded-3xl border-2 border-[#5CC1EF]/40 bg-gradient-to-br from-sky-50/90 via-white to-amber-50/60 p-5 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#5CC1EF]/20 to-transparent pointer-events-none rounded-bl-full" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#15385E] text-[#F7D347] shadow-sm shrink-0 border border-white/20">
              <Calculator className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#F7D347] text-[#1A1A1A] px-2.5 py-0.5 rounded-md border border-[#e6c338]">
                  <Sparkles className="w-3 h-3 text-[#15385E]" />
                  <span>Not Sure What Size You Need?</span>
                </span>
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <span>50,000+ Moves Calculated</span>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#15385E] tracking-tight">
                Integrated Space Calculator
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Take the guesswork out of sizing.<br />
                Add your furniture and boxes room by room, and watch your container recommendation adjust in real time. You get the exact space you need—with zero wasted spend.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-[#15385E] hover:bg-[#112F4F] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm border border-[#112F4F] transition-all cursor-pointer active:scale-98"
            >
              <Calculator className="w-4 h-4 text-[#F7D347]" />
              <span>Open Space Calculator</span>
              <ArrowRight className="w-4 h-4 text-[#5CC1EF]" />
            </button>

            {config.enableDrivewayFitGuarantee && (
              <button
                type="button"
                onClick={() => setIsPlacementCheckerOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#15385E] font-bold text-xs border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#5CC1EF]" />
                <span>Check Driveway Fit (Trees &amp; Clearance)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons: Previous / Continue */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (totalContainerCount === 0) {
              // Default to 1x 25m3 if nothing selected
              onUpdateContainerSelections({
                ...containerSelections,
                large_25m3: 1,
              });
            }
            onContinue();
          }}
          className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-sm rounded-2xl shadow-xs border border-[#e6c338] transition-all cursor-pointer active:scale-98 flex items-center gap-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
        </button>
      </div>

      {/* Space Calculator Modal with live synchronization back to container selections */}
      <SpaceCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onUpdateContainerSelections={onUpdateContainerSelections}
        onSelectSize={(size, count) => {
          onUpdateContainerSelections({
            ...containerSelections,
            [size]: count || 1,
          });
        }}
      />

      {/* Driveway Placement Checker Modal (Feature-flagged) */}
      {config.enableDrivewayFitGuarantee && (
        <DrivewayPlacementCheckerModal
          isOpen={isPlacementCheckerOpen}
          onClose={() => setIsPlacementCheckerOpen(false)}
          selectedContainerSize={
            largeCount > 0 ? 'large_25m3' : mediumCount > 0 ? 'medium_19m3' : 'small_10m3'
          }
          onSelectRecommendedSize={(size) => {
            onUpdateContainerSelections({
              small_10m3: size === 'small_10m3' ? 1 : 0,
              medium_19m3: size === 'medium_19m3' ? 1 : 0,
              large_25m3: size === 'large_25m3' ? 1 : 0,
              two_large_50m3: 0,
            });
          }}
          suburbName={originPostcode?.suburb}
          stateCode={originPostcode?.state}
        />
      )}
    </div>
  );
};
