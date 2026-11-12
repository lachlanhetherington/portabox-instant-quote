/**
 * Checks that what customers see matches what the pricing engine charges:
 * - every transport charge appears on the quote document, whether it is due now or later;
 * - the upfront prices on the Duration & Billing step equal the engine's prices.
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
  // the 6- and 12-month upfront prices for the same choices.
  const cases = buildScenarios().filter(
    (s) => s.params.billingCycle === 'monthly' && !s.params.appliedPromoCode && (s.params.storageDurationMonths ?? 0) >= 1,
  );

  function upfrontPricesOnStep(s: Scenario): number[] {
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
    return [...text(html).matchAll(/\(\$([\d,]+(?:\.\d+)?) upfront\)/g)].map((m) => Number(m[1].replace(/,/g, '')));
  }

  it(`shows the same 6- and 12-month upfront prices as the quote (${cases.length} cases)`, () => {
    const failures: string[] = [];
    for (const s of cases) {
      const shown = upfrontPricesOnStep(s);
      const six = quote({ ...s.params, billingCycle: '6_months_upfront' }).currentPeriodicStorageFee;
      const twelve = quote({ ...s.params, billingCycle: '12_months_upfront' }).currentPeriodicStorageFee;
      if (shown.length !== 2) failures.push(`${s.name}: found ${shown.length} upfront prices on the step`);
      else if (shown[0] !== six || shown[1] !== twelve) {
        failures.push(`${s.name}: step shows $${shown[0]} / $${shown[1]}, quote charges $${six} / $${twelve}`);
      }
    }
    expect(cases.length).toBeGreaterThan(20);
    expect(failures.slice(0, 15), `${failures.length} of ${cases.length} mismatched`).toEqual([]);
  });
});
