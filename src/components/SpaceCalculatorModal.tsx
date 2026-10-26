import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  Check,
  Plus,
  Minus,
  RotateCcw,
  ArrowRight,
  Sofa,
  Bed,
  Utensils,
  Briefcase,
  Warehouse,
  PackageOpen,
  Sparkles,
  Info,
  Printer,
  Layers,
  Box,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { ContainerSizeId } from '../types/quote';

export function calculateOptimalContainerMix(totalM3: number): Record<ContainerSizeId, number> {
  if (totalM3 <= 0) {
    return {
      small_10m3: 1,
      medium_19m3: 0,
      large_25m3: 0,
      two_large_50m3: 0,
    };
  }

  if (totalM3 <= 10.5) {
    return { small_10m3: 1, medium_19m3: 0, large_25m3: 0, two_large_50m3: 0 };
  }
  if (totalM3 <= 19.5) {
    return { small_10m3: 0, medium_19m3: 1, large_25m3: 0, two_large_50m3: 0 };
  }
  if (totalM3 <= 25.5) {
    return { small_10m3: 0, medium_19m3: 0, large_25m3: 1, two_large_50m3: 0 };
  }
  if (totalM3 <= 35.5) {
    // 1x 25m³ Large + 1x 10m³ Small
    return { small_10m3: 1, medium_19m3: 0, large_25m3: 1, two_large_50m3: 0 };
  }
  if (totalM3 <= 44.5) {
    // 1x 25m3 Large + 1x 19m3 Medium = 44m3 capacity
    return { small_10m3: 0, medium_19m3: 1, large_25m3: 1, two_large_50m3: 0 };
  }
  if (totalM3 <= 50.5) {
    // 2x 25m3 Large = 50m3 capacity
    return { small_10m3: 0, medium_19m3: 0, large_25m3: 2, two_large_50m3: 0 };
  }
  if (totalM3 <= 60.5) {
    // 2x 25m3 Large + 1x 10m3 Small = 60m3 capacity
    return { small_10m3: 1, medium_19m3: 0, large_25m3: 2, two_large_50m3: 0 };
  }
  if (totalM3 <= 69.5) {
    // 2x 25m3 Large + 1x 19m3 Medium = 69m3 capacity
    return { small_10m3: 0, medium_19m3: 1, large_25m3: 2, two_large_50m3: 0 };
  }

  // 70m3 and higher
  const largeCount = Math.floor(totalM3 / 25);
  const rem = totalM3 - largeCount * 25;
  let smallCount = 0;
  let medCount = 0;
  let finalLarge = largeCount;
  if (rem > 0 && rem <= 10.5) {
    smallCount = 1;
  } else if (rem > 10.5 && rem <= 19.5) {
    medCount = 1;
  } else if (rem > 19.5) {
    finalLarge += 1;
  }
  return {
    small_10m3: smallCount,
    medium_19m3: medCount,
    large_25m3: finalLarge,
    two_large_50m3: 0,
  };
}

export function formatContainerMixLabel(mix: Record<ContainerSizeId, number>): string {
  const parts: string[] = [];
  if (mix.small_10m3) parts.push(`${mix.small_10m3}x 10m³ Small`);
  if (mix.medium_19m3) parts.push(`${mix.medium_19m3}x 19m³ Medium`);
  if (mix.large_25m3) parts.push(`${mix.large_25m3}x 25m³ Large`);
  return parts.length > 0 ? parts.join(' + ') : '1x 10m³ Small';
}

export interface SpaceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSize?: (size: ContainerSizeId, count?: number) => void;
  onUpdateContainerSelections?: (selections: Record<ContainerSizeId, number>, totalM3: number) => void;
}

interface RoomItem {
  id: string;
  name: string;
  m3: number;
  category: string;
  defaultQty?: number;
}

interface RoomCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: RoomItem[];
}

const ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: 'living',
    name: 'Living Room',
    icon: Sofa,
    items: [
      { id: '3_seater_sofa', name: '3-Seater Sofa / Couch', m3: 1.8, category: 'living' },
      { id: '2_seater_sofa', name: '2-Seater Loveseat', m3: 1.3, category: 'living' },
      { id: 'armchair', name: 'Armchair / Recliner', m3: 0.8, category: 'living' },
      { id: 'coffee_table', name: 'Coffee Table', m3: 0.4, category: 'living' },
      { id: 'tv_unit', name: 'Entertainment / TV Unit', m3: 0.9, category: 'living' },
      { id: 'large_tv', name: 'Large Flat Screen TV (in box)', m3: 0.3, category: 'living' },
      { id: 'bookcase', name: 'Tall Bookcase / Shelving', m3: 0.9, category: 'living' },
      { id: 'floor_lamp', name: 'Floor Lamp / Side Tables', m3: 0.25, category: 'living' },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedrooms',
    icon: Bed,
    items: [
      { id: 'king_bed', name: 'King Bed & Mattress', m3: 2.2, category: 'bedroom' },
      { id: 'queen_bed', name: 'Queen Bed & Mattress', m3: 1.8, category: 'bedroom' },
      { id: 'single_bed', name: 'Single / Bunk Bed & Mattress', m3: 1.1, category: 'bedroom' },
      { id: 'wardrobe', name: 'Freestanding Wardrobe', m3: 1.6, category: 'bedroom' },
      { id: 'tallboy', name: 'Tallboy / Chest of Drawers', m3: 0.9, category: 'bedroom' },
      { id: 'bedside_table', name: 'Bedside Table (each)', m3: 0.2, category: 'bedroom' },
      { id: 'dressing_table', name: 'Dressing Table & Mirror', m3: 0.8, category: 'bedroom' },
    ],
  },
  {
    id: 'dining_kitchen',
    name: 'Dining & Kitchen',
    icon: Utensils,
    items: [
      { id: 'dining_table_6', name: 'Dining Table & 6 Chairs', m3: 2.4, category: 'dining_kitchen' },
      { id: 'dining_table_4', name: 'Dining Table & 4 Chairs', m3: 1.8, category: 'dining_kitchen' },
      { id: 'buffet_sideboard', name: 'Buffet / Sideboard Unit', m3: 1.2, category: 'dining_kitchen' },
      { id: 'bar_stools', name: 'Bar Stools (Pair)', m3: 0.35, category: 'dining_kitchen' },
      { id: 'fridge_double', name: 'Double-Door French Fridge', m3: 1.6, category: 'dining_kitchen' },
      { id: 'fridge_single', name: 'Single Fridge / Freezer', m3: 1.1, category: 'dining_kitchen' },
      { id: 'washing_machine', name: 'Washing Machine / Dryer', m3: 0.6, category: 'dining_kitchen' },
      { id: 'microwave_small_app', name: 'Microwave & Kitchen Boxes (Set)', m3: 0.5, category: 'dining_kitchen' },
    ],
  },
  {
    id: 'office',
    name: 'Home Office / Study',
    icon: Briefcase,
    items: [
      { id: 'large_desk', name: 'Executive / Corner Desk', m3: 1.2, category: 'office' },
      { id: 'std_desk', name: 'Standard Study Desk', m3: 0.7, category: 'office' },
      { id: 'ergonomic_chair', name: 'Ergonomic Office Chair', m3: 0.4, category: 'office' },
      { id: 'filing_cabinet', name: '2 to 4-Drawer Filing Cabinet', m3: 0.5, category: 'office' },
      { id: 'bookshelf_office', name: 'Office Bookcase / Credenza', m3: 0.8, category: 'office' },
      { id: 'computer_peripherals', name: 'Dual Monitor Box / Tech Kit', m3: 0.3, category: 'office' },
    ],
  },
  {
    id: 'garage_outdoor',
    name: 'Garage & Outdoor',
    icon: Warehouse,
    items: [
      { id: 'outdoor_dining', name: 'Outdoor Table & 6 Chairs', m3: 2.0, category: 'garage_outdoor' },
      { id: 'bbq_outdoor', name: 'Large 4-6 Burner BBQ Grill', m3: 1.1, category: 'garage_outdoor' },
      { id: 'bicycle', name: 'Adult Bicycle (each)', m3: 0.5, category: 'garage_outdoor' },
      { id: 'lawnmower', name: 'Lawn Mower & Garden Tools Set', m3: 0.8, category: 'garage_outdoor' },
      { id: 'workbench', name: 'Tool Chest / Heavy Work Bench', m3: 1.2, category: 'garage_outdoor' },
      { id: 'ladder_gear', name: 'Extension Ladder & Outdoor Gear', m3: 0.5, category: 'garage_outdoor' },
      { id: 'plastic_tubs_set', name: 'Stackable Storage Tubs (5pk)', m3: 0.6, category: 'garage_outdoor' },
    ],
  },
  {
    id: 'boxes_packing',
    name: 'Cartons & Packing',
    icon: PackageOpen,
    items: [
      { id: 'box_standard', name: 'Standard Tea Chest Box (105L)', m3: 0.15, category: 'boxes_packing' },
      { id: 'box_book_wine', name: 'Book & Wine Carton (Heavy Duty)', m3: 0.08, category: 'boxes_packing' },
      { id: 'box_wardrobe', name: 'Port-a-Robe Hanging Box', m3: 0.4, category: 'boxes_packing' },
      { id: 'box_picture_mirror', name: 'Picture / Flat Mirror Box', m3: 0.1, category: 'boxes_packing' },
    ],
  },
];

const PRESETS: Array<{ name: string; desc: string; items: Record<string, number> }> = [
  {
    name: '1-Bedroom Apt',
    desc: 'Compact apartment or studio move (~12 m³)',
    items: {
      '3_seater_sofa': 1,
      'coffee_table': 1,
      'tv_unit': 1,
      'queen_bed': 1,
      'bedside_table': 2,
      'tallboy': 1,
      'dining_table_4': 1,
      'fridge_single': 1,
      'washing_machine': 1,
      'box_standard': 15,
      'box_book_wine': 10,
    },
  },
  {
    name: '2-3 Bedroom House',
    desc: 'Average Australian 2-3 bed home (~24 m³)',
    items: {
      '3_seater_sofa': 1,
      '2_seater_sofa': 1,
      'coffee_table': 1,
      'tv_unit': 1,
      'bookcase': 1,
      'king_bed': 1,
      'queen_bed': 1,
      'bedside_table': 4,
      'tallboy': 2,
      'dining_table_6': 1,
      'fridge_double': 1,
      'washing_machine': 1,
      'outdoor_dining': 1,
      'bbq_outdoor': 1,
      'box_standard': 30,
      'box_book_wine': 20,
      'box_wardrobe': 4,
    },
  },
  {
    name: '4+ Bedroom Family',
    desc: 'Large suburban home or high volume (~42 m³)',
    items: {
      '3_seater_sofa': 2,
      'armchair': 2,
      'coffee_table': 1,
      'tv_unit': 2,
      'bookcase': 2,
      'king_bed': 1,
      'queen_bed': 2,
      'single_bed': 2,
      'bedside_table': 6,
      'tallboy': 3,
      'dining_table_6': 1,
      'buffet_sideboard': 1,
      'fridge_double': 1,
      'washing_machine': 1,
      'std_desk': 2,
      'ergonomic_chair': 2,
      'outdoor_dining': 1,
      'bbq_outdoor': 1,
      'bicycle': 3,
      'lawnmower': 1,
      'box_standard': 50,
      'box_book_wine': 30,
      'box_wardrobe': 8,
    },
  },
];

export const SpaceCalculatorModal: React.FC<SpaceCalculatorModalProps> = ({
  isOpen,
  onClose,
  onSelectSize,
  onUpdateContainerSelections,
}) => {
  const [activeTab, setActiveTab] = useState<string>('living');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Calculate total m³
  const totalM3 = useMemo(() => {
    let sum = 0;
    ROOM_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        const qty = quantities[item.id] || 0;
        sum += qty * item.m3;
      });
    });
    return Math.round(sum * 10) / 10;
  }, [quantities]);

  // Total item count
  const totalItemCount = useMemo(() => {
    return Object.values(quantities).reduce((a, b) => a + b, 0);
  }, [quantities]);

  // Room item counts for badges
  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ROOM_CATEGORIES.forEach((cat) => {
      let catCount = 0;
      cat.items.forEach((item) => {
        catCount += quantities[item.id] || 0;
      });
      counts[cat.id] = catCount;
    });
    return counts;
  }, [quantities]);

  // Determine Portabox recommendation with container mix
  const recommendation = useMemo(() => {
    const mix = calculateOptimalContainerMix(totalM3);
    const capacity = (mix.small_10m3 * 10) + (mix.medium_19m3 * 19) + (mix.large_25m3 * 25);
    const totalContainers = mix.small_10m3 + mix.medium_19m3 + mix.large_25m3;

    if (totalM3 <= 0) {
      return {
        sizeId: 'large_25m3' as ContainerSizeId,
        count: 1,
        mix,
        title: 'Large Container (25 m³)',
        capacity: 25,
        fillPct: 0,
        badge: "Australia's Most Popular",
        desc: "Add your items to see tailored container recommendation.",
        isOverflow: false,
      };
    }

    const title = formatContainerMixLabel(mix);
    const fillPct = Math.min(100, Math.round((totalM3 / Math.max(1, capacity)) * 100));

    let badge = 'Optimized Capacity';
    let desc = `${title} provides ${capacity} m³ total volume, matching your ${totalM3} m³ items with zero wasted space.`;

    if (totalM3 <= 10.5) {
      badge = 'Compact & Economical';
      desc = 'Ideal for 1-room renovation, seasonal gear, or light studio overflow.';
    } else if (totalM3 <= 19.5) {
      badge = 'Spacious Mid-Size';
      desc = 'Accommodates standard 1-2 bedroom apartments with appliances.';
    } else if (totalM3 <= 25.5) {
      badge = "Australia's Largest Single Container";
      desc = 'Up to 50% more space than traditional 16m³ competitors. Fits typical 3-bedroom home contents.';
    } else if (totalM3 <= 35.5) {
      badge = 'Multi-Container Combination';
      desc = '1x 25m³ Large container + 1x 10m³ Small container. Perfect for phased packing.';
    } else if (totalM3 <= 50.5) {
      badge = 'Dual Large Containers';
      desc = '2x 25m³ Large containers providing 50 m³ capacity. Ideal for 4-5 bedroom executive homes.';
    } else {
      badge = 'Multi-Container High Volume';
      desc = `${totalContainers} containers providing ${capacity} m³ capacity for large estates or commercial moves.`;
    }

    const primarySizeId: ContainerSizeId = mix.large_25m3 > 0 ? 'large_25m3' : mix.medium_19m3 > 0 ? 'medium_19m3' : 'small_10m3';

    return {
      sizeId: primarySizeId,
      count: totalContainers,
      mix,
      title,
      capacity,
      fillPct,
      badge,
      desc,
      isOverflow: totalM3 > capacity,
    };
  }, [totalM3]);

  // Sync container selections to parent component when user updates items or presets
  const syncParentMix = (newQuantities: Record<string, number>) => {
    if (!onUpdateContainerSelections) return;
    let sum = 0;
    ROOM_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        const qty = newQuantities[item.id] || 0;
        sum += qty * item.m3;
      });
    });
    const calculatedM3 = Math.round(sum * 10) / 10;
    if (calculatedM3 > 0) {
      const mix = calculateOptimalContainerMix(calculatedM3);
      onUpdateContainerSelections(mix, calculatedM3);
    }
  };

  const updateItemQty = (id: string, delta: number) => {
    const cur = quantities[id] || 0;
    const nextVal = Math.max(0, cur + delta);
    const nextMap = { ...quantities };
    if (nextVal === 0) {
      delete nextMap[id];
    } else {
      nextMap[id] = nextVal;
    }
    setQuantities(nextMap);
    syncParentMix(nextMap);
  };

  const setItemQty = (id: string, qty: number) => {
    const val = Math.max(0, qty);
    const nextMap = { ...quantities };
    if (val === 0) {
      delete nextMap[id];
    } else {
      nextMap[id] = val;
    }
    setQuantities(nextMap);
    syncParentMix(nextMap);
  };

  const handleApplyPreset = (presetItems: Record<string, number>) => {
    setQuantities({ ...presetItems });
    syncParentMix(presetItems);
  };

  const handleClearAll = () => {
    setQuantities({});
  };

  const handleApplyToQuote = () => {
    const mix = calculateOptimalContainerMix(totalM3);
    if (onUpdateContainerSelections) {
      onUpdateContainerSelections(mix, totalM3);
    }
    if (onSelectSize) {
      onSelectSize(recommendation.sizeId, recommendation.count);
    }
    setShowAppliedToast(true);
    setTimeout(() => {
      setShowAppliedToast(false);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  const currentCategory = ROOM_CATEGORIES.find((c) => c.id === activeTab) || ROOM_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border-2 border-[#DAD7D1] relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#15385E] text-white px-5 sm:px-7 py-4.5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#5CC1EF] to-sky-300 text-[#15385E] shadow-sm">
              <Calculator className="w-5 h-5 text-[#15385E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Room-by-Room Container Space Calculator
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#F7D347] text-[#1A1A1A] px-2 py-0.5 rounded">
                  UP TO 50% MORE SPACE
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Calculate your exact cubic meters (m³) based on Australian furniture standards.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close calculator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="bg-slate-50 border-b border-[#DAD7D1] px-5 sm:px-7 py-2.5 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#5CC1EF]" />
            <span className="uppercase tracking-wider text-[11px] text-slate-500">Quick Presets:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset.items)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-[#15385E] border border-slate-200 hover:border-[#5CC1EF] text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-2xs"
                title={preset.desc}
              >
                {preset.name}
              </button>
            ))}

            {totalItemCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body: Left Room Navigator & Items, Right Container Visualizer Gauge */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT COLUMN: Rooms & Items (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col p-4 sm:p-6 space-y-4">
            {/* Room Tabs */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
              {ROOM_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = roomCounts[cat.id] || 0;
                const isSelected = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveTab(cat.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-[#15385E] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-[#F7D347]' : 'text-slate-500'}`} />
                    <span className="text-[10px] sm:text-[11px] leading-tight line-clamp-1">
                      {cat.name.split(' ')[0]}
                    </span>
                    {count > 0 && (
                      <span
                        className={`absolute -top-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-2xs ${
                          isSelected ? 'bg-[#F7D347] text-[#1A1A1A]' : 'bg-[#5CC1EF] text-[#15385E]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Room Subheader */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <currentCategory.icon className="w-5 h-5 text-[#15385E]" />
                <h4 className="font-extrabold text-sm sm:text-base text-[#15385E]">
                  {currentCategory.name} Furniture &amp; Items
                </h4>
              </div>
              <span className="text-[11px] font-bold text-slate-500">
                {roomCounts[currentCategory.id] || 0} items selected
              </span>
            </div>

            {/* Item Listing with Steppers */}
            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
              {currentCategory.items.map((item) => {
                const qty = quantities[item.id] || 0;
                const itemTotalM3 = Math.round(qty * item.m3 * 10) / 10;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      qty > 0
                        ? 'bg-sky-50/60 border-[#5CC1EF] shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#15385E] truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          {item.m3} m³
                        </span>
                      </div>
                      {qty > 0 && (
                        <div className="text-[11px] text-[#5CC1EF] font-bold mt-0.5">
                          {qty} × {item.m3} m³ = <span className="font-mono">{itemTotalM3} m³</span>
                        </div>
                      )}
                    </div>

                    {/* Stepper controls */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, -1)}
                        disabled={qty <= 0}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer ${
                          qty > 0
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={qty}
                        onChange={(e) => setItemQty(item.id, parseInt(e.target.value, 10) || 0)}
                        className="w-8 text-center text-xs font-black text-[#15385E] focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-[#5CC1EF] hover:bg-[#4ab4e3] text-[#15385E] flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Live Container Visualizer Gauge & Recommendation (5 Cols) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Total Space Metric Display */}
              <div className="bg-[#15385E] text-white p-5 rounded-3xl shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#F7D347] block">
                      Calculated Total Volume
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                        {totalM3}
                      </span>
                      <span className="text-base font-bold text-sky-200">m³ cubic metres</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-300 block">Total Items</span>
                    <span className="text-xl font-black text-[#5CC1EF] font-mono">{totalItemCount}</span>
                  </div>
                </div>

                {/* Real-time Loading Gauge */}
                <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sky-200 font-medium">Container Utilization</span>
                    <span className="font-mono font-black text-[#F7D347]">{recommendation.fillPct}% Full</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-black/30 overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        recommendation.fillPct >= 95
                          ? 'bg-amber-400'
                          : recommendation.fillPct > 0
                          ? 'bg-gradient-to-r from-[#5CC1EF] to-emerald-400'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${Math.min(100, recommendation.fillPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recommended Container Card */}
              <div className="bg-white rounded-3xl p-5 border-2 border-[#DAD7D1] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-sky-50 text-[#15385E] px-2.5 py-1 rounded-md border border-[#5CC1EF]/40">
                    {recommendation.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Cap: {recommendation.capacity} m³
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-black text-[#15385E] leading-snug">
                    {recommendation.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {recommendation.desc}
                  </p>
                </div>

                {/* Stacking Layers Guide Visual */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#15385E]">
                    <Layers className="w-4 h-4 text-[#5CC1EF]" />
                    <span>Zero-Tilt Stacking Distribution</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                    <div className="p-1.5 rounded-lg bg-sky-100 text-[#15385E] font-bold">
                      Base Tier: Heavy Appliances
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 font-bold">
                      Mid Tier: Lounges &amp; Beds
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900 font-bold">
                      Top Tier: Boxes &amp; Linen
                    </div>
                  </div>
                </div>

                {/* Competitor volume comparison note */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Why Portabox?</strong> Standard 16m³ competitor containers require 2 or 3 trips. A single 25m³ Portabox holds up to 50% more!
                  </span>
                </div>

                {/* Live Sync Status & Container Breakdown */}
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Syncing to Page 3 Cards</span>
                    </span>
                    <span className="font-mono text-emerald-800">{recommendation.capacity} m³ Total</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {recommendation.mix.small_10m3 > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[11px] font-black text-[#15385E] shadow-2xs">
                        {recommendation.mix.small_10m3}x 10m³ Small
                      </span>
                    )}
                    {recommendation.mix.medium_19m3 > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[11px] font-black text-[#15385E] shadow-2xs">
                        {recommendation.mix.medium_19m3}x 19m³ Medium
                      </span>
                    )}
                    {recommendation.mix.large_25m3 > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[11px] font-black text-[#15385E] shadow-2xs">
                        {recommendation.mix.large_25m3}x 25m³ Large
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-tight">
                    Numbers under the container images above update dynamically to match your required space.
                  </p>
                </div>

                {/* Encouragement Message */}
                <div className="p-4 rounded-2xl bg-[#15385E] text-white space-y-3">
                  <p className="text-[11px] leading-relaxed">
                    Trouble calculating your space? We have done 50,000 moves and are experts in the calculation of space that you need - let us help you get exactly what you need.
                  </p>
                  <div className="flex gap-2">
                    <a href="tel:1800467637" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white text-[#15385E] font-bold text-[10px] cursor-pointer">
                      <Phone className="w-3 h-3" /> Call
                    </a>
                    <a href="sms:1800467637" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#5CC1EF] text-[#15385E] font-bold text-[10px] cursor-pointer">
                      <MessageSquare className="w-3 h-3" /> Message
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bottom Bar */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleApplyToQuote}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-sm flex items-center justify-center gap-2 shadow-xs border border-[#e6c338] transition-all cursor-pointer"
              >
                {showAppliedToast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span className="text-emerald-800">Applied to Step 3 Quote!</span>
                  </>
                ) : (
                  <>
                    <span>Apply {recommendation.title} to Quote</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 hover:text-[#15385E] font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Inventory List</span>
                </button>

                <span>{totalItemCount} Total Items Added</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
