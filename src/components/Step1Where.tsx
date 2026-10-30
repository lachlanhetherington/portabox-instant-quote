import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Check,
  Compass,
  Phone,
  Info,
} from 'lucide-react';
import { PORTABOX_IMAGES } from '../assets/images';
import {
  AUSTRALIAN_POSTCODES,
  findClosestDepot,
  PostcodeRecord,
  searchPostcodes,
} from '../data/australianPostcodes';
import { AppConfig, BlockedPostcode } from '../types/quote';
import { isPostcodeBlocked } from '../services/pricingEngine';
import {
  evaluatePostcodeServiceTier,
  PostcodeTierEvaluation,
} from '../services/postcodeServiceTierEngine';
import { AreYouStuckBanner } from './AreYouStuckBanner';
import { CoverageAreaMapModal } from './CoverageAreaMapModal';

interface Step1WhereProps {
  initialPostcode: PostcodeRecord | null;
  onSelectPostcode: (postcode: PostcodeRecord) => void;
  onContinue: () => void;
  config: AppConfig;
}

export const Step1Where: React.FC<Step1WhereProps> = ({
  initialPostcode,
  onSelectPostcode,
  onContinue,
  config,
}) => {
  const [query, setQuery] = useState(initialPostcode ? `${initialPostcode.postcode} ${initialPostcode.suburb}` : '5061');
  const [selected, setSelected] = useState<PostcodeRecord | null>(initialPostcode || AUSTRALIAN_POSTCODES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PostcodeRecord[]>([]);
  const [blockedNotice, setBlockedNotice] = useState<BlockedPostcode | null>(null);
  const [isCoverageMapOpen, setIsCoverageMapOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTierEval: PostcodeTierEvaluation | null = selected
    ? evaluatePostcodeServiceTier(selected, config.postcodeServiceTiers, false)
    : null;

  useEffect(() => {
    if (query.trim().length > 0) {
      const results = searchPostcodes(query);
      setSuggestions(results);
    } else {
      setSuggestions(AUSTRALIAN_POSTCODES.slice(0, 6));
    }
  }, [query]);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (record: PostcodeRecord) => {
    const blocked = isPostcodeBlocked(record.postcode, config);
    if (blocked) {
      setBlockedNotice(blocked);
      setSelected(null);
      setQuery(`${record.postcode} ${record.suburb}`);
      setIsOpen(false);
      return;
    }

    setBlockedNotice(null);
    setSelected(record);
    setQuery(`${record.postcode} ${record.suburb}`);
    setIsOpen(false);
    onSelectPostcode(record);
  };

  const handleContinueClick = () => {
    if (selected) {
      const blocked = isPostcodeBlocked(selected.postcode, config);
      if (blocked) {
        setBlockedNotice(blocked);
        return;
      }
      onSelectPostcode(selected);
      onContinue();
    } else if (suggestions.length > 0) {
      handleSelect(suggestions[0]);
      onContinue();
    }
  };

  return (
    <div className="space-y-6">
      {/* Front Page Hero Banner with Photography & Container Tones:
          - Roller Door Shadowed / Overlay: #112F4F
          - Container Exterior Panel / Trim: #DAD7D1
          - Headline Text: #FFFFFF
          - Price Match Button: #FFFFFF
          - Banner Text: #1A1A1A
      */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[#DAD7D1] shadow-md bg-[#112F4F]">
        {/* Background container photograph */}
        <div className="absolute inset-0 z-0">
          <img
            src={PORTABOX_IMAGES.movingAndStorage}
            alt="Portabox container delivered to driveway"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity"
          />
          {/* Deep Container Blue #112F4F gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#112F4F] via-[#112F4F]/90 to-[#112F4F]/70" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Headline Text: Pure White #FFFFFF */}
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#FFFFFF] tracking-tight leading-[1.1]">
              Moving & Storage Containers Delivered Directly to You
            </h2>

            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-xl">
              Horizontal level-lift delivery: your contents stay level during loading and unloading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#5CC1EF]" />
              <span>Horizontal level-lift delivery</span>
              <span className="text-slate-400">·</span>
              <span className="w-2 h-2 rounded-full bg-[#F7D347]" />
              <span>Lock quote price for 30 days</span>
              <span className="text-slate-400">·</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>1-year rate freeze locked in</span>
            </div>
          </div>
        </div>
      </div>

      {/* Portabox Core Trust Triad on Step 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-[#DAD7D1] shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F7D347]/20 border border-[#F7D347] text-[#1A1A1A] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#15385E]" />
          </div>
          <div>
            <div className="text-xs font-black text-[#15385E] uppercase tracking-wide">Price Match Guarantee</div>
            <div className="text-[11px] text-slate-500 font-semibold">We beat comparable quotes per m³</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-[#DAD7D1] shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5CC1EF]/20 border border-[#5CC1EF] text-[#15385E] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#008fbb]" />
          </div>
          <div>
            <div className="text-xs font-black text-[#15385E] uppercase tracking-wide">30-Day Quote Lock</div>
            <div className="text-[11px] text-slate-500 font-semibold">Quoted price frozen for 30 days</div>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-[#DAD7D1] shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-black text-[#15385E] uppercase tracking-wide">1-Year Rate Freeze</div>
            <div className="text-[11px] text-slate-500 font-semibold">Container rate locked for 12 months</div>
          </div>
        </div>
      </div>

      {/* Main Step 1 Input Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
        {/* Header kicker: #F7D347 Vibrant Gold background with #1A1A1A text */}
        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
          INSTANT QUOTE
        </span>

        {/* Heading: #15385E Deep Navy Blue */}
        <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mt-1 mb-1">
          Enter your current postcode
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-3">
          Where do you want to start loading your container?
        </p>

        {/* Blocked postcode warning */}
        {blockedNotice && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Postcode {blockedNotice.postcode} is currently restricted</p>
              <p className="text-xs text-amber-800 mt-0.5">{blockedNotice.reason}</p>
              <p className="text-xs text-amber-700 mt-1">
                Please enter an alternative Australian delivery address or phone 1800 467 637 for special dispatch options.
              </p>
            </div>
          </div>
        )}

        {/* Input section */}
        <div className="mt-8 relative" ref={dropdownRef}>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-black text-[#15385E] uppercase tracking-wider">
              Suburb or postcode
            </label>
            <button
              type="button"
              onClick={() => setIsCoverageMapOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#15385E] hover:text-[#008fbb] underline cursor-pointer transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-[#5CC1EF]" />
              <span>View Coverage Areas Map</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {/* Icon: #15385E Deep Navy Blue */}
                <MapPin className="h-5 w-5 text-[#15385E]" />
              </div>
              <input
                id="step1-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                  setBlockedNotice(null);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="e.g. 5061, Hyde Park, Melbourne, Sydney, Brisbane..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-[#5CC1EF] text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#5CC1EF]/30 focus:bg-white transition-all shadow-xs"
              />
            </div>

            {/* CTA Continue Button: #F7D347 Vibrant Gold / Yellow with #1A1A1A Soft Black / Charcoal Text */}
            <button
              onClick={handleContinueClick}
              disabled={!selected && suggestions.length === 0}
              className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] disabled:bg-slate-200 text-[#1A1A1A] disabled:text-slate-400 font-black rounded-2xl border-2 border-[#e6c338] disabled:border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute z-20 mt-2 w-full sm:max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Suggested Australian Locations</span>
                <span className="text-[10px] text-slate-400 font-semibold">Service Coverage</span>
              </div>
              {suggestions.map((p) => {
                const isSelected = selected?.postcode === p.postcode && selected?.suburb === p.suburb;
                const tier = evaluatePostcodeServiceTier(p, config.postcodeServiceTiers, false);
                return (
                  <button
                    key={`${p.postcode}-${p.suburb}`}
                    onClick={() => handleSelect(p)}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-sky-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-sky-50 font-bold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-[#15385E]" />
                      <span className="text-sm font-semibold text-slate-900">
                        <span className="font-black text-[#15385E]">{p.postcode}</span> {p.suburb}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          tier.tier === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : tier.tier === 2
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tier.tier === 1 ? 'Metro Service Area' : tier.tier === 2 ? 'Extended Area' : 'Outside Coverage'}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-[#15385E]">
                        {p.state}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= SERVICE COVERAGE FEEDBACK SECTION ================= */}
        {selected && !blockedNotice && selectedTierEval && selectedTierEval.tier !== 1 && (
          <div className="mt-6">

            {/* Extended Area: Inside 4 states (SA, NSW, VIC, QLD) above 200 km */}
            {selectedTierEval.tier === 2 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 shadow-xs mt-0.5">
                    !
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                        Extended Regional Area (&gt;200 km)
                      </span>
                      <span className="text-xs font-bold text-amber-900">
                        {selectedTierEval.distanceKm} km from {selectedTierEval.closestDepot.name}
                      </span>
                    </div>
                    {/* User's Exact Requested Message */}
                    <p className="text-sm font-black text-amber-950 leading-relaxed">
                      &ldquo;{selectedTierEval.message}&rdquo;
                    </p>
                    <p className="text-xs text-amber-800">
                      Location: {selected.suburb}, {selected.state} {selected.postcode}. Our standard local hire fleet operates up to 200 km, but our regional logistics team can arrange container sales or custom transport.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                  <a
                    href="tel:1800467637"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider shadow-xs cursor-pointer transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call 1800 467 637</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsCoverageMapOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Coverage Map</span>
                  </button>
                </div>
              </div>
            )}

            {/* Outside standard service states */}
            {selectedTierEval.tier === 3 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 border-2 border-slate-300 text-slate-900 flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center font-black shrink-0 shadow-xs mt-0.5">
                    ✕
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-300 text-slate-800">
                        Outside Standard Coverage Area
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {selected.state} ({selected.postcode})
                      </span>
                    </div>
                    {/* User's Exact Requested Message */}
                    <p className="text-sm font-black text-slate-900 leading-relaxed">
                      &ldquo;{selectedTierEval.message}&rdquo;
                    </p>
                    <p className="text-xs text-slate-600">
                      Portabox currently services depots across SA, VIC, NSW, and QLD. We do not provide standard delivery to {selected.state}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCoverageMapOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#5CC1EF]" />
                    <span>View Coverage Map</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Are You Stuck Banner */}
        <div className="mt-8">
          <AreYouStuckBanner
            config={config}
            suburbOrPostcode={selected ? `${selected.postcode} ${selected.suburb}` : undefined}
          />
        </div>
      </div>

      {/* Interactive Coverage Areas Map Modal */}
      <CoverageAreaMapModal
        isOpen={isCoverageMapOpen}
        onClose={() => setIsCoverageMapOpen(false)}
        config={config}
        initialPostcode={selected?.postcode || query}
        onSelectPostcode={(pc) => {
          setQuery(pc);
          const found = AUSTRALIAN_POSTCODES.find((p) => p.postcode === pc);
          if (found) {
            handleSelect(found);
          }
        }}
      />
    </div>
  );
};
