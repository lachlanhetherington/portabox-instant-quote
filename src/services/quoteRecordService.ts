import { QuoteBreakdown } from '../types/quote';
import { ensureQuoteNumber } from './quoteNumberService';
import type { QuoteCustomer } from './quoteSheetRows';
import { quoteInputsFromQuote, quoteTotals, type QuoteInputs } from './quoteFreeze';

export * from './quoteSheetRows';

export interface QuoteSubmitResult {
  saved: boolean;
  smartsheet?: string;
  /** When the frozen prices stop being guaranteed (30 days after sending). */
  expiresAt?: string;
  /** The server's prices differ from what the page showed (pricing changed while it was open). */
  pricesUpdated?: boolean;
}

/**
 * Sends a finished quote to the server. The server prices the customer's choices itself,
 * freezes those prices for 30 days and adds one row per container to the quotes sheet.
 * Never throws.
 */
export async function submitQuoteRecord(quote: QuoteBreakdown, customer: QuoteCustomer): Promise<QuoteSubmitResult> {
  try {
    const quoteNumber = await ensureQuoteNumber();
    if (!quoteNumber) return { saved: false };
    const r = await fetch('/api/public/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteNumber,
        inputs: quoteInputsFromQuote(quote),
        customer,
        shownTotals: quoteTotals(quote),
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok && !data?.saved) console.warn('Quote not saved:', data?.error || r.status);
    return {
      saved: Boolean(data?.saved),
      smartsheet: data?.smartsheet,
      expiresAt: data?.expiresAt,
      pricesUpdated: data?.pricesUpdated === true,
    };
  } catch (err) {
    console.warn('Quote not saved:', err);
    return { saved: false };
  }
}

export interface SavedQuoteView {
  quoteNumber: string;
  status: 'frozen' | 'expired' | 'booked';
  statusLabel: string;
  frozenAt?: string;
  expiresAt?: string;
  bookedAt?: string;
  bookingFrozenUntil?: string;
  quote: QuoteBreakdown;
  inputs: QuoteInputs;
  customerName?: string;
  contactEmail?: string;
  contactMobile?: string;
}

/** A customer reopens their quote with its number and the email or mobile they gave. Throws with a message to show. */
export async function openSavedQuote(quoteNumber: string, contact: string): Promise<SavedQuoteView> {
  const digits = quoteNumber.replace(/\D/g, '');
  const r = await fetch('/api/public/quotes/open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteNumber: `Q-${digits}`, contact }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      r.status === 429
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : data?.error || "We couldn't open that quote right now. Please try again."
    );
  }
  return data as SavedQuoteView;
}
