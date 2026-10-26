import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles, TrendingDown, Info, ShieldCheck } from 'lucide-react';
import { PostcodeRecord } from '../data/australianPostcodes';
import { AppConfig, BillingCycle, ContainerSizeId, StorageDuration, ServiceType } from '../types/quote';
import {
  getLocationPricingForHub,
  getMetroHubForPostcode,
  getDurationDiscount,
} from '../services/pricingEngine';
import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step4WhenProps {
  originPostcode: PostcodeRecord;
  containerSize?: ContainerSizeId;
  containerCount?: number;
  containerSelections?: Record<ContainerSizeId, number>;
  storageDuration: StorageDuration;
  onSelectDuration: (dur: StorageDuration) => void;
  storageDurationMonths?: number;
  onSelectDurationMonths?: (months: number) => void;
  billingCycle: BillingCycle;
  onSelectBillingCycle: (cycle: BillingCycle) => void;
  serviceType?: ServiceType;
  storagePlacement?: 'my_place' | 'facility';
  config: AppConfig;
  onContinue: () => void;
  onBack: () => void;
}

export const Step4When: React.FC<Step4WhenProps> = ({
  originPostcode,
  containerSize = 'large_25m3',
  containerCount = 1,
  containerSelections,
  serviceType,
  storagePlacement,
  storageDuration,
  onSelectDuration,
  storageDurationMonths,
  onSelectDurationMonths,
  billingCycle,
  onSelectBillingCycle,
  config,
  onContinue,
  onBack,
}) => {
  const metroHub = getMetroHubForPostcode(originPostcode);

  // Duration unit: weeks or months (controlled by enableSelectWeeks feature flag)
  const allowSelectWeeks = config.enableSelectWeeks !== false;
  const initialUnit = allowSelectWeeks && storageDuration.includes('week') ? 'weeks' : 'months';
  const [durationUnit, setDurationUnit] = useState<'months' | 'weeks'>(initialUnit);
  const effectiveDurationUnit = allowSelectWeeks ? durationUnit : 'months';

  const [customDurationVal, setCustomDurationVal] = useState<number>(() => {
    if (storageDurationMonths && storageDurationMonths > 0) return storageDurationMonths;
    if (storageDuration === '2_weeks') return 2;
    if (storageDuration === '1_to_3_months') return 1;
    if (storageDuration === '4_to_11_months') return 6;
    if (storageDuration === '12_plus_months') return 12;
    const match = storageDuration.match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  });

  const getContainerRates = () => {
    const locPricing = getLocationPricingForHub(config, metroHub);
    const isOnsite = serviceType === 'storage_at_place' || storagePlacement === 'my_place';
    const prices = isOnsite
      ? (locPricing.onsiteContainerPrices || config.onsiteContainerPrices || {
          small_10m3: { monthlyRate: 149, weeklyRate: 49 },
          medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
          large_25m3: { monthlyRate: 179, weeklyRate: 65 },
        })
      : locPricing.containerPrices;
    const { small_10m3, medium_19m3, large_25m3 } = prices;

    if (containerSelections) {
      const selSmall = containerSelections.small_10m3 || 0;
      const selMed = containerSelections.medium_19m3 || 0;
      const selLrg = (containerSelections.large_25m3 || 0) + ((containerSelections.two_large_50m3 || 0) * 2);
      if (selSmall + selMed + selLrg > 0) {
        return {
          weeklyRate: (selSmall * small_10m3.weeklyRate) + (selMed * medium_19m3.weeklyRate) + (selLrg * large_25m3.weeklyRate),
          monthlyRate: (selSmall * small_10m3.monthlyRate) + (selMed * medium_19m3.monthlyRate) + (selLrg * large_25m3.monthlyRate),
        };
      }
    }

    let weekly = 75;
    let monthly = 219;
    if (containerSize === 'small_10m3') {
      weekly = small_10m3.weeklyRate;
      monthly = small_10m3.monthlyRate;
    } else if (containerSize === 'medium_19m3') {
      weekly = medium_19m3.weeklyRate;
      monthly = medium_19m3.monthlyRate;
    } else if (containerSize === 'large_25m3') {
      weekly = large_25m3.weeklyRate;
      monthly = large_25m3.monthlyRate;
    } else if (containerSize === 'two_large_50m3') {
      weekly = large_25m3.weeklyRate * 2;
      monthly = large_25m3.monthlyRate * 2;
    }
    const count = containerSize === 'two_large_50m3' ? 1 : (containerCount || 1);
    return {
      weeklyRate: weekly * count,
      monthlyRate: monthly * count,
    };
  };

  const { weeklyRate, monthlyRate } = getContainerRates();

  // Duration in months for discount engine:
  const effectiveMonths = effectiveDurationUnit === 'weeks'
    ? Math.max(0.5, Math.round(customDurationVal / 4.333))
    : customDurationVal;

  const durationDiscountInfo = getDurationDiscount(effectiveMonths, config.durationDiscounts);
  const durationDiscountPct = durationDiscountInfo.discountPercent;
  const durationDiscountDollars = Math.round(monthlyRate * (durationDiscountPct / 100));
  const discountedMonthlyRate = Math.max(0, monthlyRate - durationDiscountDollars);

  // Weekly equivalent for monthly comparison:
  const monthlyCostOnWeeklyRate = Math.round(weeklyRate * (52 / 12));
  const monthlySavings = monthlyCostOnWeeklyRate - discountedMonthlyRate;
  const monthlySavingsPercent = Math.round((monthlySavings / monthlyCostOnWeeklyRate) * 100);

  // Upfront calculations incorporating duration discounts
  // 3 months upfront:
  const threeMonthsWeeklyTotal = weeklyRate * 13;
  const threeMoDiscountPct = Math.max(durationDiscountPct, 20);
  const threeMonthsUpfrontTotal = Math.round(monthlyRate * 3 * (1 - threeMoDiscountPct / 100));
  const threeMonthsSavings = threeMonthsWeeklyTotal - threeMonthsUpfrontTotal;
  const threeMonthsSavingsPercent = Math.round((threeMonthsSavings / threeMonthsWeeklyTotal) * 100);

  // 6 months upfront:
  const sixMonthsWeeklyTotal = weeklyRate * 26;
  const sixMoDiscountPct = Math.max(durationDiscountPct, 25);
  const sixMonthsUpfrontTotal = Math.round(monthlyRate * 6 * (1 - sixMoDiscountPct / 100));
  const sixMonthsSavings = sixMonthsWeeklyTotal - sixMonthsUpfrontTotal;
  const sixMonthsSavingsPercent = Math.round((sixMonthsSavings / sixMonthsWeeklyTotal) * 100);

  // 12 months upfront:
  const twelveMonthsWeeklyTotal = weeklyRate * 52;
  const twelveMoDiscountPct = Math.max(durationDiscountPct, 35);
  const twelveMonthsUpfrontTotal = Math.round(monthlyRate * 12 * (1 - twelveMoDiscountPct / 100));
  const twelveMonthsSavings = twelveMonthsWeeklyTotal - twelveMonthsUpfrontTotal;
  const twelveMonthsSavingsPercent = Math.round((twelveMonthsSavings / twelveMonthsWeeklyTotal) * 100);

  const handleSelectMonths = (months: number) => {
    setCustomDurationVal(months);
    if (onSelectDurationMonths) onSelectDurationMonths(months);

    if (months <= 3) {
      onSelectDuration('1_to_3_months');
    } else if (months < 12) {
      onSelectDuration('4_to_11_months');
    } else {
      onSelectDuration('12_plus_months');
    }
  };

  const handleSelectWeeks = (weeks: number) => {
    setCustomDurationVal(weeks);
    const monthsEquiv = Math.max(1, Math.round(weeks / 4.333));
    if (onSelectDurationMonths) onSelectDurationMonths(monthsEquiv);

    if (weeks <= 2) {
      onSelectDuration('2_weeks');
    } else if (weeks <= 12) {
      onSelectDuration('1_to_3_months');
    } else if (weeks < 52) {
      onSelectDuration('4_to_11_months');
    } else {
      onSelectDuration('12_plus_months');
    }
  };

  // Helper to get configured discount for a given tier
  const getTierDiscountLabel = (months: number) => {
    const tier = config.durationDiscounts?.find((t) => t.months === months);
    if (!tier || tier.discountPercent <= 0) return null;
    return `${tier.discountPercent}% OFF`;
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      {/* Header kicker: #F7D347 Vibrant Gold with #1A1A1A text */}
      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
        STEP 5 OF 8 · DURATION &amp; BILLING
      </span>

      <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mt-1 mb-2">
        Duration &amp; Billing
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-2xl">
        Choose your storage duration to unlock duration discounts, and select your preferred billing schedule. The longer you store, the more you save.
      </p>

      {/* Section 1: Estimated storage duration (select weeks or months) */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-base font-black text-[#15385E]">
              1. Estimated storage duration
            </label>
            <p className="text-xs text-slate-500">
              Save up to 35% with our duration discounts
            </p>
          </div>

          {/* Unit Toggle: Months vs Weeks (Select Weeks controlled by feature flag) */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl self-start sm:self-auto border border-[#DAD7D1] shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setDurationUnit('months');
                handleSelectMonths(customDurationVal || 6);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                effectiveDurationUnit === 'months'
                  ? 'bg-[#15385E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Select Months
            </button>
            {allowSelectWeeks && (
              <button
                type="button"
                onClick={() => {
                  setDurationUnit('weeks');
                  handleSelectWeeks(customDurationVal || 8);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  effectiveDurationUnit === 'weeks'
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Select Weeks
              </button>
            )}
          </div>
        </div>

        {/* Buttons for Months */}
        {effectiveDurationUnit === 'months' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              {[
                { months: 1, label: '1 Month', tag: null },
                { months: 2, label: '2 Months', tag: getTierDiscountLabel(2) || '10% OFF' },
                { months: 3, label: '3 Months', tag: getTierDiscountLabel(3) || '20% OFF' },
                { months: 6, label: '6 Months', tag: getTierDiscountLabel(6) || '25% OFF' },
                { months: 9, label: '9 Months', tag: getTierDiscountLabel(9) || '30% OFF' },
                { months: 12, label: '12+ Months', tag: getTierDiscountLabel(12) || '35% OFF' },
              ].map((opt) => {
                const isSelected = customDurationVal === opt.months;
                return (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => handleSelectMonths(opt.months)}
                    className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[82px] ${
                      isSelected
                        ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="font-extrabold text-xs sm:text-sm">{opt.label}</div>
                    {opt.tag ? (
                      <span
                        className={`inline-block mt-1 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${
                          opt.months >= 12
                            ? 'bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338]'
                            : isSelected
                            ? 'bg-[#5CC1EF] text-[#15385E]'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {opt.tag}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-medium mt-1">Standard rate</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Months Stepper with Live Duration Rule Callout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">Custom duration:</span>
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleSelectMonths(Math.max(1, customDurationVal - 1))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer border border-slate-200"
                  >
                    -
                  </button>
                  <span className="w-20 text-center font-bold text-[#15385E]">
                    {customDurationVal} {customDurationVal === 1 ? 'Month' : 'Months'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectMonths(Math.min(36, customDurationVal + 1))}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer border border-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Dynamic discount badge */}
              {durationDiscountPct > 0 ? (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-extrabold text-[11px]">
                    {durationDiscountPct}% duration discount applied! (Saving ${durationDiscountDollars}/month)
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Select 2+ months to unlock discounts up to 35%
                </span>
              )}
            </div>

            {/* Explainer for custom duration shorter period fallback */}
            {durationDiscountInfo.matchedTier && durationDiscountInfo.matchedTier.months !== customDurationVal && (
              <div className="text-[11px] text-slate-500 bg-sky-50/70 p-2.5 rounded-xl border border-sky-100 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#5CC1EF] shrink-0" />
                <span>
                  <strong>Shorter-period rule applied:</strong> Your {customDurationVal}-month duration automatically receives the {durationDiscountInfo.matchedTier.months}-month duration discount ({durationDiscountPct}% off).
                </span>
              </div>
            )}
          </div>
        )}

        {/* Buttons for Weeks */}
        {effectiveDurationUnit === 'weeks' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
              {[
                { weeks: 1, label: '1 Week' },
                { weeks: 2, label: '2 Weeks' },
                { weeks: 3, label: '3 Weeks' },
                { weeks: 4, label: '4 Weeks' },
                { weeks: 8, label: '8 Weeks (~2 mo)' },
                { weeks: 12, label: '12 Weeks (~3 mo)' },
              ].map((opt) => {
                const isSelected = customDurationVal === opt.weeks;
                return (
                  <button
                    key={opt.weeks}
                    type="button"
                    onClick={() => handleSelectWeeks(opt.weeks)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer font-bold text-xs sm:text-sm ${
                      isSelected
                        ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/30 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div>{opt.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Weeks Stepper */}
            <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Custom duration:</span>
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSelectWeeks(Math.max(1, customDurationVal - 1))}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer border border-slate-200"
                >
                  -
                </button>
                <span className="w-20 text-center font-bold text-[#15385E]">
                  {customDurationVal} {customDurationVal === 1 ? 'Week' : 'Weeks'}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectWeeks(Math.min(104, customDurationVal + 1))}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer border border-slate-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Billing Type Selection */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl border border-sky-100 bg-sky-50/40 space-y-4">
        <div className="pb-3 border-b border-sky-100">
          <label className="text-base font-black text-[#15385E] block">
            2. Choose type of billing
          </label>
          <p className="text-xs text-slate-500">
            Select your billing schedule. Your duration discount is automatically incorporated into each option.
          </p>
        </div>

        {/* 5 Billing Buttons */}
        <div className="space-y-3">
          {/* 1. Weekly */}
          <button
            type="button"
            onClick={() => onSelectBillingCycle('weekly')}
            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              billingCycle === 'weekly'
                ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  billingCycle === 'weekly' ? 'border-[#5CC1EF] bg-[#5CC1EF]' : 'border-slate-300 bg-white'
                }`}
              >
                {billingCycle === 'weekly' && <Check className="w-3.5 h-3.5 text-[#15385E] stroke-[3]" />}
              </div>
              <div className="text-sm font-extrabold text-[#15385E]">Weekly</div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                ${weeklyRate}<span className="text-xs font-normal text-slate-500">/wk</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Standard weekly base rate
              </span>
            </div>
          </button>

          {/* 2. Monthly */}
          <button
            type="button"
            onClick={() => onSelectBillingCycle('monthly')}
            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              billingCycle === 'monthly'
                ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  billingCycle === 'monthly' ? 'border-[#5CC1EF] bg-[#5CC1EF]' : 'border-slate-300 bg-white'
                }`}
              >
                {billingCycle === 'monthly' && <Check className="w-3.5 h-3.5 text-[#15385E] stroke-[3]" />}
              </div>
              <div className="text-sm font-extrabold text-[#15385E] flex items-center gap-2">
                <span>Monthly</span>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  POPULAR
                </span>
                {durationDiscountPct > 0 && (
                  <span className="text-[10px] font-black text-[#15385E] bg-[#F7D347] px-2 py-0.5 rounded-full border border-[#e6c338]">
                    {durationDiscountPct}% OFF
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                {durationDiscountPct > 0 ? (
                  <>
                    <span className="line-through text-slate-400 text-xs font-normal mr-1.5 font-mono">
                      ${monthlyRate}
                    </span>
                    <span className="text-emerald-700 font-extrabold font-mono">
                      ${discountedMonthlyRate}
                    </span>
                    <span className="text-xs font-normal text-slate-500">/mo</span>
                  </>
                ) : (
                  <>
                    ${monthlyRate}<span className="text-xs font-normal text-slate-500">/mo</span>
                  </>
                )}
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {durationDiscountPct > 0 ? `Save $${durationDiscountDollars}/mo (${durationDiscountPct}% duration discount)` : `${monthlySavingsPercent}% savings vs weekly`}
              </span>
            </div>
          </button>

          {/* 3. 3 months upfront then monthly */}
          <button
            type="button"
            onClick={() => onSelectBillingCycle('3_months_upfront')}
            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              billingCycle === '3_months_upfront'
                ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  billingCycle === '3_months_upfront' ? 'border-[#5CC1EF] bg-[#5CC1EF]' : 'border-slate-300 bg-white'
                }`}
              >
                {billingCycle === '3_months_upfront' && <Check className="w-3.5 h-3.5 text-[#15385E] stroke-[3]" />}
              </div>
              <div className="text-sm font-extrabold text-[#15385E]">
                3 months upfront then monthly
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                ${Math.round(threeMonthsUpfrontTotal / 3)}<span className="text-xs font-normal text-slate-500">/mo equiv</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {threeMonthsSavingsPercent}% total savings
              </span>
            </div>
          </button>

          {/* 4. 6 months upfront then monthly */}
          <button
            type="button"
            onClick={() => onSelectBillingCycle('6_months_upfront')}
            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              billingCycle === '6_months_upfront'
                ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  billingCycle === '6_months_upfront' ? 'border-[#5CC1EF] bg-[#5CC1EF]' : 'border-slate-300 bg-white'
                }`}
              >
                {billingCycle === '6_months_upfront' && <Check className="w-3.5 h-3.5 text-[#15385E] stroke-[3]" />}
              </div>
              <div className="text-sm font-extrabold text-[#15385E]">
                6 months upfront then monthly
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                ${Math.round(sixMonthsUpfrontTotal / 6)}<span className="text-xs font-normal text-slate-500">/mo equiv</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {sixMonthsSavingsPercent}% total savings
              </span>
            </div>
          </button>

          {/* 5. 12 months upfront then monthly */}
          <button
            type="button"
            onClick={() => onSelectBillingCycle('12_months_upfront')}
            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              billingCycle === '12_months_upfront'
                ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  billingCycle === '12_months_upfront' ? 'border-[#5CC1EF] bg-[#5CC1EF]' : 'border-slate-300 bg-white'
                }`}
              >
                {billingCycle === '12_months_upfront' && <Check className="w-3.5 h-3.5 text-[#15385E] stroke-[3]" />}
              </div>
              <div className="text-sm font-extrabold text-[#15385E] flex items-center gap-2">
                <span>12 months upfront then monthly</span>
                <span className="text-[10px] font-black text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2 py-0.5 rounded-full">
                  MAX SAVINGS
                </span>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                ${Math.round(twelveMonthsUpfrontTotal / 12)}<span className="text-xs font-normal text-slate-500">/mo equiv</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {twelveMonthsSavingsPercent}% total savings
              </span>
            </div>
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
    </div>
  );
};
