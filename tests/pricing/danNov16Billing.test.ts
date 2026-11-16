/**
 * Dan (16 Nov, Duration & Billing / Duration & Discount Matrix):
 * - duration discounts come only from the discount matrix (no hidden 10/20/30% tiers)
 * - 6 months upfront needs 6+ months; 12 months upfront needs 12+ months
 * - upfront % = % of (rental − milestone credit in the prepaid months) + % of initial delivery incl. fuel levy
 * - 0.5 month matrix rows are dropped
 */
import { describe, expect, it } from 'vitest';
import {
  calculateQuote,
  calculateUpfrontBreakdown,
  DEFAULT_CONFIG,
  getMilestoneCreditInPeriod,
  getPayableNowDeliveryAmount,
  isUpfrontCycleAllowed,
  normalizeAppConfig,
} from '../../src/services/pricingEngine';
import { getPostcodeRecord } from '../../src/data/australianPostcodes';
import { getQuoteCostSections } from '../../src/services/quoteCostSections';
import type { BillingCycle } from '../../src/types/quote';

const storageQuote = (months: number, billingCycle: BillingCycle, annualDiscountOption: '400A' | '400B' = '400B') =>
  calculateQuote({
    config: DEFAULT_CONFIG,
    originPostcode: getPostcodeRecord('5000')!,
    serviceType: 'storage_facility',
    containerSize: 'large_25m3',
    storageDuration: months >= 12 ? '12_plus_months' : months >= 4 ? '4_to_11_months' : '1_to_3_months',
    storageDurationMonths: months,
    billingCycle,
    annualDiscountOption,
    preferredDate: '2026-12-01',
  });

describe("Dan's worked examples", () => {
  it('6 months upfront, 5%, Option 400B: $55.70 + $5.70 = $61.40', () => {
    const b = calculateUpfrontBreakdown({
      effectiveMonthly: 219,
      months: 6,
      freeMonthValue: 0,
      milestoneCredit: getMilestoneCreditInPeriod(6, 400, '400B'),
      percent: 5,
      initialDeliveryWithFuel: 114,
    });
    expect(b.milestoneCredit).toBe(200);
    expect(b.storageUpfrontSaving).toBe(55.7);
    expect(b.deliveryUpfrontSaving).toBe(5.7);
    expect(b.storageTotal).toBe(1058.3);
  });

  it('6 months upfront with Option 400A has no credit in the first 6 months', () => {
    expect(getMilestoneCreditInPeriod(6, 400, '400A')).toBe(0);
  });

  it('12 months upfront, 10%: $222.80 + $11.40 = $234.20', () => {
    const b = calculateUpfrontBreakdown({
      effectiveMonthly: 219,
      months: 12,
      freeMonthValue: 0,
      milestoneCredit: getMilestoneCreditInPeriod(12, 400, '400B'),
      percent: 10,
      initialDeliveryWithFuel: 114,
    });
    expect(b.milestoneCredit).toBe(400);
    expect(b.storageUpfrontSaving).toBe(222.8);
    expect(b.deliveryUpfrontSaving).toBe(11.4);
  });
});

describe('upfront availability', () => {
  it('6 months upfront from 6 months; 12 months upfront from 12 months', () => {
    expect(isUpfrontCycleAllowed('6_months_upfront', 5)).toBe(false);
    expect(isUpfrontCycleAllowed('6_months_upfront', 6)).toBe(true);
    expect(isUpfrontCycleAllowed('12_months_upfront', 11)).toBe(false);
    expect(isUpfrontCycleAllowed('12_months_upfront', 12)).toBe(true);
    expect(isUpfrontCycleAllowed('monthly', 1)).toBe(true);
  });

  it('a quote asking for an upfront option the duration does not allow is billed monthly', () => {
    expect(storageQuote(4, '6_months_upfront').billingCycle).toBe('monthly');
    expect(storageQuote(9, '12_months_upfront').billingCycle).toBe('monthly');
    expect(storageQuote(9, '6_months_upfront').billingCycle).toBe('6_months_upfront');
  });
});

describe('duration discount comes from the matrix only', () => {
  it('12+ months monthly storage is the full rate (no hidden 30%)', () => {
    const q = storageQuote(12, 'monthly');
    expect(q.monthlyStorageFee).toBe(q.baseMonthlyStorageFee);
    expect(q.durationDiscountPercent).toBeUndefined();
  });

  it('a % set on the matrix rule is still applied', () => {
    const config = {
      ...DEFAULT_CONFIG,
      discountMatrixRules: DEFAULT_CONFIG.discountMatrixRules!.map((r) =>
        r.id === 'dm-12m-both' ? { ...r, discountPercent: 10 } : r
      ),
    };
    const q = calculateQuote({
      config,
      originPostcode: getPostcodeRecord('5000')!,
      serviceType: 'storage_facility',
      containerSize: 'large_25m3',
      storageDuration: '12_plus_months',
      storageDurationMonths: 12,
      billingCycle: 'monthly',
      preferredDate: '2026-12-01',
    });
    expect(q.durationDiscountPercent).toBe(10);
    expect(q.monthlyStorageFee).toBeLessThan(q.baseMonthlyStorageFee ?? 0);
  });
});

describe('upfront quotes', () => {
  for (const [cycle, months, pct, credit] of [
    ['6_months_upfront', 12, 5, 200],
    ['12_months_upfront', 12, 10, 400],
  ] as const) {
    it(`${cycle} on 12+ months: credit, rental % and delivery % follow Dan's formula`, () => {
      const q = storageQuote(months, cycle);
      const prepaid = cycle === '6_months_upfront' ? 6 : 12;
      const rate = q.baseMonthlyStorageFee ?? 0;
      const delivery = getPayableNowDeliveryAmount(q.legs.find((l) => l.isPayableNow));
      expect(q.upfrontMilestoneCredit).toBe(credit);
      const rentalPct = Math.round((rate * prepaid - credit) * pct) / 100;
      expect(q.firstPaymentStorageFee).toBeCloseTo(rate * prepaid - credit - rentalPct, 2);
      expect(q.upfrontDeliveryDiscount).toBeCloseTo(Math.round(delivery * pct) / 100, 2);
      // The cost sections still add up to the first payment
      const sections = getQuoteCostSections(q);
      const sum = sections.upfront.lines.reduce((t, l) => t + l.amount, 0);
      expect(sum).toBeCloseTo(q.firstPaymentTotal, 2);
    });
  }
});

describe('0.5 month rows', () => {
  it('are dropped from a stored matrix', () => {
    const halfMonth = { ...DEFAULT_CONFIG.discountMatrixRules![0], id: 'half', minMonths: 0.5, maxMonths: 0.5 };
    const cfg = normalizeAppConfig({ discountMatrixRules: [halfMonth, ...DEFAULT_CONFIG.discountMatrixRules!] });
    expect(cfg.discountMatrixRules!.some((r) => r.id === 'half')).toBe(false);
    expect(cfg.discountMatrixRules!.length).toBe(DEFAULT_CONFIG.discountMatrixRules!.length);
  });
});
