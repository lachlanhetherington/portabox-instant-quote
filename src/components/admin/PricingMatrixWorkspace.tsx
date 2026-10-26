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
} from 'lucide-react';
import {
  AppConfig,
  ContainerPriceConfig,
  DeliveryZoneSettings,
  LocationPricingConfig,
  MetroHub,
} from '../../types/quote';
import { LiveQuoteSimulator } from './LiveQuoteSimulator';
import { getLocationPricingForHub } from '../../services/pricingEngine';

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
  const [storageCategory, setStorageCategory] = useState<'facility' | 'onsite'>('facility');
  const [bulkAdjustmentAmount, setBulkAdjustmentAmount] = useState<number>(10);
  const [matrixFeedback, setMatrixFeedback] = useState<string | null>(null);

  const HUBS: MetroHub[] = [
    'Adelaide',
    'Melbourne',
    'Sydney',
    'Brisbane',
  ];

  // Helper to update container storage prices
  const handleUpdatePrice = (
    hub: MetroHub,
    size: 'small_10m3' | 'medium_19m3' | 'large_25m3',
    field: 'monthlyRate' | 'weeklyRate',
    val: number
  ) => {
    const numericVal = Math.max(0, val);
    const existingLoc = getLocationPricingForHub(config, hub);

    const priceTargetKey = storageCategory === 'onsite' ? 'onsiteContainerPrices' : 'containerPrices';
    const currentTargetPrices = (storageCategory === 'onsite'
      ? (existingLoc.onsiteContainerPrices || config.onsiteContainerPrices)
      : existingLoc.containerPrices) || config.containerPrices;

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

    const newConfig: AppConfig = {
      ...config,
      locationPricing: {
        ...(config.locationPricing || {}),
        [hub]: updatedLocPricing,
      } as Record<MetroHub, LocationPricingConfig>,
      // If updating default/Adelaide hub, keep baseline synced
      ...(hub === 'Adelaide'
        ? {
            [priceTargetKey]: {
              ...((config[priceTargetKey] as any) || {}),
              [size]: {
                ...((config[priceTargetKey] as any)?.[size] || {}),
                [field]: numericVal,
              },
            },
          }
        : {}),
    };

    onUpdateConfig(newConfig);
    setMatrixFeedback(`Updated ${hub} ${storageCategory === 'onsite' ? 'Onsite' : 'Facility'} ${size} ${field} to $${numericVal}`);
    setTimeout(() => setMatrixFeedback(null), 2500);
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

    onUpdateConfig(newConfig);
    setMatrixFeedback(`Updated Zone settings for ${hub}`);
    setTimeout(() => setMatrixFeedback(null), 2500);
  };

  // Bulk Apply Adjustment (+/- $X across all sizes in selected hub)
  const handleApplyBulkMonthlyAdjustment = (delta: number) => {
    const existingLoc = getLocationPricingForHub(config, selectedHub);
    const updatedLocPricing: LocationPricingConfig = {
      ...existingLoc,
      containerPrices: {
        small_10m3: {
          ...existingLoc.containerPrices.small_10m3,
          monthlyRate: Math.max(0, existingLoc.containerPrices.small_10m3.monthlyRate + delta),
        },
        medium_19m3: {
          ...existingLoc.containerPrices.medium_19m3,
          monthlyRate: Math.max(0, existingLoc.containerPrices.medium_19m3.monthlyRate + delta),
        },
        large_25m3: {
          ...existingLoc.containerPrices.large_25m3,
          monthlyRate: Math.max(0, existingLoc.containerPrices.large_25m3.monthlyRate + delta),
        },
      },
    };

    const newConfig: AppConfig = {
      ...config,
      locationPricing: {
        ...(config.locationPricing || {}),
        [selectedHub]: updatedLocPricing,
      } as Record<MetroHub, LocationPricingConfig>,
    };

    onUpdateConfig(newConfig);
    setMatrixFeedback(`Applied ${delta >= 0 ? `+$${delta}` : `-$${Math.abs(delta)}`} across all ${selectedHub} container sizes.`);
    setTimeout(() => setMatrixFeedback(null), 3000);
  };

  const currentLoc = getLocationPricingForHub(config, selectedHub);
  const activePrices = storageCategory === 'onsite'
    ? (currentLoc.onsiteContainerPrices || config.onsiteContainerPrices || {
        small_10m3: { monthlyRate: 149, weeklyRate: 49 },
        medium_19m3: { monthlyRate: 169, weeklyRate: 59 },
        large_25m3: { monthlyRate: 179, weeklyRate: 65 },
      })
    : currentLoc.containerPrices;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Pricing Matrix Grid & Zone Settings */}
      <div className="xl:col-span-7 space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#0b2942]">
                Interactive Tariff Matrix Grid
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                <span>2-Way Smartsheet Ready</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live container rental and transport leg rates by Metro Depot. Edits preview in real time on the right.
            </p>
          </div>

          {matrixFeedback && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl animate-in fade-in">
              {matrixFeedback}
            </span>
          )}
        </div>

        {/* 1. Metro Depot Switcher & Container Rates Matrix */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-2xs">
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

            {/* Quick Bulk Adjust */}
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <span className="text-slate-400 font-bold">Quick Shift:</span>
              <button
                type="button"
                onClick={() => handleApplyBulkMonthlyAdjustment(10)}
                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-200 transition-colors cursor-pointer"
              >
                +$10/mo
              </button>
              <button
                type="button"
                onClick={() => handleApplyBulkMonthlyAdjustment(-10)}
                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-[11px] border border-rose-200 transition-colors cursor-pointer"
              >
                -$10/mo
              </button>
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
              Facility Depot Storage
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
              Onsite Container Hire (Customer's Place)
            </button>
          </div>

          {/* Matrix Grid Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Container Spec</th>
                  <th className="py-2.5 px-3">Volume</th>
                  <th className="py-2.5 px-3">Monthly Rent ($AUD)</th>
                  <th className="py-2.5 px-3">Weekly Equivalent</th>
                  <th className="py-2.5 px-3 text-right">Placement Type</th>
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
                  <td className="py-3 px-3 text-right">
                    <span className="text-[11px] font-bold text-slate-400">
                      {storageCategory === 'onsite' ? 'Onsite' : 'Facility'}
                    </span>
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
                  <td className="py-3 px-3 text-right">
                    <span className="text-[11px] font-bold text-slate-400">
                      {storageCategory === 'onsite' ? 'Onsite' : 'Facility'}
                    </span>
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
                  <td className="py-3 px-3 text-right">
                    <span className="text-[11px] font-bold text-emerald-600 font-bold">Standard Lead</span>
                  </td>
                </tr>

              </tbody>
            </table>
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

      {/* Right 5 Columns: Live Phone Quote Simulator (Side-by-side preview) */}
      <div className="xl:col-span-5 sticky top-4">
        <LiveQuoteSimulator
          config={config}
          onCreateLeadFromQuote={onCreateLeadFromQuote}
        />
      </div>
    </div>
  );
};
