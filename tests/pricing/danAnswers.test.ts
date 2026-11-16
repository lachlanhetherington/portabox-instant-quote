/**
 * Dan's answers (14 Nov): free lock and blankets per container, $400 credit per container,
 * COO stacks with CPO, CEO-editable upfront discounts, duration blocks.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  calculateLockSalesPrice,
  calculateProtectionPlanFee,
  getDurationBlock,
} from '../../src/services/pricingEngine';
import { postcode, quote } from './scenarios';

const base = {
  originPostcode: postcode('5000'),
  serviceType: 'storage_facility' as const,
  storagePlacement: 'facility' as const,
  containerSize: 'large_25m3' as const,
  containerCount: 2,
  containerSelections: { small_10m3: 0, medium_19m3: 0, large_25m3: 2, two_large_50m3: 0 },
  billingCycle: 'monthly' as const,
  preferredDate: '2026-12-01',
  config: DEFAULT_CONFIG,
};

describe('locks', () => {
  it('gives one free lock per container and charges extra locks', () => {
    const unit = DEFAULT_CONFIG.packingSupplies?.lockPrice ?? 22;
    expect(calculateLockSalesPrice(2, DEFAULT_CONFIG.packingSupplies, 2).totalPrice).toBe(0);
    expect(calculateLockSalesPrice(4, DEFAULT_CONFIG.packingSupplies, 2).totalPrice).toBe(2 * unit);
    expect(calculateLockSalesPrice(0, DEFAULT_CONFIG.packingSupplies, 2).totalPrice).toBe(0);
  });

  it('includes the free lock from 1 month, one per container', () => {
    const q = quote({ ...base, storageDuration: '1_to_3_months', storageDurationMonths: 1, locksCount: 2, blanketsCount: 20 });
    expect(q.packingSupplies.locksPrice).toBe(0);
    expect(q.packingSupplies.blanketsPrice).toBe(0);
  });
});

describe('blankets', () => {
  it('rents 10 free per container and charges a second pack per month', () => {
    const q = quote({ ...base, storageDuration: '4_to_11_months', storageDurationMonths: 6, blanketsCount: 40, locksCount: 2 });
    const pack = DEFAULT_CONFIG.packingSupplies?.blanketBlockPriceMonthly ?? 25;
    expect(q.packingSupplies.blanketsPrice).toBe(2 * pack);
  });
});

describe('12+ month credit', () => {
  it('is $400 per container', () => {
    const q = quote({ ...base, storageDuration: '12_plus_months', storageDurationMonths: 12, blanketsCount: 20, locksCount: 2 });
    expect(q.milestoneCreditTotal).toBe(800);
  });
});

describe('protection', () => {
  it('stacks COO with CPO', () => {
    const both = calculateProtectionPlanFee('cpo_coo', 2, DEFAULT_CONFIG.insurance);
    const cpo = calculateProtectionPlanFee('cpo', 2, DEFAULT_CONFIG.insurance);
    const coo = calculateProtectionPlanFee('coo', 2, DEFAULT_CONFIG.insurance);
    expect(both.monthlyFee).toBe(cpo.monthlyFee + coo.monthlyFee);
  });

  it('offers COO on moves and keeps it with the required CPO on interstate moves', () => {
    const move = { ...base, serviceType: 'moving' as const, destinationPostcode: postcode('3000'), storageDuration: '1_to_3_months' as const, storageDurationMonths: 1 };
    expect(quote({ ...move, protectionPlan: 'coo' }).protectionPlan).toBe('cpo_coo');
    expect(quote({ ...move, protectionPlan: 'none' }).protectionPlan).toBe('cpo');
    const local = { ...move, destinationPostcode: postcode('5001') };
    expect(quote({ ...local, protectionPlan: 'coo' }).protectionPlan).toBe('coo');
  });
});

describe('upfront discounts', () => {
  it('use the CEO-editable percentages', () => {
    const params = { ...base, storageDuration: '12_plus_months' as const, storageDurationMonths: 12, blanketsCount: 20, locksCount: 2, billingCycle: '12_months_upfront' as const };
    const standard = quote(params);
    const edited = quote({ ...params, config: { ...DEFAULT_CONFIG, upfrontDiscounts: { sixMonthsPercent: 5, twelveMonthsPercent: 20 } } });
    expect(standard.upfrontDiscountPercent).toBe(10);
    expect(edited.upfrontDiscountPercent).toBe(20);
    expect(edited.currentPeriodicStorageFee).toBeLessThan(standard.currentPeriodicStorageFee);
  });
});

describe('duration blocks', () => {
  it('maps months to the offered blocks', () => {
    expect(getDurationBlock(5).label).toBe('4–5 Months');
    expect(getDurationBlock(7).label).toBe('6–8 Months');
    expect(getDurationBlock(11).label).toBe('9–11 Months');
    expect(getDurationBlock(18).label).toBe('12+ Months');
  });
});
