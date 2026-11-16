import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import { formatMoney } from '../../utils/currency';
import type { QuoteBreakdown } from '../../types/quote';
import { TraditionalQuoteDocument } from '../TraditionalQuoteDocument';
import { FOLLOW_UP_STATUSES, type FollowUpNote, type FollowUpStatus } from '../../services/quoteFollowUp';

interface QuoteSummary {
  quoteNumber: string;
  status: 'frozen' | 'expired' | 'booked';
  statusLabel: string;
  frozenAt?: string;
  expiresAt?: string;
  bookedAt?: string;
  bookingFrozenUntil?: string;
  customerName?: string;
  contactEmail?: string;
  contactMobile?: string;
  origin: string;
  destination: string;
  containerName: string;
  serviceType: string;
  durationMonths: number | null;
  firstPaymentTotal: number | null;
  monthlyStorageFee: number | null;
  followUpStatus?: FollowUpStatus;
  followUpNotes?: FollowUpNote[];
}

interface OpenQuote extends QuoteSummary {
  quote: QuoteBreakdown;
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const fmtDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const daysLeft = (iso?: string) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)) : 0);

const FOLLOW_UP_STYLE: Record<FollowUpStatus, string> = {
  New: 'bg-sky-50 text-sky-800 border-sky-200',
  Contacted: 'bg-amber-50 text-amber-800 border-amber-200',
  Booked: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Follow-up': 'bg-rose-50 text-rose-800 border-rose-200',
};

const STATUS_STYLE: Record<QuoteSummary['status'], string> = {
  frozen: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  expired: 'bg-amber-50 text-amber-800 border-amber-200',
  booked: 'bg-sky-50 text-sky-800 border-sky-200',
};

/** Every quote customers have sent (saved on the server), newest first. Click one for the full quote. */
export const AllQuotesPanel: React.FC<{ phone?: string }> = ({ phone }) => {
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<OpenQuote | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | FollowUpStatus>('All');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingFollowUp, setSavingFollowUp] = useState<string | null>(null);

  /** Saves a follow-up status and/or note on the server, then shows what was saved. */
  const saveFollowUp = async (quoteNumber: string, update: { status?: FollowUpStatus; note?: string }) => {
    setSavingFollowUp(quoteNumber);
    setError(null);
    try {
      const r = await apiFetch(`/api/quotes/${encodeURIComponent(quoteNumber)}/follow-up`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'The follow-up could not be saved');
      setQuotes((all) =>
        (all || []).map((q) =>
          q.quoteNumber === quoteNumber ? { ...q, followUpStatus: data.followUpStatus, followUpNotes: data.followUpNotes } : q
        )
      );
      if (update.note) setNoteDrafts((d) => ({ ...d, [quoteNumber]: '' }));
    } catch (err: any) {
      setError(err?.message || 'The follow-up could not be saved');
    } finally {
      setSavingFollowUp(null);
    }
  };

  const load = async () => {
    setError(null);
    try {
      const r = await apiFetch('/api/quotes');
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 401 ? 'Sign in as staff to see quotes' : data?.error || 'Quotes are unavailable right now');
      setQuotes(data.quotes || []);
    } catch (err: any) {
      setError(err?.message || 'Quotes are unavailable right now');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openQuote = async (q: QuoteSummary) => {
    setOpening(q.quoteNumber);
    setError(null);
    try {
      const r = await apiFetch(`/api/quotes/${encodeURIComponent(q.quoteNumber)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.quote) throw new Error(data?.error || 'That quote could not be opened');
      setOpen({ ...q, ...data });
    } catch (err: any) {
      setError(err?.message || 'That quote could not be opened');
    } finally {
      setOpening(null);
    }
  };

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!quotes) return [];
    const byStatus = statusFilter === 'All' ? quotes : quotes.filter((q) => (q.followUpStatus || 'New') === statusFilter);
    if (!term) return byStatus;
    return byStatus.filter((q) =>
      [q.quoteNumber, q.customerName, q.contactEmail, q.contactMobile, q.origin, q.destination, q.containerName, q.statusLabel]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [quotes, search, statusFilter]);

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div>
          <h3 className="text-lg font-extrabold text-[#0b2942]">All Quotes</h3>
          <p className="text-xs text-slate-500">
            Every quote customers have sent, newest first. Click a quote to open it in full. Follow-up status and notes are shared by all staff.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quote number, customer, email, mobile, suburb…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
        />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter by follow-up status">
        <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
        {(['All', ...FOLLOW_UP_STATUSES] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            aria-pressed={statusFilter === st}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
              statusFilter === st ? 'bg-[#0b2942] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>
      </div>

      {error && <p role="alert" className="text-sm font-bold text-rose-700 mb-2">{error}</p>}
      {!quotes && !error && <p className="text-sm text-slate-500">Loading quotes…</p>}
      {quotes && shown.length === 0 && <p className="text-sm text-slate-500">{quotes.length === 0 ? 'No quotes yet.' : 'No quotes match your search.'}</p>}

      {shown.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Quote</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Container &amp; service</th>
                <th className="py-2.5 px-3">First payment</th>
                <th className="py-2.5 px-3">Quote status</th>
                <th className="py-2.5 px-3">Follow-up</th>
                <th className="py-2.5 px-3 min-w-[220px]">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((q) => (
                <tr
                  key={q.quoteNumber}
                  onClick={() => void openQuote(q)}
                  title="Click to open the full quote"
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="py-2.5 px-3">
                    <div className="font-mono font-bold text-[#0b2942]">{q.quoteNumber}</div>
                    <div className="text-[10px] text-slate-400">{fmtDate(q.frozenAt)}</div>
                    <div className="text-[10px] font-bold text-[#00a9d7] underline">
                      {opening === q.quoteNumber ? 'Opening…' : 'View full quote'}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{q.customerName || '—'}</div>
                    <div className="text-slate-500">{q.contactEmail}</div>
                    <div className="font-mono text-slate-500">{q.contactMobile}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    <div>{q.origin}</div>
                    {q.destination && <div className="text-slate-500">to {q.destination}</div>}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    <div className="font-semibold">{q.containerName}</div>
                    <div className="text-slate-500">
                      {q.serviceType.replace(/_/g, ' ')}
                      {q.durationMonths ? ` · ${q.durationMonths} ${q.durationMonths === 1 ? 'month' : 'months'}` : ''}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                    {q.firstPaymentTotal !== null ? `$${formatMoney(q.firstPaymentTotal)}` : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${STATUS_STYLE[q.status]}`}>
                      {q.statusLabel}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {q.status === 'frozen' && `Held until ${fmtDay(q.expiresAt)} (${daysLeft(q.expiresAt)} days)`}
                      {q.status === 'expired' && `Expired ${fmtDay(q.expiresAt)}`}
                      {q.status === 'booked' && `Booked ${fmtDay(q.bookedAt)} · held to ${fmtDay(q.bookingFrozenUntil)}`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      aria-label={`Follow-up status for ${q.quoteNumber}`}
                      value={q.followUpStatus || 'New'}
                      disabled={savingFollowUp === q.quoteNumber}
                      onChange={(e) => void saveFollowUp(q.quoteNumber, { status: e.target.value as FollowUpStatus })}
                      className={`px-2 py-1 rounded-lg border text-xs font-bold cursor-pointer ${FOLLOW_UP_STYLE[q.followUpStatus || 'New']}`}
                    >
                      {FOLLOW_UP_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    {(q.followUpNotes || []).slice(-3).map((n, i) => (
                      <div key={i} className="text-[11px] text-slate-700 bg-slate-50 rounded px-2 py-1 mb-1">
                        {n.text}
                        <div className="text-[10px] text-slate-400">
                          {n.by} · {fmtDate(n.at)}
                        </div>
                      </div>
                    ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const text = (noteDrafts[q.quoteNumber] || '').trim();
                        if (text) void saveFollowUp(q.quoteNumber, { note: text });
                      }}
                    >
                      <input
                        aria-label={`Add a note to ${q.quoteNumber}`}
                        value={noteDrafts[q.quoteNumber] || ''}
                        onChange={(e) => setNoteDrafts((d) => ({ ...d, [q.quoteNumber]: e.target.value }))}
                        placeholder="Add note… (Enter to save)"
                        disabled={savingFollowUp === q.quoteNumber}
                        className="w-full text-[11px] px-2 py-1 rounded border border-slate-200"
                      />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[90] bg-slate-900/60 flex items-start justify-center overflow-y-auto p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Quote ${open.quoteNumber}`}
          onClick={() => setOpen(null)}
        >
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl my-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-[#0b2942]">Quote {open.quoteNumber}</h2>
                <p className="text-xs text-slate-500">
                  Sent {fmtDate(open.frozenAt)} · {open.statusLabel}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="p-4">
              <TraditionalQuoteDocument
                quote={open.quote}
                quoteNumber={open.quoteNumber}
                phone={phone}
                customerData={{
                  firstName: open.customerName || '',
                  email: open.contactEmail || '',
                  mobile: open.contactMobile || '',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
