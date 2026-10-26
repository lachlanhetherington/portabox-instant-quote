import { AppConfig, ContainerSizeId, QuoteBreakdown } from '../types/quote';
import { calculateQuote, getLocationPricingForHub, getMetroHubForPostcode, loadAppConfig } from './pricingEngine';

export interface QuoteExpiryStatus {
  isExpired: boolean;
  daysRemaining: number;
  daysElapsed: number;
  createdAt: Date;
  expiresAt: Date;
  formattedExpiresDate: string;
  formattedCreatedDate: string;
  statusLabel: 'Active (Price Locked)' | 'Expiring Soon' | 'Expired (Recalculation Required)';
  statusColor: string;
}

export interface BookingPriceFreezeRecord {
  bookingDate: string;
  freezeUntilDate: string;
  isFrozenYear1: boolean;
  deliveryFeeLocked: boolean;
  originalQuotedMonthlyRate: number;
  originalQuotedDeliveryFee: number;
  annualReviewDate: string;
  annualReviewCompleted?: boolean;
  annualReviewNewRate?: number;
  notificationSent?: boolean;
  notificationDate?: string;
  notificationText?: string;
}

export type AnnualReviewScenario =
  | 'market_drop'
  | 'moderate_increase'
  | 'high_market_increase'
  | 'unchanged';

export interface AnnualReviewEvaluation {
  originalQuotePrice: number;
  currentCatalogPrice: number;
  capPercent: number;
  capPrice: number;
  newMonthlyRate: number;
  priceFloorApplied: boolean;
  capEnforced: boolean;
  rateIncreased: boolean;
  increaseAmount: number;
  increasePercent: number;
  notificationRequired: boolean;
  scenario: AnnualReviewScenario;
  scenarioLabel: string;
  rationale: string;
  customerNotificationText?: string;
}

/**
 * 1. Checks 30-Day Pre-Booking Quote Validity
 */
export function checkQuoteExpiry(
  quote: QuoteBreakdown,
  asOfDate: Date = new Date()
): QuoteExpiryStatus {
  const validityDays = quote.quoteValidityDays || 30;
  
  // Resolve creation date
  let createdDate: Date;
  if (quote.quoteCreatedAt) {
    createdDate = new Date(quote.quoteCreatedAt);
    if (isNaN(createdDate.getTime())) {
      createdDate = new Date();
    }
  } else {
    createdDate = new Date();
  }

  // Calculate 30 calendar days expiration
  const expiresDate = quote.quoteExpiresAt
    ? new Date(quote.quoteExpiresAt)
    : new Date(createdDate.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const nowMs = asOfDate.getTime();
  const expiresMs = expiresDate.getTime();
  const diffMs = expiresMs - nowMs;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const daysElapsed = Math.max(0, Math.floor((nowMs - createdDate.getTime()) / (24 * 60 * 60 * 1000)));
  const isExpired = nowMs >= expiresMs || daysRemaining === 0;

  let statusLabel: 'Active (Price Locked)' | 'Expiring Soon' | 'Expired (Recalculation Required)' = 'Active (Price Locked)';
  let statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';

  if (isExpired) {
    statusLabel = 'Expired (Recalculation Required)';
    statusColor = 'bg-rose-100 text-rose-800 border-rose-200';
  } else if (daysRemaining <= 5) {
    statusLabel = 'Expiring Soon';
    statusColor = 'bg-amber-100 text-amber-800 border-amber-200';
  }

  return {
    isExpired,
    daysRemaining,
    daysElapsed,
    createdAt: createdDate,
    expiresAt: expiresDate,
    formattedExpiresDate: expiresDate.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    formattedCreatedDate: createdDate.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    statusLabel,
    statusColor,
  };
}

/**
 * Recalculates an expired quote at current catalog pricing.
 * Preserves user's postcodes, container specifications and quantities (no re-entry needed).
 * Issues a new 30-day price-lock window.
 */
export function recalculateExpiredQuote(
  quote: QuoteBreakdown,
  config: AppConfig
): QuoteBreakdown {
  const recalculated = calculateQuote({
    originPostcode: quote.originPostcode,
    destinationPostcode: quote.destinationPostcode,
    serviceType: quote.serviceType,
    containerSize: quote.containerSize,
    containerCount: quote.containerCount,
    containerSelections: quote.containerSelections,
    totalVolumeM3: quote.totalVolumeM3,
    billingCycle: quote.billingCycle,
    storageDuration: quote.storageDuration,
    preferredDate: quote.preferredDate,
    selectedSlot: quote.selectedSlot,
    boxesCount: quote.packingSupplies?.boxesCount,
    blanketsCount: quote.packingSupplies?.blanketsCount,
    appliedPromoCode: quote.appliedPromoCode,
    config,
  });

  const now = new Date();
  const validityDays = config.quoteValidityDays || 30;
  const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  return {
    ...recalculated,
    quoteCreatedAt: now.toISOString(),
    quoteExpiresAt: expiresAt.toISOString(),
    quoteValidityDays: validityDays,
    isQuoteExpired: false,
    daysRemainingInPriceLock: validityDays,
    isRepricedAfterExpiry: true,
    originalQuotedAt: quote.quoteCreatedAt || quote.originalQuotedAt || now.toISOString(),
    originalQuotedMonthlyRate: quote.monthlyStorageFee,
    originalQuotedDeliveryFee: quote.initialDeliveryFee,
  };
}

/**
 * 2. Creates a 12-Month Rate Freeze upon booking confirmation
 */
export function createBookingPriceFreeze(
  quote: QuoteBreakdown,
  bookingDate: Date = new Date()
): BookingPriceFreezeRecord {
  const freezeUntilDate = new Date(bookingDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const annualReviewDate = new Date(freezeUntilDate.getTime());

  return {
    bookingDate: bookingDate.toISOString(),
    freezeUntilDate: freezeUntilDate.toISOString(),
    isFrozenYear1: true,
    deliveryFeeLocked: true,
    originalQuotedMonthlyRate: quote.monthlyStorageFee,
    originalQuotedDeliveryFee: quote.initialDeliveryFee,
    annualReviewDate: annualReviewDate.toISOString(),
    annualReviewCompleted: false,
  };
}

/**
 * 3. Evaluates Annual Rental Review at Month 12+
 * Formula:
 * New Monthly Rate = max(Quote Price, min(Current Catalog Price, Quote Price * (1 + Admin Increase %)))
 */
export function evaluateAnnualRentalReview(params: {
  originalQuotePrice: number;
  currentCatalogPrice: number;
  capPercent?: number;
  customerName?: string;
  orderNumber?: string;
  containerName?: string;
}): AnnualReviewEvaluation {
  const { originalQuotePrice, currentCatalogPrice } = params;
  const capPercent = params.capPercent !== undefined ? params.capPercent : 10;

  // Formula Components:
  // 1. Capped maximum increase above original quote
  const capPrice = Math.round(originalQuotePrice * (1 + capPercent / 100) * 100) / 100;
  // 2. Minimum of current catalog and capped price
  const minCatalogOrCap = Math.min(currentCatalogPrice, capPrice);
  // 3. Price Floor Rule: Rates cannot decrease below original quote price
  const newMonthlyRate = Math.max(originalQuotePrice, minCatalogOrCap);

  const priceFloorApplied = currentCatalogPrice < originalQuotePrice;
  const capEnforced = currentCatalogPrice > capPrice;
  const rateIncreased = newMonthlyRate > originalQuotePrice;
  const increaseAmount = Math.round((newMonthlyRate - originalQuotePrice) * 100) / 100;
  const increasePercent = originalQuotePrice > 0 ? Math.round((increaseAmount / originalQuotePrice) * 1000) / 10 : 0;
  const notificationRequired = rateIncreased;

  // Classify into exact scenarios from requirements:
  let scenario: AnnualReviewScenario = 'unchanged';
  let scenarioLabel = 'Unchanged Market';
  let rationale = 'Market rate equals original quote price ($' + originalQuotePrice + '). No rate change applied.';

  if (priceFloorApplied) {
    scenario = 'market_drop';
    scenarioLabel = 'Market Drop';
    rationale = `Current catalog rate ($${currentCatalogPrice}) is below original quote rate ($${originalQuotePrice}). Price floor applied: no price decreases below original quote rate.`;
  } else if (capEnforced) {
    scenario = 'high_market_increase';
    scenarioLabel = 'High Market Increase';
    rationale = `Current catalog rate ($${currentCatalogPrice}) exceeds the +${capPercent}% annual cap ($${capPrice}). Rate is capped at +${capPercent}% ($${newMonthlyRate}).`;
  } else if (rateIncreased) {
    scenario = 'moderate_increase';
    scenarioLabel = 'Moderate Increase';
    rationale = `Current catalog rate ($${currentCatalogPrice}) is lower than the +${capPercent}% cap ($${capPrice}). New rate adjusted to active catalog price ($${newMonthlyRate}).`;
  }

  // Generate automated customer notification text if rate increased
  let customerNotificationText: string | undefined;
  if (notificationRequired) {
    const cust = params.customerName || 'Valued Customer';
    const cName = params.containerName || 'Portabox Container';
    customerNotificationText =
      `Important Notice regarding your Portabox annual rental review: ` +
      `Dear ${cust}, your initial 12-month rate freeze for ${cName} has completed. ` +
      `Under our Annual Rental Review Policy (capped at +${capPercent}%), your monthly storage rate will update ` +
      `from $${originalQuotePrice}/mo to $${newMonthlyRate}/mo effective from your upcoming billing cycle. ` +
      `The delivery fee is subject to the pricing policy applied to your quote: once the quote freeze period expires, the delivery fee becomes live at catalog price until booking of a leg, then it is fixed unless the leg is cancelled (date changes are allowed without penalty). Thank you for choosing Portabox!`;
  }

  return {
    originalQuotePrice,
    currentCatalogPrice,
    capPercent,
    capPrice,
    newMonthlyRate,
    priceFloorApplied,
    capEnforced,
    rateIncreased,
    increaseAmount,
    increasePercent,
    notificationRequired,
    scenario,
    scenarioLabel,
    rationale,
    customerNotificationText,
  };
}

/**
 * Returns the 4 canonical verification scenarios from the user requirement specification
 * Scenario: Quote Price = $100, Cap = 10%
 */
export function getStandardReviewScenarios(
  quotePrice = 100,
  capPercent = 10
): {
  scenarioName: string;
  catalogPrice: number;
  expectedRate: number;
  evaluation: AnnualReviewEvaluation;
}[] {
  const testCases = [
    { scenarioName: 'Market Drop', catalogPrice: 90, expectedRate: 100 },
    { scenarioName: 'Moderate Increase', catalogPrice: 106, expectedRate: 106 },
    { scenarioName: 'High Market Increase', catalogPrice: 125, expectedRate: 110 },
    { scenarioName: 'Unchanged Market', catalogPrice: 100, expectedRate: 100 },
  ];

  return testCases.map((tc) => ({
    scenarioName: tc.scenarioName,
    catalogPrice: tc.catalogPrice,
    expectedRate: tc.expectedRate,
    evaluation: evaluateAnnualRentalReview({
      originalQuotePrice: quotePrice,
      currentCatalogPrice: tc.catalogPrice,
      capPercent,
      customerName: 'Sarah Jenkins',
      containerName: 'Large 25m³ Portabox',
    }),
  }));
}

/**
 * 4. Revenue Impact & Pricing Projection Formula (Post-12-Month Rule)
 * Implements exact spec:
 * cappedRate = currentFrozenRate * (1 + adminIncreasePct)
 * targetRate = min(currentCatalogRate, cappedRate)
 * anticipatedRate = max(currentFrozenRate, targetRate) (floor constraint)
 * monthlyRevenueDelta = anticipatedRate - currentFrozenRate
 * annualRevenueDelta = monthlyRevenueDelta * 12
 */
export interface RevenueProjection {
  anticipatedRate: number;
  monthlyRevenueDelta: number;
  annualRevenueDelta: number;
  notificationRequired: boolean;
}

export function calculateCustomerPricingAndRevenueImpact(
  currentFrozenRate: number,
  currentCatalogRate: number,
  adminIncreasePct: number = 0.10 // 10% admin default
): RevenueProjection {
  const cappedRate = currentFrozenRate * (1 + adminIncreasePct);
  const targetRate = Math.min(currentCatalogRate, cappedRate);
  const anticipatedRate = Math.max(currentFrozenRate, targetRate); // Floor constraint: no price decrease

  const monthlyRevenueDelta = anticipatedRate - currentFrozenRate; // Impact on monthly revenue
  const annualRevenueDelta = monthlyRevenueDelta * 12;

  return {
    anticipatedRate: Number(anticipatedRate.toFixed(2)),
    monthlyRevenueDelta: Number(monthlyRevenueDelta.toFixed(2)),
    annualRevenueDelta: Number(annualRevenueDelta.toFixed(2)),
    notificationRequired: monthlyRevenueDelta > 0, // Communicated only if price changes
  };
}

export interface FrozenPriceContract {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingReference: string;
  containerSize: string;
  containerCount: number;
  metroHub: string;
  suburb: string;
  state: string;
  frozenComponents: string[];
  freezeStartDate: string; // ISO date string
  freezeExpiryDate: string; // ISO date string
  daysRemaining: number;
  currentFrozenRate: number;
  currentCatalogRate: number;
  anticipatedNewRate: number;
  monthlyRevenueDelta: number;
  annualRevenueDelta: number;
  notificationRequired: boolean;
  notificationStatus?: 'Pending' | 'Sent' | 'Dismissed';
  notificationSentDate?: string;
  notes?: string;
  // Admin Manual Pricing Override
  hasManualOverride?: boolean;
  overrideMonthlyRate?: number;
  overrideDurationMonths?: number; // Further N months
  overrideStartDate?: string;
  overrideExpiryDate?: string;
  overrideMonthsRemaining?: number;
  overrideReason?: string;
  overrideAppliedBy?: string;
}

export interface FrozenMRRSummaryKPIs {
  currentFrozenMRR: number;
  projectedPostUnfreezeMRR: number;
  netMonthlyRevenueImpact: number;
  mrrImpactPipeline30Day: number;
  mrrImpactPipeline90Day: number;
  totalContractsCount: number;
  unfreezing30DaysCount: number;
  unfreezing90DaysCount: number;
  notificationsRequiredCount: number;
}

const STORAGE_KEY_FROZEN_CONTRACTS = 'portabox_frozen_pricing_contracts_v1';

export function getInitialSeedFrozenContracts(adminCapPct = 0.10): FrozenPriceContract[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const rawSeeds = [
    {
      customerId: 'CUST-84920',
      customerName: 'David Miller',
      customerEmail: 'david.m@example.com',
      customerPhone: '0412 345 678',
      bookingReference: 'PB-84920',
      containerSize: 'Large (25 m³)',
      containerCount: 1,
      metroHub: 'Adelaide',
      suburb: 'Unley',
      state: 'SA',
      frozenComponents: ['Monthly Storage Rental', '25 m³ High-Cube Container', 'Zone A Quoted Delivery ($149 · Policy Governed)'],
      daysElapsed: 350, // 15 days remaining until 365
      currentFrozenRate: 219.00,
      currentCatalogRate: 249.00,
      notificationStatus: 'Pending' as const,
      notes: 'Initial move from Hyde Park. Excellent payment history.',
    },
    {
      customerId: 'CUST-84102',
      customerName: 'Marcus Vance',
      customerEmail: 'marcus.v@example.com.au',
      customerPhone: '0421 988 654',
      bookingReference: 'PB-84102',
      containerSize: '2 x Large (50 m³)',
      containerCount: 2,
      metroHub: 'Melbourne',
      suburb: 'Brighton',
      state: 'VIC',
      frozenComponents: ['Monthly Storage Rental (2 Units)', '50 m³ Modular Space', 'Zone B Quoted Delivery (Policy Governed)'],
      daysElapsed: 342, // 23 days remaining
      currentFrozenRate: 418.00,
      currentCatalogRate: 478.00,
      notificationStatus: 'Pending' as const,
      notes: 'Long-term residential renovation storage.',
    },
    {
      customerId: 'CUST-83719',
      customerName: 'Elena Rostova',
      customerEmail: 'elena.rostova@sydneyarch.com',
      customerPhone: '0433 112 233',
      bookingReference: 'PB-83719',
      containerSize: 'Medium (19 m³)',
      containerCount: 1,
      metroHub: 'Sydney',
      suburb: 'Paddington',
      state: 'NSW',
      frozenComponents: ['Monthly Storage Rental', '19 m³ Container Tier', 'Zone A Quoted Delivery (Policy Governed)'],
      daysElapsed: 320, // 45 days remaining
      currentFrozenRate: 219.00,
      currentCatalogRate: 230.00,
      notificationStatus: 'Pending' as const,
      notes: 'Commercial studio equipment staging.',
    },
    {
      customerId: 'CUST-83110',
      customerName: 'Liam O\'Connor',
      customerEmail: 'liam.oconnor@brisbanemedia.com',
      customerPhone: '0455 778 899',
      bookingReference: 'PB-83110',
      containerSize: 'Large (25 m³)',
      containerCount: 1,
      metroHub: 'Brisbane',
      suburb: 'New Farm',
      state: 'QLD',
      frozenComponents: ['Monthly Storage Rental', '25 m³ Container Tier', 'Zone A Quoted Delivery (Policy Governed)'],
      daysElapsed: 300, // 65 days remaining
      currentFrozenRate: 219.00,
      currentCatalogRate: 265.00,
      notificationStatus: 'Pending' as const,
      notes: 'Corporate event staging inventory.',
    },
    {
      customerId: 'CUST-82904',
      customerName: 'Chloe Henderson',
      customerEmail: 'chloe.h@adelaidelegal.com',
      customerPhone: '0414 556 677',
      bookingReference: 'PB-82904',
      containerSize: 'Small (10 m³)',
      containerCount: 1,
      metroHub: 'Adelaide',
      suburb: 'Hyde Park',
      state: 'SA',
      frozenComponents: ['Monthly Storage Rental', '10 m³ Container Tier', 'Zone A Quoted Delivery ($149 · Policy Governed)'],
      daysElapsed: 290, // 75 days remaining
      currentFrozenRate: 209.00,
      currentCatalogRate: 209.00, // Unchanged market
      notificationStatus: 'Dismissed' as const,
      notes: 'Unchanged market scenario: no price delta.',
    },
    {
      customerId: 'CUST-81490',
      customerName: 'Benjamin Taylor',
      customerEmail: 'ben.taylor@coastconstructions.com.au',
      customerPhone: '0420 334 455',
      bookingReference: 'PB-81490',
      containerSize: 'Large (25 m³)',
      containerCount: 1,
      metroHub: 'Brisbane',
      suburb: 'Gilberton',
      state: 'QLD',
      frozenComponents: ['Monthly Storage (Large 25m³)', 'Tier 1 Standard Rate', 'Zone A Quoted Delivery (Policy Governed)'],
      daysElapsed: 210, // 155 days remaining
      currentFrozenRate: 219.00,
      currentCatalogRate: 239.00,
      notificationStatus: 'Pending' as const,
      notes: 'Construction site temporary storage unit.',
    },
    {
      customerId: 'CUST-80211',
      customerName: 'Jessica & Ryan Hayes',
      customerEmail: 'jess.hayes@gmail.com',
      customerPhone: '0409 887 766',
      bookingReference: 'PB-80211',
      containerSize: 'Large (25 m³)',
      containerCount: 1,
      metroHub: 'Adelaide',
      suburb: 'Norwood',
      state: 'SA',
      frozenComponents: ['Monthly Storage Rental', '25 m³ Container Tier', 'Zone A Quoted Delivery (Policy Governed)'],
      daysElapsed: 160, // 205 days remaining
      currentFrozenRate: 219.00,
      currentCatalogRate: 210.00, // Market drop: price floor enforced
      notificationStatus: 'Dismissed' as const,
      notes: 'Market drop: price floor enforced, rate cannot drop.',
    },
    {
      customerId: 'CUST-79402',
      customerName: 'Samantha Wu',
      customerEmail: 'samantha.wu@melbournedesign.com',
      customerPhone: '0411 223 344',
      bookingReference: 'PB-79402',
      containerSize: 'Large (25 m³)',
      containerCount: 1,
      metroHub: 'Melbourne',
      suburb: 'South Yarra',
      state: 'VIC',
      frozenComponents: ['Monthly Storage Rental', '25 m³ Container Tier', 'Zone A Quoted Delivery (Policy Governed)'],
      daysElapsed: 375, // 0 days remaining (lapsed 10 days ago)
      currentFrozenRate: 219.00,
      currentCatalogRate: 250.00,
      notificationStatus: 'Sent' as const,
      notificationSentDate: new Date(now.getTime() - 25 * dayMs).toISOString(),
      notes: 'Freeze expired. Ready for billing cycle update execution.',
    },
  ];

  return rawSeeds.map((seed) => {
    const startDate = new Date(now.getTime() - seed.daysElapsed * dayMs);
    const expiryDate = new Date(startDate.getTime() + 365 * dayMs);
    const diffMs = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / dayMs));

    const proj = calculateCustomerPricingAndRevenueImpact(
      seed.currentFrozenRate,
      seed.currentCatalogRate,
      adminCapPct
    );

    return {
      customerId: seed.customerId,
      customerName: seed.customerName,
      customerEmail: seed.customerEmail,
      customerPhone: seed.customerPhone,
      bookingReference: seed.bookingReference,
      containerSize: seed.containerSize,
      containerCount: seed.containerCount,
      metroHub: seed.metroHub,
      suburb: seed.suburb,
      state: seed.state,
      frozenComponents: seed.frozenComponents,
      freezeStartDate: startDate.toISOString(),
      freezeExpiryDate: expiryDate.toISOString(),
      daysRemaining,
      currentFrozenRate: seed.currentFrozenRate,
      currentCatalogRate: seed.currentCatalogRate,
      anticipatedNewRate: proj.anticipatedRate,
      monthlyRevenueDelta: proj.monthlyRevenueDelta,
      annualRevenueDelta: proj.annualRevenueDelta,
      notificationRequired: proj.notificationRequired,
      notificationStatus: seed.notificationStatus,
      notificationSentDate: seed.notificationSentDate,
      notes: seed.notes,
    };
  });
}

export function loadFrozenPriceContracts(adminCapPct = 0.10): FrozenPriceContract[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FROZEN_CONTRACTS);
    if (!raw) {
      const seeded = getInitialSeedFrozenContracts(adminCapPct);
      saveFrozenPriceContracts(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as FrozenPriceContract[];
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    // Recalculate daysRemaining & projections with active admin cap
    return parsed.map((c) => {
      const expiry = new Date(c.freezeExpiryDate);
      const diffMs = expiry.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / dayMs));
      const proj = calculateCustomerPricingAndRevenueImpact(
        c.currentFrozenRate,
        c.currentCatalogRate,
        adminCapPct
      );
      return {
        ...c,
        daysRemaining,
        anticipatedNewRate: proj.anticipatedRate,
        monthlyRevenueDelta: proj.monthlyRevenueDelta,
        annualRevenueDelta: proj.annualRevenueDelta,
        notificationRequired: proj.notificationRequired,
      };
    });
  } catch (err) {
    console.error('Error loading frozen contracts:', err);
    return getInitialSeedFrozenContracts(adminCapPct);
  }
}

export function saveFrozenPriceContracts(contracts: FrozenPriceContract[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FROZEN_CONTRACTS, JSON.stringify(contracts));
  } catch (err) {
    console.error('Error saving frozen contracts:', err);
  }
}

export function calculateFrozenMRRSummary(
  contracts: FrozenPriceContract[]
): FrozenMRRSummaryKPIs {
  let currentFrozenMRR = 0;
  let projectedPostUnfreezeMRR = 0;
  let netMonthlyRevenueImpact = 0;
  let mrrImpactPipeline30Day = 0;
  let mrrImpactPipeline90Day = 0;
  let unfreezing30DaysCount = 0;
  let unfreezing90DaysCount = 0;
  let notificationsRequiredCount = 0;

  for (const c of contracts) {
    currentFrozenMRR += c.currentFrozenRate;
    projectedPostUnfreezeMRR += c.anticipatedNewRate;
    netMonthlyRevenueImpact += c.monthlyRevenueDelta;

    if (c.daysRemaining > 0 && c.daysRemaining <= 30) {
      mrrImpactPipeline30Day += c.monthlyRevenueDelta;
      unfreezing30DaysCount++;
    }
    if (c.daysRemaining > 0 && c.daysRemaining <= 90) {
      mrrImpactPipeline90Day += c.monthlyRevenueDelta;
      unfreezing90DaysCount++;
    }
    if (c.notificationRequired) {
      notificationsRequiredCount++;
    }
  }

  return {
    currentFrozenMRR: Number(currentFrozenMRR.toFixed(2)),
    projectedPostUnfreezeMRR: Number(projectedPostUnfreezeMRR.toFixed(2)),
    netMonthlyRevenueImpact: Number(netMonthlyRevenueImpact.toFixed(2)),
    mrrImpactPipeline30Day: Number(mrrImpactPipeline30Day.toFixed(2)),
    mrrImpactPipeline90Day: Number(mrrImpactPipeline90Day.toFixed(2)),
    totalContractsCount: contracts.length,
    unfreezing30DaysCount,
    unfreezing90DaysCount,
    notificationsRequiredCount,
  };
}

/**
 * Applies an Admin Manual Pricing Override for further N months to a contract.
 * Once the N months expire, the existing pricing review policy applies.
 */
export function applyManualContractOverride(
  bookingRefOrCustomerId: string,
  params: {
    overrideMonthlyRate: number;
    durationMonths: number;
    reason?: string;
    appliedBy?: string;
  },
  adminCapPct: number = 0.10
): { updatedContracts: FrozenPriceContract[]; updatedContract: FrozenPriceContract | null } {
  const contracts = loadFrozenPriceContracts(adminCapPct);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const durationDays = Math.round(params.durationMonths * 30.4375);
  const expiryDate = new Date(now.getTime() + durationDays * dayMs);

  let updatedContract: FrozenPriceContract | null = null;

  const updatedContracts = contracts.map((contract) => {
    if (contract.bookingReference === bookingRefOrCustomerId || contract.customerId === bookingRefOrCustomerId) {
      const proj = calculateCustomerPricingAndRevenueImpact(
        params.overrideMonthlyRate,
        contract.currentCatalogRate,
        adminCapPct
      );

      const modified: FrozenPriceContract = {
        ...contract,
        hasManualOverride: true,
        overrideMonthlyRate: params.overrideMonthlyRate,
        overrideDurationMonths: params.durationMonths,
        overrideStartDate: now.toISOString(),
        overrideExpiryDate: expiryDate.toISOString(),
        overrideMonthsRemaining: params.durationMonths,
        overrideReason: params.reason || 'Admin custom rate override',
        overrideAppliedBy: params.appliedBy || 'Admin',
        currentFrozenRate: params.overrideMonthlyRate,
        freezeExpiryDate: expiryDate.toISOString(),
        daysRemaining: durationDays,
        anticipatedNewRate: proj.anticipatedRate,
        monthlyRevenueDelta: proj.monthlyRevenueDelta,
        annualRevenueDelta: proj.annualRevenueDelta,
        notes: `${contract.notes || ''} [Override: $${params.overrideMonthlyRate}/mo for further ${params.durationMonths} months set on ${now.toLocaleDateString('en-AU')}. Standard review applies upon expiry.]`.trim(),
      };
      updatedContract = modified;
      return modified;
    }
    return contract;
  });

  saveFrozenPriceContracts(updatedContracts);
  return { updatedContracts, updatedContract };
}

