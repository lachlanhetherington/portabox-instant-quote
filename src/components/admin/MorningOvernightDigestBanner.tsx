import React, { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  ArrowRight,
  X,
  PhoneCall,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  AgentAlertItem,
  loadAgentAlerts,
  subscribeToAgentAlerts,
  isMorningDigestDismissedToday,
  dismissMorningDigestToday,
} from '../../services/notificationAlertService';

interface MorningOvernightDigestBannerProps {
  onOpenAlertDrawer?: () => void;
  onFilterOvernightQuotes?: () => void;
}

export const MorningOvernightDigestBanner: React.FC<MorningOvernightDigestBannerProps> = ({
  onOpenAlertDrawer,
  onFilterOvernightQuotes,
}) => {
  const [alerts, setAlerts] = useState<AgentAlertItem[]>(loadAgentAlerts());
  const [isDismissed, setIsDismissed] = useState(isMorningDigestDismissedToday());

  useEffect(() => {
    const unsubscribe = subscribeToAgentAlerts((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });
    return unsubscribe;
  }, []);

  const overnightAlerts = alerts.filter((a) => a.isOvernight && !a.isResolved);
  const overnightQuotes = overnightAlerts.filter((a) => a.type === 'overnight_quote');
  const overnightMessages = overnightAlerts.filter((a) => a.type === 'customer_message');

  const totalPipelineAud = overnightQuotes.reduce(
    (sum, q) => sum + (q.details?.estimatedValueAud || 347),
    0
  );

  if (isDismissed || overnightAlerts.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    dismissMorningDigestToday();
    setIsDismissed(true);
  };

  return (
    <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-sky-50 to-emerald-50 border border-amber-200/90 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left Side: Summary and Counts */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 border border-amber-400/30">
            <Sun className="w-5 h-5 text-amber-700" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-[#0b2942]">
                Morning Overnight Queue Ready
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/60 text-amber-950 border border-amber-300">
                Logged Overnight (5:00 PM – 8:30 AM)
              </span>
            </div>

            <p className="mt-0.5 text-xs text-slate-700 leading-relaxed">
              Customers submitted{' '}
              <strong className="text-sky-950 font-black">
                {overnightQuotes.length} quote{overnightQuotes.length === 1 ? '' : 's'}
              </strong>{' '}
              and{' '}
              <strong className="text-emerald-950 font-black">
                {overnightMessages.length} message{overnightMessages.length === 1 ? '' : 's'}
              </strong>{' '}
              overnight (~${totalPipelineAud.toLocaleString('en-AU')} estimated pipeline) awaiting morning response.
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {onFilterOvernightQuotes && (
            <button
              type="button"
              onClick={onFilterOvernightQuotes}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-700" />
              <span>Filter 51-Col Grid</span>
            </button>
          )}

          {onOpenAlertDrawer && (
            <button
              type="button"
              onClick={onOpenAlertDrawer}
              className="px-3.5 py-1.5 rounded-xl bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Review Overnight Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Dismiss morning banner for today"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
