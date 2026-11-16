import React, { useState } from 'react';
import { X, Search, Lock, Clock, CheckCircle2, RefreshCw, Pencil, Phone } from 'lucide-react';
import { openSavedQuote, type SavedQuoteView } from '../services/quoteRecordService';
import type { QuoteInputs } from '../services/quoteFreeze';
import { TraditionalQuoteDocument } from './TraditionalQuoteDocument';

interface OpenSavedQuoteModalProps {
  phone?: string;
  onClose: () => void;
  /** Start a new quote from these choices, at today's prices. */
  onRequote: (inputs: QuoteInputs) => void;
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const daysLeft = (iso?: string) =>
  iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;

/** Customer reopens a sent quote with its number and the email or mobile they gave. */
export const OpenSavedQuoteModal: React.FC<OpenSavedQuoteModalProps> = ({ phone, onClose, onRequote }) => {
  const [quoteNumber, setQuoteNumber] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedQuoteView | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!quoteNumber.replace(/\D/g, '') || !contact.trim()) {
      setError('Enter your quote number and the email or mobile you used.');
      return;
    }
    setLoading(true);
    try {
      setSaved(await openSavedQuote(quoteNumber, contact));
    } catch (err: any) {
      setError(err?.message || "We couldn't open that quote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-start justify-center overflow-y-auto p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Open your saved quote">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border-2 border-[#DAD7D1] my-4">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-100">
          <h2 className="text-lg sm:text-2xl font-black text-[#15385E]">
            {saved ? `Quote ${saved.quoteNumber}` : 'Open your saved quote'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {!saved ? (
          <form onSubmit={submit} className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-slate-600">
              Enter the quote number from your quote (for example Q-100123) and the email or mobile you gave when you got it.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-black uppercase tracking-wide text-[#15385E] mb-1">Quote number</span>
                <input
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="Q-100123"
                  autoComplete="off"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#5CC1EF] focus:outline-none font-bold text-[#15385E]"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-black uppercase tracking-wide text-[#15385E] mb-1">Email or mobile</span>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="you@example.com or 04XX XXX XXX"
                  autoComplete="email"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#5CC1EF] focus:outline-none font-bold text-[#15385E]"
                />
              </label>
            </div>
            {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-[#F7D347] hover:bg-[#eed235] disabled:opacity-60 text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Opening…' : 'Open quote'}
            </button>
          </form>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            {saved.status === 'frozen' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-black">Quote Frozen: your prices are held until {fmtDate(saved.expiresAt)} ({daysLeft(saved.expiresAt)} days left)</p>
                  <p className="mt-0.5">
                    To book at these prices, call us{phone ? <> on <a className="font-black underline" href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></> : ''} and quote {saved.quoteNumber}. Changing the quote gives today's prices and a new 30-day guarantee.
                  </p>
                </div>
              </div>
            )}
            {saved.status === 'expired' && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-black">Quote Expired on {fmtDate(saved.expiresAt)}</p>
                  <p className="mt-0.5">The 30-day price guarantee has ended. Get today's prices for the same choices, with a new 30-day guarantee.</p>
                </div>
              </div>
            )}
            {saved.status === 'booked' && (
              <div className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-300 text-sky-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-black">Booked on {fmtDate(saved.bookedAt)}</p>
                  <p className="mt-0.5">Your Booking Frozen Price is held until {fmtDate(saved.bookingFrozenUntil)}.</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {saved.status === 'expired' && (
                <button
                  type="button"
                  onClick={() => onRequote(saved.inputs)}
                  className="px-5 py-2.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Get today's prices
                </button>
              )}
              {saved.status === 'frozen' && (
                <>
                  {phone && (
                    <a
                      href={`tel:${phone.replace(/\s/g, '')}`}
                      className="px-5 py-2.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 text-sm"
                    >
                      <Phone className="w-4 h-4" /> Call to book
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Changing your quote gives today's prices and a new 30-day guarantee. Continue?")) onRequote(saved.inputs);
                    }}
                    className="px-5 py-2.5 bg-white hover:bg-slate-50 text-[#15385E] font-black rounded-2xl border-2 border-slate-300 flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Pencil className="w-4 h-4" /> Change this quote
                  </button>
                </>
              )}
            </div>

            <TraditionalQuoteDocument
              quote={saved.quote}
              phone={phone}
              customerData={{
                firstName: saved.customerName || '',
                email: saved.contactEmail || '',
                mobile: saved.contactMobile || '',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
