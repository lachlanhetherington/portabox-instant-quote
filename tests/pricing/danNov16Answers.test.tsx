/**
 * Dan's answers (16 Nov): upfront savings include delivery savings (SID / SFPU waived legs),
 * and the Initial Upfront Payment carries the 5-day disclaimer.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Step4When } from '../../src/components/Step4When';
import { TraditionalQuoteDocument } from '../../src/components/TraditionalQuoteDocument';
import { DEFAULT_CONFIG, getPayableNowDeliveryAmount, getUpfrontDiscountPercent } from '../../src/services/pricingEngine';
import { INITIAL_PAYMENT_DISCLAIMER } from '../../src/services/quoteCostSections';
import { buildScenarios, quote } from './scenarios';

const savingsOnStep = (s: ReturnType<typeof buildScenarios>[number], withQuote: boolean): number[] => {
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
      activeQuote={withQuote ? quote(p) : null}
      onSelectDuration={() => {}}
      onSelectBillingCycle={() => {}}
      config={DEFAULT_CONFIG}
      onContinue={() => {}}
      onBack={() => {}}
    />,
  );
  return [...html.matchAll(/data-upfront-saving="([\d.]+)"/g)].map((m) => Number(m[1]));
};

describe("Dan's 16 Nov answers", () => {
  it('adds waived delivery savings to the upfront "Save $X"', () => {
    const cases = buildScenarios()
      .filter((s) => s.params.billingCycle === 'monthly' && !s.params.appliedPromoCode && (s.params.storageDurationMonths ?? 0) >= 6)
      .filter((s) => (quote(s.params).waivedLegs || []).some((l) => (l.waivedSavings || 0) > 0))
      .slice(0, 12);
    expect(cases.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const s of cases) {
      const delivery = Math.round((quote(s.params).waivedLegs || []).reduce((t, l) => t + (l.waivedSavings || 0), 0));
      const without = savingsOnStep(s, false);
      const withQuote = savingsOnStep(s, true);
      // With the quote, the step also knows the initial delivery, so the upfront % covers it too (Dan, 16 Nov)
      const initialDelivery = getPayableNowDeliveryAmount(quote(s.params).legs.find((l) => l.isPayableNow));
      const pcts = [
        getUpfrontDiscountPercent('6_months_upfront', DEFAULT_CONFIG.upfrontDiscounts),
        getUpfrontDiscountPercent('12_months_upfront', DEFAULT_CONFIG.upfrontDiscounts),
      ];
      const expectedCount = (s.params.storageDurationMonths ?? 0) >= 12 ? 2 : 1;
      if (withQuote.length !== expectedCount) failures.push(`${s.name}: ${withQuote.length} upfront savings shown`);
      else if (withQuote.some((v, i) => Math.abs(v - ((without[i] || 0) + delivery + (initialDelivery * pcts[i]) / 100)) > 0.5)) {
        failures.push(`${s.name}: ${withQuote.join('/')} vs ${without.join('/')} + ${delivery}`);
      }
    }
    expect(failures, `${failures.length} problems`).toEqual([]);
  });

  it('shows the 5-day disclaimer under the Initial Upfront Payment', () => {
    const s = buildScenarios()[0];
    const html = renderToStaticMarkup(<TraditionalQuoteDocument quote={quote(s.params)} />).replace(/&#x27;|&#39;/g, "'");
    expect(html).toContain(INITIAL_PAYMENT_DISCLAIMER);
  });
});
