import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  ChevronUp,
  ChevronDown,
  User,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  TelephonyCall,
  getActiveCall,
  answerCall,
  holdCall,
  hangupCall,
  initiateInboundCall,
  loadTwilioConfig,
  findCustomerByPhoneOrEmail,
  TwilioConfig,
} from '../../services/telephonyService';
import { CustomerAccount, loadCustomerAccounts } from '../../services/customerPortalService';

interface TwilioSoftphoneBarProps {
  onOpenScreenPop: (customer: CustomerAccount | null, call: TelephonyCall | null) => void;
  onOpenTelephonyHub?: () => void;
}

export const TwilioSoftphoneBar: React.FC<TwilioSoftphoneBarProps> = ({
  onOpenScreenPop,
  onOpenTelephonyHub,
}) => {
  const [activeCall, setActiveCall] = useState<TelephonyCall | null>(getActiveCall());
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>(loadTwilioConfig());
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [customPhoneInput, setCustomPhoneInput] = useState('0412 849 201');
  const [customEmailInput, setCustomEmailInput] = useState('sarah.jenkins@gmail.com');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  // Listen to telephony update events
  useEffect(() => {
    const handleUpdate = () => {
      setActiveCall(getActiveCall());
      setTwilioConfig(loadTwilioConfig());
    };
    window.addEventListener('portabox-telephony-update', handleUpdate);
    return () => window.removeEventListener('portabox-telephony-update', handleUpdate);
  }, []);

  // Timer for connected call
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      setCallDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - activeCall.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = () => {
    if (activeCall) {
      const answered = answerCall(activeCall.id);
      if (answered && twilioConfig.autoScreenPop) {
        onOpenScreenPop(answered.matchedCustomer || null, answered);
      }
    }
  };

  const handleDecline = () => {
    if (activeCall) {
      hangupCall(activeCall.id, 'General Inquiry', 'Call declined by agent');
    }
  };

  const handleSimulateCall = (phone: string, email?: string) => {
    const call = initiateInboundCall(phone, email);
    setIsSimulatorOpen(false);
    if (twilioConfig.autoScreenPop && call.matchedCustomer) {
      onOpenScreenPop(call.matchedCustomer, call);
    }
  };

  return (
    <>
      {/* Floating Softphone Bar / Dock at bottom right */}
      <div className="fixed bottom-4 right-4 z-40 max-w-xl flex flex-col items-end gap-2 animate-in fade-in duration-200">
        {/* Simulator Drawer Panel (when expanded) */}
        {isSimulatorOpen && (
          <div className="w-96 bg-white rounded-3xl p-5 shadow-2xl border border-slate-200/90 text-xs space-y-4 mb-2 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00c0f3]" />
                <span className="font-extrabold text-[#0b2942]">Inbound Call & IVR Simulator</span>
              </div>
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              Simulate an incoming phone call to the Portabox Australia 1300 number. Test automated IVR caller email matching and instant 360° screen-pop:
            </p>

            {/* Quick Test Scenarios */}
            <div className="space-y-2">
              <button
                onClick={() => handleSimulateCall('0412 849 201', 'sarah.jenkins@gmail.com')}
                className="w-full p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-[#5CC1EF]/40 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between font-bold text-[#15385E]">
                  <span>Sarah Jenkins (Adelaide)</span>
                  <span className="text-[10px] bg-[#5CC1EF] text-[#15385E] font-black px-1.5 py-0.5 rounded font-mono">Matched</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  0412 849 201 · Active 25m³ Box placed on driveway
                </div>
              </button>

              <button
                onClick={() => handleSimulateCall('0433 912 304', 'david.miller@builderpro.com.au')}
                className="w-full p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between font-bold text-[#15385E]">
                  <span>David Miller (BuilderPro)</span>
                  <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-mono">Matched</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  0433 912 304 · Commercial 25m³ Large rental
                </div>
              </button>

              <button
                onClick={() => handleSimulateCall('0499 888 777', 'sarah.jenkins@gmail.com')}
                className="w-full p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between font-bold text-[#0b2942]">
                  <span>New Number + Voice Email Entry</span>
                  <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-mono">IVR Spoken</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Caller dials from new phone & speaks "sarah.jenkins@gmail.com"
                </div>
              </button>
            </div>

            {/* Custom Input */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Custom Caller Test</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customPhoneInput}
                  onChange={(e) => setCustomPhoneInput(e.target.value)}
                  placeholder="Caller Phone"
                  className="p-2 rounded-lg border border-slate-200 text-xs font-mono"
                />
                <input
                  type="email"
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  placeholder="Spoken Email"
                  className="p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <button
                onClick={() => handleSimulateCall(customPhoneInput, customEmailInput)}
                className="w-full py-2 bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                Simulate Call Ring
              </button>
            </div>
          </div>
        )}

        {/* The Softphone Bar Shell */}
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-full shadow-2xl border transition-all ${
            activeCall?.status === 'ringing'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30 animate-pulse'
              : activeCall?.status === 'connected'
              ? 'bg-[#15385E] text-white border-slate-700 shadow-sky-950/40'
              : activeCall?.status === 'hold'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-white/95 backdrop-blur-md text-slate-800 border-slate-200/90 hover:border-sky-300'
          }`}
        >
          {/* Status Indicator & Info */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-3 h-3 rounded-full shrink-0 ${
                activeCall?.status === 'ringing'
                  ? 'bg-slate-950 animate-ping'
                  : activeCall?.status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : activeCall?.status === 'hold'
                  ? 'bg-amber-300'
                  : 'bg-emerald-500'
              }`}
            />

            {activeCall ? (
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs">
                  {activeCall.status === 'ringing'
                    ? 'INBOUND RINGING:'
                    : activeCall.status === 'hold'
                    ? 'ON HOLD:'
                    : 'ON CALL:'}
                </span>
                <span className="font-bold text-xs max-w-[130px] truncate">
                  {activeCall.callerName || activeCall.callerPhone}
                </span>
                {activeCall.status === 'connected' && (
                  <span className="font-mono text-xs font-bold text-emerald-400 ml-1">
                    {formatTimer(callDuration)}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-[#15385E]">Softphone Ready</span>
                <span className="hidden sm:inline text-[11px] text-slate-500 font-mono">
                  {twilioConfig.twilioVoiceNumber}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons depending on state */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200/40">
            {activeCall?.status === 'ringing' ? (
              <>
                <button
                  onClick={handleAnswer}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 fill-white" />
                  Answer
                </button>
                <button
                  onClick={handleDecline}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full cursor-pointer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </>
            ) : activeCall?.status === 'connected' || activeCall?.status === 'hold' ? (
              <>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-1.5 rounded-full text-xs cursor-pointer ${
                    isMuted ? 'bg-rose-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onOpenScreenPop(activeCall.matchedCustomer || null, activeCall)}
                  className="px-2.5 py-1 bg-[#00c0f3] hover:bg-[#00ace0] text-white text-xs font-black rounded-full shadow-xs cursor-pointer flex items-center gap-1"
                  title="Open Customer 360 Workspace"
                >
                  <User className="w-3.5 h-3.5" />
                  360° Screen-Pop
                </button>

                <button
                  onClick={() => hangupCall(activeCall.id, 'General Inquiry')}
                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {/* Idle Buttons */}
                <button
                  onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
                  className="flex items-center gap-1 px-3 py-1 bg-sky-50 hover:bg-sky-100 text-[#00c0f3] text-xs font-extrabold rounded-full border border-sky-200 transition-colors cursor-pointer"
                  title="Simulate Inbound Customer Call"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Test Inbound Call</span>
                </button>

                {onOpenTelephonyHub && (
                  <button
                    onClick={onOpenTelephonyHub}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Open Full Call Center Telephony Hub"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
