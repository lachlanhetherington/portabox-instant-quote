import React, { useState } from 'react';
import {
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  X,
  Phone,
  Moon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  BusinessHoursConfig,
  LocationServiceHoursConfig,
  checkBusinessHoursStatus,
  saveAfterHoursMessage,
} from '../services/businessHoursService';
import { PostcodeTierEvaluation } from '../services/postcodeServiceTierEngine';

interface AfterHoursTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: BusinessHoursConfig;
  locationDepotConfig?: LocationServiceHoursConfig;
  postcodeTierEvaluation?: PostcodeTierEvaluation;
  defaultCustomerName?: string;
  defaultCustomerMobile?: string;
  defaultSuburbOrPostcode?: string;
  source?: 'AreYouStuckBanner' | 'CustomerPortal' | 'Direct';
}

export const AfterHoursTextModal: React.FC<AfterHoursTextModalProps> = ({
  isOpen,
  onClose,
  config,
  locationDepotConfig,
  postcodeTierEvaluation,
  defaultCustomerName = '',
  defaultCustomerMobile = '',
  defaultSuburbOrPostcode = '',
  source = 'AreYouStuckBanner',
}) => {
  const [name, setName] = useState(defaultCustomerName);
  const [mobile, setMobile] = useState(defaultCustomerMobile);
  const [message, setMessage] = useState('');
  const [suburb, setSuburb] = useState(defaultSuburbOrPostcode);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveConfig: BusinessHoursConfig = locationDepotConfig
    ? {
        enabled: locationDepotConfig.enabled,
        startHour: locationDepotConfig.startHour,
        startMinute: locationDepotConfig.startMinute,
        endHour: locationDepotConfig.endHour,
        endMinute: locationDepotConfig.endMinute,
        timezone: locationDepotConfig.timezone,
        daysOpen: locationDepotConfig.daysOpen,
        autoReplyText: locationDepotConfig.autoReplyText,
        forceAfterHoursForTesting: locationDepotConfig.forceAfterHoursForTesting ?? config?.forceAfterHoursForTesting,
      }
    : config || {
        enabled: true,
        startHour: 8,
        startMinute: 30,
        endHour: 17,
        endMinute: 0,
        timezone: 'Australia/Sydney',
        daysOpen: [1, 2, 3, 4, 5],
        autoReplyText:
          "Thanks for reaching out! Our team has stepped away for the day, but we’ve saved your message and will get right back to you first thing tomorrow morning. While you're here, leave us all the details! Tell us what you're looking for, and we'll take care of the rest in the morning.",
      };

  const hoursStatus = checkBusinessHoursStatus(effectiveConfig);

  const popOutMessageText =
    locationDepotConfig?.autoReplyText ||
    config?.autoReplyText ||
    "Thanks for reaching out! Our team has stepped away for the day, but we’ve saved your message and will get right back to you first thing tomorrow morning. While you're here, leave us all the details! Tell us what you're looking for, and we'll take care of the rest in the morning.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) {
      setError('Please provide your mobile number so we can text or call you back.');
      return;
    }
    if (!message.trim()) {
      setError("Please leave us some details about what you're looking for.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      saveAfterHoursMessage({
        customerName: name.trim() || 'Portabox Customer',
        customerMobile: mobile.trim(),
        message: message.trim(),
        suburbOrPostcode: suburb.trim() || undefined,
        source,
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setError('An error occurred saving your message. Please try opening SMS directly.');
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header with Night / Stepped Away Theme */}
        <div className="bg-gradient-to-r from-[#0b2942] to-[#133e61] text-white p-5 sm:p-6 relative">
          <button
            onClick={handleResetAndClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00c0f3]/20 border border-[#00c0f3]/40 flex items-center justify-center text-[#00c0f3] shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[#FEBD69] text-[#0b2942]">
                  {locationDepotConfig ? `AFTER-HOURS · ${locationDepotConfig.depotName}` : 'AFTER-HOURS SUPPORT'}
                </span>
                <span className="text-xs text-sky-200 font-medium">
                  {hoursStatus.nextOpenText}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                {locationDepotConfig
                  ? `Dispatch Office Closed · ${locationDepotConfig.suburb}`
                  : 'We’ve Stepped Away For The Day'}
              </h3>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Tier 2 or Tier 3 Advisory Banner if applicable */}
          {postcodeTierEvaluation && postcodeTierEvaluation.tier === 2 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex items-start gap-2.5 text-xs">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-amber-900">
                  Tier 2 Extended Regional Area (&gt;200 km)
                </strong>
                <span>
                  This location is outside our standard delivery zone, but we can accommodate via selling you a container. Leave your requirements below!
                </span>
              </div>
            </div>
          )}

          {postcodeTierEvaluation && postcodeTierEvaluation.tier === 3 && (
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 flex items-start gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-slate-900">
                  Tier 3 Location ({postcodeTierEvaluation.state})
                </strong>
                <span>
                  Standard mobile deliveries are not serviced, but our team can discuss custom logistics options.
                </span>
              </div>
            </div>
          )}

          {/* Exact required auto-response quote banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-[#0b2942]">
                &ldquo;{popOutMessageText}&rdquo;
              </p>
            </div>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Smith"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="04XX XXX XXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Suburb or Postcode (Optional)
                </label>
                <input
                  type="text"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  placeholder="e.g. 5061 Hyde Park, 3000 Melbourne..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tell us what you're looking for <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what size container, delivery dates, driveway access questions, or pricing details you need..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] focus:bg-white transition-all resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {error}
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] font-black text-sm border-2 border-[#FEBD69] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving Message...' : 'Save & Get Reply Tomorrow Morning'}</span>
                </button>


              </div>
            </form>
          ) : (
            <div className="py-4 space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-extrabold text-[#0b2942]">
                  We’ve Saved Your Details!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto mt-1 leading-relaxed">
                  Our dispatch & support team will review your message first thing tomorrow morning and reach out to <span className="font-bold text-[#0b2942]">{mobile}</span> right away.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-left text-xs space-y-1.5 text-slate-700">
                <div className="flex items-center justify-between font-bold text-[#0b2942]">
                  <span>Customer:</span>
                  <span>{name || 'Valued Customer'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mobile:</span>
                  <span className="font-mono font-bold text-[#0b2942]">{mobile}</span>
                </div>
                {suburb && (
                  <div className="flex items-center justify-between">
                    <span>Location:</span>
                    <span>{suburb}</span>
                  </div>
                )}
                <div className="pt-1 border-t border-sky-200/60 text-slate-600 text-[11px] italic">
                  &ldquo;{message}&rdquo;
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full py-3 px-4 rounded-2xl bg-[#0b2942] hover:bg-[#081e30] text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Continue Browsing Quote
                </button>
              </div>
            </div>
          )}

          {/* Operating hours footer badge */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{hoursStatus.scheduleSummary}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Australian Support Desk</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
