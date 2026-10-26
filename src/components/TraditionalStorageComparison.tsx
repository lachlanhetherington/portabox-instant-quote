import React, { useState } from 'react';
import {
  Check,
  X,
  Truck,
  Warehouse,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  Building2,
} from 'lucide-react';

interface ComparisonFeature {
  title: string;
  category: string;
  portabox: {
    highlight: string;
    description: string;
    isAdvantage: boolean;
  };
  traditional: {
    highlight: string;
    description: string;
    isAdvantage: boolean;
  };
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    title: 'Future Move-Out & Relocation',
    category: 'Double-Handling',
    portabox: {
      highlight: 'Delivered Direct to New Home',
      description: 'When you finish storing or move house, we deliver your loaded container straight to your new doorstep. Zero double-handling.',
      isAdvantage: true,
    },
    traditional: {
      highlight: 'Must Rent Truck & Move Twice',
      description: 'You must hire a moving van or trailer, carry every box out to the dock, load the van, drive, and unload again at your new home.',
      isAdvantage: false,
    },
  },
  {
    title: 'Drive-Up & Vehicle Loading',
    category: 'Access Convenience',
    portabox: {
      highlight: 'Ground-Level Drive-Up Bay',
      description: 'Back your car, ute, or hire van directly up to the container doors.',
      isAdvantage: true,
    },
    traditional: {
      highlight: 'Multi-Floor Lifts & Long Corridors',
      description: 'Park at a shared dock, push trolleys down winding hallways, wait for slow goods elevators, and drag furniture up to upper floors.',
      isAdvantage: false,
    },
  },
  {
    title: 'Cubic Value & Hidden Fees',
    category: 'Pricing Transparency',
    portabox: {
      highlight: 'Full Container Usable Capacity',
      description: 'Massive 10 m³, 19 m³, or 25 m³ usable cubic volume at wholesale container rates. Zero sign-up admin fees or forced lock markups.',
      isAdvantage: true,
    },
    traditional: {
      highlight: 'Expensive Per m² Floor Pricing',
      description: 'High rates per square metre, mandatory facility insurance add-ons, administrative sign-up fees, and frequent 6-month rent hikes.',
      isAdvantage: false,
    },
  },
];

interface TraditionalStorageComparisonProps {
  variant?: 'compact' | 'full';
  defaultExpanded?: boolean;
  className?: string;
}

export const TraditionalStorageComparison: React.FC<TraditionalStorageComparisonProps> = ({
  variant = 'compact',
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (variant === 'compact') {
    return (
      <div className={`rounded-2xl border-2 border-sky-200 bg-sky-50/50 overflow-hidden transition-all ${className}`}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-sky-100/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#15385E] text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-[#15385E] uppercase tracking-wider">
                  Depot Direct Advantage
                </span>
                <span className="text-[10px] font-bold bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338] px-2 py-0.5 rounded-full">
                  Vs. Traditional Self-Storage
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">
                Why loading at our depot beats renting a fixed storage room (Kennards, Storage King)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-[#15385E] shrink-0">
            <span>{isExpanded ? 'Hide Comparison' : 'See Full Comparison'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 sm:p-5 border-t border-sky-200/80 bg-white space-y-4 animate-in fade-in duration-200">
            {/* Quick Summary Pill Highlight */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-sky-50 to-emerald-50 border border-sky-200 text-xs text-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00c0f3] shrink-0" />
                <span className="font-bold text-[#15385E]">
                  Biggest Advantage: Zero Double-Handling
                </span>
              </div>
              <span className="text-emerald-800 font-semibold text-[11px] bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                Save ~$250–$400 on future rental truck hire
              </span>
            </div>

            {/* Side-by-Side Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2.5 px-3 text-slate-500 font-bold uppercase text-[10px] tracking-wider w-1/4">
                      Feature
                    </th>
                    <th className="py-2.5 px-3 text-[#15385E] font-black uppercase text-[11px] tracking-wider bg-sky-50/70 rounded-t-xl w-3/8 border-l border-r border-t border-sky-200">
                      Portabox Depot Storage
                    </th>
                    <th className="py-2.5 px-3 text-slate-600 font-bold uppercase text-[10px] tracking-wider w-3/8">
                      Traditional Self-Storage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON_FEATURES.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 align-top font-bold text-slate-800 text-xs">
                        <div>{item.title}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{item.category}</span>
                      </td>

                      {/* Portabox Cell */}
                      <td className="py-3 px-3 align-top bg-sky-50/40 border-l border-r border-sky-200">
                        <div className="flex items-start gap-1.5 text-emerald-800 font-black text-xs mb-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                          <span>{item.portabox.highlight}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
                          {item.portabox.description}
                        </p>
                      </td>

                      {/* Traditional Storage Cell */}
                      <td className="py-3 px-3 align-top text-slate-600">
                        <div className="flex items-start gap-1.5 text-rose-700 font-bold text-xs mb-1">
                          <X className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5 stroke-[2.5]" />
                          <span>{item.traditional.highlight}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed pl-5">
                          {item.traditional.description}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified depot staging bays in Adelaide, Melbourne, Sydney & Brisbane</span>
              </span>
              <span className="font-semibold text-[#15385E]">
                Direct drive-up ground vehicle access
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full / Audit Mode (for Final Quote Page)
  return (
    <div className={`p-5 sm:p-7 rounded-3xl border-2 border-slate-200 bg-white shadow-xs space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#15385E] text-white px-2.5 py-0.5 rounded-md">
              Market Comparison
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200">
              Zero Double-Handling
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#15385E] tracking-tight">
            Portabox Depot Storage vs. Traditional Physical Self-Storage
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            See how Portabox eliminates hire truck rentals, multi-story goods lift delays, and moving twice compared to fixed facilities like Kennards, Storage King, or National Storage.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 shrink-0 text-left sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Future Move-Out Advantage
          </span>
          <span className="text-lg font-black text-emerald-900 font-mono">
            Save ~$250–$400+
          </span>
          <span className="text-[10px] text-emerald-700 block">
            in hire van & fuel costs avoided
          </span>
        </div>
      </div>

      {/* Comparison Grid on Desktop / Cards on Mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-3 px-4 text-slate-500 font-bold uppercase text-[10px] tracking-wider w-1/4">
                Comparison Feature
              </th>
              <th className="py-3 px-4 text-[#15385E] font-black uppercase text-xs tracking-wider bg-sky-50/90 rounded-t-2xl w-3/8 border-l border-r border-t-2 border-sky-300">
                <div className="flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-[#00c0f3]" />
                  <span>Portabox Depot Storage</span>
                </div>
              </th>
              <th className="py-3 px-4 text-slate-600 font-bold uppercase text-xs tracking-wider w-3/8">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Traditional Self-Storage (Fixed Units)</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {COMPARISON_FEATURES.map((feat, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-4 align-top font-bold text-slate-900">
                  <div className="text-xs sm:text-sm font-extrabold text-[#15385E]">{feat.title}</div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{feat.category}</span>
                </td>

                {/* Portabox Column */}
                <td className="py-4 px-4 align-top bg-sky-50/40 border-l border-r border-sky-200">
                  <div className="flex items-start gap-1.5 text-emerald-900 font-black text-xs sm:text-sm mb-1">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[3]" />
                    <span>{feat.portabox.highlight}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-5">
                    {feat.portabox.description}
                  </p>
                </td>

                {/* Traditional Column */}
                <td className="py-4 px-4 align-top text-slate-600">
                  <div className="flex items-start gap-1.5 text-rose-800 font-bold text-xs sm:text-sm mb-1">
                    <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 stroke-[2.5]" />
                    <span>{feat.traditional.highlight}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pl-5">
                    {feat.traditional.description}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="text-slate-600">
          <strong className="text-[#15385E]">The Portabox Difference:</strong> A traditional storage unit is anchored to a building floor. A Portabox is built to move — giving you complete flexibility to store on-site, store at our depot, or deliver directly to your new home whenever you're ready.
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
            ✓ Complete Mobility Guaranteed
          </span>
        </div>
      </div>
    </div>
  );
};
