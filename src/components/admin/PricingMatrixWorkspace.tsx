import React, { useState } from 'react';
import {
  DollarSign,
  MapPin,
  Save,
  CheckCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  FileSpreadsheet,
  Zap,
  Check,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  AppConfig,
  ContainerPriceConfig,
  DeliveryZoneSettings,
  LocationPricingConfig,
  MetroHub,
} from '../../types/quote';
import { LiveQuoteSimulator } from './LiveQuoteSimulator';
import { getLocationPricingForHub, saveAppConfig } from '../../services/pricingEngine';

interface PricingMatrixWorkspaceProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onSave: () => void;
  onCreateLeadFromQuote?: (quote: any) => void;
}

export const PricingMatrixWorkspace: React.FC<PricingMatrixWorkspaceProps> = ({
  config,
  onUpdateConfig,
  onSave,
  onCreateLeadFromQuote,
}) => {
  const [selectedHub, setSelectedHub] = useState<MetroHub>('Adelaide');
  const [storageCategory, setStorageCategory] = useState<'facility' | 'onsite' | 'interstate'>('facility');

  // Which price table on LocationPricingConfig each tab edits
  const PRICE_KEY_BY_CATEGORY = {
    facility: 'containerPrices',
    onsite: 'onsiteContainerPrices',
    interstate: 'interstateContainerPrices',
  } as const;
  const CATEGORY_LABEL = { facility: 'Our Location', onsite: "Customer's Location", interstate: 'Interstate' } as const;

  // Current prices for a tab at a hub (interstate falls back to the depot's facility rates until edited)
  const getCategoryPrices = (loc: LocationPricingConfig, category: 'facility' | 'onsite' | 'interstate') => {
    if (category === 'onsite') {
      return loc.onsiteContainerPrices || config.onsiteContainerPrices || {
        small_10m3: { monthlyRate: 149, weeklyRate: 49 },
        medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
        large_25m3: { monthlyRate: 179, weeklyRate: 65 },
      };
    }
    if (category === 'interstate') return loc.interstateContainerPrices || loc.containerPrices;
    return loc.containerPrices || config.containerPrices;
  };
  const [matrixFeedback, setMatrixFeedback] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  );

  const HUBS: MetroHub[] = [
    'Adelaide',
    'Brisbane',
    'Melbourne',
    'Sydney',
  ];

  // Helper to update container storage prices with guaranteed immediate persistence
  const handleUpdatePrice = (
    hub: MetroHub,
    size: 'small_10m3' | 'medium_19m3' | 'large_25m3',
    field: 'monthlyRate' | 'weeklyRate',
    val: number
  ) => {
    const numericVal = Math.max(0, val);
    const existingLoc = getLocationPricingForHub(config, hub);

    const priceTargetKey = PRICE_KEY_BY_CATEGORY[storageCategory];
    const currentTargetPrices = getCategoryPrices(existingLoc, storageCategory);

    const updatedLocPricing: LocationPricingConfig = {
      ...existingLoc,
      [priceTargetKey]: {
        ...currentTargetPrices,
        [size]: {
          ...currentTargetPrices[size],
          [field]: numericVal,
        },
      },
    };

    // Top-level baseline price table on AppConfig (interstate rates exist only per depot)
    const baselineKey = storageCategory === 'onsite' ? 'onsiteContainerPrices' : 'containerPrices';

    const newConfig: AppConfig = {
      ...config,
      locationPricing: {
        ...(config.locationPricing || {}),
        [hub]: updatedLocPricing,
      } as Record<MetroHub, LocationPricingConfig>,
      // If updating default/Adelaide hub, keep baseline synced (facility/onsite only; interstate is per depot)
      ...(hub === 'Adelaide' && storageCategory !== 'interstate'
        ? {
            [baselineKey]: {
              ...((config[baselineKey] as any) || {}),
              [size]: {
                ...((config[baselineKey] as any)?.[size] || {}),
                [field]: numericVal,
              },
            },
          }
        : {}),
    };

    // 1. Immediately persist to localStorage
    saveAppConfig(newConfig);
    // 2. Update React parent states
    onUpdateConfig(newConfig);
    onSave();
    // 3. Broadcast real-time update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portabox:pricing-updated', { detail: newConfig }));
    }
    const nowTime = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(nowTime);
    setSaveStatus('saved');
    setMatrixFeedback(`Saved: ${hub} ${CATEGORY_LABEL[storageCategory]} ${size} ${field} updated to $${numericVal} (Persisted)`);
    setTimeout(() => {
      setMatrixFeedback(null);
    }, 3500);
  };

  // Helper to update Zone A-E fee parameters
  const handleUpdateZone = (
    hub: MetroHub,
    field: keyof DeliveryZoneSettings,
    val: any
  ) => {
    const existingLoc = getLocationPricingForHub(config, hub);
    const updatedLocPricing: LocationPricingConfig = {
      ...existingLoc,
      deliveryZones: {
        ...existingLoc.deliveryZones,
        [field]: val,
      },
    };

    const newConfig: AppConfig = {
      ...config,
      locationPricing: {
        ...(config.locationPricing || {}),
        [hub]: updatedLocPricing,
      } as Record<MetroHub, LocationPricingConfig>,
      ...(hub === 'Adelaide'
        ? {
            deliveryZones: {
              ...config.deliveryZones,
              [field]: val,
            },
          }
        : {}),
    };

    // 1. Immediately persist to localStorage
    saveAppConfig(newConfig);
    // 2. Update React parent states
    onUpdateConfig(newConfig);
    onSave();
    // 3. Broadcast real-time update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portabox:pricing-updated', { detail: newConfig }));
    }
    const nowTime = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(nowTime);
    setSaveStatus('saved');
    setMatrixFeedback(`Saved: ${hub} delivery zones updated (Persisted)`);
    setTimeout(() => setMatrixFeedback(null), 3000);
  };

  const handleManualSave = () => {
    saveAppConfig(config);
    onSave();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portabox:pricing-updated', { detail: config }));
    }
    const nowTime = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    setLastSavedTime(nowTime);
    setSaveStatus('saved');
    setMatrixFeedback('✓ All Price Matrix rates & zone parameters saved to persistent storage.');
    setTimeout(() => {
      setSaveStatus('idle');
      setMatrixFeedback(null);
    }, 4000);
  };

  const currentLoc = getLocationPricingForHub(config, selectedHub);
  const activePrices = getCategoryPrices(currentLoc, storageCategory);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Pricing Matrix Grid & Zone Settings */}
      <div className={`${config.enableLivePhoneQuoteSimulator ? 'xl:col-span-7' : 'xl:col-span-12'} space-y-6`}>
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#0b2942]">
                Container Rental &amp; Local Delivery Price Matrix
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                <span>2-Way Smartsheet Ready</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live container rental and transport leg rates by Metro Depot. Edits auto-save immediately to storage and preview on the right.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {matrixFeedback && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-in fade-in flex items-center gap-1.5 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{matrixFeedback}</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c0f3] hover:bg-[#00a8d6] text-white font-black text-xs shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              {saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Saved to App Storage!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>Save Pricing Matrix</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1. Metro Depot Switcher & Container Rates Matrix */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <h4 className="text-sm font-black text-[#0b2942]">Container Rental Rates</h4>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {HUBS.map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => setSelectedHub(hub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedHub === hub
                      ? 'bg-[#0b2942] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>

          {/* Storage Placement Category Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => setStorageCategory('facility')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                storageCategory === 'facility'
                  ? 'bg-[#0b2942] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Our Location
            </button>
            <button
              type="button"
              onClick={() => setStorageCategory('onsite')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                storageCategory === 'onsite'
                  ? 'bg-[#0b2942] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer's Location
            </button>
            <button
              type="button"
              onClick={() => setStorageCategory('interstate')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                storageCategory === 'interstate'
                  ? 'bg-[#0b2942] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Interstate
            </button>
          </div>

          {storageCategory === 'interstate' && (
            <p className="text-[11px] text-slate-600 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 leading-relaxed">
              Monthly container rental for interstate jobs that <strong>start at {selectedHub}</strong>. The job is charged
              this {selectedHub} rate for its whole duration, wherever the container ends up (e.g. {selectedHub} → another
              depot). Until changed, these match {selectedHub}'s Our Location rates. Line-haul freight is set separately.
            </p>
          )}

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Container Spec</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3">Monthly Rent ($AUD)</th>
                  <th className="py-2.5 px-3">Weekly Equivalent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {/* Small 10m3 */}
                <tr className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3 px-3.5 font-bold text-[#0b2942]">
                    10 m³ Portabox (Small)
                  </td>
                  <td className="py-3 px-3 text-slate-500">10 m³</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={activePrices.small_10m3.monthlyRate}
                        onChange={(e) =>
                          handleUpdatePrice(
                            selectedHub,
                            'small_10m3',
                            'monthlyRate',
                            Number(e.target.value)
                          )
                        }
                        className="w-20 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-black text-[#0b2942] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={activePrices.small_10m3.weeklyRate}
                        onChange={(e) =>
                          handleUpdatePrice(
                            selectedHub,
                            'small_10m3',
                            'weeklyRate',
                            Number(e.target.value)
                          )
                        }
                        className="w-16 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                      />
                    </div>
                  </td>
                </tr>

                {/* Medium 19m3 */}
                <tr className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3 px-3.5 font-bold text-[#0b2942]">
                    19 m³ Portabox (Medium)
                  </td>
                  <td className="py-3 px-3 text-slate-500">19 m³</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={activePrices.medium_19m3.monthlyRate}
                        onChange={(e) =>
                          handleUpdatePrice(
                            selectedHub,
                            'medium_19m3',
                            'monthlyRate',
                            Number(e.target.value)
                          )
                        }
                        className="w-20 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-black text-[#0b2942] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={activePrices.medium_19m3.weeklyRate}
                        onChange={(e) =>
                          handleUpdatePrice(
                            selectedHub,
                            'medium_19m3',
                            'weeklyRate',
                            Number(e.target.value)
                          )
                        }
                        className="w-16 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                      />
                    </div>
                  </td>
                </tr>

                {/* Large 25m3 */}
                <tr className="hover:bg-sky-50/40 transition-colors bg-sky-50/20">
                  <td className="py-3 px-3.5 font-bold text-[#0b2942]">
                    25 m³ Portabox (Large)
                  </td>
                  <td className="py-3 px-3 text-slate-500">25 m³</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={activePrices.large_25m3.monthlyRate}
                        onChange={(e) =>
                          handleUpdatePrice(
                            selectedHub,
                            'large_25m3',
                            'monthlyRate',
                            Number(e.target.value)
                          )
                        }
                        className="w-20 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-black text-[#0b2942] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={activePrices.large_25m3.weeklyRate}
                        onChange={(e) =>
                          handleUpdatePrice(
                            selectedHub,
                            'large_25m3',
                            'weeklyRate',
                            Number(e.target.value)
                          )
                        }
                        className="w-16 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                      />
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          {/* Duration Options Configuration */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={Boolean(config.enableSelectWeeks)}
                onChange={(e) => {
                  const updated = { ...config, enableSelectWeeks: e.target.checked };
                  saveAppConfig(updated);
                  onUpdateConfig(updated);
                  onSave();
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('portabox:pricing-updated', { detail: updated }));
                  }
                  setMatrixFeedback(`Saved: Select Weeks duration option ${e.target.checked ? 'Enabled' : 'Disabled'} (Persisted)`);
                  setTimeout(() => setMatrixFeedback(null), 3000);
                }}
                className="w-4 h-4 rounded text-[#00c0f3] accent-[#00c0f3]"
              />
              <span>Enable Select Weeks View (Page 5)</span>
            </label>
          </div>
        </div>

        {/* 2. Delivery Zones A through E Matrix */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-[#0b2942]">
                Delivery Zones A through E Fees ({selectedHub} Depot)
              </h4>
              <p className="text-[11px] text-slate-500">
                Transport leg base delivery fees and per-km excess rates are calculated on a one-way road driving distance from depot (not return/round-trip distance).
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Depot Radius Model
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {/* Zone A */}
            <div className="p-3.5 rounded-2xl border border-sky-200 bg-sky-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0b2942]">Zone A</span>
                <span className="text-[10px] font-bold text-sky-700">&lt;25 km</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Base Fee</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={currentLoc.deliveryZones.zoneABaseFee}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneABaseFee', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-[#0b2942]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Rate / km</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentLoc.deliveryZones.zoneARatePerKm}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneARatePerKm', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Zone B */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0b2942]">Zone B</span>
                <span className="text-[10px] font-bold text-slate-500">&lt;50 km</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Base Fee</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={currentLoc.deliveryZones.zoneBBaseFee}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneBBaseFee', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-[#0b2942]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Rate / km</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentLoc.deliveryZones.zoneBRatePerKm}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneBRatePerKm', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Zone C */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0b2942]">Zone C</span>
                <span className="text-[10px] font-bold text-slate-500">&lt;75 km</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Base Fee</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={currentLoc.deliveryZones.zoneCBaseFee}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneCBaseFee', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-[#0b2942]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Rate / km</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentLoc.deliveryZones.zoneCRatePerKm}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneCRatePerKm', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Zone D */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0b2942]">Zone D</span>
                <span className="text-[10px] font-bold text-slate-500">&lt;100 km</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Base Fee</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={currentLoc.deliveryZones.zoneDBaseFee}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneDBaseFee', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-[#0b2942]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Rate / km</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentLoc.deliveryZones.zoneDRatePerKm}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneDRatePerKm', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Zone E */}
            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900">Zone E</span>
                <span className="text-[10px] font-bold text-amber-800">&gt;100 km</span>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Base Rate ($)</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={currentLoc.deliveryZones.zoneEBaseFee}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneEBaseFee', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-black text-[#0b2942]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Rate / km ($/km)</label>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentLoc.deliveryZones.zoneERatePerKm ?? 3.5}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneERatePerKm', Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Custom Dispatch</label>
                <label className="flex items-center gap-1 text-[11px] text-slate-700 font-bold cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={currentLoc.deliveryZones.zoneECallPricing}
                    onChange={(e) => handleUpdateZone(selectedHub, 'zoneECallPricing', e.target.checked)}
                    className="rounded text-[#00c0f3]"
                  />
                  <span>Call to Book</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right 5 Columns: Live Phone Quote Simulator (feature flag, off by default) */}
      {config.enableLivePhoneQuoteSimulator && (
        <div className="xl:col-span-5 sticky top-4">
          <LiveQuoteSimulator
            config={config}
            onCreateLeadFromQuote={onCreateLeadFromQuote}
          />
        </div>
      )}
    </div>
  );
};
