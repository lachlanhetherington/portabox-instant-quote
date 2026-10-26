import React, { useState } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle,
  ShieldCheck,
  Smartphone,
  Monitor,
  Info,
} from 'lucide-react';
import { AppConfig } from '../../types/quote';

interface BrandingBannerSettingsProps {
  config: AppConfig;
  onSaveConfig: (updatedConfig: AppConfig) => void;
}

const DEFAULT_BANNER_SLOGAN = 'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE';

const PRESET_SLOGANS = [
  {
    title: 'Portabox Default Guarantee (Standard)',
    slogan: 'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE',
    description: 'The proven baseline banner highlighting container capacity, cost guarantee, and price matching.',
  },
  {
    title: 'Aggressive Price Match Focus',
    slogan: 'PRICE MATCH GUARANTEE · WE BEAT ANY COMPARABLE COMPETITOR QUOTE · NO HIDDEN FEES',
    description: 'Maximizes customer price confidence and reassures shoppers searching multiple container websites.',
  },
  {
    title: 'Zero Double-Handling & Direct Delivery',
    slogan: 'UP TO 50% MORE SPACE · ZERO TILT LEVEL-LIFT LOADING · DIRECT TO YOUR DRIVEWAY',
    description: 'Emphasizes logistics superiority: horizontal level-lift trucks that protect household goods from tilting.',
  },
  {
    title: 'Interstate Relocation & Moving Special',
    slogan: 'AUSTRALIA-WIDE INTERSTATE RELOCATIONS · GUARANTEED LOWER COST · RELAXED MOVING',
    description: 'Targeted for long-distance customers needing flexible pack-at-your-own-pace moving.',
  },
  {
    title: 'Seasonal Promo & First Month Savings',
    slogan: 'SPECIAL OFFER: UP TO 50% MORE CAPACITY · 1ST MONTH PROMO AVAILABLE · BOOK ONLINE',
    description: 'Promotional hook driving immediate booking action and quote submissions.',
  },
];

export const BrandingBannerSettings: React.FC<BrandingBannerSettingsProps> = ({
  config,
  onSaveConfig,
}) => {
  const [sloganInput, setSloganInput] = useState<string>(
    config.promoBannerSlogan ?? DEFAULT_BANNER_SLOGAN
  );
  const [isBannerEnabled, setIsBannerEnabled] = useState<boolean>(
    config.enablePromoBanner !== false
  );
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleApply = (newSlogan?: string, newEnabled?: boolean) => {
    const textToSave = newSlogan !== undefined ? newSlogan : sloganInput;
    const enabledToSave = newEnabled !== undefined ? newEnabled : isBannerEnabled;

    const updated: AppConfig = {
      ...config,
      promoBannerSlogan: textToSave,
      enablePromoBanner: enabledToSave,
    };

    onSaveConfig(updated);
    setSaveToast('✓ Top announcement banner updated & saved successfully!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleSelectPreset = (presetText: string) => {
    setSloganInput(presetText);
    setIsBannerEnabled(true);
    handleApply(presetText, true);
  };

  const handleResetToDefault = () => {
    setSloganInput(DEFAULT_BANNER_SLOGAN);
    setIsBannerEnabled(true);
    handleApply(DEFAULT_BANNER_SLOGAN, true);
  };

  const handleToggleEnabled = () => {
    const nextState = !isBannerEnabled;
    setIsBannerEnabled(nextState);
    handleApply(sloganInput, nextState);
  };

  const handleClearBanner = () => {
    setSloganInput('');
    setIsBannerEnabled(false);
    handleApply('', false);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Feedback */}
      {saveToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-black">
            LIVE IN APP
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#F7D347] text-[#1A1A1A] border border-[#e5c235] shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0b2942]">
                Top Header Promo Banner &amp; Slogan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customize the high-visibility top gold banner displayed above the navbar across all quote steps.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isBannerEnabled
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isBannerEnabled ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                <span>Hide Banner</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Show Banner</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer"
            title="Reset banner to factory default slogan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={() => handleApply()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00c0f3] hover:bg-[#00a9d7] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save &amp; Publish</span>
          </button>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#0b2942]">
              Live Preview
            </span>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isBannerEnabled && sloganInput.trim().length > 0
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {isBannerEnabled && sloganInput.trim().length > 0
                ? 'Active on Live Site'
                : 'Hidden from Display'}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-white text-[#0b2942] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-white text-[#0b2942] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Mockup Frame */}
        <div
          className={`mx-auto rounded-xl border border-slate-300 shadow-inner overflow-hidden transition-all ${
            previewDevice === 'mobile' ? 'max-w-sm' : 'w-full'
          }`}
        >
          {isBannerEnabled && sloganInput.trim().length > 0 ? (
            <div className="w-full bg-[#F7D347] text-[#1A1A1A] py-2 px-3 sm:px-6 text-xs font-extrabold border-b border-[#e5c235]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate text-xs tracking-tight">
                    {sloganInput.trim()}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline text-[11px] font-bold text-[#1A1A1A]">
                    Seen it cheaper?
                  </span>
                  <span className="bg-[#FFFFFF] text-[#1A1A1A] border border-amber-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#15385E]" />
                    <span>Price Match</span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full bg-slate-100 text-slate-400 py-3 px-4 text-xs font-semibold text-center italic border-b border-slate-200">
              [Top announcement banner is currently disabled / hidden]
            </div>
          )}

          {/* Subheader simulation */}
          <div className="w-full bg-[#5CC1EF] py-2 px-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="font-black text-lg text-[#15385E]">porta</span>
              <span className="font-black text-lg text-white">box</span>
            </div>
            <div className="text-[10px] text-white/90 font-bold">
              1800 467 637
            </div>
          </div>
        </div>
      </div>

      {/* Slogan Editor Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-sm font-extrabold text-[#0b2942]">
            Banner Slogan Text
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter the exact promotional headline or value proposition to display in the gold bar.
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={sloganInput}
            onChange={(e) => setSloganInput(e.target.value)}
            placeholder="e.g. UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE"
            className="w-full px-4 py-3 text-sm font-bold text-[#15385E] bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-[#00c0f3] focus:bg-white transition-all shadow-inner"
          />

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Characters: {sloganInput.length} (optimal: 40–80 chars for mobile readability)</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearBanner}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Clear Slogan
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleApply()}
            className="px-5 py-2.5 rounded-xl bg-[#00c0f3] hover:bg-[#00a9d7] text-white text-xs font-black shadow-xs cursor-pointer transition-all active:scale-98 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Banner Changes</span>
          </button>
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-all"
          >
            Reset to "UP TO 50% MORE SPACE..."
          </button>
        </div>
      </div>

      {/* Preset Library */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h4 className="text-sm font-extrabold text-[#0b2942]">
            Recommended Preset Headlines
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any curated banner slogan below to immediately load and publish it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_SLOGANS.map((preset, idx) => {
            const isCurrentlySelected = sloganInput.trim() === preset.slogan.trim() && isBannerEnabled;
            return (
              <div
                key={idx}
                onClick={() => handleSelectPreset(preset.slogan)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isCurrentlySelected
                    ? 'border-[#00c0f3] bg-sky-50/60 shadow-xs ring-1 ring-[#00c0f3]'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-[#0b2942]">
                      {preset.title}
                    </span>
                    {isCurrentlySelected && (
                      <span className="text-[10px] font-black uppercase text-[#00c0f3] bg-sky-100 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {preset.description}
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] font-bold text-[#1A1A1A] font-mono leading-tight">
                  &ldquo;{preset.slogan}&rdquo;
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
