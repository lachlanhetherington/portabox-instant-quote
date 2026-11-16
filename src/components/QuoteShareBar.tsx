import React, { useState } from 'react';
import { Share2, MessageCircle, Smartphone, Mail, Printer, Copy, Check } from 'lucide-react';
import { QuoteBreakdown } from '../types/quote';
import { formatMoney } from '../utils/currency';
import { useQuoteNumber, usePublicSettings } from '../services/quoteNumberService';
import { SALES_EMAIL } from '../utils/contact';
import { getQuoteDurationLabel } from '../services/pricingEngine';
import { getQuoteCostSections, CostLine, INITIAL_PAYMENT_DISCLAIMER } from '../services/quoteCostSections';

interface QuoteShareBarProps {
  quote: QuoteBreakdown;
  customerData?: {
    firstName: string;
    mobile: string;
    email: string;
  };
  phone?: string;
}

export const QuoteShareBar: React.FC<QuoteShareBarProps> = ({
  quote,
  customerData,
  phone = '1800 467 637',
}) => {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const quoteRef = useQuoteNumber() || 'Q-…';
  const { showDeliveryWindowNote } = usePublicSettings();
  const customerName = customerData?.firstName || 'Valued Customer';

  const validityDateStr = quote.quoteExpiresAt
    ? new Date(quote.quoteExpiresAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '30 Days from issue';

  // Plain-text summary for WhatsApp, SMS, email and copy. Mirrors the quote document.
  const generateShareText = () => {
    const money = (n: number) => `$${formatMoney(n)}`;
    const legTotal = (leg: QuoteBreakdown['legs'][number]) =>
      leg.fee + (leg.fuelSurchargeDeferred ? leg.fuelSurchargeEstimatedAmount || 0 : 0);
    const laterTransport = quote.legs.filter((l) => !l.isPayableNow).reduce((sum, l) => sum + legTotal(l), 0);
    // Same sections as the quote document (Dan, 16 Nov)
    const { upfront, ongoing } = getQuoteCostSections(quote);
    const lineText = (l: CostLine) =>
      `   - ${l.label}: ${l.amount < 0 ? `-${money(-l.amount)}` : money(l.amount)}${l.detail ? ` (${l.detail})` : ''}`;

    const lines = [
      `📦 PORTABOX - QUOTATION ${quoteRef}`,
      `Customer: ${customerName}`,
      // containerName already includes the count for multi-container quotes (e.g. "2 x 25 m³ Portabox").
      `Container: ${quote.containerName} (${quote.containerVolume})`,
      `Delivery To: ${quote.originPostcode.suburb} ${quote.originPostcode.state} ${quote.originPostcode.postcode}`,
      `Storage Duration: ${getQuoteDurationLabel(quote)}`,
      ...(showDeliveryWindowNote ? [`Delivery Window: Selected during booking in Next Steps`] : []),
      ``,
      `--- PRICES (AUD, GST INCL) ---`,
      `1. Initial upfront payment: ${money(upfront.total)}`,
      ...upfront.lines.map((l) => (l.key.startsWith('leg-') ? `   - ${l.label} (incl. fuel levy): ${money(l.amount)}` : lineText(l))),
      `   ${INITIAL_PAYMENT_DISCLAIMER}`,
      ...(laterTransport > 0 ? [`1b. Later transport fees (incl. fuel levy), charged when each move happens: ${money(laterTransport)}`] : []),
      `2. Ongoing monthly costs: ${money(ongoing.total)}/month`,
      ...ongoing.lines.map(lineText),
    ];

    if (quote.savingsBreakdown?.length) {
      lines.push(``, `Your savings on this quote: ${money(quote.totalSavings || 0)}`);
      quote.savingsBreakdown.forEach((item) => lines.push(`  ✓ ${item.label}: ${money(item.amount)}`));
    }

    lines.push(
      ``,
      `FIRST PAYMENT TOTAL: ${money(quote.firstPaymentTotal)}`,
      `ONGOING MONTHLY COSTS: ${money(ongoing.total)}/month`,
      ``,
      `🔒 30-Day Quote Price Guarantee: held until ${validityDateStr}`,
      `📞 Questions or to book: call ${phone} or email ${SALES_EMAIL} (www.portabox.au).`
    );

    return lines.join('\n');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // WhatsApp 1-Click Share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateShareText());
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    showToast('Opening WhatsApp with your quote...');
  };

  // SMS 1-Click Share
  const handleSmsShare = () => {
    const text = encodeURIComponent(generateShareText());
    const url = `sms:?&body=${text}`;
    window.location.href = url;
    showToast('Opening SMS messaging app...');
  };

  // Email 1-Click Share
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Portabox Quotation #${quoteRef} - ${quote.containerName}`);
    const body = encodeURIComponent(generateShareText());
    const url = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = url;
    showToast('Opening Email composer...');
  };

  // Native Mobile Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Portabox Official Quote #${quoteRef}`,
          text: generateShareText(),
        });
        showToast('Quote shared successfully!');
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        handleCopyQuote();
      }
    } else {
      handleCopyQuote();
    }
  };

  // Copy full quote to clipboard
  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      showToast('✓ Full quotation copied to clipboard! Paste directly into any app.');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      showToast('Unable to copy automatically.');
    }
  };

  // Print / Save as PDF
  const handlePrintQuote = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 shadow-sm space-y-3 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-sm font-black text-[#15385E] uppercase tracking-wider">
              Share or Print This Quotation
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Share this formal quotation directly to WhatsApp, SMS text, Email, or print a copy for your records.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* WhatsApp Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Share Quote to WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
            <span>WhatsApp</span>
          </button>

          {/* SMS Button */}
          <button
            type="button"
            onClick={handleSmsShare}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Share Quote via SMS text message"
          >
            <Smartphone className="w-4 h-4" />
            <span>SMS Text</span>
          </button>

          {/* Email Button */}
          <button
            type="button"
            onClick={handleEmailShare}
            className="px-3.5 py-2 rounded-xl bg-[#15385E] hover:bg-[#0f2844] text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Email Quote Breakdown"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>

          {/* Native Mobile Share Button */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open phone share menu (AirDrop, Messages, etc.)"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Copy to Clipboard Button */}
          <button
            type="button"
            onClick={handleCopyQuote}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs border border-slate-300 transition-colors cursor-pointer"
            title="Copy text summary to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Print / Save PDF Button */}
          <button
            type="button"
            onClick={handlePrintQuote}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#15385E] text-xs font-black border-2 border-slate-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Print or Save Official Quote as PDF"
          >
            <Printer className="w-4 h-4 text-[#15385E]" />
            <span>Print / Save Quote</span>
          </button>
        </div>
      </div>

      {/* Floating feedback toast */}
      {toastMessage && (
        <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white font-mono ml-3"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
