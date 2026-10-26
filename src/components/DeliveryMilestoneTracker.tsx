import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  AlertCircle,
  Camera,
  Layers,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Navigation,
} from 'lucide-react';

export type DeliveryMilestoneId =
  | 'staged_depot'
  | 'loaded_truck'
  | 'en_route'
  | 'placed_pads'
  | 'handover_complete';

export interface DeliveryMilestoneTrackerProps {
  orderNumber?: string;
  containerId?: string;
  driverName?: string;
  driverPhone?: string;
  scheduledDate?: string;
  deliveryWindow?: string;
  destinationAddress?: string;
  initialMilestone?: DeliveryMilestoneId;
  phone?: string;
}

export const DeliveryMilestoneTracker: React.FC<DeliveryMilestoneTrackerProps> = ({
  orderNumber = 'PBO-9841',
  containerId = 'PB-25M3-049',
  driverName = 'Dave Miller',
  driverPhone = '0488 883 234',
  scheduledDate = 'Wed 14 Oct 2026',
  deliveryWindow = '9:00 AM – 11:30 AM (Morning Window)',
  destinationAddress = '42 High Street, Norwood SA 5067',
  initialMilestone = 'en_route',
  phone = '1800 467 637',
}) => {
  const [currentMilestone, setCurrentMilestone] = useState<DeliveryMilestoneId>(initialMilestone);
  const [showDemoControls, setShowDemoControls] = useState<boolean>(false);
  const [headsUpCallRequested, setHeadsUpCallRequested] = useState<boolean>(false);

  const milestones: {
    id: DeliveryMilestoneId;
    stepNumber: number;
    title: string;
    subtext: string;
    timestamp: string;
    details: string;
    qcBadge: string;
  }[] = [
    {
      id: 'staged_depot',
      stepNumber: 1,
      title: 'Staged & Sanitized at Metro Depot',
      subtext: 'Passed 14-point weatherproof & hygiene inspection',
      timestamp: '6:45 AM',
      details: 'Container cleaned, weatherproof seals verified, twin high-security lockbox shrouds lubricated and poly ground pads loaded.',
      qcBadge: 'QC Passed',
    },
    {
      id: 'loaded_truck',
      stepNumber: 2,
      title: 'Loaded onto Level-Lift Truck',
      subtext: `Driver ${driverName} assigned (Vehicle #TRK-102)`,
      timestamp: '7:30 AM',
      details: 'Container hoisted completely flat via hydraulic level-lift rig. Zero tilt guarantee active.',
      qcBadge: 'Zero Tilt Verified',
    },
    {
      id: 'en_route',
      stepNumber: 3,
      title: 'Out for Delivery (En Route)',
      subtext: 'Approaching delivery zone · ETA 28 mins',
      timestamp: '8:45 AM',
      details: `Driver will call 30 minutes prior to arrival to confirm driveway clearance and placement orientation.`,
      qcBadge: 'Live GPS Active',
    },
    {
      id: 'placed_pads',
      stepNumber: 4,
      title: 'Precision Ground Pad Placement',
      subtext: 'Poly pads laid down; container lowered horizontally',
      timestamp: 'Pending Arrival',
      details: 'High-density polyethylene pads placed under all 4 corners to 100% protect driveway concrete and pavers.',
      qcBadge: 'Paver Protection',
    },
    {
      id: 'handover_complete',
      stepNumber: 5,
      title: 'Digital Handover & Keys Delivered',
      subtext: 'Placement photo recorded · Ready for unhurried packing',
      timestamp: 'Pending Delivery',
      details: 'Container secured in place. Pack at your own pace with complimentary furniture blankets.',
      qcBadge: 'Ready to Pack',
    },
  ];

  const milestoneOrder: DeliveryMilestoneId[] = [
    'staged_depot',
    'loaded_truck',
    'en_route',
    'placed_pads',
    'handover_complete',
  ];

  const currentIndex = milestoneOrder.indexOf(currentMilestone);

  const handleAdvanceMilestone = () => {
    const nextIdx = (currentIndex + 1) % milestoneOrder.length;
    setCurrentMilestone(milestoneOrder[nextIdx]);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#DAD7D1] shadow-xs space-y-5 print:hidden">
      {/* Tracker Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#15385E] font-['Cabinet_Grotesk',sans-serif]">
              Live Delivery Day Dispatch Tracker
            </span>
            <span className="text-[10px] font-mono bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded">
              Order #{orderNumber}
            </span>
          </div>
          <h3 className="text-lg font-black text-[#15385E] mt-0.5">
            Live Level-Lift Delivery Status
          </h3>
          <p className="text-xs text-slate-500">
            Container <strong>{containerId}</strong> heading to <strong>{destinationAddress}</strong>
          </p>
        </div>

        {/* Driver Quick Badge */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 px-3.5 rounded-2xl border border-slate-200 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#15385E] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
            {driverName.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-xs">
            <div className="font-extrabold text-[#15385E] flex items-center gap-1.5">
              <span>{driverName}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-black">
                4.98 ★
              </span>
            </div>
            <div className="text-[11px] text-slate-500">Certified Level-Lift Specialist</div>
          </div>
          <a
            href={`tel:${driverPhone.replace(/\s+/g, '')}`}
            className="p-2 rounded-xl bg-white border border-slate-200 text-[#15385E] hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer ml-1"
            title={`Call Driver (${driverPhone})`}
          >
            <Phone className="w-4 h-4 text-[#5CC1EF]" />
          </a>
        </div>
      </div>

      {/* Target Delivery Window Notice */}
      <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-[#5CC1EF]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#15385E]">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#00a9d7] shrink-0" />
          <div>
            <span className="font-extrabold text-[#15385E]">Scheduled Arrival Window: </span>
            <span className="font-semibold">{scheduledDate} · {deliveryWindow}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {headsUpCallRequested ? (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>30-Min Call Confirmed</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setHeadsUpCallRequested(true)}
              className="px-3 py-1 bg-white hover:bg-sky-100 text-[#15385E] border border-sky-300 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shadow-2xs"
            >
              Request 30-Min Heads-Up Call
            </button>
          )}
        </div>
      </div>

      {/* 5-Step Visual Milestone Bar */}
      <div className="relative pt-2">
        {/* Progress Bar Line */}
        <div className="hidden sm:block absolute top-7 left-8 right-8 h-1 bg-slate-200 -z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(currentIndex / (milestones.length - 1)) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
          {milestones.map((m, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isUpcoming = idx > currentIndex;

            return (
              <div
                key={m.id}
                onClick={() => setCurrentMilestone(m.id)}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                  isCurrent
                    ? 'border-[#15385E] bg-[#15385E] text-white shadow-md'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950'
                    : 'border-slate-200 bg-slate-50 text-slate-500 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      isCurrent
                        ? 'bg-[#F7D347] text-[#1A1A1A]'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓' : m.stepNumber}
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? 'bg-white/20 text-[#5CC1EF]'
                        : isCompleted
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {m.qcBadge}
                  </span>
                </div>

                <div
                  className={`text-xs font-black line-clamp-2 ${
                    isCurrent ? 'text-white' : isCompleted ? 'text-emerald-950' : 'text-slate-700'
                  }`}
                >
                  {m.title}
                </div>

                <div
                  className={`text-[10px] mt-1 line-clamp-2 ${
                    isCurrent ? 'text-slate-200' : isCompleted ? 'text-emerald-800' : 'text-slate-500'
                  }`}
                >
                  {m.subtext}
                </div>

                <div className="mt-2 pt-1 border-t border-slate-200/40 text-[9px] font-mono font-bold flex items-center justify-between">
                  <span>{m.timestamp}</span>
                  {isCurrent && <span className="text-[#F7D347] font-black">● LIVE</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Milestone Deep Dive Card */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-black text-[#15385E] uppercase tracking-wider text-[11px]">
              Active Operational Status:
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">
            {milestones[currentIndex].details}
          </p>
        </div>

        {/* Demo Advance Control for testing CRM flows */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleAdvanceMilestone}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#15385E] font-black rounded-xl border border-slate-300 text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5CC1EF]" />
            <span>Simulate Next Milestone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
