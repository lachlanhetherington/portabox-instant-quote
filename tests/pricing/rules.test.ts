/**
 * Rules every quote must obey, checked across the full scenario grid.
 * These don't need to know the right price for each quote, only that quotes are internally consistent.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/services/pricingEngine';
import { evaluatePostcodeServiceTier } from '../../src/services/postcodeServiceTierEngine';
import type { QuoteBreakdown } from '../../src/types/quote';
import { buildScenarios, DURATIONS, durationBucket, postcode, quote, type Scenario } from './scenarios';

const scenarios = buildScenarios();
const results = scenarios.map((s) => ({ s, q: quote(s.params) }));

/** Collects every failing scenario for a rule, so one run reports all of them, not just the first. */
function expectAll(rule: (q: QuoteBreakdown, s: Scenario) => string | null) {
  const failures: string[] = [];
  for (const { s, q } of results) {
    const problem = rule(q, s);
    if (problem) failures.push(`${s.name}: ${problem}`);
  }
  expect(failures.slice(0, 15), `${failures.length} of ${results.length} quotes break this rule`).toEqual([]);
}

/**
 * Value of the free first month: the discounted rent of the containers that get it. 10 m³ containers
 * never get 1st month free, so in a mixed booking their first month is still charged.
 */
const freeMonthValue = (q: QuoteBreakdown) =>
  q.isFirstMonthFree
    ? (q.discountBreakdownBySize || [])
        .filter((l) => l.sizeId !== 'small_10m3')
        .reduce((sum, l) => sum + l.listMonthlyRate - l.durationDiscountMonthly, 0)
    : 0;

const storageCharged = (q: QuoteBreakdown) =>
  q.isFirstMonthFree && q.billingCycle === 'monthly'
    ? Math.max(0, q.currentPeriodicStorageFee - freeMonthValue(q))
    : q.currentPeriodicStorageFee;

describe(`pricing rules (${scenarios.length} scenarios)`, () => {
  it('builds a valid quote for every scenario', () => {
    expectAll((q) => {
      for (const [k, v] of Object.entries(q)) {
        if (typeof v === 'number' && !Number.isFinite(v)) return `${k} is ${v}`;
      }
      const bad = q.legs.find((l) => !Number.isFinite(l.fee) || l.fee < 0);
      if (bad) return `leg "${bad.label}" has fee ${bad.fee}`;
      if (q.firstPaymentTotal < 0) return `first payment is negative (${q.firstPaymentTotal})`;
      return null;
    });
  });

  it('first payment = fees due now + first storage charge + supplies + protection − discounts', () => {
    expectAll((q) => {
      if (q.requiresCallForPricing) return null;
      const legsNow = q.legs.filter((l) => l.isPayableNow).reduce((sum, l) => sum + l.fee, 0);
      const protection = q.protectionPlan && q.protectionPlan !== 'none' ? q.protectionMonthlyFee || 0 : 0;
      const interstateDiscount = q.appliedPromotions
        .filter((p) => p.rule.type === 'percent_off_interstate')
        .reduce((sum, p) => sum + p.discountAmount, 0);
      const discount = (q.totalDiscount || 0) - interstateDiscount;
      // Dan (16 Nov): 6 / 12 months upfront also takes the upfront % off the initial delivery
      const upfrontDelivery = q.upfrontDeliveryDiscount || 0;
      const expected = Math.max(0, legsNow + storageCharged(q) + q.packingSupplies.totalSuppliesPrice + protection - discount - upfrontDelivery);
      return Math.abs(q.firstPaymentTotal - expected) > 0.01
        ? `first payment ${q.firstPaymentTotal}, parts add up to ${expected}`
        : null;
    });
  });

  it('the itemised savings add up to the total savings, and every item is a real saving', () => {
    expectAll((q) => {
      const items = q.savingsBreakdown || [];
      const sum = items.reduce((s, i) => s + i.amount, 0);
      if (Math.abs(sum - (q.totalSavings || 0)) > 0.01) return `items add to ${sum}, total says ${q.totalSavings}`;
      const bad = items.find((i) => !(i.amount > 0));
      return bad ? `savings item "${bad.label}" is ${bad.amount}` : null;
    });
  });

  it('10 m³ containers get no discount in any booking, and the per-size lines add up', () => {
    expectAll((q) => {
      const lines = q.discountBreakdownBySize || [];
      const small = lines.find((l) => l.sizeId === 'small_10m3');
      if (small && (small.hasDiscount || small.durationDiscountMonthly > 0 || small.firstMonthFree)) {
        return `10 m³ line shows a discount (${small.durationDiscountPercent}%, free month ${small.firstMonthFree})`;
      }
      const list = lines.reduce((s, l) => s + l.listMonthlyRate, 0);
      const off = lines.reduce((s, l) => s + l.durationDiscountMonthly, 0);
      if (lines.length && Math.abs(list - (q.baseMonthlyStorageFee ?? list)) > 0.01) return `size lines list $${list}, quote base $${q.baseMonthlyStorageFee}`;
      if (lines.length && Math.abs(list - off - q.monthlyStorageFee) > 0.01) return `size lines net $${list - off}, quote monthly $${q.monthlyStorageFee}`;
      return null;
    });
  });

  it('10 m³-only bookings never get a duration discount', () => {
    expectAll((q, s) => {
      const smallOnly = s.params.containerSize === 'small_10m3' && !s.params.containerSelections;
      return smallOnly && (q.durationDiscountPercent ?? 0) > 0 ? `got ${q.durationDiscountPercent}% duration discount` : null;
    });
  });

  it('every promo code is either applied or explained with an error', () => {
    expectAll((q, s) => {
      const code = s.params.appliedPromoCode?.trim().toUpperCase();
      if (!code) return null;
      const applied = q.appliedPromotions.some((p) => p.rule.code?.toUpperCase() === code && p.discountAmount > 0);
      if (!applied && !q.promoCodeError) return `code ${code} silently did nothing`;
      if (applied && q.promoCodeError) return `code ${code} applied but also shows error "${q.promoCodeError}"`;
      return null;
    });
  });

  it('unknown promo codes give no discount', () => {
    expectAll((q, s) => {
      const code = s.params.appliedPromoCode?.trim().toUpperCase();
      if (!code || DEFAULT_CONFIG.promotions.some((p) => p.code?.toUpperCase() === code)) return null;
      const fromCode = q.appliedPromotions.filter((p) => !p.rule.autoApply).reduce((sum, p) => sum + p.discountAmount, 0);
      return fromCode > 0 ? `unknown code ${code} gave $${fromCode} off` : null;
    });
  });
});

describe('billing comparisons', () => {
  // Same quote, no promo code, varying only the billing cycle or duration.
  const base = results.filter(
    ({ s }) => !s.params.appliedPromoCode && s.params.billingCycle === 'monthly' && (s.params.storageDurationMonths ?? 0) >= 1,
  );

  it('paying upfront is never dearer than paying monthly for the same months', () => {
    const failures: string[] = [];
    for (const { s, q: monthly } of base) {
      for (const [cycle, months] of [['6_months_upfront', 6], ['12_months_upfront', 12]] as const) {
        const upfront = quote({ ...s.params, billingCycle: cycle });
        const monthlyCost = monthly.monthlyStorageFee * months - freeMonthValue(monthly);
        if (upfront.currentPeriodicStorageFee > monthlyCost + 0.01) {
          failures.push(`${s.name}: ${cycle} costs $${upfront.currentPeriodicStorageFee}, monthly for ${months} months costs $${monthlyCost}`);
        }
      }
    }
    expect(failures.slice(0, 15), `${failures.length} cases`).toEqual([]);
  });

  it('a longer stay never costs more per month than a shorter one', () => {
    const failures: string[] = [];
    const seen = new Set<string>();
    for (const { s } of base) {
      const key = s.name.split(' · ').slice(0, 2).join(' · ');
      if (seen.has(key)) continue;
      seen.add(key);
      let previous: { months: number; fee: number } | null = null;
      for (const months of DURATIONS.filter((m) => m >= 1)) {
        const q = quote({ ...s.params, storageDuration: durationBucket(months), storageDurationMonths: months });
        if (previous && q.monthlyStorageFee > previous.fee + 0.01) {
          failures.push(`${key}: ${months} months is $${q.monthlyStorageFee}/mo, ${previous.months} months is $${previous.fee}/mo`);
        }
        previous = { months, fee: q.monthlyStorageFee };
      }
    }
    expect(failures.slice(0, 15), `${failures.length} cases`).toEqual([]);
  });
});

describe('coverage', () => {
  const tier = (pc: string) => evaluatePostcodeServiceTier(postcode(pc), DEFAULT_CONFIG.postcodeServiceTiers, false);

  it.each(['6000', '0800', '7000'])('refuses postcode %s (WA, NT, TAS)', (pc) => {
    expect(tier(pc).tier).toBe(3);
    expect(tier(pc).canProceedToQuote).toBe(false);
  });

  it.each(['5061', '3000', '2000', '4000'])('quotes metro postcode %s', (pc) => {
    expect(tier(pc).canProceedToQuote).toBe(true);
  });

  it('treats ACT as a serviced state, not an unserviced one', () => {
    expect(tier('2600').tier).not.toBe(3);
  });
});
