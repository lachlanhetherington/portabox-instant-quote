/**
 * Quotes sent to Smartsheet: one row per container, and the rows add back up
 * to the quote (transport fees + fuel levies, monthly storage).
 */
import { describe, expect, it } from 'vitest';
import { buildQuoteSheetRows, legColumn } from '../../src/services/quoteRecordService';
import { buildScenarios, postcode, quote } from './scenarios';

const customer = { name: 'Test Customer', email: 'test@example.com', mobile: '0400 000 000', channels: { email: true } };
const near = (a: number, b: number) => Math.abs(a - b) < 0.05 * Math.max(1, b / 100) + 0.02;

describe('quote sheet rows', () => {
  const scenarios = buildScenarios();

  it(`gives one row per container, Parent first (${scenarios.length} quotes)`, () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const q = quote(s.params);
      const rows = buildQuoteSheetRows(q, customer);
      if (rows.length !== q.containerCount) failures.push(`${s.name}: ${rows.length} rows for ${q.containerCount} containers`);
      if (rows.slice(1).some((r) => r.supplies)) failures.push(`${s.name}: supplies repeated on child rows`);
    }
    expect(failures.slice(0, 15), `${failures.length} problems`).toEqual([]);
  });

  it('transport fees and fuel levies across all rows add up to the quote', () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const q = quote(s.params);
      const rows = buildQuoteSheetRows(q, customer);
      const fromRows = rows.reduce(
        (sum, r) =>
          sum + r.initialDeliveryFee + r.idFuelLevy + r.returnToPortaboxFee + r.wrtFuelLevy + r.relocationFeeMove + r.moveFuelLevy +
          r.interstateRelocationFee + r.interstateRelocationFuelLevy + r.redeliveryFee + r.redelFuelLevy + r.finalPickUpFee + r.fpuFuelLevy,
        0,
      );
      const fromQuote = q.legs.reduce(
        (sum, l) => sum + l.fee + (l.fuelSurchargeDeferred ? l.fuelSurchargeEstimatedAmount || 0 : 0),
        0,
      );
      if (!near(fromRows, fromQuote)) failures.push(`${s.name}: rows $${fromRows.toFixed(2)} vs quote $${fromQuote.toFixed(2)}`);
    }
    expect(failures.slice(0, 15), `${failures.length} problems`).toEqual([]);
  });

  it('never puts more than one leg of each kind on a single container row', () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const q = quote(s.params);
      const seen = new Map<string, number>();
      for (const l of q.legs) seen.set(legColumn(l.label), (seen.get(legColumn(l.label)) || 0) + 1);
      for (const [col, n] of seen) if (n > 1 && col !== 'interstate') failures.push(`${s.name}: ${n} legs in column ${col}`);
    }
    expect(failures.slice(0, 15), `${failures.length} problems`).toEqual([]);
  });

  it('puts each transport leg in a sensible column', () => {
    expect(legColumn('Initial delivery to Hyde Park (empty)')).toBe('id');
    expect(legColumn('Portabox Location → Customer Location (Deliver empty container)')).toBe('id');
    expect(legColumn('Transport to Portabox storage facility (full)')).toBe('wrt');
    expect(legColumn('Customer Location → Portabox Location (Transit to interim storage)')).toBe('wrt');
    expect(legColumn('Move to Flagstaff Hill (full)')).toBe('move');
    expect(legColumn('Interstate transport (Adelaide → Melbourne)')).toBe('interstate');
    expect(legColumn('Redelivery from facility when ready (full)')).toBe('rdl');
    expect(legColumn('Portabox Location → New Customer Location (Deliver loaded container)')).toBe('rdl');
    expect(legColumn('Final pickup of empty container at Flagstaff Hill')).toBe('fpu');
    expect(legColumn('New Customer Location → Portabox Location (Final empty collection)')).toBe('fpu');
    expect(legColumn('[Waived] Empty container collection from Hyde Park')).toBe('fpu');
    expect(legColumn("Collection when you're done (empty)")).toBe('fpu');
    expect(legColumn('Delivery to Hyde Park (empty)')).toBe('id');
    expect(legColumn('[Waived] Empty container delivery to Hyde Park')).toBe('id');
    expect(legColumn('[Waived] Full container redelivery to Hyde Park')).toBe('rdl');
    expect(legColumn('[Waived] Full container transit to Adelaide facility')).toBe('wrt');
  });
});

describe("Dan's 16 Nov sheet columns", () => {
  const base = {
    originPostcode: postcode('5061'),
    serviceType: 'moving' as const,
    containerSize: 'large_25m3' as const,
    containerCount: 1,
    billingCycle: 'monthly' as const,
    storageDuration: '1_to_3_months',
    storageDurationMonths: 2,
    preferredDate: '2026-12-01',
  };

  it('shows the months picked, not the pricing bucket', () => {
    const rows = buildQuoteSheetRows(quote({ ...base, destinationPostcode: postcode('5000') }), customer);
    expect(rows[0].durationMonths).toBe(2);
  });

  it('uses Ade / Bri / Mel / Syd, and Origin-Destination for interstate', () => {
    expect(buildQuoteSheetRows(quote({ ...base, destinationPostcode: postcode('5000') }), customer)[0].location).toBe('Ade');
    expect(buildQuoteSheetRows(quote({ ...base, originPostcode: postcode('4000'), destinationPostcode: postcode('4000') }), customer)[0].location).toBe('Bri');
    expect(buildQuoteSheetRows(quote({ ...base, originPostcode: postcode('4000'), destinationPostcode: postcode('5000') }), customer)[0].location).toBe('Bri-Ade');
    expect(buildQuoteSheetRows(quote({ ...base, originPostcode: postcode('3000'), destinationPostcode: postcode('2000') }), customer)[0].location).toBe('Mel-Syd');
  });

  it("leaves Dan's team's columns blank", () => {
    const row: Record<string, unknown> = buildQuoteSheetRows(quote({ ...base, destinationPostcode: postcode('5000') }), customer)[0] as any;
    for (const key of ['sendQuoteConfirmation', 'followUpCustomerStatus', 'contactMeThisWay', 'sendBookingForm', 'bookMoveToOzilla']) {
      expect(row[key], key).toBeUndefined();
    }
  });
});
