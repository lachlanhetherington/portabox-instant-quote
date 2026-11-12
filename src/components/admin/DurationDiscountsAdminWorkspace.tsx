import React, { useState, useMemo } from 'react';
import {
  Clock,
  Percent,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  DollarSign,
  TrendingDown,
  Plus,
  Trash2,
  HelpCircle,
  Calculator,
  Truck,
  Building2,
  Home,
  MapPin,
  Tag,
  ShieldCheck,
  Award,
  Layers,
  Package,
  CheckSquare,
  Square,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  X,
  Edit2,
  Bell,
} from 'lucide-react';
import {
  AppConfig,
  DiscountMatrixRule,
  AnnualMilestoneOption,
  MetroHub,
  ContainerSizeId,
  ServiceType,
  EarlyTerminationResult,
} from '../../types/quote';
import {
  DEFAULT_DISCOUNT_MATRIX_RULES,
  evaluateDiscountMatrix,
  calculateEarlyTerminationClawback,
  getLockUnitValue,
} from '../../services/pricingEngine';

const METRO_HUBS: MetroHub[] = ['Adelaide', 'Sydney', 'Melbourne', 'Brisbane'];

interface DurationDiscountsAdminWorkspaceProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const DurationDiscountsAdminWorkspace: React.FC<DurationDiscountsAdminWorkspaceProps> = ({
  config,
  onUpdateConfig,
}) => {
  // Load rules from config or fallback to business preset
  const [rules, setRules] = useState<DiscountMatrixRule[]>(() => {
    return config.discountMatrixRules && config.discountMatrixRules.length > 0
      ? config.discountMatrixRules
      : [...DEFAULT_DISCOUNT_MATRIX_RULES];
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<DiscountMatrixRule | null>(null);

  // Filters
  const [filterDuration, setFilterDuration] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [filterScope, setFilterScope] = useState<string>('all');
  const [filterPlacement, setFilterPlacement] = useState<string>('all');
  const [filterHub, setFilterHub] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State for Create / Edit Modal
  const [formName, setFormName] = useState<string>('');
  const [formMinMonths, setFormMinMonths] = useState<number>(3);
  const [formMaxMonths, setFormMaxMonths] = useState<string>('3');
  const [formSizes, setFormSizes] = useState<('small_10m3' | 'medium_19m3' | 'large_25m3')[]>([
    'medium_19m3',
    'large_25m3',
  ]);
  const [formScope, setFormScope] = useState<'all' | 'local' | 'interstate'>('all');
  const [formPlacement, setFormPlacement] = useState<'all' | 'my_place' | 'facility'>('all');
  const [formHubs, setFormHubs] = useState<('all' | MetroHub)[]>(['all']);
  const [formFirstMonthFree, setFormFirstMonthFree] = useState<boolean>(true);
  const [formFreeBlankets, setFormFreeBlankets] = useState<number>(10);
  const [formFreeLock, setFormFreeLock] = useState<boolean>(true);
  const [formMilestoneOption, setFormMilestoneOption] = useState<AnnualMilestoneOption | 'none'>('none');
  const [formDiscountPercent, setFormDiscountPercent] = useState<number>(0);
  const [formPriceFreeze, setFormPriceFreeze] = useState<boolean>(true);
  const [formClawback, setFormClawback] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState<string>('');

  // Early Termination Clawback Simulator State
  const [simCommittedMonths, setSimCommittedMonths] = useState<number>(6);
  const [simActualMonths, setSimActualMonths] = useState<number>(2);
  const [simBaseMonthly, setSimBaseMonthly] = useState<number>(219);
  const [simHadFirstMonthFree, setSimHadFirstMonthFree] = useState<boolean>(true);
  const [simBlanketsProvided, setSimBlanketsProvided] = useState<number>(10);
  const [simLockProvided, setSimLockProvided] = useState<boolean>(true);
  const [simMilestoneCredit, setSimMilestoneCredit] = useState<number>(0);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (filterDuration !== 'all') {
        const d = parseFloat(filterDuration);
        if (r.minMonths !== d) return false;
      }
      if (filterSize !== 'all') {
        if (!r.containerSizes.includes(filterSize as any)) return false;
      }
      if (filterScope !== 'all') {
        if (r.moveScope !== 'all' && r.moveScope !== filterScope) return false;
      }
      if (filterPlacement !== 'all') {
        if (r.storagePlacement !== 'all' && r.storagePlacement !== filterPlacement) return false;
      }
      if (filterHub !== 'all') {
        if (!r.hubLocations.includes('all') && !r.hubLocations.includes(filterHub as any)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        const matchesNotes = (r.notes || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesNotes) return false;
      }
      return true;
    });
  }, [rules, filterDuration, filterSize, filterScope, filterPlacement, filterHub, searchQuery]);

  // Multi-select helpers
  const isAllFilteredSelected =
    filteredRules.length > 0 && filteredRules.every((r) => selectedIds.has(r.id));

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      filteredRules.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Actions
  const handleBulkToggleActive = (active: boolean) => {
    setRules((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, active } : r))
    );
  };

  const handleBulkSetFirstMonthFree = (firstMonthFree: boolean) => {
    setRules((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, firstMonthFree } : r))
    );
  };

  const handleBulkSetSupplies = (freeLockIncluded: boolean, freeBlanketsCount: number) => {
    setRules((prev) =>
      prev.map((r) =>
        selectedIds.has(r.id)
          ? { ...r, freeLockIncluded, freeBlanketsCount }
          : r
      )
    );
  };

  const handleBulkSetPriceFreeze = (isPriceFreezeProtected: boolean) => {
    setRules((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, isPriceFreezeProtected } : r))
    );
  };

  const handleBulkSetClawback = (earlyTerminationClawbackEnabled: boolean) => {
    setRules((prev) =>
      prev.map((r) => (selectedIds.has(r.id) ? { ...r, earlyTerminationClawbackEnabled } : r))
    );
  };

  const handleBulkDelete = () => {
    if (rules.length <= selectedIds.size) {
      alert('Cannot delete all rules. At least one rule must remain.');
      return;
    }
    setRules((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  };

  // Save changes
  const handleSaveAll = () => {
    const sorted = [...rules].sort((a, b) => a.minMonths - b.minMonths);
    const updated: AppConfig = {
      ...config,
      discountMatrixRules: sorted,
    };
    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Reset to spreadsheet default preset
  const handleResetToPreset = () => {
    if (window.confirm('Reset all rules back to the business matrix specification sheet?')) {
      setRules([...DEFAULT_DISCOUNT_MATRIX_RULES]);
      setSelectedIds(new Set());
      const updated: AppConfig = {
        ...config,
        discountMatrixRules: [...DEFAULT_DISCOUNT_MATRIX_RULES],
      };
      onUpdateConfig(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Modal open for Edit
  const handleOpenEdit = (rule: DiscountMatrixRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormMinMonths(rule.minMonths);
    setFormMaxMonths(rule.maxMonths !== undefined ? String(rule.maxMonths) : '');
    setFormSizes(rule.containerSizes);
    setFormScope(rule.moveScope);
    setFormPlacement(rule.storagePlacement);
    setFormHubs(rule.hubLocations);
    setFormFirstMonthFree(Boolean(rule.firstMonthFree));
    setFormFreeBlankets(rule.freeBlanketsCount || 0);
    setFormFreeLock(Boolean(rule.freeLockIncluded));
    setFormMilestoneOption(rule.milestoneDiscountOption || 'none');
    setFormDiscountPercent(rule.discountPercent || 0);
    setFormPriceFreeze(rule.isPriceFreezeProtected !== false);
    setFormClawback(rule.earlyTerminationClawbackEnabled !== false);
    setFormNotes(rule.notes || '');
    setIsCreateModalOpen(true);
  };

  // Modal open for Create
  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormName('New Duration Discount Rule');
    setFormMinMonths(3);
    setFormMaxMonths('3');
    setFormSizes(['medium_19m3', 'large_25m3']);
    setFormScope('all');
    setFormPlacement('all');
    setFormHubs(['all']);
    setFormFirstMonthFree(true);
    setFormFreeBlankets(10);
    setFormFreeLock(true);
    setFormMilestoneOption('none');
    setFormDiscountPercent(0);
    setFormPriceFreeze(true);
    setFormClawback(true);
    setFormNotes('Free Blankets, Free Lock, 1st Mth Free');
    setIsCreateModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModalForm = (e: React.FormEvent) => {
    e.preventDefault();
    const maxM = formMaxMonths.trim() ? parseFloat(formMaxMonths) : undefined;
    const is12Plus = formMinMonths >= 12;

    const ruleData: DiscountMatrixRule = {
      id: editingRule ? editingRule.id : `dm-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: formName.trim() || `${formMinMonths} Months Discount`,
      active: editingRule ? editingRule.active : true,
      minMonths: formMinMonths,
      maxMonths: is12Plus ? undefined : maxM,
      containerSizes: formSizes.length > 0 ? formSizes : ['medium_19m3', 'large_25m3'],
      moveScope: formScope,
      storagePlacement: formPlacement,
      hubLocations: formHubs.length > 0 ? formHubs : ['all'],
      firstMonthFree: formFirstMonthFree,
      freeBlanketsCount: formFreeBlankets,
      freeLockIncluded: formFreeLock,
      discountPercent: formDiscountPercent,
      milestoneDiscountAmount: is12Plus ? 400 : undefined,
      milestoneDiscountOption: is12Plus && formMilestoneOption !== 'none' ? formMilestoneOption : undefined,
      isPriceFreezeProtected: formPriceFreeze,
      earlyTerminationClawbackEnabled: formClawback,
      notes: formNotes.trim(),
      description: `${formFirstMonthFree ? '1st Month Free · ' : ''}${formFreeBlankets > 0 ? `${formFreeBlankets} Free Blankets · ` : ''}${formFreeLock ? 'Free Lock' : ''}`.trim() || 'Custom duration discount rule',
    };

    if (editingRule) {
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? ruleData : r)));
    } else {
      setRules((prev) => [...prev, ruleData].sort((a, b) => a.minMonths - b.minMonths));
    }
    setIsCreateModalOpen(false);
  };

  // Calculate live clawback simulation
  const simClawbackResult: EarlyTerminationResult = calculateEarlyTerminationClawback({
    committedMonths: simCommittedMonths,
    actualMonthsCompleted: simActualMonths,
    monthlyStorageRate: simBaseMonthly,
    firstMonthWasFree: simHadFirstMonthFree,
    freeBlanketsProvided: simBlanketsProvided,
    freeLockProvided: simLockProvided,
    milestoneDiscountApplied: simMilestoneCredit,
    suppliesConfig: config.packingSupplies,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-br from-[#15385E] via-[#112F4F] to-[#0A1B2F] text-white shadow-md border-2 border-[#5CC1EF]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#5CC1EF]/20 border border-[#5CC1EF]/50 flex items-center justify-center text-[#5CC1EF] shadow-inner shrink-0">
              <Percent className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#F7D347] text-[#1A1A1A] px-2.5 py-0.5 rounded-md">
                  PORTABOX ADMIN MATRIX
                </span>
                <span className="text-[10px] font-bold text-sky-200">
                  Duration, Upfront, Price Freeze & Clawback Logic
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Duration & Discount Matrix
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl text-xs font-black text-[#15385E] bg-white hover:bg-slate-100 transition-all border border-white/40 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3] text-emerald-600" />
              <span>Add Discount Rule</span>
            </button>

            <button
              type="button"
              onClick={handleResetToPreset}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Matrix Preset</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl text-xs font-black text-[#1A1A1A] bg-[#F7D347] hover:bg-[#eed235] transition-all border border-[#e6c338] shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-800 stroke-[3]" />
                  <span>Saved to Applet!</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Business Matrix Reference Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/15">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#F7D347]">
              Prepayment Stacking Schedule
            </span>
            <div className="mt-1.5 space-y-1 text-slate-200 text-[11px]">
              <div>• Monthly Ongoing: Standard rate</div>
              <div>• 6 Months Upfront: <strong>5% off</strong> + duration incentives</div>
              <div>• 12 Months Upfront: <strong>10% off</strong> + duration incentives</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 border border-white/15">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#5CC1EF]">
              12+ Month Milestone Choice
            </span>
            <div className="mt-1.5 space-y-1 text-slate-200 text-[11px]">
              <div>• <strong>Plan 400B (Split)</strong>: $200 at m6 + $200 at m12</div>
              <div>• <strong>Plan 400A (Lump Sum)</strong>: $400 at m12</div>
              <div>• Free Blankets & Free Disc Lock auto-included</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 border border-white/15">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Guarantee & Clawback Policy
            </span>
            <div className="mt-1.5 space-y-1 text-slate-200 text-[11px]">
              <div>• <strong>1-Year Booking Price Guarantee</strong> locks discounted rate</div>
              <div>• Early exit clawback automatically bills waived fees on final invoice</div>
              <div>• <strong>7' Containers</strong> are strictly exempt from discounts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search duration, rule name, or notes..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#15385E]/20 focus:border-[#15385E]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredRules.length} of {rules.length} rules
            </span>
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Duration Filter */}
            <select
              value={filterDuration}
              onChange={(e) => setFilterDuration(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-[#15385E]"
            >
              <option value="all">All Durations</option>
              <option value="0.5">2 Weeks</option>
              <option value="1">1 Month</option>
              <option value="2">2 Months</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12+ Months</option>
            </select>

            {/* Container Size Filter */}
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-[#15385E]"
            >
              <option value="all">All Container Sizes</option>
              <option value="small_10m3">7' (Small)</option>
              <option value="medium_19m3">12' (Medium)</option>
              <option value="large_25m3">16' (Large)</option>
            </select>

            {/* Scope Filter */}
            <select
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-[#15385E]"
            >
              <option value="all">All Scopes (Local & IF)</option>
              <option value="local">Local Only</option>
              <option value="interstate">Interstate Only</option>
            </select>

            {/* Placement Filter */}
            <select
              value={filterPlacement}
              onChange={(e) => setFilterPlacement(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-[#15385E]"
            >
              <option value="all">All Placements</option>
              <option value="my_place">Your Home (Customer Site)</option>
              <option value="facility">Our Location (Portabox Site)</option>
            </select>

            {/* Hub Filter */}
            <select
              value={filterHub}
              onChange={(e) => setFilterHub(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:border-[#15385E]"
            >
              <option value="all">All Depot Locations</option>
              {METRO_HUBS.map((hub) => (
                <option key={hub} value={hub}>
                  {hub} Depot
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sticky Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-black text-amber-950">
                {selectedIds.size} rule{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-amber-800 underline font-semibold hover:text-amber-950 cursor-pointer"
              >
                {isAllFilteredSelected ? 'Deselect all' : 'Select all filtered'}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleBulkToggleActive(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
              >
                Activate
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggleActive(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 text-white font-bold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                Deactivate
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetFirstMonthFree(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-600 transition-colors shadow-2xs cursor-pointer"
              >
                Set 1st Mth Free
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetSupplies(true, 10)}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors shadow-2xs cursor-pointer"
              >
                Set Free Blankets & Lock
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetClawback(true)}
                className="px-3 py-1.5 rounded-lg bg-[#15385E] text-white font-bold hover:bg-[#112F4F] transition-colors shadow-2xs cursor-pointer"
              >
                Enforce Clawback
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main High-Density Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black text-[10px] tracking-wider select-none">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={handleSelectAllFiltered}
                    className="w-4 h-4 rounded text-[#15385E] focus:ring-[#5CC1EF] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Duration / Months</th>
                <th className="py-3 px-3">Container Size</th>
                <th className="py-3 px-3">Scope</th>
                <th className="py-3 px-3">Placement</th>
                <th className="py-3 px-3">Hub Location</th>
                <th className="py-3 px-3">Discounts & Benefits</th>
                <th className="py-3 px-2 text-center">Freeze</th>
                <th className="py-3 px-2 text-center">Clawback</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No discount rules match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const isSelected = selectedIds.has(rule.id);
                  const isSmallExempt = rule.containerSizes.length === 1 && rule.containerSizes[0] === 'small_10m3';

                  return (
                    <tr
                      key={rule.id}
                      className={`h-11 transition-colors ${
                        isSelected
                          ? 'bg-amber-50/60'
                          : !rule.active
                          ? 'bg-slate-50/50 opacity-60'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(rule.id)}
                          className="w-4 h-4 rounded text-[#15385E] focus:ring-[#5CC1EF] cursor-pointer"
                        />
                      </td>

                      {/* Duration */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-bold text-[#15385E] tabular-nums">
                          {rule.minMonths === 0.5
                            ? '2 Weeks (0.5 mo)'
                            : rule.maxMonths === undefined || rule.minMonths >= 12
                            ? `${rule.minMonths}+ Months`
                            : `${rule.minMonths} Month${rule.minMonths > 1 ? 's' : ''}`}
                        </span>
                      </td>

                      {/* Container Size */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isSmallExempt ? (
                          <span className="text-slate-500 font-semibold">7' Small (Exempt)</span>
                        ) : rule.containerSizes.length >= 2 ? (
                          <span className="font-semibold text-slate-800">12' Medium & 16' Large</span>
                        ) : (
                          <span className="font-semibold text-slate-800">
                            {rule.containerSizes.map((s) => s.replace('_', ' ')).join(', ')}
                          </span>
                        )}
                      </td>

                      {/* Scope */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {rule.moveScope === 'all'
                          ? 'Both (Local & IF)'
                          : rule.moveScope === 'interstate'
                          ? 'Interstate'
                          : 'Local'}
                      </td>

                      {/* Placement */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {rule.storagePlacement === 'all'
                          ? 'Both'
                          : rule.storagePlacement === 'my_place'
                          ? 'Your Home'
                          : 'Our Location'}
                      </td>

                      {/* Hub Location */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        {rule.hubLocations.includes('all') ? 'All Hubs' : rule.hubLocations.join(', ')}
                      </td>

                      {/* Discounts & Benefits */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {rule.firstMonthFree && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                              1st Mth Free
                            </span>
                          )}
                          {rule.freeLockIncluded && (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-[#15385E] border border-sky-300 px-2 py-0.5 rounded">
                              Free Lock
                            </span>
                          )}
                          {rule.freeBlanketsCount ? (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-[#15385E] border border-sky-300 px-2 py-0.5 rounded">
                              {rule.freeBlanketsCount} Blankets
                            </span>
                          ) : null}
                          {rule.milestoneDiscountAmount ? (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded">
                              ${rule.milestoneDiscountAmount} ({rule.milestoneDiscountOption || '400B'})
                            </span>
                          ) : null}
                          {rule.discountPercent ? (
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded">
                              {rule.discountPercent}% Off
                            </span>
                          ) : null}
                          {!rule.firstMonthFree &&
                            !rule.freeLockIncluded &&
                            !rule.freeBlanketsCount &&
                            !rule.milestoneDiscountAmount &&
                            !rule.discountPercent && (
                              <span className="text-slate-400 font-medium italic">None</span>
                            )}
                        </div>
                      </td>

                      {/* Price Freeze */}
                      <td className="py-2 px-2 text-center">
                        {rule.isPriceFreezeProtected !== false ? (
                          <span className="text-sky-700 font-bold" title="1-Year Price Guarantee applies">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Clawback */}
                      <td className="py-2 px-2 text-center">
                        {rule.earlyTerminationClawbackEnabled !== false ? (
                          <span className="text-amber-800 font-bold" title="Reverses discounts if customer exits early">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setRules((prev) =>
                              prev.map((r) =>
                                r.id === rule.id ? { ...r, active: !r.active } : r
                              )
                            );
                          }}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                            rule.active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {rule.active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rule)}
                            className="p-1 rounded text-slate-400 hover:text-[#15385E] hover:bg-slate-100 transition-colors"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (rules.length <= 1) return;
                              setRules((prev) => prev.filter((r) => r.id !== rule.id));
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Early Termination Clawback Live Simulator */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Early Termination Clawback Engine
              </h3>
              <p className="text-xs text-slate-500">
                Calculates automatic reversal when customer vacates earlier than committed duration
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            Live Settlement Audit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Committed Duration</label>
            <select
              value={simCommittedMonths}
              onChange={(e) => setSimCommittedMonths(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            >
              <option value={2}>2 Months</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Actual Completed Months</label>
            <select
              value={simActualMonths}
              onChange={(e) => setSimActualMonths(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            >
              <option value={0}>0 Months (Under 1 Month)</option>
              <option value={1}>1 Month</option>
              <option value={2}>2 Months</option>
              <option value={3}>3 Months</option>
              <option value={4}>4 Months</option>
              <option value={5}>5 Months</option>
              <option value={6}>6 Months (Completed)</option>
              <option value={12}>12 Months (Completed)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Monthly Rack Rate ($)</label>
            <input
              type="number"
              value={simBaseMonthly}
              onChange={(e) => setSimBaseMonthly(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            />
          </div>

          <div className="flex flex-col justify-end space-y-1">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={simHadFirstMonthFree}
                onChange={(e) => setSimHadFirstMonthFree(e.target.checked)}
                className="w-4 h-4 rounded text-[#15385E]"
              />
              <span>1st Month Was Free ($0)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={simLockProvided}
                onChange={(e) => setSimLockProvided(e.target.checked)}
                className="w-4 h-4 rounded text-[#15385E]"
              />
              <span>Free Lock Received (${getLockUnitValue(config.packingSupplies)})</span>
            </label>
          </div>
        </div>

        {/* Live Clawback Result Banner */}
        <div
          className={`p-4 rounded-2xl border ${
            simClawbackResult.isViolation
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wide">
                  {simClawbackResult.isViolation ? '⚠️ Discount Reversal Triggered' : '✓ Commitment Fulfilled'}
                </span>
                {simClawbackResult.isViolation && (
                  <span className="text-xs font-black bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                    Clawback Total: +${simClawbackResult.totalClawbackAmount.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {simClawbackResult.customerNotificationText}
              </p>
              {simClawbackResult.itemizedClawbacks.length > 0 && (
                <div className="pt-2 space-y-1 text-xs">
                  <span className="font-bold text-slate-900">Itemized Deductions for Settlement:</span>
                  <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                    {simClawbackResult.itemizedClawbacks.map((item, idx) => (
                      <li key={idx}>
                        <strong>{item.item}</strong>: +${item.waivedValue.toFixed(2)} ({item.reason})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Rule Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#15385E] text-white flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingRule ? 'Edit Discount Matrix Rule' : 'Add Discount Matrix Rule'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalForm} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. 3 Months Standard Discount"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Duration (Months)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formMinMonths}
                    onChange={(e) => setFormMinMonths(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Duration (Blank = +)</label>
                  <input
                    type="text"
                    value={formMaxMonths}
                    onChange={(e) => setFormMaxMonths(e.target.value)}
                    placeholder="e.g. 3 or leave blank for 12+"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Move Scope</label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                  >
                    <option value="all">Both (Local & IF)</option>
                    <option value="local">Local Only</option>
                    <option value="interstate">Interstate Only</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Placement</label>
                  <select
                    value={formPlacement}
                    onChange={(e) => setFormPlacement(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                  >
                    <option value="all">Both</option>
                    <option value="my_place">Your Home</option>
                    <option value="facility">Our Location</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Depot Hub</label>
                  <select
                    value={formHubs[0] || 'all'}
                    onChange={(e) => setFormHubs([e.target.value as any])}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-800"
                  >
                    <option value="all">All Hubs</option>
                    {METRO_HUBS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Incentives */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="font-black text-slate-900 block">Promotional Allowances</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formFirstMonthFree}
                      onChange={(e) => setFormFirstMonthFree(e.target.checked)}
                      className="w-4 h-4 rounded text-[#15385E]"
                    />
                    <span>1st Month Free ($0)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formFreeLock}
                      onChange={(e) => setFormFreeLock(e.target.checked)}
                      className="w-4 h-4 rounded text-[#15385E]"
                    />
                    <span>Free Disc Padlock</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Free Blankets Count</label>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={formFreeBlankets}
                      onChange={(e) => setFormFreeBlankets(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">12+ Mth Milestone Credit</label>
                    <select
                      value={formMilestoneOption}
                      onChange={(e) => setFormMilestoneOption(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 font-bold text-slate-800"
                    >
                      <option value="none">None</option>
                      <option value="400B">400B ($200 m6 + $200 m12)</option>
                      <option value="400A">400A ($400 m12)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Guarantees */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formPriceFreeze}
                    onChange={(e) => setFormPriceFreeze(e.target.checked)}
                    className="w-4 h-4 rounded text-[#15385E]"
                  />
                  <span>1-Year Rate Freeze Guarantee</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formClawback}
                    onChange={(e) => setFormClawback(e.target.checked)}
                    className="w-4 h-4 rounded text-[#15385E]"
                  />
                  <span>Enforce Early Exit Clawback</span>
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Free Blankets, Free Lock, 1st Mth Free"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#15385E] text-white font-black hover:bg-[#112F4F] shadow-sm cursor-pointer"
                >
                  {editingRule ? 'Save Changes' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
