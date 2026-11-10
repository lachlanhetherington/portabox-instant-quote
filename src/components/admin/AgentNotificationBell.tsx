import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Moon,
  MessageSquare,
  FileSpreadsheet,
  Phone,
  CheckCircle2,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  AgentAlertItem,
  loadAgentAlerts,
  markAgentAlertRead,
  markAgentAlertResolved,
  markAllAgentAlertsRead,
  subscribeToAgentAlerts,
  playSubtleChime,
  isChimeMuted,
  setChimeMuted,
} from '../../services/notificationAlertService';
import { AdminMessageResponseModal } from './AdminMessageResponseModal';

interface AgentNotificationBellProps {
  onNavigateToQuote?: (quoteId: string) => void;
  onOpenSmsModal?: (mobile: string, customerName: string) => void;
}

export const AgentNotificationBell: React.FC<AgentNotificationBellProps> = ({
  onNavigateToQuote,
  onOpenSmsModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AgentAlertItem[]>(loadAgentAlerts());
  const [activeTab, setActiveTab] = useState<'all' | 'overnight' | 'quotes' | 'messages'>('all');
  const [muted, setMuted] = useState(isChimeMuted());
  const [selectedAlertForReply, setSelectedAlertForReply] = useState<AgentAlertItem | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToAgentAlerts((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });
    return unsubscribe;
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const overnightCount = alerts.filter((a) => a.isOvernight && !a.isResolved).length;

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === 'overnight') return a.isOvernight;
    if (activeTab === 'quotes') return a.type === 'overnight_quote';
    if (activeTab === 'messages') return a.type === 'customer_message';
    return true;
  });

  const handleToggleMute = () => {
    const nextState = !muted;
    setMuted(nextState);
    setChimeMuted(nextState);
    if (!nextState) {
      playSubtleChime(); // Play test chime when unmuting
    }
  };

  const handleAlertClick = (alert: AgentAlertItem) => {
    if (!alert.isRead) {
      markAgentAlertRead(alert.id);
    }
  };

  const handleViewQuote = (quoteId?: string) => {
    if (quoteId && onNavigateToQuote) {
      onNavigateToQuote(quoteId);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={drawerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-[#0b2942] hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sky-400"
        title="Agent Notifications & Overnight Queue"
        aria-label="Agent Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1 rounded-full bg-emerald-600 text-white font-black text-[10px] shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notification Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 sm:w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-[#0b2942] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                  <span>Agent Alert Center</span>
                  {overnightCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {overnightCount} Overnight
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-300">
                  {unreadCount} unread · Real-time quotes &amp; messages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Mute Chime Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1"
                title={muted ? 'Unmute notification chime' : 'Mute notification chime'}
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader / Tabs & Actions */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#0b2942] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({alerts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('overnight')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all flex items-center gap-1 ${
                  activeTab === 'overnight'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3 h-3" />
                Overnight ({overnightCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('quotes')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  activeTab === 'quotes'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quotes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  activeTab === 'messages'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Texts
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAgentAlertsRead}
                className="text-[11px] font-bold text-sky-800 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                No alerts found in this view.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isOvernight = alert.isOvernight;

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-3 transition-colors cursor-pointer ${
                      !alert.isRead
                        ? isOvernight
                          ? 'bg-amber-50/50 hover:bg-amber-50'
                          : 'bg-sky-50/40 hover:bg-sky-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Type Icon Badge */}
                        {isOvernight ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                            <Moon className="w-3 h-3 text-amber-700" />
                            Overnight
                          </span>
                        ) : alert.type === 'overnight_quote' ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                            <FileSpreadsheet className="w-3 h-3 text-sky-700" />
                            Quote
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <MessageSquare className="w-3 h-3 text-emerald-700" />
                            SMS
                          </span>
                        )}

                        <span className="font-extrabold text-xs text-slate-900">
                          {alert.customerName}
                        </span>

                        {alert.quoteId && (
                          <span className="font-mono font-bold text-sky-800 text-[11px]">
                            {alert.quoteId}
                          </span>
                        )}

                        {!alert.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Unread" />
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(alert.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-700 leading-snug line-clamp-2">
                      {alert.messagePreview}
                    </p>

                    {/* Metadata tags */}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono text-slate-600">{alert.customerMobile}</span>
                      {alert.details?.suburbFrom && (
                        <span>· {alert.details.suburbFrom}</span>
                      )}
                      {alert.details?.estimatedValueAud && (
                        <span className="font-bold text-emerald-800 font-mono">
                          · ${alert.details.estimatedValueAud}
                        </span>
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${alert.customerMobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1 text-[11px] transition-colors"
                          title="Call customer directly"
                        >
                          <Phone className="w-3 h-3 text-emerald-700" />
                          <span>Call</span>
                        </a>

                        {onOpenSmsModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSmsModal(alert.customerMobile, alert.customerName);
                              setIsOpen(false);
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                            title="Send SMS"
                          >
                            <MessageSquare className="w-3 h-3 text-sky-700" />
                            <span>SMS</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAlertForReply(alert);
                            setIsOpen(false);
                          }}
                          className="px-2 py-1 rounded bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold flex items-center gap-1 text-[11px] transition-colors cursor-pointer shadow-2xs"
                          title="Respond with Gemini AI Smart Reply & Dual-Channel Dispatch"
                        >
                          <Sparkles className="w-3 h-3 text-[#00c0f3]" />
                          <span>Reply</span>
                        </button>

                        {alert.quoteId && onNavigateToQuote && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewQuote(alert.quoteId);
                            }}
                            className="px-2 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                            title="Jump to 51-column Smartsheet row"
                          >
                            <ExternalLink className="w-3 h-3 text-sky-800" />
                            <span>Grid Row</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAgentAlertResolved(alert.id, !alert.isResolved);
                        }}
                        className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          alert.isResolved
                            ? 'text-emerald-700 hover:text-emerald-800'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title={alert.isResolved ? 'Marked as Contacted / Resolved' : 'Mark as Contacted'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{alert.isResolved ? 'Resolved' : 'Mark Contacted'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Two-way connected with Dan&apos;s Smartsheet</span>
            </span>
            <button
              type="button"
              onClick={() => playSubtleChime()}
              className="text-sky-800 font-bold hover:underline cursor-pointer"
              title="Test the subtle chime sound"
            >
              Test Chime
            </button>
          </div>
        </div>
      )}
      {/* Response Modal with Gemini Smart Replies & Dual-Channel Dispatch */}
      <AdminMessageResponseModal
        isOpen={Boolean(selectedAlertForReply)}
        onClose={() => setSelectedAlertForReply(null)}
        alert={selectedAlertForReply}
      />
    </div>
  );
};
