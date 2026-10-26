import React, { useState } from 'react';
import {
  ShieldCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Info,
  Send,
  Mail,
  User,
  Percent,
  Layers,
  Sparkles,
  ChevronRight,
  CreditCard,
  X,
} from 'lucide-react';
import { AppConfig, ContainerSizeId } from '../../types/quote';
import { CustomerAccount, loadCustomerAccounts, saveCustomerAccounts, applyCustomerAccountPricingOverride, recordManualCustomerPaymentOverride } from '../../services/customerPortalService';
import {
  evaluateAnnualRentalReview,
  getStandardReviewScenarios,
  AnnualReviewEvaluation,
  applyManualContractOverride,
} from '../../services/quoteLifecycleService';

interface QuoteLifecycleAdminWorkspaceProps {
  config: AppConfig;
  onSaveConfig: (updatedConfig: AppConfig) => void;
  onNavigateToFreezeManagement?: () => void;
}

export const QuoteLifecycleAdminWorkspace: React.FC<QuoteLifecycleAdminWorkspaceProps> = ({
  config,
  onSaveConfig,
  onNavigateToFreezeManagement,
}) => {
  // Config state
  const [validityDays, setValidityDays] = useState<number>(config.quoteValidityDays || 30);
  const [freezeMonths, setFreezeMonths] = useState<number>(config.rateLockDurationMonths || 12);
  const [globalCapPercent, setGlobalCapPercent] = useState<number>(
    config.annualPriceAdjustmentCapPercent !== undefined ? config.annualPriceAdjustmentCapPercent : 10
  );

  // Container specific overrides (optional)
  const [smallCap, setSmallCap] = useState<number>(config.containerAdjustmentCaps?.small_10m3 ?? 10);
  const [mediumCap, setMediumCap] = useState<number>(config.containerAdjustmentCaps?.medium_19m3 ?? 10);
  const [largeCap, setLargeCap] = useState<number>(config.containerAdjustmentCaps?.large_25m3 ?? 10);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive Simulator state
  const [simQuotePrice, setSimQuotePrice] = useState<number>(100);
  const [simCatalogPrice, setSimCatalogPrice] = useState<number>(125);
  const [simCustomerName, setSimCustomerName] = useState<string>('Sarah Jenkins');

  // Active customer accounts
  const [customers, setCustomers] = useState<CustomerAccount[]>(loadCustomerAccounts());
  const [selectedNotice, setSelectedNotice] = useState<{
    customerName: string;
    noticeText: string;
    evaluation: AnnualReviewEvaluation;
  } | null>(null);

  // Manual Customer Pricing Override Modal State
  const [overrideCustomer, setOverrideCustomer] = useState<CustomerAccount | null>(null);
  const [overrideRate, setOverrideRate] = useState<number>(199);
  const [overrideMonths, setOverrideMonths] = useState<number>(6);
  const [overrideReason, setOverrideReason] = useState<string>('Contract extension agreement');

  const handleOpenOverrideModal = (cust: CustomerAccount) => {
    setOverrideCustomer(cust);
    setOverrideRate(cust.pricingOverride?.overrideMonthlyRate || cust.paymentPlan?.periodicAmount || 219);
    setOverrideMonths(cust.pricingOverride?.durationMonths || 6);
    setOverrideReason(cust.pricingOverride?.reason || 'Contract extension agreement');
  };

  const handleSaveCustomerOverride = () => {
    if (!overrideCustomer) return;

    // 1. Update customer account
    const res = applyCustomerAccountPricingOverride({
      customerId: overrideCustomer.id,
      overrideMonthlyRate: Number(overrideRate),
      durationMonths: Number(overrideMonths),
      reason: overrideReason,
      appliedBy: 'Admin',
    });

    // 2. Also update contract in frozen contracts if matches booking or customer ID
    applyManualContractOverride(
      overrideCustomer.id,
      {
        overrideMonthlyRate: Number(overrideRate),
        durationMonths: Number(overrideMonths),
        reason: overrideReason,
        appliedBy: 'Admin',
      },
      (config.annualPriceAdjustmentCapPercent || 10) / 100
    );

    // Refresh state
    setCustomers(loadCustomerAccounts());
    setToastMessage(`✓ Pricing override of $${overrideRate}/mo applied for further ${overrideMonths} months to ${overrideCustomer.firstName} ${overrideCustomer.lastName}. Existing pricing review policy applies upon expiry.`);
    setTimeout(() => setToastMessage(null), 4500);
    setOverrideCustomer(null);
  };

  // Manual Customer Payment Override Modal State
  const [paymentCustomer, setPaymentCustomer] = useState<CustomerAccount | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(219);
  const [paymentType, setPaymentType] = useState<'periodic_rent' | 'custom_adjustment' | 'courtesy_credit' | 'waiver'>('periodic_rent');
  const [paymentMethod, setPaymentMethod] = useState<string>('Direct Bank Transfer / PayID (Verified)');
  const [paymentDesc, setPaymentDesc] = useState<string>('Manual monthly storage fee payment');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentAdvanceDate, setPaymentAdvanceDate] = useState<boolean>(true);

  const handleOpenPaymentModal = (cust: CustomerAccount) => {
    setPaymentCustomer(cust);
    setPaymentAmount(cust.paymentPlan?.periodicAmount || 219);
    setPaymentType('periodic_rent');
    setPaymentMethod('Direct Bank Transfer / PayID (Verified)');
    setPaymentDesc(`Manual payment recorded for ${cust.firstName} ${cust.lastName} - monthly storage`);
    setPaymentRef(`MAN-${Date.now().toString().slice(-6)}`);
    setPaymentAdvanceDate(true);
  };

  const handleSavePaymentOverride = () => {
    if (!paymentCustomer) return;
    const res = recordManualCustomerPaymentOverride({
      customerId: paymentCustomer.id,
      amount: Number(paymentAmount),
      paymentType,
      paymentMethod,
      description: paymentDesc,
      reference: paymentRef,
      appliedBy: 'Portabox Admin',
      advanceBillingDate: paymentAdvanceDate,
    });
    setCustomers(loadCustomerAccounts());
    setToastMessage(res.message);
    setTimeout(() => setToastMessage(null), 4000);
    setPaymentCustomer(null);
  };

  const handleSaveSettings = () => {
    const updated: AppConfig = {
      ...config,
      quoteValidityDays: Number(validityDays),
      rateLockDurationMonths: Number(freezeMonths),
      annualPriceAdjustmentCapPercent: Number(globalCapPercent),
      containerAdjustmentCaps: {
        small_10m3: Number(smallCap),
        medium_19m3: Number(mediumCap),
        large_25m3: Number(largeCap),
        two_large_50m3: Number(largeCap),
      },
    };
    onSaveConfig(updated);
    setToastMessage('✓ Quote validity, 12-month freeze & annual review rules saved successfully.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentSimEvaluation = evaluateAnnualRentalReview({
    originalQuotePrice: Number(simQuotePrice),
    currentCatalogPrice: Number(simCatalogPrice),
    capPercent: Number(globalCapPercent),
    customerName: simCustomerName,
    containerName: 'Large 25m³ Portabox',
  });

  const canonicalScenarios = getStandardReviewScenarios(100, Number(globalCapPercent));

  const handleExecuteAccountReview = (customerId: string) => {
    const custIndex = customers.findIndex((c) => c.id === customerId);
    if (custIndex === -1) return;

    const cust = customers[custIndex];
    const quotedRate = cust.paymentPlan.periodicAmount || 219;
    // Current catalog rate baseline
    const catalogRate = config.containerPrices.large_25m3.monthlyRate || 219;

    const evalResult = evaluateAnnualRentalReview({
      originalQuotePrice: quotedRate,
      currentCatalogPrice: catalogRate,
      capPercent: globalCapPercent,
      customerName: `${cust.firstName} ${cust.lastName}`,
      containerName: cust.orders[0]?.containerName || 'Portabox Container',
    });

    const updatedCust: CustomerAccount = {
      ...cust,
      paymentPlan: {
        ...cust.paymentPlan,
        periodicAmount: evalResult.newMonthlyRate,
      },
      discountsGiven: evalResult.rateIncreased
        ? [
            ...cust.discountsGiven,
            {
              id: `annual-adj-${Date.now()}`,
              date: new Date().toLocaleDateString('en-AU'),
              type: 'volume_discount',
              description: `Month 12 Annual Review: Rate adjusted to $${evalResult.newMonthlyRate}/mo (capped at +${globalCapPercent}%)`,
              amount: 0,
            },
          ]
        : cust.discountsGiven,
    };

    const newCustomers = [...customers];
    newCustomers[custIndex] = updatedCust;
    setCustomers(newCustomers);
    saveCustomerAccounts(newCustomers);

    if (evalResult.notificationRequired && evalResult.customerNotificationText) {
      setSelectedNotice({
        customerName: `${cust.firstName} ${cust.lastName}`,
        noticeText: evalResult.customerNotificationText,
        evaluation: evalResult,
      });
      setToastMessage(`✓ Month 12 Review executed for ${cust.firstName}. Rate adjusted to $${evalResult.newMonthlyRate}/mo. Customer notification generated.`);
    } else {
      setToastMessage(`✓ Month 12 Review executed for ${cust.firstName}. Rate unchanged at $${evalResult.newMonthlyRate}/mo. No notification needed.`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            SYSTEM ACTIVE
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#15385E] text-[#F7D347] shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0b2942]">
                Quote Lifecycle, 12-Month Freeze &amp; Annual Review Rules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure 30-day quote expiration, mandatory 12-month post-booking rate freeze, and month 12 annual rental review caps.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00c0f3] hover:bg-[#00a9d7] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all active:scale-98"
        >
          <Save className="w-4 h-4" />
          <span>Save Policy Parameters</span>
        </button>
      </div>

      {/* Policy Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rule 1: 30-Day Pre-Booking Validity */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
              Pre-Booking Policy
            </span>
            <Clock className="w-4 h-4 text-[#00c0f3]" />
          </div>
          <h4 className="text-sm font-black text-[#0b2942]">
            30-Day Guaranteed Price Lock
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Quoted monthly storage rates remain locked for 30 calendar days. Delivery fees reflect current standard booking dispatch rates.
          </p>
          <div className="pt-2 text-xs font-bold text-[#15385E] flex items-center justify-between border-t border-slate-100">
            <span>Validity Window:</span>
            <span className="font-mono font-black text-[#00c0f3]">{validityDays} Days</span>
          </div>
        </div>

        {/* Rule 2: 12-Month Post-Booking Freeze */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Post-Booking Policy
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="text-sm font-black text-[#0b2942]">
            12-Month Mandatory Rate Freeze
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Monthly rental fees and delivery pricing are protected for {freezeMonths} months. Once a delivery leg is booked, its price is fixed (date changes allowed) unless cancelled.
          </p>
          <div className="pt-2 text-xs font-bold text-[#15385E] flex items-center justify-between border-t border-slate-100">
            <span>Freeze Duration:</span>
            <span className="font-mono font-black text-emerald-600">{freezeMonths} Months (Year 1)</span>
          </div>
        </div>

        {/* Rule 3: Month 12 Annual Review */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Year 2+ Review Policy
            </span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <h4 className="text-sm font-black text-[#0b2942]">
            Annual Review (+{globalCapPercent}% Max)
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            New rate = max(Quote, min(Catalog, Quote × (1 + {globalCapPercent}%))). <strong>Price floor enforced.</strong> After freeze expires, unbooked delivery legs revert to live catalog rates.
          </p>
          <div className="pt-2 text-xs font-bold text-[#15385E] flex items-center justify-between border-t border-slate-100">
            <span>Annual Increase Cap:</span>
            <span className="font-mono font-black text-amber-600">+{globalCapPercent}% Max Cap</span>
          </div>
        </div>

        {/* Rule 4: Manual Customer Pricing Override */}
        <div className="bg-white rounded-2xl p-5 border border-purple-200 shadow-xs space-y-2 bg-gradient-to-b from-purple-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full">
              Admin Override
            </span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <h4 className="text-sm font-black text-[#0b2942]">
            Manual Pricing Override (N Months)
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Admin can set custom pricing for a further <strong>N months</strong>. Once this override period expires, the existing pricing review policy applies automatically.
          </p>
          <div className="pt-2 text-xs font-bold text-[#15385E] flex items-center justify-between border-t border-purple-100">
            <span>Post-Override Rule:</span>
            <span className="font-mono font-bold text-purple-700">Standard Review Applies</span>
          </div>
        </div>
      </div>

      {/* Direct Link to Frozen Pricing Dashboard & Revenue Forecast */}
      {onNavigateToFreezeManagement && (
        <div className="bg-gradient-to-r from-[#15385E] via-[#102d4d] to-[#0b2942] rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-700">
          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 uppercase tracking-wide">
              Operational & Finance Forecast
            </span>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>Customer Frozen Pricing Dashboard &amp; Revenue Impact Forecast</span>
            </h4>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Monitor active customer accounts with locked contracts, track days remaining until unfreeze, inspect mathematical proofs, and view 30/90-day incremental MRR delta pipelines.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToFreezeManagement}
            className="px-4 py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>Open Freeze Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Settings Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
        <div>
          <h4 className="text-base font-extrabold text-[#0b2942]">
            System Configuration Parameters
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Adjust quote validity windows, rate freeze periods, and annual review adjustment caps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-[#0b2942] uppercase tracking-wider mb-1.5">
              Quote Validity Window (Days)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={90}
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 30)}
                className="w-full px-4 py-2.5 text-sm font-bold text-[#0b2942] bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#00c0f3] focus:bg-white"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Days</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Default: 30 calendar days</p>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#0b2942] uppercase tracking-wider mb-1.5">
              Booking Rate Freeze Duration (Months)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={36}
                value={freezeMonths}
                onChange={(e) => setFreezeMonths(parseInt(e.target.value, 10) || 12)}
                className="w-full px-4 py-2.5 text-sm font-bold text-[#0b2942] bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#00c0f3] focus:bg-white"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Months</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Default: 12 mandatory months</p>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#0b2942] uppercase tracking-wider mb-1.5">
              Global Annual Adjustment Cap (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={50}
                value={globalCapPercent}
                onChange={(e) => setGlobalCapPercent(parseInt(e.target.value, 10) || 10)}
                className="w-full px-4 py-2.5 text-sm font-bold text-[#0b2942] bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-[#00c0f3] focus:bg-white"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">% Max</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Default: 10% maximum annual increase</p>
          </div>
        </div>

        {/* Container Specific Overrides */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 block mb-2">
            Container-Specific Annual Caps (Optional Overrides):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Small 10m³:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={smallCap}
                  onChange={(e) => setSmallCap(parseInt(e.target.value, 10) || 10)}
                  className="w-16 px-2 py-1 text-xs font-bold font-mono text-center bg-white border border-slate-300 rounded-lg"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Medium 19m³:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={mediumCap}
                  onChange={(e) => setMediumCap(parseInt(e.target.value, 10) || 10)}
                  className="w-16 px-2 py-1 text-xs font-bold font-mono text-center bg-white border border-slate-300 rounded-lg"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Large 25m³:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={largeCap}
                  onChange={(e) => setLargeCap(parseInt(e.target.value, 10) || 10)}
                  className="w-16 px-2 py-1 text-xs font-bold font-mono text-center bg-white border border-slate-300 rounded-lg"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canonical Scenarios Verification Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Requirements Verification
            </span>
            <h4 className="text-base font-extrabold text-[#0b2942]">
              Annual Review Canonical Scenarios (Quote Price = $100, Cap = +{globalCapPercent}%)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Exact mathematical verification against the required Month 12 evaluation formula:
            <code className="ml-1 text-[#0b2942] font-bold bg-slate-100 px-1.5 py-0.5 rounded">
              max(Quote Price, min(Current Catalog Price, Quote Price × (1 + {globalCapPercent}%)))
            </code>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Scenario</th>
                <th className="pb-3">Original Quote</th>
                <th className="pb-3">Month 12 Catalog Price</th>
                <th className="pb-3 text-center">New Rate</th>
                <th className="pb-3">Rationale &amp; Rule Applied</th>
                <th className="pb-3 text-right">Customer Notification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {canonicalScenarios.map((cs, idx) => {
                const evalData = cs.evaluation;
                const isHighlight = evalData.scenario === 'high_market_increase';
                return (
                  <tr key={idx} className={`hover:bg-slate-50/70 transition-colors ${isHighlight ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-3.5 font-bold text-[#0b2942] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        evalData.scenario === 'market_drop'
                          ? 'bg-sky-500'
                          : evalData.scenario === 'moderate_increase'
                          ? 'bg-emerald-500'
                          : evalData.scenario === 'high_market_increase'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`} />
                      <span>{cs.scenarioName}</span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-700 font-bold">${evalData.originalQuotePrice}</td>
                    <td className="py-3.5 font-mono font-bold text-[#0b2942]">${cs.catalogPrice}</td>
                    <td className="py-3.5 text-center font-mono font-black text-sm text-[#0b2942]">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 inline-block font-mono">
                        ${evalData.newMonthlyRate}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 max-w-sm leading-relaxed">
                      {evalData.rationale}
                    </td>
                    <td className="py-3.5 text-right">
                      {evalData.notificationRequired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Send className="w-2.5 h-2.5" />
                          <span>Notification Sent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          <span>No Notice Needed</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Annual Review Simulator */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h4 className="text-base font-extrabold text-[#0b2942]">
            Interactive Rate Review Simulator
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Test custom quote prices and market movements to preview evaluated rates and notification text.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Original Quoted Monthly Rate ($)
            </label>
            <input
              type="number"
              value={simQuotePrice}
              onChange={(e) => setSimQuotePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Month 12 Current Catalog Price ($)
            </label>
            <input
              type="number"
              value={simCatalogPrice}
              onChange={(e) => setSimCatalogPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={simCustomerName}
              onChange={(e) => setSimCustomerName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500">Evaluated Scenario:</span>
              <span className="text-xs font-black text-[#0b2942]">{currentSimEvaluation.scenarioLabel}</span>
              {currentSimEvaluation.priceFloorApplied && (
                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded">
                  Floor Applied
                </span>
              )}
              {currentSimEvaluation.capEnforced && (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                  Cap Enforced (+{globalCapPercent}%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              {currentSimEvaluation.rationale}
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">New Monthly Rate</span>
            <div className="text-2xl font-black font-mono text-[#0b2942]">
              ${currentSimEvaluation.newMonthlyRate}
              <span className="text-xs text-slate-500 font-normal">/mo</span>
            </div>
            <span className={`text-[10px] font-black uppercase ${
              currentSimEvaluation.rateIncreased ? 'text-emerald-700' : 'text-slate-500'
            }`}>
              {currentSimEvaluation.rateIncreased
                ? `+$${currentSimEvaluation.increaseAmount} (+${currentSimEvaluation.increasePercent}%) · Notify Customer`
                : 'Rate Unchanged · No Notice Sent'}
            </span>
          </div>
        </div>

        {/* Notification Preview */}
        {currentSimEvaluation.customerNotificationText && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Mail className="w-4 h-4 text-amber-700" />
              <span>Automated Customer Notification Letter (Triggered at Month 12):</span>
            </div>
            <p className="text-xs text-amber-950 font-serif italic leading-relaxed bg-white/80 p-3 rounded-xl border border-amber-200/50">
              &ldquo;{currentSimEvaluation.customerNotificationText}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Customer Accounts Ledger with Month 12 Review Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-extrabold text-[#0b2942]">
              Customer Contracts &amp; 12-Month Review Ledger
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Review active contracts, Year 1 freeze status, and trigger Month 12 annual reviews.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Customer Account</th>
                <th className="pb-3">Contract Start</th>
                <th className="pb-3">Quoted Monthly Rate</th>
                <th className="pb-3">Delivery Fee</th>
                <th className="pb-3">Rate Freeze Status</th>
                <th className="pb-3 text-right">Annual Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((cust) => {
                const quotedRate = cust.paymentPlan.periodicAmount || 219;
                return (
                  <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5">
                      <div className="font-extrabold text-[#0b2942]">{cust.firstName} {cust.lastName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{cust.email} · {cust.id}</div>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">
                      {cust.memberSince}
                    </td>
                    <td className="py-3.5 font-mono font-bold text-[#0b2942]">
                      ${quotedRate}/mo
                    </td>
                    <td className="py-3.5 font-mono font-bold text-slate-700">
                      <div>$149</div>
                      <span className="text-[10px] text-slate-400 font-sans font-medium block">
                        Protected in freeze
                      </span>
                    </td>
                    <td className="py-3.5">
                      {cust.pricingOverride?.isActive ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>Override: ${cust.pricingOverride.overrideMonthlyRate}/mo ({cust.pricingOverride.durationMonths} Mo)</span>
                          </span>
                          <span className="text-[9px] text-purple-600 block">
                            Standard review applies upon expiry
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Year 1 Freeze Active</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenOverrideModal(cust)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                          title="Set custom pricing override for further N months"
                        >
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>Override (N Mo)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentModal(cust)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                          title="Provide manual override for customer payments (EFT, PayID, Cash, Waiver)"
                        >
                          <CreditCard className="w-3 h-3 text-emerald-600" />
                          <span>Payment Override</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteAccountReview(cust.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#15385E] hover:bg-[#112F4F] text-white font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                        >
                          Review Month 12
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Customer Notification Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-600" />
                <h4 className="text-base font-extrabold text-[#0b2942]">
                  Customer Notification Dispatched
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
              ✓ Rate increase of +${selectedNotice.evaluation.increaseAmount}/mo applied. Customer notification sent to {selectedNotice.customerName}.
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs leading-relaxed text-slate-800 space-y-2">
              <span className="font-extrabold text-[#0b2942] block">Letter Preview:</span>
              <p className="font-serif italic">&ldquo;{selectedNotice.noticeText}&rdquo;</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="w-full py-2.5 bg-[#0b2942] hover:bg-[#081e30] text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Manual Pricing Override Modal for Customer */}
      {overrideCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#0b2942]">
                    Set Manual Pricing Override
                  </h4>
                  <p className="text-xs text-slate-500">
                    {overrideCustomer.firstName} {overrideCustomer.lastName} · {overrideCustomer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOverrideCustomer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Current Rates Banner */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Current Plan Rate:</span>
                <span className="font-mono font-black text-slate-800 text-sm">
                  ${overrideCustomer.paymentPlan?.periodicAmount || 219}/month
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Contract Status:</span>
                <span className="font-bold text-emerald-700">Active Customer</span>
              </div>
            </div>

            {/* Override Rate Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Override Monthly Rental Rate ($AUD / month)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                <input
                  type="number"
                  min="50"
                  step="5"
                  value={overrideRate}
                  onChange={(e) => setOverrideRate(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-[#0b2942] focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Duration N Months Input & Preset Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Override Duration (Further N Months)
              </label>
              <div className="flex items-center gap-2 mb-2">
                {[1, 3, 6, 12, 18, 24].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setOverrideMonths(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                      overrideMonths === m
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {m} Mo
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="60"
                value={overrideMonths}
                onChange={(e) => setOverrideMonths(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs text-[#0b2942]"
                placeholder="Enter custom number of months"
              />
            </div>

            {/* Commercial Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Commercial Agreement Note
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Renovation extension goodwill, Commercial partnership"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
              />
            </div>

            {/* Policy Enforcement Notice */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-purple-900">
                <Info className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Policy Enforcement Schedule</span>
              </div>
              <p className="leading-relaxed text-[11px] text-purple-900/90">
                Customer rate is locked at <strong>${overrideRate}/mo</strong> for exactly <strong>{overrideMonths} months</strong>.
              </p>
              <p className="leading-relaxed text-[11px] text-purple-900/90 border-t border-purple-200/60 pt-1.5">
                <strong>Post-Expiry Rule:</strong> Once this {overrideMonths}-month pricing period expires, the <strong>existing pricing review policy</strong> (Annual Review capped at +{globalCapPercent}% max with floor constraint) will automatically apply.
              </p>
              <p className="leading-relaxed text-[10px] text-slate-600 border-t border-purple-200/60 pt-1.5">
                <strong>Delivery Fee Policy:</strong> Monthly storage rental rates are contractually frozen. Delivery fees reflect current standard catalog rates at time of transport.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOverrideCustomer(null)}
                className="w-1/3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomerOverride}
                className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Override ({overrideMonths} Mo)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Override Modal for Customer */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-emerald-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#0b2942]">
                    Manual Customer Payment Override
                  </h4>
                  <p className="text-xs text-slate-500">
                    {paymentCustomer.firstName} {paymentCustomer.lastName} · {paymentCustomer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Summary Context */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Monthly Storage Plan:</span>
                <span className="font-mono font-black text-slate-800 text-sm">
                  ${paymentCustomer.paymentPlan?.periodicAmount || 219}/month
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Next Billing Date:</span>
                <span className="font-bold text-emerald-700">
                  {paymentCustomer.paymentPlan?.nextBillingDate || 'Scheduled'}
                </span>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Amount (AUD $)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-[#0b2942] focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Classification
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs text-slate-800"
              >
                <option value="periodic_rent">Periodic Storage Rent Payment (EFT / PayID / Cash)</option>
                <option value="custom_adjustment">Deposit / Upfront Payment Override</option>
                <option value="courtesy_credit">Courtesy Credit / Goodwill Adjustment (-$)</option>
                <option value="waiver">Fee Waiver (Late Fee / Dry Run Rebate)</option>
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Method / Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs text-slate-800"
              >
                <option value="Direct Bank Transfer / PayID (Verified)">Direct Bank Transfer / PayID (Verified)</option>
                <option value="Zepto NPP Instant / PayID Webhook">Zepto NPP Instant / PayID Webhook</option>
                <option value="EFTPOS / Card Terminal at Counter">EFTPOS / Card Terminal at Counter</option>
                <option value="Staff Card Phone Auth (Braintree Manual)">Staff Card Phone Auth (Braintree Manual)</option>
                <option value="Cash Received at Depot Counter">Cash Received at Depot Counter</option>
                <option value="Courtesy Goodwill Credit / Admin Waiver">Courtesy Goodwill Credit / Admin Waiver</option>
              </select>
            </div>

            {/* Reference & Ledger Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auth / Transaction Ref
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. EFT-98214 or CASH-01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ledger Description
                </label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Advance Next Billing Date Checkbox */}
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-800 text-xs">
              <input
                type="checkbox"
                checked={paymentAdvanceDate}
                onChange={(e) => setPaymentAdvanceDate(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600"
              />
              <span>Advance next periodic billing date by 30 days &amp; clear any overdue holds</span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPaymentCustomer(null)}
                className="w-1/3 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePaymentOverride}
                className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Confirm Payment (${paymentAmount} AUD)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
