import React, { useState } from 'react';
import {
  Clock,
  Percent,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  DollarSign,
  TrendingDown,
  Plus,
  Trash2,
  HelpCircle,
  Calculator,
} from 'lucide-react';
import { AppConfig, DurationDiscountTier } from '../../types/quote';
import { DEFAULT_DURATION_DISCOUNTS, getDurationDiscount } from '../../services/pricingEngine';

interface DurationDiscountsAdminWorkspaceProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const DurationDiscountsAdminWorkspace: React.FC<DurationDiscountsAdminWorkspaceProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [tiers, setTiers] = useState<DurationDiscountTier[]>(() => {
    return config.durationDiscounts && config.durationDiscounts.length > 0
      ? config.durationDiscounts
      : [...DEFAULT_DURATION_DISCOUNTS];
  });

  const [testMonths, setTestMonths] = useState<number>(4);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleTierPercentChange = (months: number, percent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    setTiers((prev) =>
      prev.map((t) => (t.months === months ? { ...t, discountPercent: clamped } : t))
    );
  };

  const handleAddCustomTier = () => {
    const existingMonths = new Set(tiers.map((t) => t.months));
    const potentialMonths = [1, 2, 3, 4, 5, 6, 8, 9, 12, 18, 24];
    const nextMonth = potentialMonths.find((m) => !existingMonths.has(m)) || tiers.length + 1;
    const newTier: DurationDiscountTier = {
      months: nextMonth,
      discountPercent: 15,
      label: `${nextMonth} Months`,
    };
    setTiers((prev) => [...prev, newTier].sort((a, b) => a.months - b.months));
  };

  const handleRemoveTier = (months: number) => {
    if (tiers.length <= 1) return;
    setTiers((prev) => prev.filter((t) => t.months !== months));
  };

  const handleSave = () => {
    const sorted = [...tiers].sort((a, b) => a.months - b.months);
    const updated: AppConfig = {
      ...config,
      durationDiscounts: sorted,
    };
    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setTiers([...DEFAULT_DURATION_DISCOUNTS]);
    const updated: AppConfig = {
      ...config,
      durationDiscounts: [...DEFAULT_DURATION_DISCOUNTS],
    };
    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Simulation calculations based on current tiers and testMonths
  const simResult = getDurationDiscount(testMonths, tiers);
  const sampleBaseMonthly = 219; // Standard 25m³ rate
  const simDiscountDollars = Math.round(sampleBaseMonthly * (simResult.discountPercent / 100));
  const simFinalMonthly = sampleBaseMonthly - simDiscountDollars;
  const simTotalTermSavings = simDiscountDollars * testMonths;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-br from-[#15385E] via-[#112F4F] to-[#0A1B2F] text-white shadow-md border-2 border-[#5CC1EF]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#5CC1EF]/20 border border-[#5CC1EF]/50 flex items-center justify-center text-[#5CC1EF] shadow-inner shrink-0">
              <Percent className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#F7D347] text-[#1A1A1A] px-2.5 py-0.5 rounded-md">
                  PORTABOX ADMIN CONFIGURATION
                </span>
                <span className="text-[10px] font-bold text-sky-200">
                  Customer Incentive Engine
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Duration Discount Matrix
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-[#1A1A1A] bg-[#F7D347] hover:bg-[#eed235] transition-all border border-[#e6c338] shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-800 stroke-[3]" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save Discount Tiers</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Policy Explainer Callout */}
        <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-xs text-sky-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#F7D347] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-white text-sm">
              Shorter-Period Floor Rule:
            </p>
            <p className="text-xs text-slate-200 leading-relaxed">
              When a customer selects a custom duration that falls between predefined tiers (e.g. 4 or 5 months, 7 or 8 months, 10 or 11 months), the discount <strong>automatically defaults to the closest duration associated with the shorter time period</strong>.
              For example, 4 months gets the 3-month discount (20%), 7 months gets the 6-month discount (25%), and 10 months gets the 9-month discount (30%).
            </p>
          </div>
        </div>
      </div>

      {/* Tier Configuration Cards */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#15385E]">
              Configured Duration Discount Tiers
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set the percentage discount applied to monthly storage rates for each threshold.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddCustomTier}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#15385E] bg-sky-50 hover:bg-sky-100 border border-[#5CC1EF]/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#5CC1EF]" />
            <span>Add Duration Tier</span>
          </button>
        </div>

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.months}
              className="p-4 rounded-2xl border-2 border-slate-200 hover:border-[#5CC1EF] bg-slate-50/60 hover:bg-white transition-all space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#15385E] tracking-wider">
                  {tier.months} {tier.months === 1 ? 'Month' : 'Months'}
                </span>
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(tier.months)}
                    title="Remove tier"
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Discount Percent Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">
                  Discount Offered
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tier.discountPercent}
                    onChange={(e) =>
                      handleTierPercentChange(tier.months, parseFloat(e.target.value) || 0)
                    }
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 font-mono font-extrabold text-base text-[#15385E] bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF] focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                    %
                  </div>
                </div>
              </div>

              {/* Quick Stepper Buttons */}
              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 20, 25, 30, 35].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTierPercentChange(tier.months, preset)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      tier.discountPercent === preset
                        ? 'bg-[#15385E] text-white border-[#15385E]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>

              {/* Live Preview for this Tier */}
              <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Sample $219/mo:</span>
                  <span className="font-mono font-bold text-[#15385E]">
                    ${Math.round(219 * (1 - tier.discountPercent / 100))}/mo
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Save:</span>
                  <span>
                    ${Math.round(219 * (tier.discountPercent / 100))}/mo
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Simulator & Verification Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Customer Duration Simulator */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#15385E] flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4 text-[#5CC1EF]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#15385E]">
                Duration Rule Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Test how custom customer durations resolve under the shorter-period rule.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Simulate Customer Rental Duration:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="24"
                value={testMonths}
                onChange={(e) => setTestMonths(parseInt(e.target.value, 10))}
                className="w-full accent-[#15385E]"
              />
              <span className="w-20 text-center font-mono font-black text-sm bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-[#15385E]">
                {testMonths} {testMonths === 1 ? 'mo' : 'mos'}
              </span>
            </div>

            {/* Quick Pill Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTestMonths(m)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    testMonths === m
                      ? 'bg-[#15385E] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="p-4 rounded-2xl bg-linear-to-br from-sky-50 to-emerald-50 border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                Resolved Discount:
              </span>
              <span className="text-lg font-black text-[#15385E] font-mono">
                {simResult.discountPercent}% OFF
              </span>
            </div>

            <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200 space-y-1">
              <p className="font-semibold text-slate-800">
                Rule Explanation:
              </p>
              <p className="text-[11px] text-slate-600 leading-normal">
                {simResult.reason}
              </p>
            </div>

            <div className="pt-2 border-t border-sky-200/80 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Standard Monthly Rate (25m³):</span>
                <span className="font-mono font-medium">${sampleBaseMonthly}/mo</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discounted Monthly Rate:</span>
                <span className="font-mono font-bold">${simFinalMonthly}/mo</span>
              </div>
              <div className="flex justify-between text-[#15385E] font-extrabold pt-1">
                <span>Total Savings Over {testMonths} Months:</span>
                <span className="font-mono text-emerald-600 font-black">
                  ${simTotalTermSavings} saved
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Full Canonical Schedule Table */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[#15385E]">
              Canonical Duration Resolution Table
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Real-time evaluation
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Customer Duration</th>
                  <th className="py-2.5 px-3">Matched Tier</th>
                  <th className="py-2.5 px-3">Discount %</th>
                  <th className="py-2.5 px-3">Sample Rate ($219)</th>
                  <th className="py-2.5 px-3">Monthly Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                  const res = getDurationDiscount(m, tiers);
                  const isCurrentSim = testMonths === m;
                  const discounted = Math.round(219 * (1 - res.discountPercent / 100));
                  const saved = 219 - discounted;
                  const isExact = res.matchedTier?.months === m;

                  return (
                    <tr
                      key={m}
                      className={`transition-colors ${
                        isCurrentSim
                          ? 'bg-[#F7D347]/20 font-bold'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-extrabold text-[#15385E]">
                        {m} {m === 1 ? 'Month' : 'Months'}
                      </td>
                      <td className="py-2.5 px-3">
                        {res.matchedTier ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isExact
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isExact
                              ? `${res.matchedTier.months} mo tier (Exact)`
                              : `${res.matchedTier.months} mo tier (Shorter floor)`}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None (&lt; 2 mo)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#15385E]">
                        {res.discountPercent}%
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        ${discounted}/mo
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-600 font-bold">
                        {saved > 0 ? `-$${saved}/mo` : '$0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
