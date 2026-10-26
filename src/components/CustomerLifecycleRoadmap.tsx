import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Truck,
  ShieldCheck,
  Package,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Clock,
  Phone,
  MessageCircle,
  Eye,
  Info,
} from 'lucide-react';
import { QuoteBreakdown } from '../types/quote';

export interface CustomerLifecycleRoadmapProps {
  currentStage?: 1 | 2 | 3 | 4 | 5;
  quote?: QuoteBreakdown | null;
  onOpenPlacementChecker?: () => void;
  onOpenCustomerPortal?: () => void;
  phone?: string;
  variant?: 'quote_preview' | 'portal_dashboard' | 'compact';
}

export const CustomerLifecycleRoadmap: React.FC<CustomerLifecycleRoadmapProps> = ({
  currentStage = 1,
  quote,
  onOpenPlacementChecker,
  onOpenCustomerPortal,
  phone = '1800 467 637',
  variant = 'quote_preview',
}) => {
  const [selectedStage, setSelectedStage] = useState<number>(currentStage);
  const [isExpanded, setIsExpanded] = useState<boolean>(variant !== 'compact');

  const stages = [
    {
      step: 1,
      title: 'Quote & 30-Day Lock',
      shortTitle: '1. Quote Locked',
      tagline: 'Guaranteed Rate Hold',
      status: currentStage === 1 ? 'active' : currentStage > 1 ? 'completed' : 'upcoming',
      description: 'Your monthly storage rate is protected for 30 calendar days and frozen for 12 months upon booking. Delivery fees reflect scheduled rates for your booking.',
      portaboxPromise: 'We guarantee your quoted monthly storage rate is protected. Delivery fees reflect current transport catalog rates.',
      customerAction: 'Review itemised tax invoice, share with family or partner, apply promo codes, or proceed to book.',
      guarantee: '30-Day Price Lock Guarantee',
      icon: FileText,
      badgeColor: 'bg-sky-50 text-[#15385E] border-sky-200',
    },
    {
      step: 2,
      title: 'Deposit & Reservation',
      shortTitle: '2. Reserve Unit',
      tagline: 'Depot Fleet Allocated',
      status: currentStage === 2 ? 'active' : currentStage > 2 ? 'completed' : 'upcoming',
      description: 'Secure your container and level-lift delivery vehicle from your local metro hub with a flexible deposit.',
      portaboxPromise: 'Container reserved exclusively for you at the nearest depot with guaranteed delivery window.',
      customerAction: 'Confirm delivery address, choose payment method (Card or Zero-Fee PayID), and sign simple digital agreement.',
      guarantee: 'Flexible 48-Hour Free Rescheduling',
      icon: Calendar,
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    {
      step: 3,
      title: 'Site Readiness & Pre-Flight',
      shortTitle: '3. Site Check',
      tagline: 'Zero Paver Damage',
      status: currentStage === 3 ? 'active' : currentStage > 3 ? 'completed' : 'upcoming',
      description: 'Our operations team pre-screens your driveway and access gates so delivery day is 100% stress-free.',
      portaboxPromise: 'We supply complimentary high-density poly ground pads under every container corner to safeguard concrete and pavers.',
      customerAction: 'Confirm gate width (>3.0m) and overhead clearance (3.5m). Optional: snap a photo of your driveway.',
      guarantee: '100% Fit & Surface Protection Guarantee',
      icon: ShieldCheck,
      badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    {
      step: 4,
      title: 'Level-Lift Delivery & Packing',
      shortTitle: '4. Level-Lift Delivery',
      tagline: 'Zero-Tilt Placement',
      status: currentStage === 4 ? 'active' : currentStage > 4 ? 'completed' : 'upcoming',
      description: 'Our precision level-lift vehicle places your container horizontally flat. Pack at your own pace on your driveway.',
      portaboxPromise: 'Level-lift technology keeps the container flat at all times — your fragile belongings never shift or slide.',
      customerAction: 'Pack unhurriedly with 10 free quilted moving blankets. Lock with your heavy-duty padlock and keep the keys.',
      guarantee: 'Zero-Tilt Hydraulic Placement',
      icon: Truck,
      badgeColor: 'bg-blue-50 text-blue-900 border-blue-200',
    },
    {
      step: 5,
      title: 'Depot Storage & 12-Mo Freeze',
      shortTitle: '5. Secure Storage',
      tagline: '12-Month Rate Freeze',
      status: currentStage === 5 ? 'active' : 'upcoming',
      description: 'Keep on-site or request collection to our secure, dust-free metro warehouse. Your monthly rate is frozen for 12 months.',
      portaboxPromise: 'Your monthly rate is contractually frozen for 12 full months. No surprise 60-day price hikes common in self-storage.',
      customerAction: 'Manage everything via your 24/7 Customer Portal — order extra boxes, book redelivery, or view invoices.',
      guarantee: '12-Month Legal Rate Freeze Guarantee',
      icon: Package,
      badgeColor: 'bg-purple-50 text-purple-900 border-purple-200',
    },
  ];

  const currentActiveStageData = stages.find((s) => s.step === selectedStage) || stages[0];

  return (
    <div className="bg-white rounded-3xl border-2 border-[#DAD7D1] shadow-sm p-4 sm:p-6 space-y-4 print:hidden transition-all">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5CC1EF] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-[#15385E] font-['Cabinet_Grotesk',sans-serif]">
              Customer Journey Roadmap
            </span>
            <span className="text-[10px] font-bold bg-[#F7D347] text-[#1A1A1A] px-2 py-0.5 rounded-md border border-[#e6c338]">
              From Quote to Storage
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#15385E] mt-0.5">
            Your Seamless Portabox Experience: From Quote to Secure Storage
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            We eliminate the stress of moving with clear milestones, certified guarantees, and transparent updates at every step.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#15385E]" />
            <span>{isExpanded ? 'Collapse Roadmap' : 'Explore All 5 Steps'}</span>
          </button>
        </div>
      </div>

      {/* 5-Stage Stepper Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isSelected = selectedStage === stage.step;
          const isCurrent = currentStage === stage.step;

          return (
            <button
              key={stage.step}
              type="button"
              onClick={() => setSelectedStage(stage.step)}
              className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-[#15385E] bg-[#15385E] text-white shadow-md scale-[1.02]'
                  : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 text-slate-700 hover:border-slate-300'
              }`}
            >
              {isCurrent && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7D347] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7D347]" />
                </span>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                      isSelected ? 'bg-white/20 text-[#F7D347]' : 'bg-white text-[#15385E] shadow-2xs'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      isSelected ? 'text-[#5CC1EF]' : 'text-slate-400'
                    }`}
                  >
                    Step 0{stage.step}
                  </span>
                </div>

                <div
                  className={`text-xs font-black line-clamp-1 ${
                    isSelected ? 'text-white' : 'text-[#15385E]'
                  }`}
                >
                  {stage.title}
                </div>
                <div
                  className={`text-[10px] font-medium mt-0.5 line-clamp-1 ${
                    isSelected ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {stage.tagline}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px]">
                <span
                  className={`font-bold ${
                    isSelected
                      ? 'text-[#F7D347]'
                      : isCurrent
                      ? 'text-emerald-600'
                      : 'text-slate-400'
                  }`}
                >
                  {isCurrent ? '● Current Step' : stage.step < currentStage ? '✓ Done' : 'Upcoming'}
                </span>
                <ChevronRight
                  className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-400'}`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Stage Detail Card */}
      {isExpanded && (
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-sky-50/40 to-white border border-[#5CC1EF]/30 space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#15385E] text-[#F7D347] flex items-center justify-center font-black shrink-0 shadow-xs">
                {React.createElement(currentActiveStageData.icon, { className: 'w-5 h-5' })}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#15385E] text-white px-2 py-0.5 rounded">
                    STAGE 0{currentActiveStageData.step} OF 05
                  </span>
                  <h4 className="text-base font-black text-[#15385E]">
                    {currentActiveStageData.title}
                  </h4>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    🛡️ {currentActiveStageData.guarantee}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  {currentActiveStageData.description}
                </p>
              </div>
            </div>

            {/* Quick Context Action */}
            <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
              {currentActiveStageData.step === 3 && onOpenPlacementChecker && (
                <button
                  type="button"
                  onClick={onOpenPlacementChecker}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify My Driveway Fit</span>
                </button>
              )}

              {onOpenCustomerPortal && (
                <button
                  type="button"
                  onClick={onOpenCustomerPortal}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#15385E] font-bold text-xs border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-[#5CC1EF]" />
                  <span>Open Customer Portal</span>
                </button>
              )}
            </div>
          </div>

          {/* CRM Two-Column Transparency Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#15385E] uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>What Portabox Does For You:</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-5">
                {currentActiveStageData.portaboxPromise}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#15385E] uppercase tracking-wider">
                <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                <span>What You Need To Do:</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-5">
                {currentActiveStageData.customerAction}
              </p>
            </div>
          </div>

          {/* Bottom Trust Sign-off */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#F7D347]" />
              <span>
                Backed by Portabox Australia's <strong>Zero-Surprise Customer Charter</strong>. No cancellation fees with 48h notice.
              </span>
            </div>
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="text-[#15385E] hover:underline font-bold flex items-center gap-1 self-start sm:self-auto"
            >
              <Phone className="w-3 h-3 text-[#5CC1EF]" />
              <span>Questions? Call our local team on {phone}</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
