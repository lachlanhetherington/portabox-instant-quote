import React, { useState } from 'react';
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
} from 'lucide-react';
import { AppConfig, DurationDiscountTier, ServiceType } from '../../types/quote';
import { DEFAULT_DURATION_DISCOUNTS, getDurationDiscount } from '../../services/pricingEngine';

interface DurationDiscountsAdminWorkspaceProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

export const DurationDiscountsAdminWorkspace: React.FC<DurationDiscountsAdminWorkspaceProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [tiers, setTiers] = useState<DurationDiscountTier[]>(() => {
    return config.durationDiscounts && config.durationDiscounts.length > 0
      ? config.durationDiscounts
      : [...DEFAULT_DURATION_DISCOUNTS];
  });

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Form state for creating a new multi-condition duration discount
  const [newMonths, setNewMonths] = useState<number>(6);
  const [newPercent, setNewPercent] = useState<number>(20);
  const [newLabel, setNewLabel] = useState<string>('6 Months (20% OFF)');
  const [newServiceType, setNewServiceType] = useState<'all' | 'moving_storage' | 'storage_at_place' | 'storage_facility' | 'moving'>('all');
  const [newMoveScope, setNewMoveScope] = useState<'all' | 'local' | 'interstate'>('all');
  const [newStorageLocation, setNewStorageLocation] = useState<'all' | 'facility' | 'my_place'>('all');
  const [newApplyMode, setNewApplyMode] = useState<'upfront_monthly' | 'on_completion_remaining_charges'>('upfront_monthly');
  const [newFreeBlankets, setNewFreeBlankets] = useState<number>(0);
  const [newDescription, setNewDescription] = useState<string>('');

  // Simulator test parameters
  const [simMonths, setSimMonths] = useState<number>(6);
  const [simServiceType, setSimServiceType] = useState<ServiceType>('moving_storage');
  const [simIsInterstate, setSimIsInterstate] = useState<boolean>(false);
  const [simStoragePlacement, setSimStoragePlacement] = useState<'facility' | 'my_place'>('facility');

  const handleUpdateTier = (idOrIndex: string | number, updates: Partial<DurationDiscountTier>) => {
    setTiers((prev) =>
      prev.map((t, idx) => {
        const matches = t.id ? t.id === idOrIndex : idx === idOrIndex;
        return matches ? { ...t, ...updates } : t;
      })
    );
  };

  const handleToggleTierActive = (idOrIndex: string | number) => {
    setTiers((prev) =>
      prev.map((t, idx) => {
        const matches = t.id ? t.id === idOrIndex : idx === idOrIndex;
        return matches ? { ...t, active: t.active === false ? true : false } : t;
      })
    );
  };

  const handleRemoveTier = (idOrIndex: string | number) => {
    if (tiers.length <= 1) return;
    setTiers((prev) =>
      prev.filter((t, idx) => {
        return t.id ? t.id !== idOrIndex : idx !== idOrIndex;
      })
    );
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: DurationDiscountTier = {
      id: `duration-discount-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      months: newMonths,
      discountPercent: Math.max(0, Math.min(100, newPercent)),
      label: newLabel.trim() || `${newMonths} Months (${newPercent}% OFF)`,
      serviceType: newServiceType,
      moveScope: newMoveScope,
      storageLocation: newStorageLocation,
      applyMode: newApplyMode,
      freeBlanketsCount: newFreeBlankets > 0 ? newFreeBlankets : undefined,
      description: newDescription.trim() || `${newPercent}% discount for ${newMonths}+ months duration`,
      active: true,
    };

    setTiers((prev) => [...prev, newRule].sort((a, b) => a.months - b.months));
    setIsCreateModalOpen(false);
    // Reset form defaults
    setNewLabel('');
    setNewDescription('');
    setNewFreeBlankets(0);
  };

  const handleSave = () => {
    const sorted = [...tiers].sort((a, b) => a.months - b.months);
    const updated: AppConfig = {
      ...config,
      durationDiscounts: sorted,
    };
    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    setTiers([...DEFAULT_DURATION_DISCOUNTS]);
    const updated: AppConfig = {
      ...config,
      durationDiscounts: [...DEFAULT_DURATION_DISCOUNTS],
    };
    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Run simulation matching
  const simResult = getDurationDiscount(
    {
      months: simMonths,
      serviceType: simServiceType,
      isInterstate: simIsInterstate,
      storagePlacement: simStoragePlacement,
    },
    tiers
  );

  const sampleBaseMonthly = 219;
  const simDiscountDollars = Math.round(sampleBaseMonthly * (simResult.discountPercent / 100));
  const simFinalMonthly = simResult.applyMode === 'on_completion_remaining_charges'
    ? sampleBaseMonthly
    : sampleBaseMonthly - simDiscountDollars;
  const simCompletionBonus = simResult.applyMode === 'on_completion_remaining_charges'
    ? simDiscountDollars * simMonths
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-br from-[#15385E] via-[#112F4F] to-[#0A1B2F] text-white shadow-md border-2 border-[#5CC1EF]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#5CC1EF]/20 border border-[#5CC1EF]/50 flex items-center justify-center text-[#5CC1EF] shadow-inner shrink-0">
              <Percent className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#F7D347] text-[#1A1A1A] px-2.5 py-0.5 rounded-md">
                  PORTABOX ADMIN CONFIGURATION
                </span>
                <span className="text-[10px] font-bold text-sky-200">
                  CEO Duration Discount Engine
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Duration Discount Matrix
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-black text-[#15385E] bg-white hover:bg-slate-100 transition-all border border-white/40 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3] text-emerald-600" />
              <span>Create Discount Rule</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-black text-[#1A1A1A] bg-[#F7D347] hover:bg-[#eed235] transition-all border border-[#e6c338] shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-800 stroke-[3]" />
                  <span>Saved Successfully!</span>
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

        {/* CEO Specification Guidance Banner */}
        <div className="p-4 rounded-2xl bg-white/10 border border-white/15 text-xs text-sky-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#F7D347] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Page 5 Linked Durations:</strong>
              Discounts link automatically to the duration chosen by the customer (2 weeks, 1–12+ months).
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Award className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Completion Discount Mode:</strong>
              If configured, when the customer completes their term, the discount is applied to remaining charges &amp; return fees.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-[#5CC1EF] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Multi-Condition Scopes:</strong>
              Target Moving vs Storage, Local vs Interstate, and Portabox Location vs Customer Own Location.
            </div>
          </div>
        </div>
      </div>

      {/* Configured Discount Rules Table / Cards */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#15385E]">
                Configured Duration Discounts ({tiers.length} Active Rules)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Discounts matched dynamically to customer selection of duration, service, moving scope, and storage placement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#15385E] bg-sky-50 hover:bg-sky-100 border border-[#5CC1EF]/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#5CC1EF]" />
            <span>Add New Rule</span>
          </button>
        </div>

        {/* Tiers List */}
        <div className="space-y-3">
          {tiers.map((tier, idx) => {
            const tierKey = tier.id || `tier-${idx}`;
            const isActive = tier.active !== false;

            return (
              <div
                key={tierKey}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'border-slate-200 bg-white hover:border-[#5CC1EF] shadow-2xs'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Duration Pill & Badges */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-[#15385E] text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                      <span className="font-mono font-black text-lg leading-tight">
                        {tier.months === 0.5 ? '2W' : `${tier.months}M`}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#F7D347]">
                        {tier.months === 0.5 ? 'Weeks' : 'Min Mo'}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-[#15385E]">
                          {tier.label || `${tier.months} Months Duration`}
                        </span>

                        {/* Discount Pill */}
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {tier.discountPercent}% OFF
                        </span>

                        {/* Apply Mode Badge */}
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          tier.applyMode === 'on_completion_remaining_charges'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-sky-100 text-[#15385E] border border-sky-200'
                        }`}>
                          {tier.applyMode === 'on_completion_remaining_charges'
                            ? '★ Applied to Remaining Charges upon Completion'
                            : 'Upfront Monthly Storage Discount'}
                        </span>

                        {/* Active status */}
                        <button
                          type="button"
                          onClick={() => handleToggleTierActive(tier.id || idx)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {isActive ? '✓ Active' : '✕ Disabled'}
                        </button>
                      </div>

                      {/* Filter Scopes Row */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                        {/* Service Type Scope */}
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>
                            Service:{' '}
                            <strong>
                              {tier.serviceType === 'moving_storage'
                                ? 'Moving & Storage'
                                : tier.serviceType === 'storage_at_place'
                                ? 'Storage at Place'
                                : tier.serviceType === 'storage_facility'
                                ? 'Storage at Portabox Location'
                                : tier.serviceType === 'moving'
                                ? 'Moving Only'
                                : 'All Services'}
                            </strong>
                          </span>
                        </span>

                        {/* Move Scope */}
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Truck className="w-3 h-3 text-slate-500" />
                          <span>
                            Move:{' '}
                            <strong>
                              {tier.moveScope === 'interstate'
                                ? 'Interstate Moves'
                                : tier.moveScope === 'local'
                                ? 'Local Moves'
                                : 'All Moves (Local & Interstate)'}
                            </strong>
                          </span>
                        </span>

                        {/* Storage Location Scope */}
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>
                            Location:{' '}
                            <strong>
                              {tier.storageLocation === 'facility'
                                ? 'Portabox Location (Depot)'
                                : tier.storageLocation === 'my_place'
                                ? 'Customer Location (My Location)'
                                : 'All Locations'}
                            </strong>
                          </span>
                        </span>

                        {/* Free Blanket Rental Incentive (Lots of 10) */}
                        {Boolean(tier.freeBlanketsCount && tier.freeBlanketsCount > 0) && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            <Package className="w-3 h-3 text-amber-700" />
                            <span>+{tier.freeBlanketsCount} Free Blankets Incentive (Lots of 10)</span>
                          </span>
                        )}
                      </div>

                      {tier.description && (
                        <p className="text-[11px] text-slate-500 italic">
                          "{tier.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Adjust Discount %, Free Blankets & Remove */}
                  <div className="flex items-center gap-3 self-end lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-bold">Rate:</span>
                      <div className="relative w-20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tier.discountPercent}
                          onChange={(e) =>
                            handleUpdateTier(tier.id || idx, {
                              discountPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                            })
                          }
                          className="w-full pl-2 pr-6 py-1.5 rounded-xl border border-slate-300 font-mono font-extrabold text-sm text-[#15385E] bg-white text-right focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center text-xs text-slate-400 font-bold pointer-events-none">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 font-bold">Free Blankets:</span>
                      <select
                        value={tier.freeBlanketsCount || 0}
                        onChange={(e) =>
                          handleUpdateTier(tier.id || idx, {
                            freeBlanketsCount: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="py-1 px-2 rounded-xl border border-slate-300 font-bold text-xs text-[#15385E] bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        title="Award free blankets in lots of 10 as duration incentive"
                      >
                        <option value={0}>0 (None)</option>
                        <option value={10}>10 pk (1 lot)</option>
                        <option value={20}>20 pk (2 lots)</option>
                        <option value={30}>30 pk (3 lots)</option>
                        <option value={40}>40 pk (4 lots)</option>
                        <option value={50}>50 pk (5 lots)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTier(tier.id || idx)}
                      title="Remove this discount rule"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulator: Interactive Verification for Multi-Condition Matching */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#15385E] flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4 text-[#5CC1EF]" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#15385E]">
              CEO Multi-Condition Discount Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Test how customer selections link to active admin duration discounts in real-time.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* 1. Customer Duration */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="font-extrabold text-[#15385E] block">
              1. Customer Selected Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="24"
                step="0.5"
                value={simMonths}
                onChange={(e) => setSimMonths(parseFloat(e.target.value))}
                className="w-full accent-[#15385E]"
              />
              <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded-lg border border-slate-300 w-16 text-center shrink-0">
                {simMonths === 0.5 ? '2 Wks' : `${simMonths} mo`}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap pt-1">
              {[0.5, 1, 2, 3, 6, 9, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSimMonths(m)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    simMonths === m ? 'bg-[#15385E] text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {m === 0.5 ? '2w' : `${m}m`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Service Type */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="font-extrabold text-[#15385E] block">
              2. Moving or Storage
            </label>
            <select
              value={simServiceType}
              onChange={(e) => setSimServiceType(e.target.value as ServiceType)}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-medium text-xs text-[#15385E] focus:outline-none"
            >
              <option value="moving_storage">Moving &amp; Storage</option>
              <option value="storage_at_place">Storage at My Place</option>
              <option value="storage_facility">Storage at Portabox Location</option>
              <option value="moving">Moving Only</option>
            </select>
          </div>

          {/* 3. Move Scope (Local vs Interstate) */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="font-extrabold text-[#15385E] block">
              3. Move Scope
            </label>
            <select
              value={simIsInterstate ? 'interstate' : 'local'}
              onChange={(e) => setSimIsInterstate(e.target.value === 'interstate')}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-medium text-xs text-[#15385E] focus:outline-none"
            >
              <option value="local">Local Move (Within Metro Hub)</option>
              <option value="interstate">Interstate Move</option>
            </select>
          </div>

          {/* 4. Storage Location */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="font-extrabold text-[#15385E] block">
              4. Storage Location
            </label>
            <select
              value={simStoragePlacement}
              onChange={(e) => setSimStoragePlacement(e.target.value as 'facility' | 'my_place')}
              className="w-full p-2 rounded-xl border border-slate-300 bg-white font-medium text-xs text-[#15385E] focus:outline-none"
            >
              <option value="facility">Portabox Location (Depot Warehouse)</option>
              <option value="my_place">Customer Location (My Location)</option>
            </select>
          </div>
        </div>

        {/* Simulation Result Output */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-md">
                MATCHED DISCOUNT
              </span>
              <span className="font-extrabold text-sm text-emerald-300">
                {simResult.discountPercent}% Duration Discount
              </span>
              {Boolean(simResult.freeBlanketsCount && simResult.freeBlanketsCount > 0) && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-md">
                  +{simResult.freeBlanketsCount} Free Blankets
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              {simResult.reason}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono self-start md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">Sample Monthly:</span>
              <span className="text-emerald-400 font-bold text-sm">
                ${simFinalMonthly} /mo
              </span>
            </div>

            {simResult.applyMode === 'on_completion_remaining_charges' ? (
              <div className="text-amber-300">
                <span className="text-slate-400 block text-[10px] font-sans">Completion Bonus:</span>
                <span className="font-bold text-sm">
                  ${simCompletionBonus} credit on remaining fees
                </span>
              </div>
            ) : (
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">Monthly Savings:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  Save ${simDiscountDollars} /mo
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create New Multi-Condition Duration Discount Rule */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border-2 border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5 text-[#00c0f3]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#15385E]">
                    Add New Duration Discount Rule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define condition scopes, storage duration threshold, and application mode.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              {/* Row 1: Months & Discount % */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">
                    Duration Threshold (Months / 2 Weeks)
                  </label>
                  <select
                    value={newMonths}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setNewMonths(val);
                      if (!newLabel || newLabel.includes('Months')) {
                        setNewLabel(val === 0.5 ? '2 Weeks Special' : `${val} Months (${newPercent}% OFF)`);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-[#15385E] bg-white"
                  >
                    <option value={0.5}>2 Weeks (0.5 Month)</option>
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={4}>4 Months</option>
                    <option value={5}>5 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={9}>9 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={18}>18 Months</option>
                    <option value={24}>24 Months (2 Years)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">
                    Discount Percentage (0–100%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setNewPercent(val);
                        if (!newLabel || newLabel.includes('% OFF')) {
                          setNewLabel(newMonths === 0.5 ? '2 Weeks Special' : `${newMonths} Months (${val}% OFF)`);
                        }
                      }}
                      className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-[#15385E] bg-white"
                      required
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center font-bold text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Service Type & Move Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">
                    Moving or Storage (Service Type)
                  </label>
                  <select
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-[#15385E] bg-white"
                  >
                    <option value="all">All Services (Moving &amp; Storage)</option>
                    <option value="moving_storage">Moving &amp; Storage only</option>
                    <option value="storage_at_place">Storage at My Place only</option>
                    <option value="storage_facility">Storage at Portabox Location only</option>
                    <option value="moving">Moving Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">
                    Interstate vs Local Move
                  </label>
                  <select
                    value={newMoveScope}
                    onChange={(e) => setNewMoveScope(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-[#15385E] bg-white"
                  >
                    <option value="all">All Moves (Local &amp; Interstate)</option>
                    <option value="local">Local Moves Only</option>
                    <option value="interstate">Interstate Moves Only</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Storage Location & Apply Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">
                    Storage Location
                  </label>
                  <select
                    value={newStorageLocation}
                    onChange={(e) => setNewStorageLocation(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-[#15385E] bg-white"
                  >
                    <option value="all">All Storage Locations</option>
                    <option value="facility">Portabox Location (Depot Warehouse)</option>
                    <option value="my_place">Customer Location (My Place / Onsite)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">
                    Discount Application Rule
                  </label>
                  <select
                    value={newApplyMode}
                    onChange={(e) => setNewApplyMode(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-[#15385E] bg-white"
                  >
                    <option value="upfront_monthly">Upfront Monthly Storage Rate Discount</option>
                    <option value="on_completion_remaining_charges">
                      Applied to Remaining Charges upon Completion
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 3b: Free Blanket Rental Incentive (Lots of 10 only) */}
              <div className="space-y-1 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <label className="font-extrabold text-slate-800 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-700" />
                    <span>Free Blanket Rental Incentive (Lots of 10 only)</span>
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                    CEO Incentive Perk
                  </span>
                </label>
                <select
                  value={newFreeBlankets}
                  onChange={(e) => setNewFreeBlankets(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2.5 rounded-xl border border-amber-300 font-bold text-[#15385E] bg-white text-xs"
                >
                  <option value={0}>No Free Blanket Incentive (0)</option>
                  <option value={10}>10 Free Blankets (1 lot)</option>
                  <option value={20}>20 Free Blankets (2 lots)</option>
                  <option value={30}>30 Free Blankets (3 lots)</option>
                  <option value={40}>40 Free Blankets (4 lots)</option>
                  <option value={50}>50 Free Blankets (5 lots)</option>
                </select>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Admin incentive: Award complimentary blanket rental packages (strictly in lots of 10) to reward customers choosing longer storage terms.
                </p>
              </div>

              {/* Row 4: Custom Label & Description */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Rule Label / Title
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. 6 Months Loyalty Discount"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-[#15385E] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 block">
                  Admin Internal Note (Optional)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g. Special promotion for customers storing at our Portabox depot"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-[#15385E] bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#15385E] hover:bg-[#0f2844] text-white font-extrabold transition-all cursor-pointer shadow-xs"
                >
                  Create &amp; Add Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
