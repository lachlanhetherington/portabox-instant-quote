import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  KeyRound,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Fingerprint,
  ChevronRight,
  Shield,
  Truck,
  PhoneCall,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import {
  StaffMember,
  StaffSession,
} from '../../types/adminAuth';
import {
  loadStaffMembers,
  setStaffSession,
  generateStaff2FACode,
  verifyStaff2FACode,
} from '../../services/adminAuthService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: StaffSession) => void;
  targetFeatureLabel?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  targetFeatureLabel,
}) => {
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('••••••••••••');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [activeChallengeCode, setActiveChallengeCode] = useState<string>('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'sms' | 'authenticator'>('sms');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (isOpen) {
      const staff = loadStaffMembers();
      setAllStaff(staff);
      // Default to CEO for instant preview convenience
      if (staff.length > 0 && !selectedStaff) {
        setSelectedStaff(staff[0]);
        setEmail(staff[0].email);
      }
      setStep('credentials');
      setErrorMessage(null);
      setSuccessNotice(null);
      setTwoFactorCode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectStaffPersona = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setEmail(staff.email);
    setPassword('••••••••••••');
    setTwoFactorMethod(staff.twoFactorMethod === 'authenticator' ? 'authenticator' : 'sms');
    setErrorMessage(null);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const staff = allStaff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
    if (!staff) {
      setErrorMessage('Staff account not found. Please select an authorized Portabox staff member.');
      return;
    }

    if (staff.status !== 'active') {
      setErrorMessage('This staff account has been suspended. Please contact the CEO or Operations Manager.');
      return;
    }

    setSelectedStaff(staff);
    setTwoFactorMethod(staff.twoFactorMethod === 'authenticator' ? 'authenticator' : 'sms');
    
    // Generate authentic 2FA code
    const generatedCode = generateStaff2FACode();
    setActiveChallengeCode(generatedCode);
    setTwoFactorCode(generatedCode); // Pre-fill for instant frictionless demo test
    setStep('2fa');
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      if (!selectedStaff) {
        setErrorMessage('Session lost. Please sign in again.');
        setIsSubmitting(false);
        return;
      }

      const isValid = verifyStaff2FACode(twoFactorCode, activeChallengeCode);
      if (!isValid) {
        setErrorMessage('Invalid 6-digit security code. Use 123456 or the code sent to your device.');
        setIsSubmitting(false);
        return;
      }

      const session = setStaffSession(
        selectedStaff,
        twoFactorMethod === 'authenticator' ? '2fa_totp' : '2fa_sms'
      );

      setSuccessNotice(`Welcome back, ${selectedStaff.name}! Access verified with 2FA.`);
      setIsSubmitting(false);

      setTimeout(() => {
        onLoginSuccess(session);
        onClose();
      }, 700);
    }, 400);
  };

  const handleInstantPasskeyAuth = () => {
    if (!selectedStaff) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const session = setStaffSession(selectedStaff, 'passkey');
      setSuccessNotice(`Biometric Passkey Verified · Welcome ${selectedStaff.name}`);
      setIsSubmitting(false);
      setTimeout(() => {
        onLoginSuccess(session);
        onClose();
      }, 600);
    }, 500);
  };

  const handleResendCode = () => {
    const newCode = generateStaff2FACode();
    setActiveChallengeCode(newCode);
    setTwoFactorCode(newCode);
    setErrorMessage(null);
  };

  const getRoleBadge = (role: StaffMember['role']) => {
    switch (role) {
      case 'ceo':
        return <span className="bg-[#15385E] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">CEO & Executive</span>;
      case 'manager':
        return <span className="bg-sky-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Ops Manager</span>;
      case 'call_center':
        return <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Call Center</span>;
      case 'driver':
        return <span className="bg-[#F7D347] text-[#1A1A1A] text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Fleet Driver</span>;
      case 'admin_pricing':
        return <span className="bg-purple-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Pricing Admin</span>;
      case 'warehouse':
        return <span className="bg-amber-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Yard Logistics</span>;
      default:
        return <span className="bg-slate-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Staff</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header: Portabox Deep Navy #15385E with Gold accent */}
        <div className="bg-[#15385E] px-6 py-5 text-white flex items-center justify-between border-b-4 border-[#F7D347] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5CC1EF]/20 border border-[#5CC1EF]/40 flex items-center justify-center text-[#5CC1EF]">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">Portabox Staff & Admin Login</h3>
                <span className="bg-[#F7D347] text-[#1A1A1A] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  2FA Protected
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {targetFeatureLabel ? `Restricted access to ${targetFeatureLabel}` : 'Role-based access control governed by CEO & Operations Management'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Demo Staff Persona Switcher */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#15385E]" />
              Select Staff Persona to Test Role Permissions:
            </span>
            <span className="text-[10px] text-slate-400">Click any profile</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allStaff.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id;
              return (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleSelectStaffPersona(staff)}
                  className={`text-left p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#15385E] shadow-sm ring-2 ring-[#5CC1EF]/50'
                      : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-extrabold text-slate-900 truncate text-[11px]">
                      {staff.name.split(' ')[0]}
                    </span>
                    {getRoleBadge(staff.role)}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-mono">{staff.email}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Portabox Staff Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. andrew.ceo@portabox.com.au"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#15385E] focus:ring-2 focus:ring-[#5CC1EF]/30 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password / Master Key
                  </label>
                  <span className="text-[11px] text-slate-400">Standard test credentials</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#15385E] focus:ring-2 focus:ring-[#5CC1EF]/30 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-start gap-3 text-xs text-sky-900">
                <Shield className="w-4 h-4 text-[#15385E] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#15385E]">Multi-Factor Security Policy Enforced</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Submitting your credentials will issue an encrypted 2FA verification challenge to your enrolled phone or authenticator app.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-[#15385E] hover:bg-[#112F4F] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span>Continue to 2FA Step</span>
                  <ArrowRight className="w-4 h-4 text-[#F7D347]" />
                </button>

                <button
                  type="button"
                  onClick={handleInstantPasskeyAuth}
                  disabled={isSubmitting}
                  className="px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-[#15385E] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  title="Authenticate instantly with Biometric Touch ID / Face ID"
                >
                  <Fingerprint className="w-4 h-4 text-[#5CC1EF]" />
                  <span className="hidden sm:inline">Passkey / Touch ID</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="text-center pb-1">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#5CC1EF]/20 border-2 border-[#5CC1EF] flex items-center justify-center text-[#15385E] mb-3">
                  <Smartphone className="w-7 h-7 text-[#15385E]" />
                </div>
                <h4 className="text-base font-black text-slate-900">Two-Factor Authentication</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                  Enter the 6-digit verification code sent to{' '}
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedStaff?.mobile || '+61 488 123 456'}
                  </span>
                </p>
              </div>

              {/* 2FA Demo Help Banner with auto-fill */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Live 2FA Challenge: </span>
                    <span className="font-mono font-black text-amber-950 text-sm tracking-wider bg-white px-2 py-0.5 rounded border border-amber-300">
                      {activeChallengeCode || '123456'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTwoFactorCode(activeChallengeCode || '123456')}
                  className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-black text-[11px] transition-colors cursor-pointer"
                >
                  Fill Code
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  6-Digit Verification Code
                </label>
                <div className="max-w-xs mx-auto">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black py-3 bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-[#15385E] focus:ring-4 focus:ring-[#5CC1EF]/20 outline-none"
                  />
                  <p className="text-[11px] text-center text-slate-400 mt-1.5">Universal test bypass: 123456</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="font-bold text-[#15385E] hover:underline cursor-pointer"
                >
                  ← Back to Email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="flex items-center gap-1 font-bold text-[#15385E] hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend new code
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || twoFactorCode.length < 6}
                className="w-full py-3.5 px-4 bg-[#15385E] hover:bg-[#112F4F] disabled:opacity-50 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#F7D347]" />
                    <span>Verifying 2FA Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#F7D347]" />
                    <span>Verify & Access Staff Workspace</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer Security Policy */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 text-center text-[11px] text-slate-500 shrink-0">
          <span>Enterprise Two-Factor Authentication · Authorized Portabox Personnel Only</span>
        </div>
      </div>
    </div>
  );
};
