import React from 'react';
import {
  Phone,
  ChevronLeft,
  User,
  Calculator,
  Compass,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { StaffSession } from '../types/adminAuth';

interface HeaderProps {
  currentStep: number;
  onBack?: () => void;
  isAdminOpen: boolean;
  onToggleAdmin: () => void;
  isCallCenterOpen?: boolean;
  onToggleCallCenter?: () => void;
  onOpenCustomerPortal: () => void;
  onOpenDriverPortal?: () => void;
  onOpenTelephony?: () => void;
  onOpenSpaceCalculator?: () => void;
  onOpenPlacementChecker?: () => void;
  onOpenCoverageMap?: () => void;
  onOpenStaffLogin: () => void;
  onStaffLogout: () => void;
  onOpenStaffPermissions?: () => void;
  staffSession: StaffSession | null;
  phone?: string;
  promoBannerSlogan?: string;
  showPromoBanner?: boolean;
  lockBannerOnScroll?: boolean;
  enableCustomerPortal?: boolean;
  enableHeaderCallButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onBack,
  isAdminOpen,
  isCallCenterOpen = false,
  onOpenCustomerPortal,
  onOpenSpaceCalculator,
  onOpenCoverageMap,
  phone = '1800 467 637',
  promoBannerSlogan,
  showPromoBanner = true,
  lockBannerOnScroll = true,
  enableCustomerPortal = false,
  enableHeaderCallButton = false,
  staffSession,
}) => {
  const isBannerVisible = showPromoBanner && (promoBannerSlogan === undefined || promoBannerSlogan.trim().length > 0);
  const isLocked = lockBannerOnScroll !== false;

  return (
    <header className={`w-full transition-all ${isLocked ? 'sticky top-0 z-40 shadow-sm' : 'relative z-30 shadow-xs'}`}>
      {/* Promo Banner: #F7D347 Vibrant Gold / Yellow with #1A1A1A Soft Black / Charcoal Text */}
      {isBannerVisible && (
        <div className="w-full bg-[#F7D347] text-[#1A1A1A] py-1.5 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 text-xs font-black border-b border-[#e5c235] shadow-xs select-none">
          <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15385E] shrink-0 animate-pulse" />
              <span className="truncate text-xs font-black tracking-wide uppercase">
                {promoBannerSlogan?.trim() || 'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE'}
              </span>
            </div>

            {staffSession && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/10 text-[#15385E] text-[10px] font-black uppercase tracking-wider border border-black/10 shrink-0">
                <ShieldCheck className="w-3 h-3 text-[#15385E]" />
                <span>CEO Authorized Staff · {staffSession.user.name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Navbar: #5CC1EF Bright Sky Blue / Cyan */}
      <div className="w-full bg-[#5CC1EF] border-b border-[#44aee2]/80 backdrop-blur-md">
        <div className="w-full max-w-[1920px] mx-auto py-2 sm:py-3 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 flex items-center justify-between">
          {/* Left: Back button (if past step 1 and not in admin mode) */}
          <div className="w-14 sm:w-24 flex items-center">
            {!isAdminOpen && !isCallCenterOpen ? (
              <button
                onClick={onBack}
                aria-label={currentStep > 1 ? 'Previous step' : 'Back to the Portabox website'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white shadow-xs border border-white/60 flex items-center justify-center text-[#15385E] hover:bg-sky-50 transition-all cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5] text-[#15385E]" />
              </button>
            ) : (
              <div className="w-9 sm:w-10" />
            )}
          </div>

          {/* Center: Brand Logo - "porta" in #15385E Deep Navy Blue & "box" in #FFFFFF Pure White */}
          <div className="flex flex-col items-center select-none">
            <div className="flex items-center tracking-tight leading-none font-['Cabinet_Grotesk',sans-serif] transition-transform hover:scale-[1.02]">
              <span
                data-no-translate="true"
                className="font-black text-2xl sm:text-3xl text-[#15385E]"
              >
                porta
              </span>
              <span
                data-no-translate="true"
                className="font-black text-2xl sm:text-3xl text-[#FFFFFF] drop-shadow-xs"
              >
                box
              </span>
            </div>
            <span className="text-[7px] sm:text-[8px] font-extrabold tracking-widest text-[#15385E] uppercase mt-0.5 whitespace-nowrap opacity-90">
              MOVING AND STORAGE CONTAINERS
            </span>
          </div>

          {/* Right: Actions, Staff Controls & Phone */}
          <div className="w-auto flex items-center gap-1.5 sm:gap-2 justify-end">
            <LanguageSelector currentStep={currentStep} />

            {/* Public Utility Modals */}
            {onOpenSpaceCalculator && (
              <button
                onClick={onOpenSpaceCalculator}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-white/80 bg-white hover:bg-sky-50 text-[#15385E] transition-all cursor-pointer shadow-2xs"
                title="Interactive Room by Room Container Space Calculator"
              >
                <Calculator className="w-3.5 h-3.5 text-[#15385E]" />
                <span className="font-bold">Space Calculator</span>
              </button>
            )}

            {onOpenCoverageMap && (
              <button
                onClick={onOpenCoverageMap}
                className="hidden xl:flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-white/80 bg-white hover:bg-sky-50 text-[#15385E] transition-all cursor-pointer shadow-2xs"
                title="View Portabox Coverage Areas Map"
              >
                <Compass className="w-3.5 h-3.5 text-[#15385E]" />
                <span className="font-bold">Coverage Map</span>
              </button>
            )}

            {/* Customer Portal (Behind feature flag, off by default) */}
            {enableCustomerPortal && (
              <button
                onClick={onOpenCustomerPortal}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-white/80 bg-white hover:bg-sky-50 text-[#15385E] transition-all cursor-pointer shadow-2xs"
                title="Log in to view active containers, delivery times, quotes, and billing"
              >
                <User className="w-3.5 h-3.5 text-[#15385E]" />
                <span className="hidden sm:inline font-bold">Customer Portal</span>
                <span className="sm:hidden font-bold">Portal</span>
              </button>
            )}

            {/* Phone Number Display: Inactive by default (only shows number), clickable when enableHeaderCallButton is true */}
            {enableHeaderCallButton ? (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[#15385E] hover:bg-[#112F4F] text-white rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-xs transition-colors cursor-pointer border border-[#112F4F]"
                title={`Call Portabox: ${phone}`}
              >
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" />
                <span className="hidden xs:inline sm:inline whitespace-nowrap font-mono font-bold text-white">{phone}</span>
                <span className="xs:hidden text-[11px] font-bold text-white">Call</span>
              </a>
            ) : (
              <div
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[#15385E] text-white rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-xs border border-[#112F4F] select-all cursor-default"
                title={`Portabox Customer Care: ${phone} (Direct dialing disabled)`}
              >
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80 shrink-0" />
                <span className="whitespace-nowrap font-mono font-bold text-white tracking-wide">{phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar: #F7D347 Vibrant Gold / Yellow */}
        {!isAdminOpen && !isCallCenterOpen && (
          <div className="w-full bg-[#44aee2]/40 h-1.5 relative overflow-hidden">
            <div
              className="h-full bg-[#F7D347] transition-all duration-300 ease-out shadow-xs"
              style={{ width: `${Math.min(100, Math.round((currentStep / 9) * 100))}%` }}
            />
          </div>
        )}
      </div>
    </header>
  );
};
