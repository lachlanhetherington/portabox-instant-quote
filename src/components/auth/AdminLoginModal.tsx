import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, X, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { StaffSession } from '../../types/adminAuth';
import { googleSignIn } from '../../services/firebaseService';
import { completeStaffLogin, sendStaffSignInLink } from '../../services/staffLogin';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: StaffSession) => void;
  targetFeatureLabel?: string;
}

/**
 * Staff sign-in. Identity is proven by Google/Firebase; the server decides
 * whether the account is staff and which role it has (GET /api/auth/me).
 * Nothing in the browser is trusted to grant access.
 */
export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  targetFeatureLabel,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);

  if (!isOpen) return null;

  // Start fresh each time the box is opened, so a sent link never leaves it stuck.
  const resetAndClose = () => {
    setErrorMessage(null);
    setLinkSentTo(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await googleSignIn();
      if (!result) throw new Error('Google sign-in was cancelled.');
      const session = await completeStaffLogin(result.user, 'google');
      onLoginSuccess(session);
      resetAndClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await sendStaffSignInLink(email);
      setLinkSentTo(email.trim());
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send the sign-in link. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#15385E] px-6 py-5 flex items-start justify-between text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#5CC1EF]" />
            <div>
              <h2 className="text-base font-black">Portabox Staff Sign-in</h2>
              {targetFeatureLabel && (
                <p className="text-xs text-slate-300 mt-0.5">Required for: {targetFeatureLabel}</p>
              )}
            </div>
          </div>
          <button onClick={resetAndClose} aria-label="Close" className="p-1 rounded hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
          {linkSentTo ? (
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  If {linkSentTo} is a staff address, a sign-in link is on its way. Open it on this device to finish
                  signing in. Not there after a few minutes? Check your junk folder.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setLinkSentTo(null);
                }}
                className="text-xs font-semibold text-[#15385E] hover:underline underline-offset-4"
              >
                Send again or use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendLink} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Work email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourcompany.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:border-[#15385E] outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#15385E] hover:bg-[#0f2a47] disabled:opacity-60 text-white text-sm font-bold rounded-xl"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Email me a sign-in link
              </button>
            </form>
          )}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 uppercase tracking-wider">
            <span className="flex-1 h-px bg-slate-200" />or<span className="flex-1 h-px bg-slate-200" />
          </div>
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-800 text-sm font-bold rounded-xl"
          >
            <ShieldCheck className="w-4 h-4" />
            Sign in with Google
          </button>
          <p className="text-[11px] text-slate-500">Access and role are verified by the server.</p>
        </div>
      </div>
    </div>
  );
};
