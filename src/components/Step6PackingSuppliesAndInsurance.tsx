import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Package,
  Check,
  Plus,
  Minus,
  Sparkles,
  Info,
  Gift,
} from 'lucide-react';
import { AppConfig, ContainerSizeId } from '../types/quote';
import { PostcodeRecord } from '../data/australianPostcodes';
import {
  calculateBlanketRentalPrice,
  calculateBoxPrice,
  calculateLockSalesPrice,
} from '../services/pricingEngine';
import { formatMoney } from '../utils/currency';
import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step6PackingSuppliesAndInsuranceProps {
  originPostcode?: PostcodeRecord | null;
  containerSize?: ContainerSizeId;
  containerCount?: number;
  /** 12' and 16' containers: only these get a free lock and free blanket rental (7' get none). */
  perkContainerCount?: number;
  insuranceSelected?: boolean;
  onToggleInsurance?: (selected: boolean) => void;
  locksCount: number;
  onUpdateLocksCount: (count: number) => void;
  blanketsCount: number;
  onUpdateBlanketsCount: (count: number) => void;
  boxesCount: number;
  onUpdateBoxesCount: (count: number) => void;
  durationFreeBlanketsCount?: number;
  /** True when the chosen duration includes a free disc lock (Duration & Discount Matrix). */
  durationFreeLock?: boolean;
  config: AppConfig;
  onContinue: () => void;
  onBack: () => void;
}

export const Step6PackingSuppliesAndInsurance: React.FC<Step6PackingSuppliesAndInsuranceProps> = ({
  originPostcode,
  containerCount = 1,
  perkContainerCount,
  insuranceSelected,
  onToggleInsurance,
  locksCount,
  onUpdateLocksCount,
  blanketsCount,
  onUpdateBlanketsCount,
  boxesCount,
  onUpdateBoxesCount,
  durationFreeBlanketsCount = 0,
  durationFreeLock = false,
  config,
  onContinue,
  onBack,
}) => {
  // Same calculation the quote uses, so the price shown here matches the final quote.
  const containers = Math.max(1, containerCount);
  // One free lock per container when the duration includes it; extra locks are paid
  const perkContainers = Math.max(0, perkContainerCount ?? containers);
  const freeLocks = durationFreeLock ? perkContainers : 0;
  const lockCalc = calculateLockSalesPrice(locksCount, config.packingSupplies, freeLocks);
  const blanketCalc = calculateBlanketRentalPrice(blanketsCount, perkContainers, config.packingSupplies, durationFreeBlanketsCount);
  const currentBoxPrice = calculateBoxPrice(boxesCount, config.packingSupplies);

  const freeBlanketsAllowance = blanketCalc.freeAllowance;
  const isFreeLock = Boolean(config.packingSupplies?.isLockFreePromo);
  const isDurationFreeLock = !isFreeLock && durationFreeLock;
  const lockUnitPrice = lockCalc.unitPrice;
  const isAllBlanketsFree = Boolean(config.packingSupplies?.isAllBlanketsFreePromo);
  const blanketPackSize = config.packingSupplies?.blanketBlockSize ?? 10;
  const blanketPackMonthly = config.packingSupplies?.blanketBlockPriceMonthly ?? 25;
  const freeBlanketsPerContainer = config.packingSupplies?.freeBlanketsPerContainer ?? 10;
  // Options are per container: None / 1 / 2 locks, and None / 1 / 2 packs of 10 blankets
  const lockOptions = [0, 1, 2].map((perContainer) => {
    const qty = perContainer * containers;
    const price = calculateLockSalesPrice(qty, config.packingSupplies, freeLocks).totalPrice;
    return { perContainer, qty, price };
  });
  const blanketOptions = [0, 1, 2].map((packs) => {
    const qty = packs * blanketPackSize * containers;
    const fee = calculateBlanketRentalPrice(qty, perkContainers, config.packingSupplies, durationFreeBlanketsCount).totalFee;
    return { packs, qty, fee };
  });

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mb-8">
        Supplies
      </h1>

      {/* SECTION 1: MOVING SUPPLIES - PADLOCKS */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 transition-all hover:border-sky-300">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold text-xs">
                <Lock className="w-4 h-4 text-[#15385E]" />
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#15385E] tracking-tight">
                1. Heavy-Duty Container Padlocks
              </h3>
              {isFreeLock && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Gift className="w-3 h-3 text-emerald-600" />
                  FREE LOCK WITH CONTAINER
                </span>
              )}
              {isDurationFreeLock && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Gift className="w-3 h-3 text-emerald-600" />
                  {freeLocks > 1 ? `${freeLocks} FREE LOCKS INCLUDED (1 PER CONTAINER)` : '1 FREE LOCK INCLUDED'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Stainless-steel discus lock designed specifically to fit the recessed lockbox shroud on Portabox containers. Anti-bolt cutter design with 2 laser-cut keys. Yours to keep!
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            {isFreeLock ? (
              <div>
                <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                  $0 Free
                </span>
                <span className="block text-[11px] text-slate-400 line-through">
                  ${lockUnitPrice} each
                </span>
              </div>
            ) : isDurationFreeLock ? (
              <div>
                <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                  1 free per container
                </span>
                <span className="block text-[10px] text-slate-400">Extra locks ${lockUnitPrice} ea · one-time purchase</span>
              </div>
            ) : (
              <div>
                <span className="text-lg sm:text-xl font-black text-[#15385E] font-mono">
                  ${lockUnitPrice} ea
                </span>
                <span className="block text-[10px] text-slate-400">One-time purchase</span>
              </div>
            )}
          </div>
        </div>

        {/* Lock Selector */}
        <div className="mt-4 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-700 font-medium">
            <span>Choose per container ({containers} container{containers > 1 ? 's' : ''})</span>
            {locksCount > 0 && (
              <span className="text-[#15385E] font-bold block sm:inline sm:ml-2">
                · {locksCount} padlock{locksCount > 1 ? 's' : ''} selected ({lockCalc.totalPrice === 0 ? 'FREE' : `$${lockCalc.totalPrice}`})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {lockOptions.map((opt) => (
              <button
                key={opt.perContainer}
                type="button"
                onClick={() => onUpdateLocksCount(opt.qty)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  locksCount === opt.qty
                    ? 'bg-[#15385E] text-white border-[#15385E] shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {opt.perContainer === 0
                  ? 'None'
                  : `${opt.perContainer} per container (${opt.price === 0 ? 'FREE' : `$${opt.price}`})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: MOVING BLANKETS RENTAL (FREE ALLOWANCE + BLOCK PRICING) */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 transition-all hover:border-sky-300">
        {false && blanketCalc.bonusFreeCount > 0 && (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Longer Duration Incentive:</strong> {blanketCalc.bonusFreeCount} bonus free blankets (lots of 10) included with your storage plan!
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold text-xs">
                <Package className="w-4 h-4 text-[#15385E]" />
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#15385E] tracking-tight">
                2. Blanket Rental ({blanketPackSize} per pack)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thick professional furniture pads to wrap timber furniture, televisions, mirrors, and appliances.
              {isAllBlanketsFree
                ? ' Promotional offer: All blankets are completely FREE with your container!'
                : ` Rented in packs of ${blanketPackSize} at $${blanketPackMonthly}/month per pack.${perkContainers > 0 ? ` Your first pack is free for each 12' and 16' container.` : ''}`}
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="font-mono text-lg sm:text-xl font-black text-[#15385E]">
              {blanketCalc.totalFee === 0 ? (
                <span className="text-emerald-700">$0 Free</span>
              ) : (
                `+$${blanketCalc.totalFee} /month`
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium block">
              {blanketsCount} selected ({Math.min(blanketsCount, freeBlanketsAllowance)} Free
              {blanketCalc.chargeableCount > 0 ? ` + ${blanketCalc.chargeableCount} chargeable` : ''})
            </span>
          </div>
        </div>

        {/* Blanket options, per container: None / 1 pack (free) / 2 packs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200/70">
          {blanketOptions.map((item) => (
            <button
              key={item.packs}
              type="button"
              onClick={() => onUpdateBlanketsCount(item.qty)}
              className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                blanketsCount === item.qty
                  ? 'bg-[#15385E] text-white border-[#15385E] shadow-2xs'
                  : item.packs === 1
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>
                {item.packs === 0
                  ? 'None'
                  : `${item.packs} × ${blanketPackSize}-pack per container (${item.fee === 0 ? 'FREE' : `+$${item.fee}/mo`})`}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 3: HEAVY-DUTY MOVING BOXES (Conditional on admin feature flag; default off) */}
      {config.enableMovingCartons && (
        <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 transition-all hover:border-sky-300">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-6 h-6 rounded-lg bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold text-xs">
                  <Package className="w-4 h-4 text-[#15385E]" />
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#15385E] tracking-tight">
                  3. Heavy-Duty Moving Cartons
                </h3>
                <span className="text-[10px] font-bold bg-sky-100 text-[#15385E] border border-sky-200 px-2 py-0.5 rounded-full">
                  Delivered inside container (Free Delivery)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Double-walled corrugated packing boxes engineered for stacking inside storage containers.
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="font-mono text-lg sm:text-xl font-black text-[#15385E]">
                ${currentBoxPrice}
              </div>
              <span className="text-[10px] text-slate-500 font-medium block">
                {boxesCount} cartons ordered
              </span>
            </div>
          </div>

          {/* Pricing Matrix Banner */}
          <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <span>${formatMoney(config.packingSupplies?.boxSinglePrice || 2.50, true)} ea</span>
            <span>·</span>
            <span className="font-bold text-[#15385E]">10 for ${formatMoney(config.packingSupplies?.box10Price || 20)}</span>
            <span>·</span>
            <span className="font-bold text-[#15385E]">50 for ${formatMoney(config.packingSupplies?.box50Price || 40)}</span>
            <span>·</span>
            <span className="font-bold text-[#5CC1EF]">100 for ${formatMoney(config.packingSupplies?.box100Price || 70)}</span>
          </div>

          {/* Quick Bundle Selector */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[0, 10, 50, 100].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => onUpdateBoxesCount(qty)}
                className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  boxesCount === qty
                    ? 'bg-[#15385E] text-white border-[#15385E] shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {qty === 0 ? 'None' : `${qty} pk`}
              </button>
            ))}
          </div>

          {/* Stepper for custom quantity */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
            <span className="font-semibold text-slate-600">Custom box quantity:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateBoxesCount(Math.max(0, boxesCount - 5))}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min="0"
                max="500"
                value={boxesCount}
                onChange={(e) => onUpdateBoxesCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 text-center py-1 rounded-lg border border-slate-200 font-mono font-bold text-xs bg-white"
              />
              <button
                type="button"
                onClick={() => onUpdateBoxesCount(boxesCount + 5)}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Are You Stuck Banner */}
      <div className="mt-8">
        <AreYouStuckBanner originPostcode={originPostcode} config={config} />
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* CTA Continue Button: #F7D347 Vibrant Gold with #1A1A1A text */}
        <button
          onClick={onContinue}
          className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
        </button>
      </div>
    </div>
  );
};
