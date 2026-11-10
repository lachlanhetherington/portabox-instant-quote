import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles, TrendingDown, Info, ShieldCheck, Gift, Award, AlertTriangle, Lock } from 'lucide-react';
import { PostcodeRecord } from '../data/australianPostcodes';
import { AppConfig, BillingCycle, ContainerSizeId, StorageDuration, ServiceType, AnnualMilestoneOption, QuoteBreakdown } from '../types/quote';
import {
  getLocationPricingForHub,
  getMetroHubForPostcode,
  getDurationDiscount,
  evaluateDiscountMatrix,
} from '../services/pricingEngine';
import { formatMoney } from '../utils/currency';
import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step4WhenProps {
  originPostcode: PostcodeRecord;
  destinationPostcode?: PostcodeRecord | null;
  containerSize?: ContainerSizeId;
  containerCount?: number;
  containerSelections?: Record<ContainerSizeId, number>;
  storageDuration: StorageDuration;
  onSelectDuration: (dur: StorageDuration) => void;
  storageDurationMonths?: number;
  onSelectDurationMonths?: (months: number) => void;
  billingCycle: BillingCycle;
  onSelectBillingCycle: (cycle: BillingCycle) => void;
  annualDiscountOption?: AnnualMilestoneOption;
  onSelectAnnualDiscountOption?: (option: AnnualMilestoneOption) => void;
  activeQuote?: QuoteBreakdown | null;
  serviceType?: ServiceType;
  storagePlacement?: 'my_place' | 'facility';
  config: AppConfig;
  onContinue: () => void;
  onBack: () => void;
}

export const Step4When: React.FC<Step4WhenProps> = ({
  originPostcode,
  destinationPostcode,
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
  annualDiscountOption = '400B',
  onSelectAnnualDiscountOption,
  activeQuote,
  config,
  onContinue,
  onBack,
}) => {
  const metroHub = getMetroHubForPostcode(originPostcode);

  const [customDurationVal, setCustomDurationVal] = useState<number>(() => {
    if (storageDuration === '2_weeks') return 0.5;
    if (storageDurationMonths && storageDurationMonths > 0) return storageDurationMonths;
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

  const isTwoWeeksSelected = storageDuration === '2_weeks';
  const effectiveContainerCount = containerSize === 'two_large_50m3' ? 2 : (containerCount || 1);
  const twoWeeksRatePerContainer = config.twoWeeksStorageRate !== undefined ? config.twoWeeksStorageRate : 199;
  const twoWeeksTotalFee = twoWeeksRatePerContainer * effectiveContainerCount;

  // Duration in months for discount engine:
  const effectiveMonths = isTwoWeeksSelected ? 0.5 : customDurationVal;

  const isInterstateMove = Boolean(
    destinationPostcode &&
    originPostcode.state !== destinationPostcode.state
  );

  // Evaluate the Admin Discount Matrix based on exact business logic (image-2.jpg)
  const matrixEvaluation = evaluateDiscountMatrix(
    {
      months: effectiveMonths,
      containerSize,
      serviceType: serviceType || 'storage_facility',
      isInterstate: isInterstateMove,
      storagePlacement: storagePlacement || 'facility',
      hub: metroHub,
      annualOption: annualDiscountOption,
      billingCycle,
      baseMonthlyRate: monthlyRate,
    },
    config.discountMatrixRules
  );

  const durationDiscountInfo = getDurationDiscount(
    {
      months: effectiveMonths,
      serviceType,
      isInterstate: isInterstateMove,
      storagePlacement,
    },
    config.durationDiscounts
  );
  const durationDiscountPct = Math.max(durationDiscountInfo.discountPercent, matrixEvaluation.discountPercent);
  const isCompletionDurationDiscount = durationDiscountInfo.applyMode === 'on_completion_remaining_charges';
  const durationDiscountDollars = Math.round(monthlyRate * (durationDiscountPct / 100));
  const discountedMonthlyRate = isCompletionDurationDiscount
    ? monthlyRate
    : Math.max(0, monthlyRate - durationDiscountDollars);

  // Weekly equivalent for monthly comparison:
  const monthlyCostOnWeeklyRate = Math.round(weeklyRate * (52 / 12));

  // Upfront calculations incorporating 1st month free and upfront stacking (5% for 6m, 10% for 12m):
  // 6 months upfront: If 1st month is free, customer only pays 5 months at 5% off!
  const sixMonthsStandardCost = monthlyRate * 6;
  const sixMonthsUpfrontTotal = matrixEvaluation.firstMonthFree
    ? Math.round(monthlyRate * 5 * 0.95)
    : Math.round(monthlyRate * 6 * 0.95);
  const sixMonthsSavings = sixMonthsStandardCost - sixMonthsUpfrontTotal;
  const sixMonthsSavingsPercent = Math.round((sixMonthsSavings / sixMonthsStandardCost) * 100);

  // 12 months upfront: 10% off
  const twelveMonthsStandardCost = monthlyRate * 12;
  const twelveMonthsUpfrontTotal = Math.round(monthlyRate * 12 * 0.90);
  const twelveMonthsSavings = twelveMonthsStandardCost - twelveMonthsUpfrontTotal;
  const twelveMonthsSavingsPercent = Math.round((twelveMonthsSavings / twelveMonthsStandardCost) * 100);

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

  const isSmallExempt = containerSize === 'small_10m3';

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mb-2">
        Duration &amp; Billing
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-2xl">
        Choose your storage duration and select your preferred billing schedule. The longer you store, the more you save.
      </p>

      {/* Section 1: Estimated storage duration (select weeks or months) */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border border-slate-200/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-base font-black text-[#15385E]">
              1. Estimated storage duration
            </label>
            <p className="text-xs text-slate-500">
              Select an estimated storage period to unlock promotional discounts and guaranteed price freezes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              1-Year Booking Price Guarantee
            </span>
          </div>
        </div>

        {/* Duration Selection Buttons */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {[
              { id: '2_weeks', label: '2 Weeks', months: 0.5, tag: 'Standard' },
              { id: '1_month', label: '1 Month', months: 1, tag: 'Free Kit' },
              { id: '2_months', label: '2 Months', months: 2, tag: '1st Mth Free' },
              { id: '3_months', label: '3 Months', months: 3, tag: '1st Mth Free' },
              { id: '6_months', label: '6 Months', months: 6, tag: '1st Mth Free' },
              { id: '9_months', label: '9 Months', months: 9, tag: '1st Mth Free' },
              { id: '12_plus_months', label: '12+ Months', months: 12, tag: '$400 Credit' },
            ].map((opt) => {
              const isSelected = opt.id === '2_weeks'
                ? storageDuration === '2_weeks'
                : storageDuration !== '2_weeks' && customDurationVal === opt.months;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.id === '2_weeks') {
                      onSelectDuration('2_weeks');
                      if (onSelectDurationMonths) onSelectDurationMonths(0.5);
                      setCustomDurationVal(0.5);
                    } else {
                      handleSelectMonths(opt.months);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[68px] relative ${
                    isSelected
                      ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/30 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="font-extrabold text-xs sm:text-sm">{opt.label}</div>
                  {!isSmallExempt && (
                    <span className={`text-[10px] font-bold mt-1 px-1.5 py-0.2 rounded-sm ${
                      opt.id === '12_plus_months'
                        ? 'text-[#1A1A1A] bg-[#F7D347]'
                        : opt.tag === '1st Mth Free'
                        ? 'text-emerald-800 bg-emerald-100'
                        : 'text-slate-500 bg-slate-100'
                    }`}>
                      {opt.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Months Stepper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">Custom duration:</span>
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    if (customDurationVal <= 1) {
                      onSelectDuration('2_weeks');
                      if (onSelectDurationMonths) onSelectDurationMonths(0.5);
                      setCustomDurationVal(0.5);
                    } else {
                      handleSelectMonths(Math.max(1, Math.round(customDurationVal) - 1));
                    }
                  }}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer border border-slate-200"
                >
                  -
                </button>
                <span className="w-24 text-center font-bold text-[#15385E]">
                  {storageDuration === '2_weeks' ? '2 Weeks' : `${customDurationVal} ${customDurationVal === 1 ? 'Month' : 'Months'}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (storageDuration === '2_weeks') {
                      handleSelectMonths(1);
                    } else {
                      handleSelectMonths(Math.min(36, Math.max(1, Math.round(customDurationVal)) + 1));
                    }
                  }}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer border border-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Freeze & Matched Rule Callout */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">
                1-Year Booking Price Guarantee applies to all discounted rates
              </span>
            </div>
          </div>

          {/* Promotional Matrix Callout Card */}
          {isSmallExempt ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>7' Small Container Note:</strong> 7' containers are already priced at our ultra-low entry tier and are exempt from promotional duration discounts.
              </span>
            </div>
          ) : isTwoWeeksSelected ? (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>2-Week Term:</strong> Price is already reflective of what we are offering ($199/container standard rate). No promotional duration discounts apply.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-sky-50 to-white border-2 border-emerald-300 text-xs space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-black text-[#15385E] text-sm">
                    {effectiveMonths >= 12
                      ? '12+ Month Milestone Loyalty Package'
                      : matrixEvaluation.firstMonthFree
                      ? '1st Month Free Storage Package'
                      : 'Complimentary Supplies Package'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {effectiveMonths >= 12 ? '$460+ TOTAL VALUE' : matrixEvaluation.firstMonthFree ? 'SAVE $' + monthlyRate + '+' : '$60 VALUE'}
                </span>
              </div>

              {/* Items included in the promotional bundle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {matrixEvaluation.firstMonthFree && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-emerald-200 font-bold text-emerald-900">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1st Month Storage FREE ($0 rent)</span>
                  </div>
                )}
                {matrixEvaluation.freeBlanketsCount > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-emerald-200 font-bold text-emerald-900">
                    <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{matrixEvaluation.freeBlanketsCount} Free Blankets ({formatMoney(matrixEvaluation.freeBlanketsCount * 2.5 * 10, false)} value)</span>
                  </div>
                )}
                {matrixEvaluation.freeLockIncluded && (
                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-emerald-200 font-bold text-emerald-900">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Free Heavy-Duty Disc Lock ($35 value)</span>
                  </div>
                )}
              </div>

              {/* 12+ Months Milestone Option Choice (Option 400A vs Option 400B) */}
              {effectiveMonths >= 12 && (
                <div className="pt-2 mt-2 border-t border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#15385E] text-xs">
                      Choose your 12+ Month Milestone Loyalty Credit ($400 Total Benefit):
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option 400B: Split Rewards */}
                    <button
                      type="button"
                      onClick={() => onSelectAnnualDiscountOption && onSelectAnnualDiscountOption('400B')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        annualDiscountOption === '400B'
                          ? 'border-emerald-500 bg-white ring-2 ring-emerald-400/40 shadow-xs'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        annualDiscountOption === '400B' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}>
                        {annualDiscountOption === '400B' && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#15385E] text-xs">Option 400B (Split Rewards)</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          <strong>$200 credit at Month 6</strong> + <strong>$200 credit at Month 12</strong> ($400 total credit)
                        </p>
                      </div>
                    </button>

                    {/* Option 400A: Lump Sum at Month 12 */}
                    <button
                      type="button"
                      onClick={() => onSelectAnnualDiscountOption && onSelectAnnualDiscountOption('400A')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        annualDiscountOption === '400A'
                          ? 'border-emerald-500 bg-white ring-2 ring-emerald-400/40 shadow-xs'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        annualDiscountOption === '400A' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}>
                        {annualDiscountOption === '400A' && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#15385E] text-xs">Option 400A (Lump Sum)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          <strong>$400 credit</strong> applied in full at Month 12 ($400 total credit)
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Billing Type Selection */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl border border-sky-100 bg-sky-50/40 space-y-4">
        <div className="pb-3 border-b border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-base font-black text-[#15385E] block">
              2. Choose type of billing
            </label>
            <p className="text-xs text-slate-500">
              Select your payment schedule. Pay upfront for stacked additional savings.
            </p>
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#15385E] bg-white border border-sky-200 px-2.5 py-1 rounded-md">
            All prices protected by 1-Year Rate Freeze
          </span>
        </div>

        {/* Billing Buttons */}
        <div className="space-y-3">
          {/* 1. Monthly Ongoing or 2 Weeks Term */}
          <button
            type="button"
            onClick={() => onSelectBillingCycle(isTwoWeeksSelected ? 'weekly' : 'monthly')}
            className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              billingCycle === 'monthly' || billingCycle === 'weekly' || billingCycle === '3_months_upfront'
                ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  billingCycle === 'monthly' || billingCycle === 'weekly' || billingCycle === '3_months_upfront' ? 'border-[#5CC1EF] bg-[#5CC1EF]' : 'border-slate-300 bg-white'
                }`}
              >
                {(billingCycle === 'monthly' || billingCycle === 'weekly' || billingCycle === '3_months_upfront') && <Check className="w-3.5 h-3.5 text-[#15385E] stroke-[3]" />}
              </div>
              <div className="text-sm font-extrabold text-[#15385E] flex items-center gap-2">
                <span>{isTwoWeeksSelected ? '2 Weeks Storage' : 'Monthly Ongoing'}</span>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  {isTwoWeeksSelected ? 'STANDARD RATE' : matrixEvaluation.firstMonthFree ? '1ST MONTH FREE' : 'MOST POPULAR'}
                </span>
                {!isTwoWeeksSelected && matrixEvaluation.firstMonthFree && (
                  <span className="text-[10px] font-black text-[#15385E] bg-[#F7D347] px-2 py-0.5 rounded-full border border-[#e6c338]">
                    $0 FIRST MONTH
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                {isTwoWeeksSelected ? (
                  <>
                    ${formatMoney(twoWeeksTotalFee)}<span className="text-xs font-normal text-slate-500"> / 2 wks</span>
                  </>
                ) : matrixEvaluation.firstMonthFree ? (
                  <>
                    <span className="line-through text-slate-400 text-xs font-normal mr-1.5 font-mono">
                      ${formatMoney(monthlyRate)}
                    </span>
                    <span className="text-emerald-700 font-extrabold font-mono">
                      $0
                    </span>
                    <span className="text-xs font-normal text-slate-500"> 1st mo</span>
                    <span className="text-xs text-slate-400 ml-1 font-mono">(${formatMoney(monthlyRate)}/mo after)</span>
                  </>
                ) : (
                  <>
                    ${formatMoney(monthlyRate)}<span className="text-xs font-normal text-slate-500">/mo</span>
                  </>
                )}
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {isTwoWeeksSelected
                  ? `Standard rate ($${formatMoney(twoWeeksRatePerContainer)}/container for 2 weeks) · Cancel anytime with 1 day notice`
                  : matrixEvaluation.firstMonthFree
                  ? `1st Month Free Storage ($0 container rent) · Cancel anytime with 1 day notice`
                  : 'Cancel anytime with 1 day notice'}
              </span>
            </div>
          </button>

          {/* 2. 6 months upfront then monthly (5% off + duration discounts stacked) */}
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
              <div>
                <div className="text-sm font-extrabold text-[#15385E] flex items-center gap-2">
                  <span>6 months upfront then monthly</span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    5% OFF STACKED
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {matrixEvaluation.firstMonthFree
                    ? '1st Month FREE + 5 months billed at 5% discount'
                    : '6 months prepaid at 5% discount'}
                </div>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                ${Math.round(sixMonthsUpfrontTotal / 6)}<span className="text-xs font-normal text-slate-500">/mo equiv</span>
                <span className="text-xs text-slate-400 font-normal ml-1">(${formatMoney(sixMonthsUpfrontTotal)} upfront)</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Save ${formatMoney(sixMonthsSavings)} ({sixMonthsSavingsPercent}% total savings)
              </span>
            </div>
          </button>

          {/* 3. 12 months upfront then monthly (10% off + duration discounts stacked) */}
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
              <div>
                <div className="text-sm font-extrabold text-[#15385E] flex items-center gap-2">
                  <span>12 months upfront then monthly</span>
                  <span className="text-[10px] font-black text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2 py-0.5 rounded-full">
                    10% OFF · MAX SAVINGS
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Prepay 12 months for guaranteed lowest rates + all promotional perks
                </div>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                ${Math.round(twelveMonthsUpfrontTotal / 12)}<span className="text-xs font-normal text-slate-500">/mo equiv</span>
                <span className="text-xs text-slate-400 font-normal ml-1">(${formatMoney(twelveMonthsUpfrontTotal)} upfront)</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Save ${formatMoney(twelveMonthsSavings)} ({twelveMonthsSavingsPercent}% total savings)
              </span>
            </div>
          </button>
        </div>

        {/* Section 2b: Early Termination Transparency & Clawback Terms */}
        {!isSmallExempt && !isTwoWeeksSelected && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-black text-[#15385E]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Promotional Commitment &amp; Early Termination Terms:</span>
            </div>
            <p className="leading-relaxed">
              In exchange for promotional allowances (such as waived 1st month storage rent, complimentary blankets &amp; disc lock, or milestone loyalty credits), you agree to maintain storage for your estimated commitment of <strong>{effectiveMonths >= 12 ? '12+ months' : `${effectiveMonths} month(s)`}</strong>. If storage is concluded earlier than committed, unearned promotional discounts are automatically adjusted on the final settlement invoice as per Portabox standard booking terms.
            </p>
          </div>
        )}
      </div>

      {/* Are You Stuck Banner with originPostcode explicitly passed */}
      <div className="mt-8">
        <AreYouStuckBanner originPostcode={originPostcode} config={config} />
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
