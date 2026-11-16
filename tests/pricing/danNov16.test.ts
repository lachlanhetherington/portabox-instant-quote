/**
 * Dan's 16 Nov feedback: the quote is split into "Initial Upfront Payment" and
 * "Ongoing monthly costs". The section 1 lines must add up to the First Payment Total.
 */
import { describe, expect, it } from 'vitest';
import { getQuoteCostSections } from '../../src/services/quoteCostSections';
import { buildScenarios, quote } from './scenarios';

describe('Dan 16 Nov quote sections', () => {
  const scenarios = buildScenarios();

  it('Initial Upfront Payment lines add up to the first payment total', () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const q = quote(s.params);
      const { upfront } = getQuoteCostSections(q);
      const sum = upfront.lines.reduce((t, l) => t + l.amount, 0);
      if (Math.abs(sum - q.firstPaymentTotal) > 0.02) {
        failures.push(`${s.name}: lines $${sum.toFixed(2)} vs first payment $${q.firstPaymentTotal.toFixed(2)}`);
      }
      if (Math.abs(upfront.total - q.firstPaymentTotal) > 0.02) failures.push(`${s.name}: total mismatch`);
    }
    expect(failures.slice(0, 10), `${failures.length} problems`).toEqual([]);
  });

  it('Ongoing monthly costs = storage + blanket rental + protection', () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const q = quote(s.params);
      const { ongoing } = getQuoteCostSections(q);
      const insurance = q.insurance?.selected && !q.insurance.isFreePromo ? q.insurance.totalMonthlyInsuranceFee : 0;
      const expected = q.monthlyStorageFee + (q.packingSupplies?.blanketsPrice || 0) + insurance;
      if (Math.abs(ongoing.total - expected) > 0.02) failures.push(`${s.name}: $${ongoing.total} vs $${expected}`);
    }
    expect(failures.slice(0, 10), `${failures.length} problems`).toEqual([]);
  });
});
