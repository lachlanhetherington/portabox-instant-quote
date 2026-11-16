/**
 * Dan (16 Nov, "Quote Inquiries & Leads"):
 * - a saved quote shows its own number, not the number of the quote being built in this browser
 * - follow-up status and notes are saved per quote (All Quotes is the only list)
 * - sending the same quote again doesn't add a duplicate entry
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TraditionalQuoteDocument } from '../../src/components/TraditionalQuoteDocument';
import {
  applyFollowUp,
  cleanFollowUpUpdate,
  MAX_NOTE_LENGTH,
  MAX_NOTES,
  upsertLeadByQuoteNumber,
} from '../../src/services/quoteFollowUp';
import { buildScenarios, quote } from './scenarios';

describe('quote document number', () => {
  it("shows the saved quote's own number when given", () => {
    const q = quote(buildScenarios()[0].params);
    const html = renderToStaticMarkup(<TraditionalQuoteDocument quote={q} quoteNumber="Q-900003" />);
    expect(html).toContain('Q-900003');
  });
});

describe('follow-up status and notes', () => {
  it('accepts a known status and/or a trimmed note, and nothing else', () => {
    expect(cleanFollowUpUpdate({ status: 'Contacted' })).toEqual({ status: 'Contacted', note: undefined });
    expect(cleanFollowUpUpdate({ note: '  rang, no answer  ' })).toEqual({ status: undefined, note: 'rang, no answer' });
    expect(cleanFollowUpUpdate({ status: 'Hacked' })).toBeNull();
    expect(cleanFollowUpUpdate({ note: '   ' })).toBeNull();
    expect(cleanFollowUpUpdate(null)).toBeNull();
    expect(cleanFollowUpUpdate({ note: 'x'.repeat(5000) })!.note!.length).toBe(MAX_NOTE_LENGTH);
  });

  it('keeps the status when only a note is added, and adds notes newest last', () => {
    const a = applyFollowUp({}, { status: 'Contacted' }, 'Dan', '2026-11-16T01:00:00Z');
    expect(a.followUpStatus).toBe('Contacted');
    const b = applyFollowUp(a, { note: 'Call back Friday' }, 'Andrew', '2026-11-16T02:00:00Z');
    expect(b.followUpStatus).toBe('Contacted');
    expect(b.followUpNotes).toEqual([{ at: '2026-11-16T02:00:00Z', by: 'Andrew', text: 'Call back Friday' }]);
    expect(b.followUpUpdatedBy).toBe('Andrew');
  });

  it('defaults to New and caps the number of notes', () => {
    let f = applyFollowUp({}, { note: 'n0' }, 'x', 't');
    expect(f.followUpStatus).toBe('New');
    for (let i = 1; i <= MAX_NOTES + 5; i++) f = applyFollowUp(f, { note: `n${i}` }, 'x', 't');
    expect(f.followUpNotes!.length).toBe(MAX_NOTES);
    expect(f.followUpNotes!.at(-1)!.text).toBe(`n${MAX_NOTES + 5}`);
  });
});

describe('one entry per quote number', () => {
  it('a resend replaces the earlier entry; different or missing numbers are kept', () => {
    const leads = [
      { id: 'a', quoteNumber: 'Q-900003' },
      { id: 'b', quoteNumber: 'Q-900002' },
      { id: 'c' },
    ];
    const after = upsertLeadByQuoteNumber(leads, { id: 'd', quoteNumber: 'Q-900003' });
    expect(after.map((l) => l.id)).toEqual(['d', 'b', 'c']);
    expect(upsertLeadByQuoteNumber(leads, { id: 'e' }).map((l) => l.id)).toEqual(['e', 'a', 'b', 'c']);
  });
});
