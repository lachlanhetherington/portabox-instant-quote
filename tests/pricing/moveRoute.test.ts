/**
 * Dan (16 Nov): a local move is charged on the truck's whole trip, depot -> home 1 -> home 2.
 * Example: 200 km out + 20 km move = 220 km, Zone E, not Zone A.
 */
import { describe, expect, it } from 'vitest';
import { calculateQuote, DEFAULT_CONFIG, getLocationPricingForHub, getMetroHubForPostcode } from '../../src/services/pricingEngine';
import { getPostcodeRecord } from '../../src/data/australianPostcodes';
import { buildScenarios, quote } from './scenarios';

const zoneOf = (km: number, z: ReturnType<typeof getLocationPricingForHub>['deliveryZones']) =>
  km < z.zoneAMaxKm ? 'A' : km < z.zoneBMaxKm ? 'B' : km < z.zoneCMaxKm ? 'C' : km <= z.zoneDMaxKm ? 'D' : 'E';

const localMove = (from: string, to: string) =>
  calculateQuote({
    config: DEFAULT_CONFIG,
    originPostcode: getPostcodeRecord(from)!,
    destinationPostcode: getPostcodeRecord(to)!,
    serviceType: 'moving',
    containerSize: 'large_25m3',
    storageDuration: '1_to_3_months',
    storageDurationMonths: 2,
    billingCycle: 'monthly',
    preferredDate: '2026-12-01',
  });

describe('move priced on depot -> home 1 -> home 2', () => {
  it('route km = depot -> home 1 + home 1 -> home 2, and the zone follows it', () => {
    const failures: string[] = [];
    let moves = 0;
    for (const s of buildScenarios()) {
      const q = quote(s.params);
      const move = q.legs.find((l) => l.label.startsWith('Move to'));
      if (!move) continue;
      moves++;
      const initial = q.legs.find((l) => l.label.startsWith('Initial delivery'));
      const depotKm = Number((initial?.description.match(/\((\d+) km - Zone [A-E]\)/) || [])[1]);
      const expectedRoute = depotKm + (q.movingDistanceKm || 0);
      if (q.moveRouteKm !== expectedRoute) failures.push(`${s.name}: route ${q.moveRouteKm} vs ${expectedRoute}`);
      const zones = getLocationPricingForHub(DEFAULT_CONFIG, getMetroHubForPostcode(s.params.originPostcode)).deliveryZones;
      if (q.movingDeliveryZone !== zoneOf(expectedRoute, zones)) failures.push(`${s.name}: zone ${q.movingDeliveryZone} for ${expectedRoute} km`);
      if (move.fuelSurchargeDistanceKm !== expectedRoute) failures.push(`${s.name}: fuel levy on ${move.fuelSurchargeDistanceKm} km`);
      if (!move.description.includes(`(${expectedRoute} km - Zone`)) failures.push(`${s.name}: route not shown: ${move.description}`);
    }
    expect(moves).toBeGreaterThan(10);
    expect(failures.slice(0, 10), `${failures.length} problems`).toEqual([]);
  });

  it('a short move far from the depot is charged as Zone E', () => {
    const q = localMove('5290', '5291'); // Mount Gambier area, 400+ km from the Adelaide depot
    expect((q.movingDistanceKm || 0) < 25).toBe(true);
    expect(q.movingDeliveryZone).toBe('E');
    const move = q.legs.find((l) => l.label.startsWith('Move to'))!;
    expect(move.fee).toBeGreaterThan(1000);
  });
});
