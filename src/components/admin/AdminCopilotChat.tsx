import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Zap,
  Tag,
  Fuel,
  Users,
  ShieldCheck,
  ChevronRight,
  Bot,
  User,
  X,
  Copy,
  Check,
  HelpCircle,
  SlidersHorizontal,
  Lock,
  Unlock,
} from 'lucide-react';
import { AppConfig, CustomerLead, PromotionRule } from '../../types/quote';
import { createPhoneBookingSmartsheetRow } from '../../services/smartsheetService';

export interface AdminChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionsExecuted?: Array<{
    type: string;
    summary: string;
    payload: any;
  }>;
}

interface AdminCopilotChatProps {
  config: AppConfig;
  leads: CustomerLead[];
  onSaveConfig: (newConfig: AppConfig) => void;
  onUpdateLeadStatus?: (leadId: string, status: CustomerLead['status']) => void;
  onAddLeadNote?: (leadId: string, note: string) => void;
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

const INITIAL_GREETING: AdminChatMessage = {
  id: 'msg-init',
  role: 'assistant',
  text: `G'day! I am your **Portabox Operations, Logistics & Call Center Copilot** powered by Gemini 3.8 Flash.\n\nI have direct access to execute functions in your application:\n• **Phone Bookings & Credit Card Intake** (create bookings over phone with credit card, including callers without mobile or email, produce quotes)\n• **Create & Manage Discount Codes** (targetable by location, service type, container size, and exclusivity)\n• **Switch & Adjust Fuel Levy** (per-km vs zone-based fixed pricing)\n• **Update Tariffs & Pricing Rules**\n• **Search & Update Customer Leads**\n\nWhat operational task would you like me to perform?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

const STORAGE_KEY = 'portabox_admin_copilot_chat_history_v1';

export const AdminCopilotChat: React.FC<AdminCopilotChatProps> = ({
  config,
  leads,
  onSaveConfig,
  onUpdateLeadStatus,
  onAddLeadNote,
  isFloating = false,
  onCloseFloating,
}) => {
  const [messages, setMessages] = useState<AdminChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [INITIAL_GREETING];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const executeCopilotActions = (actions: Array<{ type: string; summary: string; payload: any }>) => {
    if (!actions || actions.length === 0) return;

    let updatedConfig = { ...config };
    let configChanged = false;
    const executedSummaries: string[] = [];

    actions.forEach((act) => {
      switch (act.type) {
        case 'CREATE_DISCOUNT_CODE': {
          const p = act.payload;
          const newPromo: PromotionRule = {
            id: `promo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: p.name || 'AI Created Promotion',
            code: (p.code || 'PROMO').toUpperCase(),
            description: p.description || '',
            type: p.type || 'percent_off_first_month',
            value: Number(p.value) || 20,
            targetLocations: p.targetLocations || ['All'],
            serviceTypes: p.serviceTypes || ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
            containerSize: p.containerSize || 'all',
            isExclusive: Boolean(p.isExclusive),
            active: p.active ?? true,
            autoApply: false,
            minDurationMonths: p.minDurationMonths || 0,
          };
          updatedConfig.promotions = [newPromo, ...(updatedConfig.promotions || [])];
          configChanged = true;
          executedSummaries.push(`Created code ${newPromo.code}`);
          break;
        }

        case 'TOGGLE_DISCOUNT_CODE': {
          const targetCode = (act.payload?.code || '').toUpperCase();
          const nextActive = Boolean(act.payload?.active);
          if (targetCode && updatedConfig.promotions) {
            updatedConfig.promotions = updatedConfig.promotions.map((p) =>
              p.code?.toUpperCase() === targetCode ? { ...p, active: nextActive } : p
            );
            configChanged = true;
            executedSummaries.push(`${nextActive ? 'Activated' : 'Deactivated'} ${targetCode}`);
          }
          break;
        }

        case 'DELETE_DISCOUNT_CODE': {
          const targetCode = (act.payload?.code || '').toUpperCase();
          if (targetCode && updatedConfig.promotions) {
            updatedConfig.promotions = updatedConfig.promotions.filter(
              (p) => p.code?.toUpperCase() !== targetCode
            );
            configChanged = true;
            executedSummaries.push(`Deleted code ${targetCode}`);
          }
          break;
        }

        case 'UPDATE_FUEL_SURCHARGE': {
          const p = act.payload;
          if (p.model) updatedConfig.fuelSurchargeModel = p.model;
          if (p.ratePerKm !== undefined) updatedConfig.fuelSurchargeRatePerKm = p.ratePerKm;
          if (p.zoneRates) {
            updatedConfig.fuelSurchargeZoneRates = {
              ...updatedConfig.fuelSurchargeZoneRates,
              ...p.zoneRates,
            };
          }
          configChanged = true;
          executedSummaries.push(
            `Fuel Levy set to ${p.model === 'zone_fixed' ? 'Zone Fixed Rates' : `Per-Km ($${p.ratePerKm || updatedConfig.fuelSurchargeRatePerKm}/km)`}`
          );
          break;
        }

        case 'UPDATE_LEAD_STATUS': {
          const { leadId, status } = act.payload;
          if (leadId && status && onUpdateLeadStatus) {
            onUpdateLeadStatus(leadId, status);
            executedSummaries.push(`Updated lead ${leadId} status to ${status}`);
          }
          break;
        }

        case 'ADD_LEAD_NOTE': {
          const { leadId, note } = act.payload;
          if (leadId && note && onAddLeadNote) {
            onAddLeadNote(leadId, note);
            executedSummaries.push(`Added note to lead ${leadId}`);
          }
          break;
        }

        case 'CREATE_PHONE_BOOKING': {
          const p = act.payload;
          try {
            const cleanCard = (p.cardNumber || p.cardLast4 || '4242').replace(/\D/g, '');
            const cardLast4 = cleanCard.slice(-4) || '4242';
            const authCode = `AUTH-MOTO-${Math.floor(100000 + Math.random() * 900000)}`;

            const { row } = createPhoneBookingSmartsheetRow({
              customerName: p.customerName || 'Phone Customer',
              customerPhone: p.customerPhone || 'None (No Mobile - Phone Order)',
              customerEmail: p.customerEmail || `no-email-${Date.now().toString().slice(-4)}@portabox.com.au`,
              deliveryAddress: p.deliveryAddress || `${p.suburb || 'Adelaide'} SA ${p.postcode || '5000'}`,
              suburb: p.suburb || 'Adelaide',
              postcode: p.postcode || '5000',
              state: p.state || 'SA',
              containerSize: p.containerSize || '25 m³',
              serviceType: p.serviceType || 'Storage at Your Place',
              scheduledDeliveryDate: p.scheduledDeliveryDate || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
              deliveryWindow: p.deliveryWindow || '09:00 AM – 11:30 AM (Morning Window)',
              monthlyRateAud: p.monthlyRateAud || 219,
              legFeeAud: p.legFeeAud || 149,
              discountAud: p.discountAud || 0,
              isCreditCardPaid: true,
              creditCardLast4: cardLast4,
              creditCardBrand: p.cardBrand || 'Visa',
              creditCardExpiry: p.cardExpiry || '12/28',
              creditCardAuthCode: authCode,
              hasNoPhoneOrEmail: p.hasNoPhoneOrEmail ?? true,
            });

            executedSummaries.push(`Booked #${row.orderNumber} for ${row.customerName} via Credit Card (Auth: ${authCode})`);
          } catch (err) {
            console.error('Failed to create phone booking via copilot:', err);
          }
          break;
        }
      }
    });

    if (configChanged) {
      onSaveConfig(updatedConfig);
    }

    if (executedSummaries.length > 0) {
      setActionNotice(`⚡ Action executed: ${executedSummaries.join(', ')}`);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: AdminChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          currentConfig: config,
          leads,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to communicate with Admin Copilot');
      }

      // Execute actions returned by Copilot
      if (data.actions && data.actions.length > 0) {
        executeCopilotActions(data.actions);
      }

      const botMsg: AdminChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Request completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionsExecuted: data.actions && data.actions.length > 0 ? data.actions : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: AdminChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ I encountered an error: ${err.message || 'Unable to process your request.'}. You can try rephrasing or clicking one of the suggested action presets below.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear the Admin Copilot conversation history?')) {
      setMessages([INITIAL_GREETING]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const QUICK_PROMPTS = [
    'Create a 20% exclusive discount code for Melbourne 20ft units MELB20EXCL',
    'Create Adelaide onsite storage $50 off coupon ADELONSITE50',
    'Switch Fuel Levy to Zone-Based Fixed Rates',
    'Set Fuel Levy to $0.45 per km distance',
    'Show pipeline status of all customer leads',
    'Deactivate discount code MELB20FT',
    'Create nationwide free initial delivery code FREEDEL2026',
  ];

  return (
    <div className={`flex flex-col h-full bg-white ${isFloating ? 'rounded-2xl border border-purple-200 shadow-2xl overflow-hidden' : 'rounded-3xl border border-slate-200 shadow-xs'}`}>
      {/* Header */}
      <div className="px-5 py-3.5 bg-linear-to-r from-[#0b2942] via-[#112F4F] to-purple-950 text-white flex items-center justify-between gap-3 border-b border-purple-900/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-amber-400 via-purple-400 to-sky-400 text-purple-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white tracking-tight">
                Admin Copilot & Operations Assistant
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/40 border border-purple-400/50 text-amber-300 px-2 py-0.5 rounded-full">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-purple-200/80">
              Autonomous pricing adjustments, discount code creation, fuel levy control & CRM queries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>

          {isFloating && onCloseFloating && (
            <button
              type="button"
              onClick={onCloseFloating}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between gap-2 shadow-inner animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-100 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-linear-to-b from-slate-50/50 via-white to-purple-50/20">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isUser
                    ? 'bg-[#00c0f3] text-white'
                    : 'bg-linear-to-tr from-purple-700 to-[#0b2942] text-amber-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[78%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-[#0b2942] text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none ring-1 ring-slate-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap space-y-1">
                    {msg.text.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>
                        {paragraph.split('**').map((part, bIdx) =>
                          bIdx % 2 === 1 ? <strong key={bIdx} className={isUser ? 'text-amber-300' : 'text-[#0b2942] font-black'}>{part}</strong> : part
                        )}
                      </p>
                    ))}
                  </div>

                  {/* Render Action Execution Card if actions were carried out */}
                  {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Live Actions Executed on App:</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.actionsExecuted.map((act, actIdx) => (
                          <div
                            key={actIdx}
                            className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] font-bold flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{act.summary}</span>
                            </div>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-mono">
                              {act.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-slate-600 cursor-pointer flex items-center gap-0.5"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-900 text-amber-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-purple-200 rounded-tl-none shadow-xs flex items-center gap-2 text-xs text-purple-900 font-semibold">
              <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
              <span>Analyzing operations & executing function...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Presets Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 overflow-x-auto shrink-0 flex items-center gap-2 scrollbar-none">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" /> Quick Prompts:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 text-[11px] font-bold text-slate-700 hover:text-purple-900 border border-slate-200 hover:border-purple-300 transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Ask Copilot (e.g. 'Create a 15% exclusive promo for Sydney' or 'Switch fuel levy to zone pricing')..."
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-slate-400 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={isLoading || !inputPrompt.trim()}
          className="px-4 py-2.5 bg-linear-to-r from-purple-700 to-[#0b2942] hover:from-purple-800 hover:to-[#112F4F] disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Execute</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
