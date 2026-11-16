import React, { useState } from 'react';
import { Search, Loader2, AlertTriangle, ShieldCheck, Clock, CheckCircle, Lock } from 'lucide-react';
import { AppConfig, QuoteBreakdown } from '../../types/quote';
import { apiFetch } from '../../services/apiClient';
import { formatMoney } from '../../utils/currency';

type SavedQuoteStatus = 'frozen' | 'expired' | 'booked';

interface SavedQuoteView {
  quoteNumber: string;
  status: SavedQuoteStatus;
  statusLabel?: string;
  frozenAt?: string;
  expiresAt?: string;
  bookedAt?: string;
  bookingFrozenUntil?: string;
  bookedBy?: string;
  customerName?: string;
  contactEmail?: string;
  contactMobile?: string;
  quote: QuoteBreakdown | null;
  inputs: {
    origin?: { postcode?: string; suburb?: string };
    destination?: { postcode?: string; suburb?: string };
  } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Accepts "Q-100123", "q100123", "100123" etc. Returns null when there are no digits. */
export function normaliseQuoteNumber(raw: string): string | null {
  const digits = raw.trim().toUpperCase().replace(/^Q-?/, '').replace(/\s+/g, '');
  return /^\d+$/.test(digits) ? `Q-${digits}` : null;
}

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

const daysLeft = (iso?: string): number => {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / DAY_MS)) : 0;
};

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    /* not JSON */
  }
  return fallback;
}

interface StaffQuoteLookupProps {
  config: AppConfig;
}

export const StaffQuoteLookup: React.FC<StaffQuoteLookupProps> = ({ config }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<SavedQuoteView | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const bookingEnabled = config.enableQuoteBooking === true;

  const handleOpen = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const quoteNumber = normaliseQuoteNumber(input);
    if (!quoteNumber) {
      setError('Enter a quote number like Q-100123.');
      return;
    }
    setInput(quoteNumber);
    setLoading(true);
    setError(null);
    setBookError(null);
    setView(null);
    try {
      const res = await apiFetch(`/api/quotes/${encodeURIComponent(quoteNumber)}`);
      if (!res.ok) {
        const fallback =
          res.status === 404 ? `No saved quote found for ${quoteNumber}.` : `Could not open ${quoteNumber} (error ${res.status}).`;
        setError(await readError(res, fallback));
        return;
      }
      setView((await res.json()) as SavedQuoteView);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!view || view.status !== 'frozen' || !bookingEnabled) return;
    const ok = window.confirm(
      `Begin a booking for quote ${view.quoteNumber} at its frozen prices?\n\n` +
        'The quoted prices become the Booking Frozen Price and will be held for 12 months.'
    );
    if (!ok) return;
    setBooking(true);
    setBookError(null);
    try {
      const res = await apiFetch(`/api/quotes/${encodeURIComponent(view.quoteNumber)}/book`, { method: 'POST' });
      if (!res.ok) {
        setBookError(await readError(res, `Booking failed (error ${res.status}).`));
        return;
      }
      setView((await res.json()) as SavedQuoteView);
    } catch {
      setBookError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBooking(false);
    }
  };

  const q = view?.quote;
  const containerSummary = q
    ? q.containerName
      ? `${q.containerCount > 1 ? `${q.containerCount} × ` : ''}${q.containerName}`
      : `${q.containerCount} × ${q.containerSize}`
    : '—';
  const originSuburb = view?.inputs?.origin?.suburb;
  const destinationSuburb = view?.inputs?.destination?.suburb;
  const place = (p?: { postcode?: string; suburb?: string }) =>
    p?.suburb ? `${p.suburb}${p.postcode ? ` ${p.postcode}` : ''}` : '—';

  const statusBadge = (() => {
    if (!view) return null;
    if (view.status === 'frozen') {
      return {
        label: view.statusLabel || 'Quote Frozen',
        badge: 'text-emerald-800 bg-emerald-100',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
        detail: `Prices held until ${formatDate(view.expiresAt)} (${daysLeft(view.expiresAt)} ${daysLeft(view.expiresAt) === 1 ? 'day' : 'days'} left)`,
      };
    }
    if (view.status === 'expired') {
      return {
        label: view.statusLabel || 'Quote Expired',
        badge: 'text-amber-800 bg-amber-100',
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        detail: `Expired on ${formatDate(view.expiresAt)} — re-quote at today's prices`,
      };
    }
    return {
      label: view.statusLabel || 'Booking Frozen Price',
      badge: 'text-sky-800 bg-sky-100',
      icon: <Lock className="w-4 h-4 text-sky-600" />,
      detail: `Booked ${formatDate(view.bookedAt)}${view.bookedBy ? ` by ${view.bookedBy}` : ''} · price held until ${formatDate(view.bookingFrozenUntil)}`,
    };
  })();

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-[#0b2942]">Find a quote</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Open a saved quote by its number to check its frozen prices and begin a booking.
          </p>
        </div>
        <Search className="w-4 h-4 text-[#00c0f3]" />
      </div>

      <form onSubmit={handleOpen} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Quote number, e.g. Q-100123"
          aria-label="Quote number"
          className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-[#0b2942] focus:outline-none focus:ring-2 focus:ring-[#00c0f3]/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#00c0f3] hover:bg-[#00a9d7] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>{loading ? 'Opening…' : 'Open'}</span>
        </button>
      </form>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {view && statusBadge && (
        <div className="rounded-2xl border border-slate-200 p-4 space-y-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {statusBadge.icon}
              <span className="font-mono font-black text-[#0b2942] text-base">{view.quoteNumber}</span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusBadge.badge}`}>
                {statusBadge.label}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-600">{statusBadge.detail}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Customer</div>
              <div className="font-bold text-[#15385E]">{view.customerName || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email</div>
              <div className="font-bold text-[#15385E] break-all">{view.contactEmail || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mobile</div>
              <div className="font-bold text-[#15385E]">{view.contactMobile || '—'}</div>
            </div>
          </div>

          {q ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs border-t border-slate-200 pt-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Monthly storage</div>
                <div className="font-mono font-black text-emerald-700">${formatMoney(q.monthlyStorageFee, true)}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Billing</div>
                <div className="font-bold text-[#15385E]">{q.billingCycleLabel || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">First payment</div>
                <div className="font-mono font-black text-[#15385E]">${formatMoney(q.firstPaymentTotal, true)}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Containers</div>
                <div className="font-bold text-[#15385E]">{containerSummary}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">From</div>
                <div className="font-bold text-[#15385E]">{place(view.inputs?.origin)}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">To</div>
                <div className="font-bold text-[#15385E]">
                  {destinationSuburb ? place(view.inputs?.destination) : originSuburb ? 'Same as origin' : '—'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Price details are not available for this quote.</p>
          )}

          {view.status === 'frozen' && (
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <button
                type="button"
                onClick={handleBook}
                disabled={!bookingEnabled || booking}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#15385E] hover:bg-[#0b2942] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all"
              >
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                <span>{booking ? 'Booking…' : 'Begin booking at frozen prices'}</span>
              </button>
              {!bookingEnabled && (
                <p className="text-[11px] text-slate-500 font-bold">
                  Booking is switched off — turn on 'Book Frozen Quotes' in Feature switches
                </p>
              )}
            </div>
          )}

          {bookError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{bookError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
