import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { QuoteBreakdown } from '../types/quote';
import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step5SendQuoteProps {
  quote: QuoteBreakdown;
  onSendQuote: (customerData: {
    firstName: string;
    mobile: string;
    email: string;
    agreedToContact: boolean;
    hasNoPhoneOrEmail?: boolean;
    isAgentCallIn?: boolean;
    channels?: {
      email?: boolean;
      sms?: boolean;
      portal?: boolean;
    };
    agentName?: string;
    agentNotes?: string;
  }) => void;
  onBack: () => void;
  initialCustomerData?: {
    firstName: string;
    mobile: string;
    email: string;
    hasNoPhoneOrEmail?: boolean;
    isAgentCallIn?: boolean;
  };
}

export const Step5SendQuote: React.FC<Step5SendQuoteProps> = ({
  quote,
  onSendQuote,
  onBack,
  initialCustomerData,
}) => {
  const [hasNoPhoneOrEmail, setHasNoPhoneOrEmail] = useState(initialCustomerData?.hasNoPhoneOrEmail || false);
  const [isAgentCallIn, setIsAgentCallIn] = useState(initialCustomerData?.isAgentCallIn || false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [publishPortal, setPublishPortal] = useState(true);
  const [agentName, setAgentName] = useState('Call Center Agent');
  const [agentNotes, setAgentNotes] = useState('');

  const [firstName, setFirstName] = useState(initialCustomerData?.firstName || '');
  const [email, setEmail] = useState(initialCustomerData?.email || '');
  const [mobile, setMobile] = useState(initialCustomerData?.mobile || '');
  const [errors, setErrors] = useState<{ email?: string; mobile?: string }>({});
  const mobileInputRef = React.useRef<HTMLInputElement>(null);

  const validate = () => {
    if (hasNoPhoneOrEmail) return true;
    const newErrors: { email?: string; mobile?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneClean = mobile.replace(/[\s\-\(\)]/g, '');

    // Phone is mandatory when not in Call Center over-the-phone mode
    if (!phoneClean || phoneClean.length < 8) {
      newErrors.mobile = 'Please enter a valid Australian mobile number (e.g. 0412 345 678)';
      mobileInputRef.current?.focus();
      mobileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Email is optional, validate format only if provided
    if (email.trim() && !emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendQuoteClick = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    onSendQuote({
      firstName: firstName.trim() || (hasNoPhoneOrEmail ? 'Phone Customer' : 'Valued Customer'),
      email: hasNoPhoneOrEmail ? 'no-email-phone-order@portabox.com.au' : email.trim(),
      mobile: hasNoPhoneOrEmail ? 'No Mobile (Phone Booking)' : mobile.trim(),
      agreedToContact: !hasNoPhoneOrEmail,
      hasNoPhoneOrEmail,
      isAgentCallIn,
      channels: {
        email: sendEmail,
        sms: sendSms,
        portal: publishPortal,
      },
      agentName: isAgentCallIn ? agentName : undefined,
      agentNotes: isAgentCallIn ? agentNotes : undefined,
    });
  };

  const handleSkipToQuote = () => {
    onSendQuote({
      firstName: firstName.trim() || 'Valued Customer',
      email: email.trim() || 'quote-preview@portabox.com.au',
      mobile: mobile.trim() || '0400 000 000',
      agreedToContact: false,
    });
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      {/* Header kicker: #F7D347 Vibrant Gold with #1A1A1A text */}
      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
        STEP 8 OF 8 · INSTANT DISPATCH
      </span>

      {/* Big simple heading as requested */}
      <h1 className="text-3xl sm:text-5xl font-black text-[#15385E] tracking-tight mt-1 mb-2">
        Where do we send your quote?
      </h1>

      <p className="text-sm sm:text-base text-slate-500 max-w-xl">
        Enter your details below and your tailored quote will be ready immediately.
      </p>

      {/* Contact Form */}
      <form onSubmit={handleSendQuoteClick} noValidate className="mt-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#15385E] uppercase tracking-wider">
              Email Address {hasNoPhoneOrEmail ? <span className="text-slate-400 font-normal normal-case">(Customer has no email)</span> : <span className="text-slate-400 font-normal normal-case">(optional)</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#15385E]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={hasNoPhoneOrEmail ? '' : email}
                disabled={hasNoPhoneOrEmail}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder={hasNoPhoneOrEmail ? "Postal / Verbal Contact (No Email)" : "you@example.com.au"}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                  hasNoPhoneOrEmail
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    : errors.email
                    ? 'border-red-300 bg-red-50/40 focus:ring-red-300'
                    : 'border-[#DAD7D1] bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:ring-[#5CC1EF] focus:border-transparent'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 font-semibold">{errors.email}</p>
            )}
          </div>

          {/* Phone box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#15385E] uppercase tracking-wider">
              {hasNoPhoneOrEmail ? (
                <>Landline Phone <span className="text-slate-400 font-normal normal-case">(optional · no mobile)</span></>
              ) : (
                <>Mobile Phone <span className="text-[#5CC1EF]">*</span></>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#15385E]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                ref={mobileInputRef}
                type="tel"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (errors.mobile) setErrors((prev) => ({ ...prev, mobile: undefined }));
                }}
                placeholder={hasNoPhoneOrEmail ? "(08) 8234 5678 (optional landline)" : "0412 345 678"}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 ${
                  errors.mobile
                    ? 'border-red-300 bg-red-50/40 focus:ring-red-300'
                    : 'border-[#DAD7D1] bg-slate-50/50 hover:border-slate-300 focus:bg-white focus:ring-[#5CC1EF] focus:border-transparent'
                }`}
              />
            </div>
            {errors.mobile && (
              <p className="text-xs text-red-500 font-semibold">{errors.mobile}</p>
            )}
          </div>
        </div>

        {/* First name (optional for personalization) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-black text-[#15385E] uppercase tracking-wider">
            First Name <span className="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Sarah"
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-2xl border border-[#DAD7D1] bg-slate-50/50 hover:border-slate-300 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#5CC1EF] focus:outline-none"
          />
        </div>

        {/* What You Receive Card */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-[#DAD7D1] space-y-2 text-xs text-slate-600">
          <div className="font-black text-[#15385E] uppercase tracking-wider text-[11px]">
            What you'll see on the next page:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-medium">
            <div className="flex items-center gap-1.5 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5CC1EF] shrink-0" />
              <span>Full price breakdown</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5CC1EF] shrink-0" />
              <span>Total savings & discounts</span>
            </div>
          </div>
        </div>

        {/* 30-Day Guaranteed Price-Lock & 12-Month Rate Freeze Notice */}
        <div className="mt-4 p-3.5 rounded-2xl bg-sky-50/80 border border-[#5CC1EF]/40 flex items-center justify-between gap-3 text-xs text-[#15385E]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#00a9d7] shrink-0" />
            <div>
              <span className="font-extrabold block text-[#15385E]">30-Day Guaranteed Price Lock Included</span>
              <span className="text-slate-600 text-[11px]">Storage rates are protected under our 30-day quote lock and 12-month rate freeze upon booking. Delivery fees reflect scheduled rates for your booking.</span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-white text-[#15385E] border border-sky-200 px-2.5 py-1 rounded-full shrink-0 shadow-2xs">
            30 Days Locked
          </span>
        </div>

        {/* Validation error summary if customer clicks continue without entering mobile */}
        {errors.mobile && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errors.mobile}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                mobileInputRef.current?.focus();
                mobileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-3 py-1 bg-rose-200 text-rose-900 rounded-lg text-xs font-black hover:bg-rose-300 cursor-pointer shrink-0"
            >
              Enter Mobile
            </button>
          </div>
        )}

        {/* Navigation / Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {/* Quick Skip to Instant Quote Preview */}
            <button
              type="button"
              onClick={handleSkipToQuote}
              className="text-xs font-bold text-slate-500 hover:text-[#15385E] underline transition-colors cursor-pointer py-2"
            >
              Skip &amp; view quote directly
            </button>

            {/* CTA Continue Button: #F7D347 Vibrant Gold / Yellow with #1A1A1A text */}
            <button
              type="submit"
              onClick={(e) => handleSendQuoteClick(e)}
              className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
            >
              <span>
                {hasNoPhoneOrEmail
                  ? 'Produce Quote & Book Over Phone'
                  : isAgentCallIn
                  ? '⚡ Send Quote to Customer (Email / SMS / Portal)'
                  : 'Continue'}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
            </button>
          </div>
        </div>
      </form>

      {/* Are You Stuck Banner on Every Page */}
      <div className="mt-8">
        <AreYouStuckBanner />
      </div>
    </div>
  );
};
