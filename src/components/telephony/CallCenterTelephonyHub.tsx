import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  DollarSign,
  CreditCard,
  Calendar,
  Truck,
  AlertTriangle,
  Send,
  User,
  Clock,
  Sparkles,
  Settings,
  Code,
  FileText,
  Search,
  CheckCircle2,
  Box,
  Volume2,
  Mic,
  MicOff,
  ExternalLink,
  Check,
  Copy,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import {
  ClickSendConfig,
  ClickSendAccountInfo,
  loadClickSendConfig,
  saveClickSendConfig,
  fetchClickSendAccount,
  sendClickSendSms,
  formatAustralianMobile,
} from '../../services/clicksendService';
import {
  CustomerAccount,
  ContainerOrder,
  loadCustomerAccounts,
} from '../../services/customerPortalService';
import {
  TelephonyCall,
  getActiveCall,
  answerCall,
  holdCall,
  hangupCall,
  initiateInboundCall,
  loadTelephonyCalls,
  loadSmsConversations,
  subscribeToSmsConversations,
  sendSmsMessage,
  simulateCustomerInboundSms,
  loadTwilioConfig,
  saveTwilioConfig,
  generateTwilioTwiML,
  TwilioConfig,
  SmsConversation,
  CallDisposition,
  DamageReport,
  InsurancePolicy,
  loadDamageReports,
  loadInsurancePolicies,
} from '../../services/telephonyService';
import { Customer360Drawer } from './Customer360Drawer';

export const CallCenterTelephonyHub: React.FC = () => {
  const [activeCall, setActiveCall] = useState<TelephonyCall | null>(getActiveCall());
  const [callsHistory, setCallsHistory] = useState<TelephonyCall[]>(loadTelephonyCalls());
  const [smsConversations, setSmsConversations] = useState<SmsConversation[]>(loadSmsConversations());
  const [customers, setCustomers] = useState<CustomerAccount[]>(loadCustomerAccounts());
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-8021');
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>(loadTwilioConfig());
  const [damageReports, setDamageReports] = useState<DamageReport[]>(loadDamageReports());
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>(loadInsurancePolicies());

  // Sub-tabs in Telephony Hub
  const [hubTab, setHubTab] = useState<'screen_pop_360' | 'sms_hub' | 'calls_log' | 'twilio_infrastructure'>('screen_pop_360');

  // Customer search & selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string>(
    smsConversations[0]?.id || 'SMS-CONV-8021'
  );
  const [smsReplyText, setSmsReplyText] = useState('');
  const [simCustomerReplyText, setSimCustomerReplyText] = useState('Yes, that pickup time works great for us!');

  // Inbound simulation form
  const [simPhone, setSimPhone] = useState('0412 849 201');
  const [simEmail, setSimEmail] = useState('sarah.jenkins@gmail.com');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ClickSend Australian Gateway State
  const [clicksendConfig, setClicksendConfig] = useState<ClickSendConfig>(loadClickSendConfig());
  const [clicksendAccount, setClicksendAccount] = useState<ClickSendAccountInfo | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [gatewaySubTab, setGatewaySubTab] = useState<'clicksend' | 'twilio'>('clicksend');
  const [testSmsRecipient, setTestSmsRecipient] = useState('0412 849 201');
  const [testSmsText, setTestSmsText] = useState('Hi Sarah, your Portabox quote #PB-8021 for Adelaide Metro is confirmed! View quote: https://portabox.com.au/q/8021');
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<any>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    fetchClickSendAccount().then(setClicksendAccount).catch(() => {});
  }, []);

  const handleRefreshClickSendBalance = async () => {
    setIsCheckingBalance(true);
    try {
      const acct = await fetchClickSendAccount();
      setClicksendAccount(acct);
      showToast(acct.configured ? `ClickSend Account Balance: $${acct.balance?.toFixed(2)} ${acct.currency}` : 'ClickSend credentials required or in simulated sandbox');
    } catch {
      showToast('ClickSend balance check error');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleSaveClickSendConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveClickSendConfig(clicksendConfig);
    showToast('ClickSend Australian Gateway configuration saved!');
    handleRefreshClickSendBalance();
  };

  const handleSendTestClickSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSmsRecipient.trim() || !testSmsText.trim()) return;
    setIsSendingTestSms(true);
    setTestSmsResult(null);
    try {
      const res = await sendClickSendSms({
        to: testSmsRecipient,
        message: testSmsText,
        contactId: selectedCustomerId,
      });
      setTestSmsResult(res);
      showToast(res.simulated ? 'Test SMS Simulated (ClickSend sandbox)' : 'Test SMS Sent via ClickSend Australia!');
      await sendSmsMessage({
        customerPhone: testSmsRecipient,
        text: testSmsText,
        sender: 'agent',
        customerId: selectedCustomerId,
      });
    } catch (err: any) {
      setTestSmsResult({ success: false, error: err.message });
      showToast('ClickSend dispatch failed');
    } finally {
      setIsSendingTestSms(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portabox.com.au';
    const webhookUrl = `${origin}/api/clicksend/inbound`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    showToast('ClickSend Inbound Webhook URL copied!');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Sync state with custom event & real-time listeners
  useEffect(() => {
    const unsub = subscribeToSmsConversations(setSmsConversations);
    
    const handleUpdate = () => {
      setActiveCall(getActiveCall());
      setCallsHistory(loadTelephonyCalls());
      setCustomers(loadCustomerAccounts());
      setDamageReports(loadDamageReports());
      setInsurancePolicies(loadInsurancePolicies());
    };
    window.addEventListener('portabox-telephony-update', handleUpdate);
    
    return () => {
      unsub();
      window.removeEventListener('portabox-telephony-update', handleUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const selectedCustomer =
    (activeCall?.matchedCustomer ||
      customers.find((c) => c.id === selectedCustomerId) ||
      customers[0]) ?? null;

  const activeConversation =
    smsConversations.find((c) => c.id === activeConversationId) ||
    smsConversations[0] ||
    null;

  const handleSimulateCall = (phone: string, email?: string) => {
    const call = initiateInboundCall(phone, email);
    if (call.matchedCustomer) {
      setSelectedCustomerId(call.matchedCustomer.id);
    }
    setHubTab('screen_pop_360');
    showToast(`Incoming call initiated from ${phone}. IVR matching executed.`);
  };

  const handleSendAgentSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsReplyText.trim() || !activeConversation) return;

    await sendSmsMessage({
      customerPhone: activeConversation.customerPhone,
      customerEmail: activeConversation.customerEmail,
      customerName: activeConversation.customerName,
      customerId: activeConversation.customerId,
      text: smsReplyText.trim(),
      sender: 'agent',
    });
    setSmsReplyText('');
    showToast('SMS sent to customer.');
  };

  const handleSimulateCustomerReply = () => {
    if (!activeConversation || !simCustomerReplyText.trim()) return;
    simulateCustomerInboundSms(activeConversation.id, simCustomerReplyText.trim());
    setSmsConversations(loadSmsConversations());
    showToast('Simulated incoming customer SMS response received.');
  };

  const handleSaveTwilioConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveTwilioConfig(twilioConfig);
    showToast('Twilio Australian telephony credentials & webhook settings saved.');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-100 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* TOP HEADER: TELEPHONY COMMAND CENTER STATUS */}
      <div className="bg-[#0b2942] text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00c0f3] text-white flex items-center justify-center font-bold shadow-md">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight">
                  Portabox Twilio Telephony & Screen-Pop Hub
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  AU WebRTC Online
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Automated IVR caller email matching · WebRTC browser softphone · Instant 360° screen-pop · Two-way Australian SMS
              </p>
            </div>
          </div>

          {/* Key Contact Numbers */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 bg-white/10 rounded-2xl border border-white/10 text-xs text-right">
              <span className="text-[10px] text-sky-300 block uppercase font-bold">Australian Voice 1300</span>
              <span className="font-mono font-bold text-white">{twilioConfig.twilioVoiceNumber}</span>
            </div>
            <div className="px-3.5 py-2 bg-white/10 rounded-2xl border border-white/10 text-xs text-right">
              <span className="text-[10px] text-emerald-300 block uppercase font-bold">Australian SMS Line</span>
              <span className="font-mono font-bold text-white">{twilioConfig.twilioSmsNumber}</span>
            </div>
          </div>
        </div>

        {/* Live Call Center Telephony KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Caller Match Rate</span>
            <span className="text-lg font-extrabold text-emerald-400">98.4%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Auto phone / voice email match</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Avg Handle Time</span>
            <span className="text-lg font-extrabold text-sky-400">3m 12s</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Cut down by instant screen-pop</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Active SMS Threads</span>
            <span className="text-lg font-extrabold text-amber-400">{smsConversations.length}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Two-way text customer service</span>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Calls Handled Today</span>
            <span className="text-lg font-extrabold text-white">{callsHistory.length + 8}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">100% Australian metro hubs</span>
          </div>
        </div>
      </div>

      {/* QUICK INBOUND CALL SIMULATOR STRIP */}
      <div className="bg-sky-50/70 rounded-3xl p-4 border border-sky-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#00c0f3] text-white flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-[#0b2942] block">
              1-Click Inbound Call & Email Match Test Scenarios
            </span>
            <span className="text-slate-600 text-[11px]">
              Click any scenario below to trigger an incoming call ring with automated caller identification:
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSimulateCall('0412 849 201', 'sarah.jenkins@gmail.com')}
            className="px-3.5 py-2 bg-white hover:bg-sky-100 text-[#0b2942] font-bold rounded-xl border border-sky-300 shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-[#00c0f3]" />
            <span>Sarah Jenkins (Adelaide 25m³)</span>
          </button>

          <button
            onClick={() => handleSimulateCall('0433 912 304', 'david.miller@builderpro.com.au')}
            className="px-3.5 py-2 bg-white hover:bg-purple-100 text-[#0b2942] font-bold rounded-xl border border-purple-300 shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-purple-600" />
            <span>David Miller (25m³ Large)</span>
          </button>

          <button
            onClick={() => handleSimulateCall('0488 999 111', 'sarah.jenkins@gmail.com')}
            className="px-3.5 py-2 bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span>New Phone + Spoken Email Test</span>
          </button>
        </div>
      </div>

      {/* HUB NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setHubTab('screen_pop_360')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold transition-all cursor-pointer ${
            hubTab === 'screen_pop_360'
              ? 'bg-[#00c0f3] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Customer 360° Screen-Pop Workspace</span>
        </button>

        <button
          onClick={() => setHubTab('sms_hub')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold transition-all cursor-pointer ${
            hubTab === 'sms_hub'
              ? 'bg-[#00c0f3] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Two-Way SMS Customer Hub ({smsConversations.length})</span>
        </button>

        <button
          onClick={() => setHubTab('calls_log')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold transition-all cursor-pointer ${
            hubTab === 'calls_log'
              ? 'bg-[#00c0f3] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Telephony Call Audit Log ({callsHistory.length})</span>
        </button>

        <button
          onClick={() => setHubTab('twilio_infrastructure')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold transition-all cursor-pointer ${
            hubTab === 'twilio_infrastructure'
              ? 'bg-[#00c0f3] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Telephony & SMS Gateway (ClickSend & Twilio)</span>
        </button>
      </div>

      {/* ================= TAB 1: CUSTOMER 360 SCREEN-POP WORKSPACE ================= */}
      {hubTab === 'screen_pop_360' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Customer Selector & Search */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#0b2942] text-xs uppercase tracking-wider">
                Select Customer Account
              </h3>
              <span className="text-[11px] text-slate-400 font-mono font-bold">
                {customers.length} Accounts
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name, email, phone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {customers
                .filter(
                  (c) =>
                    !customerSearch ||
                    `${c.firstName} ${c.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    c.mobile.includes(customerSearch)
                )
                .map((cust) => {
                  const isSelected = selectedCustomer?.id === cust.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#00c0f3] bg-sky-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">
                          {cust.firstName} {cust.lastName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{cust.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">{cust.email}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100">
                        <span className="font-mono">{cust.mobile}</span>
                        <span className="font-bold text-sky-700">
                          {cust.orders.length} Box{cust.orders.length > 1 ? 'es' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right: Embedded Interactive 360 Workspace */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            {selectedCustomer ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#00c0f3] text-white flex items-center justify-center font-extrabold text-lg">
                      {selectedCustomer.firstName.charAt(0)}
                      {selectedCustomer.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-[#0b2942]">
                          {selectedCustomer.firstName} {selectedCustomer.lastName}
                        </h3>
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {selectedCustomer.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedCustomer.email} · {selectedCustomer.mobile} · {selectedCustomer.suburb}, {selectedCustomer.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSimulateCall(selectedCustomer.mobile, selectedCustomer.email)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5 fill-white" />
                      Simulate Incoming Call
                    </button>
                  </div>
                </div>

                {/* 360 Fast Action Hub Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Active Orders</span>
                    <span className="text-base font-extrabold text-[#0b2942]">
                      {selectedCustomer.orders.length} Container{selectedCustomer.orders.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {selectedCustomer.orders[0]?.containerName || 'None'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Payment Plan</span>
                    <span className="text-base font-extrabold text-emerald-700">
                      ${selectedCustomer.paymentPlan?.periodicAmount || 259}/mo
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Autopay {selectedCustomer.paymentPlan?.autopayEnabled ? 'Enabled' : 'Off'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Card on File</span>
                    <span className="text-base font-extrabold text-slate-800">
                      {selectedCustomer.paymentPlan?.cardBrand} •••• {selectedCustomer.paymentPlan?.cardLast4}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Exp {selectedCustomer.paymentPlan?.cardExpiry}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Ledger Balance</span>
                    <span className="text-base font-extrabold text-sky-700">
                      ${selectedCustomer.transactions.filter(t => t.status === 'Paid').reduce((acc, t) => acc + t.amount, 0)} Paid
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedCustomer.transactions.length} Transactions
                    </span>
                  </div>
                </div>

                {/* Container Orders Overview */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">
                    Containers on Site
                  </h4>
                  {selectedCustomer.orders.map((ord) => (
                    <div key={ord.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{ord.containerName}</span>
                          <span className="font-mono text-sky-700 font-bold">({ord.containerId})</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{ord.location}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {ord.status}
                        </span>
                        <span className="text-slate-600 font-mono text-[11px]">
                          Driver: {ord.driverName || 'Adelaide Fleet'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Instruction Banner to open full Action Drawer */}
                <div className="p-4 bg-[#0b2942] text-white rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs block">Need to Execute In-Call Changes?</span>
                    <span className="text-xs text-slate-300">
                      Process refunds, modify billing plans, update credit cards, extend rental, or log container damage.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      // Trigger custom event or trigger open
                      const fakeCall = activeCall || {
                        id: 'LIVE-MANUAL',
                        direction: 'inbound',
                        callerPhone: selectedCustomer.mobile,
                        callerEmail: selectedCustomer.email,
                        callerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
                        customerId: selectedCustomer.id,
                        matchedCustomer: selectedCustomer,
                        status: 'connected',
                        startTime: Date.now(),
                        durationSeconds: 120,
                        ivrStep: 'agent_routed',
                        ivrInputType: 'auto_phone_match',
                        ivrTranscript: 'Manual screen-pop selected by staff.',
                        actionLog: [],
                      };
                      window.dispatchEvent(
                        new CustomEvent('portabox-open-screen-pop', {
                          detail: { customer: selectedCustomer, call: fakeCall },
                        })
                      );
                    }}
                    className="px-4 py-2 bg-[#00c0f3] hover:bg-[#00ace0] text-white font-extrabold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Open Full 360° Drawer
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ================= TAB 2: TWO-WAY SMS MESSAGING HUB ================= */}
      {hubTab === 'sms_hub' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Conversation List */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-[#0b2942] text-xs uppercase tracking-wider mb-2">
              SMS Inbound / Outbound Conversations
            </h3>

            <div className="space-y-2">
              {smsConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const lastMsg = conv.messages[conv.messages.length - 1];
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#00c0f3] bg-sky-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-900">
                        {conv.customerName || conv.customerPhone}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{conv.lastMessageAt}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] truncate">{lastMsg?.text || 'No messages'}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                      <span>{conv.customerPhone}</span>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold">
                          {conv.unreadCount} new
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Chat Conversation Panel */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            {activeConversation ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-[#0b2942]">
                      {activeConversation.customerName || 'Portabox Customer'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {activeConversation.customerPhone} · Connected via Twilio Australian SMS (+61 488 880 123)
                    </p>
                  </div>

                  {/* Simulator Inbound Customer Reply */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={simCustomerReplyText}
                      onChange={(e) => setSimCustomerReplyText(e.target.value)}
                      placeholder="Simulate customer reply..."
                      className="p-2 rounded-xl border border-slate-200 text-xs w-48 hidden sm:block"
                    />
                    <button
                      onClick={handleSimulateCustomerReply}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
                      title="Simulate customer typing back from their phone"
                    >
                      Simulate Inbound SMS
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="h-80 overflow-y-auto space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {activeConversation.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'customer' ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs ${
                          m.sender === 'customer'
                            ? 'bg-white border border-slate-200 text-slate-800'
                            : 'bg-[#00c0f3] text-white shadow-xs'
                        }`}
                      >
                        <p>{m.text}</p>
                        {m.actionUrl && (
                          <a
                            href={m.actionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block mt-1 font-mono text-[10px] underline opacity-90"
                          >
                            {m.actionUrl}
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1">
                        {m.sender === 'customer' ? activeConversation.customerName : 'Portabox'} • {m.timestamp}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Agent Reply Form */}
                <form onSubmit={handleSendAgentSms} className="flex gap-2">
                  <input
                    type="text"
                    value={smsReplyText}
                    onChange={(e) => setSmsReplyText(e.target.value)}
                    placeholder="Type two-way SMS message to customer..."
                    className="flex-1 p-3 rounded-xl border border-slate-200 bg-white text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!smsReplyText.trim()}
                    className="px-6 py-3 bg-[#00c0f3] hover:bg-[#00ace0] disabled:opacity-50 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2 text-xs"
                  >
                    <Send className="w-4 h-4" />
                    Send SMS
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ================= TAB 3: TELEPHONY CALLS LOG ================= */}
      {hubTab === 'calls_log' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-[#0b2942] text-sm">
              Inbound Call Records & Customer Screen-Pop History
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Retention: 50 calls
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5">Call ID</th>
                  <th className="py-2.5">Caller ID</th>
                  <th className="py-2.5">Matched Customer</th>
                  <th className="py-2.5">IVR Verification</th>
                  <th className="py-2.5">Duration</th>
                  <th className="py-2.5">Disposition</th>
                  <th className="py-2.5 text-right">Actions Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {callsHistory.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="py-3 font-mono font-bold text-slate-700">{call.id}</td>
                    <td className="py-3 font-mono font-medium text-slate-800">{call.callerPhone}</td>
                    <td className="py-3 font-semibold text-[#0b2942]">
                      {call.callerName || 'Unregistered Caller'}
                      {call.callerEmail && (
                        <span className="block text-[11px] text-slate-500 font-normal">{call.callerEmail}</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-600">
                      <span className="font-bold text-emerald-700 block">{call.ivrInputType}</span>
                      <span className="text-[11px] text-slate-500 truncate max-w-xs block">
                        {call.ivrTranscript}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-[#00c0f3]">
                        {call.disposition || 'General Inquiry'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-mono font-bold text-slate-700">
                        {call.actionLog?.length || 0} event{call.actionLog?.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: TELEPHONY & SMS GATEWAY INFRASTRUCTURE ================= */}
      {hubTab === 'twilio_infrastructure' && (
        <div className="space-y-6">
          {/* Sub Navigation Switch */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
            <button
              type="button"
              onClick={() => setGatewaySubTab('clicksend')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                gatewaySubTab === 'clicksend'
                  ? 'bg-[#0b2942] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>ClickSend Australia (Direct SMS & Webhooks)</span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full">
                Primary SMS
              </span>
            </button>
            <button
              type="button"
              onClick={() => setGatewaySubTab('twilio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                gatewaySubTab === 'twilio'
                  ? 'bg-[#0b2942] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>Twilio (Voice Media Stream & TwiML Softphone)</span>
            </button>
          </div>

          {/* ================= SUB-TAB 1: CLICKSEND AUSTRALIAN SMS GATEWAY ================= */}
          {gatewaySubTab === 'clicksend' && (
            <div className="space-y-6">
              {/* Australian Carrier Banner */}
              <div className="bg-gradient-to-r from-[#0b2942] via-[#0d3455] to-[#00c0f3]/40 text-white rounded-3xl p-6 border border-slate-800 shadow-lg flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#00c0f3] text-white flex items-center justify-center font-bold shadow-md shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base">ClickSend Australian Tier-1 Direct SMS Route</h3>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                        ACMA Compliant
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Portabox utilizes ClickSend for direct SMPP routes to Telstra, Optus, and TPG Vodafone. Delivers sub-second quote delivery, 2-way inbound customer replies, native AUD billing (~$0.045/SMS), and custom alphanumeric sender ID <span className="font-mono text-sky-300 font-bold">"Portabox"</span>.
                    </p>
                  </div>
                </div>

                {/* Account Balance Widget */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[210px] text-right">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">ClickSend AUD Balance</span>
                    <button
                      type="button"
                      onClick={handleRefreshClickSendBalance}
                      disabled={isCheckingBalance}
                      className="text-xs text-sky-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingBalance ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {clicksendAccount?.balance !== undefined && clicksendAccount?.balance !== null
                      ? `$${clicksendAccount.balance.toFixed(2)} ${clicksendAccount.currency || 'AUD'}`
                      : clicksendConfig.username && clicksendConfig.apiKey
                      ? 'Live Active'
                      : '$0.00 AUD (Sandbox)'}
                  </div>
                  <span className="text-[10px] text-emerald-300 block mt-0.5 font-medium">
                    {clicksendAccount?.configured
                      ? `Account: ${clicksendAccount.username || clicksendConfig.username}`
                      : 'Simulated dispatch active until keys set'}
                  </span>
                </div>
              </div>

              {/* Configuration and Live Test Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* ClickSend Settings Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#00c0f3]" />
                      ClickSend API v3 Credentials
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-sky-50 text-[#00c0f3] px-2 py-0.5 rounded">
                      rest.clicksend.com/v3
                    </span>
                  </div>

                  <form onSubmit={handleSaveClickSendConfig} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">ClickSend Username / Email</label>
                      <input
                        type="text"
                        value={clicksendConfig.username}
                        onChange={(e) => setClicksendConfig({ ...clicksendConfig, username: e.target.value })}
                        placeholder="e.g. accounts@portabox.com.au or clicksend_username"
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-[#00c0f3] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">ClickSend API Key</label>
                      <input
                        type="password"
                        value={clicksendConfig.apiKey}
                        onChange={(e) => setClicksendConfig({ ...clicksendConfig, apiKey: e.target.value })}
                        placeholder="e.g. 55B5A245-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-[#00c0f3] outline-hidden"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Obtained from ClickSend Dashboard &gt; Developers &gt; API Credentials.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Sender ID (From)</label>
                        <input
                          type="text"
                          value={clicksendConfig.senderId}
                          onChange={(e) => setClicksendConfig({ ...clicksendConfig, senderId: e.target.value })}
                          placeholder="Portabox or 0412345678"
                          className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-[#00c0f3] outline-hidden"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Alphanumeric "Portabox" or AU Virtual Number
                        </span>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1">Delivery Receipts (DLR)</label>
                        <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-mono text-xs">
                          Direct Carrier DLR
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clicksendConfig.enabled}
                          onChange={(e) => setClicksendConfig({ ...clicksendConfig, enabled: e.target.checked })}
                          className="rounded text-[#00c0f3] focus:ring-[#00c0f3]"
                        />
                        <span className="font-bold text-slate-700">
                          Route All Outbound Australian SMS via ClickSend
                        </span>
                      </label>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        Save ClickSend Settings
                      </button>
                    </div>
                  </form>
                </div>

                {/* Interactive Test SMS Dispatcher */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#00c0f3]" />
                      Live ClickSend Australian Test Dispatcher
                    </h4>
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
                      Ready to Test
                    </span>
                  </div>

                  <form onSubmit={handleSendTestClickSendSms} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Destination Australian Mobile Number</label>
                      <input
                        type="text"
                        value={testSmsRecipient}
                        onChange={(e) => setTestSmsRecipient(e.target.value)}
                        placeholder="e.g. 0412 849 201 or +61412849201"
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-[#00c0f3] outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Auto-normalizes to E.164 Australian international format (+614...).
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-600 font-bold">SMS Body</label>
                        <span className="text-[10px] font-mono text-slate-400">
                          {testSmsText.length}/160 chars ({Math.ceil(testSmsText.length / 160) || 1} segment)
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={testSmsText}
                        onChange={(e) => setTestSmsText(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00c0f3] outline-hidden resize-none"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[11px] text-slate-500">
                        Est. Cost: <span className="font-bold text-slate-800">$0.045 AUD</span>
                      </span>

                      <button
                        type="submit"
                        disabled={isSendingTestSms || !testSmsRecipient.trim() || !testSmsText.trim()}
                        className="px-5 py-2.5 bg-[#00c0f3] hover:bg-[#00ace0] disabled:opacity-50 text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2 text-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingTestSms ? 'Transmitting...' : 'Send Test SMS via ClickSend'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Dispatch Receipt Feedback */}
                  {testSmsResult && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs space-y-1.5 animate-in fade-in ${
                        testSmsResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            {testSmsResult.simulated
                              ? 'Simulation Succeeded (Credentials not configured)'
                              : 'Dispatched to ClickSend Direct SMPP'}
                          </span>
                        </span>
                        <span className="font-mono text-[10px]">
                          {testSmsResult.messageId || 'M-OK'}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        {testSmsResult.simulated
                          ? 'Message recorded in Portabox Two-Way SMS Hub. To send real SMS to mobile devices, input your ClickSend API Key.'
                          : `Successfully delivered to carrier gateway. Cost: $${(testSmsResult.cost || 0.045).toFixed(3)} ${testSmsResult.currency || 'AUD'}.`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inbound Two-Way Webhook Setup Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#00c0f3]" />
                    Two-Way SMS Inbound Webhook (Customer Replies)
                  </h4>
                  <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    POST Webhook
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  When Australian customers reply to Portabox SMS notifications (such as confirming delivery dates, asking container size questions, or submitting dunning responses), ClickSend forwards the incoming message payload to this webhook. The message automatically pops into the Portabox Two-Way SMS Workspace and links to the customer profile.
                </p>

                <div className="space-y-2">
                  <label className="block text-slate-600 font-bold text-xs">
                    Your Portabox Inbound Webhook URL (Paste into ClickSend Dashboard)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'https://portabox.com.au'}/api/clicksend/inbound`}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 font-mono text-xs bg-slate-50 text-slate-700 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedWebhook ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-[#0b2942] block mb-1">1. Get Dedicated AU Number</span>
                    <p className="text-slate-500 text-[11px]">
                      Under ClickSend &gt; SMS &gt; Dedicated Numbers, allocate an Australian 04xx virtual mobile number.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-[#0b2942] block mb-1">2. Configure Inbound Rule</span>
                    <p className="text-slate-500 text-[11px]">
                      Under ClickSend &gt; SMS &gt; Inbound SMS &gt; Rules, set Action to "Forward to URL" with POST format.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="font-bold text-[#0b2942] block mb-1">3. Instant Screen-Pop</span>
                    <p className="text-slate-500 text-[11px]">
                      Customer replies are matched to accounts and display live with notification badges in the Portabox portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= SUB-TAB 2: TWILIO VOICE & TWIML ================= */}
          {gatewaySubTab === 'twilio' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Settings Form */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-extrabold text-[#0b2942] text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#00c0f3]" />
                  Twilio Australian Telephony Credentials
                </h3>

                <form onSubmit={handleSaveTwilioConfig} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Twilio Account SID</label>
                    <input
                      type="text"
                      value={twilioConfig.accountSid}
                      onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Twilio Auth Token</label>
                    <input
                      type="password"
                      value={twilioConfig.authTokenMasked}
                      onChange={(e) => setTwilioConfig({ ...twilioConfig, authTokenMasked: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Australian 1300 / Voice Number</label>
                      <input
                        type="text"
                        value={twilioConfig.twilioVoiceNumber}
                        onChange={(e) => setTwilioConfig({ ...twilioConfig, twilioVoiceNumber: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Australian Mobile SMS Number</label>
                      <input
                        type="text"
                        value={twilioConfig.twilioSmsNumber}
                        onChange={(e) => setTwilioConfig({ ...twilioConfig, twilioSmsNumber: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">IVR Australian Voice Profile</label>
                    <select
                      value={twilioConfig.ivrGreetingVoice}
                      onChange={(e) => setTwilioConfig({ ...twilioConfig, ivrGreetingVoice: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                    >
                      <option value="Polly.Nicole (Australian English Female)">
                        Polly.Nicole (Australian English Female - Natural)
                      </option>
                      <option value="Polly.Russell-Neural (Australian English Male)">
                        Polly.Russell-Neural (Australian English Male - Natural)
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twilioConfig.autoScreenPop}
                        onChange={(e) => setTwilioConfig({ ...twilioConfig, autoScreenPop: e.target.checked })}
                        className="rounded text-[#00c0f3]"
                      />
                      <span className="font-bold text-slate-700">
                        Automatic Screen-Pop: instantly open caller history when call connects
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twilioConfig.soundEffectsEnabled}
                        onChange={(e) => setTwilioConfig({ ...twilioConfig, soundEffectsEnabled: e.target.checked })}
                        className="rounded text-[#00c0f3]"
                      />
                      <span className="font-bold text-slate-700">
                        Audible Web Audio ring chime for incoming calls
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      Save Twilio Settings
                    </button>
                  </div>
                </form>
              </div>

              {/* Generated TwiML XML Preview */}
              <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <Code className="w-4 h-4 text-[#00c0f3]" />
                    Live Generated Twilio TwiML Response
                  </h3>
                  <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-2 py-0.5 rounded">
                    IVR Voice XML
                  </span>
                </div>

                <p className="text-slate-400 text-xs">
                  When an Australian customer calls Portabox, Twilio executes this exact TwiML XML to collect their email address and route them to our browser softphone:
                </p>

                <pre className="p-4 bg-slate-950 rounded-2xl text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
                  {generateTwilioTwiML(selectedCustomer?.mobile || '0412849201', selectedCustomer)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
