import React, { useState } from 'react';
import { Check, Phone, RotateCcw, MessageSquare, Mail, Smartphone, ExternalLink, Calendar, MapPin, Box } from 'lucide-react';
import { CustomerLead } from '../types/quote';
import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step6ConfirmationProps {
  lead: CustomerLead;
  onQuoteAnotherSize: () => void;
  phone?: string;
}

export const Step6Confirmation: React.FC<Step6ConfirmationProps> = ({
  lead,
  onQuoteAnotherSize,
  phone = '1800 467 637',
}) => {
  const [activePreviewTab, setActivePreviewTab] = useState<'sms' | 'email'>('sms');
  const quote = lead.quote;

  // Calculate expiry date (30 days guaranteed price lock)
  const validityDays = quote.quoteValidityDays || 30;
  const expiryDate = quote.quoteExpiresAt
    ? new Date(quote.quoteExpiresAt)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + validityDays);
        return d;
      })();
  const formattedExpiry = expiryDate.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
  });

  const cityTeam = quote.originDepot.name.replace(' Depot', '');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Confirmation Banner & Action Buttons */}
      <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 shadow-xs border-2 border-[#DAD7D1] text-center sm:text-left">
        {/* Animated Checkmark Circle: #5CC1EF with #15385E check */}
        <div className="w-16 h-16 rounded-full bg-[#5CC1EF] text-[#15385E] flex items-center justify-center mx-auto sm:mx-0 shadow-lg shadow-sky-200 animate-in zoom-in-75 duration-300">
          <Check className="w-9 h-9 stroke-[3]" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mt-6">
          Sent. Check your phone, {lead.firstName}.
        </h1>

        <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
          Your quote for a <span className="font-bold text-[#15385E]">{quote.containerName}</span> at{' '}
          <span className="font-bold text-[#15385E]">{quote.originPostcode.suburb}</span> is on its way to{' '}
          <span className="font-bold font-mono text-[#15385E]">{lead.mobile}</span> and your inbox{' '}
          <span className="font-semibold text-slate-800">({lead.email})</span>.
        </p>

        <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block mt-3 border border-emerald-200">
          ✓ This price is locked and held until {formattedExpiry}.
        </p>

        {/* CTA Buttons: #F7D347 Vibrant Gold / Yellow with #1A1A1A text */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
          >
            <Phone className="w-4 h-4 fill-[#1A1A1A]" />
            <span>Book it now on {phone}</span>
          </a>

          <button
            onClick={onQuoteAnotherSize}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-[#DAD7D1] text-[#15385E] font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <span>Quote another size</span>
          </button>
        </div>

        {/* Got a question box */}
        <div className="mt-8 p-4 bg-sky-50/70 rounded-2xl border border-sky-100 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white text-[#5CC1EF] shadow-xs mt-0.5">
            <MessageSquare className="w-4 h-4 text-[#15385E]" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-[#15385E]">Got a question about access, dates or the driveway?</p>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              Reply directly to the text and the {cityTeam} team will answer.
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive "WHAT THE TEXT SAYS" simulation */}
      <div className="lg:col-span-5 space-y-4">
        {/* Toggle between SMS and Email view */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            DISPATCH SIMULATION
          </h3>
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActivePreviewTab('sms')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activePreviewTab === 'sms'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>SMS</span>
            </button>
            <button
              onClick={() => setActivePreviewTab('email')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activePreviewTab === 'email'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
          </div>
        </div>

        {activePreviewTab === 'sms' ? (
          /* Real Smartphone SMS bubble (matches screenshot Page 6) */
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-3 pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Portabox · SMS
              </span>
              <span>Just now</span>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50 text-slate-800 text-xs sm:text-sm leading-relaxed border border-sky-100/80 space-y-2 shadow-xs">
              <p>
                Hi {lead.firstName}, here's your Portabox quote:
              </p>
              <p className="font-semibold text-[#0b2942]">
                {quote.containerName} ({quote.containerVolume}) at {quote.originPostcode.suburb}, ${quote.monthlyStorageFee}/month, delivery ${quote.initialDeliveryFee}, first payment ${quote.firstPaymentTotal}.
              </p>
              <p className="text-slate-600">
                Full breakdown: <span className="text-[#00c0f3] underline font-mono">portabox.au/q/7K2M</span>
              </p>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-sky-200/60">
                Reply here with any questions, or reply <span className="font-bold text-[#0b2942]">BOOK</span> to lock in {quote.preferredDate}.
              </p>
            </div>

            <p className="text-[11px] text-slate-400 text-center mt-3">
              Simulated real SMS delivered to {lead.mobile}
            </p>
          </div>
        ) : (
          /* Email Confirmation View */
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-3 pb-2 border-b border-slate-100">
              <span className="text-slate-700">Inbox · quotes@portabox.com.au</span>
              <span>Today</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-extrabold text-[#00c0f3] text-base">portabox</span>
                <span className="font-mono text-slate-400">Quote #{lead.id.slice(-6).toUpperCase()}</span>
              </div>
              <p className="font-bold text-slate-800 text-sm">
                Your Portabox Quote for {quote.originPostcode.suburb}
              </p>
              <div className="space-y-1 text-slate-600">
                <div>• Container: {quote.containerName}</div>
                <div>• Delivery to: {quote.originPostcode.suburb} ({quote.originPostcode.state})</div>
                <div>• Preferred date: {quote.preferredDate}</div>
                <div>• Total first payment: <span className="font-bold text-[#0b2942]">${quote.firstPaymentTotal}</span></div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  className="w-full py-2 bg-[#00c0f3] text-white font-bold rounded-lg text-xs"
                >
                  Confirm & Book Container
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Copy delivered to {lead.email}
            </p>
          </div>
        )}

        {/* Are You Stuck Banner */}
        <AreYouStuckBanner />
      </div>
    </div>
  );
};
