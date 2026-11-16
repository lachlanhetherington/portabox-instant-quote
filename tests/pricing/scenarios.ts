/**
 * Builds the grid of quote scenarios the pricing checks run against.
 *
 * Every combination of service, route, container, duration and billing cycle is covered.
 * Extras (loading method, promo code, supplies, protection) rotate through their values
 * across the grid so each one is exercised many times without multiplying the grid size.
 */
import { calculateQuote, DEFAULT_CONFIG } from '../../src/services/pricingEngine';
import { getPostcodeRecord, type PostcodeRecord } from '../../src/data/australianPostcodes';
import type {
  BillingCycle,
  ContainerSizeId,
  LogisticsMethod,
  ProtectionPlanType,
  QuoteBreakdown,
  ServiceType,
  StorageDuration,
} from '../../src/types/quote';

export const HUB_POSTCODES = {
  Adelaide: '5061',
  Melbourne: '3000',
  Sydney: '2000',
  Brisbane: '4000',
} as const;

export function postcode(pc: string): PostcodeRecord {
  const record = getPostcodeRecord(pc);
  if (!record) throw new Error(`Test postcode ${pc} not found`);
  return record;
}

/** Duration in months as the app passes it (0.5 = 2 weeks). */
export const DURATIONS = [0.5, 1, 2, 3, 6, 9, 12, 18] as const;

/** Maps months to the storageDuration bucket, the same way Step4When does. */
export function durationBucket(months: number): StorageDuration {
  if (months === 0.5) return '2_weeks';
  if (months <= 3) return '1_to_3_months';
  if (months < 12) return '4_to_11_months';
  return '12_plus_months';
}

export const BILLING_CYCLES: BillingCycle[] = ['weekly', 'monthly', '3_months_upfront', '6_months_upfront', '12_months_upfront'];

type ContainerChoice =
  | { label: string; containerSize: ContainerSizeId; containerCount?: number; containerSelections?: undefined }
  | { label: string; containerSize: ContainerSizeId; containerCount: number; containerSelections: Record<ContainerSizeId, number> };

export const CONTAINERS: ContainerChoice[] = [
  { label: '10 m³', containerSize: 'small_10m3' },
  { label: '19 m³', containerSize: 'medium_19m3' },
  { label: '25 m³', containerSize: 'large_25m3' },
  { label: '2 × 25 m³ bundle', containerSize: 'two_large_50m3' },
  { label: '3 × 25 m³', containerSize: 'large_25m3', containerCount: 3 },
  {
    label: 'mixed 10 + 19 + 25 m³',
    containerSize: 'large_25m3',
    containerCount: 3,
    containerSelections: { small_10m3: 1, medium_19m3: 1, large_25m3: 1, two_large_50m3: 0 },
  },
];

export const PROMO_CODES = ['', ...DEFAULT_CONFIG.promotions.filter((p) => p.code).map((p) => p.code as string), 'HELLO', 'SAVE5000'];
const LOGISTICS: [LogisticsMethod, LogisticsMethod][] = [
  ['home_delivery', 'home_delivery'],
  ['depot_loading', 'home_delivery'],
  ['home_delivery', 'depot_loading'],
  ['depot_loading', 'depot_loading'],
];
const PROTECTION: ProtectionPlanType[] = ['none', 'cpo', 'coo'];
const SUPPLIES = [
  { boxesCount: 0, blanketsCount: 0, locksCount: 0 },
  { boxesCount: 20, blanketsCount: 10, locksCount: 1 },
  { boxesCount: 0, blanketsCount: 40, locksCount: 2 },
];

type Route = { label: string; serviceType: ServiceType; storagePlacement?: 'my_place' | 'facility'; origin: string; destination?: string };

function routes(): Route[] {
  const list: Route[] = [];
  const hubs = Object.entries(HUB_POSTCODES);
  for (const [hub, pc] of hubs) {
    list.push({ label: `storage at home, ${hub}`, serviceType: 'storage_at_place', storagePlacement: 'my_place', origin: pc });
    list.push({ label: `storage at depot, ${hub}`, serviceType: 'storage_facility', storagePlacement: 'facility', origin: pc });
    for (const [destHub, destPc] of hubs) {
      const local = hub === destHub;
      // A local move needs a different suburb in the same city.
      const destination = local ? { Adelaide: '5000', Melbourne: '3121', Sydney: '2010', Brisbane: '4101' }[hub]! : destPc;
      list.push({ label: `move ${hub} → ${local ? `${hub} (local)` : destHub}`, serviceType: 'moving', origin: pc, destination });
    }
  }
  return list;
}

export interface Scenario {
  name: string;
  params: Parameters<typeof calculateQuote>[0];
}

export function buildScenarios(): Scenario[] {
  const scenarios: Scenario[] = [];
  let i = 0;
  for (const route of routes()) {
    for (const container of CONTAINERS) {
      for (const months of DURATIONS) {
        for (const billingCycle of BILLING_CYCLES) {
          const [originLogisticsMethod, destinationLogisticsMethod] = LOGISTICS[i % LOGISTICS.length];
          const appliedPromoCode = PROMO_CODES[i % PROMO_CODES.length];
          const protectionPlan = PROTECTION[i % PROTECTION.length];
          const supplies = SUPPLIES[i % SUPPLIES.length];
          i++;
          scenarios.push({
            name: [route.label, container.label, months === 0.5 ? '2 weeks' : `${months} mo`, billingCycle, appliedPromoCode && `code ${appliedPromoCode}`]
              .filter(Boolean)
              .join(' · '),
            params: {
              originPostcode: postcode(route.origin),
              destinationPostcode: route.destination ? postcode(route.destination) : undefined,
              serviceType: route.serviceType,
              storagePlacement: route.storagePlacement,
              containerSize: container.containerSize,
              containerCount: container.containerCount,
              containerSelections: container.containerSelections,
              storageDuration: durationBucket(months),
              storageDurationMonths: months === 0.5 ? undefined : months,
              billingCycle,
              preferredDate: '2026-12-01',
              originLogisticsMethod,
              destinationLogisticsMethod,
              appliedPromoCode,
              protectionPlan,
              insuranceSelected: protectionPlan !== 'none',
              ...supplies,
              config: DEFAULT_CONFIG,
            },
          });
        }
      }
    }
  }
  return scenarios;
}

export function quote(params: Scenario['params']): QuoteBreakdown {
  return calculateQuote({ config: DEFAULT_CONFIG, ...params });
}
