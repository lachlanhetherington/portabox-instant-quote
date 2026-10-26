/**
 * Portabox Frozen Pricing & Revenue Impact Forecast Service
 * Handles 12-month contract price freezes, time-to-unfreeze countdowns,
 * post-unfreeze rate calculation with admin increase caps and floor constraints,
 * and financial MRR / ARR revenue impact projections.
 */

export interface RevenueProjection {
  anticipatedRate: number;
  monthlyRevenueDelta: number;
  annualRevenueDelta: number;
  notificationRequired: boolean;
}

/**
 * Core pricing calculation formula matching Portabox business rules:
 * 1. Admin Cap Percentage: cappedRate = currentFrozenRate * (1 + adminIncreasePct)
 * 2. Catalog Comparison: targetRate = min(currentCatalogRate, cappedRate)
 * 3. Floor Constraint: anticipatedRate = max(currentFrozenRate, targetRate)
 * 4. Revenue Impact: monthlyRevenueDelta = anticipatedRate - currentFrozenRate
 */
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

export type PricingRuleOutcome =
  | 'capped_increase' // Catalog rate exceeded the admin cap, rate was capped
  | 'catalog_rate_match' // Catalog rate was lower than cap but higher than frozen
  | 'floor_constraint_applied' // Catalog rate was lower than frozen rate, price cannot drop
  | 'rate_unchanged'; // Rates are identical

export interface CustomerPriceFreezeRecord {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  booking_reference: string;
  container_tier: string;
  container_count: number;
  frozen_components: string[]; // e.g. ['Monthly Rental', 'Large 25m³ Tier', 'Quoted Delivery (Fixed upon booking)']
  original_frozen_rate?: number; // Base rate prior to manual overrides
  freeze_start_date: string; // ISO or YYYY-MM-DD
  freeze_expiry_date: string; // ISO or YYYY-MM-DD
  days_remaining: number; // max(0, DATEDIFF(freeze_expiry_date, NOW()))
  current_frozen_rate: number;
  current_catalog_rate: number;
  anticipated_new_rate: number;
  monthly_revenue_delta: number;
  annual_revenue_delta: number;
  notification_required: boolean;
  notification_sent?: boolean;
  notification_date?: string;
  notification_channel?: 'Email' | 'SMS' | 'Both';
  outcome_type: PricingRuleOutcome;
  notes?: string;
  last_updated?: string;
  // Manual Pricing Override for further N months
  has_manual_override?: boolean;
  override_monthly_rate?: number;
  override_duration_months?: number; // Further N months set by admin
  override_start_date?: string; // ISO string
  override_expiry_date?: string; // ISO string
  override_months_remaining?: number;
  override_reason?: string;
  override_applied_by?: string;
}

export interface FreezeForecastSummary {
  currentFrozenMrr: number;
  projectedPostUnfreezeMrr: number;
  netMonthlyRevenueImpact: number;
  mrrPipeline30Days: number;
  mrrPipeline90Days: number;
  annualRevenueImpact: number;
  totalContractsCount: number;
  contracts30DaysCount: number;
  contracts90DaysCount: number;
  notificationsPendingCount: number;
  cappedContractsCount: number;
  floorProtectedCount: number;
  avgMonthlyIncreasePercent: number;
}

const STORAGE_KEY = 'portabox_customer_price_freezes';

/**
 * Helper to compute days remaining from current date
 */
export function calculateDaysRemaining(freezeExpiryDateStr: string, asOfDate: Date = new Date()): number {
  const expiry = new Date(freezeExpiryDateStr);
  const now = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  const expiryMidnight = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const diffTime = expiryMidnight.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Generates initial realistic sample records reflecting active Portabox contracts
 */
export function getInitialSeedPriceFreezes(adminIncreasePct: number = 0.10): CustomerPriceFreezeRecord[] {
  const now = new Date();
  
  const createDateOffset = (daysInFuture: number): { start: string; expiry: string } => {
    // 12-month freeze means start date was (365 - daysInFuture) days in past
    const expiry = new Date(now.getTime() + daysInFuture * 24 * 60 * 60 * 1000);
    const start = new Date(expiry.getTime() - 365 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().split('T')[0],
      expiry: expiry.toISOString().split('T')[0],
    };
  };

  const rawContracts = [
    {
      customer_id: 'CUST-8021',
      customer_name: 'Sarah Jenkins',
      customer_email: 'sarah.jenkins@gmail.com',
      customer_phone: '0412 849 201',
      booking_reference: 'PB-BKG-2025-8841',
      container_tier: 'Large 25m³ Portabox Pro',
      container_count: 1,
      frozen_components: ['Monthly Rental', 'Large 25m³ Tier', 'Quoted Initial Delivery (Policy Governed)'],
      daysUntilExpiry: 12, // <= 30 Days (Imminent pipeline!)
      current_frozen_rate: 219.0,
      current_catalog_rate: 269.0, // High market jump, cap will apply
      notes: 'Long-term residential renovation storage in Norwood. Notice due immediately.',
    },
    {
      customer_id: 'CUST-8022',
      customer_name: 'David Miller',
      customer_email: 'david.miller@builderpro.com.au',
      customer_phone: '0433 912 304',
      booking_reference: 'PB-BKG-2025-9102',
      container_tier: 'Large 25m³ Portabox Pro',
      container_count: 2,
      frozen_components: ['Monthly Rental', 'Dual 25m³ Volume Tier', 'Commercial Jobsite Placement'],
      daysUntilExpiry: 24, // <= 30 Days
      current_frozen_rate: 410.0,
      current_catalog_rate: 480.0, // Exceeds cap
      notes: 'Builder Pro trade account. 2x Large units placed on Hyde Park site.',
    },
    {
      customer_id: 'CUST-8023',
      customer_name: 'Marcus Vance',
      customer_email: 'm.vance@techstudio.io',
      customer_phone: '0488 231 990',
      booking_reference: 'PB-BKG-2025-9340',
      container_tier: 'Medium 19m³ Portabox Standard',
      container_count: 1,
      frozen_components: ['Monthly Rental', 'Medium 19m³ Tier', 'Depot Staging Reserve'],
      daysUntilExpiry: 48, // <= 90 Days
      current_frozen_rate: 189.0,
      current_catalog_rate: 205.0, // Moderate increase below cap
      notes: 'Office relocation inventory stored at Portabox Depot Bay 14.',
    },
    {
      customer_id: 'CUST-8024',
      customer_name: 'Elena Rostova',
      customer_email: 'elena.rostova@designgroup.com.au',
      customer_phone: '0455 120 449',
      booking_reference: 'PB-BKG-2025-9511',
      container_tier: 'Small 10m³ Portabox Mini',
      container_count: 1,
      frozen_components: ['Monthly Rental', 'Small 10m³ Tier', 'Standard Damage Waiver'],
      daysUntilExpiry: 72, // <= 90 Days
      current_frozen_rate: 139.0,
      current_catalog_rate: 155.0, // Capped increase
      notes: 'Apartment decluttering storage. Autopay active via Visa.',
    },
    {
      customer_id: 'CUST-8025',
      customer_name: 'Harrison Boyd',
      customer_email: 'harrison.b@apexlogistics.com.au',
      customer_phone: '0421 988 312',
      booking_reference: 'PB-BKG-2025-9788',
      container_tier: 'Large 25m³ Portabox Pro',
      container_count: 3,
      frozen_components: ['Monthly Rental', 'Fleet Multi-Box Tier', 'Quoted Delivery (Policy Governed)'],
      daysUntilExpiry: 85, // <= 90 Days
      current_frozen_rate: 620.0,
      current_catalog_rate: 735.0, // Capped increase
      notes: 'Enterprise account. 3x Large containers for seasonal retail buffer.',
    },
    {
      customer_id: 'CUST-8026',
      customer_name: 'Rachel Adams',
      customer_email: 'rachel.adams@coastalproperties.com',
      customer_phone: '0419 444 882',
      booking_reference: 'PB-BKG-2026-1044',
      container_tier: 'Medium 19m³ Portabox Standard',
      container_count: 1,
      frozen_components: ['Monthly Rental', 'Medium 19m³ Tier'],
      daysUntilExpiry: 135, // > 90 Days
      current_frozen_rate: 195.0,
      current_catalog_rate: 185.0, // Market drop scenario: Price Floor applies!
      notes: 'Market rate dropped below frozen rate. Zero increase applied due to floor guarantee.',
    },
    {
      customer_id: 'CUST-8027',
      customer_name: 'Cameron Lee',
      customer_email: 'cameron.lee@adelaidelaw.com.au',
      customer_phone: '0402 771 909',
      booking_reference: 'PB-BKG-2026-1209',
      container_tier: 'Small 10m³ Portabox Mini',
      container_count: 1,
      frozen_components: ['Monthly Rental', 'Small 10m³ Tier', 'Document Vault Placement'],
      daysUntilExpiry: 190, // > 90 Days
      current_frozen_rate: 145.0,
      current_catalog_rate: 145.0, // Unchanged market rate
      notes: 'Legal archive document storage. Active autopay.',
    },
    {
      customer_id: 'CUST-8028',
      customer_name: 'Boutique Living Adelaide',
      customer_email: 'admin@boutiqueliving.com.au',
      customer_phone: '08 8234 5000',
      booking_reference: 'PB-BKG-2026-1510',
      container_tier: 'Large 25m³ Portabox Pro',
      container_count: 2,
      frozen_components: ['Monthly Rental', 'Corporate Staging Tier', 'Quoted Delivery (Policy Governed)'],
      daysUntilExpiry: 260, // > 90 Days
      current_frozen_rate: 440.0,
      current_catalog_rate: 518.0, // Exceeds cap
      notes: 'Home staging furnishings. Annual review scheduled for late Q3.',
    },
  ];

  return rawContracts.map((c) => {
    const dates = createDateOffset(c.daysUntilExpiry);
    const projection = calculateCustomerPricingAndRevenueImpact(
      c.current_frozen_rate,
      c.current_catalog_rate,
      adminIncreasePct
    );

    const cappedRate = c.current_frozen_rate * (1 + adminIncreasePct);
    let outcome_type: PricingRuleOutcome = 'rate_unchanged';
    if (c.current_catalog_rate < c.current_frozen_rate) {
      outcome_type = 'floor_constraint_applied';
    } else if (c.current_catalog_rate > cappedRate) {
      outcome_type = 'capped_increase';
    } else if (projection.monthlyRevenueDelta > 0) {
      outcome_type = 'catalog_rate_match';
    }

    return {
      customer_id: c.customer_id,
      customer_name: c.customer_name,
      customer_email: c.customer_email,
      customer_phone: c.customer_phone,
      booking_reference: c.booking_reference,
      container_tier: c.container_tier,
      container_count: c.container_count,
      frozen_components: c.frozen_components,
      freeze_start_date: dates.start,
      freeze_expiry_date: dates.expiry,
      days_remaining: c.daysUntilExpiry,
      current_frozen_rate: c.current_frozen_rate,
      current_catalog_rate: c.current_catalog_rate,
      anticipated_new_rate: projection.anticipatedRate,
      monthly_revenue_delta: projection.monthlyRevenueDelta,
      annual_revenue_delta: projection.annualRevenueDelta,
      notification_required: projection.notificationRequired,
      notification_sent: c.daysUntilExpiry <= 14,
      notification_date: c.daysUntilExpiry <= 14 ? new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
      notification_channel: c.daysUntilExpiry <= 14 ? 'Email' : undefined,
      outcome_type,
      notes: c.notes,
      last_updated: now.toISOString(),
    };
  });
}

/**
 * Loads price freezes from localStorage or initializes seeds
 */
export function loadCustomerPriceFreezes(adminIncreasePct: number = 0.10): CustomerPriceFreezeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = getInitialSeedPriceFreezes(adminIncreasePct);
      saveCustomerPriceFreezes(seeded);
      return seeded;
    }
    const parsed: CustomerPriceFreezeRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = getInitialSeedPriceFreezes(adminIncreasePct);
      saveCustomerPriceFreezes(seeded);
      return seeded;
    }

    // Refresh dynamic fields (days_remaining and live projections based on adminIncreasePct)
    return parsed.map((item) => {
      const days = calculateDaysRemaining(item.freeze_expiry_date);
      const projection = calculateCustomerPricingAndRevenueImpact(
        item.current_frozen_rate,
        item.current_catalog_rate,
        adminIncreasePct
      );

      const cappedRate = item.current_frozen_rate * (1 + adminIncreasePct);
      let outcome_type: PricingRuleOutcome = 'rate_unchanged';
      if (item.current_catalog_rate < item.current_frozen_rate) {
        outcome_type = 'floor_constraint_applied';
      } else if (item.current_catalog_rate > cappedRate) {
        outcome_type = 'capped_increase';
      } else if (projection.monthlyRevenueDelta > 0) {
        outcome_type = 'catalog_rate_match';
      }

      return {
        ...item,
        days_remaining: days,
        anticipated_new_rate: projection.anticipatedRate,
        monthly_revenue_delta: projection.monthlyRevenueDelta,
        annual_revenue_delta: projection.annualRevenueDelta,
        notification_required: projection.notificationRequired,
        outcome_type,
      };
    });
  } catch (err) {
    console.error('Failed to load customer price freezes from storage', err);
    return getInitialSeedPriceFreezes(adminIncreasePct);
  }
}

/**
 * Persists customer price freezes
 */
export function saveCustomerPriceFreezes(records: CustomerPriceFreezeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save customer price freezes to storage', err);
  }
}

/**
 * Aggregates summary KPIs from contract list
 */
export function computeFreezeForecastSummary(
  records: CustomerPriceFreezeRecord[],
  adminIncreasePct: number = 0.10
): FreezeForecastSummary {
  let currentFrozenMrr = 0;
  let projectedPostUnfreezeMrr = 0;
  let netMonthlyRevenueImpact = 0;
  let mrrPipeline30Days = 0;
  let mrrPipeline90Days = 0;
  let notificationsPendingCount = 0;
  let cappedContractsCount = 0;
  let floorProtectedCount = 0;
  let contracts30DaysCount = 0;
  let contracts90DaysCount = 0;

  for (const r of records) {
    // Recalculate using active adminIncreasePct
    const proj = calculateCustomerPricingAndRevenueImpact(
      r.current_frozen_rate,
      r.current_catalog_rate,
      adminIncreasePct
    );

    currentFrozenMrr += r.current_frozen_rate;
    projectedPostUnfreezeMrr += proj.anticipatedRate;
    netMonthlyRevenueImpact += proj.monthlyRevenueDelta;

    if (r.days_remaining <= 30) {
      mrrPipeline30Days += proj.monthlyRevenueDelta;
      contracts30DaysCount++;
    }
    if (r.days_remaining <= 90) {
      mrrPipeline90Days += proj.monthlyRevenueDelta;
      contracts90DaysCount++;
    }

    if (proj.notificationRequired && !r.notification_sent) {
      notificationsPendingCount++;
    }

    const cappedRate = r.current_frozen_rate * (1 + adminIncreasePct);
    if (r.current_catalog_rate < r.current_frozen_rate) {
      floorProtectedCount++;
    } else if (r.current_catalog_rate > cappedRate) {
      cappedContractsCount++;
    }
  }

  const annualRevenueImpact = netMonthlyRevenueImpact * 12;
  const avgMonthlyIncreasePercent =
    currentFrozenMrr > 0 ? (netMonthlyRevenueImpact / currentFrozenMrr) * 100 : 0;

  return {
    currentFrozenMrr: Number(currentFrozenMrr.toFixed(2)),
    projectedPostUnfreezeMrr: Number(projectedPostUnfreezeMrr.toFixed(2)),
    netMonthlyRevenueImpact: Number(netMonthlyRevenueImpact.toFixed(2)),
    mrrPipeline30Days: Number(mrrPipeline30Days.toFixed(2)),
    mrrPipeline90Days: Number(mrrPipeline90Days.toFixed(2)),
    annualRevenueImpact: Number(annualRevenueImpact.toFixed(2)),
    totalContractsCount: records.length,
    contracts30DaysCount,
    contracts90DaysCount,
    notificationsPendingCount,
    cappedContractsCount,
    floorProtectedCount,
    avgMonthlyIncreasePercent: Number(avgMonthlyIncreasePercent.toFixed(1)),
  };
}

/**
 * Formats Australian Dollars currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Builds automated customer notice text
 */
export function generateCustomerPriceNotice(
  record: CustomerPriceFreezeRecord,
  adminIncreasePct: number = 0.10
): string {
  const capPercentStr = `${Math.round(adminIncreasePct * 100)}%`;

  if (record.has_manual_override) {
    return `PORTABOX PRICING OVERRIDE CONFIRMATION NOTICE

Customer: ${record.customer_name} (ID: ${record.customer_id})
Booking Reference: ${record.booking_reference}
Container Tier: ${record.container_tier}
Override Monthly Rate: ${formatCurrency(record.override_monthly_rate || record.current_frozen_rate)} / month
Override Duration: Further ${record.override_duration_months || 0} Months
Override Expiry Date: ${record.freeze_expiry_date}
Agreement Reason: ${record.override_reason || 'Admin custom rate override'}

Dear ${record.customer_name},

This notice confirms your special commercial pricing arrangement with Portabox. Your storage rate has been custom-locked at ${formatCurrency(record.override_monthly_rate || record.current_frozen_rate)} / month for a further ${record.override_duration_months} months, valid until ${record.freeze_expiry_date}.

PRICING POLICY AFTER OVERRIDE EXPIRY:
Once this ${record.override_duration_months}-month override pricing period expires, Portabox's existing pricing review policy applies automatically (annual review capped at max +${capPercentStr} with floor constraint protection).

DELIVERY FEE POLICY:
The delivery fee is subject to the pricing policy applied to your quote: once the quote freeze period expires, the delivery fee becomes live at catalog price until booking of a leg, then it is fixed unless the leg is cancelled (date changes are allowed without penalty).

If you have questions, please contact our support desk at support@portabox.com.au or call 1300 PORTABOX.`;
  }

  return `PORTABOX ANNUAL RENTAL REVIEW NOTICE

Customer: ${record.customer_name} (ID: ${record.customer_id})
Booking Reference: ${record.booking_reference}
Container Tier: ${record.container_tier}
Effective Review Date: ${record.freeze_expiry_date}

Dear ${record.customer_name},

Thank you for choosing Portabox. Your initial 12-month price freeze period will conclude on ${record.freeze_expiry_date}.

In accordance with our Annual Price Adjustment Policy:
- Previous Frozen Rate: ${formatCurrency(record.current_frozen_rate)} / month
- Active Catalog Rate: ${formatCurrency(record.current_catalog_rate)} / month
- Admin Annual Increase Cap: +${capPercentStr} (Maximum capped rate: ${formatCurrency(record.current_frozen_rate * (1 + adminIncreasePct))})
- New Adjusted Monthly Rate: ${formatCurrency(record.anticipated_new_rate)} / month
- Monthly Adjustment (Δ): +${formatCurrency(record.monthly_revenue_delta)} / month

DELIVERY FEE POLICY:
The delivery fee is subject to the pricing policy applied to your quote: once the quote freeze period expires, the delivery fee becomes live at catalog price until booking of a leg, then it is fixed unless the leg is cancelled (date changes are allowed without penalty).

If you have any questions or would like to discuss prepaid multi-month discounts, please contact our support desk at support@portabox.com.au or 1300 PORTABOX.`;
}

/**
 * Applies an Admin Manual Pricing Override for further N months to a contract.
 * Admin has option to set pricing for further N months, and then existing pricing review policy applies after pricing period expires.
 */
export function applyManualPriceOverride(
  bookingRefOrCustomerId: string,
  params: {
    overrideMonthlyRate: number;
    durationMonths: number;
    reason?: string;
    appliedBy?: string;
  },
  adminIncreasePct: number = 0.10
): { updatedRecords: CustomerPriceFreezeRecord[]; updatedRecord: CustomerPriceFreezeRecord | null } {
  const records = loadCustomerPriceFreezes(adminIncreasePct);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  
  // Calculate expiry date: exactly durationMonths in future (approx 30.4375 days per month)
  const durationDays = Math.round(params.durationMonths * 30.4375);
  const expiryDate = new Date(now.getTime() + durationDays * dayMs);

  let updatedRecord: CustomerPriceFreezeRecord | null = null;

  const updatedRecords = records.map((record) => {
    if (record.booking_reference === bookingRefOrCustomerId || record.customer_id === bookingRefOrCustomerId) {
      const originalBaseRate = record.original_frozen_rate ?? record.current_frozen_rate;
      const proj = calculateCustomerPricingAndRevenueImpact(
        params.overrideMonthlyRate,
        record.current_catalog_rate,
        adminIncreasePct
      );

      const cappedRate = params.overrideMonthlyRate * (1 + adminIncreasePct);
      let outcome_type: PricingRuleOutcome = 'rate_unchanged';
      if (record.current_catalog_rate < params.overrideMonthlyRate) {
        outcome_type = 'floor_constraint_applied';
      } else if (record.current_catalog_rate > cappedRate) {
        outcome_type = 'capped_increase';
      } else if (proj.monthlyRevenueDelta > 0) {
        outcome_type = 'catalog_rate_match';
      }

      const modified: CustomerPriceFreezeRecord = {
        ...record,
        original_frozen_rate: originalBaseRate,
        has_manual_override: true,
        override_monthly_rate: params.overrideMonthlyRate,
        override_duration_months: params.durationMonths,
        override_start_date: now.toISOString(),
        override_expiry_date: expiryDate.toISOString(),
        override_months_remaining: params.durationMonths,
        override_reason: params.reason || 'Admin custom rate override',
        override_applied_by: params.appliedBy || 'Admin',
        current_frozen_rate: params.overrideMonthlyRate,
        freeze_expiry_date: expiryDate.toISOString().split('T')[0],
        days_remaining: durationDays,
        anticipated_new_rate: proj.anticipatedRate,
        monthly_revenue_delta: proj.monthlyRevenueDelta,
        annual_revenue_delta: proj.annualRevenueDelta,
        outcome_type,
        last_updated: now.toISOString(),
        notes: `${record.notes || ''} [Override: $${params.overrideMonthlyRate}/mo set for further ${params.durationMonths} months on ${now.toLocaleDateString('en-AU')}. Existing pricing review policy applies upon expiry.]`.trim(),
      };
      updatedRecord = modified;
      return modified;
    }
    return record;
  });

  saveCustomerPriceFreezes(updatedRecords);
  return { updatedRecords, updatedRecord };
}

/**
 * Removes or resets a manual override, restoring the standard pricing review policy
 */
export function clearManualPriceOverride(
  bookingRefOrCustomerId: string,
  adminIncreasePct: number = 0.10
): CustomerPriceFreezeRecord[] {
  const records = loadCustomerPriceFreezes(adminIncreasePct);
  const now = new Date();

  const updatedRecords = records.map((record) => {
    if (record.booking_reference === bookingRefOrCustomerId || record.customer_id === bookingRefOrCustomerId) {
      const restoredRate = record.original_frozen_rate ?? record.current_frozen_rate;
      const proj = calculateCustomerPricingAndRevenueImpact(
        restoredRate,
        record.current_catalog_rate,
        adminIncreasePct
      );

      const cappedRate = restoredRate * (1 + adminIncreasePct);
      let outcome_type: PricingRuleOutcome = 'rate_unchanged';
      if (record.current_catalog_rate < restoredRate) {
        outcome_type = 'floor_constraint_applied';
      } else if (record.current_catalog_rate > cappedRate) {
        outcome_type = 'capped_increase';
      } else if (proj.monthlyRevenueDelta > 0) {
        outcome_type = 'catalog_rate_match';
      }

      const {
        has_manual_override,
        override_monthly_rate,
        override_duration_months,
        override_start_date,
        override_expiry_date,
        override_months_remaining,
        override_reason,
        override_applied_by,
        ...rest
      } = record;

      return {
        ...rest,
        has_manual_override: false,
        current_frozen_rate: restoredRate,
        anticipated_new_rate: proj.anticipatedRate,
        monthly_revenue_delta: proj.monthlyRevenueDelta,
        annual_revenue_delta: proj.annualRevenueDelta,
        outcome_type,
        last_updated: now.toISOString(),
        notes: `${record.notes || ''} [Override removed on ${now.toLocaleDateString('en-AU')}. Standard pricing review policy restored.]`.trim(),
      };
    }
    return record;
  });

  saveCustomerPriceFreezes(updatedRecords);
  return updatedRecords;
}
