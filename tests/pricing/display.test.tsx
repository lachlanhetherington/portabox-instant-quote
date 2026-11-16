/**
 * Checks that what customers see matches what the pricing engine charges:
 * - every transport charge appears on the quote document, whether it is due now or later;
 * - the upfront savings on the Duration & Billing step equal the engine's prices (list price - upfront price).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TraditionalQuoteDocument } from '../../src/components/TraditionalQuoteDocument';
import { Step4When } from '../../src/components/Step4When';
import { DEFAULT_CONFIG } from '../../src/services/pricingEngine';
import { buildScenarios, quote, type Scenario } from './scenarios';

/** Page text with tags removed and entities decoded, whitespace collapsed. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
}

const money = (n: number) => `$${n.toLocaleString('en-AU', { maximumFractionDigits: 2 })}`;

// Every 7th scenario keeps the render checks quick while still covering every route and billing cycle.
const sample = buildScenarios().filter((_, i) => i % 7 === 0);

describe(`quote document shows every charge (${sample.length} quotes)`, () => {
  it('lists every transport leg with its fee, and the first payment total', () => {
    const failures: string[] = [];
    for (const s of sample) {
      const q = quote(s.params);
      const page = text(renderToStaticMarkup(<TraditionalQuoteDocument quote={q} />));
      for (const leg of q.legs) {
        if (!page.includes(leg.label)) failures.push(`${s.name}: leg "${leg.label}" missing`);
        else if (!page.includes(money(leg.fee))) failures.push(`${s.name}: fee ${money(leg.fee)} for "${leg.label}" missing`);
      }
      if (!page.includes(money(q.firstPaymentTotal))) failures.push(`${s.name}: first payment ${money(q.firstPaymentTotal)} missing`);
    }
    expect(failures.slice(0, 15), `${failures.length} problems`).toEqual([]);
  });
});

describe('Duration & Billing step prices match the quote', () => {
  // Monthly-billed scenarios with at least a month's storage and no promo code; the step shows
  // the 6- and 12-month upfront savings for the same choices (Dan, 16 Nov: savings only, no upfront total).
  const cases = buildScenarios().filter(
    (s) => s.params.billingCycle === 'monthly' && !s.params.appliedPromoCode && (s.params.storageDurationMonths ?? 0) >= 1,
  );

  function upfrontSavingsOnStep(s: Scenario): number[] {
    const p = s.params;
    const html = renderToStaticMarkup(
      <Step4When
        originPostcode={p.originPostcode}
        destinationPostcode={p.destinationPostcode}
        containerSize={p.containerSize}
        containerCount={p.containerCount}
        containerSelections={p.containerSelections}
        serviceType={p.serviceType}
        storagePlacement={p.storagePlacement}
        storageDuration={p.storageDuration}
        storageDurationMonths={p.storageDurationMonths}
        billingCycle="monthly"
        onSelectDuration={() => {}}
        onSelectBillingCycle={() => {}}
        config={DEFAULT_CONFIG}
        onContinue={() => {}}
        onBack={() => {}}
      />,
    );
    return [...html.matchAll(/data-upfront-saving="([\d.]+)"/g)].map((m) => Number(m[1]));
  }

  it(`shows 6- and 12-month upfront savings that match the quote (${cases.length} cases)`, () => {
    const failures: string[] = [];
    for (const s of cases) {
      const shown = upfrontSavingsOnStep(s);
      const listMonthly = quote(s.params).baseMonthlyStorageFee ?? 0;
      const six = Math.max(0, listMonthly * 6 - quote({ ...s.params, billingCycle: '6_months_upfront' }).currentPeriodicStorageFee);
      const twelve = Math.max(0, listMonthly * 12 - quote({ ...s.params, billingCycle: '12_months_upfront' }).currentPeriodicStorageFee);
      // Dan (16 Nov): 6 months upfront only from 6 months, 12 months upfront only from 12 months
      const months = s.params.storageDurationMonths ?? 1;
      const expected = [months >= 6 ? six : 0, months >= 12 ? twelve : 0].filter((n) => n > 0);
      if (shown.length !== expected.length) failures.push(`${s.name}: found ${shown.length} upfront savings, expected ${expected.length}`);
      else if (shown.some((v, i) => Math.abs(v - expected[i]) > 0.5)) {
        failures.push(`${s.name}: step shows $${shown.join(' / $')}, quote implies $${expected.join(' / $')}`);
      }
    }
    expect(cases.length).toBeGreaterThan(20);
    expect(failures.slice(0, 15), `${failures.length} of ${cases.length} mismatched`).toEqual([]);
  });
});

describe("quote document wording (Dan's review, Nov 2026)", () => {
  const removed = [
    'quotes@portabox',
    'Payable Today',
    'One-Off Upfront Charge',
    '(estimate)',
    'Insurance',
    '1-Year Booking Price Guarantee',
    'Payment Terms',
    'Due at booking',
    'deferred until',
    'Unit Rate',
    'Delivery window & date selected', // hidden unless the CEO switches it on
  ];

  it('drops the removed wording and shows the sales email and fuel-levy columns', () => {
    const failures: string[] = [];
    for (const s of sample) {
      const page = text(renderToStaticMarkup(<TraditionalQuoteDocument quote={quote(s.params)} />));
      for (const phrase of removed) if (page.includes(phrase)) failures.push(`${s.name}: still shows "${phrase}"`);
      if (!page.includes('sales@auspods.com.au')) failures.push(`${s.name}: sales email missing`);
      if (!page.includes('Subtotal incl. Fuel Levy')) failures.push(`${s.name}: fuel levy column missing`);
    }
    expect(failures.slice(0, 15), `${failures.length} problems`).toEqual([]);
  });

  it('shows each leg as delivery rate + fuel levy = subtotal', () => {
    const failures: string[] = [];
    for (const s of sample) {
      const q = quote(s.params);
      const page = text(renderToStaticMarkup(<TraditionalQuoteDocument quote={q} />));
      for (const leg of q.legs) {
        const fuelInFee = leg.fuelSurchargeDeferred ? 0 : leg.fuelSurcharge || 0;
        const fuel = fuelInFee + (leg.fuelSurchargeDeferred ? leg.fuelSurchargeEstimatedAmount || 0 : 0);
        if (fuel > 0 && !page.includes(`Fuel levy – ${money(fuel)}`)) failures.push(`${s.name}: "${leg.label}" fuel levy ${money(fuel)} missing`);
        if (!page.includes(money(leg.fee - fuelInFee + fuel))) failures.push(`${s.name}: "${leg.label}" subtotal missing`);
      }
    }
    expect(failures.slice(0, 15), `${failures.length} problems`).toEqual([]);
  });
});

describe('savings include free blanket hire', () => {
  it('values free blankets at $25 per 10 per month of the booking', () => {
    const failures: string[] = [];
    let withFreeBlankets = 0;
    for (const s of buildScenarios()) {
      const q = quote(s.params);
      const free = Math.min(q.packingSupplies?.blanketsCount ?? 0, q.packingSupplies?.freeBlanketsAllowance ?? 0);
      const item = q.savingsBreakdown?.find((i) => i.label.startsWith('Free blanket rental'));
      if (free === 0) {
        if (item) failures.push(`${s.name}: blanket saving shown with no free blankets`);
        continue;
      }
      withFreeBlankets++;
      if (!item) {
        failures.push(`${s.name}: ${free} free blankets but no saving shown`);
        continue;
      }
      const months = Math.max(1, Math.round(s.params.storageDurationMonths ?? 1));
      const expected = Math.ceil(free / 10) * 25 * months;
      if (item.amount !== expected) failures.push(`${s.name}: blanket saving ${item.amount}, expected ${expected}`);
    }
    expect(withFreeBlankets, 'scenarios with free blankets').toBeGreaterThan(0);
    expect(failures.slice(0, 15), `${failures.length} problems`).toEqual([]);
  });
});
