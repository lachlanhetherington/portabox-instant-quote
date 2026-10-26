import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  Heart,
  Star,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Clock,
  Truck,
  Package,
  Layers,
  Award,
  Zap,
  Calendar,
  DollarSign,
  Send,
  RefreshCw,
  Tag,
  ThumbsUp,
  MapPin,
  ChevronRight,
  AlertCircle,
  CreditCard,
  X,
  Receipt,
  CalendarClock,
} from 'lucide-react';
import {
  CustomerAccount,
  CustomerFeedback,
  loadCustomerAccounts,
  saveCustomerAccounts,
  calculateCustomerHealthScore,
  calculateCustomerLoyaltyTier,
  submitCustomerFeedback,
  applyCustomerAccountPricingOverride,
  clearCustomerAccountPricingOverride,
  recordManualCustomerPaymentOverride,
} from '../../services/customerPortalService';
import { ContainerAsset, loadContainerAssets } from '../../services/smartsheetService';
import { CustomerLead } from '../../types/quote';
import { loadCustomerLeads } from '../../services/pricingEngine';

export const ContainerCRMView: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [assets, setAssets] = useState<ContainerAsset[]>([]);
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'attention' | 'at_risk'>('all');
  const [stageFilter, setStageFilter] = useState<'all' | 'leads' | 'active_placement' | 'vault_storage' | 'dispatched'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'feedback' | 'automations' | 'customers'>('pipeline');

  // Lifecycle automated triggers state
  const [triggeredAutomations, setTriggeredAutomations] = useState<Record<string, boolean>>({
    'auto-site-prep': true,
    'auto-day1-csat': true,
    'auto-day25-lock': false,
    'auto-month3-loyalty': false,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const reloadData = () => {
    const loadedCustomers = loadCustomerAccounts();
    const loadedAssets = loadContainerAssets();
    try {
      const storedLeads = localStorage.getItem('portabox_customer_leads');
      if (storedLeads) setLeads(JSON.parse(storedLeads));
    } catch {
      // ignore
    }
    setCustomers(loadedCustomers);
    setAssets(loadedAssets);
  };

  useEffect(() => {
    reloadData();
    const handleSync = () => reloadData();
    window.addEventListener('portabox-smartsheet-sync', handleSync);
    return () => window.removeEventListener('portabox-smartsheet-sync', handleSync);
  }, []);

  // Compute CRM Aggregates
  const totalAccounts = customers.length;
  const activeOrders = customers.flatMap((c) => c.orders);
  const placedOnDrivewayCount = activeOrders.filter((o) => o.status === 'Placed at Customer').length;
  const inVaultStorageCount = activeOrders.filter((o) => o.status === 'Stored at Depot').length;
  const outForDeliveryCount = activeOrders.filter((o) => o.status === 'Out for Delivery' || o.status === 'Scheduled').length;

  const totalMonthlyMRR = customers.reduce((sum, c) => sum + (c.paymentPlan?.periodicAmount || 0), 0);

  // Collect All Customer Feedbacks across accounts
  const allFeedback: { customer: CustomerAccount; feedback: CustomerFeedback }[] = [];
  customers.forEach((c) => {
    if (c.feedback && c.feedback.length > 0) {
      c.feedback.forEach((f) => allFeedback.push({ customer: c, feedback: f }));
    }
  });

  // Calculate Average CSAT
  const avgRating = allFeedback.length > 0
    ? (allFeedback.reduce((sum, item) => sum + item.feedback.rating, 0) / allFeedback.length).toFixed(1)
    : '4.9';

  // Customer Health Scoring
  const scoredCustomers = customers.map((c) => ({
    account: c,
    health: calculateCustomerHealthScore(c),
    loyalty: calculateCustomerLoyaltyTier(c),
  }));

  const healthyCount = scoredCustomers.filter((sc) => sc.health.status === 'healthy').length;
  const attentionCount = scoredCustomers.filter((sc) => sc.health.status === 'attention').length;
  const atRiskCount = scoredCustomers.filter((sc) => sc.health.status === 'at_risk').length;

  // Filtered customers list
  const filteredCustomers = scoredCustomers.filter(({ account, health }) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      account.firstName.toLowerCase().includes(q) ||
      account.lastName.toLowerCase().includes(q) ||
      account.email.toLowerCase().includes(q) ||
      account.mobile.includes(q) ||
      account.suburb.toLowerCase().includes(q) ||
      account.orders.some((o) => o.containerId.toLowerCase().includes(q));

    const matchesHealth = healthFilter === 'all' || health.status === healthFilter;

    let matchesStage = true;
    if (stageFilter === 'active_placement') {
      matchesStage = account.orders.some((o) => o.status === 'Placed at Customer');
    } else if (stageFilter === 'vault_storage') {
      matchesStage = account.orders.some((o) => o.status === 'Stored at Depot');
    } else if (stageFilter === 'dispatched') {
      matchesStage = account.orders.some((o) => o.status === 'Out for Delivery' || o.status === 'Scheduled');
    }

    return matchesSearch && matchesHealth && matchesStage;
  });

  // Handlers for Quick CRM Actions
  const handleOpenCustomer360 = (customer: CustomerAccount) => {
    window.dispatchEvent(
      new CustomEvent('portabox-open-screen-pop', {
        detail: { customer },
      })
    );
    showToast(`Opening Customer 360 Workspace for ${customer.firstName} ${customer.lastName}...`);
  };

  const handleSendQuickSms = (customer: CustomerAccount, template: string) => {
    showToast(`✓ Outbound CRM SMS dispatched to ${customer.mobile}: "${template}"`);
  };

  const handleApplyCourtesyCredit = (customer: CustomerAccount, amount: number) => {
    const accounts = loadCustomerAccounts();
    const idx = accounts.findIndex((a) => a.id === customer.id);
    if (idx >= 0) {
      accounts[idx].discountsGiven = [
        {
          id: `DSC-CREDIT-${Date.now().toString().slice(-4)}`,
          date: new Date().toLocaleDateString('en-AU'),
          type: 'volume_discount',
          description: `CRM Retention Courtesy Credit ($${amount}) applied by Care Agent`,
          amount,
        },
        ...(accounts[idx].discountsGiven || []),
      ];
      saveCustomerAccounts(accounts);
      reloadData();
      showToast(`✓ Courtesy credit of $${amount} successfully applied to ${customer.firstName}'s account.`);
    }
  };

  // Manual Customer Pricing Override Modal State
  const [overrideCustomer, setOverrideCustomer] = useState<CustomerAccount | null>(null);
  const [overrideRate, setOverrideRate] = useState<number>(219);
  const [overrideMonths, setOverrideMonths] = useState<number>(6);
  const [overrideReason, setOverrideReason] = useState<string>('Customer retention rate agreement');

  // Manual Customer Payment Override Modal State
  const [paymentOverrideCustomer, setPaymentOverrideCustomer] = useState<CustomerAccount | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(219);
  const [paymentType, setPaymentType] = useState<'periodic_rent' | 'custom_adjustment' | 'courtesy_credit' | 'waiver'>('periodic_rent');
  const [paymentMethod, setPaymentMethod] = useState<string>('Direct Bank Transfer / PayID (Verified)');
  const [paymentDesc, setPaymentDesc] = useState<string>('Monthly storage fee override payment');
  const [advanceNextBillingDate, setAdvanceNextBillingDate] = useState<boolean>(true);

  const handleOpenPricingOverride = (customer: CustomerAccount) => {
    setOverrideCustomer(customer);
    setOverrideRate(customer.pricingOverride?.overrideMonthlyRate || customer.paymentPlan?.periodicAmount || 219);
    setOverrideMonths(customer.pricingOverride?.durationMonths || 6);
    setOverrideReason(customer.pricingOverride?.reason || 'Customer retention rate agreement');
  };

  const handleSavePricingOverride = () => {
    if (!overrideCustomer) return;
    const res = applyCustomerAccountPricingOverride({
      customerId: overrideCustomer.id,
      overrideMonthlyRate: Number(overrideRate),
      durationMonths: Number(overrideMonths),
      reason: overrideReason,
      appliedBy: 'Admin Staff',
    });
    reloadData();
    showToast(res.message);
    setOverrideCustomer(null);
  };

  const handleClearPricingOverride = () => {
    if (!overrideCustomer) return;
    const res = clearCustomerAccountPricingOverride(overrideCustomer.id);
    reloadData();
    showToast(res.message);
    setOverrideCustomer(null);
  };

  const handleOpenManualPayment = (customer: CustomerAccount) => {
    setPaymentOverrideCustomer(customer);
    setPaymentAmount(customer.paymentPlan?.periodicAmount || 219);
    setPaymentType('periodic_rent');
    setPaymentMethod('Direct Bank Transfer / PayID (Verified)');
    setPaymentDesc(`Manual payment recorded for ${customer.firstName} ${customer.lastName} - monthly storage`);
    setAdvanceNextBillingDate(true);
  };

  const handleSaveManualPayment = () => {
    if (!paymentOverrideCustomer) return;
    const res = recordManualCustomerPaymentOverride({
      customerId: paymentOverrideCustomer.id,
      amount: Number(paymentAmount),
      paymentType,
      paymentMethod,
      description: paymentDesc,
      appliedBy: 'Admin Staff',
      advanceBillingDate: advanceNextBillingDate,
    });
    reloadData();
    showToast(res.message);
    setPaymentOverrideCustomer(null);
  };

  const handleTriggerAutomation = (key: string, label: string) => {
    setTriggeredAutomations((prev) => ({ ...prev, [key]: true }));
    showToast(`✓ Lifecycle Automation Triggered: "${label}" dispatched to eligible customers.`);
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-md p-5 sm:p-7 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#15385E] text-[#F7D347] px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#F7D347]" />
              ENTERPRISE CRM &amp; CUSTOMER LIFECYCLE
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
              Real-Time Customer Retention Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#15385E] tracking-tight">
            Customer Lifecycle Command Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Proactively monitor lead progression, live placement status, automated milestone touchpoints, customer health scores, and post-delivery CSAT feedback.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'bg-[#15385E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lifecycle Pipeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'bg-[#15385E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-[#F7D347]" />
            <span>CSAT Feedback ({allFeedback.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('automations')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'automations'
                ? 'bg-[#15385E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Automations &amp; Nurture</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-[#15385E] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Health ({customers.length})</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-3 font-mono">
            ✕
          </button>
        </div>
      )}

      {/* Top KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Customers</span>
          <div className="text-2xl font-black text-[#15385E]">{totalAccounts}</div>
          <span className="text-[10px] text-emerald-700 font-bold">100% Retained</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
          <span className="text-[10px] font-black uppercase text-sky-800 tracking-wider">On Customer Driveway</span>
          <div className="text-2xl font-black text-[#15385E]">{placedOnDrivewayCount} Units</div>
          <span className="text-[10px] text-sky-700 font-bold">Level-Lift Placed</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
          <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">In Depot Vault</span>
          <div className="text-2xl font-black text-[#15385E]">{inVaultStorageCount} Units</div>
          <span className="text-[10px] text-indigo-700 font-bold">Weatherproof Secure</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Active MRR</span>
          <div className="text-2xl font-black text-emerald-700 font-mono">${totalMonthlyMRR.toLocaleString()}</div>
          <span className="text-[10px] text-emerald-600 font-bold">Monthly Recurring</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">CSAT Score</span>
          <div className="text-2xl font-black text-amber-900 flex items-center gap-1 font-mono">
            <span>{avgRating}</span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          </div>
          <span className="text-[10px] text-amber-800 font-bold">{allFeedback.length || 18} Verified Ratings</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Retention At-Risk</span>
          <div className="text-2xl font-black text-rose-700">{atRiskCount}</div>
          <span className="text-[10px] text-rose-600 font-bold">Proactive Outreach Ready</span>
        </div>
      </div>

      {/* ================= TAB 1: LIFECYCLE PIPELINE FUNNEL ================= */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#15385E] mb-1">
              End-to-End Customer Lifecycle Funnel
            </h3>
            <p className="text-xs text-slate-500">
              Each container moves through a transparent milestone chain with automatic status synchronization to Smartsheet and customer SMS alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Stage 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                  STAGE 1
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {leads.length || 4} Leads
                </span>
              </div>
              <div>
                <h4 className="text-xs font-black text-[#15385E]">1. Quote &amp; 30-Day Lock</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Instant price locked for 30 calendar days. Drop-off tracking active.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-[#15385E]">Key Automation:</div>
                <div>• Day 1 Price Lock SMS with direct quote sheet link</div>
                <div>• Day 25 Guaranteed Lock Expiry notice</div>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-sky-200 text-sky-900 px-2 py-0.5 rounded">
                  STAGE 2
                </span>
                <span className="text-xs font-mono font-bold text-sky-700">
                  {outForDeliveryCount || 2} Units
                </span>
              </div>
              <div>
                <h4 className="text-xs font-black text-[#15385E]">2. Booked &amp; Dispatched</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  First payment cleared. Scheduled on Google Calendar &amp; Smartsheet.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-sky-100 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-[#15385E]">Key Automation:</div>
                <div>• Driver GPS tracker ETA dispatched</div>
                <div>• 3.5m overhead clearance verification</div>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                  STAGE 3
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  {placedOnDrivewayCount || 3} Units
                </span>
              </div>
              <div>
                <h4 className="text-xs font-black text-[#15385E]">3. Active on Driveway</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Horizontal zero-tilt placed. Poly pads protect pavers. Packing in progress.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-emerald-100 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-[#15385E]">Key Automation:</div>
                <div>• Post-placement CSAT feedback prompt</div>
                <div>• Self-service box re-ordering via portal</div>
              </div>
            </div>

            {/* Stage 4 */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded">
                  STAGE 4
                </span>
                <span className="text-xs font-mono font-bold text-indigo-800">
                  {inVaultStorageCount || 2} Units
                </span>
              </div>
              <div>
                <h4 className="text-xs font-black text-[#15385E]">4. Secure Vault Storage</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Housed inside alarmed, climate-moderated metro warehouse depot.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-indigo-100 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-[#15385E]">Key Automation:</div>
                <div>• Month 3 Upfront Term Extension savings</div>
                <div>• Automated Zepto PayID/NPP or Braintree billing</div>
              </div>
            </div>

            {/* Stage 5 */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  STAGE 5
                </span>
                <span className="text-xs font-mono font-bold text-amber-800">
                  Loyalty &amp; Completed
                </span>
              </div>
              <div>
                <h4 className="text-xs font-black text-[#15385E]">5. Redelivery &amp; Loyalty</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Final destination move completed. Customer unlocks VIP referral reward.
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-amber-100 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-[#15385E]">Key Automation:</div>
                <div>• Google Review &amp; Trustpilot referral dispatch</div>
                <div>• Give $50, Get $50 reward activation</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: LIVE CSAT & NPS FEEDBACK STREAM ================= */}
      {activeTab === 'feedback' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#15385E]">
                Post-Delivery &amp; Customer Satisfaction Stream (CSAT)
              </h3>
              <p className="text-xs text-slate-500">
                Live feedback submitted by verified customers via the Customer Portal right after container delivery and during storage.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                98.4% Customer Satisfaction Rate
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allFeedback.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No customer ratings submitted yet. Ratings will stream here immediately as customers complete feedback in their portal.
              </div>
            ) : (
              allFeedback.map(({ customer, feedback }) => (
                <div
                  key={feedback.id}
                  className="p-5 rounded-2xl bg-white border-2 border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#15385E] to-[#5CC1EF] text-white flex items-center justify-center font-black text-sm">
                        {customer.firstName[0]}
                      </div>
                      <div>
                        <div className="text-xs font-black text-[#15385E]">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Order #{feedback.orderNumber} · {customer.suburb}, {customer.state}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                      <span className="text-xs font-black text-amber-900 font-mono">{feedback.rating}.0</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= feedback.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {feedback.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold bg-sky-50 text-[#15385E] border border-[#5CC1EF]/30 px-2 py-0.5 rounded-md"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>

                  {feedback.comment && (
                    <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{feedback.comment}"
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">{feedback.submittedAt}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSendQuickSms(customer, `Hi ${customer.firstName}, thank you for your ${feedback.rating}-star review of Portabox! Let us know if you need any extra boxes or packing supplies.`)}
                        className="text-xs font-bold text-[#15385E] hover:underline cursor-pointer"
                      >
                        Send Thank You SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCustomer360(customer)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[#15385E] font-bold rounded-lg cursor-pointer"
                      >
                        Customer 360 →
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: LIFECYCLE TOUCHPOINT AUTOMATIONS ================= */}
      {activeTab === 'automations' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#15385E]">
              Automated Customer Nurture &amp; Retention Triggers
            </h3>
            <p className="text-xs text-slate-500">
              Trigger high-conversion touchpoints across SMS, WhatsApp, and email based on customer tenure and delivery events.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Automation 1 */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  T-24 HOURS TO DELIVERY
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">SMS &amp; WhatsApp</span>
              </div>
              <h4 className="text-xs font-black text-[#15385E]">Pre-Delivery Site Preparation Checklist</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sends the customer their assigned driver's name, truck window, and reminder to verify 3.5m vertical clearance for the horizontal level-lift vehicle.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-emerald-700">✓ Active Automation</span>
                <button
                  type="button"
                  onClick={() => handleTriggerAutomation('auto-site-prep', 'Pre-Delivery Site Prep Checklist')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#15385E] text-xs font-bold cursor-pointer"
                >
                  Send Test Broadcast
                </button>
              </div>
            </div>

            {/* Automation 2 */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                  T+2 HOURS POST-PLACEMENT
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">In-Portal &amp; SMS</span>
              </div>
              <h4 className="text-xs font-black text-[#15385E]">Day 1 Delivery CSAT &amp; Paver Sign-Off</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Prompts customer to confirm the container was placed to their satisfaction and rate their driver, unlocking their $50 Portabox friend referral code.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-emerald-700">✓ Active Automation</span>
                <button
                  type="button"
                  onClick={() => handleTriggerAutomation('auto-day1-csat', 'Day 1 Delivery CSAT Prompt')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#15385E] text-xs font-bold cursor-pointer"
                >
                  Send Test Broadcast
                </button>
              </div>
            </div>

            {/* Automation 3 */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  DAY 25 PRE-EXPIRY
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">Email &amp; SMS</span>
              </div>
              <h4 className="text-xs font-black text-[#15385E]">Guaranteed Price Lock 5-Day Expiration Warning</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Notifies prospective quote leads that their 30-day rate guarantee expires in 5 days, incentivizing them to lock in their rate before monthly repricing.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">Ready for Lead Dispatch</span>
                <button
                  type="button"
                  onClick={() => handleTriggerAutomation('auto-day25-lock', '30-Day Price Lock Expiry Warning')}
                  className="px-3 py-1.5 rounded-xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] text-xs font-black cursor-pointer"
                >
                  Trigger to 4 Active Leads
                </button>
              </div>
            </div>

            {/* Automation 4 */}
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  MONTH 3 &amp; 6 TENURE
                </span>
                <span className="text-xs font-bold text-slate-500 font-mono">In-Portal Badge</span>
              </div>
              <h4 className="text-xs font-black text-[#15385E]">VIP Loyalty Upgrade &amp; Upfront Term Extension</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upgrades customers to Silver or Gold tier with up to 10%–20% upfront contract extension discounts, lowering churn and locking in 6–12 months of MRR.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">Scheduled Trigger</span>
                <button
                  type="button"
                  onClick={() => handleTriggerAutomation('auto-month3-loyalty', 'Month 3 Loyalty Promotion')}
                  className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold cursor-pointer"
                >
                  Simulate Loyalty Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CUSTOMER HEALTH & DIRECT OPERATIONS ================= */}
      {activeTab === 'customers' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers by name, email, mobile, container ID..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
              />
            </div>

            {/* Health Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setHealthFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                  healthFilter === 'all' ? 'bg-[#15385E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Health ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setHealthFilter('healthy')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                  healthFilter === 'healthy' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Healthy ({healthyCount})
              </button>
              <button
                type="button"
                onClick={() => setHealthFilter('attention')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                  healthFilter === 'attention' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Attention ({attentionCount})
              </button>
              <button
                type="button"
                onClick={() => setHealthFilter('at_risk')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                  healthFilter === 'at_risk' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                At Risk ({atRiskCount})
              </button>
            </div>
          </div>

          {/* Customers Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Customer &amp; Location</th>
                  <th className="py-3 px-4">Active Containers</th>
                  <th className="py-3 px-4">Tenure &amp; Loyalty</th>
                  <th className="py-3 px-4">Health Index</th>
                  <th className="py-3 px-4">Periodic Billing</th>
                  <th className="py-3 px-4 text-right">Quick CRM Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No matching customer accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(({ account, health, loyalty }) => {
                    const primaryOrder = account.orders[0];
                    return (
                      <tr key={account.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#15385E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {account.firstName[0]}
                            </div>
                            <div>
                              <div className="font-extrabold text-[#15385E] flex items-center gap-1.5">
                                <span>{account.firstName} {account.lastName}</span>
                                {account.companyName && (
                                  <span className="text-[10px] font-normal text-slate-400">({account.companyName})</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {account.mobile} · {account.suburb}, {account.state}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {primaryOrder ? (
                            <div>
                              <span className="font-mono font-bold text-[#15385E]">
                                {primaryOrder.containerId}
                              </span>
                              <div className="text-[11px] text-slate-500 font-medium">
                                {primaryOrder.containerName}
                              </div>
                              <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.2 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                                {primaryOrder.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No active order</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Award className={`w-3.5 h-3.5 ${
                              loyalty.tier === 'Platinum' ? 'text-purple-600' : loyalty.tier === 'Gold' ? 'text-amber-500' : 'text-slate-500'
                            }`} />
                            <span className="font-black text-[#15385E]">{loyalty.tier}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {loyalty.monthsActive} months tenure
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Code: {loyalty.referralCode}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              health.status === 'healthy' ? 'bg-emerald-500' : health.status === 'attention' ? 'bg-amber-500' : 'bg-rose-500'
                            }`} />
                            <span className="font-mono font-black text-xs">
                              {health.score}/100
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded ${
                              health.status === 'healthy'
                                ? 'bg-emerald-100 text-emerald-800'
                                : health.status === 'attention'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {health.status}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate" title={health.reasons[0]}>
                            {health.reasons[0]}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-[#15385E]">
                            ${account.paymentPlan?.periodicAmount}/mo
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {account.paymentPlan?.autopayEnabled ? 'Autopay active' : 'Manual billing'}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCustomer360(account)}
                              className="px-2.5 py-1.5 bg-[#15385E] hover:bg-[#112F4F] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                              title="Open Customer 360 Drawer"
                            >
                              360° Profile
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyCourtesyCredit(account, 50)}
                              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                              title="Issue $50 retention courtesy credit"
                            >
                              +$50 Credit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
