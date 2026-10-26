import React, { useState } from 'react';
import {
  TrendingDown,
  RefreshCw,
  Save,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  Info,
  DollarSign,
  Package,
  Truck,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  CompetitorBenchmark,
  COMPETITOR_PRESETS,
  getCompetitorBenchmark,
  saveCompetitorBenchmark,
  resetCompetitorBenchmarkToDefault,
  applyCompetitorPreset,
  forceRefreshCompetitorBenchmark,
  calculateCompetitorComparison,
} from '../../services/competitorPricingService';

interface CompetitorPricingWorkspaceProps {
  onSaveNotification?: (msg: string) => void;
}

export const CompetitorPricingWorkspace: React.FC<CompetitorPricingWorkspaceProps> = ({
  onSaveNotification,
}) => {
  const [benchmark, setBenchmark] = useState<CompetitorBenchmark>(getCompetitorBenchmark());
  const [activePresetId, setActivePresetId] = useState<string>('modular_industry');
  const [hasSaved, setHasSaved] = useState(false);

  // Form field state
  const [competitorName, setCompetitorName] = useState(benchmark.competitorName);
  const [containerVolumeM3, setContainerVolumeM3] = useState<number>(benchmark.containerVolumeM3);
  const [deliveryFeePerContainer, setDeliveryFeePerContainer] = useState<number>(benchmark.deliveryFeePerContainer);
  const [monthlyStorageRatePerM3, setMonthlyStorageRatePerM3] = useState<number>(benchmark.monthlyStorageRatePerM3);
  const [sourceUrl, setSourceUrl] = useState(benchmark.sourceUrl);
  const [notes, setNotes] = useState(benchmark.notes);

  // Sync state if benchmark changes
  const updateLocalForm = (data: CompetitorBenchmark) => {
    setBenchmark(data);
    setCompetitorName(data.competitorName);
    setContainerVolumeM3(data.containerVolumeM3);
    setDeliveryFeePerContainer(data.deliveryFeePerContainer);
    setMonthlyStorageRatePerM3(data.monthlyStorageRatePerM3);
    setSourceUrl(data.sourceUrl);
    setNotes(data.notes);
  };

  const handleApplyPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const updated = applyCompetitorPreset(presetId);
    updateLocalForm(updated);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2500);
    if (onSaveNotification) {
      onSaveNotification(`Applied preset benchmark: ${updated.competitorName}`);
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompetitorBenchmark = {
      competitorName: competitorName.trim() || 'Modular Container Competitors',
      containerVolumeM3: Math.max(1, Number(containerVolumeM3) || 8),
      deliveryFeePerContainer: Math.max(0, Number(deliveryFeePerContainer) || 0),
      monthlyStorageRatePerM3: Math.max(0, Number(monthlyStorageRatePerM3) || 0),
      lastCheckedDate: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }),
      lastCheckedTimestamp: Date.now(),
      status: 'Custom Admin Rate',
      sourceUrl: sourceUrl.trim(),
      notes: notes.trim(),
    };

    const saved = saveCompetitorBenchmark(updated);
    updateLocalForm(saved);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2500);
    if (onSaveNotification) {
      onSaveNotification('Competitor pricing benchmark rates saved successfully!');
    }
  };

  const handleResetDefaults = () => {
    const def = resetCompetitorBenchmarkToDefault();
    updateLocalForm(def);
    setActivePresetId('modular_industry');
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2500);
    if (onSaveNotification) {
      onSaveNotification('Reset competitor benchmark to 2026 verified market baseline ($149 delivery, $18.60/m³).');
    }
  };

  const handleForceRefresh = () => {
    const refreshed = forceRefreshCompetitorBenchmark();
    updateLocalForm(refreshed);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2500);
    if (onSaveNotification) {
      onSaveNotification('Re-verified daily tariff feed timestamp.');
    }
  };

  // Preview simulations for Portabox 10m³, 19m³, 25m³
  const sim10m3 = calculateCompetitorComparison({
    totalVolumeM3: 10,
    portaboxContainerCount: 1,
    portaboxDeliveryCost: 149,
    portaboxMonthlyStorageFee: 169,
  });

  const sim19m3 = calculateCompetitorComparison({
    totalVolumeM3: 19,
    portaboxContainerCount: 1,
    portaboxDeliveryCost: 149,
    portaboxMonthlyStorageFee: 289,
  });

  const sim25m3 = calculateCompetitorComparison({
    totalVolumeM3: 25,
    portaboxContainerCount: 1,
    portaboxDeliveryCost: 149,
    portaboxMonthlyStorageFee: 375,
  });

  const estimatedPerBoxMonthly = Math.round(containerVolumeM3 * monthlyStorageRatePerM3 * 100) / 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#15385E] text-[#5CC1EF] flex items-center justify-center shrink-0 shadow-sm">
            <TrendingDown className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-[#15385E] tracking-tight">
                Competitor Pricing & Market Benchmark Editor
              </h2>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  benchmark.status === 'Verified Live Tariff'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-sky-50 text-sky-800 border-sky-300'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                {benchmark.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Configure the baseline competitor delivery fees and storage rates used to calculate excess container fees avoided and customer monthly savings in Step 5 (Quote) and the live sidebar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleForceRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#15385E] text-xs font-bold border border-slate-300 transition-all cursor-pointer"
            title="Re-verify daily timestamp"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5CC1EF]" />
            <span>Re-verify Timestamp</span>
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-all cursor-pointer"
            title="Reset back to current 2026 verified rates ($149 delivery, $18.60/m³)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#F7D347]" />
            <span>Quick-Load Verified Competitor Profiles:</span>
          </span>
          <span className="text-[11px] text-slate-400">Click a competitor to auto-populate published market rates</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {COMPETITOR_PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#15385E] bg-[#15385E]/5 ring-2 ring-[#15385E]/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#15385E] line-clamp-1">{p.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#15385E] shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                    {p.description}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-600 font-bold">${p.benchmark.deliveryFeePerContainer} leg</span>
                  <span className="text-[#15385E] font-black">${p.benchmark.monthlyStorageRatePerM3}/m³</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form on Left, Live Simulator Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-black text-[#15385E] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5CC1EF]" />
              <span>Competitor Tariff Parameters</span>
            </h3>
            {hasSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300 animate-in fade-in duration-150">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Rates Saved & Active!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveCustom} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Competitor Profile / Benchmark Name
              </label>
              <input
                type="text"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="e.g. Modular Container Competitors (TAXIBOX / PODS)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Box Usable Capacity (m³)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Standard modular: 8 m³</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="100"
                    value={containerVolumeM3}
                    onChange={(e) => setContainerVolumeM3(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">m³</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Small modular containers hold ~8 m³ (2.4m × 1.5m × 2.2m).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Delivery Fee per Box ($ AUD)</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Market: $149/leg</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    value={deliveryFeePerContainer}
                    onChange={(e) => setDeliveryFeePerContainer(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Charged per individual box delivered or collected.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Storage Rate per m³ ($/mo)</span>
                  <span className="text-[10px] text-slate-400 font-mono">${estimatedPerBoxMonthly}/box</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="100"
                    value={monthlyStorageRatePerM3}
                    onChange={(e) => setMonthlyStorageRatePerM3(parseFloat(e.target.value) || 0)}
                    className="w-full pl-7 pr-12 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-bold">/m³</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Rate per cubic metre (e.g. $18.60 × 8 m³ = $148.80/mo).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Published Source URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://www.taxibox.com.au/pricing"
                    className="w-full pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                  />
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#5CC1EF]"
                      title="Open source URL in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Reference site audited for this pricing profile.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Audit & Scraping Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details of published tariff audit, seasonal adjustments, or notes..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Last checked: <strong>{benchmark.lastCheckedDate}</strong>
              </span>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#15385E] hover:bg-[#0f2844] text-white text-xs font-black shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4 text-[#F7D347]" />
                <span>Save & Apply Benchmark</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Simulator & Savings Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#15385E] text-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#F7D347]" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#F7D347]">
                  Live Customer Savings Preview
                </h4>
              </div>
              <span className="text-[10px] text-slate-300 font-mono">Calculated Real-Time</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Here is how Portabox compares to your active benchmark (<strong>{competitorName}</strong>) across typical household capacities:
            </p>

            {/* Sim 1: 10m³ */}
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white">Apartment / 1–2 Rooms (10 m³)</span>
                <span className="text-[#5CC1EF] font-mono">Save ${sim10m3.firstMonthTotalSavings} total</span>
              </div>
              <div className="text-[11px] text-slate-300 flex justify-between">
                <span>Requires {sim10m3.competitorSmallContainersCount} x modular boxes</span>
                <span className="font-mono">Competitor delivery: ${sim10m3.competitorDeliveryCost}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold pt-1 border-t border-white/10 flex justify-between">
                <span>✓ Excess delivery avoided: <strong>${sim10m3.excessDeliveryCharges}</strong></span>
                <span>Storage saved: <strong>${sim10m3.monthlyStorageSavings}/mo</strong></span>
              </div>
            </div>

            {/* Sim 2: 19m³ */}
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white">2–3 Bedroom House (19 m³)</span>
                <span className="text-[#5CC1EF] font-mono">Save ${sim19m3.firstMonthTotalSavings} total</span>
              </div>
              <div className="text-[11px] text-slate-300 flex justify-between">
                <span>Requires {sim19m3.competitorSmallContainersCount} x modular boxes</span>
                <span className="font-mono">Competitor delivery: ${sim19m3.competitorDeliveryCost}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold pt-1 border-t border-white/10 flex justify-between">
                <span>✓ Excess delivery avoided: <strong>${sim19m3.excessDeliveryCharges}</strong></span>
                <span>Storage saved: <strong>${sim19m3.monthlyStorageSavings}/mo</strong></span>
              </div>
            </div>

            {/* Sim 3: 25m³ */}
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white">Full Family Home (25 m³)</span>
                <span className="text-[#F7D347] font-mono font-black text-sm">Save ${sim25m3.firstMonthTotalSavings} total</span>
              </div>
              <div className="text-[11px] text-slate-300 flex justify-between">
                <span>Requires {sim25m3.competitorSmallContainersCount} x modular boxes</span>
                <span className="font-mono">Competitor delivery: ${sim25m3.competitorDeliveryCost}</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold pt-1 border-t border-white/10 flex justify-between">
                <span>✓ Excess delivery avoided: <strong>${sim25m3.excessDeliveryCharges}</strong></span>
                <span>Storage saved: <strong>${sim25m3.monthlyStorageSavings}/mo</strong></span>
              </div>
            </div>
          </div>

          {/* Customer Facing Transparency Notice */}
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#15385E]">
              <Info className="w-4 h-4 text-[#5CC1EF] shrink-0" />
              <span>Customer Quote Transparency</span>
            </div>
            <p className="text-[11px] text-sky-800 leading-relaxed">
              When a customer views their quote on Step 5 or checks the right sidebar, the savings callout uses these exact benchmark numbers with live attribution to &quot;{competitorName}&quot;, highlighting our horizontal zero-tilt level-lift truck technology and higher single-container capacity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
