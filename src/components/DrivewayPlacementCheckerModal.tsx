import React, { useState, useMemo } from 'react';
import {
  X,
  MapPin,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  Truck,
  Trees,
  Maximize2,
  Minimize2,
  FileText,
  Camera,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Car,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { ContainerSizeId } from '../types/quote';

export interface PlacementPreferences {
  locationType: 'driveway' | 'carport' | 'street_curbside' | 'lawn_front_yard' | 'commercial';
  drivewayLength: '<5m' | '5-7m' | '7-10m' | '10m+';
  drivewayWidth: 'single_narrow' | 'single_standard' | 'double_wide';
  slope: 'flat' | 'moderate' | 'steep';
  overheadClearance: 'clear_over_3.5m' | 'low_tree_branches' | 'overhead_wires';
  groundSurface: 'concrete' | 'exposed_aggregate' | 'pavers' | 'bitumen' | 'lawn';
  councilPermitUnderstood: boolean;
  notes: string;
}

export interface DrivewayPlacementCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContainerSize?: ContainerSizeId;
  onSelectRecommendedSize?: (size: ContainerSizeId) => void;
  onConfirmPlacement?: (prefs: PlacementPreferences) => void;
  suburbName?: string;
  stateCode?: string;
}

export const DrivewayPlacementCheckerModal: React.FC<DrivewayPlacementCheckerModalProps> = ({
  isOpen,
  onClose,
  selectedContainerSize = 'large_25m3',
  onSelectRecommendedSize,
  onConfirmPlacement,
  suburbName = 'Your Suburb',
  stateCode = 'SA',
}) => {
  const [activeTab, setActiveTab] = useState<'checker' | 'comparison' | 'council' | 'groundcare'>('checker');

  // Placement parameters
  const [locationType, setLocationType] = useState<PlacementPreferences['locationType']>('driveway');
  const [drivewayLength, setDrivewayLength] = useState<PlacementPreferences['drivewayLength']>('5-7m');
  const [drivewayWidth, setDrivewayWidth] = useState<PlacementPreferences['drivewayWidth']>('single_standard');
  const [slope, setSlope] = useState<PlacementPreferences['slope']>('flat');
  const [overheadClearance, setOverheadClearance] = useState<PlacementPreferences['overheadClearance']>('clear_over_3.5m');
  const [groundSurface, setGroundSurface] = useState<PlacementPreferences['groundSurface']>('concrete');
  const [notes, setNotes] = useState('');
  const [showAppliedToast, setShowAppliedToast] = useState(false);

  // Feasibility logic
  const feasibility = useMemo(() => {
    let score: 'perfect' | 'good' | 'special_care' | 'street_alternative' = 'perfect';
    const issues: string[] = [];
    const reassurances: string[] = [];
    let recommendedSize: ContainerSizeId = 'large_25m3';
    let recommendedReason = '';

    // Driveway Length & Location Check
    if (locationType === 'street_curbside') {
      score = 'street_alternative';
      recommendedSize = selectedContainerSize;
      reassurances.push('Standard street parking bay (2.4m width) accommodates all Portabox containers.');
      reassurances.push('Complimentary Hi-Vis reflective safety markers & hazard plates provided.');
    } else if (drivewayLength === '<5m') {
      if (selectedContainerSize === 'large_25m3') {
        score = 'special_care';
        recommendedSize = 'medium_19m3';
        recommendedReason = 'Your driveway length (< 5m) provides tight clearance for our 4.8m Large container. A 10 m³ Small (2.1m) or 19 m³ Medium (3.6m) fits comfortably without overhanging the footpath.';
        issues.push('Driveway under 5m has tight clearance for a 4.8m Large 25 m³ container; please confirm vehicle clearance.');
      } else if (selectedContainerSize === 'medium_19m3') {
        score = 'good';
        recommendedSize = 'medium_19m3';
        reassurances.push('19 m³ Medium (3.6m length) fits tight drives easily (4.0m–5m).');
      } else {
        score = 'perfect';
        recommendedSize = 'small_10m3';
        reassurances.push('10 m³ Small Portabox (2.1m length) fits easily on compact driveways & carports.');
      }
    } else if (drivewayLength === '5-7m') {
      recommendedSize = 'large_25m3';
      reassurances.push('Standard 5.0m–7m driveway comfortably accommodates our 4.8m Large 25 m³ container.');
    } else {
      recommendedSize = selectedContainerSize;
      reassurances.push('Generous driveway space (7m+) accommodates any container or multi-container delivery.');
    }

    // Overhead Tree Branches & Wires
    if (overheadClearance === 'low_tree_branches') {
      reassurances.push('Portabox Level-Lift system only needs 4.5m overhead clearance (unlike competitor tilt-trays needing 5.5m+). Tree-friendly canvas pads protect branches.');
      if (score === 'perfect') score = 'good';
    } else if (overheadClearance === 'overhead_wires') {
      reassurances.push('Hydraulic horizontal delivery operates completely under low-hanging service wires without tilting upwards.');
      if (score === 'perfect') score = 'good';
    } else {
      reassurances.push('Full 4.5m overhead height clearance verified.');
    }

    // Slope
    if (slope === 'steep') {
      issues.push('Steep slope (> 12°): Driver will use heavy-duty hydraulic leveling blocks and chocks, or position safely at base of driveway.');
      if (score === 'perfect') score = 'special_care';
    } else if (slope === 'moderate') {
      reassurances.push('Moderate slope (5–12°) is easily leveled using our multi-stage dunnage blocks.');
    }

    // Surface
    if (groundSurface === 'pavers' || groundSurface === 'exposed_aggregate') {
      reassurances.push('Complimentary high-density poly protective pads placed under container corners so decorative pavers or aggregate are 100% protected.');
    } else if (groundSurface === 'lawn') {
      reassurances.push('100mm heavy timber spreader boards supplied to distribute weight and protect turf.');
    }

    return {
      score,
      issues,
      reassurances,
      recommendedSize,
      recommendedReason,
    };
  }, [locationType, drivewayLength, drivewayWidth, slope, overheadClearance, groundSurface, selectedContainerSize]);

  if (!isOpen) return null;

  const handleApplyPreferences = () => {
    const prefs: PlacementPreferences = {
      locationType,
      drivewayLength,
      drivewayWidth,
      slope,
      overheadClearance,
      groundSurface,
      councilPermitUnderstood: true,
      notes,
    };

    if (onConfirmPlacement) {
      onConfirmPlacement(prefs);
    }

    if (feasibility.recommendedSize !== selectedContainerSize && onSelectRecommendedSize) {
      onSelectRecommendedSize(feasibility.recommendedSize);
    }

    setShowAppliedToast(true);
    setTimeout(() => {
      setShowAppliedToast(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border-2 border-[#DAD7D1] relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Bar */}
        <div className="bg-[#15385E] text-white px-5 sm:px-7 py-4.5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#5CC1EF] to-sky-300 text-[#15385E] shadow-sm">
              <Truck className="w-5 h-5 text-[#15385E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Driveway Placement &amp; Site Feasibility Checker
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#F7D347] text-[#1A1A1A] px-2 py-0.5 rounded">
                  100% FIT GUARANTEE
                </span>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Check narrow driveways, tree overhangs, council permits, and ground protection before booking.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-[#DAD7D1] px-5 sm:px-7 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'checker', label: '1. Driveway & Clearance Checker', icon: MapPin },
            { id: 'comparison', label: '2. Level-Lift vs Tilt-Tray', icon: Maximize2 },
            { id: 'council', label: '3. Council & Street Rules', icon: FileText },
            { id: 'groundcare', label: '4. Ground Care & Paver Pads', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#F7D347]' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* TAB 1: CHECKER */}
          {activeTab === 'checker' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form: Select Placement Parameters (7 Cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Placement Location Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#15385E]">
                    Where will the container be positioned?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'driveway', label: 'Private Driveway', icon: Home, desc: 'Concrete, asphalt, or paved' },
                      { id: 'carport', label: 'Carport / Garage Apron', icon: Car, desc: 'Covered single/double' },
                      { id: 'street_curbside', label: 'Street / Nature Strip', icon: MapPin, desc: 'Council curbside parking' },
                      { id: 'lawn_front_yard', label: 'Front Lawn / Grass', icon: Trees, desc: 'Flat yard with timber dunnage' },
                      { id: 'commercial', label: 'Commercial Job Site', icon: Truck, desc: 'Workplace or warehouse bay' },
                    ].map((loc) => {
                      const Icon = loc.icon;
                      const isSel = locationType === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => setLocationType(loc.id as any)}
                          className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSel
                              ? 'border-[#5CC1EF] bg-sky-50/70 text-[#15385E] ring-2 ring-[#5CC1EF]/30 font-bold'
                              : 'border-[#DAD7D1] hover:border-slate-300 text-slate-700 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className={`w-4 h-4 ${isSel ? 'text-[#15385E]' : 'text-slate-500'}`} />
                            <span className="text-xs font-black text-[#15385E] leading-tight">{loc.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 leading-tight">{loc.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Driveway Length */}
                {locationType !== 'street_curbside' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wider text-[#15385E]">
                        Available Length of Space
                      </label>
                      <span className="text-[11px] text-slate-500">Standard car = 4.8m length</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: '<5m', label: 'Under 5m', sub: 'Short drive / townhouse', fits: '10m³ Small' },
                        { id: '5-7m', label: '5.5m – 7m', sub: 'Standard residential', fits: '19m³ or 25m³' },
                        { id: '7-10m', label: '7m – 10m', sub: 'Long driveway', fits: 'All containers' },
                        { id: '10m+', label: '10m+ / Acreage', sub: 'Very spacious', fits: 'Multiple containers' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDrivewayLength(item.id as any)}
                          className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                            drivewayLength === item.id
                              ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/30 font-bold'
                              : 'border-[#DAD7D1] hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <div className="text-xs font-black text-[#15385E]">{item.label}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{item.sub}</div>
                          <div className="text-[9px] font-bold text-[#5CC1EF] mt-1">{item.fits}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Overhead Clearance & Tree Branches */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase tracking-wider text-[#15385E]">
                      Overhead Trees, Eaves &amp; Wires
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Only 4.5m overhead clearance needed
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'clear_over_3.5m',
                        label: 'Clear Sky (> 4.5m)',
                        desc: 'Open driveway, high roofline, no low branches',
                      },
                      {
                        id: 'low_tree_branches',
                        label: 'Tree Branches Present',
                        desc: 'Overhanging tree branches / foliage near access',
                      },
                      {
                        id: 'overhead_wires',
                        label: 'Power / Service Wires',
                        desc: 'Phone/electric wires running to house',
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setOverheadClearance(item.id as any)}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          overheadClearance === item.id
                            ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/30 font-bold'
                            : 'border-[#DAD7D1] hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-black text-[#15385E]">{item.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Driveway Slope & Ground Surface Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#15385E] mb-1.5">
                      Ground Surface Material
                    </label>
                    <select
                      value={groundSurface}
                      onChange={(e) => setGroundSurface(e.target.value as any)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 font-bold text-[#15385E] focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    >
                      <option value="concrete">Concrete Driveway (Free Ground Pads)</option>
                      <option value="exposed_aggregate">Exposed Aggregate (Free Soft-Touch Pads)</option>
                      <option value="pavers">Paved Brick / Tile (Zero-Scratch Dunnage)</option>
                      <option value="bitumen">Bitumen / Asphalt Driveway</option>
                      <option value="lawn">Grass / Lawn (Heavy Timber Dunnage)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#15385E] mb-1.5">
                      Driveway Slope / Incline
                    </label>
                    <select
                      value={slope}
                      onChange={(e) => setSlope(e.target.value as any)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 font-bold text-[#15385E] focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    >
                      <option value="flat">Flat / Level (0–5°)</option>
                      <option value="moderate">Moderate Incline (5–12°)</option>
                      <option value="steep">Steep Hill / Slope (&gt; 12°)</option>
                    </select>
                  </div>
                </div>

                {/* 5. Driver Access Notes */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#15385E] mb-1">
                    Specific Site Instructions for Driver (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Place on left side of driveway facing garage; gate code is 2841"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                  />
                </div>
              </div>

              {/* Right Assessment Verdict Card (5 Cols) */}
              <div className="lg:col-span-5 bg-gradient-to-b from-sky-50/70 to-slate-50 p-5 rounded-3xl border-2 border-[#DAD7D1] flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Verdict Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Feasibility Assessment
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        feasibility.score === 'perfect'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : feasibility.score === 'good'
                          ? 'bg-sky-100 text-[#15385E] border border-sky-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {feasibility.score === 'perfect'
                        ? '✓ 100% Confirmed Fit'
                        : feasibility.score === 'good'
                        ? '✓ Confirmed with Level-Lift'
                        : 'Actionable Solution Available'}
                    </span>
                  </div>

                  {/* Container Size Suitability Box */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Best Container for this Location
                    </div>
                    <div className="text-base font-black text-[#15385E]">
                      {feasibility.recommendedSize === 'small_10m3'
                        ? '10 m³ Small Portabox (2.1m length)'
                        : feasibility.recommendedSize === 'medium_19m3'
                        ? '19 m³ Medium Portabox (3.6m length)'
                        : '25 m³ Large Portabox (4.8m length)'}
                    </div>
                    {feasibility.recommendedReason && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed">
                        {feasibility.recommendedReason}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {feasibility.recommendedSize === 'small_10m3'
                        ? 'Fits comfortably within a single car parking space or compact driveway with zero overhang.'
                        : feasibility.recommendedSize === 'medium_19m3'
                        ? 'Excellent mid-size choice for townhouses and standard 5m driveways.'
                        : 'Australia’s largest single container. Fits standard 5.5m+ suburban driveways like an SUV.'}
                    </p>
                  </div>

                  {/* Reassurances list */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#15385E]">
                      Placement Guarantees:
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {feasibility.reassurances.map((reassurance, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{reassurance}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Issues if any */}
                  {feasibility.issues.length > 0 && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-black flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Driver Placement Notice:</span>
                      </div>
                      {feasibility.issues.map((issue, idx) => (
                        <p key={idx} className="text-[11px] text-amber-800">
                          {issue}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* 100% Fit Guarantee Box */}
                  <div className="p-3 rounded-2xl bg-[#15385E] text-white space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#F7D347]" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#F7D347]">
                        Portabox 100% Fit Guarantee
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-100 leading-relaxed">
                      If our driver arrives and deems placement unsafe or too tight, we swap to a smaller size or switch to depot storage with <strong>zero penalty or cancellation fee</strong>.
                    </p>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleApplyPreferences}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs border border-[#e6c338] transition-all cursor-pointer"
                  >
                    {showAppliedToast ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span className="text-emerald-800">Placement Verified &amp; Applied!</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Placement &amp; Apply to Quote</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEVEL-LIFT VS TILT-TRAY COMPARISON */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-[#5CC1EF] bg-sky-50 px-3 py-1 rounded-md border border-[#5CC1EF]/30">
                  THE PORTABOX ADVANTAGE
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-[#15385E]">
                  Why Portabox Fits Where Competitor Trucks Fail
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Traditional shipping container companies use tilt-tray tow trucks that hoist the container at high angles. Portabox uses specialized hydraulic horizontal level-lift technology.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Portabox Level-Lift Card */}
                <div className="p-6 rounded-3xl bg-sky-50/60 border-2 border-[#5CC1EF] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#15385E] bg-white px-3 py-1 rounded-full border border-[#5CC1EF]">
                      ✓ Portabox Level-Lift
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-600">4.5m Max Overhead Height</span>
                  </div>

                  <h5 className="text-lg font-black text-[#15385E]">
                    Horizontal Hydraulic Delivery (Zero Tilt)
                  </h5>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Clears tree overhangs:</strong> Needs only 4.5m overhead clearance (safely under tree branches &amp; wires, while competitor tilt-trays need 5.5m+).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Contents never slide:</strong> The container remains 100% flat from depot to driveway.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Precision spot placement:</strong> Position within 10cm of fences, garages, or carports.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Soft-touch ground pads:</strong> Protects concrete, pavers, and bitumen surfaces.</span>
                    </li>
                  </ul>
                </div>

                {/* Old Competitor Tilt-Tray Card */}
                <div className="p-6 rounded-3xl bg-slate-50 border-2 border-slate-300 space-y-4 opacity-90">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                      ✕ Competitor Tilt-Trays
                    </span>
                    <span className="text-xs font-mono font-black text-red-600">5.5m Clearance Needed</span>
                  </div>

                  <h5 className="text-lg font-black text-slate-800">
                    Angled Tip &amp; Drag System
                  </h5>

                  <ul className="space-y-2.5 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span><strong>Snags overhead branches:</strong> The truck bed tilts up to 5.5 meters, hitting branches and wires.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span><strong>Load shifts:</strong> Boxes and heavy furniture slide to the back during unloading.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span><strong>Driveway gouging:</strong> Steel rollers can scratch or crack decorative pavers.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span><strong>Requires huge run-up:</strong> Needs 20m of clear straight road to slide off.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Clearance Visual Diagram */}
              <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-700">
                <div className="flex items-center gap-3">
                  <Trees className="w-8 h-8 text-emerald-700 shrink-0" />
                  <div>
                    <h6 className="font-extrabold text-[#15385E]">Got mature gum trees or powerlines out front?</h6>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Because Portabox doesn't tilt, 98% of residential tree-lined streets in {suburbName} pass our clearance checks easily.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('checker')}
                  className="px-4 py-2 bg-[#15385E] text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer"
                >
                  Run Driveway Check
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: COUNCIL & STREET REGULATIONS */}
          {activeTab === 'council' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-[#5CC1EF] bg-sky-50 px-3 py-1 rounded-md border border-[#5CC1EF]/30">
                  AUSTRALIAN LOCAL GOVERNMENT GUIDELINES
                </span>
                <h4 className="text-xl font-black text-[#15385E]">
                  Can you place a Portabox on the street or nature strip in {stateCode}?
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  If your driveway is under renovation or too steep, street or nature strip placement is a proven solution. Here is how Portabox ensures 100% council compliance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="text-xs font-black text-[#15385E]">1. Private Driveways &amp; Yards</div>
                  <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                    ✓ NO PERMIT REQUIRED
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Any private property (driveways, carports, front lawns, behind gates) requires <strong>zero council permits</strong>. You can keep the container as long as you need.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="text-xs font-black text-[#15385E]">2. Road Curbside Parking</div>
                  <div className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded inline-block">
                    ✓ PERMITTED WITH REFLECTORS
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Most councils treat container parking like trailer or caravan parking. Portabox provides <strong>complimentary 3M reflective markers and night warning plates</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="text-xs font-black text-[#15385E]">3. Grass Nature Strip / Verge</div>
                  <div className="text-[11px] font-bold text-[#15385E] bg-slate-100 px-2 py-0.5 rounded inline-block">
                    ✓ VERIFIED ROAD SAFETY
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Permitted if clear of pedestrian footpaths (1.2m pedestrian walkway maintained). Heavy-duty timber dunnage provided to protect turf.
                  </p>
                </div>
              </div>

              {/* Council compliance safety pack */}
              <div className="p-5 rounded-2xl bg-[#15385E] text-white space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#F7D347]" />
                  <h5 className="font-extrabold text-sm text-white">
                    Included with Every Curbside Delivery: The Portabox Council Safety Pack
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs text-sky-100">
                  <div className="p-2.5 rounded-xl bg-white/10">✓ 4x 3M Hi-Vis Reflective Strips</div>
                  <div className="p-2.5 rounded-xl bg-white/10">✓ Amber Night Road Reflectors</div>
                  <div className="p-2.5 rounded-xl bg-white/10">✓ 24/7 Portabox Contact Plaque</div>
                  <div className="p-2.5 rounded-xl bg-white/10">✓ Poly Ground Protection Pads</div>
                </div>
              </div>

              {/* Depot alternative note */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Strict Council Clearway or No-Stopping Street?</strong>
                  <p className="mt-0.5 text-amber-800 text-[11px]">
                    No problem! Choose our <strong>Depot Loading Option</strong>: We keep your container at our secure Portabox metro depot, or our driver stays while you load in a quick 2-hour window.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GROUND CARE & PAVER PADS */}
          {activeTab === 'groundcare' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-[#5CC1EF] bg-sky-50 px-3 py-1 rounded-md border border-[#5CC1EF]/30">
                  DRIVEWAY PROTECTION GUARANTEE
                </span>
                <h4 className="text-xl font-black text-[#15385E]">
                  Zero Cracks, Zero Scratches, Zero Oil Leaks
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  We treat your driveway with as much care as your furniture. Our vehicles and delivery teams adhere to strict ground surface protection standards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border-2 border-[#DAD7D1] bg-white space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#15385E] flex items-center justify-center font-black">
                    1
                  </div>
                  <h6 className="font-extrabold text-xs text-[#15385E]">High-Density Poly Ground Pads</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Placed directly under each container corner casting. Engineered to withstand 15 tonnes without transferring pressure points to decorative pavers or stamped concrete.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border-2 border-[#DAD7D1] bg-white space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black">
                    2
                  </div>
                  <h6 className="font-extrabold text-xs text-[#15385E]">100mm Timber Dunnage</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    For grass lawns, gravel, or asphalt in high summer heat. Distributes weight over a wide surface area and allows rainwater drainage underneath.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border-2 border-[#DAD7D1] bg-white space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black">
                    3
                  </div>
                  <h6 className="font-extrabold text-xs text-[#15385E]">Pneumatic Rubber Tyre Placement</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Our level-lift vehicles ride on soft pneumatic commercial tyres with low ground-bearing pressure. No steel tracks or abrasive steel rollers.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">
                    100% Driveway Protection Guarantee is included automatically with every delivery.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('checker')}
                  className="px-4 py-2 bg-[#15385E] text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer"
                >
                  Check My Driveway
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-[#DAD7D1] px-5 sm:px-7 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero-Risk Guarantee: Free size swap if space is too tight on delivery</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
