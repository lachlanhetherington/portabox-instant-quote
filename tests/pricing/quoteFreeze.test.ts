/**
 * Frozen quotes: the server re-prices what the customer chose and must get the same prices the
 * customer saw (same pricing), across every scenario. Also checks expiry, contact matching and
 * that made-up values from the browser are thrown away.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/services/pricingEngine';
import {
  addDays,
  addMonths,
  cleanQuoteInputs,
  currentStatus,
  normalizeContact,
  priceQuoteInputs,
  quoteInputsFromQuote,
  quoteTotals,
  sameTotals,
} from '../../src/services/quoteFreeze';
import { buildScenarios, quote } from './scenarios';

describe('server re-pricing matches the quote the customer saw', () => {
  const scenarios = buildScenarios().filter((s) => (s.params.storageDurationMonths ?? 1) >= 1);

  it(`gives the same totals (${scenarios.length} scenarios)`, () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const shown = quote(s.params);
      const inputs = cleanQuoteInputs(JSON.parse(JSON.stringify(quoteInputsFromQuote(shown))));
      if (!inputs) {
        failures.push(`${s.name}: inputs rejected`);
        continue;
      }
      const server = priceQuoteInputs(inputs, DEFAULT_CONFIG);
      if (!sameTotals(quoteTotals(shown), quoteTotals(server))) {
        failures.push(`${s.name}: shown ${JSON.stringify(quoteTotals(shown))}, server ${JSON.stringify(quoteTotals(server))}`);
      }
    }
    expect(scenarios.length).toBeGreaterThan(100);
    expect(failures.slice(0, 10), `${failures.length} mismatched`).toEqual([]);
  }, 60_000); // prices every scenario twice; CI runners are slower than a laptop

  it('notices when pricing changed in between', () => {
    const s = buildScenarios().find((x) => x.params.billingCycle === 'monthly' && !x.params.appliedPromoCode)!;
    const shown = quote(s.params);
    const inputs = cleanQuoteInputs(quoteInputsFromQuote(shown))!;
    const dearer = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    for (const hub of Object.keys(dearer.locationPricing)) {
      for (const cat of ['containerPrices', 'onsiteContainerPrices', 'interstateContainerPrices']) {
        const prices = dearer.locationPricing[hub][cat];
        if (!prices) continue;
        for (const size of Object.keys(prices)) prices[size].monthlyRate += 50;
      }
    }
    expect(sameTotals(quoteTotals(shown), quoteTotals(priceQuoteInputs(inputs, dearer)))).toBe(false);
  });
});

describe('cleaning what the browser sends', () => {
  it('rejects unknown postcodes and service types', () => {
    expect(cleanQuoteInputs({ origin: { postcode: 'ABCD', suburb: 'Nowhere' }, serviceType: 'storage_facility', containerSize: 'large_25m3' })).toBeNull();
    expect(cleanQuoteInputs({ origin: { postcode: '5000', suburb: 'Adelaide' }, serviceType: 'free_stuff', containerSize: 'large_25m3' })).toBeNull();
  });

  it('caps quantities and drops made-up values', () => {
    const inputs = cleanQuoteInputs({
      origin: { postcode: '5000', suburb: 'Adelaide' },
      serviceType: 'storage_facility',
      containerSize: 'large_25m3',
      containerSelections: { large_25m3: 500 },
      locksCount: -4,
      billingCycle: 'free_forever',
      protectionPlan: 'gold',
    })!;
    expect(inputs.containerSelections.large_25m3).toBe(5);
    expect(inputs.locksCount).toBe(0);
    expect(inputs.billingCycle).toBe('monthly');
    expect(inputs.protectionPlan).toBeUndefined();
  });
});

describe('quote and booking freeze periods', () => {
  it('a frozen quote expires after 30 days', () => {
    const frozenAt = '2026-11-14T02:20:00.000Z';
    const expiresAt = addDays(frozenAt, 30);
    expect(currentStatus('frozen', expiresAt, new Date('2026-12-13T02:19:00.000Z'))).toBe('frozen');
    expect(currentStatus('frozen', expiresAt, new Date('2026-12-14T02:20:00.000Z'))).toBe('expired');
    expect(currentStatus('booked', expiresAt, new Date('2027-06-01T00:00:00.000Z'))).toBe('booked');
  });

  it('a booking freezes the price for 12 months', () => {
    expect(addMonths('2026-11-14T02:30:00.000Z', 12).slice(0, 10)).toBe('2027-11-14');
  });

  it('matches emails and Australian mobiles however they are typed', () => {
    expect(normalizeContact(' Dan@Example.com ')).toBe('dan@example.com');
    expect(normalizeContact('+61 412 345 678')).toBe('0412345678');
    expect(normalizeContact('0412 345 678')).toBe('0412345678');
  });
});
