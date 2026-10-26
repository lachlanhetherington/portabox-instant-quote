import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Radio,
  Activity,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Box,
  Truck,
  RotateCw,
  Search,
} from 'lucide-react';
import { CustomerAccount } from '../../services/customerPortalService';
import { TelephonyCall } from '../../services/telephonyService';
import {
  StreamSummaryData,
  TranscriptTurn,
  StreamActionItem,
} from '../../types/twilioStream';
import {
  TWILIO_STREAM_PRESETS,
  loadStreamSummary,
  saveStreamSummary,
  getActiveStreamSession,
  startTwilioMediaStream,
  stopTwilioMediaStream,
  pauseResumeTwilioStream,
  generateAiSummaryForTranscript,
  markActionCompleted,
} from '../../services/twilioStreamService';

interface TwilioLiveIntelligencePanelProps {
  customer: CustomerAccount | null;
  activeCall?: TelephonyCall | null;
  onNavigateTab?: (tab: 'orders' | 'refunds' | 'payment_plan' | 'card_update' | 'extend' | 'pickup' | 'damage' | 'insurance' | 'sms' | 'size_change' | 'permit_hoa' | 'dispute_audit' | 'cancellation' | string) => void;
  onApplyActionPayload?: (tab: string, payload?: any) => void;
  onExportToCallNotes?: (notes: string) => void;
}

export const TwilioLiveIntelligencePanel: React.FC<TwilioLiveIntelligencePanelProps> = ({
  customer,
  activeCall,
  onNavigateTab,
  onApplyActionPayload,
  onExportToCallNotes,
}) => {
  const [streamData, setStreamData] = useState<StreamSummaryData | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(TWILIO_STREAM_PRESETS[0].id);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [manualTurnText, setManualTurnText] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load initial stream session or start one matching the active customer
  useEffect(() => {
    let current = getActiveStreamSession();
    if (!current) {
      // Find matching preset for current customer or default to first
      const matchedPreset =
        TWILIO_STREAM_PRESETS.find((p) => p.customerId === customer?.id) ||
        TWILIO_STREAM_PRESETS[0];
      setSelectedPresetId(matchedPreset.id);
      current = startTwilioMediaStream(matchedPreset.id, customer);
    }
    setStreamData(current);

    const handleUpdate = () => {
      setStreamData(getActiveStreamSession());
    };

    window.addEventListener('portabox-stream-update', handleUpdate);
    return () => window.removeEventListener('portabox-stream-update', handleUpdate);
  }, [customer]);

  // Auto-scroll transcript feed when new turns arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamData?.transcripts?.length]);

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const initiated = startTwilioMediaStream(presetId, customer);
    setStreamData(initiated);
  };

  const handleTogglePlayPause = () => {
    pauseResumeTwilioStream();
    setStreamData(getActiveStreamSession());
  };

  const handleRestartStream = () => {
    const fresh = startTwilioMediaStream(selectedPresetId, customer);
    setStreamData(fresh);
  };

  const handleTriggerAiSummarization = async () => {
    if (!streamData || !streamData.transcripts.length) return;
    setIsSummarizing(true);
    try {
      const result = await generateAiSummaryForTranscript(streamData.transcripts, {
        name: customer ? `${customer.firstName} ${customer.lastName}` : 'Portabox Customer',
        email: customer?.email,
        phone: customer?.mobile,
        orders: customer?.orders,
      });

      const updated: StreamSummaryData = {
        ...streamData,
        executiveSummary: result.executiveSummary || streamData.executiveSummary,
        bulletPoints: result.bulletPoints || streamData.bulletPoints,
        sentiment: result.sentiment || streamData.sentiment,
        sentimentScore: result.sentimentScore ?? streamData.sentimentScore,
        customerIntent: result.customerIntent || streamData.customerIntent,
        actionItems: (result.actionItems as any) || streamData.actionItems,
        lastUpdated: new Date().toLocaleTimeString('en-AU'),
      };

      saveStreamSummary(updated);
      setStreamData(updated);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAddManualTurn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTurnText.trim() || !streamData) return;

    const newTurn: TranscriptTurn = {
      id: `turn-manual-${Date.now()}`,
      speaker: 'customer',
      speakerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Customer',
      text: manualTurnText.trim(),
      timestamp: new Date().toLocaleTimeString('en-AU'),
      confidence: 0.99,
      isFinal: true,
    };

    const updated = {
      ...streamData,
      transcripts: [...streamData.transcripts, newTurn],
      packetsReceived: streamData.packetsReceived + 25,
      bytesReceived: streamData.bytesReceived + 4000,
      lastUpdated: new Date().toLocaleTimeString('en-AU'),
    };

    saveStreamSummary(updated);
    setStreamData(updated);
    setManualTurnText('');
  };

  const handleActionClick = (action: StreamActionItem) => {
    if (streamData) {
      markActionCompleted(streamData.callId, action.id);
      setStreamData(getActiveStreamSession());
    }

    if (action.targetTab && onNavigateTab) {
      if (onApplyActionPayload && action.targetPayload) {
        onApplyActionPayload(action.targetTab, action.targetPayload);
      }
      onNavigateTab(action.targetTab);
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleExportSummaryToNotes = () => {
    if (!streamData) return;
    const formattedNotes = `[TWILIO MEDIA STREAM TRANSCRIPT SUMMARY]
Intent: ${streamData.customerIntent}
Sentiment: ${streamData.sentiment.toUpperCase()} (${streamData.sentimentScore > 0 ? '+' : ''}${streamData.sentimentScore}%)
Executive Summary:
${streamData.executiveSummary}

Key Action Points:
${streamData.bulletPoints
  .map((group) => `${group.category}:\n${group.points.map((p) => ` • ${p}`).join('\n')}`)
  .join('\n\n')}

Recorded under Call ID: ${streamData.callId} | Stream SID: ${streamData.streamSid}`;

    if (onExportToCallNotes) {
      onExportToCallNotes(formattedNotes);
    }
    copyToClipboard(formattedNotes, 'call-notes');
  };

  const filteredTranscripts = (streamData?.transcripts || []).filter(
    (t) =>
      t.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.speakerName.toLowerCase().includes(transcriptSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ================= 1. TWILIO MEDIA STREAM TELEMETRY BAR ================= */}
      <div className="bg-[#0b2942] text-white rounded-3xl p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00c0f3] flex items-center justify-center text-white shadow-xs">
              <Radio className={`w-5 h-5 ${streamData?.status === 'streaming' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {streamData?.status === 'streaming' ? 'TWILIO MEDIA STREAM: ACTIVE' : streamData?.status?.toUpperCase() || 'STREAM READY'}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  SID: {streamData?.streamSid || 'MZ...'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-2">
                <span>Twilio Bi-Directional Audio Stream</span>
                <span className="opacity-60">•</span>
                <span className="text-[#00c0f3] font-mono text-[11px]">{streamData?.codec || 'PCMU 8000Hz (64 kbps)'}</span>
              </p>
            </div>
          </div>

          {/* Stream Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden cursor-pointer"
            >
              {TWILIO_STREAM_PRESETS.map((p) => {
                const label = p.scenarioTitle || p.title || 'Scenario';
                return (
                  <option key={p.id} value={p.id}>
                    Scenario: {p.customerName} ({label.slice(0, 24)}...)
                  </option>
                );
              })}
            </select>

            <button
              onClick={handleTogglePlayPause}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title={streamData?.status === 'streaming' ? 'Pause live stream' : 'Resume live stream'}
            >
              {streamData?.status === 'streaming' ? (
                <Pause className="w-4 h-4 text-amber-400" />
              ) : (
                <Play className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            <button
              onClick={handleRestartStream}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Restart stream simulation"
            >
              <RotateCcw className="w-4 h-4 text-slate-300" />
            </button>

            <button
              onClick={handleTriggerAiSummarization}
              disabled={isSummarizing}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#00c0f3] to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white text-xs font-black rounded-xl shadow-xs transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
              {isSummarizing ? 'Gemini Analyzing...' : 'Refresh AI Summary'}
            </button>
          </div>
        </div>

        {/* Real-Time Stream Performance Metrics & Audio Waveform */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Audio Packets (20ms)</span>
            <span className="font-mono text-sm font-extrabold text-white">
              {streamData?.packetsReceived.toLocaleString() || '0'} pks
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Data Throughput</span>
            <span className="font-mono text-sm font-extrabold text-[#00c0f3]">
              {(((streamData?.bytesReceived || 0) / 1024)).toFixed(1)} KB (64 kbps)
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">WebSocket Latency</span>
            <span className="font-mono text-sm font-extrabold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {streamData?.latencyMs || 22} ms
            </span>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Live Audio Wave</span>
            <div className="flex items-end gap-1 h-5 pb-0.5">
              {[40, 75, 95, 30, 85, 60, 100, 50, 80, 45, 90, 65, 35, 70].map((h, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-full transition-all duration-300 ${
                    streamData?.status === 'streaming'
                      ? 'bg-gradient-to-t from-sky-500 to-teal-300 animate-pulse'
                      : 'bg-slate-600'
                  }`}
                  style={{
                    height: streamData?.status === 'streaming' ? `${(h * (0.4 + Math.random() * 0.6)).toFixed(0)}%` : '20%',
                    animationDelay: `${idx * 80}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. REAL-TIME AI SUMMARY & BULLETED POINTS ================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-100 text-[#00c0f3] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0b2942] text-base flex items-center gap-2">
                <span>Real-Time Conversation Intelligence</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-[#00c0f3] font-bold border border-sky-100">
                  Powered by Gemini 2.5 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live stream transcript ingested via Twilio Audio Stream and summarized dynamically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSummaryToNotes}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {copiedSection === 'call-notes' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exported to Notes!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export to Call Notes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Executive Summary Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/40 to-slate-50 border border-sky-100/80 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[#0b2942] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#00c0f3]" />
              Executive Call Briefing
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Last synced: {streamData?.lastUpdated || 'Just now'}
            </span>
          </div>
          <p className="text-slate-800 font-medium text-xs sm:text-sm leading-relaxed">
            {streamData?.executiveSummary || 'Awaiting live speech from audio stream...'}
          </p>
        </div>

        {/* Sentiment & Intent Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Customer Intent */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Intent</span>
            <span className="font-extrabold text-[#0b2942] text-sm mt-0.5 block">
              {streamData?.customerIntent || 'Inbound Customer Inquiry'}
            </span>
          </div>

          {/* Sentiment Gauge */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Caller Sentiment</span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  streamData?.sentiment === 'positive'
                    ? 'bg-emerald-100 text-emerald-800'
                    : streamData?.sentiment === 'urgent'
                    ? 'bg-rose-100 text-rose-800 animate-pulse'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {streamData?.sentiment || 'Neutral'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (streamData?.sentimentScore || 0) > 40
                      ? 'bg-emerald-500'
                      : (streamData?.sentimentScore || 0) < 0
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, ((streamData?.sentimentScore || 0) + 100) / 2))}%` }}
                />
              </div>
              <span className="font-mono font-bold text-slate-700 text-xs">
                {(streamData?.sentimentScore || 0) > 0 ? `+${streamData?.sentimentScore}` : streamData?.sentimentScore || 0}%
              </span>
            </div>
          </div>

          {/* Urgency Level */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Urgency Rating</span>
            <span
              className={`font-extrabold text-sm mt-0.5 block ${
                streamData?.keyEntities?.urgencyLevel === 'Immediate Action Required' || streamData?.keyEntities?.urgencyLevel === 'High'
                  ? 'text-rose-600'
                  : 'text-slate-800'
              }`}
            >
              {streamData?.keyEntities?.urgencyLevel || 'Standard (Follow Up)'}
            </span>
          </div>
        </div>

        {/* ================= 3. STRUCTURED BULLETED POINTS (CATEGORIZED) ================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>Real-Time Key Bulleted Takeaways</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                ({(streamData?.bulletPoints || []).reduce((acc, g) => acc + g.points.length, 0)} points extracted)
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(streamData?.bulletPoints || []).map((group, groupIdx) => (
              <div
                key={groupIdx}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-2.5 hover:border-sky-200 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="font-extrabold text-[#0b2942] text-xs">
                    {group.category}
                  </span>
                  <button
                    onClick={() => copyToClipboard(group.points.join('\n'), `group-${groupIdx}`)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="Copy category points"
                  >
                    {copiedSection === `group-${groupIdx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <ul className="space-y-2">
                  {group.points.map((point, pointIdx) => (
                    <li key={pointIdx} className="text-xs text-slate-700 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00c0f3] mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ================= 4. 1-CLICK AI ACTION RECOMMENDATIONS ================= */}
        {streamData?.actionItems && streamData.actionItems.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>AI Suggested Agent Actions (1-Click Execution)</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Click any action to execute or pre-fill in drawer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {streamData.actionItems.map((action) => (
                <div
                  key={action.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    action.completed
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-600'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold ${action.completed ? 'line-through text-slate-500' : 'text-[#0b2942]'}`}>
                        {action.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {action.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleActionClick(action)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                      action.completed
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-[#00c0f3] hover:bg-sky-500 text-white shadow-xs'
                    }`}
                  >
                    {action.completed ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <span>Execute</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= 5. LIVE AUDIO STREAM TRANSCRIPT FEED ================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h4 className="font-extrabold text-[#0b2942] text-sm">
                Twilio Live Streaming Speech-to-Text Feed
              </h4>
              <p className="text-[11px] text-slate-500">
                Speaker diarization synchronized with Twilio Media Stream WebSocket
              </p>
            </div>
          </div>

          {/* Search within transcript */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search transcript..."
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#00c0f3] w-44"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Conversation Stream Feed */}
        <div className="max-h-80 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {filteredTranscripts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No matching conversation turns found.
            </div>
          ) : (
            filteredTranscripts.map((turn) => {
              const isAgent = turn.speaker === 'agent';
              const isCustomer = turn.speaker === 'customer';
              const isIvr = turn.speaker === 'ivr';

              return (
                <div
                  key={turn.id}
                  className={`flex flex-col gap-1 text-xs ${
                    isAgent ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                    <span className="font-extrabold text-slate-700">{turn.speakerName}</span>
                    <span>•</span>
                    <span>{turn.timestamp}</span>
                    <span>•</span>
                    <span className="font-mono text-emerald-600">
                      {(turn.confidence * 100).toFixed(0)}% speech accuracy
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-xl leading-relaxed shadow-xs ${
                      isAgent
                        ? 'bg-[#0b2942] text-white rounded-tr-xs'
                        : isIvr
                        ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-tl-xs'
                        : 'bg-sky-50 text-slate-900 border border-sky-100 rounded-tl-xs'
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Live Audio Input Simulation Form */}
        <form onSubmit={handleAddManualTurn} className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type customer or agent speech to simulate live stream audio turn..."
            value={manualTurnText}
            onChange={(e) => setManualTurnText(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#00c0f3]"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#0b2942] hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Inject Audio Turn</span>
          </button>
        </form>
      </div>
    </div>
  );
};
