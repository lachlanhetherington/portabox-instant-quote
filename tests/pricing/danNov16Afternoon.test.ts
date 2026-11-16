/**
 * Dan's 16 Nov afternoon emails: 7' (10 m³) containers get no free blanket rental or free lock;
 * those perks are one per 12' / 16' container.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/services/pricingEngine';
import { postcode, quote } from './scenarios';

const base = {
  originPostcode: postcode('5061'),
  serviceType: 'storage_facility' as const,
  storagePlacement: 'facility' as const,
  billingCycle: 'monthly' as const,
  storageDuration: '1_to_3_months',
  storageDurationMonths: 2,
  preferredDate: '2026-12-01',
  config: DEFAULT_CONFIG,
};
const packPrice = DEFAULT_CONFIG.packingSupplies?.blanketBlockPriceMonthly ?? 25;
const lockPrice = DEFAULT_CONFIG.packingSupplies?.lockPrice ?? 22;

describe("7' containers get no free blankets or lock", () => {
  it("7' only: blankets and lock are charged", () => {
    const q = quote({
      ...base,
      containerSize: 'small_10m3',
      containerCount: 1,
      containerSelections: { small_10m3: 1, medium_19m3: 0, large_25m3: 0, two_large_50m3: 0 },
      blanketsCount: 10,
      locksCount: 1,
    });
    expect(q.packingSupplies.blanketsPrice).toBe(packPrice);
    expect(q.packingSupplies.locksPrice).toBe(lockPrice);
  });

  it("7' + 16': only the 16' gets a free pack and a free lock", () => {
    const q = quote({
      ...base,
      containerSize: 'large_25m3',
      containerCount: 2,
      containerSelections: { small_10m3: 1, medium_19m3: 0, large_25m3: 1, two_large_50m3: 0 },
      blanketsCount: 20,
      locksCount: 2,
    });
    expect(q.packingSupplies.blanketsPrice).toBe(packPrice);
    expect(q.packingSupplies.locksPrice).toBe(lockPrice);
  });

  it("16' only: the pack and lock stay free", () => {
    const q = quote({
      ...base,
      containerSize: 'large_25m3',
      containerCount: 1,
      containerSelections: { small_10m3: 0, medium_19m3: 0, large_25m3: 1, two_large_50m3: 0 },
      blanketsCount: 10,
      locksCount: 1,
    });
    expect(q.packingSupplies.blanketsPrice).toBe(0);
    expect(q.packingSupplies.locksPrice).toBe(0);
  });
});
