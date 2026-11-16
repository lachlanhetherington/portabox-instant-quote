import React from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles, TrendingDown, Info, ShieldCheck, Award, AlertTriangle } from 'lucide-react';
import { PostcodeRecord } from '../data/australianPostcodes';
import { AppConfig, BillingCycle, ContainerSizeId, StorageDuration, ServiceType, AnnualMilestoneOption, QuoteBreakdown } from '../types/quote';
import {
  getContainerRentalPrices,
  getMetroHubForPostcode,
  getBookedSizeCounts,
  getMatrixContainerSize,
  calculateSizeDiscounts,
  calculateUpfrontBreakdown,
  getMilestoneCreditInPeriod,
  getPayableNowDeliveryAmount,
  isUpfrontCycleAllowed,
  evaluateDiscountMatrix,
  getBlanketUnitValue,
  getLockUnitValue,
  getUpfrontDiscountPercent,
  DURATION_BLOCKS,
  getDurationBlock,
} from '../services/pricingEngine';
import { formatMoney } from '../utils/currency';
import { UPFRONT_SAVING_DISCLAIMER } from '../services/quoteCostSections';
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

  // Selected duration, as the first month of its block (4–5 → 4, 6–8 → 6, 9–11 → 9, 12+ → 12)
  const selectedMonths = (() => {
    if (storageDurationMonths && storageDurationMonths >= 1) return getDurationBlock(storageDurationMonths).minMonths;
    if (storageDuration === '4_to_11_months') return 4;
    if (storageDuration === '12_plus_months') return 12;
    return 1;
  })();
  const selectedBlock = getDurationBlock(selectedMonths);

  // Container rates and per-size counts, using the same helpers as calculateQuote
  const isOnsiteBooking = serviceType === 'storage_at_place' || storagePlacement === 'my_place';
  const isInterstateJob = Boolean(
    destinationPostcode && metroHub !== getMetroHubForPostcode(destinationPostcode)
  );
  const rentalPrices = getContainerRentalPrices(config, metroHub, { isOnsite: isOnsiteBooking, isInterstate: isInterstateJob, serviceType });
  const sizeCounts = getBookedSizeCounts(containerSize, containerCount, containerSelections);
  const matrixContainerSize = getMatrixContainerSize(sizeCounts, containerSize);
  const monthlyRate =
    sizeCounts.small_10m3 * rentalPrices.small_10m3.monthlyRate +
    sizeCounts.medium_19m3 * rentalPrices.medium_19m3.monthlyRate +
    sizeCounts.large_25m3 * rentalPrices.large_25m3.monthlyRate;
  const weeklyRate =
    sizeCounts.small_10m3 * rentalPrices.small_10m3.weeklyRate +
    sizeCounts.medium_19m3 * rentalPrices.medium_19m3.weeklyRate +
    sizeCounts.large_25m3 * rentalPrices.large_25m3.weeklyRate;
  // 10 m³ containers are exempt from promotional perks, so the 1st-month-free value covers larger sizes only
  const nonSmallMonthlyRate = monthlyRate - sizeCounts.small_10m3 * rentalPrices.small_10m3.monthlyRate;

  // Duration in months for discount engine:
  const effectiveMonths = selectedMonths;
  const eligibleContainerCount = sizeCounts.medium_19m3 + sizeCounts.large_25m3;

  // Must match calculateQuote: interstate means origin and destination are served by different depot hubs
  const isInterstateMove = Boolean(
    destinationPostcode &&
    getMetroHubForPostcode(originPostcode) !== getMetroHubForPostcode(destinationPostcode)
  );

  // Evaluate the Admin Discount Matrix (same inputs as calculateQuote)
  const evaluateForMonths = (months: number) =>
    evaluateDiscountMatrix(
      {
        months,
        containerSize: matrixContainerSize,
        serviceType: serviceType || 'storage_facility',
        isInterstate: isInterstateMove,
        storagePlacement: storagePlacement || 'facility',
        hub: metroHub,
        annualOption: annualDiscountOption,
        billingCycle,
        baseMonthlyRate: nonSmallMonthlyRate,
        eligibleContainerCount,
        upfrontDiscounts: config.upfrontDiscounts,
      },
      config.discountMatrixRules,
      config.packingSupplies
    );
  const matrixEvaluation = evaluateForMonths(effectiveMonths);
  const sixMonthsUpfrontPercent = getUpfrontDiscountPercent('6_months_upfront', config.upfrontDiscounts);
  const twelveMonthsUpfrontPercent = getUpfrontDiscountPercent('12_months_upfront', config.upfrontDiscounts);

  // Must match calculateQuote: the duration discount comes from the admin Discount Matrix only
  // (Dan, 16 Nov), and 10 m³-only bookings are exempt. It is applied to the monthly rate before any upfront discount.
  const matrixDurationPercent = Math.max(0, Math.min(100, Number(matrixEvaluation.matchedRule?.discountPercent) || 0));
  const isSmallOnlyBooking = (() => {
    const sel = containerSelections;
    if (sel && Object.values(sel).some((n) => (n || 0) > 0)) {
      return (sel.small_10m3 || 0) > 0 && !(sel.medium_19m3 || 0) && !(sel.large_25m3 || 0) && !(sel.two_large_50m3 || 0);
    }
    return containerSize === 'small_10m3';
  })();
  const durationDiscountPct = isSmallOnlyBooking ? 0 : matrixDurationPercent;
  const isCompletionDurationDiscount = false;
  // Per-size discounts (same calculation as the quote): 10 m³ containers get no discount
  const sizeDiscounts = calculateSizeDiscounts({
    prices: rentalPrices,
    counts: sizeCounts,
    durationDiscountPercent: isCompletionDurationDiscount ? 0 : durationDiscountPct,
    firstMonthFree: matrixEvaluation.firstMonthFree,
  });
  const discountedMonthlyRate = sizeDiscounts.effectiveMonthly;
  // Storage still charged in month 1 when 1st month free applies (the 10 m³ containers, if any)
  const firstMonthStorageCharge = Math.max(0, discountedMonthlyRate - sizeDiscounts.freeMonthValue);
  const isFreeMonthOnCycle = billingCycle === 'monthly' || billingCycle === '6_months_upfront';

  // Weekly equivalent for monthly comparison:
  const monthlyCostOnWeeklyRate = Math.round(weeklyRate * (52 / 12));

  // Dan (16 Nov): upfront savings count every delivery leg. Today the only delivery savings are the
  // legs waived because the customer loads / unloads at the Portabox location (SID / SFPU).
  const deliverySavings = Math.round(
    (activeQuote?.waivedLegs || []).reduce((sum, leg) => sum + (leg.waivedSavings || 0), 0)
  );

  // Dan (16 Nov) upfront savings, using the same calculation as the quote:
  //   duration discount = milestone credit inside the prepaid months (+ any matrix % discount)
  //   N% upfront = N% of (rental - credit) + N% of the initial delivery incl. fuel levy
  // The parts on each card add up to its saving.
  const initialDeliveryWithFuel = getPayableNowDeliveryAmount(activeQuote?.legs?.find((l) => l.isPayableNow));
  const cents = (n: number) => Math.round(n * 100) / 100;
  const buildUpfront = (months: number, percent: number, includeFreeMonth: boolean) => {
    const available = isUpfrontCycleAllowed(months === 6 ? '6_months_upfront' : '12_months_upfront', effectiveMonths);
    const listCost = monthlyRate * months;
    const freeMonth = includeFreeMonth && matrixEvaluation.firstMonthFree ? sizeDiscounts.freeMonthValue : 0;
    const credit = getMilestoneCreditInPeriod(months, matrixEvaluation.milestoneDiscountAmount, annualDiscountOption);
    const b = calculateUpfrontBreakdown({
      effectiveMonthly: discountedMonthlyRate,
      months,
      freeMonthValue: freeMonth,
      milestoneCredit: credit,
      percent,
      initialDeliveryWithFuel,
    });
    const durationSaving = cents((monthlyRate - discountedMonthlyRate) * months + credit);
    const upfrontSaving = cents(b.storageUpfrontSaving + b.deliveryUpfrontSaving);
    const parts: string[] = [];
    if (freeMonth > 0) parts.push(`1st month free $${formatMoney(freeMonth)}`);
    parts.push(`duration discount $${formatMoney(durationSaving)}`);
    if (upfrontSaving > 0) parts.push(`${percent}% upfront $${formatMoney(upfrontSaving)}`);
    if (deliverySavings > 0) parts.push(`delivery savings $${formatMoney(deliverySavings)}`);
    const saving = cents(freeMonth + durationSaving + upfrontSaving + deliverySavings);
    return { listCost, total: b.storageTotal, saving: available ? saving : 0, parts, hasFreeMonth: freeMonth > 0, available };
  };
  const sixMonthsUpfront = buildUpfront(6, sixMonthsUpfrontPercent, true);
  const twelveMonthsUpfront = buildUpfront(12, twelveMonthsUpfrontPercent, false);

  const handleSelectMonths = (months: number) => {
    if (onSelectDurationMonths) onSelectDurationMonths(months);
    // Dan (16 Nov): an upfront option the new duration doesn't allow falls back to monthly
    if (!isUpfrontCycleAllowed(billingCycle, months)) onSelectBillingCycle('monthly');
    if (months <= 3) {
      onSelectDuration('1_to_3_months');
    } else if (months < 12) {
      onSelectDuration('4_to_11_months');
    } else {
      onSelectDuration('12_plus_months');
    }
  };

  // Free lock and blanket rental are for 12' and 16' containers only (7' get none, Dan 16 Nov)
  const totalContainers = eligibleContainerCount;

  // Dan (16 Nov): "Total Savings" = one-off savings + monthly savings, e.g. "Save $241 + $25 monthly".
  // One-off: the free 1st month, the free lock(s) and the 12+ month credit.
  // Monthly: free blanket rental and any duration discount, every month.
  const oneOffSavings = Math.round(
    (matrixEvaluation.firstMonthFree && isFreeMonthOnCycle ? nonSmallMonthlyRate : 0) +
      (matrixEvaluation.freeLockIncluded ? totalContainers * getLockUnitValue(config.packingSupplies) : 0) +
      (effectiveMonths >= 12 ? matrixEvaluation.milestoneDiscountAmount : 0)
  );
  const monthlySavings = Math.round(
    (matrixEvaluation.freeBlanketsCount > 0
      ? totalContainers * (config.packingSupplies?.freeBlanketsPerContainer ?? 10) * getBlanketUnitValue(config.packingSupplies)
      : 0) + sizeDiscounts.lines.reduce((sum, l) => sum + (l.durationDiscountMonthly || 0), 0)
  );
  const totalSavingsLabel = [
    oneOffSavings > 0 ? `Save $${formatMoney(oneOffSavings)}` : '',
    monthlySavings > 0 ? `${oneOffSavings > 0 ? '+ ' : 'Save '}$${formatMoney(monthlySavings)} monthly` : '',
  ]
    .filter(Boolean)
    .join(' ');

  // What each container gets for the chosen duration, listed one container at a time
  const perContainerPerks = (() => {
    const rows: { key: string; label: string; perks: string[] }[] = [];
    let n = 0;
    (['large_25m3', 'medium_19m3', 'small_10m3'] as const).forEach((sizeId) => {
      const line = sizeDiscounts.lines.find((l) => l.sizeId === sizeId);
      if (!line) return;
      const perContainerOff = line.count > 0 ? Math.round(line.durationDiscountMonthly / line.count) : 0;
      for (let i = 0; i < line.count; i++) {
        n += 1;
        const perks: string[] = [];
        const eligible = sizeId !== 'small_10m3';
        if (line.firstMonthFree && isFreeMonthOnCycle) perks.push('1st month free');
        if (perContainerOff > 0) perks.push(`${line.durationDiscountPercent}% off (−$${formatMoney(perContainerOff)}/mo)`);
        // 7' (10 m³) containers get no free blankets or lock (Dan 16 Nov)
        if (eligible && (config.packingSupplies?.freeBlanketsPerContainer ?? 10) > 0) {
          perks.push(`Free Blanket Rental (${config.packingSupplies?.freeBlanketsPerContainer ?? 10})`);
        }
        if (eligible && matrixEvaluation.freeLockIncluded) perks.push('Free lock');
        if (eligible && matrixEvaluation.milestoneDiscountAmount > 0 && eligibleContainerCount > 0) {
          perks.push(`$${formatMoney(matrixEvaluation.milestoneDiscountAmount / eligibleContainerCount)} credit`);
        }
        rows.push({ key: `${sizeId}-${i}`, label: `Container ${n} · ${line.label}`, perks });
      }
    });
    return rows;
  })();

  // Only 10 m³ containers booked: no promotional perks, so show the 7' note instead of the package.
  // Mixed bookings (10 m³ + larger) show the package; the per-size box shows "No discount" for the 10 m³.
  const isSmallExempt =
    sizeCounts.small_10m3 > 0 && sizeCounts.medium_19m3 === 0 && sizeCounts.large_25m3 === 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mb-2">
        Duration &amp; Billing
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-2xl">
        Choose your storage duration and select your preferred billing schedule.
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
        </div>

        {/* Duration Selection Buttons */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {DURATION_BLOCKS.map((block) => {
              const evalForBlock = evaluateForMonths(block.minMonths);
              // Dan (15 Nov): every block shows "Free Kit"; the duration perk goes underneath.
              const hasFreeKit = evalForBlock.freeLockIncluded || evalForBlock.freeBlanketsCount > 0;
              const perkTag = evalForBlock.milestoneDiscountAmount > 0
                ? `$${formatMoney(evalForBlock.milestoneDiscountAmount)} Credit`
                : evalForBlock.firstMonthFree
                ? '1st Mth Free'
                : null;
              const isSelected = selectedBlock.id === block.id;
              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => handleSelectMonths(block.minMonths)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[68px] relative ${
                    isSelected
                      ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/30 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="font-extrabold text-xs sm:text-sm">{block.label}</div>
                  {hasFreeKit && (
                    <span className="text-[10px] font-bold mt-1 px-1.5 py-0.2 rounded-sm text-[#15385E] bg-sky-100">
                      Free Kit
                    </span>
                  )}
                  {!isSmallExempt && perkTag && (
                    <span className={`text-[10px] font-bold mt-1 px-1.5 py-0.2 rounded-sm ${
                      evalForBlock.milestoneDiscountAmount > 0
                        ? 'text-[#1A1A1A] bg-[#F7D347]'
                        : 'text-emerald-800 bg-emerald-100'
                    }`}>
                      {perkTag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600">
            <strong className="text-[#15385E]">Free Kit</strong> = free blanket rental (pack of 10) every month of your rental and a free disc lock.
          </p>

          {/* Promotional Matrix Callout Card */}
          {isSmallExempt ? (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>7' Small Container Note:</strong> 7' containers are already priced at our ultra-low entry tier and are exempt from promotional duration discounts.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-sky-50 to-white border-2 border-emerald-300 text-xs space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-black text-[#15385E] text-sm">Total Savings</span>
                </div>
                {totalSavingsLabel && (
                  <span className="text-[11px] font-black tracking-wide text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {totalSavingsLabel}
                  </span>
                )}
              </div>

              {/* What each container gets for this duration */}
              <ul className="space-y-1.5 pt-1">
                {perContainerPerks.map((row) => (
                  <li
                    key={row.key}
                    className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 p-2 bg-white rounded-xl border border-emerald-200"
                  >
                    <span className="font-extrabold text-[#15385E]">{row.label}</span>
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      {row.perks.length > 0 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {row.perks.join(' + ')}
                        </>
                      ) : (
                        <span className="text-slate-500">No discount</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {/* 12+ Months Milestone Option Choice (Option 400A vs Option 400B) */}
              {effectiveMonths >= 12 && (
                <div className="pt-2 mt-2 border-t border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#15385E] text-xs">
                      Choose how to receive your 12+ Month Milestone Loyalty Credit (${formatMoney(matrixEvaluation.milestoneDiscountAmount)} total{eligibleContainerCount > 1 ? `, $${formatMoney(matrixEvaluation.milestoneDiscountAmount / eligibleContainerCount)} per container` : ''}):
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
                          <strong>${formatMoney(matrixEvaluation.milestoneDiscountAmount / 2)} credit at Month 6</strong> + <strong>${formatMoney(matrixEvaluation.milestoneDiscountAmount / 2)} credit at Month 12</strong> (${formatMoney(matrixEvaluation.milestoneDiscountAmount)} total credit)
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
                          <strong>${formatMoney(matrixEvaluation.milestoneDiscountAmount)} credit</strong> applied in full at Month 12 (${formatMoney(matrixEvaluation.milestoneDiscountAmount)} total credit)
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
        </div>

        {/* Billing Buttons */}
        <div className="space-y-3">
          {/* 1. Monthly Ongoing */}
          <button
            type="button"
            onClick={() => onSelectBillingCycle('monthly')}
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
                <span>Monthly Ongoing</span>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  {matrixEvaluation.firstMonthFree ? '1ST MONTH FREE' : 'MOST POPULAR'}
                </span>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 pl-8 sm:pl-0">
              <div className="text-base font-extrabold text-[#15385E] font-mono">
                {matrixEvaluation.firstMonthFree ? (
                  <>
                    <span className="line-through text-slate-400 text-xs font-normal mr-1.5 font-mono">
                      ${formatMoney(monthlyRate)}
                    </span>
                    <span className="text-emerald-700 font-extrabold font-mono">
                      ${formatMoney(firstMonthStorageCharge)}
                    </span>
                    <span className="text-xs font-normal text-slate-500"> 1st mo</span>
                    <span className="text-xs text-slate-400 ml-1 font-mono">(${formatMoney(discountedMonthlyRate)}/mo after)</span>
                  </>
                ) : discountedMonthlyRate < monthlyRate ? (
                  <>
                    <span className="line-through text-slate-400 text-xs font-normal mr-1.5 font-mono">
                      ${formatMoney(monthlyRate)}
                    </span>
                    ${formatMoney(discountedMonthlyRate)}<span className="text-xs font-normal text-slate-500">/mo</span>
                  </>
                ) : (
                  <>
                    ${formatMoney(monthlyRate)}<span className="text-xs font-normal text-slate-500">/mo</span>
                  </>
                )}
              </div>
              {/* 7' (10 m³) containers never get 1st Month Free, so the note only shows when a larger container is booked */}
              {eligibleContainerCount > 0 && (
                <span className="text-[11px] text-slate-600 sm:text-right">
                  "1st Month Free" is based on staying 2 months or more
                </span>
              )}
            </div>
          </button>

          {/* 2. 6 months upfront then monthly (5% off + duration discounts stacked) */}
          <button
            type="button"
            disabled={!sixMonthsUpfront.available}
            aria-disabled={!sixMonthsUpfront.available}
            data-billing-option="6_months_upfront"
            onClick={() => sixMonthsUpfront.available && onSelectBillingCycle('6_months_upfront')}
            className={`w-full p-4 rounded-2xl border text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              !sixMonthsUpfront.available
                ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                : billingCycle === '6_months_upfront'
                  ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm cursor-pointer'
                  : 'border-slate-200 bg-white/70 hover:bg-white cursor-pointer'
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
                    EXTRA {sixMonthsUpfrontPercent}% OFF
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {!sixMonthsUpfront.available
                    ? 'Available for 6+ months storage'
                    : sixMonthsUpfront.hasFreeMonth
                      ? `1st month free + 5 months prepaid with an extra ${sixMonthsUpfrontPercent}% off`
                      : `6 months prepaid with an extra ${sixMonthsUpfrontPercent}% off`}
                </div>
              </div>
            </div>

            <UpfrontPrice upfront={sixMonthsUpfront} months={6} />
          </button>

          {/* 3. 12 months upfront then monthly (10% off + duration discounts stacked) */}
          <button
            type="button"
            disabled={!twelveMonthsUpfront.available}
            aria-disabled={!twelveMonthsUpfront.available}
            data-billing-option="12_months_upfront"
            onClick={() => twelveMonthsUpfront.available && onSelectBillingCycle('12_months_upfront')}
            className={`w-full p-4 rounded-2xl border text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              !twelveMonthsUpfront.available
                ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                : billingCycle === '12_months_upfront'
                  ? 'border-[#5CC1EF] bg-white ring-2 ring-[#5CC1EF]/30 shadow-sm cursor-pointer'
                  : 'border-slate-200 bg-white/70 hover:bg-white cursor-pointer'
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
                    EXTRA {twelveMonthsUpfrontPercent}% OFF · MAX SAVINGS
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {twelveMonthsUpfront.available
                    ? `12 months prepaid with an extra ${twelveMonthsUpfrontPercent}% off`
                    : 'Available for 12+ months storage'}
                </div>
              </div>
            </div>

            <UpfrontPrice upfront={twelveMonthsUpfront} months={12} />
          </button>
        </div>

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

/**
 * Upfront card: only the amount saved (Dan, 16 Nov), not the upfront total, because the upfront
 * amount depends on which legs the customer books in. The parts add up to the saving.
 */
const UpfrontPrice: React.FC<{
  upfront: { listCost: number; total: number; saving: number; parts: string[] };
  months: number;
}> = ({ upfront }) =>
  upfront.saving > 0 ? (
    <div className="flex flex-col items-start sm:items-end justify-center gap-1 pl-8 sm:pl-0">
      <div className="text-base font-extrabold text-emerald-700 font-mono" data-upfront-saving={upfront.saving}>
        Save ${formatMoney(upfront.saving)}
      </div>
      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 sm:text-right">
        {upfront.parts.join(' + ')}
      </span>
      <span className="text-[10px] text-slate-500 sm:text-right" data-upfront-disclaimer>
        {UPFRONT_SAVING_DISCLAIMER}
      </span>
    </div>
  ) : null;
