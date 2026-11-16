import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Check,
  Info,
  Lock,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { AppConfig, ContainerSizeId, ProtectionPlanType } from '../types/quote';
import { PostcodeRecord } from '../data/australianPostcodes';
import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step7ProtectionProps {
  originPostcode?: PostcodeRecord | null;
  destinationPostcode?: PostcodeRecord | null;
  serviceType: string;
  storagePlacement?: 'my_place' | 'facility';
  containerCount: number;
  containerSize?: ContainerSizeId;
  protectionPlan: ProtectionPlanType;
  onChangeProtectionPlan: (plan: ProtectionPlanType) => void;
  isInterstate?: boolean;
  config: AppConfig;
  onContinue: () => void;
  onBack: () => void;
}

export const Step7Protection: React.FC<Step7ProtectionProps> = ({
  originPostcode,
  destinationPostcode,
  serviceType,
  storagePlacement,
  containerCount = 1,
  protectionPlan,
  onChangeProtectionPlan,
  isInterstate = false,
  config,
  onContinue,
  onBack,
}) => {
  const isOnsite =
    serviceType === 'storage_at_place' ||
    (serviceType !== 'moving' && serviceType !== 'moving_storage' && storagePlacement === 'my_place');

  const cpoMonthlyRate = config.insurance?.monthlyPricePerContainer ?? 15;
  const cooMonthlyRate = config.insurance?.cooMonthlyPricePerContainer ?? 10;
  const maxCpoCoveragePerContainer = config.insurance?.coverageAmountPerContainer ?? 5000;
  const totalCpoCoverage = maxCpoCoveragePerContainer * containerCount;
  const totalCpoMonthly = cpoMonthlyRate * containerCount;
  const totalCooMonthly = cooMonthlyRate * containerCount;
  const isFreePromo = Boolean(config.insurance?.isFreePromo);

  // Interstate moves strictly require CPO
  const isCpoMandatory = Boolean(isInterstate);

  // CPO (contents) and COO (container) are separate choices and can be taken together
  const cpoOn = protectionPlan === 'cpo' || protectionPlan === 'cpo_coo';
  const cooOn = protectionPlan === 'coo' || protectionPlan === 'cpo_coo';
  const setPlan = (cpo: boolean, coo: boolean) =>
    onChangeProtectionPlan(cpo && coo ? 'cpo_coo' : cpo ? 'cpo' : coo ? 'coo' : 'none');

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      {/* Title & Introduction */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-[#5CC1EF]/20 text-[#15385E] px-2.5 py-1 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-[#15385E]" />
          <span>Step 7 · Protection Options</span>
        </span>
        {isCpoMandatory && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Mandatory for Interstate Transit</span>
          </span>
        )}
      </div>

      <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mb-2">
        Container &amp; Contents Protection
      </h1>

      <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-3xl leading-relaxed">
        Portabox containers are built from heavy-duty weatherproof galvanised steel with secure lockboxes.
      </p>

      {/* Interstate Mandatory Banner */}
      {isCpoMandatory && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300/80 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-bold">
              <ShieldAlert className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-amber-950">
                Interstate Move Requirement: CPO is Automatically Selected
              </h4>
              <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                Under Portabox interstate transport regulations, all containers moving interstate must have the <strong>Contents Protection Option (CPO)</strong> applied (up to $5,000 cover per container). This cannot be deselected.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-black uppercase bg-amber-200 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-md">
            Mandatory
          </span>
        </div>
      )}

      {/* Protection Options Grid */}
      <div className="space-y-4 mb-8">
        {/* OPTION 1: CPO (Contents Protection Option) */}
        <div
          onClick={() => {
            // Interstate: CPO is required and locked on. Otherwise clicking toggles it on/off.
            if (isCpoMandatory) return;
            setPlan(!cpoOn, cooOn);
          }}
          className={`relative p-5 sm:p-6 rounded-3xl border-2 transition-all ${
            isCpoMandatory
              ? 'border-slate-300 bg-slate-50 opacity-80 cursor-not-allowed'
              : cpoOn
              ? 'border-[#15385E] bg-sky-50/30 ring-2 ring-[#5CC1EF]/40 shadow-xs cursor-pointer'
              : 'border-slate-200 hover:border-sky-300 bg-white cursor-pointer'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1">
              {/* Radio Indicator */}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  cpoOn
                    ? 'border-[#15385E] bg-[#15385E] text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {cpoOn && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-[#15385E] tracking-tight">
                    1. CPO · Contents Protection Option
                  </h3>
                  {isCpoMandatory && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                      REQUIRED
                    </span>
                  )}
                  {isFreePromo && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md">
                      FREE PROMOTION
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Covers <strong>your contents only</strong> against loss or damage up to <strong>${maxCpoCoveragePerContainer.toLocaleString()} per container</strong> (total ${totalCpoCoverage.toLocaleString()} across {containerCount} {containerCount > 1 ? 'containers' : 'container'}). Applied per container. CPO does not cover the container itself.
                </p>

                {/* Key Inclusions Bullet List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span>Contents covered up to <strong>${maxCpoCoveragePerContainer.toLocaleString()}</strong> / container</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span>Fire, water, storm &amp; collision protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span>Road transit &amp; depot storage protection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Tag */}
            <div className="text-left sm:text-right shrink-0 pl-9 sm:pl-0">
              {isFreePromo ? (
                <div>
                  <div className="font-mono text-lg sm:text-xl font-black text-emerald-700">
                    $0 Free
                  </div>
                  <span className="block text-[11px] text-slate-400 line-through">
                    ${cpoMonthlyRate}/container/mo
                  </span>
                </div>
              ) : (
                <div>
                  <div className="font-mono text-lg sm:text-xl font-black text-[#15385E]">
                    ${totalCpoMonthly} <span className="text-xs font-bold text-slate-500">/month</span>
                  </div>
                  <span className="block text-[11px] text-slate-500">
                    ${cpoMonthlyRate}/container × {containerCount} {containerCount > 1 ? 'containers' : 'container'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OPTION 2: COO (Container Only Option) - every booking, can be added to CPO */}
        {(
          <div
            onClick={() => {
              setPlan(cpoOn, !cooOn);
            }}
            className={`relative p-5 sm:p-6 rounded-3xl border-2 transition-all ${
              cooOn
                ? 'border-[#15385E] bg-sky-50/30 ring-2 ring-[#5CC1EF]/40 shadow-xs cursor-pointer'
                : 'border-slate-200 hover:border-sky-300 bg-white cursor-pointer'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 flex-1">
                {/* Radio Indicator */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    cooOn
                      ? 'border-[#15385E] bg-[#15385E] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {cooOn && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-[#15385E] tracking-tight">
                      2. COO · Container Only Option
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-md">
                      Can be added to CPO
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    Covers <strong>only loss or damage to the Portabox container</strong>. <strong className="text-amber-800">Important: COO does NOT cover contents</strong> stored inside the container.
                  </p>

                  {/* Clarification Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                      <span>Full container accidental damage waiver</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-black">✕</span>
                      </span>
                      <span className="text-rose-800 font-semibold">Contents inside are NOT covered ($0 cover)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Tag */}
              <div className="text-left sm:text-right shrink-0 pl-9 sm:pl-0">
                <div className="font-mono text-lg sm:text-xl font-black text-[#15385E]">
                  ${totalCooMonthly} <span className="text-xs font-bold text-slate-500">/month</span>
                </div>
                <span className="block text-[11px] text-slate-500">
                  ${cooMonthlyRate}/container × {containerCount} {containerCount > 1 ? 'containers' : 'container'}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Website Terms & PDS Reference Box */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 mb-8">
        <div className="flex items-start sm:items-center gap-2.5">
          <Info className="w-4 h-4 text-[#15385E] shrink-0 mt-0.5 sm:mt-0" />
          <span>
            For detailed terms, conditions, exclusions, excess amounts, and Product Disclosure Statement (PDS), please see our website at{' '}
            <a
              href="https://www.portabox.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#15385E] hover:text-[#5CC1EF] font-bold underline inline-flex items-center gap-1"
            >
              www.portabox.au
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          </span>
        </div>
      </div>

      {/* Are You Stuck Banner */}
      <div className="mt-4">
        <AreYouStuckBanner originPostcode={originPostcode} config={config} />
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* CTA Continue Button: #F7D347 Vibrant Gold with #1A1A1A text */}
        <button
          onClick={onContinue}
          className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
        </button>
      </div>
    </div>
  );
};
