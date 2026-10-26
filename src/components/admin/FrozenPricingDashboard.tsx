import React, { useState, useMemo } from 'react';
import {
  Lock,
  Unlock,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  Mail,
  Send,
  Info,
  ChevronRight,
  ShieldCheck,
  Tag,
  Sliders,
  Check,
  X,
  FileText,
  User,
  Building,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { AppConfig } from '../../types/quote';
import {
  CustomerPriceFreezeRecord,
  FreezeForecastSummary,
  calculateCustomerPricingAndRevenueImpact,
  computeFreezeForecastSummary,
  formatCurrency,
  generateCustomerPriceNotice,
  loadCustomerPriceFreezes,
  saveCustomerPriceFreezes,
  getInitialSeedPriceFreezes,
  PricingRuleOutcome,
  applyManualPriceOverride,
  clearManualPriceOverride,
} from '../../services/freezeManagementService';
import {
  applyCustomerAccountPricingOverride,
  clearCustomerAccountPricingOverride,
  recordManualCustomerPaymentOverride,
} from '../../services/customerPortalService';

interface FrozenPricingDashboardProps {
  config: AppConfig;
  onSaveConfig?: (newConfig: AppConfig) => void;
}

export const FrozenPricingDashboard: React.FC<FrozenPricingDashboardProps> = ({
  config,
  onSaveConfig,
}) => {
  // Admin Cap % state (defaults to config value or 10%)
  const [adminIncreasePct, setAdminIncreasePct] = useState<number>(() => {
    return (config.annualPriceAdjustmentCapPercent ?? 10) / 100;
  });

  const [contracts, setContracts] = useState<CustomerPriceFreezeRecord[]>(() =>
    loadCustomerPriceFreezes(adminIncreasePct)
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | '30d' | '90d' | 'expired' | 'future'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'required' | 'sent'>('all');

  // Modals
  const [detailRecord, setDetailRecord] = useState<CustomerPriceFreezeRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<CustomerPriceFreezeRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual Customer Pricing Override Modal State
  const [overrideModalRecord, setOverrideModalRecord] = useState<CustomerPriceFreezeRecord | null>(null);
  const [overrideRate, setOverrideRate] = useState<number>(219);
  const [overrideMonths, setOverrideMonths] = useState<number>(6);
  const [overrideReason, setOverrideReason] = useState<string>('Contract extension agreement');

  // Manual Customer Payment Override Modal State
  const [paymentModalRecord, setPaymentModalRecord] = useState<CustomerPriceFreezeRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(219);
  const [paymentType, setPaymentType] = useState<'periodic_rent' | 'custom_adjustment' | 'courtesy_credit' | 'waiver'>('periodic_rent');
  const [paymentMethod, setPaymentMethod] = useState<string>('Direct Bank Transfer / PayID (Verified)');
  const [paymentDesc, setPaymentDesc] = useState<string>('Manual monthly storage fee payment');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentAdvanceDate, setPaymentAdvanceDate] = useState<boolean>(true);

  // Form state for Add/Edit
  const [formCustomerName, setFormCustomerName] = useState<string>('');
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formBookingRef, setFormBookingRef] = useState<string>('');
  const [formContainerTier, setFormContainerTier] = useState<string>('Large 25m³ Portabox Pro');
  const [formFrozenRate, setFormFrozenRate] = useState<number>(219);
  const [formCatalogRate, setFormCatalogRate] = useState<number>(269);
  const [formDaysRemaining, setFormDaysRemaining] = useState<number>(30);
  const [formComponents, setFormComponents] = useState<string>('Monthly Rental, Large 25m³ Tier, Quoted Initial Delivery (Policy Governed)');
  const [formNotes, setFormNotes] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dynamic summary computation based on current contracts and selected admin cap
  const summary: FreezeForecastSummary = useMemo(() => {
    return computeFreezeForecastSummary(contracts, adminIncreasePct);
  }, [contracts, adminIncreasePct]);

  // Handle changing Admin Cap %
  const handleAdminCapChange = (pctValue: number) => {
    const decimal = Math.max(0.01, Math.min(0.50, pctValue / 100));
    setAdminIncreasePct(decimal);

    // Re-evaluate all contracts with new admin cap
    setContracts((prev) =>
      prev.map((c) => {
        const proj = calculateCustomerPricingAndRevenueImpact(
          c.current_frozen_rate,
          c.current_catalog_rate,
          decimal
        );
        const cappedRate = c.current_frozen_rate * (1 + decimal);
        let outcome_type: PricingRuleOutcome = 'rate_unchanged';
        if (c.current_catalog_rate < c.current_frozen_rate) {
          outcome_type = 'floor_constraint_applied';
        } else if (c.current_catalog_rate > cappedRate) {
          outcome_type = 'capped_increase';
        } else if (proj.monthlyRevenueDelta > 0) {
          outcome_type = 'catalog_rate_match';
        }

        return {
          ...c,
          anticipated_new_rate: proj.anticipatedRate,
          monthly_revenue_delta: proj.monthlyRevenueDelta,
          annual_revenue_delta: proj.annualRevenueDelta,
          notification_required: proj.notificationRequired,
          outcome_type,
        };
      })
    );

    // Save to parent config if callback provided
    if (onSaveConfig) {
      onSaveConfig({
        ...config,
        annualPriceAdjustmentCapPercent: Math.round(decimal * 100),
      });
    }

    showToast(`Admin cap adjusted to ${Math.round(decimal * 100)}%. Future revenue pipeline updated.`);
  };

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.customer_name.toLowerCase().includes(q);
        const matchesId = c.customer_id.toLowerCase().includes(q);
        const matchesRef = c.booking_reference.toLowerCase().includes(q);
        const matchesEmail = c.customer_email.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesRef && !matchesEmail) {
          return false;
        }
      }

      // Timeframe
      if (timeframeFilter === '30d' && c.days_remaining > 30) return false;
      if (timeframeFilter === '90d' && c.days_remaining > 90) return false;
      if (timeframeFilter === 'expired' && c.days_remaining > 0) return false;
      if (timeframeFilter === 'future' && c.days_remaining <= 90) return false;

      // Tier
      if (tierFilter !== 'all' && !c.container_tier.toLowerCase().includes(tierFilter.toLowerCase())) {
        return false;
      }

      // Outcome
      if (outcomeFilter !== 'all' && c.outcome_type !== outcomeFilter) {
        return false;
      }

      // Notification
      if (notificationFilter === 'required' && (!c.notification_required || c.notification_sent)) {
        return false;
      }
      if (notificationFilter === 'sent' && !c.notification_sent) {
        return false;
      }

      return true;
    });
  }, [contracts, searchQuery, timeframeFilter, tierFilter, outcomeFilter, notificationFilter]);

  // Mark notification sent
  const handleMarkNoticeSent = (customerId: string) => {
    const updated = contracts.map((c) => {
      if (c.customer_id === customerId) {
        return {
          ...c,
          notification_sent: true,
          notification_date: new Date().toISOString().split('T')[0],
          notification_channel: 'Email' as const,
        };
      }
      return c;
    });
    setContracts(updated);
    saveCustomerPriceFreezes(updated);
    if (detailRecord && detailRecord.customer_id === customerId) {
      setDetailRecord({
        ...detailRecord,
        notification_sent: true,
        notification_date: new Date().toISOString().split('T')[0],
        notification_channel: 'Email',
      });
    }
    showToast('Customer unfreeze notice dispatched and logged.');
  };

  // Reset to seed data
  const handleResetSeeds = () => {
    if (window.confirm('Reset all frozen contract data back to default demonstration records?')) {
      const fresh = getInitialSeedPriceFreezes(adminIncreasePct);
      setContracts(fresh);
      saveCustomerPriceFreezes(fresh);
      showToast('Reset to default frozen contracts.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Customer ID',
      'Customer Name',
      'Booking Reference',
      'Container Tier',
      'Freeze Start Date',
      'Freeze Expiry Date',
      'Days Remaining',
      'Current Frozen Rate (AUD)',
      'Current Catalog Rate (AUD)',
      'Anticipated New Rate (AUD)',
      'Monthly Revenue Delta (AUD)',
      'Annual Revenue Delta (AUD)',
      'Rule Outcome',
      'Notification Required',
      'Notification Sent',
    ];

    const rows = filteredContracts.map((c) => [
      `"${c.customer_id}"`,
      `"${c.customer_name}"`,
      `"${c.booking_reference}"`,
      `"${c.container_tier}"`,
      `"${c.freeze_start_date}"`,
      `"${c.freeze_expiry_date}"`,
      c.days_remaining,
      c.current_frozen_rate.toFixed(2),
      c.current_catalog_rate.toFixed(2),
      c.anticipated_new_rate.toFixed(2),
      c.monthly_revenue_delta.toFixed(2),
      c.annual_revenue_delta.toFixed(2),
      `"${c.outcome_type}"`,
      c.notification_required ? 'YES' : 'NO',
      c.notification_sent ? 'SENT' : 'PENDING',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `portabox_frozen_pricing_forecast_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Financial revenue impact forecast downloaded as CSV.');
  };

  // Open Manual Customer Pricing Override Modal
  const handleOpenOverrideModal = (rec: CustomerPriceFreezeRecord) => {
    setOverrideModalRecord(rec);
    setOverrideRate(rec.override_monthly_rate || rec.current_frozen_rate || 219);
    setOverrideMonths(rec.override_duration_months || 6);
    setOverrideReason(rec.override_reason || 'Contract extension agreement');
  };

  // Save Manual Customer Pricing Override (further N months)
  const handleSaveOverride = () => {
    if (!overrideModalRecord) return;

    const res = applyManualPriceOverride(
      overrideModalRecord.booking_reference,
      {
        overrideMonthlyRate: Number(overrideRate),
        durationMonths: Number(overrideMonths),
        reason: overrideReason,
        appliedBy: 'Admin',
      },
      adminIncreasePct
    );

    // Synchronize customer accounts in customerPortalService if account exists
    applyCustomerAccountPricingOverride({
      customerId: overrideModalRecord.customer_id,
      overrideMonthlyRate: Number(overrideRate),
      durationMonths: Number(overrideMonths),
      reason: overrideReason,
      appliedBy: 'Admin',
    });

    setContracts(res.updatedRecords);
    if (
      detailRecord &&
      (detailRecord.customer_id === overrideModalRecord.customer_id ||
        detailRecord.booking_reference === overrideModalRecord.booking_reference)
    ) {
      setDetailRecord(res.updatedRecord);
    }

    showToast(
      `✓ Pricing override of $${overrideRate}/mo applied for further ${overrideMonths} months to ${overrideModalRecord.customer_name}. Existing pricing review policy applies upon expiry.`
    );
    setOverrideModalRecord(null);
  };

  // Clear Manual Customer Pricing Override (reverts to standard pricing review)
  const handleClearOverride = (rec: CustomerPriceFreezeRecord) => {
    const updated = clearManualPriceOverride(rec.booking_reference, adminIncreasePct);
    clearCustomerAccountPricingOverride(rec.customer_id);
    setContracts(updated);
    if (
      detailRecord &&
      (detailRecord.customer_id === rec.customer_id ||
        detailRecord.booking_reference === rec.booking_reference)
    ) {
      const match = updated.find((r) => r.booking_reference === rec.booking_reference);
      setDetailRecord(match || null);
    }
    showToast(`✓ Manual pricing override removed for ${rec.customer_name}. Standard pricing review policy restored.`);
    setOverrideModalRecord(null);
  };

  // Open Manual Customer Payment Override Modal
  const handleOpenPaymentOverride = (rec: CustomerPriceFreezeRecord) => {
    setPaymentModalRecord(rec);
    setPaymentAmount(rec.current_frozen_rate || 219);
    setPaymentType('periodic_rent');
    setPaymentMethod('Direct Bank Transfer / PayID (Verified)');
    setPaymentDesc(`Manual payment recorded for ${rec.customer_name} - monthly storage`);
    setPaymentRef(`MAN-${Date.now().toString().slice(-6)}`);
    setPaymentAdvanceDate(true);
  };

  // Save Manual Customer Payment Override
  const handleSavePaymentOverride = () => {
    if (!paymentModalRecord) return;
    const res = recordManualCustomerPaymentOverride({
      customerId: paymentModalRecord.customer_id,
      amount: Number(paymentAmount),
      paymentType,
      paymentMethod,
      description: paymentDesc,
      reference: paymentRef,
      appliedBy: 'Portabox Admin',
      advanceBillingDate: paymentAdvanceDate,
    });
    showToast(res.message);
    setPaymentModalRecord(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: CustomerPriceFreezeRecord) => {
    setEditingRecord(rec);
    setFormCustomerName(rec.customer_name);
    setFormCustomerId(rec.customer_id);
    setFormBookingRef(rec.booking_reference);
    setFormContainerTier(rec.container_tier);
    setFormFrozenRate(rec.current_frozen_rate);
    setFormCatalogRate(rec.current_catalog_rate);
    setFormDaysRemaining(rec.days_remaining);
    setFormComponents(rec.frozen_components.join(', '));
    setFormNotes(rec.notes || '');
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const proj = calculateCustomerPricingAndRevenueImpact(
      Number(formFrozenRate),
      Number(formCatalogRate),
      adminIncreasePct
    );

    const cappedRate = Number(formFrozenRate) * (1 + adminIncreasePct);
    let outcome_type: PricingRuleOutcome = 'rate_unchanged';
    if (Number(formCatalogRate) < Number(formFrozenRate)) {
      outcome_type = 'floor_constraint_applied';
    } else if (Number(formCatalogRate) > cappedRate) {
      outcome_type = 'capped_increase';
    } else if (proj.monthlyRevenueDelta > 0) {
      outcome_type = 'catalog_rate_match';
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(formDaysRemaining));

    const updated = contracts.map((c) => {
      if (c.customer_id === editingRecord.customer_id) {
        return {
          ...c,
          customer_name: formCustomerName,
          booking_reference: formBookingRef,
          container_tier: formContainerTier,
          current_frozen_rate: Number(formFrozenRate),
          current_catalog_rate: Number(formCatalogRate),
          days_remaining: Number(formDaysRemaining),
          freeze_expiry_date: expiryDate.toISOString().split('T')[0],
          frozen_components: formComponents.split(',').map((s) => s.trim()).filter(Boolean),
          notes: formNotes,
          anticipated_new_rate: proj.anticipatedRate,
          monthly_revenue_delta: proj.monthlyRevenueDelta,
          annual_revenue_delta: proj.annualRevenueDelta,
          notification_required: proj.notificationRequired,
          outcome_type,
          last_updated: new Date().toISOString(),
        };
      }
      return c;
    });

    setContracts(updated);
    saveCustomerPriceFreezes(updated);
    setEditingRecord(null);
    showToast(`Updated price freeze contract for ${formCustomerName}.`);
  };

  // Save New Contract
  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = calculateCustomerPricingAndRevenueImpact(
      Number(formFrozenRate),
      Number(formCatalogRate),
      adminIncreasePct
    );

    const cappedRate = Number(formFrozenRate) * (1 + adminIncreasePct);
    let outcome_type: PricingRuleOutcome = 'rate_unchanged';
    if (Number(formCatalogRate) < Number(formFrozenRate)) {
      outcome_type = 'floor_constraint_applied';
    } else if (Number(formCatalogRate) > cappedRate) {
      outcome_type = 'capped_increase';
    } else if (proj.monthlyRevenueDelta > 0) {
      outcome_type = 'catalog_rate_match';
    }

    const now = new Date();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Number(formDaysRemaining));
    const start = new Date(expiry.getTime() - 365 * 24 * 60 * 60 * 1000);

    const newRecord: CustomerPriceFreezeRecord = {
      customer_id: formCustomerId || `CUST-${Math.floor(8000 + Math.random() * 900)}`,
      customer_name: formCustomerName || 'New Customer',
      customer_email: `${formCustomerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      booking_reference: formBookingRef || `PB-BKG-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      container_tier: formContainerTier,
      container_count: 1,
      frozen_components: formComponents.split(',').map((s) => s.trim()).filter(Boolean),
      freeze_start_date: start.toISOString().split('T')[0],
      freeze_expiry_date: expiry.toISOString().split('T')[0],
      days_remaining: Number(formDaysRemaining),
      current_frozen_rate: Number(formFrozenRate),
      current_catalog_rate: Number(formCatalogRate),
      anticipated_new_rate: proj.anticipatedRate,
      monthly_revenue_delta: proj.monthlyRevenueDelta,
      annual_revenue_delta: proj.annualRevenueDelta,
      notification_required: proj.notificationRequired,
      notification_sent: false,
      outcome_type,
      notes: formNotes,
      last_updated: now.toISOString(),
    };

    const updated = [newRecord, ...contracts];
    setContracts(updated);
    saveCustomerPriceFreezes(updated);
    setIsAddModalOpen(false);
    showToast(`Added active price freeze for ${newRecord.customer_name}.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#15385E] text-white px-5 py-3 rounded-xl shadow-2xl border border-amber-400/40 flex items-center space-x-3 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-[#FF9900]" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#15385E] via-[#102d4d] to-[#0b2238] rounded-2xl p-6 text-white shadow-lg border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30 tracking-wide uppercase">
                Finance & Revenue Governance
              </span>
              <span className="text-xs text-slate-300 font-mono">
                /admin/pricing/freeze-management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Lock className="w-7 h-7 text-[#FF9900]" />
              Customer Frozen Pricing & Revenue Impact Forecast
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Monitors active 12-month contract rate locks, tracks remaining unfreeze runway, computes post-freeze pricing adjustments via admin caps and floor constraints, and forecasts incremental monthly revenue (MRR Delta).
            </p>
          </div>

          {/* Quick System Parameter: Admin Cap % */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 flex flex-col gap-2 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#FF9900]" />
                Admin Increase Cap:
              </span>
              <span className="text-lg font-black text-[#FF9900]">
                +{Math.round(adminIncreasePct * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              step="1"
              value={Math.round(adminIncreasePct * 100)}
              onChange={(e) => handleAdminCapChange(Number(e.target.value))}
              className="w-full accent-[#FF9900] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-300 font-medium">
              <span>0% (Full Lock)</span>
              <span>10% (Default)</span>
              <span>20%</span>
              <span>35%</span>
            </div>
            <p className="text-[11px] text-slate-300 italic">
              Live updates all post-unfreeze rates and MRR impact pipelines below.
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Portfolio: <strong>{contracts.length} active frozen contracts</strong></span>
            <span>•</span>
            <span>Runway Countdown: <strong>Real-time DATEDIFF</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setFormCustomerId(`CUST-${Math.floor(8030 + Math.random() * 500)}`);
                setFormCustomerName('');
                setFormBookingRef(`PB-BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`);
                setFormFrozenRate(219);
                setFormCatalogRate(269);
                setFormDaysRemaining(30);
                setFormComponents('Monthly Rental, Large 25m³ Tier, Scheduled Initial Delivery (Catalog Governed)');
                setFormNotes('');
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Frozen Contract</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-medium text-xs rounded-lg transition-colors flex items-center space-x-1.5 border border-white/20"
            >
              <Download className="w-4 h-4" />
              <span>Export Forecast CSV</span>
            </button>
            <button
              onClick={handleResetSeeds}
              className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs rounded-lg transition-colors flex items-center space-x-1 border border-slate-700"
              title="Reset to default seed contracts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP-LEVEL SUMMARY KPIS (FUTURE MONTHLY REVENUE IMPACT) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#15385E]" />
            Future Monthly Revenue Impact (Top-Level Deck)
          </h2>
          <span className="text-xs text-slate-500">
            Calculated at active admin cap: <strong>+{Math.round(adminIncreasePct * 100)}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Current Frozen MRR */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Current Frozen MRR</span>
              <Lock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-[#15385E]">
              {formatCurrency(summary.currentFrozenMrr)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Across {summary.totalContractsCount} frozen contracts</span>
              <span className="text-slate-400 font-mono">baseline</span>
            </div>
          </div>

          {/* 2. Projected Post-Unfreeze MRR */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider">Projected Post-Unfreeze MRR</span>
              <Unlock className="w-4 h-4 text-[#15385E]" />
            </div>
            <div className="text-2xl font-black text-[#15385E]">
              {formatCurrency(summary.projectedPostUnfreezeMrr)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center justify-between">
              <span>After rules applied</span>
              <span>+{summary.avgMonthlyIncreasePercent}% portfolio</span>
            </div>
          </div>

          {/* 3. Net Monthly Revenue Impact (Total Delta) */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 rounded-xl p-4 border border-emerald-300 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-emerald-800 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">Net Monthly Impact (Total Δ)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                ∑ Δ MRR
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-700">
              +{formatCurrency(summary.netMonthlyRevenueImpact)}
              <span className="text-xs font-semibold text-emerald-800 ml-1">/mo</span>
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center justify-between">
              <span>Annualized Value:</span>
              <strong className="text-emerald-900">+{formatCurrency(summary.annualRevenueImpact)}/yr</strong>
            </div>
          </div>

          {/* 4. 30-Day MRR Impact Pipeline */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-100/60 rounded-xl p-4 border border-amber-300 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-amber-900 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">30-Day MRR Pipeline</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {summary.contracts30DaysCount} due
              </span>
            </div>
            <div className="text-2xl font-black text-amber-800">
              +{formatCurrency(summary.mrrPipeline30Days)}
              <span className="text-xs font-semibold text-amber-900 ml-1">/mo</span>
            </div>
            <div className="text-[11px] text-amber-800 font-medium mt-1 flex items-center justify-between">
              <span>Immediate action runway</span>
              <span className="font-semibold text-amber-950">≤ 30 days</span>
            </div>
          </div>

          {/* 5. 90-Day MRR Impact Pipeline */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-100/60 rounded-xl p-4 border border-sky-300 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-sky-900 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">90-Day MRR Pipeline</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-200 text-sky-900 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {summary.contracts90DaysCount} due
              </span>
            </div>
            <div className="text-2xl font-black text-sky-800">
              +{formatCurrency(summary.mrrPipeline90Days)}
              <span className="text-xs font-semibold text-sky-900 ml-1">/mo</span>
            </div>
            <div className="text-[11px] text-sky-800 font-medium mt-1 flex items-center justify-between">
              <span>Quarterly forecast</span>
              <span className="font-semibold text-sky-950">≤ 90 days</span>
            </div>
          </div>
        </div>

        {/* Secondary Governance Metric Pills */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Capped Contracts: <strong>{summary.cappedContractsCount}</strong> (protected by {Math.round(adminIncreasePct * 100)}% ceiling)</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-xs">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Floor Protected: <strong>{summary.floorProtectedCount}</strong> (no decrease below frozen baseline)</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-xs">
            <Mail className="w-3.5 h-3.5 text-amber-600" />
            <span>Customer Notices Pending: <strong>{summary.notificationsPendingCount}</strong></span>
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, ID, booking ref, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#15385E] focus:border-[#15385E]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Timeframe Quick Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Runway:
            </span>
            <button
              onClick={() => setTimeframeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeframeFilter === 'all'
                  ? 'bg-[#15385E] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({contracts.length})
            </button>
            <button
              onClick={() => setTimeframeFilter('30d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                timeframeFilter === '30d'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>≤ 30 Days</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {summary.contracts30DaysCount}
              </span>
            </button>
            <button
              onClick={() => setTimeframeFilter('90d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                timeframeFilter === '90d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span>≤ 90 Days</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {summary.contracts90DaysCount}
              </span>
            </button>
            <button
              onClick={() => setTimeframeFilter('future')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeframeFilter === 'future'
                  ? 'bg-[#15385E] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              &gt; 90 Days
            </button>
          </div>
        </div>

        {/* Secondary Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Container Tier */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Container:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#15385E]"
            >
              <option value="all">All Tiers</option>
              <option value="25m³">Large 25m³</option>
              <option value="19m³">Medium 19m³</option>
              <option value="10m³">Small 10m³</option>
            </select>
          </div>

          {/* Pricing Rule Outcome */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Rule Outcome:</span>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#15385E]"
            >
              <option value="all">All Outcomes</option>
              <option value="capped_increase">Capped Increase (+{Math.round(adminIncreasePct * 100)}%)</option>
              <option value="catalog_rate_match">Adjusted to Market Catalog</option>
              <option value="floor_constraint_applied">Floor Protected (Market &lt; Frozen)</option>
              <option value="rate_unchanged">Rate Unchanged</option>
            </select>
          </div>

          {/* Notification status */}
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium">Notice Status:</span>
            <select
              value={notificationFilter}
              onChange={(e) => setNotificationFilter(e.target.value as any)}
              className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#15385E]"
            >
              <option value="all">All Notices</option>
              <option value="required">Notice Pending Dispatched</option>
              <option value="sent">Notice Sent / Logged</option>
            </select>
          </div>

          <div className="ml-auto text-slate-400">
            Showing <strong>{filteredContracts.length}</strong> of {contracts.length} contracts
          </div>
        </div>
      </div>

      {/* CUSTOMER TABLE DATA SCHEMA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#15385E] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Customer & ID</th>
                <th className="py-3.5 px-3">Booking Ref</th>
                <th className="py-3.5 px-3">Frozen Components</th>
                <th className="py-3.5 px-3">Freeze Start</th>
                <th className="py-3.5 px-3">Expiry Date</th>
                <th className="py-3.5 px-3">Days Remaining</th>
                <th className="py-3.5 px-3 text-right">Frozen Rate</th>
                <th className="py-3.5 px-3 text-right">Catalog Rate</th>
                <th className="py-3.5 px-3 text-right">Anticipated Rate</th>
                <th className="py-3.5 px-3 text-right">Monthly Δ</th>
                <th className="py-3.5 px-3 text-right">Annual Δ</th>
                <th className="py-3.5 px-3 text-center">Notice Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold">No frozen pricing contracts match the active filter criteria.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setTimeframeFilter('all');
                        setTierFilter('all');
                        setOutcomeFilter('all');
                        setNotificationFilter('all');
                      }}
                      className="mt-2 text-xs text-[#15385E] underline font-medium hover:text-[#0b2942]"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const isUrgent = c.days_remaining <= 30;
                  const isUpcoming = c.days_remaining > 30 && c.days_remaining <= 90;
                  const hasIncrease = c.monthly_revenue_delta > 0;

                  return (
                    <tr
                      key={c.customer_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isUrgent ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Customer ID & Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#15385E]" />
                          <span>{c.customer_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {c.customer_id}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {c.customer_email}
                        </div>
                        {c.has_manual_override && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                              <span>Override: ${c.override_monthly_rate}/mo ({c.override_duration_months} Mo)</span>
                            </span>
                            <span className="text-[9px] text-purple-600 font-medium">Review post-expiry</span>
                          </div>
                        )}
                      </td>

                      {/* Booking Reference */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {c.booking_reference}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {c.container_tier}
                        </div>
                      </td>

                      {/* Frozen Components Badges */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {c.frozen_components.map((comp, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Freeze Start Date */}
                      <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {c.freeze_start_date}
                      </td>

                      {/* Freeze Expiry Date */}
                      <td className="py-3 px-3 font-semibold text-slate-800 text-[11px] whitespace-nowrap">
                        {c.freeze_expiry_date}
                      </td>

                      {/* Days Remaining Countdown */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            c.days_remaining === 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isUrgent
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isUpcoming
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {c.days_remaining === 0 ? 'Expired' : `${c.days_remaining} days`}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isUrgent ? 'Imminent Action' : isUpcoming ? 'Quarterly' : 'Locked'}
                        </div>
                      </td>

                      {/* Current Frozen Rate */}
                      <td className="py-3 px-3 text-right font-medium text-slate-700">
                        {formatCurrency(c.current_frozen_rate)}
                        <span className="text-[10px] text-slate-400 block">/mo</span>
                      </td>

                      {/* Current Catalog Rate */}
                      <td className="py-3 px-3 text-right font-medium text-slate-600">
                        {formatCurrency(c.current_catalog_rate)}
                        <span className="text-[10px] text-slate-400 block">/mo</span>
                      </td>

                      {/* Anticipated New Rate */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-[#15385E]">
                          {formatCurrency(c.anticipated_new_rate)}
                          <span className="text-[10px] text-slate-400 block font-normal">/mo</span>
                        </div>
                        {/* Rule Outcome Tag */}
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-0.5 ${
                            c.has_manual_override
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : c.outcome_type === 'capped_increase'
                              ? 'bg-blue-100 text-blue-800'
                              : c.outcome_type === 'catalog_rate_match'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.outcome_type === 'floor_constraint_applied'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.has_manual_override
                            ? `Override (${c.override_duration_months} Mo)`
                            : c.outcome_type === 'capped_increase'
                            ? `Capped (+${Math.round(adminIncreasePct * 100)}%)`
                            : c.outcome_type === 'catalog_rate_match'
                            ? 'Catalog Match'
                            : c.outcome_type === 'floor_constraint_applied'
                            ? 'Floor Constraint'
                            : 'Unchanged'}
                        </span>
                      </td>

                      {/* Monthly Revenue Delta */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-black ${
                            hasIncrease ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {hasIncrease ? `+${formatCurrency(c.monthly_revenue_delta)}` : '$0.00'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/mo</span>
                      </td>

                      {/* Annual Revenue Delta */}
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-black ${
                            hasIncrease ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {hasIncrease ? `+${formatCurrency(c.annual_revenue_delta)}` : '$0.00'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/yr</span>
                      </td>

                      {/* Notification Required / Status */}
                      <td className="py-3 px-3 text-center">
                        {c.notification_sent ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 mr-1" />
                            Notice Sent
                          </span>
                        ) : c.notification_required ? (
                          <button
                            onClick={() => handleMarkNoticeSent(c.customer_id)}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors"
                            title="Click to mark notice dispatched"
                          >
                            <Mail className="w-3 h-3 mr-1 text-amber-700" />
                            Send Notice
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                            No Notice (No Δ)
                          </span>
                        )}
                        {c.notification_date && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            {c.notification_date}
                          </div>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenOverrideModal(c)}
                            className={`p-1 rounded transition-colors ${
                              c.has_manual_override
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : 'hover:bg-purple-50 text-purple-600 hover:text-purple-800'
                            }`}
                            title={
                              c.has_manual_override
                                ? 'Edit manual pricing override (N months)'
                                : 'Set manual pricing override for further N months'
                            }
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPaymentOverride(c)}
                            className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 rounded transition-colors"
                            title="Provide manual override for customer payments (EFT, PayID, Cash, Waiver)"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDetailRecord(c)}
                            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-[#15385E] rounded transition-colors"
                            title="Inspect formula breakdown & generate notice"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-[#15385E] rounded transition-colors"
                            title="Edit contract rates & timeline"
                          >
                            <Sliders className="w-4 h-4" />
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

      {/* FORMULA REFERENCE & EXPLANATION BANNER */}
      <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-xs text-slate-600 space-y-3">
        <div className="flex items-center space-x-2 font-bold text-slate-800">
          <Info className="w-4 h-4 text-[#15385E]" />
          <span className="uppercase tracking-wider">Business Logic & Calculation Governance</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block mb-1">1. Days Remaining Rule</strong>
            <code className="text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono block mb-1">
              max(0, DATEDIFF(freeze_expiry_date, NOW()))
            </code>
            <p className="text-[11px] text-slate-500">
              Tracks the countdown until the 12-month contractual rate freeze expires. Accounts with ≤30 days trigger priority notice workflows.
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block mb-1">2. Post-12-Month Price Formula</strong>
            <code className="text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono block mb-1">
              max(Frozen, min(Catalog, Frozen * (1 + Cap%)))
            </code>
            <p className="text-[11px] text-slate-500">
              Admin increase cap (default 10%) protects customers against market spikes. Floor constraint guarantees rates never drop below the original frozen quote.
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <strong className="text-slate-800 block mb-1">3. Future MRR Revenue Impact</strong>
            <code className="text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono block mb-1">
              ∑(Anticipated Rate - Current Frozen Rate)
            </code>
            <p className="text-[11px] text-slate-500">
              Aggregates immediate 30-day pipeline, quarterly 90-day pipeline, and annualized ARR run-rate gain across all unfreezing accounts.
            </p>
          </div>
        </div>
      </div>

      {/* DETAIL INSPECTOR & NOTICE MODAL */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="bg-[#15385E] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF9900]">
                  Price Freeze Breakdown & Notice
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#FF9900]" />
                  {detailRecord.customer_name} ({detailRecord.customer_id})
                </h3>
              </div>
              <button
                onClick={() => setDetailRecord(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Active Manual Override Banner */}
              {detailRecord.has_manual_override && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Admin Pricing Override Active: ${detailRecord.override_monthly_rate}/mo</span>
                    </div>
                    <p className="text-[11px] text-purple-800 mt-0.5">
                      Locked for further {detailRecord.override_duration_months} months (expires {detailRecord.freeze_expiry_date}). Existing pricing review policy applies automatically upon expiry.
                    </p>
                    {detailRecord.override_reason && (
                      <p className="text-[10px] text-purple-700 mt-0.5 font-medium">Reason: {detailRecord.override_reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenOverrideModal(detailRecord)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Edit Override
                  </button>
                </div>
              )}

              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Current Frozen</span>
                  <div className="text-lg font-bold text-slate-800">
                    {formatCurrency(detailRecord.current_frozen_rate)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Catalog</span>
                  <div className="text-lg font-bold text-slate-800">
                    {formatCurrency(detailRecord.current_catalog_rate)}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-blue-700 uppercase font-bold">Anticipated Rate</span>
                  <div className="text-lg font-black text-[#15385E]">
                    {formatCurrency(detailRecord.anticipated_new_rate)}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold">Monthly Δ</span>
                  <div className="text-lg font-black text-emerald-700">
                    +{formatCurrency(detailRecord.monthly_revenue_delta)}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Math Breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-[#FF9900]" />
                  Mathematical Step-by-Step Proof
                </h4>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-700 pl-2 border-l-2 border-[#15385E]">
                  <div>
                    1. <strong>Capped Ceiling Rate:</strong> ${detailRecord.current_frozen_rate.toFixed(2)} × (1 + {adminIncreasePct}) = ${ (detailRecord.current_frozen_rate * (1 + adminIncreasePct)).toFixed(2) }
                  </div>
                  <div>
                    2. <strong>Catalog Comparison:</strong> min(${detailRecord.current_catalog_rate.toFixed(2)}, ${(detailRecord.current_frozen_rate * (1 + adminIncreasePct)).toFixed(2)}) = ${Math.min(detailRecord.current_catalog_rate, detailRecord.current_frozen_rate * (1 + adminIncreasePct)).toFixed(2)}
                  </div>
                  <div>
                    3. <strong>Floor Constraint Check:</strong> max(${detailRecord.current_frozen_rate.toFixed(2)}, ${Math.min(detailRecord.current_catalog_rate, detailRecord.current_frozen_rate * (1 + adminIncreasePct)).toFixed(2)}) = <strong>${detailRecord.anticipated_new_rate.toFixed(2)}</strong>
                  </div>
                  <div>
                    4. <strong>Monthly Delta:</strong> ${detailRecord.anticipated_new_rate.toFixed(2)} - ${detailRecord.current_frozen_rate.toFixed(2)} = <strong>+${detailRecord.monthly_revenue_delta.toFixed(2)}/mo</strong>
                  </div>
                  <div>
                    5. <strong>Annual Projected Delta:</strong> +${detailRecord.monthly_revenue_delta.toFixed(2)} × 12 = <strong>+${detailRecord.annual_revenue_delta.toFixed(2)}/yr</strong>
                  </div>
                </div>
              </div>

              {/* Automated Customer Notice Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#15385E]" />
                    Generated Customer Communication
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateCustomerPriceNotice(detailRecord, adminIncreasePct));
                      showToast('Notice text copied to clipboard.');
                    }}
                    className="text-xs text-[#15385E] hover:underline font-semibold"
                  >
                    Copy Text
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={generateCustomerPriceNotice(detailRecord, adminIncreasePct)}
                  className="w-full text-xs font-mono p-3 bg-slate-100 rounded-lg border border-slate-300 text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                {detailRecord.notification_sent ? (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Notice dispatched on {detailRecord.notification_date}
                  </span>
                ) : (
                  <span className="text-xs text-amber-700 font-medium">
                    Notice has not been sent yet
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!detailRecord.notification_sent && detailRecord.notification_required && (
                  <button
                    onClick={() => handleMarkNoticeSent(detailRecord.customer_id)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Notice to Customer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenOverrideModal(detailRecord)}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{detailRecord.has_manual_override ? 'Edit Override' : 'Manual Override'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPaymentOverride(detailRecord)}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Manual Payment Override</span>
                </button>
                <button
                  onClick={() => setDetailRecord(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="bg-[#15385E] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#FF9900]" />
                Edit Price Freeze: {editingRecord.customer_name}
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Booking Reference</label>
                  <input
                    type="text"
                    required
                    value={formBookingRef}
                    onChange={(e) => setFormBookingRef(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Container Tier</label>
                  <input
                    type="text"
                    required
                    value={formContainerTier}
                    onChange={(e) => setFormContainerTier(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current Frozen ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formFrozenRate}
                    onChange={(e) => setFormFrozenRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Active Catalog ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCatalogRate}
                    onChange={(e) => setFormCatalogRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Days Remaining</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    required
                    value={formDaysRemaining}
                    onChange={(e) => setFormDaysRemaining(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Locked Components (Comma separated)</label>
                <input
                  type="text"
                  value={formComponents}
                  onChange={(e) => setFormComponents(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Internal Operations Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#15385E] hover:bg-[#0b2942] text-white rounded-lg font-bold"
                >
                  Save Contract Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CONTRACT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
            <div className="bg-[#15385E] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#FF9900]" />
                Add New Price Freeze Contract
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNew} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Henderson"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer ID</label>
                  <input
                    type="text"
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Booking Reference</label>
                  <input
                    type="text"
                    required
                    value={formBookingRef}
                    onChange={(e) => setFormBookingRef(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Container Tier</label>
                  <select
                    value={formContainerTier}
                    onChange={(e) => setFormContainerTier(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Large 25m³ Portabox Pro">Large 25m³ Portabox Pro</option>
                    <option value="Medium 19m³ Portabox Standard">Medium 19m³ Portabox Standard</option>
                    <option value="Small 10m³ Portabox Mini">Small 10m³ Portabox Mini</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Frozen Monthly ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formFrozenRate}
                    onChange={(e) => setFormFrozenRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current Catalog ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCatalogRate}
                    onChange={(e) => setFormCatalogRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Days Remaining</label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    required
                    value={formDaysRemaining}
                    onChange={(e) => setFormDaysRemaining(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Locked Components (Comma separated)</label>
                <input
                  type="text"
                  value={formComponents}
                  onChange={(e) => setFormComponents(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Operational Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] rounded-lg font-bold"
                >
                  Create Price Freeze Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL PRICING OVERRIDE MODAL */}
      {overrideModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border-2 border-purple-200 overflow-hidden animate-scale-in">
            <div className="bg-[#15385E] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-[#FF9900] rounded-xl border border-purple-400/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Manual Customer Pricing Override</h3>
                  <p className="text-xs text-purple-200">
                    {overrideModalRecord.customer_name} · {overrideModalRecord.booking_reference} ({overrideModalRecord.customer_id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModalRecord(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              {/* Current Context Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Frozen Rate</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {formatCurrency(overrideModalRecord.current_frozen_rate)}/mo
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Catalog Rate</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">
                    {formatCurrency(overrideModalRecord.current_catalog_rate)}/mo
                  </span>
                </div>
              </div>

              {/* Override Monthly Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
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
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-[#0b2942] focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Duration N Months Input & Preset Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Override Duration (Set Pricing for Further N Months)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  {[1, 3, 6, 12, 18, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOverrideMonths(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        overrideMonths === m
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {m} Mo
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={overrideMonths}
                    onChange={(e) => setOverrideMonths(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-xs text-[#0b2942] focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter custom number of months"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                    months
                  </span>
                </div>
              </div>

              {/* Commercial Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Commercial Agreement / Override Reason
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Contract extension agreement, VIP customer loyalty discount"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Policy Enforcement Schedule Callout */}
              <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-purple-950">
                  <Info className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Pricing Review &amp; Delivery Fee Policy</span>
                </div>
                <p className="text-[11px] text-purple-900 leading-relaxed">
                  Admin has the option to set pricing for further <strong>{overrideMonths} months</strong> at <strong>${overrideRate}/mo</strong>.
                </p>
                <p className="text-[11px] text-purple-900 leading-relaxed border-t border-purple-200/60 pt-1.5">
                  <strong>Post-Expiry Rule:</strong> Once this {overrideMonths}-month pricing period expires, the <strong>existing pricing review policy</strong> (Annual Review capped at +{Math.round(adminIncreasePct * 100)}% max with floor constraint) will automatically apply.
                </p>
                <p className="text-[10px] text-slate-600 border-t border-purple-200/60 pt-1.5 leading-relaxed">
                  <strong>Delivery Fee Policy:</strong> Monthly storage rates are contractually frozen. Delivery fees reflect current transport catalog rates at time of service.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                {overrideModalRecord.has_manual_override ? (
                  <button
                    type="button"
                    onClick={() => handleClearOverride(overrideModalRecord)}
                    className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Clear Override
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOverrideModalRecord(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {overrideModalRecord.has_manual_override && (
                    <button
                      type="button"
                      onClick={() => setOverrideModalRecord(null)}
                      className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveOverride}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Override ({overrideMonths} Mo)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL CUSTOMER PAYMENT OVERRIDE MODAL */}
      {paymentModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-emerald-200 overflow-hidden animate-scale-in">
            <div className="bg-[#0b2942] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-[#00c0f3] rounded-2xl border border-emerald-400/30">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Manual Customer Payment Override</h3>
                  <p className="text-xs text-emerald-200">
                    {paymentModalRecord.customer_name} · {paymentModalRecord.booking_reference} ({paymentModalRecord.customer_id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalRecord(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
              {/* Account Rate Context */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <div>
                  <span className="text-[10px] text-emerald-800 uppercase font-black block">Current Frozen Rate</span>
                  <span className="font-mono font-black text-slate-800 text-sm">
                    {formatCurrency(paymentModalRecord.current_frozen_rate)}/mo
                  </span>
                  <span className="text-[10px] text-slate-500 block">{paymentModalRecord.container_tier}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-800 uppercase font-black block">Days Remaining in Freeze</span>
                  <span className="font-bold text-emerald-700 text-sm block">
                    {paymentModalRecord.days_remaining} Days
                  </span>
                  <span className="text-[10px] text-slate-500 block">Expires: {paymentModalRecord.freeze_expiry_date}</span>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div>
                <label className="font-black text-slate-700 block mb-1 text-xs">
                  Manual Payment Amount (AUD $)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-2.5 font-black text-slate-400">$</span>
                    <input
                      type="number"
                      min={1}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-emerald-200 focus:border-emerald-600 focus:outline-none font-mono font-black text-slate-800 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      paymentModalRecord.current_frozen_rate,
                      Math.round(paymentModalRecord.current_frozen_rate / 2),
                      99,
                      149,
                    ].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPaymentAmount(amt)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                          paymentAmount === amt
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Classification */}
              <div>
                <label className="font-black text-slate-700 block mb-1 text-xs">Payment Classification</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white"
                >
                  <option value="periodic_rent">Periodic Storage Rent Payment (EFT / PayID / Cash)</option>
                  <option value="custom_adjustment">Deposit / Upfront Payment Override</option>
                  <option value="courtesy_credit">Courtesy Credit / Goodwill Adjustment (-$)</option>
                  <option value="waiver">Fee Waiver (Late Fee / Dry Run Rebate)</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="font-black text-slate-700 block mb-1 text-xs">Payment Method / Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white"
                >
                  <option value="Direct Bank Transfer / PayID (Verified)">Direct Bank Transfer / PayID (Verified)</option>
                  <option value="Zepto NPP Instant / PayID Webhook">Zepto NPP Instant / PayID Webhook</option>
                  <option value="EFTPOS / Card Terminal at Counter">EFTPOS / Card Terminal at Counter</option>
                  <option value="Staff Card Phone Auth (Braintree Manual)">Staff Card Phone Auth (Braintree Manual)</option>
                  <option value="Cash Received at Depot Counter">Cash Received at Depot Counter</option>
                  <option value="Courtesy Goodwill Credit / Admin Waiver">Courtesy Goodwill Credit / Admin Waiver</option>
                </select>
              </div>

              {/* Reference / Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-black text-slate-700 block mb-1 text-xs">Reference / Auth Code</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. EFT-98214 or CASH-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-black text-slate-700 block mb-1 text-xs">Ledger Description</label>
                  <input
                    type="text"
                    value={paymentDesc}
                    onChange={(e) => setPaymentDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Advance Next Billing Date Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={paymentAdvanceDate}
                  onChange={(e) => setPaymentAdvanceDate(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <span>Advance next periodic billing date by 30 days &amp; clear any overdue holds</span>
              </label>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentModalRecord(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePaymentOverride}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4 text-amber-300" />
                  <span>Confirm &amp; Record Payment (${paymentAmount} AUD)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
