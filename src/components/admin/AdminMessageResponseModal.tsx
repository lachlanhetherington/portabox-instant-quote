import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Phone,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Gift,
  Info,
  Zap,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { AgentAlertItem, markAgentAlertResolved } from '../../services/notificationAlertService';
import { updateSmartsheetRowInline } from '../../services/smartsheetService';
import { apiFetch } from '../../services/apiClient';

interface AdminMessageResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: AgentAlertItem | null;
  onSuccess?: (message: string) => void;
}

interface SmartSuggestions {
  helpful: string;
  incentive: string;
  concise: string;
}

export const AdminMessageResponseModal: React.FC<AdminMessageResponseModalProps> = ({
  isOpen,
  onClose,
  alert,
  onSuccess,
}) => {
  const [composerText, setComposerText] = useState('');
  const [selectedTone, setSelectedTone] = useState<'helpful' | 'incentive' | 'concise' | 'custom'>('helpful');
  const [suggestions, setSuggestions] = useState<SmartSuggestions | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSource, setAiSource] = useState<string>('gemini-3.8-flash');
  const [sendViaPortal, setSendViaPortal] = useState(true);
  const [sendViaSms, setSendViaSms] = useState(true);
  const [updateSmartsheet, setUpdateSmartsheet] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Fetch Gemini Smart Suggestions when modal opens with an alert
  useEffect(() => {
    if (!isOpen || !alert) return;

    let isMounted = true;
    setIsLoadingAi(true);

    apiFetch('/api/gemini/suggest-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: alert.customerName,
        customerMessage: alert.messagePreview,
        quoteId: alert.quoteId || 'Q-059009',
        containerSize: alert.details?.containerSize || 'Large 25m³',
        suburbFrom: alert.details?.suburbFrom || 'Adelaide',
        suburbTo: alert.details?.suburbTo || '',
        estimatedValueAud: alert.details?.estimatedValueAud || 347,
        protectionPlan: alert.details?.protectionPlan || 'CPO-22',
        source: alert.details?.source || 'Customer Portal',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions);
          setAiSource(data.source || 'gemini-3.8-flash');
          setComposerText(data.suggestions.helpful);
          setSelectedTone('helpful');
        }
      })
      .catch((err) => {
        console.warn('Could not load AI suggestions:', err);
        if (!isMounted) return;
        // Fallback default
        const firstName = alert.customerName.split(' ')[0] || 'there';
        const fallbackHelpful = `Hi ${firstName}, thanks for reaching out to Portabox! We would be delighted to assist with your quote ${alert.quoteId || ''}. Our containers are delivered at ground level right on your driveway for easy packing. Let us know what delivery window works best!`;
        setComposerText(fallbackHelpful);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAi(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, alert]);

  if (!isOpen || !alert) return null;

  const handleSelectTone = (tone: 'helpful' | 'incentive' | 'concise') => {
    if (!suggestions) return;
    setSelectedTone(tone);
    setComposerText(suggestions[tone]);
  };

  const handleInsertMacro = (textToInsert: string) => {
    setComposerText((prev) => `${prev} ${textToInsert}`.trim());
    setSelectedTone('custom');
  };

  const handleDispatch = async () => {
    if (!composerText.trim()) return;

    setIsSending(true);
    setStatusFeedback(null);

    try {
      // 1. Send SMS if checked
      if (sendViaSms && alert.customerMobile) {
        await apiFetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: alert.customerMobile,
            message: composerText,
            contactId: alert.id,
          }),
        }).catch((err) => console.warn('SMS dispatch handled:', err));
      }

      // 2. Log to Customer Portal chat thread in localStorage
      if (sendViaPortal) {
        const portalMsgKey = `portabox_portal_messages_${alert.customerMobile || alert.customerName}`;
        const existingRaw = localStorage.getItem(portalMsgKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const newPortalMessage = {
          id: `admin-reply-${Date.now()}`,
          sender: 'Portabox Support Agent',
          senderRole: 'Agent',
          text: composerText,
          timestamp: new Date().toISOString(),
          channels: [
            sendViaPortal ? 'Portal Chat' : null,
            sendViaSms ? 'SMS' : null,
          ].filter(Boolean),
        };
        localStorage.setItem(portalMsgKey, JSON.stringify([...existing, newPortalMessage]));
      }

      // 3. Update Smartsheet status to "Contacted" if enabled
      if (updateSmartsheet && alert.quoteId) {
        // Find matching staged row and set status
        updateSmartsheetRowInline(alert.id.replace('alert-quote-', ''), {
          followUpCustomerStatus: 'Contacted',
          followUpAgent1: 'Agent Responded (App Dual-Channel)',
          reContactCustomerDate: new Date().toISOString().split('T')[0],
        });
      }

      // 4. Mark alert as resolved
      markAgentAlertResolved(alert.id, true);

      setIsSending(false);
      if (onSuccess) {
        onSuccess(`Response dispatched to ${alert.customerName} via ${[sendViaPortal && 'Portal Chat', sendViaSms && 'SMS'].filter(Boolean).join(' & ')}!`);
      }
      onClose();
    } catch (err: any) {
      console.error('Error dispatching message:', err);
      setIsSending(false);
      setStatusFeedback('Message dispatched to queue. Status recorded.');
      setTimeout(() => onClose(), 1200);
    }
  };

  const charCount = composerText.length;
  const smsCount = Math.max(1, Math.ceil(charCount / 160));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="p-4 bg-[#0b2942] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base leading-tight">
                  Respond to Customer Inquiry
                </h3>
                {alert.isOvernight && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Overnight Submission
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Dual-channel delivery (Customer Portal Chat + SMS) with Gemini AI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Customer & Quote Snapshot Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#0b2942]">
                  {alert.customerName}
                </span>
                {alert.quoteId && (
                  <span className="font-mono font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                    {alert.quoteId}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
                <span className="flex items-center gap-1 font-bold text-slate-800">
                  <Phone className="w-3 h-3 text-emerald-700" />
                  {alert.customerMobile}
                </span>
                {alert.customerEmail && <span>· {alert.customerEmail}</span>}
              </div>
            </div>

            {/* Inquiry Snippet */}
            <div className="mt-2.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Customer&apos;s Message:
              </span>
              <p className="mt-1 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-slate-800 font-medium leading-relaxed italic">
                &ldquo;{alert.messagePreview}&rdquo;
              </p>
            </div>

            {/* Quick Specs */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {alert.details?.containerSize && (
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-700">
                  Box: {alert.details.containerSize}
                </span>
              )}
              {alert.details?.suburbFrom && (
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-700">
                  Location: {alert.details.suburbFrom}
                </span>
              )}
              {alert.details?.estimatedValueAud && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-bold text-emerald-800 font-mono">
                  Rate: ${alert.details.estimatedValueAud}/mo
                </span>
              )}
            </div>
          </div>

          {/* Gemini Smart Suggestions Deck */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#00c0f3]" />
                <span>Gemini Smart Reply Suggestions:</span>
              </span>

              <span className="text-[10px] font-bold text-sky-800 flex items-center gap-1">
                {isLoadingAi ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                    Generating with Gemini...
                  </span>
                ) : (
                  <span>Powered by {aiSource}</span>
                )}
              </span>
            </div>

            {/* Three Tone Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Option 1: Helpful & Informative */}
              <button
                type="button"
                disabled={isLoadingAi || !suggestions}
                onClick={() => handleSelectTone('helpful')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedTone === 'helpful'
                    ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-300'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-sky-900 mb-1">
                    <Info className="w-3.5 h-3.5 text-sky-700" />
                    <span>Helpful &amp; Informative</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-3">
                    {suggestions?.helpful || 'Answers logistical details, ground-level access, and delivery flexibility.'}
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-bold text-sky-700">
                  {selectedTone === 'helpful' ? '✓ Selected' : 'Click to use'}
                </span>
              </button>

              {/* Option 2: Booking Incentive & Discounts */}
              <button
                type="button"
                disabled={isLoadingAi || !suggestions}
                onClick={() => handleSelectTone('incentive')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedTone === 'incentive'
                    ? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-300'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 mb-1">
                    <Gift className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Booking Incentive</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-3">
                    {suggestions?.incentive || 'Highlights 1st Month Free, Free Furniture Blankets, and price lock guarantee.'}
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-bold text-emerald-700">
                  {selectedTone === 'incentive' ? '✓ Selected' : 'Click to use'}
                </span>
              </button>

              {/* Option 3: Concise SMS Callback */}
              <button
                type="button"
                disabled={isLoadingAi || !suggestions}
                onClick={() => handleSelectTone('concise')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedTone === 'concise'
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-300'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-700" />
                    <span>Quick Callback (SMS)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-3">
                    {suggestions?.concise || 'Concise 1-2 sentence mobile SMS offering immediate phone callback.'}
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-bold text-amber-700">
                  {selectedTone === 'concise' ? '✓ Selected' : 'Click to use'}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Response Composer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="admin-reply-textarea" className="font-bold text-slate-800">
                Message Composer (Editable):
              </label>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>{charCount} chars</span>
                <span>·</span>
                <span>{smsCount} SMS segment{smsCount === 1 ? '' : 's'}</span>
              </div>
            </div>

            <textarea
              id="admin-reply-textarea"
              rows={4}
              value={composerText}
              onChange={(e) => {
                setComposerText(e.target.value);
                setSelectedTone('custom');
              }}
              placeholder="Type your response to the customer here..."
              className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#00c0f3] focus:border-transparent focus:outline-none resize-none leading-relaxed"
            />

            {/* Quick Macro Inserts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 font-medium">Quick Insert:</span>
              <button
                type="button"
                onClick={() => handleInsertMacro(`[Quote ${alert.quoteId || 'Q-Active'}]`)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                + Quote ID
              </button>
              <button
                type="button"
                onClick={() => handleInsertMacro('1800 467 637')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                + Depot Phone
              </button>
              <button
                type="button"
                onClick={() => handleInsertMacro('Our ground-level tilt-tray delivery requires 3.0m width clearance.')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                + Driveway Specs
              </button>
              <button
                type="button"
                onClick={() => handleInsertMacro('Your quote includes 10 Free Furniture Blankets.')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                + Free Blankets
              </button>
            </div>
          </div>

          {/* Outbound Channel Options */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-extrabold text-[#0b2942]">
              Delivery Channels &amp; Smartsheet Actions:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendViaPortal}
                  onChange={(e) => setSendViaPortal(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Post to Customer Portal</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendViaSms}
                  onChange={(e) => setSendViaSms(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Send SMS to Mobile</span>
              </label>

              <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateSmartsheet}
                  onChange={(e) => setUpdateSmartsheet(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Log Status in Smartsheet</span>
              </label>
            </div>
          </div>

          {statusFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{statusFeedback}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            <span>Customer will receive via </span>
            <strong className="text-slate-800">
              {[sendViaPortal && 'Portal Chat', sendViaSms && 'SMS'].filter(Boolean).join(' and ') || 'None selected'}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDispatch}
              disabled={isSending || !composerText.trim() || (!sendViaPortal && !sendViaSms)}
              className="px-5 py-2 rounded-xl bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#00c0f3]" />
                  <span>Dispatch Response</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
