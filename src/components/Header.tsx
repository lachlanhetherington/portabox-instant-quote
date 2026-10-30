import React, { useState } from 'react';
import {
  Phone,
  PhoneCall,
  ChevronLeft,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Calendar,
  Truck,
  Calculator,
  Compass,
  Lock,
  LogOut,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { StaffSession } from '../types/adminAuth';
import { hasStaffPermission, canManageStaffPermissions } from '../services/adminAuthService';

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
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onBack,
  isAdminOpen,
  onToggleAdmin,
  isCallCenterOpen = false,
  onToggleCallCenter,
  onOpenCustomerPortal,
  onOpenDriverPortal,
  onOpenTelephony,
  onOpenSpaceCalculator,
  onOpenPlacementChecker,
  onOpenCoverageMap,
  onOpenStaffLogin,
  onStaffLogout,
  onOpenStaffPermissions,
  staffSession,
  phone = '1800 467 637',
  promoBannerSlogan,
  showPromoBanner = true,
  lockBannerOnScroll = true,
}) => {
  const isBannerVisible = showPromoBanner && (promoBannerSlogan === undefined || promoBannerSlogan.trim().length > 0);
  const isLocked = lockBannerOnScroll !== false;
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);

  const currentUser = staffSession?.user;
  const canAccessDriver = hasStaffPermission(currentUser, 'driver_portal');
  const canAccessDispatch = hasStaffPermission(currentUser, 'dispatch_calendar');
  const canAccessSoftphone = hasStaffPermission(currentUser, 'softphone_telephony');
  const canAccessPricing = hasStaffPermission(currentUser, 'pricing_and_rates');
  const canManageAccess = canManageStaffPermissions(currentUser);

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'ceo':
        return 'bg-[#15385E] text-white border-white/20';
      case 'manager':
        return 'bg-sky-700 text-white border-white/20';
      case 'call_center':
        return 'bg-emerald-700 text-white border-white/20';
      case 'driver':
        return 'bg-[#F7D347] text-[#1A1A1A] border-[#e6c338] font-black';
      case 'admin_pricing':
        return 'bg-purple-700 text-white border-white/20';
      default:
        return 'bg-slate-700 text-white border-white/20';
    }
  };

  return (
    <header className={`w-full transition-all ${isLocked ? 'sticky top-0 z-40 shadow-sm' : 'relative z-30 shadow-xs'}`}>
      {/* Promo Banner: #F7D347 Vibrant Gold / Yellow with #1A1A1A Soft Black / Charcoal Text */}
      {isBannerVisible && (
        <div className="w-full bg-[#F7D347] text-[#1A1A1A] py-1.5 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 text-xs font-extrabold border-b border-[#e5c235]">
          <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <span className="truncate text-xs tracking-tight">
                {promoBannerSlogan?.trim() || 'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE'}
              </span>
            </div>
            {staffSession && (
              <div className="hidden md:flex items-center gap-2 text-[11px] font-bold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Staff Mode Active · 2FA Verified ({staffSession.user.name})</span>
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

            {/* Customer Portal (Public / Client Facing) */}
            <button
              onClick={onOpenCustomerPortal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-white/80 bg-white hover:bg-sky-50 text-[#15385E] transition-all cursor-pointer shadow-2xs"
              title="Log in to view active containers, delivery times, quotes, and billing"
            >
              <User className="w-3.5 h-3.5 text-[#15385E]" />
              <span className="hidden sm:inline font-bold">Customer Portal</span>
              <span className="sm:hidden font-bold">Portal</span>
            </button>

            {/* ================= RBAC STAFF OPERATIONS DOCK ================= */}
            {!staffSession ? (
              /* Public / Unauthenticated: Single Secure Staff Login Button */
              <button
                onClick={onOpenStaffLogin}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-[#15385E]/30 bg-[#15385E] hover:bg-[#112F4F] text-white transition-all cursor-pointer shadow-xs active:scale-95"
                title="Portabox Staff Access — Driver, Dispatch, Softphone & Admin Login (2FA Protected)"
              >
                <Lock className="w-3.5 h-3.5 text-[#F7D347]" />
                <span className="hidden sm:inline font-bold">Staff Access</span>
                <span className="sm:hidden font-bold">Staff</span>
              </button>
            ) : (
              /* Authenticated Staff User: Display Authorized Quick Action Buttons */
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 1. Driver Portal (if permitted) */}
                {canAccessDriver && onOpenDriverPortal && (
                  <button
                    onClick={onOpenDriverPortal}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-full border border-[#e6c338] bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Driver Portal — Run sheets & container QR scanning"
                  >
                    <Truck className="w-3.5 h-3.5 text-[#15385E]" />
                    <span className="hidden lg:inline font-black">Driver Portal</span>
                    <span className="lg:hidden font-black">Driver</span>
                  </button>
                )}

                {/* 2. Call Center Dispatch (if permitted) */}
                {canAccessDispatch && onToggleCallCenter && (
                  <button
                    onClick={onToggleCallCenter}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer shadow-2xs ${
                      isCallCenterOpen
                        ? 'bg-[#15385E] text-white border-[#15385E] shadow-xs'
                        : 'bg-white text-[#15385E] border-white/80 hover:bg-sky-50'
                    }`}
                    title="Call Center Fleet Dispatch Calendar & Routing"
                  >
                    <Calendar className={`w-3.5 h-3.5 ${isCallCenterOpen ? 'text-[#F7D347]' : 'text-[#15385E]'}`} />
                    <span className="hidden md:inline font-bold">Dispatch</span>
                    <span className="md:hidden font-bold">Dispatch</span>
                  </button>
                )}

                {/* 3. Call Center Softphone (if permitted) */}
                {canAccessSoftphone && onOpenTelephony && (
                  <button
                    onClick={onOpenTelephony}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border border-white/80 bg-white hover:bg-sky-50 text-[#15385E] transition-all cursor-pointer shadow-2xs"
                    title="Twilio Softphone Dialer & Telephony Hub"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-[#15385E]" />
                    <span className="hidden xl:inline font-bold">Softphone</span>
                    <span className="xl:hidden font-bold">Phone</span>
                  </button>
                )}

                {/* 4. Admin & Pricing Matrix (if permitted) */}
                {canAccessPricing && (
                  <button
                    onClick={onToggleAdmin}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                      isAdminOpen
                        ? 'bg-[#15385E] text-white border-[#15385E] shadow-xs'
                        : 'bg-white text-[#15385E] border-white/80 hover:bg-sky-50'
                    }`}
                    title="Admin & Pricing Matrix"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#15385E]" />
                    <span className="hidden sm:inline font-bold">{isAdminOpen ? 'Close' : 'Admin'}</span>
                  </button>
                )}

                {/* Staff Identity Pill with 2FA Indicator & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
                    className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 bg-[#15385E] hover:bg-[#112F4F] text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer border border-[#112F4F]"
                    title="Portabox Staff Session Details"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-2xs" />
                    <span className="max-w-[90px] sm:max-w-[130px] truncate font-extrabold text-[11px]">
                      {staffSession.user.name.split(' ')[0]}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-black ${getRoleBadgeStyle(staffSession.user.role)}`}>
                      {staffSession.user.role}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-300" />
                  </button>

                  {/* Dropdown Menu */}
                  {isStaffMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-fade-in text-slate-800">
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                        <div className="font-extrabold text-xs text-slate-900">{staffSession.user.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">{staffSession.user.email}</div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getRoleBadgeStyle(staffSession.user.role)}`}>
                            {staffSession.user.title}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            2FA Verified
                          </span>
                        </div>
                      </div>

                      <div className="py-1 text-xs">
                        {canManageAccess && onOpenStaffPermissions && (
                          <button
                            onClick={() => {
                              setIsStaffMenuOpen(false);
                              onOpenStaffPermissions();
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 font-bold text-[#15385E] flex items-center gap-2 cursor-pointer"
                          >
                            <Shield className="w-4 h-4 text-[#F7D347]" />
                            <span>Staff Permissions Matrix</span>
                          </button>
                        )}

                        <div className="px-4 py-1.5 text-[10px] uppercase font-bold text-slate-400">
                          Authorized Permissions:
                        </div>
                        <div className="px-4 pb-2 flex flex-wrap gap-1">
                          {canAccessPricing && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Pricing</span>}
                          {canAccessDispatch && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Dispatch</span>}
                          {canAccessSoftphone && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Softphone</span>}
                          {canAccessDriver && <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Driver</span>}
                          {canManageAccess && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Governance</span>}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            setIsStaffMenuOpen(false);
                            onStaffLogout();
                          }}
                          className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Lock Session / Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phone Call Button: #15385E Deep Navy Blue with #FFFFFF Pure White Text */}
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-[#15385E] hover:bg-[#112F4F] text-white rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-xs transition-colors cursor-pointer border border-[#112F4F]"
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" />
              <span className="hidden xs:inline sm:inline whitespace-nowrap font-mono font-bold text-white">{phone}</span>
              <span className="xs:hidden text-[11px] font-bold text-white">Call</span>
            </a>
          </div>
        </div>

        {/* Progress Bar: #F7D347 Vibrant Gold / Yellow */}
        {!isAdminOpen && !isCallCenterOpen && (
          <div className="w-full bg-[#44aee2]/40 h-1.5 relative overflow-hidden">
            <div
              className="h-full bg-[#F7D347] transition-all duration-300 ease-out shadow-xs"
              style={{ width: `${Math.min(100, Math.round((currentStep / 8) * 100))}%` }}
            />
          </div>
        )}
      </div>
    </header>
  );
};
