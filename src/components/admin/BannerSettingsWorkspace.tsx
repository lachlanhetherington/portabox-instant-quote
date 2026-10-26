import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Eye,
  Type,
  Check,
} from 'lucide-react';
import { AppConfig } from '../../types/quote';

interface BannerSettingsWorkspaceProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onSave: () => void;
}

const DEFAULT_BANNER_SLOGAN =
  'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE';

const SUGGESTED_PRESETS = [
  {
    title: 'Default Guarantee (Classic)',
    slogan: 'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE',
    badge: 'Standard',
  },
  {
    title: 'Horizontal Level-Lift Focus',
    slogan: 'HORIZONTAL LEVEL-LIFT DELIVERY · ZERO TILT · UP TO 50% MORE SPACE',
    badge: 'Logistics',
  },
  {
    title: 'Australia-Wide Price Match',
    slogan: 'AUSTRALIA-WIDE PORTABLE STORAGE · GUARANTEED LOWEST RATES · PRICE MATCH',
    badge: 'Price War',
  },
  {
    title: 'Value & Instant Booking Focus',
    slogan: 'BEST VALUE GUARANTEE · HORIZONTAL LEVEL-LIFT · INSTANT ONLINE BOOKING',
    badge: 'Marketing',
  },
];

export const BannerSettingsWorkspace: React.FC<BannerSettingsWorkspaceProps> = ({
  config,
  onUpdateConfig,
  onSave,
}) => {
  const [sloganInput, setSloganInput] = useState<string>(
    config.promoBannerSlogan || DEFAULT_BANNER_SLOGAN
  );
  const [phoneInput, setPhoneInput] = useState<string>(config.phone || '1800 467 637');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    setSloganInput(config.promoBannerSlogan || DEFAULT_BANNER_SLOGAN);
    setPhoneInput(config.phone || '1800 467 637');
  }, [config.promoBannerSlogan, config.phone]);

  const handleApplySlogan = (newSlogan: string) => {
    setSloganInput(newSlogan);
    const updated: AppConfig = {
      ...config,
      promoBannerSlogan: newSlogan,
    };
    onUpdateConfig(updated);
    setSaveToast('✓ Banner slogan applied to app!');
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSlogan = sloganInput.trim() || DEFAULT_BANNER_SLOGAN;
    const cleanPhone = phoneInput.trim() || '1800 467 637';

    const updated: AppConfig = {
      ...config,
      promoBannerSlogan: cleanSlogan,
      phone: cleanPhone,
    };
    onUpdateConfig(updated);
    onSave();
    setSaveToast('✓ Top banner slogan & branding saved across the app!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleResetToDefault = () => {
    handleApplySlogan(DEFAULT_BANNER_SLOGAN);
  };

  const isModified =
    sloganInput !== (config.promoBannerSlogan || DEFAULT_BANNER_SLOGAN) ||
    phoneInput !== (config.phone || '1800 467 637');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast Feedback */}
      {saveToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded font-mono">
            Live Synced
          </span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#F7D347] text-[#1A1A1A] rounded-xl shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0b2942]">
              Top Banner &amp; Brand Slogan Settings
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customize the prominent yellow marketing announcement slogan displayed at the very top of all customer quoting pages.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveAll()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Slogan</span>
          </button>
        </div>
      </div>

      {/* Live Real-Time Banner Preview */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Eye className="w-4 h-4 text-[#00c0f3]" />
            <span className="uppercase tracking-wider text-[11px] text-slate-400">
              Live Customer Header Preview
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Rendered exactly as shown to visitors
          </span>
        </div>

        {/* The Exact Banner Visual Component */}
        <div className="rounded-2xl overflow-hidden border border-[#e5c235] shadow-xs">
          <div className="w-full bg-[#F7D347] text-[#1A1A1A] py-2 px-3 sm:px-6 text-xs font-extrabold">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate">
                <span className="truncate text-xs tracking-tight">
                  {sloganInput.trim() || DEFAULT_BANNER_SLOGAN}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden md:inline text-[11px] font-bold text-[#1A1A1A]">
                  Seen it cheaper?
                </span>
                <span className="bg-[#FFFFFF] text-[#1A1A1A] border border-amber-300/80 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#15385E]" />
                  <span>Price Match</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Form Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="space-y-4">
          <div>
            <label className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#0b2942] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Type className="w-4 h-4 text-[#00c0f3]" />
                Top Banner Text / Slogan
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                {sloganInput.length} characters
              </span>
            </label>
            <textarea
              rows={2}
              value={sloganInput}
              onChange={(e) => setSloganInput(e.target.value)}
              placeholder="e.g. UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs sm:text-sm font-bold text-[#0b2942] focus:ring-2 focus:ring-[#00c0f3] focus:border-[#00c0f3] outline-none transition-all leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This message appears in the gold bar at the top of the app. Separate key selling points with dots (·) or dashes.
            </p>
          </div>

          {/* Quick Preset Slogans */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Quick Slogan Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUGGESTED_PRESETS.map((preset) => {
                const isActive = sloganInput.trim() === preset.slogan.trim();
                return (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleApplySlogan(preset.slogan)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isActive
                        ? 'bg-amber-50/70 border-[#F7D347] ring-2 ring-[#F7D347]/40 shadow-2xs'
                        : 'bg-slate-50 hover:bg-sky-50/50 border-slate-200 hover:border-[#00c0f3]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-[#0b2942]">
                        {preset.title}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 font-medium">
                      &ldquo;{preset.slogan}&rdquo;
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3 text-amber-700 stroke-[3]" />
                        Currently Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Branding: Phone Number */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0b2942] mb-1.5">
              <Phone className="w-4 h-4 text-[#00c0f3]" />
              Customer Inquiry Toll-Free Phone
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="1800 467 637"
                className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold text-[#0b2942] focus:ring-2 focus:ring-[#00c0f3] outline-none"
              />
              <span className="text-[11px] text-slate-500">
                Displayed in the top navigation bar and all quotation pages.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isModified ? (
              <span className="text-amber-600 font-bold">● Unsaved changes pending</span>
            ) : (
              <span className="text-slate-400">All banner changes in sync</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Reset to Original
            </button>
            <button
              type="button"
              onClick={() => handleSaveAll()}
              className="px-6 py-2.5 bg-[#15385E] hover:bg-[#0f2842] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-[#F7D347]" />
              <span>Apply &amp; Save Across App</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
