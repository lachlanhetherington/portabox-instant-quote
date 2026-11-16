/**
 * Dan's 15 Nov feedback: duration on the quote, km on the initial delivery,
 * and every perk listed in the Smartsheet "Discount Offered" column.
 */
import { describe, expect, it } from 'vitest';
import { buildQuoteSheetRows } from '../../src/services/quoteRecordService';
import { getQuoteDurationLabel } from '../../src/services/pricingEngine';
import { buildScenarios, quote } from './scenarios';

const customer = { name: 'Test Customer', email: 'test@example.com', mobile: '0400 000 000', channels: { email: true } };

describe('Dan 15 Nov feedback', () => {
  const scenarios = buildScenarios();

  it('labels the chosen duration by block', () => {
    expect(getQuoteDurationLabel({ storageDurationMonths: 1 })).toBe('1 Month');
    expect(getQuoteDurationLabel({ storageDurationMonths: 7 })).toBe('6–8 Months');
    expect(getQuoteDurationLabel({ storageDurationMonths: 18 })).toBe('12+ Months');
    expect(getQuoteDurationLabel({ storageDuration: '1_to_3_months' })).toBe('1 to 3 Months');
  });

  it('shows the driving km on every initial delivery leg', () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const q = quote(s.params);
      for (const l of q.legs) {
        if (l.description?.startsWith('Deliver empty container for packing') && !/\(\d+ km - Zone [A-E]\)/.test(l.description)) {
          failures.push(`${s.name}: ${l.description}`);
        }
      }
    }
    expect(failures.slice(0, 10), `${failures.length} problems`).toEqual([]);
  });

  it('lists 1st month free, the Free Kit and the $400 credit in Discount Offered', () => {
    const failures: string[] = [];
    for (const s of scenarios) {
      const q = quote(s.params);
      const offered = buildQuoteSheetRows(q, customer)[0].discountOffered || '';
      if (q.isFirstMonthFree && !offered.includes('1st Mth Free')) failures.push(`${s.name}: missing 1st Mth Free in "${offered}"`);
      if (q.freeLockIncluded && !offered.includes('Free Kit')) failures.push(`${s.name}: missing Free Kit in "${offered}"`);
      if ((q.milestoneCreditTotal || 0) > 0 && !offered.includes('Credit')) failures.push(`${s.name}: missing credit in "${offered}"`);
    }
    expect(failures.slice(0, 10), `${failures.length} problems`).toEqual([]);
  });
});
