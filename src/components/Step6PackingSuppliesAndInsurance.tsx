import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
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
import {
  calculateBlanketRentalPrice,
  calculateBoxPrice,
  calculateInsuranceMonthlyFee,
  calculateLockSalesPrice,
} from '../services/pricingEngine';
import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step6PackingSuppliesAndInsuranceProps {
  containerSize?: ContainerSizeId;
  containerCount?: number;
  insuranceSelected: boolean;
  onToggleInsurance: (selected: boolean) => void;
  locksCount: number;
  onUpdateLocksCount: (count: number) => void;
  blanketsCount: number;
  onUpdateBlanketsCount: (count: number) => void;
  boxesCount: number;
  onUpdateBoxesCount: (count: number) => void;
  config: AppConfig;
  onContinue: () => void;
  onBack: () => void;
}

export const Step6PackingSuppliesAndInsurance: React.FC<Step6PackingSuppliesAndInsuranceProps> = ({
  containerCount = 1,
  insuranceSelected,
  onToggleInsurance,
  locksCount,
  onUpdateLocksCount,
  blanketsCount,
  onUpdateBlanketsCount,
  boxesCount,
  onUpdateBoxesCount,
  config,
  onContinue,
  onBack,
}) => {
  // Calculations
  const insuranceCalc = calculateInsuranceMonthlyFee(insuranceSelected, containerCount, config.insurance);
  const lockCalc = calculateLockSalesPrice(locksCount, config.packingSupplies);
  const blanketCalc = calculateBlanketRentalPrice(blanketsCount, containerCount, config.packingSupplies);
  const currentBoxPrice = calculateBoxPrice(boxesCount, config.packingSupplies);

  const freeBlanketsAllowance = blanketCalc.freeAllowance;
  const isFreeInsurance = Boolean(config.insurance?.isFreePromo);
  const isFreeLock = Boolean(config.packingSupplies?.isLockFreePromo);
  const isAllBlanketsFree = Boolean(config.packingSupplies?.isAllBlanketsFreePromo);

  const totalSuppliesAndInsuranceNow =
    currentBoxPrice +
    lockCalc.totalPrice +
    blanketCalc.totalFee +
    (insuranceSelected ? insuranceCalc.monthlyFee : 0);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      {/* Header kicker: #F7D347 Vibrant Gold with #1A1A1A text */}
      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
        STEP 7 OF 8 · PACKING SUPPLIES &amp; INSURANCE
      </span>

      <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight mt-1 mb-2">
        Packing Supplies &amp; Insurance Protection
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-2xl">
        Protect your valuable contents with our Container Protection Option (CPO), heavy-duty padlocks, free rental blankets, and durable packing boxes delivered directly inside your container.
      </p>

      {/* SECTION 1: CONTAINER PROTECTION OPTION (CPO / INSURANCE) */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 transition-all hover:border-sky-300">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-[#15385E]" />
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#15385E] tracking-tight">
                1. Container Protection Option (CPO Insurance)
              </h3>
              {isFreeInsurance ? (
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Gift className="w-3 h-3 text-emerald-600" />
                  FREE PROMOTIONAL INCLUSION
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-sky-100 text-[#15385E] border border-sky-200 px-2 py-0.5 rounded-full">
                  Up to ${(config.insurance?.coverageAmountPerContainer || 10000).toLocaleString()} Cover / Container
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Comprehensive contents cover tailored for portable storage. Covers accidental damage, theft, storm, water ingress, and road transit between locations with zero standard deductible.
            </p>
          </div>

          {/* Pricing Display */}
          <div className="text-left sm:text-right shrink-0">
            {isFreeInsurance ? (
              <div>
                <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                  $0 /month
                </span>
                <span className="block text-[11px] text-slate-400 line-through">
                  ${(config.insurance?.monthlyPricePerContainer || 15) * containerCount}/mo
                </span>
                <span className="text-[10px] font-bold text-emerald-600">
                  Save ${(config.insurance?.monthlyPricePerContainer || 15) * containerCount}/mo
                </span>
              </div>
            ) : (
              <div>
                <span className="text-lg sm:text-xl font-black text-[#15385E] font-mono">
                  ${(config.insurance?.monthlyPricePerContainer || 15) * containerCount} /month
                </span>
                {containerCount > 1 && (
                  <span className="block text-[10px] text-slate-500 font-medium">
                    ${config.insurance?.monthlyPricePerContainer || 15}/mo × {containerCount} containers
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toggle Option Card */}
        <div className="mt-4 pt-4 border-t border-slate-200/70">
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border-2 border-slate-200 cursor-pointer select-none transition-all hover:border-[#5CC1EF] shadow-2xs">
            <input
              type="checkbox"
              checked={insuranceSelected}
              onChange={(e) => onToggleInsurance(e.target.checked)}
              className="mt-1 w-5 h-5 rounded text-[#15385E] accent-[#15385E] cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-black text-[#15385E]">
                  {insuranceSelected
                    ? '✓ Yes, include Container Protection Option (CPO)'
                    : 'Add Container Protection Option (CPO)'}
                </span>
                {insuranceSelected && (
                  <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Active on {containerCount} {containerCount > 1 ? 'containers' : 'container'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {isFreeInsurance
                  ? 'Admin promotional special: 100% free contents insurance included with your booking.'
                  : `Provides peace of mind for goods valued up to $${((config.insurance?.coverageAmountPerContainer || 10000) * containerCount).toLocaleString()}. Billed monthly.`}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* SECTION 2: MOVING SUPPLIES - PADLOCKS */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 transition-all hover:border-sky-300">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold text-xs">
                <Lock className="w-4 h-4 text-[#15385E]" />
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#15385E] tracking-tight">
                2. Heavy-Duty Container Padlocks
              </h3>
              {isFreeLock && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Gift className="w-3 h-3 text-emerald-600" />
                  FREE LOCK WITH CONTAINER
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
                  ${config.packingSupplies?.lockPrice || 20} each
                </span>
              </div>
            ) : (
              <div>
                <span className="text-lg sm:text-xl font-black text-[#15385E] font-mono">
                  ${config.packingSupplies?.lockPrice || 20} ea
                </span>
                <span className="block text-[10px] text-slate-400">One-time purchase</span>
              </div>
            )}
          </div>
        </div>

        {/* Lock Selector */}
        <div className="mt-4 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-700 font-medium">
            <span>Recommended: <strong>{containerCount} lock{containerCount > 1 ? 's' : ''}</strong> (1 per container door)</span>
            {locksCount > 0 && (
              <span className="text-[#15385E] font-bold block sm:inline sm:ml-2">
                · {locksCount} padlock{locksCount > 1 ? 's' : ''} selected ({isFreeLock ? 'FREE' : `$${lockCalc.totalPrice}`})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {[0, containerCount, containerCount + 1].filter((v, i, a) => a.indexOf(v) === i).map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => onUpdateLocksCount(qty)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  locksCount === qty
                    ? 'bg-[#15385E] text-white border-[#15385E] shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {qty === 0 ? 'None' : qty === containerCount ? `${qty} (Recommended)` : `${qty} Locks`}
              </button>
            ))}

            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => onUpdateLocksCount(Math.max(0, locksCount - 1))}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono font-bold text-xs w-6 text-center">{locksCount}</span>
              <button
                type="button"
                onClick={() => onUpdateLocksCount(locksCount + 1)}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: MOVING BLANKETS RENTAL (FREE ALLOWANCE + BLOCK PRICING) */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 transition-all hover:border-sky-300">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold text-xs">
                <Package className="w-4 h-4 text-[#15385E]" />
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#15385E] tracking-tight">
                3. Quilted Furniture Blankets Rental
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Gift className="w-3 h-3 text-[#15385E]" />
                FIRST {freeBlanketsAllowance} BLANKETS FREE ({containerCount > 1 ? `${config.packingSupplies?.freeBlanketsPerContainer || 10} per container` : '10 Free Included'})
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thick professional furniture pads to wrap timber furniture, televisions, mirrors, and appliances.
              {isAllBlanketsFree
                ? ' Promotional offer: All blankets are completely FREE with your container!'
                : ` Your first ${freeBlanketsAllowance} blankets are 100% free for the duration of your rental. Additional blocks of 10 blankets are just $${config.packingSupplies?.blanketBlockPriceMonthly || 25}/month.`}
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

        {/* Blanket Quick Select Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-slate-200/70">
          {[
            { qty: 0, label: 'None (0)', fee: 0 },
            { qty: freeBlanketsAllowance, label: `${freeBlanketsAllowance} pk (100% FREE)`, fee: 0, highlight: true },
            { qty: freeBlanketsAllowance + 10, label: `${freeBlanketsAllowance + 10} pk (+$25/mo)`, fee: 25 },
            { qty: freeBlanketsAllowance + 20, label: `${freeBlanketsAllowance + 20} pk (+$50/mo)`, fee: 50 },
            { qty: freeBlanketsAllowance + 40, label: `${freeBlanketsAllowance + 40} pk (+$100/mo)`, fee: 100 },
          ].map((item) => (
            <button
              key={item.qty}
              type="button"
              onClick={() => onUpdateBlanketsCount(item.qty)}
              className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                blanketsCount === item.qty
                  ? 'bg-[#15385E] text-white border-[#15385E] shadow-2xs'
                  : item.highlight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div>{item.label}</div>
            </button>
          ))}
        </div>

        {/* Stepper for custom quantity */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
          <span className="font-semibold text-slate-600">Custom blanket quantity:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateBlanketsCount(Math.max(0, blanketsCount - 5))}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              min="0"
              max="500"
              value={blanketsCount}
              onChange={(e) => onUpdateBlanketsCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 text-center py-1 rounded-lg border border-slate-200 font-mono font-bold text-xs bg-white"
            />
            <button
              type="button"
              onClick={() => onUpdateBlanketsCount(blanketsCount + 5)}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: HEAVY-DUTY MOVING BOXES */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-slate-50/80 border-2 border-slate-200/90 transition-all hover:border-sky-300">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-lg bg-[#5CC1EF]/20 text-[#15385E] flex items-center justify-center font-bold text-xs">
                <Package className="w-4 h-4 text-[#15385E]" />
              </span>
              <h3 className="text-lg sm:text-xl font-black text-[#15385E] tracking-tight">
                4. Heavy-Duty Moving Cartons
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
          <span>${config.packingSupplies?.boxSinglePrice || 2.50} ea</span>
          <span>·</span>
          <span className="font-bold text-[#15385E]">10 for ${config.packingSupplies?.box10Price || 20}</span>
          <span>·</span>
          <span className="font-bold text-[#15385E]">50 for ${config.packingSupplies?.box50Price || 40}</span>
          <span>·</span>
          <span className="font-bold text-[#5CC1EF]">100 for ${config.packingSupplies?.box100Price || 70}</span>
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

      {/* Are You Stuck Banner */}
      <div className="mt-8">
        <AreYouStuckBanner />
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
