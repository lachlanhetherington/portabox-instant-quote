import React from 'react';
import { AlertCircle, X, ArrowLeft, ArrowRight } from 'lucide-react';

interface CancelQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  websiteUrl?: string;
}

export const CancelQuoteModal: React.FC<CancelQuoteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  websiteUrl = (import.meta.env.VITE_SITE_URL as string) || 'https://portabox-website-ten.vercel.app/',
}) => {
  if (!isOpen) return null;

  const handleConfirmRedirect = () => {
    onConfirm();
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = websiteUrl;
      } else {
        window.location.href = websiteUrl;
      }
    } catch {
      window.location.href = websiteUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Heading */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <AlertCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3
              id="cancel-modal-title"
              className="text-lg sm:text-xl font-extrabold text-[#0b2942] tracking-tight"
            >
              Are you sure you want to cancel this quote?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Any details or container options you've selected will not be saved. You will return to the main Portabox website.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
          >
            Keep Quoting
          </button>

          <button
            type="button"
            onClick={handleConfirmRedirect}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold text-xs sm:text-sm transition-all cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-1.5"
          >
            <span>Confirm</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
