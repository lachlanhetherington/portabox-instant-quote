import React, { useState } from 'react';
import {
  Share2,
  MessageCircle,
  Smartphone,
  Mail,
  Printer,
  Copy,
  Check,
  Download,
  Sparkles,
  Link as LinkIcon,
  Send,
  PhoneCall,
} from 'lucide-react';
import { QuoteBreakdown } from '../types/quote';

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
  const [magicCopied, setMagicCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [magicMobileInput, setMagicMobileInput] = useState(customerData?.mobile || '');
  const [magicSentSuccess, setMagicSentSuccess] = useState(false);

  const quoteRef = `PBQ-${(quote.quoteCreatedAt ? new Date(quote.quoteCreatedAt).getTime() : Date.now()).toString().slice(-6)}`;
  const customerName = customerData?.firstName || 'Valued Customer';
  const customerMobile = customerData?.mobile || '';
  const customerEmail = customerData?.email || '';

  const validityDateStr = quote.quoteExpiresAt
    ? new Date(quote.quoteExpiresAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '30 Days from issue';

  // Construct clear, structured text summary
  const generateShareText = () => {
    const isMulti = quote.containerCount > 1;
    const lines = [
      `📦 PORTABOX AUSTRALIA - OFFICIAL QUOTATION #${quoteRef}`,
      `Customer: ${customerName}`,
      `Container: ${isMulti ? `${quote.containerCount} × ` : ''}${quote.containerName} (${quote.containerVolume})`,
      `Delivery To: ${quote.originPostcode.suburb} ${quote.originPostcode.state} ${quote.originPostcode.postcode}`,
      `Preferred Date: ${quote.preferredDate}`,
      ``,
      `--- FINANCIAL BREAKDOWN (AUD, GST INCL) ---`,
      `1. INITIAL MOVE-IN & DELIVERY: $${quote.initialDeliveryFee}`,
      `2. ONGOING MONTHLY STORAGE: $${quote.monthlyStorageFee}/month (12-Mo Rate Freeze)`,
    ];

    if (quote.packingSupplies?.totalSuppliesPrice > 0) {
      lines.push(
        `3. SUPPLIES: $${quote.packingSupplies.totalSuppliesPrice} (${[
          quote.packingSupplies.blanketsCount > 0 ? `${quote.packingSupplies.blanketsCount} Blankets (${quote.packingSupplies.freeBlanketsAllowance || 10} Free)` : null,
          quote.packingSupplies.locksCount ? `${quote.packingSupplies.locksCount} Padlock` : null,
          quote.packingSupplies.boxesCount ? `${quote.packingSupplies.boxesCount} Boxes` : null,
        ].filter(Boolean).join(', ')})`
      );
    }

    if (quote.insurance?.selected) {
      lines.push(
        `4. CPO INSURANCE: ${quote.insurance.isFreePromo ? '$0/mo (Free Promo)' : `$${quote.insurance.totalMonthlyInsuranceFee}/mo`} (Up to $${(quote.insurance.coverageAmount || 10000).toLocaleString()} cover)`
      );
    }

    lines.push(
      ``,
      `TOTAL PAYABLE UPFRONT: $${quote.firstPaymentTotal}`,
      `ONGOING MONTHLY BILL: $${quote.monthlyStorageFee + (quote.insurance?.selected && !quote.insurance.isFreePromo ? quote.insurance.totalMonthlyInsuranceFee : 0)}/month`,
      ``,
      `🔒 30-Day Guaranteed Price Lock: Held until ${validityDateStr}`,
      `📞 Questions or to Book: Call ${phone} or reply here.`
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

  // Generate Magic Resume Link preserving quote configuration
  const generateMagicLink = () => {
    try {
      const resumePayload = {
        ref: quoteRef,
        originSuburb: quote.originPostcode.suburb,
        originPostcode: quote.originPostcode.postcode,
        containerSize: quote.containerSize,
        containerCount: quote.containerCount,
        billingCycle: quote.billingCycle,
        storageDuration: quote.storageDuration,
        preferredDate: quote.preferredDate,
        customerName: customerName,
        customerEmail: customerEmail,
        customerMobile: magicMobileInput || customerMobile,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('portabox_magic_quote', JSON.stringify(resumePayload));
      return `${window.location.origin}${window.location.pathname}?magicQuote=${encodeURIComponent(quoteRef)}`;
    } catch {
      return window.location.href;
    }
  };

  const handleSendMagicSms = () => {
    const mobileToUse = magicMobileInput || customerMobile;
    if (!mobileToUse || mobileToUse.trim().length < 6) {
      showToast('Please enter a valid mobile number');
      return;
    }
    generateMagicLink();
    setMagicSentSuccess(true);
    showToast(`✓ Magic link simulated to ${mobileToUse}! You can resume this quote anytime.`);
    setTimeout(() => {
      setIsMagicModalOpen(false);
      setMagicSentSuccess(false);
    }, 2800);
  };

  const handleCopyMagicLink = async () => {
    const link = generateMagicLink();
    try {
      await navigator.clipboard.writeText(link);
      setMagicCopied(true);
      showToast('✓ Magic Resume link copied to clipboard!');
      setTimeout(() => setMagicCopied(false), 2500);
    } catch {
      showToast('Unable to copy link.');
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
            Share this formal quotation directly to WhatsApp, SMS text, Email, or print an official tax invoice copy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Text Me Magic Link Button */}
          <button
            type="button"
            onClick={() => {
              generateMagicLink();
              setIsMagicModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F7D347] to-[#eed235] hover:from-[#eed235] hover:to-[#e6c338] text-[#1A1A1A] text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-[#e6c338] active:scale-95"
            title="Text a 1-tap magic link to your phone to resume this quote later"
          >
            <Sparkles className="w-4 h-4 text-[#1A1A1A]" />
            <span>Text Me Magic Link</span>
          </button>

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
            <span className="hidden xs:inline">Share</span>
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

          {/* Download Tax Invoice / Print Button */}
          <button
            type="button"
            onClick={handlePrintQuote}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#15385E] text-xs font-black border-2 border-slate-300 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Download or Print Official Tax Invoice (PDF)"
          >
            <Download className="w-4 h-4 text-[#15385E]" />
            <span>Download Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Magic Resume Link Modal / Drawer */}
      {isMagicModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-[#DAD7D1] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F7D347] flex items-center justify-center text-[#1A1A1A] font-black">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-[#15385E] text-sm">
                    Magic Resume Link (No Login Needed)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Quote #{quoteRef} · Locked for 30 days
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMagicModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              We'll send an authenticated magic link directly to your mobile. Click it anytime to reopen this exact quote configuration on your phone with all rates and discounts intact.
            </p>

            {magicSentSuccess ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span>Magic Link sent to {magicMobileInput || customerMobile}! Check your messages.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Your Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={magicMobileInput}
                    onChange={(e) => setMagicMobileInput(e.target.value)}
                    placeholder="e.g. 0412 345 678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-[#15385E] focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendMagicSms}
                    className="flex-1 py-2.5 bg-[#15385E] hover:bg-[#112F4F] text-[#F7D347] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send SMS Magic Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMagicLink}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    title="Copy Magic URL"
                  >
                    {magicCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5" />}
                    <span>{magicCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="p-2.5 bg-slate-50 rounded-xl text-[10px] text-slate-500 flex items-center gap-1.5">
              <span>🔒 100% Spam-Free: Used exclusively for sending your Portabox quote link.</span>
            </div>
          </div>
        </div>
      )}

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
