import React, { useState } from 'react';
import { CheckCircle, DollarSign, Save } from 'lucide-react';
import type { AppConfig, UpfrontDiscountSettings } from '../../types/quote';
import { DEFAULT_UPFRONT_DISCOUNTS } from '../../services/pricingEngine';

interface BillingDiscountsAdminWorkspaceProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
}

const clampPct = (n: number) => Math.min(100, Math.max(0, Number(n) || 0));

/** Billing type discounts: % off storage when the customer pays upfront (6 or 12 months). */
export const BillingDiscountsAdminWorkspace: React.FC<BillingDiscountsAdminWorkspaceProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [upfront, setUpfront] = useState<UpfrontDiscountSettings>(() => ({
    ...DEFAULT_UPFRONT_DISCOUNTS,
    ...(config.upfrontDiscounts || {}),
  }));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateConfig({
      ...config,
      upfrontDiscounts: {
        sixMonthsPercent: clampPct(upfront.sixMonthsPercent),
        twelveMonthsPercent: clampPct(upfront.twelveMonthsPercent),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-extrabold text-[#0b2942]">Billing Type Discounts</h3>
          <p className="text-xs text-slate-500">
            % off storage by how the customer pays. Monthly billing has no discount. Upfront discounts stack on top of the
            duration discounts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00c0f3] hover:bg-[#00a8d6] text-white font-black text-xs shadow-sm transition-all cursor-pointer shrink-0"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saved ? 'Saved' : 'Save Billing Discounts'}</span>
        </button>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h4 className="text-sm sm:text-base font-black text-slate-900">Upfront prepayment discounts</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600 block mb-1">6 months upfront (% off)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={upfront.sixMonthsPercent}
              onChange={(e) => setUpfront((prev) => ({ ...prev, sixMonthsPercent: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600 block mb-1">12 months upfront (% off)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={upfront.twelveMonthsPercent}
              onChange={(e) => setUpfront((prev) => ({ ...prev, twelveMonthsPercent: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            />
          </label>
        </div>
        <p className="text-[11px] text-slate-400">
          Defaults: {DEFAULT_UPFRONT_DISCOUNTS.sixMonthsPercent}% (6 months) and {DEFAULT_UPFRONT_DISCOUNTS.twelveMonthsPercent}%
          (12 months).
        </p>
      </div>
    </div>
  );
};
