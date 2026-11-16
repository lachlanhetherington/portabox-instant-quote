import {
  AppConfig,
  BillingCycle,
  BlockedPostcode,
  ContainerPriceConfig,
  SizeDiscountLine,
  ContainerInsuranceConfig,
  ContainerInsuranceOrder,
  ContainerSizeId,
  CustomerLead,
  DeliverySlotWindow,
  DeliveryZoneSettings,
  DurationDiscountTier,
  InterstateRoutePricing,
  LocationPricingConfig,
  MetroHub,
  PackingSuppliesConfig,
  PackingSuppliesOrder,
  PromotionRule,
  PromoContainerSizeScope,
  PromoLocationScope,
  PromoServiceScope,
  QuoteBreakdown,
  QuoteDropOffRecord,
  QuoteLegBreakdown,
  LogisticsMethod,
  ServiceType,
  StorageDuration,
  FuelSurchargeModel,
  FuelSurchargeZoneRates,
  ProtectionPlanType,
  DiscountMatrixRule,
  AnnualMilestoneOption,
  EarlyTerminationResult,
  UpfrontDiscountSettings,
} from '../types/quote';
import {
  calculateDrivingDistance,
  calculateHaversineDistance,
  findClosestDepot,
  PostcodeRecord,
} from '../data/australianPostcodes';

export { findClosestDepot };
import { DEFAULT_DEPOT_CALENDARS } from './googleCalendarService';
import { getSlotEfficiencyIncentive } from './routingOptimizationService';
import { DEFAULT_BUSINESS_HOURS_CONFIG, DEFAULT_LOCATION_SERVICE_HOURS } from './businessHoursService';
import { DEFAULT_POSTCODE_SERVICE_TIERS } from './postcodeServiceTierEngine';
import { formatMoney } from '../utils/currency';

export const DEFAULT_CONTAINER_INSURANCE: ContainerInsuranceConfig = {
  enabled: true,
  monthlyPricePerContainer: 15,
  cooMonthlyPricePerContainer: 10,
  isFreePromo: false,
  coverageAmountPerContainer: 5000,
  description: 'Portabox Container Protection Option (CPO) / Container Only Option (COO) – Up to $5,000 comprehensive contents cover for theft, fire, water, storm & transit.',
};

export const DEFAULT_PACKING_SUPPLIES: PackingSuppliesConfig = {
  boxSinglePrice: 2.5,
  box10Price: 20,
  box50Price: 40,
  box100Price: 70,
  blanketSinglePrice: 2.5,
  blanket10Price: 25,
  blanket50Price: 100,
  blanket100Price: 180,
  freeBlanketsPerContainer: 10, // First 10 blankets FREE per container rented!
  blanketBlockSize: 10,
  blanketBlockPriceMonthly: 25, // $25 per month for each block of 10 blankets rented after free allowance
  isAllBlanketsFreePromo: false,
  lockPrice: 22, // $22 heavy-duty disc padlock
  isLockFreePromo: false, // Admin toggle: offer free padlock to incentivise sales
};

/** Monthly hire value of one blanket, from the price list ($25 per 10-blanket block = $2.50). */
export function getBlanketUnitValue(config?: PackingSuppliesConfig): number {
  const blockPrice = config?.blanketBlockPriceMonthly ?? DEFAULT_PACKING_SUPPLIES.blanketBlockPriceMonthly ?? 25;
  const blockSize = config?.blanketBlockSize ?? DEFAULT_PACKING_SUPPLIES.blanketBlockSize ?? 10;
  return blockSize > 0 ? blockPrice / blockSize : 0;
}

/** Sale price of one disc padlock, from the price list. */
export function getLockUnitValue(config?: PackingSuppliesConfig): number {
  return config?.lockPrice ?? DEFAULT_PACKING_SUPPLIES.lockPrice ?? 22;
}

export const DEFAULT_DELIVERY_ZONES: DeliveryZoneSettings = {
  zoneAMaxKm: 25,
  zoneABaseFee: 149,
  zoneARatePerKm: 0,
  zoneBMaxKm: 50,
  zoneBBaseFee: 179,
  zoneBRatePerKm: 0,
  zoneCMaxKm: 75,
  zoneCBaseFee: 219,
  zoneCRatePerKm: 0,
  zoneDMaxKm: 100,
  zoneDBaseFee: 249,
  zoneDRatePerKm: 0,
  zoneEBaseFee: 249, // Base rate matches Zone D, with +$5.00/km one-way surcharge
  zoneERatePerKm: 5.0, // $5.00/km one-way surcharge
  zoneECallPricing: false,
};

export const DEFAULT_FUEL_SURCHARGE_ZONE_RATES: FuelSurchargeZoneRates = {
  A: 5,
  B: 15,
  C: 25,
  D: 35,
  E: 50,
};

export function calculateLegFuelSurcharge(params: {
  zone: string;
  distanceKm: number;
  containerCount: number;
  config: AppConfig;
}): {
  ratePerContainer: number;
  totalAmount: number;
  note: string;
  model: FuelSurchargeModel;
} {
  const { zone, distanceKm, containerCount, config } = params;
  const isEnabled = config.fuelSurchargeEnabled !== false;
  const model: FuelSurchargeModel = config.fuelSurchargeModel || 'per_zone';

  if (!isEnabled) {
    return { ratePerContainer: 0, totalAmount: 0, note: 'Fuel surcharge disabled', model };
  }

  if (model === 'per_zone') {
    const rates = config.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES;
    const zoneKey = (zone?.toUpperCase() as keyof FuelSurchargeZoneRates) || 'A';
    const ratePerContainer = rates[zoneKey] !== undefined ? rates[zoneKey] : (DEFAULT_FUEL_SURCHARGE_ZONE_RATES[zoneKey] ?? 5);
    const totalAmount = ratePerContainer * containerCount;
    const note = `Zone ${zoneKey} fixed fuel levy: $${formatMoney(ratePerContainer)}/container${containerCount > 1 ? ` × ${containerCount} = $${formatMoney(totalAmount)}` : ''}`;
    return { ratePerContainer, totalAmount, note, model };
  } else {
    const ratePerKm = config.fuelSurchargeRatePerKm !== undefined ? config.fuelSurchargeRatePerKm : 0.50;
    const dist = Math.max(0, distanceKm || 0);
    const ratePerContainer = Math.round(dist * ratePerKm * 100) / 100;
    const totalAmount = Math.round(ratePerContainer * containerCount * 100) / 100;
    const note = `${dist} km @ $${ratePerKm.toFixed(2)}/km: $${formatMoney(ratePerContainer)}/container${containerCount > 1 ? ` × ${containerCount} = $${formatMoney(totalAmount)}` : ''}`;
    return { ratePerContainer, totalAmount, note, model };
  }
}

/** The duration blocks offered on Duration & Billing. A block is priced at its first month. */
export const DURATION_BLOCKS: { id: string; label: string; minMonths: number; maxMonths?: number }[] = [
  { id: '1_month', label: '1 Month', minMonths: 1, maxMonths: 1 },
  { id: '2_months', label: '2 Months', minMonths: 2, maxMonths: 2 },
  { id: '3_months', label: '3 Months', minMonths: 3, maxMonths: 3 },
  { id: '4_5_months', label: '4–5 Months', minMonths: 4, maxMonths: 5 },
  { id: '6_8_months', label: '6–8 Months', minMonths: 6, maxMonths: 8 },
  { id: '9_11_months', label: '9–11 Months', minMonths: 9, maxMonths: 11 },
  { id: '12_plus_months', label: '12+ Months', minMonths: 12 },
];

/** The storage duration the customer chose, as shown on the quote (e.g. "6–8 Months"). */
export function getQuoteDurationLabel(quote: { storageDurationMonths?: number; storageDuration?: string }): string {
  if (quote.storageDurationMonths && quote.storageDurationMonths >= 1) {
    return getDurationBlock(quote.storageDurationMonths).label;
  }
  const legacy: Record<string, string> = {
    '2_weeks': '2 Weeks',
    '1_to_3_months': '1 to 3 Months',
    '4_to_11_months': '4 to 11 Months',
    '12_plus_months': '12+ Months',
  };
  return (quote.storageDuration && legacy[quote.storageDuration]) || 'Not selected';
}

/** The block a month count falls in (e.g. 7 → "6–8 Months"). */
export function getDurationBlock(months: number | undefined) {
  const m = Math.max(1, Math.floor(months || 1));
  return DURATION_BLOCKS.find((b) => m >= b.minMonths && (b.maxMonths === undefined || m <= b.maxMonths)) || DURATION_BLOCKS[0];
}

export const DEFAULT_UPFRONT_DISCOUNTS: UpfrontDiscountSettings = { sixMonthsPercent: 5, twelveMonthsPercent: 10 };

/** Prepayment discount % for a billing cycle, from the CEO-editable settings. */
export function getUpfrontDiscountPercent(billingCycle: BillingCycle | undefined, settings?: UpfrontDiscountSettings): number {
  const s = { ...DEFAULT_UPFRONT_DISCOUNTS, ...(settings || {}) };
  if (billingCycle === '6_months_upfront') return Math.max(0, Number(s.sixMonthsPercent) || 0);
  if (billingCycle === '12_months_upfront') return Math.max(0, Number(s.twelveMonthsPercent) || 0);
  return 0;
}

/** Dan (16 Nov): no durations under 1 month in Phase I, so stored 0.5 month rows are dropped. */
export function removeSubMonthRules(rules: DiscountMatrixRule[]): DiscountMatrixRule[] {
  return rules.filter((r) => !(r.maxMonths !== undefined && r.maxMonths !== null && r.maxMonths < 1));
}

export const DEFAULT_DISCOUNT_MATRIX_RULES: DiscountMatrixRule[] = [
  // 1 Month
  {
    id: 'dm-1m-both',
    name: '1 Month Storage',
    active: true,
    minMonths: 1,
    maxMonths: 1,
    containerSizes: ['medium_19m3', 'large_25m3'],
    moveScope: 'all',
    storagePlacement: 'all',
    hubLocations: ['all'],
    discountPercent: 0,
    freeBlanketsCount: 10,
    freeLockIncluded: true,
    firstMonthFree: false,
    notes: 'Free Blankets, Free Lock',
    description: 'Complimentary furniture blankets + heavy-duty disc padlock ($60 value)',
    isPriceFreezeProtected: true,
    earlyTerminationClawbackEnabled: true,
  },
  // 2 and 3 months, then the 4–5, 6–8 and 9–11 month blocks
  ...DURATION_BLOCKS.filter((b) => b.minMonths >= 2 && b.minMonths < 12).map((b) => ({
    id: `dm-${b.minMonths}m-both`,
    name: `${b.label} Storage`,
    active: true,
    minMonths: b.minMonths,
    maxMonths: b.maxMonths,
    containerSizes: ['medium_19m3', 'large_25m3'] as ('medium_19m3' | 'large_25m3')[],
    moveScope: 'all' as const,
    storagePlacement: 'all' as const,
    hubLocations: ['all' as const],
    discountPercent: 0,
    freeBlanketsCount: 10,
    freeLockIncluded: true,
    firstMonthFree: true,
    notes: 'Free Blankets, Free Lock, 1st Mth Free',
    description: `1st Month Free + Complimentary blankets & disc lock (${b.label} commitment)`,
    isPriceFreezeProtected: true,
    earlyTerminationClawbackEnabled: true,
  })),
  // 12+ Months
  {
    id: 'dm-12m-both',
    name: '12+ Months Storage',
    active: true,
    minMonths: 12,
    maxMonths: undefined,
    containerSizes: ['medium_19m3', 'large_25m3'],
    moveScope: 'all',
    storagePlacement: 'all',
    hubLocations: ['all'],
    discountPercent: 0,
    freeBlanketsCount: 10,
    freeLockIncluded: true,
    firstMonthFree: false,
    milestoneDiscountAmount: 400,
    milestoneDiscountOption: '400B',
    notes: 'Free Blankets, Free Lock, 400A ($400 off 12 mth) or 400B ($200 off 6th mth / $200 off 12 mth)',
    description: 'Free Blankets, Free Lock + Milestone Credit ($400 total credit)',
    isPriceFreezeProtected: true,
    earlyTerminationClawbackEnabled: true,
  },
  // 7' container (Small) exempt rule
  {
    id: 'dm-7ft-exempt',
    name: "7' Small Container (Exempt)",
    active: true,
    minMonths: 0,
    maxMonths: undefined,
    containerSizes: ['small_10m3'],
    moveScope: 'all',
    storagePlacement: 'all',
    hubLocations: ['all'],
    discountPercent: 0,
    freeBlanketsCount: 0,
    freeLockIncluded: false,
    firstMonthFree: false,
    notes: 'No discounts',
    description: "7' small containers are exempt from promotional duration discounts",
    isPriceFreezeProtected: true,
    earlyTerminationClawbackEnabled: false,
  },
];

export interface DiscountMatrixCriteria {
  months: number;
  containerSize: ContainerSizeId;
  serviceType: ServiceType;
  isInterstate: boolean;
  storagePlacement: 'my_place' | 'facility';
  hub: MetroHub;
  annualOption?: AnnualMilestoneOption;
  billingCycle?: BillingCycle;
  baseMonthlyRate: number;
  /** Containers that earn perks (all but 10 m³). The $400 credit is per container. */
  eligibleContainerCount?: number;
  upfrontDiscounts?: UpfrontDiscountSettings;
}

export interface DiscountMatrixEvaluationResult {
  matchedRule?: DiscountMatrixRule;
  discountPercent: number;
  firstMonthFree: boolean;
  firstMonthSavings: number;
  freeBlanketsCount: number;
  freeLockIncluded: boolean;
  freeSuppliesRetailValue: number;
  milestoneDiscountAmount: number;
  milestoneDiscountOption?: AnnualMilestoneOption;
  reason: string;
  notes?: string;
  isPriceFreezeProtected: boolean;
  earlyTerminationWarning?: string;
}

export function evaluateDiscountMatrix(
  criteria: DiscountMatrixCriteria,
  rules: DiscountMatrixRule[] = DEFAULT_DISCOUNT_MATRIX_RULES,
  suppliesConfig?: PackingSuppliesConfig
): DiscountMatrixEvaluationResult {
  const {
    months,
    containerSize,
    isInterstate,
    storagePlacement,
    hub,
    annualOption = '400B',
    billingCycle = 'monthly',
    baseMonthlyRate,
  } = criteria;

  // 1. 7' Small Container Rule: "7': No discounts"
  if (containerSize === 'small_10m3') {
    return {
      discountPercent: 0,
      firstMonthFree: false,
      firstMonthSavings: 0,
      freeBlanketsCount: 0,
      freeLockIncluded: false,
      freeSuppliesRetailValue: 0,
      milestoneDiscountAmount: 0,
      reason: "7' containers: Standard rate (exempt from promotional duration discounts)",
      notes: 'No discounts',
      isPriceFreezeProtected: true,
    };
  }

  // 2. Prepayment percentage stacking:
  // - Monthly Ongoing: No discount
  // - 6 months upfront then monthly: 5% off
  // - 12 months upfront then monthly: 10% off
  const upfrontPercent = getUpfrontDiscountPercent(billingCycle, criteria.upfrontDiscounts);
  const eligibleContainers = Math.max(1, Math.floor(criteria.eligibleContainerCount || 1));

  const effectiveRules = rules && rules.length > 0 ? rules : DEFAULT_DISCOUNT_MATRIX_RULES;

  // Filter rules by active status and matching dimensions
  const matchingRules = effectiveRules.filter((r) => {
    if (r.active === false) return false;

    // Container size match (2 x 25 m³ bundle is matched as large_25m3)
    if (r.containerSizes && r.containerSizes.length > 0) {
      const sizeForMatch = containerSize === 'two_large_50m3' ? 'large_25m3' : containerSize;
      if (!r.containerSizes.includes(sizeForMatch as any)) {
        return false;
      }
    }

    // Move scope match (local vs interstate)
    if (r.moveScope && r.moveScope !== 'all') {
      if (r.moveScope === 'interstate' && !isInterstate) return false;
      if (r.moveScope === 'local' && isInterstate) return false;
    }

    // Storage placement match (my_place vs facility)
    if (r.storagePlacement && r.storagePlacement !== 'all') {
      if (r.storagePlacement !== storagePlacement) return false;
    }

    // Hub location match
    if (r.hubLocations && r.hubLocations.length > 0 && !r.hubLocations.includes('all')) {
      if (!r.hubLocations.includes(hub)) return false;
    }

    // Duration match
    if (r.maxMonths !== undefined) {
      if (months < r.minMonths || months > r.maxMonths) {
        return false;
      }
    } else {
      if (months < r.minMonths) {
        return false;
      }
    }

    return true;
  });

  // Pick best matching rule (prioritizing specific hub/placement rules, then highest minMonths)
  let matchedRule: DiscountMatrixRule | undefined = undefined;
  if (matchingRules.length > 0) {
    matchingRules.sort((a, b) => {
      const aSpecificHub = a.hubLocations && !a.hubLocations.includes('all') ? 1 : 0;
      const bSpecificHub = b.hubLocations && !b.hubLocations.includes('all') ? 1 : 0;
      if (bSpecificHub !== aSpecificHub) return bSpecificHub - aSpecificHub;

      const aSpecificPlace = a.storagePlacement !== 'all' ? 1 : 0;
      const bSpecificPlace = b.storagePlacement !== 'all' ? 1 : 0;
      if (bSpecificPlace !== aSpecificPlace) return bSpecificPlace - aSpecificPlace;

      return b.minMonths - a.minMonths;
    });
    matchedRule = matchingRules[0];
  }

  // Extract benefits
  const firstMonthFree = Boolean(matchedRule?.firstMonthFree);
  const firstMonthSavings = firstMonthFree ? baseMonthlyRate : 0;
  const freeBlanketsCount = matchedRule?.freeBlanketsCount || 0;
  const freeLockIncluded = Boolean(matchedRule?.freeLockIncluded);
  // Valued at the price list (blanket hire per month, padlock sale price), not fixed $15/$35
  const freeSuppliesRetailValue = Math.round(
    (freeBlanketsCount * getBlanketUnitValue(suppliesConfig)) + (freeLockIncluded ? getLockUnitValue(suppliesConfig) : 0)
  );

  let milestoneDiscountAmount = 0;
  let milestoneDiscountOption: AnnualMilestoneOption | undefined = undefined;

  if (months >= 12 || (matchedRule && matchedRule.minMonths >= 12)) {
    // $400 per container that earns perks
    milestoneDiscountAmount = (matchedRule?.milestoneDiscountAmount || 400) * eligibleContainers;
    milestoneDiscountOption = annualOption;
  }

  const stackedPercent = Math.min(100, (matchedRule?.discountPercent || 0) + upfrontPercent);

  // Build descriptive reason
  const reasons: string[] = [];
  if (firstMonthFree) reasons.push('1st Month Free');
  if (freeBlanketsCount > 0) reasons.push(`${freeBlanketsCount} Free Blankets`);
  if (freeLockIncluded) reasons.push('Free Disc Padlock');
  if (milestoneDiscountAmount > 0) {
    if (milestoneDiscountOption === '400B') {
      reasons.push(`$${formatMoney(milestoneDiscountAmount / 2)} Off Month 6 + $${formatMoney(milestoneDiscountAmount / 2)} Off Month 12 (Option 400B)`);
    } else {
      reasons.push(`$${formatMoney(milestoneDiscountAmount)} Off Month 12 (Option 400A)`);
    }
  }
  if (upfrontPercent > 0) {
    reasons.push(`${upfrontPercent}% Prepayment Upfront Discount`);
  }

  const reason = reasons.length > 0 ? reasons.join(' · ') : 'Standard rate (no active discounts)';
  const earlyTerminationWarning = (firstMonthFree || milestoneDiscountAmount > 0 || freeSuppliesRetailValue > 0)
    ? `Duration discount commitment: Completing your committed duration is required. If storage ends earlier than ${months} month(s), waived promotional amounts will be billed on the final invoice.`
    : undefined;

  return {
    matchedRule,
    discountPercent: stackedPercent,
    firstMonthFree,
    firstMonthSavings,
    freeBlanketsCount,
    freeLockIncluded,
    freeSuppliesRetailValue,
    milestoneDiscountAmount,
    milestoneDiscountOption,
    reason,
    notes: matchedRule?.notes,
    isPriceFreezeProtected: matchedRule?.isPriceFreezeProtected !== false,
    earlyTerminationWarning,
  };
}

export function calculateEarlyTerminationClawback(params: {
  committedMonths: number;
  actualMonthsCompleted: number;
  monthlyStorageRate: number;
  firstMonthWasFree?: boolean;
  freeBlanketsProvided?: number;
  freeLockProvided?: boolean;
  milestoneDiscountApplied?: number;
  suppliesConfig?: PackingSuppliesConfig;
}): EarlyTerminationResult {
  const {
    committedMonths,
    actualMonthsCompleted,
    monthlyStorageRate,
    firstMonthWasFree = false,
    freeBlanketsProvided = 0,
    freeLockProvided = false,
    milestoneDiscountApplied = 0,
  } = params;

  if (actualMonthsCompleted >= committedMonths) {
    return {
      isViolation: false,
      committedMonths,
      actualMonthsCompleted,
      totalClawbackAmount: 0,
      itemizedClawbacks: [],
      revisedFinalBalanceDue: 0,
      customerNotificationText: 'Storage duration requirement fulfilled. All applied discounts and promotional allowances remain intact.',
    };
  }

  const itemizedClawbacks: { item: string; waivedValue: number; reason: string }[] = [];
  let totalClawback = 0;

  // 1. Waived 1st month storage fee
  if (firstMonthWasFree && committedMonths >= 2) {
    itemizedClawbacks.push({
      item: 'Waived 1st Month Storage Fee Reversal',
      waivedValue: monthlyStorageRate,
      reason: `Storage concluded at ${actualMonthsCompleted} month(s), terminating before the ${committedMonths}-month commitment.`,
    });
    totalClawback += monthlyStorageRate;
  }

  // 2. Free supplies retail adjustment if vacated under 1 month
  if (actualMonthsCompleted < 1) {
    if (freeBlanketsProvided > 0) {
      const val = Math.round(freeBlanketsProvided * getBlanketUnitValue(params.suppliesConfig) * 100) / 100;
      itemizedClawbacks.push({
        item: `Complimentary Furniture Blankets (${freeBlanketsProvided} units)`,
        waivedValue: val,
        reason: 'Terminated storage prior to minimum 1 month duration.',
      });
      totalClawback += val;
    }
    if (freeLockProvided) {
      const lockValue = getLockUnitValue(params.suppliesConfig);
      itemizedClawbacks.push({
        item: 'Complimentary Heavy-Duty Disc Padlock',
        waivedValue: lockValue,
        reason: 'Terminated storage prior to minimum 1 month duration.',
      });
      totalClawback += lockValue;
    }
  }

  // 3. Milestone credit reversal
  if (milestoneDiscountApplied > 0) {
    itemizedClawbacks.push({
      item: 'Annual Milestone Storage Credit Reversal',
      waivedValue: milestoneDiscountApplied,
      reason: `Terminated storage at month ${actualMonthsCompleted} before completing the 12-month commitment.`,
    });
    totalClawback += milestoneDiscountApplied;
  }

  const customerNotificationText = `Notice of Duration Discount Reversal: Your original booking received $${totalClawback.toFixed(2)} in promotional incentives under a ${committedMonths}-month commitment. Because storage concluded at month ${actualMonthsCompleted}, the unearned promotional allowance ($${totalClawback.toFixed(2)}) has been added to your final settlement invoice in accordance with Portabox terms.`;

  return {
    isViolation: true,
    committedMonths,
    actualMonthsCompleted,
    totalClawbackAmount: totalClawback,
    itemizedClawbacks,
    revisedFinalBalanceDue: totalClawback,
    customerNotificationText,
  };
}

export const DEFAULT_DURATION_DISCOUNTS: DurationDiscountTier[] = [
  {
    id: 'tier-3mo-all',
    months: 3,
    discountPercent: 10,
    label: '3 Months (10% OFF)',
    serviceType: 'all',
    moveScope: 'all',
    storageLocation: 'all',
    applyMode: 'upfront_monthly',
    description: '10% discount on 3+ months duration across all services',
    active: true,
  },
  {
    id: 'tier-6mo-all',
    months: 6,
    discountPercent: 20,
    label: '6 Months (20% OFF)',
    serviceType: 'all',
    moveScope: 'all',
    storageLocation: 'all',
    applyMode: 'upfront_monthly',
    description: '20% discount on 6+ months duration across all services',
    active: true,
  },
  {
    id: 'tier-12mo-all',
    months: 12,
    discountPercent: 30,
    label: '12 Months (30% OFF)',
    serviceType: 'all',
    moveScope: 'all',
    storageLocation: 'all',
    applyMode: 'upfront_monthly',
    description: '30% discount on 12+ months duration across all services',
    active: true,
  },
  {
    id: 'tier-6mo-completion',
    months: 6,
    discountPercent: 25,
    label: '6 Months Completion Reward (25% OFF Remaining Charges)',
    serviceType: 'moving_storage',
    moveScope: 'all',
    storageLocation: 'facility',
    applyMode: 'on_completion_remaining_charges',
    description: 'Complete 6 months storage and receive 25% discount credited to remaining charges',
    active: true,
  },
];

export interface DurationDiscountCriteria {
  months: number;
  serviceType?: ServiceType;
  isInterstate?: boolean;
  storagePlacement?: 'my_place' | 'facility';
}

/**
 * Calculates duration discount based on customer duration and booking context.
 * Evaluates admin-configured tiers matching service type, move scope, storage location, and duration.
 * Rule: Customer durations default to discount closest to the custom duration that is associated with shorter time period.
 */
export function getDurationDiscount(
  criteriaOrMonths: number | DurationDiscountCriteria,
  tiers: DurationDiscountTier[] = DEFAULT_DURATION_DISCOUNTS
): {
  discountPercent: number;
  matchedTier?: DurationDiscountTier;
  reason: string;
  applyMode: 'upfront_monthly' | 'on_completion_remaining_charges';
  completionBonusDollars?: number;
  freeBlanketsCount?: number;
} {
  const criteria: DurationDiscountCriteria =
    typeof criteriaOrMonths === 'number'
      ? { months: criteriaOrMonths }
      : criteriaOrMonths;

  const months = criteria.months;
  if (!months || months <= 0) {
    return { discountPercent: 0, reason: 'Standard rate', applyMode: 'upfront_monthly', freeBlanketsCount: 0 };
  }

  const effectiveTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_DURATION_DISCOUNTS;

  // Filter tiers by active status and matching multi-condition criteria
  const matchingTiers = effectiveTiers.filter((t) => {
    if (t.active === false) return false;
    if (t.months > months) return false;

    // Service type filter
    if (t.serviceType && t.serviceType !== 'all') {
      if (criteria.serviceType && t.serviceType !== criteria.serviceType) {
        return false;
      }
    }

    // Move scope filter (local vs interstate)
    if (t.moveScope && t.moveScope !== 'all') {
      const isInterstate = Boolean(criteria.isInterstate);
      if (t.moveScope === 'interstate' && !isInterstate) return false;
      if (t.moveScope === 'local' && isInterstate) return false;
    }

    // Storage location filter (facility / portabox location vs my_place / customer location)
    if (t.storageLocation && t.storageLocation !== 'all') {
      const placement = criteria.storagePlacement || 'facility';
      if (t.storageLocation !== placement) return false;
    }

    return true;
  });

  if (matchingTiers.length === 0) {
    return { discountPercent: 0, reason: 'Standard rate (< 3 months duration)', applyMode: 'upfront_monthly', freeBlanketsCount: 0 };
  }

  // Sort matching tiers by:
  // 1. Highest months threshold (closest to custom duration associated with shorter time period)
  // 2. Upfront monthly discounts before on-completion rewards, so a completion reward never
  //    replaces an immediate discount at the same threshold (which raised the monthly rate)
  // 3. Highest discountPercent (best savings for customer)
  matchingTiers.sort((a, b) => {
    if (b.months !== a.months) {
      return b.months - a.months;
    }
    const aCompletion = a.applyMode === 'on_completion_remaining_charges' ? 1 : 0;
    const bCompletion = b.applyMode === 'on_completion_remaining_charges' ? 1 : 0;
    if (aCompletion !== bCompletion) return aCompletion - bCompletion;
    return b.discountPercent - a.discountPercent;
  });

  const matched = matchingTiers[0];
  const applyMode = matched.applyMode || 'upfront_monthly';
  const freeBlanketsCount = matched.freeBlanketsCount || 0;

  let reason = '';
  if (applyMode === 'on_completion_remaining_charges') {
    reason = `${matched.discountPercent}% completion discount applied to remaining charges upon completing ${matched.months}+ months${freeBlanketsCount > 0 ? ` + ${freeBlanketsCount} Free Blankets` : ''}`;
  } else {
    reason = matched.months === months
      ? `${matched.discountPercent}% duration discount (${matched.months} months)${freeBlanketsCount > 0 ? ` + ${freeBlanketsCount} Free Blankets` : ''}`
      : `${matched.discountPercent}% duration discount (${months} months duration uses ${matched.months}-month tier)${freeBlanketsCount > 0 ? ` + ${freeBlanketsCount} Free Blankets` : ''}`;
  }

  return {
    discountPercent: matched.discountPercent,
    matchedTier: matched,
    reason,
    applyMode,
    freeBlanketsCount,
  };
}

export const DEFAULT_LOCATION_PRICING: Record<MetroHub, LocationPricingConfig> = {
  Adelaide: {
    hub: 'Adelaide',
    depotId: 'adelaide',
    depotName: 'Adelaide Depot (Edinburgh North)',
    containerPrices: {
      small_10m3: { monthlyRate: 209, weeklyRate: 69 },
      medium_19m3: { monthlyRate: 219, weeklyRate: 75 },
      large_25m3: { monthlyRate: 219, weeklyRate: 75 },
    },
    onsiteContainerPrices: {
      small_10m3: { monthlyRate: 149, weeklyRate: 49 },
      medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
      large_25m3: { monthlyRate: 179, weeklyRate: 65 },
    },
    deliveryZones: { ...DEFAULT_DELIVERY_ZONES },
  },
  Sydney: {
    hub: 'Sydney',
    depotId: 'sydney',
    depotName: 'Sydney Depot (Blacktown)',
    containerPrices: {
      small_10m3: { monthlyRate: 209, weeklyRate: 69 },
      medium_19m3: { monthlyRate: 219, weeklyRate: 75 },
      large_25m3: { monthlyRate: 219, weeklyRate: 75 },
    },
    onsiteContainerPrices: {
      small_10m3: { monthlyRate: 159, weeklyRate: 52 },
      medium_19m3: { monthlyRate: 179, weeklyRate: 62 },
      large_25m3: { monthlyRate: 189, weeklyRate: 69 },
    },
    deliveryZones: { ...DEFAULT_DELIVERY_ZONES },
  },
  Melbourne: {
    hub: 'Melbourne',
    depotId: 'melbourne',
    depotName: 'Melbourne Depot (Laverton North)',
    containerPrices: {
      small_10m3: { monthlyRate: 209, weeklyRate: 69 },
      medium_19m3: { monthlyRate: 219, weeklyRate: 75 },
      large_25m3: { monthlyRate: 219, weeklyRate: 75 },
    },
    onsiteContainerPrices: {
      small_10m3: { monthlyRate: 149, weeklyRate: 49 },
      medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
      large_25m3: { monthlyRate: 179, weeklyRate: 65 },
    },
    deliveryZones: { ...DEFAULT_DELIVERY_ZONES },
  },
  Brisbane: {
    hub: 'Brisbane',
    depotId: 'brisbane',
    depotName: 'Brisbane Depot (Gilberton)',
    containerPrices: {
      small_10m3: { monthlyRate: 209, weeklyRate: 69 },
      medium_19m3: { monthlyRate: 219, weeklyRate: 75 },
      large_25m3: { monthlyRate: 219, weeklyRate: 75 },
    },
    onsiteContainerPrices: {
      small_10m3: { monthlyRate: 149, weeklyRate: 49 },
      medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
      large_25m3: { monthlyRate: 179, weeklyRate: 65 },
    },
    deliveryZones: { ...DEFAULT_DELIVERY_ZONES },
  },
};

export const DEFAULT_INTERSTATE_RATES_BY_SIZE: Record<string, InterstateRoutePricing> = {
  'Adelaide->Melbourne': { small_10m3: 1190, medium_19m3: 1350, large_25m3: 1500 },
  'Adelaide->Sydney': { small_10m3: 1990, medium_19m3: 2250, large_25m3: 2500 },
  'Adelaide->Brisbane': { small_10m3: 2790, medium_19m3: 3150, large_25m3: 3500 },
  'Melbourne->Adelaide': { small_10m3: 1290, medium_19m3: 1450, large_25m3: 1600 },
  'Melbourne->Sydney': { small_10m3: 1520, medium_19m3: 1710, large_25m3: 1900 },
  'Melbourne->Brisbane': { small_10m3: 2320, medium_19m3: 2610, large_25m3: 2900 },
  'Sydney->Adelaide': { small_10m3: 2160, medium_19m3: 2430, large_25m3: 2700 },
  'Sydney->Brisbane': { small_10m3: 1840, medium_19m3: 2070, large_25m3: 2300 },
  'Sydney->Melbourne': { small_10m3: 1680, medium_19m3: 1890, large_25m3: 2100 },
  'Brisbane->Adelaide': { small_10m3: 2790, medium_19m3: 3150, large_25m3: 3500 },
  'Brisbane->Melbourne': { small_10m3: 2320, medium_19m3: 2610, large_25m3: 2900 },
  'Brisbane->Sydney': { small_10m3: 1840, medium_19m3: 2070, large_25m3: 2300 },
};

export function getInterstateRatesForRoute(
  config: AppConfig,
  route: string
): InterstateRoutePricing {
  const bySize = config.interstateRatesBySize?.[route];
  if (bySize) {
    return {
      small_10m3: Number(bySize.small_10m3),
      medium_19m3: Number(bySize.medium_19m3),
      large_25m3: Number(bySize.large_25m3),
    };
  }
  const defBySize = DEFAULT_INTERSTATE_RATES_BY_SIZE[route];
  const flatRate = config.interstateRates?.[route];
  if (defBySize && flatRate === undefined) {
    return { ...defBySize };
  }
  const base25 = flatRate ?? defBySize?.large_25m3 ?? 2500;
  return {
    small_10m3: defBySize?.small_10m3 ?? Math.round(base25 * 0.8),
    medium_19m3: defBySize?.medium_19m3 ?? Math.round(base25 * 0.9),
    large_25m3: base25,
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  phone: '1800 467 637',
  enablePromoBanner: false, // 10. Top Announcement Banner (Staff Only / CEO Selected) - Feature flag (Off by default)
  lockTopBannerOnScroll: true,
  promoBannerSlogan: 'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE',
  quoteValidityDays: 30,
  rateLockDurationMonths: 12,
  annualPriceAdjustmentCapPercent: 10,
  containerPrices: {
    small_10m3: {
      monthlyRate: 209,
      weeklyRate: 69,
    },
    medium_19m3: {
      monthlyRate: 219,
      weeklyRate: 75,
    },
    large_25m3: {
      monthlyRate: 219,
      weeklyRate: 75,
    },
  },
  onsiteContainerPrices: {
    small_10m3: {
      monthlyRate: 149,
      weeklyRate: 49,
    },
    medium_19m3: {
      monthlyRate: 169,
      weeklyRate: 59,
    },
    large_25m3: {
      monthlyRate: 179,
      weeklyRate: 65,
    },
  },
  locationPricing: DEFAULT_LOCATION_PRICING,
  packingSupplies: DEFAULT_PACKING_SUPPLIES,
  insurance: DEFAULT_CONTAINER_INSURANCE,
  domesticLegFee: 149,
  fuelSurchargeRatePerKm: 0.50,
  fuelSurchargeEnabled: true,
  fuelSurchargeModel: 'per_zone',
  fuelSurchargeZoneRates: { ...DEFAULT_FUEL_SURCHARGE_ZONE_RATES },
  deliveryZones: { ...DEFAULT_DELIVERY_ZONES },
  interstateRates: {
    'Adelaide->Melbourne': 1500,
    'Adelaide->Sydney': 2500,
    'Adelaide->Brisbane': 3500,
    'Melbourne->Adelaide': 1600,
    'Melbourne->Sydney': 1900,
    'Melbourne->Brisbane': 2900,
    'Sydney->Adelaide': 2700,
    'Sydney->Brisbane': 2300,
    'Sydney->Melbourne': 2100,
    // Symmetrical / reverse defaults for Brisbane
    'Brisbane->Adelaide': 3500,
    'Brisbane->Melbourne': 2900,
    'Brisbane->Sydney': 2300,
  },
  interstateRatesBySize: { ...DEFAULT_INTERSTATE_RATES_BY_SIZE },
  promotions: [
    {
      id: 'promo-free-delivery-zone1',
      name: 'Free Initial Delivery Special',
      code: 'FREEDEL',
      description: 'Free initial delivery to your address for bookings this month',
      type: 'free_initial_delivery',
      value: 100,
      targetLocations: ['All'],
      serviceTypes: ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-50-first-month',
      name: '50% Off First Month Storage',
      code: 'HALFPRICE',
      description: 'Get 50% off your first month storage rent',
      type: 'percent_off_first_month',
      value: 50,
      targetLocations: ['All'],
      serviceTypes: ['storage_onsite', 'storage_portabox_site'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-exclusive-melbourne-20ft',
      name: 'Melbourne 20ft Exclusive Special',
      code: 'MELB20FT',
      description: 'Exclusive $75 discount for 20ft container moves & storage in Melbourne (replaces duration discount)',
      type: 'fixed_discount',
      value: 75,
      targetLocations: ['Melbourne'],
      serviceTypes: ['storage_onsite', 'storage_portabox_site', 'local_moving'],
      containerSize: '20ft',
      isExclusive: true,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-sydney-local-move',
      name: 'Sydney Local Move $60 Off',
      code: 'SYDMOVE',
      description: '$60 off local moves in Sydney Metro',
      type: 'fixed_discount',
      value: 60,
      targetLocations: ['Sydney'],
      serviceTypes: ['local_moving'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-onsite-storage-25',
      name: 'Onsite Yard Storage 25% Off',
      code: 'ONSITE25',
      description: '25% off first period storage when keeping container onsite at your place',
      type: 'percent_off_first_month',
      value: 25,
      targetLocations: ['All'],
      serviceTypes: ['storage_onsite'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-save-50',
      name: '$50 Instant Quote Voucher',
      code: 'SAVE50',
      description: '$50 off your first payment',
      type: 'fixed_discount',
      value: 50,
      targetLocations: ['All'],
      serviceTypes: ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-save-100',
      name: '$100 Booking Bonus Voucher',
      code: 'SAVE100',
      description: '$100 off your first payment',
      type: 'fixed_discount',
      value: 100,
      targetLocations: ['All'],
      serviceTypes: ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-adelaide-brisbane-50',
      name: '50% Off Adelaide to Brisbane Moves',
      code: 'QLD50',
      description: '50% off interstate transit between Adelaide and Brisbane',
      type: 'percent_off_interstate',
      value: 50,
      targetHubOrigin: 'Adelaide',
      targetHubDestination: 'Brisbane',
      targetLocations: ['Adelaide', 'Brisbane'],
      serviceTypes: ['interstate_moving'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: true,
    },
    {
      id: 'promo-one-month-free-long-term',
      name: 'One Month Free Storage (12+ Mo)',
      code: 'YEARFREE',
      description: 'Pay for 11 months, get the 12th month completely free',
      type: 'free_first_month',
      value: 100,
      minDurationMonths: 12,
      targetLocations: ['All'],
      serviceTypes: ['storage_onsite', 'storage_portabox_site'],
      containerSize: 'all',
      isExclusive: false,
      active: true,
      autoApply: false,
    },
    {
      id: 'promo-free-upgrade',
      name: 'Free Upgrade to 25 m³ Container',
      code: 'BIGBOX',
      description: 'Get a 25 m³ container for the price of a 19 m³ container',
      type: 'free_container_upgrade',
      value: 10,
      targetLocations: ['All'],
      serviceTypes: ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
      containerSize: '20ft',
      isExclusive: false,
      active: false,
      autoApply: false,
    },
  ],
  durationDiscounts: [...DEFAULT_DURATION_DISCOUNTS],
  discountMatrixRules: [...DEFAULT_DISCOUNT_MATRIX_RULES],
  upfrontDiscounts: { ...DEFAULT_UPFRONT_DISCOUNTS },
  blockedPostcodes: [
    { postcode: '5222', suburb: 'Kingscote (Kangaroo Island)', reason: 'Ferry required; contact special transport logistics.' },
    { postcode: '2899', suburb: 'Norfolk Island', reason: 'Offshore territory not serviced by road freight.' },
    { postcode: '7151', suburb: 'Southport TAS', reason: 'Tasmania service pending depot launch.' },
    { postcode: '6947', suburb: 'Wangara DC (WA)', reason: 'PO box / mail-centre postcode; no street delivery address.' },
    { postcode: '6958', suburb: 'Royal Australian Navy Warships (WA)', reason: 'Defence vessel mail postcode; not a deliverable address.' },
    { postcode: '6965', suburb: 'Bibra Lake DC (WA)', reason: 'PO box / mail-centre postcode; residential Bibra Lake is 6163.' },
  ],
  depotCalendars: DEFAULT_DEPOT_CALENDARS,
  // 9 Staged Features (Off by default, CEO controlled)
  enableSoftphone: false,
  enableCustomerPortal: false,
  enableHeaderCallButton: false, // Call button on top panel inactive - only show number
  enablePhoneCallIntake: false,
  enableCustomersLedger: false,
  enableSmartsheetYardDispatch: false,
  enableCallCenterDispatch: false,
  enableDropOffFunnelAnalytics: false,
  enableFieldAssetsLogistics: false,
  enableContainerInventory: true,
  enableSelectWeeks: false, // Feature flag: off by default; admin can activate in Admin Portal
  twoWeeksStorageRate: 199, // Standard rate for 2 weeks storage across Small, Med, Large
  enableMovingCartons: false, // Feature flag: off by default (Portabox does not provide moving cartons at the moment)
  enableQuoteBooking: false, // Feature flag: off by default (staff booking from a frozen quote)
  enableNextStepsFlow: false, // Feature flag: off by default (post-quote Next Steps & self-booking flow)
  enableLivePhoneQuoteSimulator: false, // Feature flag: off by default (Live Phone Quote Simulator on the Price Matrix page)
  enableEarlyTerminationClawback: false, // Feature flag: off by default (Early Termination Clawback Engine admin panel)
  enableEcoEfficiencyIncentive: true,
  enableDrivewayFitGuarantee: false, // Feature flag: deactivated by default; admin can reactivate in Admin Portal
  enableGoogleCalendarLink: false, // Feature flag: deactivated by default (turned off for now); admin can toggle in Admin Portal
  efficiencyDiscountPercentage: 20,
  ecoIncentiveType: 'dollar_discount',
  businessHours: { ...DEFAULT_BUSINESS_HOURS_CONFIG },
  postcodeServiceTiers: { ...DEFAULT_POSTCODE_SERVICE_TIERS },
  locationBusinessHours: { ...DEFAULT_LOCATION_SERVICE_HOURS },
};

export const CONTAINER_SPECS = {
  small_10m3: {
    volume: '10 m³',
    name: '10 m³ Portabox',
    length: '2.1m',
    width: '2.1m',
    height: '2.4m',
    floorSpace: '4.4 m²',
    doorClearance: '1.80 m (W) × 2.10 m (H)',
    approxFit: '1 bedroom apartment · Queen bed, sofa, fridge, 30–40 boxes',
  },
  medium_19m3: {
    volume: '19 m³',
    name: '19 m³ Portabox',
    length: '3.6m',
    width: '2.4m',
    height: '2.4m',
    floorSpace: '8.6 m²',
    doorClearance: '2.10 m (W) × 2.10 m (H)',
    approxFit: '2 bedroom home · 2 beds, dining suite, living room, 60–80 boxes',
  },
  large_25m3: {
    volume: '25 m³',
    name: '25 m³ Portabox',
    length: '4.8m',
    width: '2.4m',
    height: '2.4m',
    floorSpace: '11.5 m²',
    doorClearance: '2.10 m (W) × 2.10 m (H)',
    approxFit: '3 bedroom family home · 3 beds, lounge, outdoor set, 100–120 boxes',
  },
  two_large_50m3: {
    volume: '50 m³ (2 x 25 m³)',
    name: '50 m³ (2 x 25 m³)',
    length: '2 × 4.8m',
    width: '2.4m',
    height: '2.4m',
    floorSpace: '23.0 m²',
    doorClearance: 'Dual large access doors',
    approxFit: '5 bedroom expansive home · 36 to 50 m³ contents',
  },
};

/**
 * Box Pricing Calculator:
 * Individual: $2.50 each
 * 10 boxes: $20
 * 50 boxes: $40
 * 100 boxes: $70
 */
export function calculateBoxPrice(count: number, config?: PackingSuppliesConfig): number {
  if (count <= 0) return 0;
  const single = config?.boxSinglePrice ?? 2.5;
  const p10Rate = config?.box10Price ?? 20;
  const p50Rate = config?.box50Price ?? 40;
  const p100Rate = config?.box100Price ?? 70;

  if (count === 10) return p10Rate;
  if (count === 50) return p50Rate;
  if (count === 100) return p100Rate;

  let total = 0;
  let rem = count;

  // 100 packs
  const p100 = Math.floor(rem / 100);
  total += p100 * p100Rate;
  rem %= 100;

  // 50 pack
  if (rem >= 50) {
    total += p50Rate;
    rem -= 50;
  }

  // 10 packs
  if (rem >= 20 && rem < 50) {
    const tens = Math.floor(rem / 10);
    total += tens * p10Rate;
    rem %= 10;
  } else if (rem >= 10) {
    total += p10Rate;
    rem -= 10;
  }

  // singles capped at 10-pack price
  const singles = Math.min(rem * single, p10Rate);
  total += singles;

  return Math.round(total * 100) / 100;
}

/**
 * Blanket Rental Pricing Calculator:
 * Individual: $2.00 each
 * 10 blankets: $20
 * 50 blankets: $40
 * 100 blankets: $70
 */
export function calculateBlanketPrice(count: number, config?: PackingSuppliesConfig): number {
  if (count <= 0) return 0;
  const single = config?.blanketSinglePrice ?? 2.0;
  const p10Rate = config?.blanket10Price ?? 20;
  const p50Rate = config?.blanket50Price ?? 40;
  const p100Rate = config?.blanket100Price ?? 70;

  if (count === 10) return p10Rate;
  if (count === 50) return p50Rate;
  if (count === 100) return p100Rate;

  let total = 0;
  let rem = count;

  const p100 = Math.floor(rem / 100);
  total += p100 * p100Rate;
  rem %= 100;

  if (rem >= 50) {
    total += p50Rate;
    rem -= 50;
  }

  if (rem >= 20 && rem < 50) {
    const tens = Math.floor(rem / 10);
    total += tens * p10Rate;
    rem %= 10;
  } else if (rem >= 10) {
    total += p10Rate;
    rem -= 10;
  }

  const singles = Math.min(rem * single, p10Rate);
  total += singles;

  return Math.round(total * 100) / 100;
}

/**
 * Blanket Rental Pricing with Free Allowance:
 * Free rental on blankets for first 10 (or admin set number) per container,
 * then price per 10 blankets per month after this ($25/mo per 10-blanket block).
 */
export function calculateBlanketRentalPrice(
  blanketsCount: number,
  /** Containers that get free blanket rental: 12' and 16' only (7' / 10 m³ get none, Dan 16 Nov). */
  containerCount: number = 1,
  config?: PackingSuppliesConfig,
  extraFreeAllowance: number = 0
): {
  totalFee: number;
  freeCount: number;
  chargeableCount: number;
  blocksCount: number;
  freeAllowance: number;
  bonusFreeCount: number;
} {
  const freePerContainer = config?.freeBlanketsPerContainer ?? 10;
  const standardFreeAllowance = freePerContainer * Math.max(0, Math.floor(containerCount || 0));
  // The promotional "Free Blankets" (e.g. 10 with the 1st-month-free package) are the same blankets as the
  // standard per-container allowance, not extra ones; only a promo allowance larger than the standard adds blankets.
  const promoAllowance = Math.max(0, extraFreeAllowance || 0);
  const freeAllowance = Math.max(standardFreeAllowance, promoAllowance);
  const bonusFreeCount = freeAllowance - standardFreeAllowance;

  if (config?.isAllBlanketsFreePromo) {
    return {
      totalFee: 0,
      freeCount: blanketsCount,
      chargeableCount: 0,
      blocksCount: 0,
      freeAllowance,
      bonusFreeCount,
    };
  }

  if (blanketsCount <= freeAllowance) {
    return {
      totalFee: 0,
      freeCount: blanketsCount,
      chargeableCount: 0,
      blocksCount: 0,
      freeAllowance,
      bonusFreeCount,
    };
  }

  const chargeableCount = blanketsCount - freeAllowance;
  const blockSize = config?.blanketBlockSize ?? 10;
  const blockPrice = config?.blanketBlockPriceMonthly ?? 25;
  const blocksCount = Math.ceil(chargeableCount / blockSize);
  const totalFee = blocksCount * blockPrice;

  return {
    totalFee,
    freeCount: freeAllowance,
    chargeableCount,
    blocksCount,
    freeAllowance,
    bonusFreeCount,
  };
}

/**
 * Heavy-Duty Disc Padlock Sales Calculator:
 * Admin can adjust price of locks or offer free to incentivise container sales.
 */
export function calculateLockSalesPrice(
  locksCount: number,
  config?: PackingSuppliesConfig,
  /** Free locks included (one per container). `true` means 1, for older callers. */
  freeLockBonus: boolean | number = false
): {
  totalPrice: number;
  unitPrice: number;
  isFreePromo: boolean;
  savings: number;
} {
  const unitPrice = config?.lockPrice ?? 20;
  const isGlobalFree = Boolean(config?.isLockFreePromo);
  if (isGlobalFree) {
    const count = Math.max(1, locksCount);
    return {
      totalPrice: 0,
      unitPrice,
      isFreePromo: true,
      savings: count * unitPrice,
    };
  }
  const freeLocks = freeLockBonus === true ? 1 : Math.max(0, Math.floor(Number(freeLockBonus) || 0));
  if (freeLocks > 0) {
    // Free locks only count for locks actually taken; extra locks are paid
    const freeTaken = Math.min(freeLocks, Math.max(0, locksCount));
    const chargeableLocks = Math.max(0, locksCount - freeTaken);
    return {
      totalPrice: chargeableLocks * unitPrice,
      unitPrice,
      isFreePromo: freeTaken > 0,
      savings: freeTaken * unitPrice,
    };
  }
  if (locksCount <= 0) {
    return { totalPrice: 0, unitPrice, isFreePromo: false, savings: 0 };
  }
  return {
    totalPrice: locksCount * unitPrice,
    unitPrice,
    isFreePromo: false,
    savings: 0,
  };
}

/**
 * Container Protection Option (CPO / Insurance) Calculator:
 * Monthly insurance per container (default $15/mo).
 * Admin can offer free insurance to incentivise container sales.
 */
export function calculateInsuranceMonthlyFee(
  selected: boolean,
  containerCount: number = 1,
  config?: ContainerInsuranceConfig
): {
  monthlyFee: number;
  monthlyRatePerContainer: number;
  isFreePromo: boolean;
  promoSavingsMonthly: number;
} {
  const monthlyRatePerContainer = config?.monthlyPricePerContainer ?? 15;
  const isFreePromo = Boolean(config?.isFreePromo);
  const count = Math.max(1, containerCount);

  if (!selected) {
    return {
      monthlyFee: 0,
      monthlyRatePerContainer,
      isFreePromo,
      promoSavingsMonthly: 0,
    };
  }

  if (isFreePromo) {
    return {
      monthlyFee: 0,
      monthlyRatePerContainer,
      isFreePromo: true,
      promoSavingsMonthly: monthlyRatePerContainer * count,
    };
  }

  return {
    monthlyFee: monthlyRatePerContainer * count,
    monthlyRatePerContainer,
    isFreePromo: false,
    promoSavingsMonthly: 0,
  };
}

/**
 * Container Protection Option (CPO / COO) Plan Calculator:
 * - CPO: Content Protection Option ($15/mo per container, covers container & contents up to $5,000 max per container). Mandatory for interstate.
 * - COO: Container Only Option ($10/mo per container, covers container loss/damage only; $0 contents cover). Onsite only.
 * - None: Declined ($0/mo, customer assumes risk or uses own insurance).
 */
export function calculateProtectionPlanFee(
  plan: ProtectionPlanType,
  containerCount: number = 1,
  config?: ContainerInsuranceConfig
): {
  plan: ProtectionPlanType;
  planName: string;
  monthlyFee: number;
  monthlyRatePerContainer: number;
  coverageAmount: number;
  isFreePromo: boolean;
  promoSavingsMonthly: number;
} {
  const count = Math.max(1, containerCount);
  const isFreePromo = Boolean(config?.isFreePromo);
  const cpoRate = config?.monthlyPricePerContainer ?? 15;
  const cooRate = config?.cooMonthlyPricePerContainer ?? 10;
  const maxCpoCoverage = config?.coverageAmountPerContainer ?? 5000;

  if (plan === 'cpo_coo') {
    // CPO (contents) and COO (container) stack: both monthly fees apply
    const monthlyRate = isFreePromo ? 0 : cpoRate + cooRate;
    return {
      plan: 'cpo_coo',
      planName: 'Contents Protection Option (CPO) + Container Only Option (COO)',
      monthlyFee: monthlyRate * count,
      monthlyRatePerContainer: cpoRate + cooRate,
      coverageAmount: maxCpoCoverage * count,
      isFreePromo,
      promoSavingsMonthly: isFreePromo ? (cpoRate + cooRate) * count : 0,
    };
  }

  if (plan === 'cpo') {
    const monthlyRate = isFreePromo ? 0 : cpoRate;
    return {
      plan: 'cpo',
      planName: 'Contents Protection Option (CPO)',
      monthlyFee: monthlyRate * count,
      monthlyRatePerContainer: cpoRate,
      coverageAmount: maxCpoCoverage * count,
      isFreePromo,
      promoSavingsMonthly: isFreePromo ? cpoRate * count : 0,
    };
  }

  if (plan === 'coo') {
    const monthlyRate = isFreePromo ? 0 : cooRate;
    return {
      plan: 'coo',
      planName: 'Container Only Option (COO)',
      monthlyFee: monthlyRate * count,
      monthlyRatePerContainer: cooRate,
      coverageAmount: 0,
      isFreePromo,
      promoSavingsMonthly: isFreePromo ? cooRate * count : 0,
    };
  }

  return {
    plan: 'none',
    planName: 'No Protection (Declined)',
    monthlyFee: 0,
    monthlyRatePerContainer: 0,
    coverageAmount: 0,
    isFreePromo: false,
    promoSavingsMonthly: 0,
  };
}

const STORAGE_KEY_CONFIG = 'portabox_app_config_v7';
const STORAGE_KEY_LEADS = 'portabox_customer_leads_v5';
const STORAGE_KEY_DROPOFFS = 'portabox_drop_offs_v1';

/**
 * Monthly/weekly container rental table that applies to a booking, by the origin depot:
 * - onsite rate: storage at the customer's place, and direct local moves (the container stays at the
 *   customer's addresses and never comes back to the depot for storage)
 * - interstate rate: jobs starting at this depot and finishing at another depot, charged at this
 *   origin depot's interstate rate for the whole job
 * - facility rate: storage at the Portabox location, incl. local moves with interim storage
 */
export function getContainerRentalPrices(
  config: AppConfig,
  originHub: MetroHub,
  opts: { isOnsite: boolean; isInterstate: boolean; serviceType?: ServiceType }
): NonNullable<LocationPricingConfig['onsiteContainerPrices']> {
  const loc = getLocationPricingForHub(config, originHub);
  const isDirectLocalMove = opts.serviceType === 'moving' && !opts.isInterstate;
  if (opts.isOnsite || isDirectLocalMove) {
    return loc.onsiteContainerPrices || config.onsiteContainerPrices || {
      small_10m3: { monthlyRate: 149, weeklyRate: 49 },
      medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
      large_25m3: { monthlyRate: 179, weeklyRate: 65 },
    };
  }
  if (opts.isInterstate) {
    return loc.interstateContainerPrices || loc.containerPrices;
  }
  return loc.containerPrices;
}

export function getLocationPricingForHub(config: AppConfig, hub: MetroHub): LocationPricingConfig {
  const normalizedHub: MetroHub = ((hub as string) === 'Brisbane/Gold Coast' ? 'Brisbane' : hub) as MetroHub;
  const loc = config.locationPricing?.[normalizedHub] || (config.locationPricing as any)?.['Brisbane/Gold Coast'];
  const defaultLoc = DEFAULT_LOCATION_PRICING[normalizedHub] || DEFAULT_LOCATION_PRICING.Adelaide;
  if (loc) {
    return {
      ...defaultLoc,
      ...loc,
      hub: normalizedHub,
      containerPrices: {
        ...defaultLoc.containerPrices,
        ...(loc.containerPrices || {}),
      },
      onsiteContainerPrices: {
        ...defaultLoc.onsiteContainerPrices,
        ...(loc.onsiteContainerPrices || {}),
      },
      // Interstate rates default to this depot's facility rates until set in the tariff grid
      interstateContainerPrices: {
        ...defaultLoc.containerPrices,
        ...(loc.containerPrices || {}),
        ...(loc.interstateContainerPrices || {}),
      },
      deliveryZones: {
        ...DEFAULT_DELIVERY_ZONES,
        ...(defaultLoc.deliveryZones || {}),
        ...(loc.deliveryZones || {}),
      },
    };
  }
  return {
    ...defaultLoc,
    hub: normalizedHub,
    containerPrices: config.containerPrices || DEFAULT_CONFIG.containerPrices,
    onsiteContainerPrices: config.onsiteContainerPrices || DEFAULT_CONFIG.onsiteContainerPrices,
    deliveryZones: config.deliveryZones || DEFAULT_DELIVERY_ZONES,
  };
}

export function loadAppConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    return normalizeAppConfig(JSON.parse(raw));
  } catch (err) {
    console.error('Failed to load config from storage, using defaults:', err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Turns a saved config (browser or server copy) into a complete AppConfig: defaults fill
 * anything missing or added since it was saved. The server uses this for its own quotes.
 */
export function normalizeAppConfig(parsed: any): AppConfig {
  if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG;
  try {

    // Normalize keys & sanitize corrupt rates (e.g. 112)
    // Prices are kept exactly as entered ($0 included); defaults only fill prices that were never saved.
    const isPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    const rawSmall = parsed.containerPrices?.small_10m3 || parsed.containerPrices?.small_7ft;
    const smallMonthly = isPrice(rawSmall?.monthlyRate) ? rawSmall.monthlyRate : DEFAULT_CONFIG.containerPrices.small_10m3.monthlyRate;
    const smallWeekly = isPrice(rawSmall?.weeklyRate) ? rawSmall.weeklyRate : DEFAULT_CONFIG.containerPrices.small_10m3.weeklyRate;

    const containerPrices = {
      small_10m3: { monthlyRate: smallMonthly, weeklyRate: smallWeekly },
      medium_19m3: parsed.containerPrices?.medium_19m3 || parsed.containerPrices?.medium_12ft || DEFAULT_CONFIG.containerPrices.medium_19m3,
      large_25m3: parsed.containerPrices?.large_25m3 || parsed.containerPrices?.large_16ft || DEFAULT_CONFIG.containerPrices.large_25m3,
    };

    const onsiteContainerPrices = {
      small_10m3: parsed.onsiteContainerPrices?.small_10m3 || DEFAULT_CONFIG.onsiteContainerPrices?.small_10m3 || { monthlyRate: 149, weeklyRate: 49 },
      medium_19m3: parsed.onsiteContainerPrices?.medium_19m3 || DEFAULT_CONFIG.onsiteContainerPrices?.medium_19m3 || { monthlyRate: 169, weeklyRate: 59 },
      large_25m3: parsed.onsiteContainerPrices?.large_25m3 || DEFAULT_CONFIG.onsiteContainerPrices?.large_25m3 || { monthlyRate: 179, weeklyRate: 65 },
    };

    const deliveryZones: DeliveryZoneSettings = {
      ...DEFAULT_DELIVERY_ZONES,
      ...(parsed.deliveryZones || {}),
    };

    const hubs: MetroHub[] = ['Adelaide', 'Sydney', 'Melbourne', 'Brisbane'];
    const locationPricing = {} as Record<MetroHub, LocationPricingConfig>;
    hubs.forEach((hub) => {
      const savedLoc = parsed.locationPricing?.[hub] || (hub === 'Brisbane' ? parsed.locationPricing?.['Brisbane/Gold Coast'] : undefined);
      const defaultLoc = DEFAULT_LOCATION_PRICING[hub];

      const savedSmallMonthly = savedLoc?.containerPrices?.small_10m3?.monthlyRate;
      const effectiveSmallMonthly = isPrice(savedSmallMonthly)
        ? savedSmallMonthly
        : defaultLoc.containerPrices.small_10m3.monthlyRate;
      const savedSmallWeekly = savedLoc?.containerPrices?.small_10m3?.weeklyRate;

      locationPricing[hub] = {
        hub,
        depotId: savedLoc?.depotId || defaultLoc.depotId,
        depotName: savedLoc?.depotName || defaultLoc.depotName,
        containerPrices: {
          small_10m3: {
            monthlyRate: effectiveSmallMonthly,
            weeklyRate: isPrice(savedSmallWeekly) ? savedSmallWeekly : defaultLoc.containerPrices.small_10m3.weeklyRate,
          },
          medium_19m3: savedLoc?.containerPrices?.medium_19m3 || defaultLoc.containerPrices.medium_19m3,
          large_25m3: savedLoc?.containerPrices?.large_25m3 || defaultLoc.containerPrices.large_25m3,
        },
        onsiteContainerPrices: {
          small_10m3: savedLoc?.onsiteContainerPrices?.small_10m3 || defaultLoc.onsiteContainerPrices?.small_10m3 || onsiteContainerPrices.small_10m3,
          medium_19m3: savedLoc?.onsiteContainerPrices?.medium_19m3 || defaultLoc.onsiteContainerPrices?.medium_19m3 || onsiteContainerPrices.medium_19m3,
          large_25m3: savedLoc?.onsiteContainerPrices?.large_25m3 || defaultLoc.onsiteContainerPrices?.large_25m3 || onsiteContainerPrices.large_25m3,
        },
        ...(savedLoc?.interstateContainerPrices ? { interstateContainerPrices: savedLoc.interstateContainerPrices } : {}),
        deliveryZones: {
          ...DEFAULT_DELIVERY_ZONES,
          ...(defaultLoc.deliveryZones || {}),
          ...(savedLoc?.deliveryZones || {}),
        },
      };
    });

    const mergedInterstateRates = {
      ...DEFAULT_CONFIG.interstateRates,
      ...(parsed.interstateRates || {}),
    };
    const interstateRatesBySize: Record<string, InterstateRoutePricing> = {};
    Object.keys(DEFAULT_INTERSTATE_RATES_BY_SIZE).forEach((route) => {
      const savedBySize = parsed.interstateRatesBySize?.[route];
      const defBySize = DEFAULT_INTERSTATE_RATES_BY_SIZE[route];
      const fallback25 = mergedInterstateRates[route] ?? defBySize.large_25m3;
      interstateRatesBySize[route] = {
        small_10m3: savedBySize?.small_10m3 ?? defBySize.small_10m3,
        medium_19m3: savedBySize?.medium_19m3 ?? defBySize.medium_19m3,
        large_25m3: savedBySize?.large_25m3 ?? fallback25,
      };
    });

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      promoBannerSlogan: parsed.promoBannerSlogan !== undefined ? parsed.promoBannerSlogan : DEFAULT_CONFIG.promoBannerSlogan,
      containerPrices,
      onsiteContainerPrices,
      locationPricing,
      packingSupplies: {
        ...DEFAULT_PACKING_SUPPLIES,
        ...(parsed.packingSupplies || {}),
      },
      insurance: {
        ...DEFAULT_CONTAINER_INSURANCE,
        ...(parsed.insurance || {}),
      },
      fuelSurchargeRatePerKm: parsed.fuelSurchargeRatePerKm !== undefined ? Number(parsed.fuelSurchargeRatePerKm) : DEFAULT_CONFIG.fuelSurchargeRatePerKm,
      fuelSurchargeEnabled: parsed.fuelSurchargeEnabled !== undefined ? Boolean(parsed.fuelSurchargeEnabled) : DEFAULT_CONFIG.fuelSurchargeEnabled,
      fuelSurchargeModel: (parsed.fuelSurchargeModel === 'per_zone' ? 'per_zone' : 'per_km') as FuelSurchargeModel,
      fuelSurchargeZoneRates: {
        ...DEFAULT_FUEL_SURCHARGE_ZONE_RATES,
        ...(parsed.fuelSurchargeZoneRates || {}),
      },
      deliveryZones,
      interstateRates: mergedInterstateRates,
      interstateRatesBySize,
      promotions: parsed.promotions || DEFAULT_CONFIG.promotions,
      durationDiscounts: Array.isArray(parsed.durationDiscounts) && parsed.durationDiscounts.length > 0
        ? parsed.durationDiscounts
        : [...DEFAULT_DURATION_DISCOUNTS],
      upfrontDiscounts: { ...DEFAULT_UPFRONT_DISCOUNTS, ...(parsed.upfrontDiscounts || {}) },
      discountMatrixRules: Array.isArray(parsed.discountMatrixRules) && parsed.discountMatrixRules.length > 0
        ? removeSubMonthRules(parsed.discountMatrixRules)
        : [...DEFAULT_DISCOUNT_MATRIX_RULES],
      blockedPostcodes: parsed.blockedPostcodes || DEFAULT_CONFIG.blockedPostcodes,
      depotCalendars: parsed.depotCalendars || DEFAULT_DEPOT_CALENDARS,
      // 9 Staged Features (Off by default, CEO controlled)
      enableSoftphone: Boolean(parsed.enableSoftphone),
      enableCustomerPortal: Boolean(parsed.enableCustomerPortal),
      enableHeaderCallButton: Boolean(parsed.enableHeaderCallButton),
      enablePhoneCallIntake: Boolean(parsed.enablePhoneCallIntake),
      enableCustomersLedger: Boolean(parsed.enableCustomersLedger),
      enableSmartsheetYardDispatch: Boolean(parsed.enableSmartsheetYardDispatch),
      enableCallCenterDispatch: Boolean(parsed.enableCallCenterDispatch),
      enableDropOffFunnelAnalytics: Boolean(parsed.enableDropOffFunnelAnalytics),
      enableFieldAssetsLogistics: Boolean(parsed.enableFieldAssetsLogistics),
      enablePromoBanner: Boolean(parsed.enablePromoBanner), // 10. Top Announcement Banner (Staff Only / CEO Selected)
      enableContainerInventory: parsed.enableContainerInventory !== undefined ? Boolean(parsed.enableContainerInventory) : DEFAULT_CONFIG.enableContainerInventory,
      enableSelectWeeks: false,
      twoWeeksStorageRate: parsed.twoWeeksStorageRate !== undefined ? Number(parsed.twoWeeksStorageRate) : 199,
      enableMovingCartons: parsed.enableMovingCartons !== undefined ? Boolean(parsed.enableMovingCartons) : false,
      enableQuoteBooking: parsed.enableQuoteBooking === true,
      enableNextStepsFlow: parsed.enableNextStepsFlow !== undefined ? Boolean(parsed.enableNextStepsFlow) : false,
      enableLivePhoneQuoteSimulator: parsed.enableLivePhoneQuoteSimulator !== undefined ? Boolean(parsed.enableLivePhoneQuoteSimulator) : false,
      enableEarlyTerminationClawback: parsed.enableEarlyTerminationClawback !== undefined ? Boolean(parsed.enableEarlyTerminationClawback) : false,
      enableEcoEfficiencyIncentive: parsed.enableEcoEfficiencyIncentive !== undefined ? Boolean(parsed.enableEcoEfficiencyIncentive) : DEFAULT_CONFIG.enableEcoEfficiencyIncentive,
      enableDrivewayFitGuarantee: parsed.enableDrivewayFitGuarantee !== undefined ? Boolean(parsed.enableDrivewayFitGuarantee) : false,
      enableGoogleCalendarLink: parsed.enableGoogleCalendarLink !== undefined ? Boolean(parsed.enableGoogleCalendarLink) : false,
      efficiencyDiscountPercentage: parsed.efficiencyDiscountPercentage !== undefined ? Number(parsed.efficiencyDiscountPercentage) : DEFAULT_CONFIG.efficiencyDiscountPercentage,
      ecoIncentiveType: parsed.ecoIncentiveType === 'emissions_only' ? 'emissions_only' : 'dollar_discount',
      quoteValidityDays: parsed.quoteValidityDays !== undefined ? Number(parsed.quoteValidityDays) : DEFAULT_CONFIG.quoteValidityDays,
      rateLockDurationMonths: parsed.rateLockDurationMonths !== undefined ? Number(parsed.rateLockDurationMonths) : DEFAULT_CONFIG.rateLockDurationMonths,
      annualPriceAdjustmentCapPercent: parsed.annualPriceAdjustmentCapPercent !== undefined ? Number(parsed.annualPriceAdjustmentCapPercent) : DEFAULT_CONFIG.annualPriceAdjustmentCapPercent,
      containerAdjustmentCaps: parsed.containerAdjustmentCaps || undefined,
      businessHours: {
        ...DEFAULT_BUSINESS_HOURS_CONFIG,
        ...(parsed.businessHours || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load config from storage, using defaults:', err);
    return DEFAULT_CONFIG;
  }
}

/** Called after every admin save, so the config can also be sent to the server (see adminSettingsSync). */
let appConfigSaveListener: ((config: AppConfig) => void) | null = null;
export function setAppConfigSaveListener(fn: ((config: AppConfig) => void) | null): void {
  appConfigSaveListener = fn;
}

/** Writes the config to this browser only (used when loading the server's copy). */
export function saveAppConfigLocally(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

/** Saves the admin config in this browser and on the server, so every customer and staff member gets it. */
export function saveAppConfig(config: AppConfig): void {
  saveAppConfigLocally(config);
  appConfigSaveListener?.(config);
}

export function loadCustomerLeads(): CustomerLead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEADS);
    if (!raw) {
      const seed: CustomerLead[] = [
        {
          id: 'lead-1790678000',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          firstName: 'Sarah',
          mobile: '0412 345 678',
          email: 'sarah.j@example.com.au',
          agreedToContact: true,
          status: 'New',
          smsSent: true,
          emailSent: true,
          notes: ['Quote generated online. Interested in Hyde Park storage.'],
          quote: {
            containerSize: 'large_25m3',
            containerCount: 1,
            containerName: '25 m³ Portabox',
            containerVolume: '25 m³',
            containerDimensions: CONTAINER_SPECS.large_25m3,
            serviceType: 'storage_at_place',
            billingCycle: 'monthly',
            storageDuration: '4_to_11_months',
            preferredDate: 'Wed 14 Oct 2026',
            originPostcode: {
              postcode: '5061',
              suburb: 'Hyde Park',
              state: 'SA',
              lat: -34.9542,
              lng: 138.6019,
              region: 'Adelaide',
            },
            originDepot: {
              id: 'adelaide',
              name: 'Adelaide Depot',
              address: '10 Barfield Crescent',
              suburb: 'Edinburgh North',
              postcode: '5113',
              state: 'SA',
              lat: -34.7077,
              lng: 138.6836,
              phone: '1800 467 637',
            },
            originDistanceKm: 28,
            deliveryZone: 1,
            isInterstate: false,
            kmRatePerKm: 0,
            kmTotalCharge: 0,
            requiresCallForPricing: false,
            monthlyContainerRate: 219,
            weeklyContainerRate: 75,
            monthlyRatePerContainer: 219,
            weeklyRatePerContainer: 75,
            storageRateFormatted: '$219 /month',
            storagePricingText: '$219 /month',
            domesticLegFeePerContainer: 149,
            deliveryPricingText: '$149 per one-way leg',
            fuelSurchargeRatePerKm: 0.50,
            fuelSurchargeAmount: 0,
            fuelSurchargePerContainer: 0,
            isFuelSurchargeIncluded: false,
            fuelSurchargeModel: 'per_km',
            fuelSurchargeZoneRates: DEFAULT_FUEL_SURCHARGE_ZONE_RATES,
            deferredFuelSurchargeAmount: 0,
            totalEstimatedFuelSurcharge: 0,
            distanceCalculationMethod: 'driving_distance',
            packingSupplies: {
              boxesCount: 10,
              boxesPrice: 20,
              blanketsCount: 10,
              blanketsPrice: 20,
              totalSuppliesPrice: 40,
            },
            initialDeliveryFee: 149,
            collectionFeeEstimate: 149,
            firstPaymentTotal: 408,
            monthlyStorageFee: 219,
            weeklyStorageFee: 75,
            currentPeriodicStorageFee: 219,
            legs: [
              {
                label: 'Delivery to Hyde Park',
                description: 'Drop off empty container to your driveway',
                fee: 149,
                isPayableNow: true,
              },
              {
                label: "Collection when you're done",
                description: 'Payable at the end of storage',
                fee: 149,
                isPayableNow: false,
              },
            ],
            appliedPromotions: [],
            totalDiscount: 0,
            summaryText: '1 x 25 m³ Portabox · Storage at your place · 4 to 11 months · Adelaide Zone 1',
            smsPreviewText: "Hi Sarah, here's your Portabox quote: 25 m³ container at Hyde Park, $219/month, delivery $149, first payment $408. Full breakdown: portabox.au/q/7K2M. Reply here with any questions, or reply BOOK to lock in Wed 14 Oct.",
          },
        },
      ];
      saveCustomerLeads(seed);
      return seed;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load customer leads:', err);
    return [];
  }
}

export function saveCustomerLeads(leads: CustomerLead[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
  } catch (err) {
    console.error('Failed to save customer leads:', err);
  }
}

export function loadDropOffRecords(): QuoteDropOffRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DROPOFFS);
    if (!raw) {
      // Seed a few realistic drop-off logs for admin demonstration
      const seedDropOffs: QuoteDropOffRecord[] = [
        {
          id: 'drop-101',
          sessionId: 'sess-84920',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          lastPageStep: 3,
          lastPageName: 'Page 3: Which Size (Container Selection)',
          originSuburb: 'Unley',
          originPostcode: '5061',
          serviceType: 'storage_at_place',
          containerSize: 'large_25m3',
          containerCount: 1,
          completed: false,
        },
        {
          id: 'drop-102',
          sessionId: 'sess-84921',
          timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
          lastPageStep: 4,
          lastPageName: 'Page 4: When (Duration & Billing)',
          originSuburb: 'Norwood',
          originPostcode: '5067',
          serviceType: 'moving',
          destinationSuburb: 'Brighton',
          destinationPostcode: '5048',
          containerSize: 'medium_19m3',
          containerCount: 1,
          storageDuration: '1_to_3_months',
          billingCycle: 'monthly',
          completed: false,
        },
        {
          id: 'drop-103',
          sessionId: 'sess-84922',
          timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
          lastPageStep: 5,
          lastPageName: 'Page 5: Send Quote (Contact Details)',
          originSuburb: 'Glenelg',
          originPostcode: '5045',
          serviceType: 'storage_at_place',
          containerSize: 'large_25m3',
          containerCount: 2,
          storageDuration: '4_to_11_months',
          billingCycle: 'monthly',
          customerEmail: 'david.m@example.com',
          completed: false,
        },
      ];
      saveDropOffRecords(seedDropOffs);
      return seedDropOffs;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load drop-off records:', err);
    return [];
  }
}

export function saveDropOffRecords(records: QuoteDropOffRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DROPOFFS, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save drop-off records:', err);
  }
}

export function recordDropOffEvent(event: Omit<QuoteDropOffRecord, 'id' | 'timestamp'>): void {
  try {
    const existing = loadDropOffRecords();
    const index = existing.findIndex((r) => r.sessionId === event.sessionId);
    const updatedRecord: QuoteDropOffRecord = {
      id: index >= 0 ? existing[index].id : `drop-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    let nextList: QuoteDropOffRecord[];
    if (index >= 0) {
      nextList = [...existing];
      nextList[index] = updatedRecord;
    } else {
      nextList = [updatedRecord, ...existing];
    }
    // Cap at 100 recent sessions
    saveDropOffRecords(nextList.slice(0, 100));
  } catch (err) {
    console.error('Failed to record drop-off event:', err);
  }
}

export function getMetroHubForPostcode(record: PostcodeRecord, _enableSunshineCoast: boolean = false): MetroHub {
  if (record.state === 'SA') return 'Adelaide';
  if (record.state === 'VIC') return 'Melbourne';
  if (record.state === 'NSW' || record.state === 'ACT') return 'Sydney';
  if (record.state === 'QLD') {
    return 'Brisbane';
  }
  return 'Sydney';
}

/**
 * Check if a postcode is blocked by admin
 */
export function isPostcodeBlocked(
  postcode: string,
  config: AppConfig
): BlockedPostcode | null {
  const clean = postcode.trim();
  const found = config.blockedPostcodes.find((b) => b.postcode === clean);
  return found || null;
}

// ---------------------------------------------------------------------------
// Per-size storage discounts. 10 m³ (small) containers are exempt from duration discounts and promotional
// perks (1st month free, free kit); medium and large containers get them, including in mixed bookings.
// Shared by calculateQuote and the Duration & Billing screen so both always agree.
// ---------------------------------------------------------------------------
export type StorageSizeId = 'small_10m3' | 'medium_19m3' | 'large_25m3';
const SIZE_LABELS: Record<StorageSizeId, string> = {
  small_10m3: '10 m³ Small',
  medium_19m3: '19 m³ Medium',
  large_25m3: '25 m³ Large',
};

/** Number of containers of each size on a booking (2 × 25 m³ bundle counts as 2 large). */
export function getBookedSizeCounts(
  containerSize: ContainerSizeId,
  containerCount: number,
  containerSelections?: Partial<Record<ContainerSizeId, number>>
): Record<StorageSizeId, number> {
  const sel = containerSelections || {};
  const small = sel.small_10m3 || 0;
  const medium = sel.medium_19m3 || 0;
  const large = (sel.large_25m3 || 0) + (sel.two_large_50m3 || 0) * 2;
  if (small + medium + large > 0) return { small_10m3: small, medium_19m3: medium, large_25m3: large };
  const count = Math.max(1, containerCount || 1);
  if (containerSize === 'small_10m3') return { small_10m3: count, medium_19m3: 0, large_25m3: 0 };
  if (containerSize === 'medium_19m3') return { small_10m3: 0, medium_19m3: count, large_25m3: 0 };
  if (containerSize === 'two_large_50m3') return { small_10m3: 0, medium_19m3: 0, large_25m3: 2 };
  return { small_10m3: 0, medium_19m3: 0, large_25m3: count };
}

/** Size used for discount-matrix rules: the largest size booked (a small add-on doesn't exempt the booking). */
export function getMatrixContainerSize(
  counts: Record<StorageSizeId, number>,
  containerSize: ContainerSizeId
): ContainerSizeId {
  if (containerSize === 'two_large_50m3' && counts.small_10m3 === 0 && counts.medium_19m3 === 0) return 'two_large_50m3';
  if (counts.large_25m3 > 0) return 'large_25m3';
  if (counts.medium_19m3 > 0) return 'medium_19m3';
  return 'small_10m3';
}

export function calculateSizeDiscounts(params: {
  prices: Record<StorageSizeId, ContainerPriceConfig>;
  counts: Record<StorageSizeId, number>;
  durationDiscountPercent: number; // 0 when no upfront-monthly duration discount applies
  firstMonthFree: boolean; // matrix 1st month free (applies to non-small sizes only)
}) {
  const { prices, counts, durationDiscountPercent, firstMonthFree } = params;
  const lines: SizeDiscountLine[] = [];
  let listMonthly = 0;
  let listWeekly = 0;
  let exemptMonthly = 0;
  let exemptWeekly = 0;
  let durationDiscountAmount = 0;
  (['large_25m3', 'medium_19m3', 'small_10m3'] as StorageSizeId[]).forEach((sizeId) => {
    const count = counts[sizeId] || 0;
    if (count <= 0) return;
    const monthly = prices[sizeId].monthlyRate * count;
    const weekly = prices[sizeId].weeklyRate * count;
    listMonthly += monthly;
    listWeekly += weekly;
    const exempt = sizeId === 'small_10m3';
    if (exempt) {
      exemptMonthly += monthly;
      exemptWeekly += weekly;
    }
    const pct = exempt ? 0 : durationDiscountPercent;
    const off = Math.round(monthly * (pct / 100));
    durationDiscountAmount += off;
    const free = !exempt && firstMonthFree;
    lines.push({
      sizeId,
      label: SIZE_LABELS[sizeId],
      count,
      listMonthlyRate: monthly,
      durationDiscountPercent: pct,
      durationDiscountMonthly: off,
      firstMonthFree: free,
      hasDiscount: off > 0 || free,
    });
  });
  const eligibleMonthly = listMonthly - exemptMonthly;
  const effectiveMonthly = Math.max(0, listMonthly - durationDiscountAmount);
  // Value of the free first month (discounted rate of the non-small containers only)
  const freeMonthValue = firstMonthFree ? Math.max(0, eligibleMonthly - durationDiscountAmount) : 0;
  const effectiveWeekly =
    exemptWeekly + Math.round((listWeekly - exemptWeekly) * (1 - durationDiscountPercent / 100));
  return { lines, listMonthly, eligibleMonthly, exemptMonthly, durationDiscountAmount, effectiveMonthly, freeMonthValue, effectiveWeekly };
}

/** Upfront prepayment total: months at the discounted rate, minus any free first month, then the prepay discount. */
export function calculateUpfrontTotal(effectiveMonthly: number, months: number, freeMonthValue: number, factor: number): number {
  return Math.round((effectiveMonthly * months - freeMonthValue) * factor);
}

const roundCents = (n: number) => Math.round(n * 100) / 100;

/** Months of storage implied by the duration selection (storageDurationMonths wins when set). */
export function resolveDurationMonths(storageDurationMonths: number | undefined, storageDuration: StorageDuration): number {
  if (storageDurationMonths) return storageDurationMonths;
  if (storageDuration === '2_weeks') return 0.5;
  if (storageDuration === '1_to_3_months') return 1;
  if (storageDuration === '4_to_11_months') return 4;
  if (storageDuration === '12_plus_months') return 12;
  const match = storageDuration.match(/\d+/);
  const parsedNum = match ? parseInt(match[0], 10) : 1;
  return storageDuration.includes('week') ? parsedNum / 4.333 : parsedNum;
}

/** Dan (16 Nov): 6 months upfront needs 6+ months of storage; 12 months upfront needs 12+ months. */
export function isUpfrontCycleAllowed(cycle: BillingCycle | undefined, months: number): boolean {
  if (cycle === '6_months_upfront') return months >= 6;
  if (cycle === '12_months_upfront') return months >= 12;
  return true;
}

/**
 * The part of the 12+ month milestone credit that falls inside the prepaid months:
 * Option 400B pays half at month 6 and half at month 12; Option 400A pays it all at month 12.
 */
export function getMilestoneCreditInPeriod(
  prepaidMonths: number,
  milestoneAmount: number,
  option: AnnualMilestoneOption | undefined
): number {
  if (!milestoneAmount || milestoneAmount <= 0) return 0;
  if (prepaidMonths >= 12) return milestoneAmount;
  if (prepaidMonths >= 6 && option !== '400A') return milestoneAmount / 2;
  return 0;
}

export interface UpfrontBreakdown {
  /** Storage charged for the prepaid months, after the free month, milestone credit and upfront %. */
  storageTotal: number;
  /** Milestone credit taken off the prepaid storage. */
  milestoneCredit: number;
  /** Upfront % off the container rental portion. */
  storageUpfrontSaving: number;
  /** Upfront % off the initial delivery (incl. fuel levy). */
  deliveryUpfrontSaving: number;
}

/**
 * Dan (16 Nov) upfront pricing, e.g. 6 months upfront at 5% with Option 400B:
 *   container rental: ($219 × 6 − $200 credit) × 5% = $55.70
 *   initial delivery: ($109 + $5 fuel levy) × 5% = $5.70
 */
export function calculateUpfrontBreakdown(p: {
  effectiveMonthly: number;
  months: number;
  freeMonthValue: number;
  milestoneCredit: number;
  percent: number;
  initialDeliveryWithFuel: number;
}): UpfrontBreakdown {
  const base = Math.max(0, p.effectiveMonthly * p.months - p.freeMonthValue - p.milestoneCredit);
  const storageUpfrontSaving = roundCents(base * (p.percent / 100));
  return {
    storageTotal: roundCents(base - storageUpfrontSaving),
    milestoneCredit: p.milestoneCredit,
    storageUpfrontSaving,
    deliveryUpfrontSaving: roundCents(Math.max(0, p.initialDeliveryWithFuel) * (p.percent / 100)),
  };
}

/** Initial delivery fee payable now, including its fuel levy. */
export function getPayableNowDeliveryAmount(leg: { baseFee?: number; extraKmCharge?: number; fee: number; fuelSurcharge?: number } | undefined): number {
  if (!leg) return 0;
  const fee = leg.baseFee !== undefined ? leg.baseFee + (leg.extraKmCharge || 0) : leg.fee;
  return fee + (leg.fuelSurcharge || 0);
}

/**
 * Core Quote Calculation Engine
 */
export function calculateQuote(params: {
  originPostcode: PostcodeRecord;
  destinationPostcode?: PostcodeRecord;
  serviceType: ServiceType;
  storagePlacement?: 'my_place' | 'facility';
  containerSize: ContainerSizeId;
  containerCount?: number;
  containerSelections?: Record<ContainerSizeId, number>;
  totalVolumeM3?: number;
  billingCycle?: BillingCycle;
  storageDuration: StorageDuration;
  storageDurationMonths?: number;
  preferredDate: string;
  selectedSlot?: DeliverySlotWindow;
  boxesCount?: number;
  blanketsCount?: number;
  locksCount?: number;
  insuranceSelected?: boolean;
  protectionPlan?: ProtectionPlanType;
  appliedPromoCode?: string;
  includeFuelSurcharge?: boolean;
  originLogisticsMethod?: LogisticsMethod;
  destinationLogisticsMethod?: LogisticsMethod;
  annualDiscountOption?: AnnualMilestoneOption;
  config?: AppConfig;
}): QuoteBreakdown {
  const config = params.config || loadAppConfig();
  const {
    originPostcode,
    destinationPostcode,
    serviceType,
    containerSize,
    storageDuration,
    preferredDate,
    appliedPromoCode,
  } = params;

  const isOnsite = serviceType === 'storage_at_place' || params.storagePlacement === 'my_place';
  const originLogisticsMethod: LogisticsMethod = isOnsite ? 'home_delivery' : (params.originLogisticsMethod || 'home_delivery');
  const destinationLogisticsMethod: LogisticsMethod = isOnsite ? 'home_delivery' : (params.destinationLogisticsMethod || 'home_delivery');
  const isOriginDepot = originLogisticsMethod === 'depot_loading';
  const isDestDepot = destinationLogisticsMethod === 'depot_loading';

  // Determine billing cycle: If duration is '2_weeks', default to weekly. Otherwise use explicit cycle or monthly.
  const rawBillingCycle: BillingCycle =
    params.billingCycle || (storageDuration === '2_weeks' ? 'weekly' : 'monthly');
  const requestedBillingCycle: BillingCycle =
    config.enableSelectWeeks === false && rawBillingCycle === 'weekly' ? 'monthly' : rawBillingCycle;
  // Dan (16 Nov): upfront options need enough storage months; otherwise bill monthly
  const billingCycle: BillingCycle = isUpfrontCycleAllowed(
    requestedBillingCycle,
    resolveDurationMonths(params.storageDurationMonths, storageDuration)
  )
    ? requestedBillingCycle
    : 'monthly';
  const isWeekly = billingCycle === 'weekly';

  // 1. Closest depot & driving distance for origin (Road driving distance, not as the crow flies)
  const enableSunshineCoast = false;
  const { depot: originDepot, distanceKm: originDistanceKm } = findClosestDepot(
    originPostcode.lat,
    originPostcode.lng,
    originPostcode.postcode,
    enableSunshineCoast
  );

  // Resolve origin MetroHub and location-specific pricing configuration
  const originHub = getMetroHubForPostcode(originPostcode, enableSunshineCoast);
  const originLocConfig = getLocationPricingForHub(config, originHub);

  // 2. Zone determination (Zones A through E) based on depot driving distance for local delivery at this location
  const {
    zoneAMaxKm = 25,
    zoneABaseFee = 149,
    zoneARatePerKm = 0,
    zoneBMaxKm = 50,
    zoneBBaseFee = 179,
    zoneBRatePerKm = 0,
    zoneCMaxKm = 75,
    zoneCBaseFee = 219,
    zoneCRatePerKm = 0,
    zoneDMaxKm = 100,
    zoneDBaseFee = 249,
    zoneDRatePerKm = 0,
    zoneEBaseFee = 249,
    zoneERatePerKm = 5.0,
    zoneECallPricing = false,
  } = originLocConfig.deliveryZones;

  let deliveryZone: string = 'A';
  let deliveryZoneRangeLabel = `< ${zoneAMaxKm} km`;
  let zoneBaseDeliveryFee = zoneABaseFee;
  let kmRate = zoneARatePerKm;
  let requiresCallForPricing = false;

  if (originDistanceKm < zoneAMaxKm) {
    deliveryZone = 'A';
    deliveryZoneRangeLabel = `< ${zoneAMaxKm} km`;
    zoneBaseDeliveryFee = zoneABaseFee;
    kmRate = zoneARatePerKm;
  } else if (originDistanceKm < zoneBMaxKm) {
    deliveryZone = 'B';
    deliveryZoneRangeLabel = `< ${zoneBMaxKm} km`;
    zoneBaseDeliveryFee = zoneBBaseFee;
    kmRate = zoneBRatePerKm;
  } else if (originDistanceKm < zoneCMaxKm) {
    deliveryZone = 'C';
    deliveryZoneRangeLabel = `< ${zoneCMaxKm} km`;
    zoneBaseDeliveryFee = zoneCBaseFee;
    kmRate = zoneCRatePerKm;
  } else if (originDistanceKm <= zoneDMaxKm) {
    deliveryZone = 'D';
    deliveryZoneRangeLabel = `< ${zoneDMaxKm} km`;
    zoneBaseDeliveryFee = zoneDBaseFee;
    kmRate = zoneDRatePerKm;
  } else {
    deliveryZone = 'E';
    deliveryZoneRangeLabel = `> ${zoneDMaxKm} km`;
    zoneBaseDeliveryFee = zoneEBaseFee;
    kmRate = zoneERatePerKm;
    // If call pricing explicitly flagged AND no per-km rate is configured, require call
    if (zoneECallPricing && zoneERatePerKm === 0) {
      requiresCallForPricing = true;
    }
  }

  // Determine container count and volume: explicitly passed containerSelections, containerCount, or defaults
  const containerSelections = params.containerSelections;
  const selSmall = containerSelections?.small_10m3 || 0;
  const selMedium = containerSelections?.medium_19m3 || 0;
  const selLarge = (containerSelections?.large_25m3 || 0) + ((containerSelections?.two_large_50m3 || 0) * 2);
  const totalSelectedUnits = selSmall + selMedium + selLarge;
  const hasMixedOrSpecificSelections = totalSelectedUnits > 0;

  let containerCount = hasMixedOrSpecificSelections
    ? totalSelectedUnits
    : (params.containerCount && params.containerCount > 0 ? params.containerCount : 1);
  if (!hasMixedOrSpecificSelections && containerSize === 'two_large_50m3') {
    containerCount = 2;
  }

  const calculatedTotalVolumeM3 = params.totalVolumeM3 || (
    hasMixedOrSpecificSelections
      ? (selSmall * 10) + (selMedium * 19) + (selLarge * 25)
      : (containerSize === 'small_10m3' ? 10 * containerCount : containerSize === 'medium_19m3' ? 19 * containerCount : containerSize === 'two_large_50m3' ? 50 : 25 * containerCount)
  );

  // Depot delivery km charge: per km pricing can be set in addition to base prices for delivery.
  // For Zone E (distance > zoneDMaxKm), the $/km rate applies to distance exceeding the Zone D threshold.
  let kmTotalCharge = 0;
  if (kmRate > 0) {
    const billableKm = (deliveryZone === 'E' && originDistanceKm > zoneDMaxKm)
      ? (originDistanceKm - zoneDMaxKm)
      : originDistanceKm;
    kmTotalCharge = Math.round(billableKm * kmRate) * containerCount;
  }

  // 3. Moving road driving distance from origin to destination & destination Zone A–E determination
  let movingDistanceKm: number | undefined;
  // Dan (16 Nov): the move is charged on the truck's whole trip, depot -> home 1 -> home 2,
  // not just home 1 -> home 2 (e.g. 200 km out + 20 km move = 220 km, Zone E, not Zone A).
  let moveRouteKm: number | undefined;
  let movingDeliveryZone: string | undefined;
  let movingDeliveryZoneRangeLabel: string | undefined;
  let movingZoneBaseFeePerContainer = zoneBaseDeliveryFee;
  let movingKmRatePerContainer = 0;
  let movingKmCharge = 0;
  let destDeliveryZone = deliveryZone;
  let destZoneBaseFeePerContainer = zoneBaseDeliveryFee;
  let destKmChargeTotal = 0;
  let destDepotDistanceKm = 0;

  // Fuel surcharge configuration (fixed price per leg based on zones, or per km)
  const isFuelSurchargeIncluded = config.fuelSurchargeEnabled !== false;
  const fuelSurchargeRatePerKm = config.fuelSurchargeRatePerKm !== undefined ? config.fuelSurchargeRatePerKm : 0.50;

  // Initial delivery leg (Leg 1: empty container delivered to origin) fuel levy
  const initialLegFuel = calculateLegFuelSurcharge({
    zone: deliveryZone,
    distanceKm: originDistanceKm,
    containerCount,
    config,
  });
  let fuelSurchargePerContainer = isOriginDepot ? 0 : initialLegFuel.ratePerContainer;
  let fuelSurchargeAmount = isOriginDepot ? 0 : initialLegFuel.totalAmount;

  if (destinationPostcode) {
    const destHub = getMetroHubForPostcode(destinationPostcode, enableSunshineCoast);
    const destLocConfig = getLocationPricingForHub(config, destHub);
    const dz = destLocConfig.deliveryZones;

    const closestDest = findClosestDepot(
      destinationPostcode.lat,
      destinationPostcode.lng,
      destinationPostcode.postcode,
      enableSunshineCoast
    );
    destDepotDistanceKm = closestDest.distanceKm;

    let destKmRate = 0;
    if (destDepotDistanceKm < (dz.zoneAMaxKm ?? 25)) {
      destDeliveryZone = 'A';
      destZoneBaseFeePerContainer = dz.zoneABaseFee ?? 149;
      destKmRate = dz.zoneARatePerKm ?? 0;
    } else if (destDepotDistanceKm < (dz.zoneBMaxKm ?? 50)) {
      destDeliveryZone = 'B';
      destZoneBaseFeePerContainer = dz.zoneBBaseFee ?? 179;
      destKmRate = dz.zoneBRatePerKm ?? 0;
    } else if (destDepotDistanceKm < (dz.zoneCMaxKm ?? 75)) {
      destDeliveryZone = 'C';
      destZoneBaseFeePerContainer = dz.zoneCBaseFee ?? 219;
      destKmRate = dz.zoneCRatePerKm ?? 0;
    } else if (destDepotDistanceKm <= (dz.zoneDMaxKm ?? 100)) {
      destDeliveryZone = 'D';
      destZoneBaseFeePerContainer = dz.zoneDBaseFee ?? 249;
      destKmRate = dz.zoneDRatePerKm ?? 0;
    } else {
      destDeliveryZone = 'E';
      destZoneBaseFeePerContainer = dz.zoneEBaseFee ?? 249;
      destKmRate = dz.zoneERatePerKm ?? 5.0;
    }
    if (destKmRate > 0) {
      const destBillableKm = (destDeliveryZone === 'E' && destDepotDistanceKm > (dz.zoneDMaxKm ?? 100))
        ? (destDepotDistanceKm - (dz.zoneDMaxKm ?? 100))
        : destDepotDistanceKm;
      destKmChargeTotal = Math.round(destBillableKm * destKmRate) * containerCount;
    }

    // Exact road driving distance
    movingDistanceKm = calculateDrivingDistance(
      originPostcode.lat,
      originPostcode.lng,
      destinationPostcode.lat,
      destinationPostcode.lng,
      originPostcode.postcode,
      destinationPostcode.postcode
    );
    moveRouteKm = originDistanceKm + movingDistanceKm;

    if (moveRouteKm < zoneAMaxKm) {
      movingDeliveryZone = 'A';
      movingDeliveryZoneRangeLabel = `< ${zoneAMaxKm} km`;
      movingZoneBaseFeePerContainer = zoneABaseFee;
      movingKmRatePerContainer = zoneARatePerKm > 0 ? Math.round(moveRouteKm * zoneARatePerKm) : 0;
    } else if (moveRouteKm < zoneBMaxKm) {
      movingDeliveryZone = 'B';
      movingDeliveryZoneRangeLabel = `< ${zoneBMaxKm} km`;
      movingZoneBaseFeePerContainer = zoneBBaseFee;
      movingKmRatePerContainer = zoneBRatePerKm > 0 ? Math.round(moveRouteKm * zoneBRatePerKm) : 0;
    } else if (moveRouteKm < zoneCMaxKm) {
      movingDeliveryZone = 'C';
      movingDeliveryZoneRangeLabel = `< ${zoneCMaxKm} km`;
      movingZoneBaseFeePerContainer = zoneCBaseFee;
      movingKmRatePerContainer = zoneCRatePerKm > 0 ? Math.round(moveRouteKm * zoneCRatePerKm) : 0;
    } else if (moveRouteKm <= zoneDMaxKm) {
      movingDeliveryZone = 'D';
      movingDeliveryZoneRangeLabel = `< ${zoneDMaxKm} km`;
      movingZoneBaseFeePerContainer = zoneDBaseFee;
      movingKmRatePerContainer = zoneDRatePerKm > 0 ? Math.round(moveRouteKm * zoneDRatePerKm) : 0;
    } else {
      movingDeliveryZone = 'E';
      movingDeliveryZoneRangeLabel = `> ${zoneDMaxKm} km`;
      movingZoneBaseFeePerContainer = zoneEBaseFee;
      const movingBillableKm = moveRouteKm > zoneDMaxKm ? (moveRouteKm - zoneDMaxKm) : moveRouteKm;
      movingKmRatePerContainer = zoneERatePerKm > 0 ? Math.round(movingBillableKm * zoneERatePerKm) : 0;
      if (zoneECallPricing && zoneERatePerKm === 0) {
        requiresCallForPricing = true;
      }
    }

    // Extra delivery charge per km is assessed per container if multiple containers
    movingKmCharge = movingKmRatePerContainer * containerCount;
  }

  // 4. Interstate detection & rates by container size
  let isInterstate = false;
  let interstateRouteName: string | undefined;
  let interstateFee = 0; // total interstate line-haul fee
  let interstateFeePerContainer = 0;
  let interstateSizeRateDesc = '';

  if (destinationPostcode) {
    const destHub = getMetroHubForPostcode(destinationPostcode, enableSunshineCoast);
    if (originHub !== destHub) {
      isInterstate = true;
      interstateRouteName = `${originHub}->${destHub}`;
      const routeRates = getInterstateRatesForRoute(config, interstateRouteName);
      if (hasMixedOrSpecificSelections) {
        interstateFee = (selSmall * routeRates.small_10m3) +
                        (selMedium * routeRates.medium_19m3) +
                        (selLarge * routeRates.large_25m3);
        interstateFeePerContainer = Math.round(interstateFee / containerCount);
        const parts: string[] = [];
        if (selSmall > 0) parts.push(`${selSmall} × 10m³ ($${routeRates.small_10m3})`);
        if (selMedium > 0) parts.push(`${selMedium} × 19m³ ($${routeRates.medium_19m3})`);
        if (selLarge > 0) parts.push(`${selLarge} × 25m³ ($${routeRates.large_25m3})`);
        interstateSizeRateDesc = `Interstate freight: ${parts.join(' + ')} = $${interstateFee}`;
      } else if (containerSize === 'small_10m3') {
        interstateFeePerContainer = routeRates.small_10m3;
        interstateFee = interstateFeePerContainer * containerCount;
        interstateSizeRateDesc = `10 m³ container rate: $${interstateFeePerContainer}${containerCount > 1 ? ` × ${containerCount} = $${interstateFee}` : ''}`;
      } else if (containerSize === 'medium_19m3') {
        interstateFeePerContainer = routeRates.medium_19m3;
        interstateFee = interstateFeePerContainer * containerCount;
        interstateSizeRateDesc = `19 m³ container rate: $${interstateFeePerContainer}${containerCount > 1 ? ` × ${containerCount} = $${interstateFee}` : ''}`;
      } else if (containerSize === 'two_large_50m3') {
        interstateFeePerContainer = routeRates.large_25m3;
        interstateFee = interstateFeePerContainer * 2;
        interstateSizeRateDesc = `2 × 25 m³ containers ($${interstateFeePerContainer} × 2 = $${interstateFee})`;
      } else {
        interstateFeePerContainer = routeRates.large_25m3;
        interstateFee = interstateFeePerContainer * containerCount;
        interstateSizeRateDesc = `25 m³ container rate: $${interstateFeePerContainer}${containerCount > 1 ? ` × ${containerCount} = $${interstateFee}` : ''}`;
      }
      requiresCallForPricing = false;
    }
  }

  // 5. Location-Specific Container Storage Pricing (10m³, 19m³, 25m³, 2x large 50m³)
  // Interstate jobs use the ORIGIN depot's interstate rental rate for the whole job.
  // Direct local moves use the origin depot's onsite rate (container never returns for storage).
  const locContainerPrices = getContainerRentalPrices(config, originHub, { isOnsite, isInterstate, serviceType });
  let monthlyContainerRate = 0;
  let weeklyContainerRate = 0;
  let monthlyRatePerContainer = 0;
  let weeklyRatePerContainer = 0;
  let containerName = '25 m³ Portabox';
  let containerVolume = `${calculatedTotalVolumeM3} m³`;
  let containerDimensions = CONTAINER_SPECS.large_25m3;

  if (hasMixedOrSpecificSelections) {
    monthlyContainerRate = 
      (selSmall * locContainerPrices.small_10m3.monthlyRate) +
      (selMedium * locContainerPrices.medium_19m3.monthlyRate) +
      (selLarge * locContainerPrices.large_25m3.monthlyRate);
    weeklyContainerRate = 
      (selSmall * locContainerPrices.small_10m3.weeklyRate) +
      (selMedium * locContainerPrices.medium_19m3.weeklyRate) +
      (selLarge * locContainerPrices.large_25m3.weeklyRate);
    monthlyRatePerContainer = Math.round(monthlyContainerRate / containerCount);
    weeklyRatePerContainer = Math.round(weeklyContainerRate / containerCount);

    const activeSizesCount = (selSmall > 0 ? 1 : 0) + (selMedium > 0 ? 1 : 0) + (selLarge > 0 ? 1 : 0);
    if (activeSizesCount > 1) {
      const parts: string[] = [];
      if (selSmall > 0) parts.push(`${selSmall}x 10 m³ Small`);
      if (selMedium > 0) parts.push(`${selMedium}x 19 m³ Medium`);
      if (selLarge > 0) parts.push(`${selLarge}x 25 m³ Large`);
      containerName = `${containerCount} Containers (${parts.join(' + ')})`;
      containerVolume = `${calculatedTotalVolumeM3} m³ (${containerCount} containers)`;
      containerDimensions = CONTAINER_SPECS.large_25m3;
    } else if (selSmall > 0) {
      containerName = selSmall > 1 ? `${selSmall} x 10 m³ Portabox` : '10 m³ Portabox';
      containerVolume = selSmall > 1 ? `${10 * selSmall} m³ (${selSmall} containers)` : '10 m³';
      containerDimensions = CONTAINER_SPECS.small_10m3;
    } else if (selMedium > 0) {
      containerName = selMedium > 1 ? `${selMedium} x 19 m³ Portabox` : '19 m³ Portabox';
      containerVolume = selMedium > 1 ? `${19 * selMedium} m³ (${selMedium} containers)` : '19 m³';
      containerDimensions = CONTAINER_SPECS.medium_19m3;
    } else {
      containerName = selLarge > 1 ? `${selLarge} x 25 m³ Portabox` : '25 m³ Portabox';
      containerVolume = selLarge > 1 ? `${25 * selLarge} m³ (${selLarge} containers)` : '25 m³';
      containerDimensions = CONTAINER_SPECS.large_25m3;
    }
  } else {
    switch (containerSize) {
      case 'small_10m3':
        monthlyRatePerContainer = locContainerPrices.small_10m3.monthlyRate;
        weeklyRatePerContainer = locContainerPrices.small_10m3.weeklyRate;
        monthlyContainerRate = monthlyRatePerContainer * containerCount;
        weeklyContainerRate = weeklyRatePerContainer * containerCount;
        containerName = containerCount > 1 ? `${containerCount} x 10 m³ Portabox` : '10 m³ Portabox';
        containerVolume = containerCount > 1 ? `${10 * containerCount} m³ (${containerCount} containers)` : '10 m³';
        containerDimensions = CONTAINER_SPECS.small_10m3;
        break;
      case 'medium_19m3':
        monthlyRatePerContainer = locContainerPrices.medium_19m3.monthlyRate;
        weeklyRatePerContainer = locContainerPrices.medium_19m3.weeklyRate;
        monthlyContainerRate = monthlyRatePerContainer * containerCount;
        weeklyContainerRate = weeklyRatePerContainer * containerCount;
        containerName = containerCount > 1 ? `${containerCount} x 19 m³ Portabox` : '19 m³ Portabox';
        containerVolume = containerCount > 1 ? `${19 * containerCount} m³ (${containerCount} containers)` : '19 m³';
        containerDimensions = CONTAINER_SPECS.medium_19m3;
        break;
      case 'large_25m3':
        monthlyRatePerContainer = locContainerPrices.large_25m3.monthlyRate;
        weeklyRatePerContainer = locContainerPrices.large_25m3.weeklyRate;
        monthlyContainerRate = monthlyRatePerContainer * containerCount;
        weeklyContainerRate = weeklyRatePerContainer * containerCount;
        containerName = containerCount > 1 ? `${containerCount} x 25 m³ Portabox` : '25 m³ Portabox';
        containerVolume = containerCount > 1 ? `${25 * containerCount} m³ (${containerCount} containers)` : '25 m³';
        containerDimensions = CONTAINER_SPECS.large_25m3;
        break;
      case 'two_large_50m3':
        containerCount = 2;
        monthlyRatePerContainer = locContainerPrices.large_25m3.monthlyRate;
        weeklyRatePerContainer = locContainerPrices.large_25m3.weeklyRate;
        monthlyContainerRate = monthlyRatePerContainer * 2;
        weeklyContainerRate = weeklyRatePerContainer * 2;
        containerName = '50 m³ (2 x 25 m³)';
        containerVolume = '50 m³ (2 containers)';
        containerDimensions = CONTAINER_SPECS.two_large_50m3;
        break;
    }
  }

  // Transparent storage pricing text
  let storagePricingText = '';
  const storagePlanLabel = isOnsite ? 'Onsite Container Hire' : 'Portabox Secure Facility Storage';
  const activeSelectedSizesCount = (selSmall > 0 ? 1 : 0) + (selMedium > 0 ? 1 : 0) + (selLarge > 0 ? 1 : 0);
  if (hasMixedOrSpecificSelections && activeSelectedSizesCount > 1) {
    const parts: string[] = [];
    if (selSmall > 0) parts.push(`${selSmall} × $${isWeekly ? locContainerPrices.small_10m3.weeklyRate : locContainerPrices.small_10m3.monthlyRate} (10m³)`);
    if (selMedium > 0) parts.push(`${selMedium} × $${isWeekly ? locContainerPrices.medium_19m3.weeklyRate : locContainerPrices.medium_19m3.monthlyRate} (19m³)`);
    if (selLarge > 0) parts.push(`${selLarge} × $${isWeekly ? locContainerPrices.large_25m3.weeklyRate : locContainerPrices.large_25m3.monthlyRate} (25m³)`);
    storagePricingText = isWeekly
      ? `${parts.join(' + ')} = $${weeklyContainerRate}/wk total (${storagePlanLabel})`
      : `${parts.join(' + ')} = $${monthlyContainerRate}/mo total (${storagePlanLabel})`;
  } else if (containerCount > 1) {
    storagePricingText = isWeekly
      ? `$${weeklyRatePerContainer}/wk per container × ${containerCount} containers = $${weeklyContainerRate}/wk total (${storagePlanLabel})`
      : `$${monthlyRatePerContainer}/mo per container × ${containerCount} containers = $${monthlyContainerRate}/mo total (${storagePlanLabel})`;
  } else {
    storagePricingText = isWeekly
      ? `$${weeklyRatePerContainer} /week (${storagePlanLabel})`
      : `$${monthlyRatePerContainer} /month (${storagePlanLabel})`;
  }

  // 6a. Duration Incentive Pre-Resolution (for bonus free blanket rental incentive)
  const durationMonths = resolveDurationMonths(params.storageDurationMonths, storageDuration);

  // Per-size booking counts; the discount matrix is evaluated on the largest size booked, and its
  // 1st-month-free value covers the non-small containers only.
  const bookedSizeCounts = getBookedSizeCounts(containerSize, containerCount, containerSelections);
  // 12' and 16' containers: the ones that earn perks (free blankets, free lock, $400 credit). 7' get none.
  const perkContainerCount = bookedSizeCounts.medium_19m3 + bookedSizeCounts.large_25m3;
  const matrixContainerSize = getMatrixContainerSize(bookedSizeCounts, containerSize);
  const nonSmallListMonthly = Math.max(
    0,
    monthlyContainerRate - bookedSizeCounts.small_10m3 * locContainerPrices.small_10m3.monthlyRate
  );

  const matrixResult = evaluateDiscountMatrix(
    {
      months: durationMonths,
      containerSize: matrixContainerSize,
      serviceType,
      isInterstate: Boolean(isInterstate),
      storagePlacement: isOnsite ? 'my_place' : 'facility',
      hub: originHub,
      annualOption: params.annualDiscountOption || '400B',
      billingCycle,
      baseMonthlyRate: nonSmallListMonthly,
      eligibleContainerCount: perkContainerCount,
      upfrontDiscounts: config.upfrontDiscounts,
    },
    config.discountMatrixRules,
    config.packingSupplies
  );

  // Dan (16 Nov): duration discounts come only from the admin Discount Matrix. The old
  // durationDiscounts tiers (10% / 20% / 30%) are no longer applied to quotes.
  const matrixDurationPercent = Math.max(0, Math.min(100, Number(matrixResult.matchedRule?.discountPercent) || 0));
  const rawDurationDiscount: ReturnType<typeof getDurationDiscount> = {
    discountPercent: matrixDurationPercent,
    reason: matrixDurationPercent > 0
      ? `${matrixDurationPercent}% duration discount (${matrixResult.matchedRule?.name || 'discount matrix'})`
      : 'Standard rate',
    applyMode: 'upfront_monthly',
    freeBlanketsCount: 0,
  };
  const durationFreeBlanketsCount = matrixResult.freeBlanketsCount || 0;
  // One free lock per 12' / 16' container when the booking's duration includes it (7' containers get none)
  const freeLocksFromMatrix = matrixResult.freeLockIncluded ? perkContainerCount : 0;

  // 6. Packing Supplies (Boxes, Blankets with Free Allowance & Lock Sales)
  // Moving cartons feature flag: default off (Portabox does not provide cartons currently)
  const boxesCount = config.enableMovingCartons ? (params.boxesCount || 0) : 0;
  const blanketsCount = params.blanketsCount || 0;
  const locksCount = params.locksCount || 0;

  const boxesPrice = calculateBoxPrice(boxesCount, config.packingSupplies);
  
  // Blanket rental with free allowance (e.g. 10 free per container) + duration bonus incentive (lots of 10)
  const blanketCalc = calculateBlanketRentalPrice(blanketsCount, perkContainerCount, config.packingSupplies, durationFreeBlanketsCount);
  const blanketsPrice = blanketCalc.totalFee;

  // Heavy-duty lock sales with matrix discount check
  const lockCalc = calculateLockSalesPrice(locksCount, config.packingSupplies, freeLocksFromMatrix);
  const locksPrice = lockCalc.totalPrice;

  const totalSuppliesPrice = boxesPrice + blanketsPrice + locksPrice;

  const packingSupplies: PackingSuppliesOrder = {
    boxesCount,
    boxesPrice,
    blanketsCount,
    freeBlanketsAllowance: blanketCalc.freeAllowance,
    chargeableBlanketsCount: blanketCalc.chargeableCount,
    blanketsPrice,
    locksCount,
    lockUnitPrice: lockCalc.unitPrice,
    locksPrice,
    isLockFreePromo: lockCalc.isFreePromo,
    locksSavings: lockCalc.savings,
    totalSuppliesPrice,
  };

  // 6b. Container Protection Option (CPO / COO / None)
  // Interstate rule: Mandatory CPO (up to $5,000 cover per container, cannot be deselected)
  // COO (container cover) is offered on every booking and can be taken with CPO
  const isInterstateProtectionMandatory = Boolean(isInterstate);
  let effectiveProtectionPlan: ProtectionPlanType = params.protectionPlan || (params.insuranceSelected !== false ? 'cpo' : 'none');
  if (isInterstateProtectionMandatory) {
    // CPO is required; a COO add-on stays
    effectiveProtectionPlan = effectiveProtectionPlan === 'coo' || effectiveProtectionPlan === 'cpo_coo' ? 'cpo_coo' : 'cpo';
  }

  const protectionCalc = calculateProtectionPlanFee(effectiveProtectionPlan, containerCount, config.insurance);
  const insuranceSelected = effectiveProtectionPlan !== 'none';
  const insurance: ContainerInsuranceOrder = {
    selected: insuranceSelected,
    containerCount,
    monthlyPricePerContainer: protectionCalc.monthlyRatePerContainer,
    totalMonthlyInsuranceFee: protectionCalc.monthlyFee,
    isFreePromo: protectionCalc.isFreePromo,
    promoSavingsMonthly: protectionCalc.promoSavingsMonthly,
    coverageAmount: protectionCalc.coverageAmount,
  };

  // 7. Zone A–E & Interstate transport legs (Location & Zone-Based Delivery Fees + optional per-km pricing)
  const domesticLegFee = zoneBaseDeliveryFee;
  const legBaseFee = domesticLegFee * containerCount;
  const deliveryPricingText = containerCount > 1
    ? `Zone ${deliveryZone} (${deliveryZoneRangeLabel}): $${domesticLegFee}/container × ${containerCount} = $${legBaseFee} per leg`
    : `Zone ${deliveryZone} (${deliveryZoneRangeLabel}): $${domesticLegFee} per one-way leg`;

  const legs: QuoteLegBreakdown[] = [];
  const waivedLegs: QuoteLegBreakdown[] = [];
  let legsSavedCount = 0;
  let legsSavedDollarTotal = 0;

  if (serviceType === 'storage_at_place') {
    // Keep it at your place:
    // 1. Initial delivery empty -> Payable now
    // 2. Final pick up empty -> Payable at collection
    const initialFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? fuelSurchargeAmount : 0);
    if (!isOriginDepot) {
      legs.push({
        label: `Delivery to ${originPostcode.suburb} (empty)`,
        description: `${originHub} Zone ${deliveryZone} (${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee (${originDistanceKm} km @ $${kmRate}/km)` : ''})`,
        fee: initialFee,
        isPayableNow: true,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        extraKmDistanceKm: kmTotalCharge > 0 ? originDistanceKm : undefined,
        fuelSurcharge: isFuelSurchargeIncluded && fuelSurchargeAmount > 0 ? fuelSurchargeAmount : undefined,
        fuelSurchargeDeferred: false,
        fuelSurchargeCalculationNote: initialLegFuel.note,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });
    } else {
      legsSavedCount += 1;
      legsSavedDollarTotal += initialFee;
      waivedLegs.push({
        label: `[Waived] Empty delivery to ${originPostcode.suburb}`,
        description: `Saved! You will collect and load directly at ${originHub} depot (${originDepot.address}, ${originDepot.suburb}).`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: initialFee,
        waivedReason: 'Self-loading at Portabox Depot',
      });
    }

    const leg2Fuel = calculateLegFuelSurcharge({
      zone: deliveryZone,
      distanceKm: originDistanceKm,
      containerCount,
      config,
    });
    const leg2Total = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0);
    if (!isDestDepot) {
      legs.push({
        label: "Collection when you're done (empty)",
        description: `Payable at the end of storage · ${originHub} Zone ${deliveryZone} (${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''})`,
        fee: legBaseFee + kmTotalCharge,
        isPayableNow: false,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Container returned to ${originHub} depot (${originDistanceKm} km · ${leg2Fuel.note}). Fuel levy is deferred until collection occurs.`,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });
    } else {
      legsSavedCount += 1;
      legsSavedDollarTotal += leg2Total;
      waivedLegs.push({
        label: `[Waived] Empty container collection from ${originPostcode.suburb}`,
        description: `Saved! You will return the empty container directly to ${originHub} depot.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg2Total,
        waivedReason: 'Self-unloading at Portabox Depot',
      });
    }
  } else if (serviceType === 'storage_facility') {
    // Storage at Portabox facility:
    // Leg 1: Initial delivery empty
    // Leg 2: Transport full container to storage facility
    const initialFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? fuelSurchargeAmount : 0);
    const leg2Fuel = calculateLegFuelSurcharge({
      zone: deliveryZone,
      distanceKm: originDistanceKm,
      containerCount,
      config,
    });
    const leg2Total = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0);

    // Full un-waived cost of 2 origin legs inclusive of all charges (base fee + km surcharge + fuel levy)
    const leg1FullFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? initialLegFuel.totalAmount : 0);
    const leg2FullFee = leg2Total;
    const originSaved = leg1FullFee + leg2FullFee;

    if (!isOriginDepot) {
      legs.push({
        label: `Initial delivery to ${originPostcode.suburb} (empty)`,
        description: `Delivery of empty container for packing · ${originHub} Zone ${deliveryZone} (${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''})`,
        fee: initialFee,
        isPayableNow: true,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        extraKmDistanceKm: kmTotalCharge > 0 ? originDistanceKm : undefined,
        fuelSurcharge: isFuelSurchargeIncluded && fuelSurchargeAmount > 0 ? fuelSurchargeAmount : undefined,
        fuelSurchargeDeferred: false,
        fuelSurchargeCalculationNote: initialLegFuel.note,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });

      legs.push({
        label: 'Transport to Portabox storage facility (full)',
        description: `Move full container to secure ${originHub} depot storage (${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''})`,
        fee: legBaseFee + kmTotalCharge,
        isPayableNow: false,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Transit to ${originHub} depot (${originDistanceKm} km · ${leg2Fuel.note}). Fuel levy deferred until transit occurs.`,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });
    } else {
      // Customer loads goods at Portabox location: Saves 2 legs inclusive of all charges!
      legsSavedCount += 2;
      legsSavedDollarTotal += originSaved;

      waivedLegs.push({
        label: `[Waived] Empty container delivery to ${originPostcode.suburb}`,
        description: `Saved! You will bring your goods directly to the ${originHub} depot (${originDepot.address}, ${originDepot.suburb}) to load.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg1FullFee,
        waivedReason: 'Self-loading at Portabox Depot',
      });
      waivedLegs.push({
        label: `[Waived] Full container transit to ${originHub} facility`,
        description: `Saved! Container is already loaded directly inside the secure ${originHub} depot warehouse.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg2FullFee,
        waivedReason: 'Self-loading at Portabox Depot',
      });
    }

    const leg3Fuel = calculateLegFuelSurcharge({
      zone: deliveryZone,
      distanceKm: originDistanceKm,
      containerCount,
      config,
    });
    const leg4Fuel = calculateLegFuelSurcharge({
      zone: deliveryZone,
      distanceKm: originDistanceKm,
      containerCount,
      config,
    });
    const leg3Total = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? leg3Fuel.totalAmount : 0);
    const leg4Total = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? leg4Fuel.totalAmount : 0);

    if (!isDestDepot) {
      legs.push({
        label: 'Redelivery from facility when ready (full)',
        description: `Drop off at your address when you need items back (${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''})`,
        fee: legBaseFee + kmTotalCharge,
        isPayableNow: false,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? leg3Fuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Redelivery from ${originHub} depot (${originDistanceKm} km · ${leg3Fuel.note}). Fuel levy deferred until redelivery occurs.`,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });

      legs.push({
        label: 'Final pickup of empty container',
        description: `Collect empty container from ${originPostcode.suburb} (${originDistanceKm} km - Zone ${deliveryZone}) · ${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''}`,
        fee: legBaseFee + kmTotalCharge,
        isPayableNow: false,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? leg4Fuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Container returned to ${originHub} depot (${originDistanceKm} km · ${leg4Fuel.note}). Fuel levy deferred until final pickup occurs.`,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });
    } else {
      // Customer unloads goods from Portabox location when done storing: Saves 2 legs!
      legsSavedCount += 2;
      const destSaved = leg3Total + leg4Total;
      legsSavedDollarTotal += destSaved;

      waivedLegs.push({
        label: `[Waived] Full container redelivery to ${originPostcode.suburb}`,
        description: `Saved! You will collect and unload directly at the ${originHub} depot when you finish storing.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg3Total,
        waivedReason: 'Self-unloading at Portabox Depot',
      });
      waivedLegs.push({
        label: `[Waived] Final empty container collection`,
        description: `Saved! Container remains at the Portabox depot after you unpack.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg4Total,
        waivedReason: 'Self-unloading at Portabox Depot',
      });
    }
  } else if (serviceType === 'moving_storage') {
    // 4-Leg Move with Interim Storage:
    // Portabox Location -> Customer Location -> Portabox Location (Interim Storage) -> New Customer Location -> Portabox Location
    const initialFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? fuelSurchargeAmount : 0);
    const leg2Fuel = calculateLegFuelSurcharge({
      zone: deliveryZone,
      distanceKm: originDistanceKm,
      containerCount,
      config,
    });
    const leg1FullFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? initialLegFuel.totalAmount : 0);
    const leg2FullFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0);
    const origin2LegsFee = leg1FullFee + leg2FullFee;

    if (!isOriginDepot) {
      // Leg 1: Portabox Location -> Customer Location (Deliver empty container)
      legs.push({
        label: `Portabox Location → Customer Location (Deliver empty container)`,
        description: `Deliver empty container for packing to ${originPostcode.suburb} (${originDistanceKm} km - Zone ${deliveryZone}) · ${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''}`,
        fee: initialFee,
        isPayableNow: true,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        extraKmDistanceKm: kmTotalCharge > 0 ? originDistanceKm : undefined,
        fuelSurcharge: isFuelSurchargeIncluded && fuelSurchargeAmount > 0 ? fuelSurchargeAmount : undefined,
        fuelSurchargeDeferred: false,
        fuelSurchargeCalculationNote: initialLegFuel.note,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });

      // Leg 2: Customer Location -> Portabox Location (Pick up loaded container for interim storage)
      legs.push({
        label: `Customer Location → Portabox Location (Transit to interim storage)`,
        description: `Pick up loaded container from ${originPostcode.suburb} and transport to ${originHub} Portabox Location for secure interim storage · Zone ${deliveryZone} (${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''})`,
        fee: legBaseFee + kmTotalCharge,
        isPayableNow: false,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        extraKmDistanceKm: kmTotalCharge > 0 ? originDistanceKm : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Transit to interim storage (${originDistanceKm} km · ${leg2Fuel.note}). Fuel levy deferred until pickup occurs.`,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });
    } else {
      // Customer self-loads at Portabox Location: Saves 2 local legs!
      legsSavedCount += 2;
      legsSavedDollarTotal += origin2LegsFee;

      waivedLegs.push({
        label: `[Waived] Portabox Location → Customer Location (Empty delivery)`,
        description: `Saved! You will bring your goods directly to the ${originHub} Portabox Location (${originDepot.address}, ${originDepot.suburb}) to load.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg1FullFee,
        waivedReason: 'Self-loading at Portabox Location',
      });
      waivedLegs.push({
        label: `[Waived] Customer Location → Portabox Location (Transit to interim storage)`,
        description: `Saved! Container is loaded on-site at the ${originHub} Portabox Location.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg2FullFee,
        waivedReason: 'Self-loading at Portabox Location',
      });
    }

    if (isInterstate) {
      const destHubName = getMetroHubForPostcode(destinationPostcode!, enableSunshineCoast);
      legs.push({
        label: `Interstate transport (${originHub} → ${destHubName})`,
        description: `${movingDistanceKm ? `${movingDistanceKm} km driving · ` : ''}Direct interstate line-haul freight between Portabox Locations (${interstateSizeRateDesc})`,
        fee: interstateFee,
        isPayableNow: false,
        feePerContainer: interstateFeePerContainer,
        containerCount,
        baseFee: interstateFee,
      });
    }

    const destSuburb = destinationPostcode?.suburb || 'Destination';
    const destBaseTotal = destZoneBaseFeePerContainer * containerCount + destKmChargeTotal;
    const destReturnFuel = calculateLegFuelSurcharge({
      zone: destDeliveryZone,
      distanceKm: destDepotDistanceKm,
      containerCount,
      config,
    });
    const destLegFeeWithFuel = destBaseTotal + (isFuelSurchargeIncluded ? destReturnFuel.totalAmount : 0);
    const dest2LegsFee = destLegFeeWithFuel * 2;

    if (!isDestDepot) {
      // Leg 3: Portabox Location -> New Customer Location
      legs.push({
        label: `Portabox Location → New Customer Location (Delivery from interim storage)`,
        description: `Deliver container from Portabox Location to your new address in ${destSuburb} when ready · Zone ${destDeliveryZone} (${containerCount > 1 ? `$${destZoneBaseFeePerContainer}/container × ${containerCount} = $${destBaseTotal}` : `$${destZoneBaseFeePerContainer} Zone ${destDeliveryZone} fee`}${destKmChargeTotal > 0 ? ` + $${destKmChargeTotal} per-km fee` : ''})`,
        fee: destBaseTotal,
        isPayableNow: false,
        feePerContainer: destZoneBaseFeePerContainer,
        containerCount,
        baseFee: destBaseTotal,
        extraKmCharge: destKmChargeTotal > 0 ? destKmChargeTotal : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? destReturnFuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Redelivery from interim storage to new location (${destDepotDistanceKm} km · ${destReturnFuel.note}). Fuel levy deferred until redelivery occurs.`,
        fuelSurchargeZone: destDeliveryZone,
        fuelSurchargeDistanceKm: destDepotDistanceKm,
      });

      // Leg 4: New Customer Location -> Portabox Location (Final empty collection)
      legs.push({
        label: `New Customer Location → Portabox Location (Final empty collection)`,
        description: `Collect empty container from ${destSuburb} (${destDepotDistanceKm} km - Zone ${destDeliveryZone}) · ${containerCount > 1 ? `$${destZoneBaseFeePerContainer}/container × ${containerCount} = $${destBaseTotal}` : `$${destZoneBaseFeePerContainer} Zone ${destDeliveryZone} fee`}${destKmChargeTotal > 0 ? ` + $${destKmChargeTotal} per-km fee` : ''}`,
        fee: destBaseTotal,
        isPayableNow: false,
        feePerContainer: destZoneBaseFeePerContainer,
        containerCount,
        baseFee: destBaseTotal,
        extraKmCharge: destKmChargeTotal > 0 ? destKmChargeTotal : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? destReturnFuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Container returned to Portabox Location (${destDepotDistanceKm} km · ${destReturnFuel.note}). Fuel levy deferred until final pickup occurs.`,
        fuelSurchargeZone: destDeliveryZone,
        fuelSurchargeDistanceKm: destDepotDistanceKm,
      });
    } else {
      // Customer self-unloads at Portabox Location: Saves 2 local legs!
      legsSavedCount += 2;
      legsSavedDollarTotal += dest2LegsFee;

      waivedLegs.push({
        label: `[Waived] Portabox Location → New Customer Location (Delivery from interim storage)`,
        description: `Saved! You will collect and unload directly at the Portabox Location.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: destLegFeeWithFuel,
        waivedReason: 'Self-unloading at Portabox Location',
      });
      waivedLegs.push({
        label: `[Waived] New Customer Location → Portabox Location (Final empty collection)`,
        description: `Saved! Container stays at the Portabox Location.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: destLegFeeWithFuel,
        waivedReason: 'Self-unloading at Portabox Location',
      });
    }
  } else if (isInterstate) {
    // Interstate Move (IF) - Rows 2, 3, 4, 5
    // Where: Our Location (Forced)
    // Need Interim Storage: N/A (Forced)
    // - My Home -> My Home: 4 local legs + Line-haul (Row 2, 2 addresses)
    // - My Home -> Our Location: 2 local legs + Line-haul (Row 3, 1 address)
    // - Our Location -> My Home: 2 local legs + Line-haul (Row 4, 1 address)
    // - Our Location -> Our Location: 0 local legs + Line-haul (Row 5, 0 addresses)
    const initialFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? fuelSurchargeAmount : 0);
    const leg2Fuel = calculateLegFuelSurcharge({
      zone: deliveryZone,
      distanceKm: originDistanceKm,
      containerCount,
      config,
    });
    const leg1FullFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? initialLegFuel.totalAmount : 0);
    const leg2FullFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0);
    const origin2LegsFee = leg1FullFee + leg2FullFee;

    if (!isOriginDepot) {
      // Leg 1: Portabox Location -> Customer Location (Deliver empty container)
      legs.push({
        label: `Portabox Location → Customer Location (Deliver empty container)`,
        description: `Deliver empty container for packing to ${originPostcode.suburb} (${originDistanceKm} km - Zone ${deliveryZone}) · ${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''}`,
        fee: initialFee,
        isPayableNow: true,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        extraKmDistanceKm: kmTotalCharge > 0 ? originDistanceKm : undefined,
        fuelSurcharge: isFuelSurchargeIncluded && fuelSurchargeAmount > 0 ? fuelSurchargeAmount : undefined,
        fuelSurchargeDeferred: false,
        fuelSurchargeCalculationNote: initialLegFuel.note,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });

      // Leg 2: Customer Location -> Portabox Location (Pick up loaded container for interstate transit)
      legs.push({
        label: `Customer Location → Portabox Location (Transit loaded container to depot)`,
        description: `Pick up loaded container from ${originPostcode.suburb} and transport to ${originHub} Portabox Location for interstate line-haul freight · Zone ${deliveryZone} (${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''})`,
        fee: legBaseFee + kmTotalCharge,
        isPayableNow: false,
        feePerContainer: domesticLegFee,
        containerCount,
        baseFee: legBaseFee,
        extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
        extraKmDistanceKm: kmTotalCharge > 0 ? originDistanceKm : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? leg2Fuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Transit to ${originHub} depot (${originDistanceKm} km · ${leg2Fuel.note}). Fuel levy deferred until pickup occurs.`,
        fuelSurchargeZone: deliveryZone,
        fuelSurchargeDistanceKm: originDistanceKm,
      });
    } else {
      // Customer self-loads at origin Portabox Location: Saves 2 local legs!
      legsSavedCount += 2;
      legsSavedDollarTotal += origin2LegsFee;

      waivedLegs.push({
        label: `[Waived] Portabox Location → Customer Location (Deliver empty container)`,
        description: `Saved! You will bring your goods directly to the ${originHub} Portabox Location (${originDepot.address}, ${originDepot.suburb}) to load.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg1FullFee,
        waivedReason: 'Self-loading at Portabox Location',
      });
      waivedLegs.push({
        label: `[Waived] Customer Location → Portabox Location (Transit loaded container to depot)`,
        description: `Saved! Container is loaded on-site at the ${originHub} Portabox Location.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: leg2FullFee,
        waivedReason: 'Self-loading at Portabox Location',
      });
    }

    // Line-haul freight between depots
    const destHubName = getMetroHubForPostcode(destinationPostcode!, enableSunshineCoast);
    legs.push({
      label: `Interstate transport (${originHub} → ${destHubName})`,
      description: `${movingDistanceKm ? `${movingDistanceKm} km driving · ` : ''}Direct interstate line-haul freight (${interstateSizeRateDesc})`,
      fee: interstateFee,
      isPayableNow: false,
      feePerContainer: interstateFeePerContainer,
      containerCount,
      baseFee: interstateFee,
    });

    const destSuburb = destinationPostcode?.suburb || 'Destination';
    const destBaseTotal = destZoneBaseFeePerContainer * containerCount + destKmChargeTotal;
    const destReturnFuel = calculateLegFuelSurcharge({
      zone: destDeliveryZone,
      distanceKm: destDepotDistanceKm,
      containerCount,
      config,
    });
    const destLegFeeWithFuel = destBaseTotal + (isFuelSurchargeIncluded ? destReturnFuel.totalAmount : 0);
    const dest2LegsFee = destLegFeeWithFuel * 2;

    if (!isDestDepot) {
      // Leg 3: Destination Portabox Location -> Destination Customer Home (Deliver loaded container)
      legs.push({
        label: `Portabox Location → New Customer Location (Deliver loaded container)`,
        description: `Deliver container from ${destHubName} Portabox Location to your new address in ${destSuburb} · Zone ${destDeliveryZone} (${containerCount > 1 ? `$${destZoneBaseFeePerContainer}/container × ${containerCount} = $${destBaseTotal}` : `$${destZoneBaseFeePerContainer} Zone ${destDeliveryZone} fee`}${destKmChargeTotal > 0 ? ` + $${destKmChargeTotal} per-km fee` : ''})`,
        fee: destBaseTotal,
        isPayableNow: false,
        feePerContainer: destZoneBaseFeePerContainer,
        containerCount,
        baseFee: destBaseTotal,
        extraKmCharge: destKmChargeTotal > 0 ? destKmChargeTotal : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? destReturnFuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Delivery from ${destHubName} depot to new location (${destDepotDistanceKm} km · ${destReturnFuel.note}). Fuel levy deferred until delivery occurs.`,
        fuelSurchargeZone: destDeliveryZone,
        fuelSurchargeDistanceKm: destDepotDistanceKm,
      });

      // Leg 4: Destination Customer Home -> Destination Portabox Location (Final empty collection)
      legs.push({
        label: `New Customer Location → Portabox Location (Final empty collection)`,
        description: `Collect empty container from ${destSuburb} (${destDepotDistanceKm} km - Zone ${destDeliveryZone}) · ${containerCount > 1 ? `$${destZoneBaseFeePerContainer}/container × ${containerCount} = $${destBaseTotal}` : `$${destZoneBaseFeePerContainer} Zone ${destDeliveryZone} fee`}${destKmChargeTotal > 0 ? ` + $${destKmChargeTotal} per-km fee` : ''}`,
        fee: destBaseTotal,
        isPayableNow: false,
        feePerContainer: destZoneBaseFeePerContainer,
        containerCount,
        baseFee: destBaseTotal,
        extraKmCharge: destKmChargeTotal > 0 ? destKmChargeTotal : undefined,
        fuelSurchargeDeferred: true,
        fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? destReturnFuel.totalAmount : 0,
        fuelSurchargeCalculationNote: `Container returned to ${destHubName} depot (${destDepotDistanceKm} km · ${destReturnFuel.note}). Fuel levy deferred until final pickup occurs.`,
        fuelSurchargeZone: destDeliveryZone,
        fuelSurchargeDistanceKm: destDepotDistanceKm,
      });
    } else {
      // Customer self-unloads at destination Portabox Location: Saves 2 destination legs!
      legsSavedCount += 2;
      legsSavedDollarTotal += dest2LegsFee;

      waivedLegs.push({
        label: `[Waived] Portabox Location → New Customer Location (Deliver loaded container)`,
        description: `Saved! You will collect and unload directly at the ${destHubName} Portabox Location facility.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: destLegFeeWithFuel,
        waivedReason: 'Self-unloading at Portabox Location',
      });
      waivedLegs.push({
        label: `[Waived] New Customer Location → Portabox Location (Final empty collection)`,
        description: `Saved! Container stays at the ${destHubName} Portabox Location facility.`,
        fee: 0,
        isPayableNow: false,
        isWaived: true,
        waivedSavings: destLegFeeWithFuel,
        waivedReason: 'Self-unloading at Portabox Location',
      });
    }
  } else {
    // Row 1: Direct Local Move (Moving | Local | Interim: No | Initial Loading: N/A | Destination Unloading: N/A)
    // Strictly 3 legs, 2 addresses:
    // Leg 1: Portabox Depot -> Origin Home (deliver empty)
    // Leg 2: Origin Home -> Destination Home (direct move full)
    // Leg 3: Destination Home -> Portabox Depot (collect empty)
    const initialFee = legBaseFee + kmTotalCharge + (isFuelSurchargeIncluded ? fuelSurchargeAmount : 0);

    legs.push({
      label: `Initial delivery to ${originPostcode.suburb} (empty)`,
      description: `Deliver empty container for packing to ${originPostcode.suburb} (${originDistanceKm} km - Zone ${deliveryZone}) · ${containerCount > 1 ? `$${domesticLegFee}/container × ${containerCount} = $${legBaseFee}` : `$${domesticLegFee} Zone ${deliveryZone} base`}${kmTotalCharge > 0 ? ` + $${kmTotalCharge} per-km fee` : ''}`,
      fee: initialFee,
      isPayableNow: true,
      feePerContainer: domesticLegFee,
      containerCount,
      baseFee: legBaseFee,
      extraKmCharge: kmTotalCharge > 0 ? kmTotalCharge : undefined,
      extraKmDistanceKm: kmTotalCharge > 0 ? originDistanceKm : undefined,
      fuelSurcharge: isFuelSurchargeIncluded && fuelSurchargeAmount > 0 ? fuelSurchargeAmount : undefined,
      fuelSurchargeDeferred: false,
      fuelSurchargeCalculationNote: initialLegFuel.note,
      fuelSurchargeZone: deliveryZone,
      fuelSurchargeDistanceKm: originDistanceKm,
    });

    const movingRate =
      movingDeliveryZone === 'A'
        ? zoneARatePerKm
        : movingDeliveryZone === 'B'
        ? zoneBRatePerKm
        : movingDeliveryZone === 'C'
        ? zoneCRatePerKm
        : movingDeliveryZone === 'D'
        ? zoneDRatePerKm
        : zoneERatePerKm;
    const destinationSuburb = destinationPostcode?.suburb || 'Destination';
    const moveBaseTotal = movingZoneBaseFeePerContainer * containerCount;

    const moveFuel = calculateLegFuelSurcharge({
      zone: movingDeliveryZone || 'A',
      distanceKm: moveRouteKm || 0,
      containerCount,
      config,
    });

    // Dan 16 Nov: "Move container from <home 1> to <home 2> (<km> km - Zone <Z>) · <fee>"
    const moveFeeText = `${containerCount > 1 ? `$${movingZoneBaseFeePerContainer}/container × ${containerCount} = $${moveBaseTotal}` : `$${movingZoneBaseFeePerContainer}`} Zone ${movingDeliveryZone} fee`;
    const moveKmText = movingKmCharge > 0 && moveRouteKm
      ? ` + per-km (${movingDeliveryZone === 'E' && moveRouteKm > zoneDMaxKm ? `${moveRouteKm - zoneDMaxKm} km over ${zoneDMaxKm} km` : `${moveRouteKm} km`} @ $${movingRate}/km): ${containerCount > 1 ? `$${movingKmRatePerContainer}/container × ${containerCount} = $${movingKmCharge}` : `$${movingKmCharge}`}`
      : '';
    const movingLegDesc = `Move container from ${originPostcode.suburb} to ${destinationSuburb} (${moveRouteKm} km - Zone ${movingDeliveryZone}) · ${moveFeeText}${moveKmText}`;

    const totalMoveFee = moveBaseTotal + movingKmCharge;
    legs.push({
      label: `Move to ${destinationSuburb} (full)`,
      description: movingLegDesc,
      fee: totalMoveFee,
      isPayableNow: false,
      feePerContainer: movingZoneBaseFeePerContainer + movingKmRatePerContainer,
      containerCount,
      baseFee: moveBaseTotal,
      extraKmCharge: movingKmCharge > 0 ? movingKmCharge : undefined,
      extraKmDistanceKm: moveRouteKm,
      fuelSurchargeDeferred: true,
      fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? moveFuel.totalAmount : 0,
      fuelSurchargeCalculationNote: `Move route depot → home 1 → home 2 (${moveRouteKm} km · ${moveFuel.note}). Fuel levy is deferred until move occurs.`,
      fuelSurchargeZone: movingDeliveryZone,
      fuelSurchargeDistanceKm: moveRouteKm,
    });

    const destBaseTotal = destZoneBaseFeePerContainer * containerCount + destKmChargeTotal;
    const pickupFuel = calculateLegFuelSurcharge({
      zone: destDeliveryZone,
      distanceKm: destDepotDistanceKm,
      containerCount,
      config,
    });

    legs.push({
      label: `Final pickup of empty container at ${destinationSuburb}`,
      description: `Collect empty container from ${destinationSuburb} (${destDepotDistanceKm} km - Zone ${destDeliveryZone}) · ${containerCount > 1 ? `$${destZoneBaseFeePerContainer}/container × ${containerCount} = $${destZoneBaseFeePerContainer * containerCount}` : `$${destZoneBaseFeePerContainer} Zone ${destDeliveryZone} fee`}${destKmChargeTotal > 0 ? ` + $${destKmChargeTotal} per-km fee` : ''}`,
      fee: destBaseTotal,
      isPayableNow: false,
      feePerContainer: destZoneBaseFeePerContainer,
      containerCount,
      baseFee: destZoneBaseFeePerContainer * containerCount,
      extraKmCharge: destKmChargeTotal > 0 ? destKmChargeTotal : undefined,
      fuelSurchargeDeferred: true,
      fuelSurchargeEstimatedAmount: isFuelSurchargeIncluded ? pickupFuel.totalAmount : 0,
      fuelSurchargeCalculationNote: `Container returned to ${originHub} Portabox Location (${destDepotDistanceKm} km · ${pickupFuel.note}). Fuel levy is deferred until final pickup occurs.`,
      fuelSurchargeZone: destDeliveryZone,
      fuelSurchargeDistanceKm: destDepotDistanceKm,
    });
  }

  // Determine number of required addresses based on the 13 moving/storage logic scenarios:
  let requiredAddressesCount = 2;
  if (serviceType === 'storage_at_place') {
    // Row 9: Storage at Your Home = 1 address
    requiredAddressesCount = 1;
  } else if (serviceType === 'storage_facility') {
    // Rows 10, 11, 12, 13
    if (isOriginDepot && isDestDepot) {
      requiredAddressesCount = 0; // Row 13
    } else {
      requiredAddressesCount = 1; // Rows 10, 11, 12
    }
  } else if (serviceType === 'moving_storage' || isInterstate) {
    // Rows 2-5 (Interstate) or Rows 6-8 (Local with Interim Storage)
    if (isOriginDepot && isDestDepot) {
      requiredAddressesCount = 0; // Rows 5, 8
    } else if (isOriginDepot || isDestDepot) {
      requiredAddressesCount = 1; // Rows 3, 4, 6b, 7
    } else {
      requiredAddressesCount = 2; // Rows 2, 6a
    }
  } else {
    // Row 1: Direct Local Move = 2 addresses
    requiredAddressesCount = 2;
  }

  // Total active local legs (excluding interstate line-haul freight)
  const totalLegsCount = legs.filter(l => !l.label.includes('Interstate transport')).length;

  // 8. Calculate initial charges based on billing cycle (All billing is in advance)
  const payableNowLeg = legs.find((l) => l.isPayableNow);
  const initialDeliveryFee = payableNowLeg
    ? (payableNowLeg.baseFee !== undefined ? payableNowLeg.baseFee + (payableNowLeg.extraKmCharge || 0) : payableNowLeg.fee)
    : 0;

  // Helper to determine customer's current service scope
  const currentServiceScope: PromoServiceScope =
    serviceType === 'storage_at_place'
      ? 'storage_onsite'
      : serviceType === 'storage_facility'
      ? 'storage_portabox_site'
      : isInterstate
      ? 'interstate_moving'
      : 'local_moving';

  const friendlyServiceNames: Record<PromoServiceScope, string> = {
    storage_onsite: 'Storage Onsite (at your place)',
    storage_portabox_site: 'Storage at Portabox Site (depot)',
    interstate_moving: 'Interstate Moving',
    local_moving: 'Local Moving',
  };

  const destHub = destinationPostcode ? getMetroHubForPostcode(destinationPostcode) : undefined;

  // Pre-validate applied promo code for location, service type, container size, and active status
  let promoCodeError: string | undefined = undefined;
  let promoCodeSuccessMessage: string | undefined = undefined;
  let isExclusivePromoApplied = false;

  if (appliedPromoCode && appliedPromoCode.trim()) {
    const rawCode = appliedPromoCode.trim().toUpperCase();
    const matched = config.promotions.find(
      (p) => p.code && p.code.trim().toUpperCase() === rawCode
    );

    if (matched) {
      if (!matched.active) {
        promoCodeError = `Discount code "${appliedPromoCode}" is currently deactivated.`;
      } else if (matched.targetLocations && matched.targetLocations.length > 0 && !matched.targetLocations.includes('All')) {
        const matchesOrigin = matched.targetLocations.includes(originHub);
        const matchesDest = destHub ? matched.targetLocations.includes(destHub) : false;
        if (!matchesOrigin && !matchesDest) {
          promoCodeError = `Discount code "${appliedPromoCode}" is only valid for Portabox locations: ${matched.targetLocations.join(', ')} (your current depot location is ${originHub}).`;
        }
      }
      
      if (!promoCodeError && matched.serviceTypes && matched.serviceTypes.length > 0) {
        if (!matched.serviceTypes.includes(currentServiceScope)) {
          const allowed = matched.serviceTypes.map((s) => friendlyServiceNames[s]).join(', ');
          promoCodeError = `Discount code "${appliedPromoCode}" is only valid for: ${allowed} (your current service is ${friendlyServiceNames[currentServiceScope]}).`;
        }
      }

      if (!promoCodeError && matched.containerSize && matched.containerSize !== 'all') {
        const is10 = containerSize === 'small_10m3';
        if (matched.containerSize === '10ft' && !is10) {
          promoCodeError = `Discount code "${appliedPromoCode}" is only valid for 10ft (12.5m³) containers.`;
        } else if (matched.containerSize === '20ft' && is10) {
          promoCodeError = `Discount code "${appliedPromoCode}" is only valid for 20ft (25m³) containers.`;
        }
      }

      if (!promoCodeError) {
        if (matched.isExclusive) {
          isExclusivePromoApplied = true;
          promoCodeSuccessMessage = `Exclusive code "${appliedPromoCode}" applied as sole discount (duration discounts and other codes suppressed).`;
        } else {
          promoCodeSuccessMessage = `Discount code "${appliedPromoCode}" applied! Stacks with standard savings.`;
        }
      }
    }
  }

  // 8b. Tiered Duration Discount Engine (Configurable tiers with shorter-period fallback)
  const durationDiscountApplyMode = rawDurationDiscount.applyMode;
  // 10 m³ (7') containers are exempt from duration discounts (matches the discount matrix exemption)
  const isSmallOnlyBooking = hasMixedOrSpecificSelections
    ? selSmall > 0 && selMedium === 0 && selLarge === 0
    : containerSize === 'small_10m3';
  const durationDiscountPercent = isExclusivePromoApplied || isSmallOnlyBooking ? 0 : rawDurationDiscount.discountPercent;
  const durationDiscountReason = isExclusivePromoApplied
    ? `Replaced by exclusive code ${appliedPromoCode}`
    : isSmallOnlyBooking
      ? "7' containers: Standard rate (exempt from duration discounts)"
      : rawDurationDiscount.reason;

  const baseMonthlyContainerRate = monthlyContainerRate;
  const isCompletionDiscount = durationDiscountApplyMode === 'on_completion_remaining_charges';
  // Discounts are worked out per size: 10 m³ containers get no duration discount or 1st month free,
  // even when booked alongside larger containers.
  const sizeDiscounts = calculateSizeDiscounts({
    prices: locContainerPrices,
    counts: bookedSizeCounts,
    durationDiscountPercent: durationDiscountPercent > 0 && !isCompletionDiscount ? durationDiscountPercent : 0,
    firstMonthFree: matrixResult.firstMonthFree,
  });
  const durationDiscountAmount = sizeDiscounts.durationDiscountAmount;
  const durationCompletionBonusDollars =
    durationDiscountPercent > 0 && isCompletionDiscount
      ? Math.round(sizeDiscounts.eligibleMonthly * (durationDiscountPercent / 100) * durationMonths)
      : 0;
  const effectiveMonthlyContainerRate = Math.max(0, baseMonthlyContainerRate - durationDiscountAmount);
  const freeMonthValue = sizeDiscounts.freeMonthValue;

  // Periodic container fee calculation and savings vs weekly
  let currentPeriodicStorageFee = 0;
  let billingCycleLabel = 'Monthly';
  let billingCycleSavingsText = '';
  let upfrontMonths: number | undefined;
  let upfrontDiscountPercent: number | undefined;
  // Dan (16 Nov): 6 / 12 months upfront also takes the % off the initial delivery + fuel levy,
  // and the milestone credit inside the prepaid months comes off the prepaid rental.
  let upfrontDeliveryDiscount = 0;
  let upfrontMilestoneCredit = 0;
  let upfrontStorageSaving = 0;
  const applyUpfrontBreakdown = (months: number, percent: number, freeMonth: number) => {
    const credit = getMilestoneCreditInPeriod(months, matrixResult.milestoneDiscountAmount, matrixResult.milestoneDiscountOption);
    const b = calculateUpfrontBreakdown({
      effectiveMonthly: effectiveMonthlyContainerRate,
      months,
      freeMonthValue: freeMonth,
      milestoneCredit: credit,
      percent,
      initialDeliveryWithFuel: getPayableNowDeliveryAmount(payableNowLeg),
    });
    upfrontDeliveryDiscount = b.deliveryUpfrontSaving;
    upfrontMilestoneCredit = b.milestoneCredit;
    upfrontStorageSaving = b.storageUpfrontSaving;
    return b.storageTotal;
  };

  const monthlyCostOnWeeklyRate = Math.round(weeklyContainerRate * (52 / 12));

  switch (billingCycle) {
    case 'weekly':
      const discountedWeeklyRate = durationDiscountAmount > 0 ? sizeDiscounts.effectiveWeekly : weeklyContainerRate;
      currentPeriodicStorageFee = storageDuration === '2_weeks'
        ? (config.twoWeeksStorageRate !== undefined ? config.twoWeeksStorageRate : 199) * containerCount
        : discountedWeeklyRate;
      billingCycleLabel = storageDuration === '2_weeks' ? '2 Weeks Storage' : 'Weekly';
      billingCycleSavingsText = storageDuration === '2_weeks'
        ? `Standard rate ($${config.twoWeeksStorageRate ?? 199}/container for 2 weeks)`
        : (durationDiscountPercent > 0
          ? `${durationDiscountPercent}% duration savings applied`
          : 'Standard base rate');
      break;

    case 'monthly':
      if (storageDuration === '2_weeks') {
        currentPeriodicStorageFee = (config.twoWeeksStorageRate !== undefined ? config.twoWeeksStorageRate : 199) * containerCount;
        billingCycleLabel = '2 Weeks Storage';
        billingCycleSavingsText = `Standard rate ($${config.twoWeeksStorageRate ?? 199}/container for 2 weeks)`;
      } else {
        currentPeriodicStorageFee = effectiveMonthlyContainerRate;
        billingCycleLabel = 'Monthly';
        const monthlySavings = monthlyCostOnWeeklyRate - effectiveMonthlyContainerRate;
        billingCycleSavingsText = durationDiscountPercent > 0
          ? `${durationDiscountPercent}% duration discount (-$${durationDiscountAmount}/mo)`
          : `${Math.round((monthlySavings / monthlyCostOnWeeklyRate) * 100)}% savings`;
      }
      break;

    case '3_months_upfront':
      upfrontMonths = 3;
      upfrontDiscountPercent = Math.max(durationDiscountPercent, 20);
      currentPeriodicStorageFee = Math.round(baseMonthlyContainerRate * 3 * (1 - upfrontDiscountPercent / 100));
      billingCycleLabel = '3 Months Upfront then Monthly';
      const threeMonthsWeeklyTotal = weeklyContainerRate * 13;
      const threeMonthsSavings = threeMonthsWeeklyTotal - currentPeriodicStorageFee;
      billingCycleSavingsText = `${Math.round((threeMonthsSavings / threeMonthsWeeklyTotal) * 100)}% savings`;
      break;

    // Upfront prepayment discounts stack on top of the duration-discounted monthly rate,
    // so prepaying is never more expensive than paying the same months monthly.
    case '6_months_upfront': {
      upfrontMonths = 6;
      upfrontDiscountPercent = getUpfrontDiscountPercent('6_months_upfront', config.upfrontDiscounts);
      const durationText = durationDiscountAmount > 0 ? ` + ${durationDiscountPercent}% Duration Discount` : '';
      billingCycleLabel = '6 Months Upfront then Monthly';
      if (matrixResult.firstMonthFree) {
        currentPeriodicStorageFee = applyUpfrontBreakdown(6, upfrontDiscountPercent, freeMonthValue);
        billingCycleSavingsText = `1st Month Free + ${upfrontDiscountPercent}% Upfront Prepayment Discount${durationText}`;
      } else {
        currentPeriodicStorageFee = applyUpfrontBreakdown(6, upfrontDiscountPercent, 0);
        billingCycleSavingsText = `${upfrontDiscountPercent}% Upfront Prepayment Discount${durationText}`;
      }
      break;
    }

    case '12_months_upfront': {
      upfrontMonths = 12;
      upfrontDiscountPercent = getUpfrontDiscountPercent('12_months_upfront', config.upfrontDiscounts);
      const durationText = durationDiscountAmount > 0 ? ` + ${durationDiscountPercent}% Duration Discount` : '';
      currentPeriodicStorageFee = applyUpfrontBreakdown(12, upfrontDiscountPercent, 0);
      billingCycleLabel = '12 Months Paid Upfront then Monthly';
      billingCycleSavingsText = `${upfrontDiscountPercent}% Upfront Prepayment Discount${durationText}`;
      break;
    }
  }

  // Storage actually charged in the first payment (0 when the matrix gives 1st month free on monthly billing).
  // First-period storage promos are based on this so they can't double-dip with 1st month free.
  const payableStorageFirstMonth = (matrixResult.firstMonthFree && billingCycle === 'monthly')
    ? Math.max(0, currentPeriodicStorageFee - freeMonthValue) // 10 m³ containers' first month is still charged
    : currentPeriodicStorageFee;

  // 9. Promotions (Strictly ONE promo/discount applied at a time, including Eco Discount)
  interface PromoCandidate {
    rule: PromotionRule;
    discountAmount: number;
    description: string;
    isExplicitCode: boolean;
  }
  const candidates: PromoCandidate[] = [];

  config.promotions
    .filter((p) => p.active)
    .forEach((promo) => {
      let isEligible = false;
      const isExplicitCode = Boolean(
        promo.code && appliedPromoCode && promo.code.toUpperCase() === appliedPromoCode.trim().toUpperCase()
      );

      if (isExplicitCode) {
        isEligible = !promoCodeError;
      } else if (promo.autoApply) {
        // If an exclusive discount code is applied, all auto-applied promos are suppressed
        if (!isExclusivePromoApplied) {
          isEligible = true;
        }
      }

      // Check Portabox location filtering
      if (promo.targetLocations && promo.targetLocations.length > 0 && !promo.targetLocations.includes('All')) {
        const matchesOrigin = promo.targetLocations.includes(originHub);
        const matchesDest = destHub ? promo.targetLocations.includes(destHub) : false;
        if (!matchesOrigin && !matchesDest) {
          isEligible = false;
        }
      }

      // Check Service Type filtering (storage onsite, storage at portabox site, local moving, interstate moving)
      if (promo.serviceTypes && promo.serviceTypes.length > 0) {
        if (!promo.serviceTypes.includes(currentServiceScope)) {
          isEligible = false;
        }
      }

      // Check Container Size filtering (all, 10ft, 20ft)
      if (promo.containerSize && promo.containerSize !== 'all') {
        const is10 = containerSize === 'small_10m3';
        if (promo.containerSize === '10ft' && !is10) isEligible = false;
        if (promo.containerSize === '20ft' && is10) isEligible = false;
      }

      if (promo.targetHubOrigin && promo.targetHubOrigin !== originHub) {
        isEligible = false;
      }
      if (promo.targetHubDestination && destinationPostcode) {
        const destHubForRoute = getMetroHubForPostcode(destinationPostcode);
        if (promo.targetHubDestination !== destHubForRoute) {
          isEligible = false;
        }
      }

      if (promo.targetPostcode && promo.targetRadiusKm) {
        const targetCoords = originPostcode.postcode === promo.targetPostcode;
        if (!targetCoords && originDistanceKm > promo.targetRadiusKm) {
          isEligible = false;
        }
      }

      if (promo.minDurationMonths && durationMonths < promo.minDurationMonths) {
        isEligible = false;
      }

      if (isEligible) {
        let discount = 0;
        let desc = '';

        if (promo.type === 'free_initial_delivery') {
          discount = initialDeliveryFee;
          desc = `Free initial delivery ($${initialDeliveryFee} saving)`;
        } else if (promo.type === 'percent_off_first_month') {
          discount = Math.round((payableStorageFirstMonth * promo.value) / 100);
          desc = `${promo.value}% off first period storage ($${discount} saving)`;
        } else if (promo.type === 'free_first_month') {
          discount = payableStorageFirstMonth;
          desc = `First period storage free ($${discount} saving)`;
        } else if (promo.type === 'percent_off_interstate' && isInterstate && interstateFee > 0) {
          discount = Math.round((interstateFee * promo.value) / 100);
          desc = `${promo.value}% off interstate move fee ($${discount} saving)`;
        } else if (promo.type === 'free_container_upgrade' && containerSize === 'large_25m3') {
          discount = 10;
          desc = 'Free upgrade to 25 m³ for 19 m³ price ($10 saving)';
        } else if (promo.type === 'fixed_discount') {
          discount = promo.value;
          desc = `$${promo.value} promotional discount`;
        }

        if (discount > 0) {
          candidates.push({
            rule: promo,
            discountAmount: discount,
            description: desc,
            isExplicitCode,
          });
        }
      }
    });

  // Entered codes must exist in config.promotions and be eligible for this booking.
  // (Previously any unknown code was turned into a discount, e.g. HELLO = $50 off.)
  if (appliedPromoCode && appliedPromoCode.trim() && !promoCodeError && !candidates.some((c) => c.isExplicitCode)) {
    const rawCode = appliedPromoCode.trim().toUpperCase();
    const configured = config.promotions.find((p) => p.code && p.code.trim().toUpperCase() === rawCode);
    if (!configured) {
      promoCodeError = `Discount code "${appliedPromoCode}" is not recognised.`;
    } else if (configured.minDurationMonths && durationMonths < configured.minDurationMonths) {
      promoCodeError = `Discount code "${appliedPromoCode}" requires a booking of at least ${configured.minDurationMonths} months.`;
    } else if (
      matrixResult.firstMonthFree &&
      billingCycle === 'monthly' &&
      (configured.type === 'percent_off_first_month' || configured.type === 'free_first_month')
    ) {
      promoCodeError = `Discount code "${appliedPromoCode}" can't be combined with your 1st Month Free offer.`;
    } else {
      promoCodeError = `Discount code "${appliedPromoCode}" is not valid for this booking.`;
    }
    promoCodeSuccessMessage = undefined;
  }

  // 9b. Routing Efficiency & CO2 Emissions Calculation (Controlled by enableEcoEfficiencyIncentive feature flag)
  const efficiencyDiscountPct = config.efficiencyDiscountPercentage !== undefined ? config.efficiencyDiscountPercentage : 20;
  const ecoIncentiveType = config.ecoIncentiveType || 'dollar_discount';
  let ecoEmissionsInfo: QuoteBreakdown['ecoEmissionsInfo'] = undefined;

  if (params.selectedSlot && config.enableEcoEfficiencyIncentive !== false) {
    const slotIncentive = getSlotEfficiencyIncentive(
      params.selectedSlot.id,
      originPostcode.postcode,
      efficiencyDiscountPct,
      ecoIncentiveType
    );

    if (slotIncentive.isBestValue) {
      ecoEmissionsInfo = {
        isBestValue: true,
        co2SavedKg: slotIncentive.co2SavedKg,
        co2SavedText: slotIncentive.co2SavedText,
        reason: slotIncentive.reason,
        incentiveMode: ecoIncentiveType,
        discountPercent: efficiencyDiscountPct,
        discountAud: slotIncentive.discountAud,
      };

      // Only add as a candidate dollar discount if incentive mode is dollar_discount
      if (ecoIncentiveType === 'dollar_discount' && slotIncentive.discountAud > 0) {
        candidates.push({
          rule: {
            id: 'promo-efficiency-slot',
            name: `Best Value / Eco-Route Incentive (${efficiencyDiscountPct}%)`,
            code: 'ECO_ROUTE',
            description: `${efficiencyDiscountPct}% of fleet logistics efficiency savings passed directly to you`,
            type: 'fixed_discount',
            value: slotIncentive.discountAud,
            active: true,
            autoApply: true,
          },
          discountAmount: slotIncentive.discountAud,
          description: `Best Value Window (${efficiencyDiscountPct}% Efficiency Incentive: -$${slotIncentive.discountAud}) · 🌱 ${slotIncentive.co2SavedText}`,
          isExplicitCode: false,
        });
      }
    }
  }

  // 9c. Enforce Promotion Stacking & Exclusivity Rules
  const appliedPromotions: {
    rule: PromotionRule;
    discountAmount: number;
    description: string;
  }[] = [];

  // An invalid code only removes that code; auto-applied promotions still apply.
  const validCandidates = promoCodeError ? candidates.filter((c) => !c.isExplicitCode) : candidates;
  if (validCandidates.length > 0) {
    // If an exclusive candidate was matched
    const exclusiveCandidate = validCandidates.find((c) => c.rule.isExclusive && c.isExplicitCode);
    if (exclusiveCandidate) {
      appliedPromotions.push({
        rule: exclusiveCandidate.rule,
        discountAmount: exclusiveCandidate.discountAmount,
        description: `${exclusiveCandidate.description} (Exclusive: Sole Promotion)`,
      });
    } else {
      // Non-exclusive promo codes: Allow explicit promo code AND other non-exclusive auto-applied discounts (e.g. eco route) to stack!
      const explicitCandidates = validCandidates.filter((c) => c.isExplicitCode);
      const autoCandidates = validCandidates.filter((c) => !c.isExplicitCode);

      if (explicitCandidates.length > 0) {
        explicitCandidates.forEach((c) => {
          appliedPromotions.push({
            rule: c.rule,
            discountAmount: c.discountAmount,
            description: c.description,
          });
        });
        // Stacking with auto-applied candidate (e.g. Eco-Route) if not exclusive
        if (autoCandidates.length > 0) {
          const bestAuto = autoCandidates.sort((a, b) => b.discountAmount - a.discountAmount)[0];
          appliedPromotions.push({
            rule: bestAuto.rule,
            discountAmount: bestAuto.discountAmount,
            description: bestAuto.description,
          });
        }
      } else {
        // No explicit code: apply best auto candidate
        autoCandidates.sort((a, b) => b.discountAmount - a.discountAmount);
        if (autoCandidates[0]) {
          appliedPromotions.push({
            rule: autoCandidates[0].rule,
            discountAmount: autoCandidates[0].discountAmount,
            description: autoCandidates[0].description,
          });
        }
      }
    }
  }

  // Interstate line-haul discounts (e.g. QLD50) reduce the line-haul leg, which is paid later,
  // not the first payment (where they were previously floored at $0 and mostly lost).
  const interstateLegDiscount = Math.min(
    interstateFee,
    appliedPromotions
      .filter((p) => p.rule.type === 'percent_off_interstate')
      .reduce((sum, p) => sum + p.discountAmount, 0)
  );
  if (interstateLegDiscount > 0) {
    const lineHaulLeg = legs.find((l) => l.label.startsWith('Interstate transport'));
    if (lineHaulLeg) {
      lineHaulLeg.fee = Math.max(0, lineHaulLeg.fee - interstateLegDiscount);
      lineHaulLeg.description += ` · Promotional discount -$${interstateLegDiscount}`;
    }
  }

  // First-payment discounts can't exceed what is actually payable now; cap each promo so the
  // quoted discount (and savings) equals the money the customer really saves.
  const firstPaymentSubtotal =
    payableStorageFirstMonth + initialDeliveryFee + (payableNowLeg?.fuelSurcharge || 0) + totalSuppliesPrice + (insurance.selected ? insurance.totalMonthlyInsuranceFee : 0);
  let remainingPayable = firstPaymentSubtotal;
  for (let i = appliedPromotions.length - 1; i >= 0; i--) {
    const p = appliedPromotions[i];
    if (p.rule.type === 'percent_off_interstate') continue;
    const capped = Math.min(p.discountAmount, Math.max(0, remainingPayable));
    remainingPayable -= capped;
    if (capped <= 0) {
      appliedPromotions.splice(i, 1);
      if (appliedPromoCode && p.rule.code && p.rule.code.toUpperCase() === appliedPromoCode.trim().toUpperCase()) {
        promoCodeError = `Discount code "${appliedPromoCode}" can't be used: there is nothing payable at booking to discount.`;
        promoCodeSuccessMessage = undefined;
      }
    } else if (capped < p.discountAmount) {
      p.discountAmount = capped;
      p.description = `${p.description} (limited to $${capped} payable at booking)`;
    }
  }
  const totalDiscount = appliedPromotions.reduce((sum, p) => sum + p.discountAmount, 0);
  const firstPaymentDiscount = totalDiscount - interstateLegDiscount;

  const deferredFuelSurchargeAmount = legs.reduce(
    (sum, leg) => sum + (leg.fuelSurchargeDeferred ? (leg.fuelSurchargeEstimatedAmount || 0) : 0),
    0
  );
  const totalEstimatedFuelSurcharge = fuelSurchargeAmount + deferredFuelSurchargeAmount;

  // 10. First Payment Total: Periodic rent + initial delivery + packing supplies + insurance (if selected) - discounts
  let firstPaymentTotal = Math.round((firstPaymentSubtotal - firstPaymentDiscount - upfrontDeliveryDiscount) * 100) / 100;
  if (firstPaymentTotal < 0) firstPaymentTotal = 0;

  // 10b. Itemised customer savings (real money off this booking only; competitor comparisons are shown separately)
  const savingsBreakdown: { label: string; amount: number }[] = [];
  if (legsSavedDollarTotal > 0) {
    savingsBreakdown.push({
      label: `Loading/unloading at Portabox Location (${legsSavedCount} transport leg${legsSavedCount === 1 ? '' : 's'} waived)`,
      amount: Math.round(legsSavedDollarTotal),
    });
  }
  const isFreeMonthBilled = billingCycle === 'monthly' || billingCycle === '6_months_upfront';
  if (matrixResult.firstMonthFree && isFreeMonthBilled && storageDuration !== '2_weeks') {
    // Valued at the full rate; the duration/upfront items below cover the paid months only, so the items sum exactly
    savingsBreakdown.push({ label: '1st month storage free', amount: nonSmallListMonthly });
  }
  const committedMonths = Math.round(durationMonths);
  if (durationDiscountAmount > 0 && !isWeekly && committedMonths > 0) {
    const paidMonths = Math.max(0, committedMonths - (matrixResult.firstMonthFree && isFreeMonthBilled ? 1 : 0));
    if (paidMonths > 0) {
      savingsBreakdown.push({
        label: `${durationDiscountPercent}% duration discount ($${durationDiscountAmount}/mo × ${paidMonths} month${paidMonths === 1 ? '' : 's'})`,
        amount: durationDiscountAmount * paidMonths,
      });
    }
  }
  if (upfrontMonths) {
    const upfrontSaving = billingCycle === '3_months_upfront'
      ? Math.round(effectiveMonthlyContainerRate * upfrontMonths - currentPeriodicStorageFee)
      : Math.round((upfrontStorageSaving + upfrontDeliveryDiscount) * 100) / 100;
    if (upfrontSaving > 0) {
      savingsBreakdown.push({ label: `${upfrontDiscountPercent}% upfront prepayment discount`, amount: upfrontSaving });
    }
  }
  appliedPromotions.forEach((p) => {
    if (p.discountAmount > 0) savingsBreakdown.push({ label: p.description, amount: p.discountAmount });
  });
  if ((packingSupplies.locksCount ?? 0) > 0 && packingSupplies.locksSavings && packingSupplies.locksSavings > 0) {
    savingsBreakdown.push({ label: 'Free disc padlock', amount: packingSupplies.locksSavings });
  }
  // Free blanket rental: blankets inside the free allowance would otherwise be rented per 10-pack per month.
  if (blanketCalc.freeCount > 0) {
    const blanketBlockSize = config.packingSupplies?.blanketBlockSize ?? 10;
    const blanketBlockPrice = config.packingSupplies?.blanketBlockPriceMonthly ?? 25;
    const freeBlanketPacks = Math.ceil(blanketCalc.freeCount / blanketBlockSize);
    const blanketMonths = Math.max(1, committedMonths);
    const freeBlanketSaving = freeBlanketPacks * blanketBlockPrice * blanketMonths;
    if (freeBlanketSaving > 0) {
      savingsBreakdown.push({
        label: `Free blanket rental (${blanketCalc.freeCount} blankets × ${blanketMonths} month${blanketMonths === 1 ? '' : 's'})`,
        amount: freeBlanketSaving,
      });
    }
  }
  if (matrixResult.milestoneDiscountAmount > 0) {
    savingsBreakdown.push({ label: 'Milestone credit (credited during your 12+ month booking)', amount: matrixResult.milestoneDiscountAmount });
  }
  if (durationCompletionBonusDollars > 0) {
    savingsBreakdown.push({ label: `Completion reward (credited on completing ${committedMonths} months)`, amount: durationCompletionBonusDollars });
  }
  const totalSavings = savingsBreakdown.reduce((sum, s) => sum + s.amount, 0);

  const collectionFeeEstimate = legs[legs.length - 1]?.fee || legBaseFee;

  const storageRateFormatted = isWeekly
    ? `$${weeklyContainerRate} /week`
    : `$${monthlyContainerRate} /month`;

  const summaryText = `${containerCount > 1 ? containerName : `1 x ${containerName}`} (${containerVolume}) · ${
    serviceType === 'storage_at_place'
      ? 'Storage at your place'
      : serviceType === 'storage_facility'
      ? 'Storage at Portabox facility'
      : serviceType === 'moving'
      ? `Moving door to door${destinationPostcode ? ` to ${destinationPostcode.suburb} ${destinationPostcode.postcode}` : ''}`
      : `Moving and storage${destinationPostcode ? ` to ${destinationPostcode.suburb} ${destinationPostcode.postcode}` : ''}`
  } · ${isWeekly ? 'Weekly rate' : 'Monthly rate'} · ${originHub} zone ${deliveryZone}`;

  const smsPreviewText = `Hi [Customer], here's your Portabox quote: ${containerName} (${containerVolume}) at ${
    originPostcode.suburb
  }, ${storageRateFormatted}, delivery $${formatMoney(initialDeliveryFee)}, first payment $${formatMoney(firstPaymentTotal)}. Full breakdown: portabox.au/q/${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}. Reply here with any questions, or reply BOOK to lock in ${preferredDate}.`;

  return {
    containerSize,
    containerCount,
    containerSelections: params.containerSelections,
    totalVolumeM3: calculatedTotalVolumeM3,
    containerName,
    containerVolume,
    containerDimensions,
    serviceType,
    storagePlacement: isOnsite ? 'my_place' : 'facility',
    billingCycle,
    billingCycleLabel,
    billingCycleSavingsText,
    upfrontMonths,
    upfrontDiscountPercent,
    storageDuration,
    preferredDate,
    originPostcode,
    destinationPostcode,
    originDepot,
    originDistanceKm,
    deliveryZone,
    deliveryZoneRangeLabel,
    movingDistanceKm,
    moveRouteKm,
    movingDeliveryZone,
    movingDeliveryZoneRangeLabel,
    movingKmCharge,
    movingKmRatePerContainer,
    isInterstate,
    interstateRouteName,
    interstateFee: isInterstate ? interstateFee : undefined,
    interstateFeePerContainer: isInterstate ? interstateFeePerContainer : undefined,
    kmRatePerKm: kmRate,
    kmTotalCharge,
    requiresCallForPricing,
    monthlyContainerRate,
    weeklyContainerRate,
    monthlyRatePerContainer,
    weeklyRatePerContainer,
    storageRateFormatted,
    storagePricingText,
    domesticLegFeePerContainer: domesticLegFee,
    deliveryPricingText,
    fuelSurchargeRatePerKm,
    fuelSurchargeAmount,
    fuelSurchargePerContainer,
    isFuelSurchargeIncluded,
    fuelSurchargeModel: config.fuelSurchargeModel || 'per_km',
    fuelSurchargeZoneRates: config.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES,
    deferredFuelSurchargeAmount,
    totalEstimatedFuelSurcharge,
    distanceCalculationMethod: 'driving_distance' as const,
    packingSupplies,
    insurance,
    insuranceMonthlyFee: insurance.totalMonthlyInsuranceFee,
    insuranceSavingsMonthly: insurance.promoSavingsMonthly,
    protectionPlan: effectiveProtectionPlan,
    protectionPlanName: protectionCalc.planName,
    protectionMonthlyFee: protectionCalc.monthlyFee,
    protectionCoverageAmount: protectionCalc.coverageAmount,
    isInterstateProtectionMandatory,
    legs,
    waivedLegs,
    originLogisticsMethod,
    destinationLogisticsMethod,
    legsSavedCount,
    legsSavedDollarTotal,
    savingsBreakdown,
    totalSavings,
    totalLegsCount,
    requiredAddressesCount,
    initialDeliveryFee,
    firstPaymentTotal,
    monthlyStorageFee: effectiveMonthlyContainerRate,
    weeklyStorageFee: durationDiscountAmount > 0 ? sizeDiscounts.effectiveWeekly : weeklyContainerRate,
    discountBreakdownBySize: sizeDiscounts.lines.map((l) => ({
      ...l,
      // 1st month free only applies where the billing cycle gives it
      firstMonthFree: l.firstMonthFree && isFreeMonthBilled && storageDuration !== '2_weeks',
      hasDiscount: l.durationDiscountMonthly > 0 || (l.firstMonthFree && isFreeMonthBilled && storageDuration !== '2_weeks'),
    })),
    currentPeriodicStorageFee,
    firstPaymentStorageFee: payableStorageFirstMonth,
    firstPaymentDiscount,
    upfrontDeliveryDiscount: upfrontDeliveryDiscount > 0 ? upfrontDeliveryDiscount : undefined,
    upfrontMilestoneCredit: upfrontMilestoneCredit > 0 ? upfrontMilestoneCredit : undefined,
    collectionFeeEstimate,
    durationDiscountPercent: durationDiscountPercent > 0 ? durationDiscountPercent : undefined,
    durationDiscountAmount: durationDiscountAmount > 0 ? durationDiscountAmount : undefined,
    durationDiscountReason: durationDiscountPercent > 0 ? durationDiscountReason : undefined,
    durationDiscountApplyMode: durationDiscountPercent > 0 ? durationDiscountApplyMode : undefined,
    durationCompletionBonusDollars: durationCompletionBonusDollars > 0 ? durationCompletionBonusDollars : undefined,
    durationFreeBlanketsCount: durationFreeBlanketsCount > 0 ? durationFreeBlanketsCount : undefined,
    baseMonthlyStorageFee: baseMonthlyContainerRate,

    // Multi-dimensional discount matrix results
    annualDiscountOption: params.annualDiscountOption || '400B',
    isFirstMonthFree: matrixResult.firstMonthFree,
    firstMonthSavingsAmount: matrixResult.firstMonthSavings,
    freeLockIncluded: matrixResult.freeLockIncluded,
    freeBlanketsIncluded: matrixResult.freeBlanketsCount > 0,
    freeSuppliesRetailValue: matrixResult.freeSuppliesRetailValue,
    milestoneCreditTotal: matrixResult.milestoneDiscountAmount > 0 ? matrixResult.milestoneDiscountAmount : undefined,
    milestoneCreditOption: matrixResult.milestoneDiscountOption,
    discountMatrixMatchedRule: matrixResult.matchedRule,
    earlyTerminationWarning: matrixResult.earlyTerminationWarning,
    appliedPromotions,
    totalDiscount,
    appliedPromoCode: params.appliedPromoCode,
    promoCodeError,
    promoCodeSuccessMessage,
    isExclusivePromoApplied,
    summaryText,
    smsPreviewText,
    selectedSlot: params.selectedSlot,
    ecoEmissionsInfo,

    // 30-Day Guaranteed Price Lock & 12-Month Rate Freeze Lifecycle
    storageDurationMonths: durationMonths,
    quoteCreatedAt: new Date().toISOString(),
    quoteExpiresAt: new Date(Date.now() + (config.quoteValidityDays || 30) * 24 * 60 * 60 * 1000).toISOString(),
    quoteValidityDays: config.quoteValidityDays || 30,
    isQuoteExpired: false,
    daysRemainingInPriceLock: config.quoteValidityDays || 30,
    originalQuotedMonthlyRate: monthlyContainerRate,
    originalQuotedDeliveryFee: initialDeliveryFee,
    rateLockDurationMonths: config.rateLockDurationMonths || 12,
  };
}
