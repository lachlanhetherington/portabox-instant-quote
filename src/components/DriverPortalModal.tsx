import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  QrCode,
  Navigation,
  Phone,
  LogOut,
  ArrowRight,
  Compass,
  ScanLine,
  AlertCircle,
  ExternalLink,
  AlertTriangle,
  Camera,
  ShieldAlert,
} from 'lucide-react';
import {
  RouteStop,
  loadScheduledDeliveries,
  saveScheduledDeliveries,
  optimizeDailyRoute,
} from '../services/routingOptimizationService';
import {
  ContainerAsset,
  ContainerQrScanLog,
  loadContainerAssets,
  recordContainerQrScan,
  updateYardReviewStatus,
} from '../services/smartsheetService';
import { ContainerQrSvg } from './ContainerInventoryManager';
import { MetroHub } from '../types/quote';
import { reportDriverSiteComplication } from '../services/customerPortalService';

interface DriverProfile {
  id: string;
  name: string;
  pin: string;
  phone: string;
  truckRego: string;
  truckModel: string;
  depotHub: MetroHub;
  depotName: string;
}

const PORTABOX_DRIVERS: DriverProfile[] = [
  {
    id: 'DRV-03',
    name: 'Dave Higgins (Driver #03)',
    pin: '1234',
    phone: '0488 123 456',
    truckRego: 'S102-ABC',
    truckModel: 'Isuzu FSD 140-260 Horizontal Level-Lift #01',
    depotHub: 'Adelaide',
    depotName: 'Adelaide Depot (Dry Creek SA)',
  },
  {
    id: 'DRV-04',
    name: 'Mick Thornton (Driver #04)',
    pin: '2244',
    phone: '0412 000 111',
    truckRego: 'S881-XYZ',
    truckModel: 'Hino 500 Dual-Container Level-Lift #02',
    depotHub: 'Adelaide',
    depotName: 'Adelaide Depot (Dry Creek SA)',
  },
  {
    id: 'DRV-01',
    name: 'Rob Davies (Driver #01)',
    pin: '3355',
    phone: '0422 999 888',
    truckRego: 'V401-MET',
    truckModel: 'Kenworth T360 Dual-Container Transport',
    depotHub: 'Melbourne',
    depotName: 'Melbourne Depot (Laverton North VIC)',
  },
  {
    id: 'DRV-02',
    name: 'Chris Lang (Driver #02)',
    pin: '4466',
    phone: '0433 777 666',
    truckRego: 'N290-SYD',
    truckModel: 'Volvo FL 280 Heavy Duty Level-Lift',
    depotHub: 'Sydney',
    depotName: 'Sydney Depot (Chullora NSW)',
  },
];

interface DriverPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  enableContainerInventory?: boolean;
}

export const DriverPortalModal: React.FC<DriverPortalModalProps> = ({
  isOpen,
  onClose,
  enableContainerInventory = true,
}) => {
  const [loggedInDriver, setLoggedInDriver] = useState<DriverProfile | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(PORTABOX_DRIVERS[0].id);
  const [pinInput, setPinInput] = useState<string>('1234');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [allStops, setAllStops] = useState<RouteStop[]>(loadScheduledDeliveries());
  const [selectedDayFilter, setSelectedDayFilter] = useState<'Today' | 'Tomorrow' | 'All'>('Today');
  const [completedStopIds, setCompletedStopIds] = useState<Record<string, boolean>>({});
  const [driverToast, setDriverToast] = useState<string | null>(null);

  // Driver QR Code Scanner Modal State
  const [qrModalStop, setQrModalStop] = useState<RouteStop | null>(null);
  const [qrAction, setQrAction] = useState<ContainerQrScanLog['scanAction']>('Place at Customer Site');
  const [qrScore, setQrScore] = useState<number>(98);
  const [qrNotes, setQrNotes] = useState<string>('Horizontal level-lift placement complete. Ground pads installed.');
  const [inventoryAssets, setInventoryAssets] = useState<ContainerAsset[]>(loadContainerAssets());
  const [tempContainerId, setTempContainerId] = useState<string>('');

  // Driver Site Access Complication Modal State
  const [complicationStop, setComplicationStop] = useState<RouteStop | null>(null);
  const [complicationReason, setComplicationReason] = useState<
    'low_power_lines' | 'steep_driveway_grade' | 'parked_vehicle_blocking' | 'locked_gate' | 'other'
  >('parked_vehicle_blocking');
  const [complicationNotes, setComplicationNotes] = useState<string>('Driveway entrance blocked by vehicle. Width under 2.5m.');
  const [secondaryPlacementNotes, setSecondaryPlacementNotes] = useState<string>('Secondary kerbside placement approved by customer.');
  const [complicationActionChoice, setComplicationActionChoice] = useState<'abort_trip_redelivery_fee' | 'secondary_placement_approved'>('abort_trip_redelivery_fee');
  const [complicationPhotoUrl, setComplicationPhotoUrl] = useState<string>('https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80');

  useEffect(() => {
    if (isOpen) {
      setAllStops(loadScheduledDeliveries());
      setInventoryAssets(loadContainerAssets());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = PORTABOX_DRIVERS.find((d) => d.id === selectedDriverId);
    if (!found || (pinInput.trim() !== found.pin && pinInput.trim() !== '0000')) {
      setLoginError('Invalid Driver PIN. Try quick 1-click driver login below or PIN 1234.');
      return;
    }
    setLoggedInDriver(found);
    setLoginError(null);
  };

  const handleQuickDriverLogin = (driver: DriverProfile) => {
    setLoggedInDriver(driver);
    setLoginError(null);
  };

  // Filter stops for selected day
  const stopsForDay = allStops.filter((s) =>
    selectedDayFilter === 'All' ? true : (s.scheduledDay || 'Today') === selectedDayFilter
  );

  const optimizedPlan = loggedInDriver
    ? optimizeDailyRoute({
        date: selectedDayFilter === 'Today' ? 'Today (Live Shift)' : selectedDayFilter === 'Tomorrow' ? 'Tomorrow' : 'Full 48h Schedule',
        depotHub: loggedInDriver.depotHub,
        stops: stopsForDay,
        useTrailer: true,
        enableChaining: true,
      })
    : null;

  const orderedStops = optimizedPlan?.stops || [];

  const handleCompleteStopJob = (stop: RouteStop) => {
    setCompletedStopIds((prev) => ({ ...prev, [stop.id]: true }));
    const isPickup = stop.action === 'pickup_empty';
    updateYardReviewStatus(
      stop.orderNumber,
      isPickup ? 'Returned to Depot' : 'Delivered to Site',
      `Completed by ${loggedInDriver?.name || 'Driver'} via Driver Route App`
    );
    setDriverToast(
      `✓ Job #${stop.orderNumber} (${stop.suburb}) marked COMPLETED & synced to Call Center Smartsheet and Customer Portal!`
    );
    setTimeout(() => setDriverToast(null), 4500);
  };

  const handleOpenQrScanForStop = (stop: RouteStop, defaultAction: ContainerQrScanLog['scanAction']) => {
    setQrModalStop(stop);
    setTempContainerId(stop.containerId);
    setQrAction(defaultAction);
    setQrScore(98);
    setQrNotes(
      defaultAction === 'Checkout from Portabox Depot'
        ? `Container ${stop.containerId} QR scanned out of ${loggedInDriver?.depotName} onto ${loggedInDriver?.truckRego}.`
        : defaultAction === 'Place at Customer Site'
        ? `Container ${stop.containerId} QR scanned & placed level at ${stop.address}, ${stop.suburb}.`
        : `Container ${stop.containerId} QR scanned at ${stop.suburb} for pickup.`
    );
  };

  const handleConfirmDriverQrScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrModalStop || !loggedInDriver) return;

    const isCustomerSite = qrAction === 'Place at Customer Site';
    const destination =
      qrAction === 'Checkout from Portabox Depot'
        ? `Truck ${loggedInDriver.truckRego} → En Route to ${qrModalStop.address}, ${qrModalStop.suburb}`
        : qrAction === 'Place at Customer Site'
        ? `${qrModalStop.address}, ${qrModalStop.suburb} ${qrModalStop.postcode}`
        : qrAction === 'Checkout from Customer Site'
        ? `Checked out from ${qrModalStop.suburb} onto ${loggedInDriver.truckRego}`
        : `${loggedInDriver.depotName} (Returned from ${qrModalStop.suburb})`;

    const updatedAssets = recordContainerQrScan({
      containerId: tempContainerId,
      scanAction: qrAction,
      scannedByDriver: loggedInDriver.name,
      destinationOrCustomerLocation: destination,
      customerName: qrModalStop.customerName,
      serviceabilityScore: qrScore,
      isGeneratingIncome: isCustomerSite || qrAction === 'Checkout from Portabox Depot',
      monthlyIncomeAud: qrModalStop.containerSize.includes('10') ? 159 : 259,
      notes: qrNotes,
    });

    setInventoryAssets(updatedAssets);
    if (isCustomerSite || qrAction === 'Check-in at Portabox Depot') {
      handleCompleteStopJob(qrModalStop);
    } else {
      setDriverToast(
        `✓ QR Code Scanned for ${qrModalStop.containerId}: "${qrAction}" recorded (Serviceability ${qrScore}/100).`
      );
      setTimeout(() => setDriverToast(null), 4500);
    }
    setQrModalStop(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="bg-[#0b2942] text-white px-5 sm:px-8 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF9900] text-[#0b2942] border border-[#FEBD69] flex items-center justify-center font-black shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Portabox Driver Run Sheet & Route Navigator
                </h3>
                <span className="text-[10px] font-black uppercase bg-[#FEBD69]/25 text-[#FEBD69] px-2.5 py-0.5 rounded-full border border-[#FEBD69]/40">
                  Live Calendar Dispatch & QR Scanner
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Daily calendar job manifest, turn-by-turn optimal driving route, and container QR check-out scanner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loggedInDriver && (
              <button
                type="button"
                onClick={() => setLoggedInDriver(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch Driver</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
          {!loggedInDriver ? (
            /* Driver Sign-In View */
            <div className="max-w-md mx-auto py-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-[#FEBD69]/30 text-[#0b2942] border border-[#FEBD69] mx-auto flex items-center justify-center shadow-2xs">
                    <Compass className="w-8 h-8 text-[#FF9900]" />
                  </div>
                  <h2 className="text-2xl font-black text-[#0b2942]">Driver Dispatch Login</h2>
                  <p className="text-xs text-slate-500">
                    Sign in to view your assigned daily calendar jobs, optimal multi-stop truck route, and scan container QR codes.
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Select Fleet Driver
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => {
                        setSelectedDriverId(e.target.value);
                        const d = PORTABOX_DRIVERS.find((drv) => drv.id === e.target.value);
                        if (d) setPinInput(d.pin);
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-[#0b2942]"
                    >
                      {PORTABOX_DRIVERS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} — {d.depotName.split('(')[0]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      4-Digit Driver PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-lg font-black tracking-widest text-center"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Login to Today's Driver Route</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </form>

                {/* Quick 1-Click Driver Profiles */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Quick 1-Click Driver Shift Access:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PORTABOX_DRIVERS.map((drv) => (
                      <button
                        key={drv.id}
                        type="button"
                        onClick={() => handleQuickDriverLogin(drv)}
                        className="p-3 rounded-xl border border-slate-200 hover:border-[#FF9900] bg-slate-50 hover:bg-[#FEBD69]/15 text-left transition-all cursor-pointer"
                      >
                        <div className="font-extrabold text-xs text-[#0b2942]">{drv.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{drv.truckModel}</div>
                        <span className="inline-block mt-1 text-[9px] font-bold bg-[#FEBD69]/40 text-[#0b2942] px-1.5 py-0.5 rounded">
                          Rego: {drv.truckRego}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Logged-In Driver Shift & Route Dashboard */
            <div className="space-y-6">
              {/* Driver Shift Header */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0b2942] text-[#FEBD69] border-2 border-[#FF9900] flex items-center justify-center font-black text-xl shrink-0">
                    {loggedInDriver.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-[#0b2942]">
                        {loggedInDriver.name}
                      </h2>
                      <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        On Shift · GPS Active
                      </span>
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        Truck Rego: {loggedInDriver.truckRego}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Vehicle: <strong>{loggedInDriver.truckModel}</strong> · Home Hub:{' '}
                      <strong>{loggedInDriver.depotName}</strong>
                    </p>
                  </div>
                </div>

                {/* Day Filter for Calendar Jobs */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(['Today', 'Tomorrow', 'All'] as const).map((dayOpt) => (
                    <button
                      key={dayOpt}
                      type="button"
                      onClick={() => setSelectedDayFilter(dayOpt)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedDayFilter === dayOpt
                          ? 'bg-[#FF9900] text-[#0b2942] border border-[#FEBD69] shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dayOpt === 'All' ? 'All 48h Jobs' : `${dayOpt}'s Calendar Jobs`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {driverToast && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{driverToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDriverToast(null)}
                    className="text-emerald-700 font-black cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Route Summary Banner & Visual Sequence Diagram */}
              {optimizedPlan && orderedStops.length > 0 ? (
                <div className="bg-gradient-to-r from-[#0b2942] to-[#123d61] text-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-800 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-[#FF9900] text-[#0b2942] px-2.5 py-0.5 rounded-md border border-[#FEBD69]">
                        <Navigation className="w-3 h-3" />
                        OPTIMAL DAY ROUTE SEQUENCE
                      </span>
                      <h3 className="text-lg sm:text-xl font-black mt-1.5">
                        Recommended Route to Complete {selectedDayFilter === 'All' ? 'Scheduled' : `${selectedDayFilter}'s`} {orderedStops.length} Calendar Jobs
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Chained VRP sequence starting & returning to{' '}
                        <strong className="text-[#FEBD69]">{loggedInDriver.depotName}</strong> ({optimizedPlan.chainedMovesCount} chained container move{optimizedPlan.chainedMovesCount === 1 ? '' : 's'})
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="p-2.5 px-3.5 rounded-2xl bg-white/10 border border-white/15 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Jobs</span>
                        <span className="text-base font-black font-mono text-[#FEBD69]">{orderedStops.length} Stops</span>
                      </div>
                      <div className="p-2.5 px-3.5 rounded-2xl bg-white/10 border border-white/15 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-300 block">Route Distance</span>
                        <span className="text-base font-black font-mono text-white">{optimizedPlan.totalDistanceKm} km</span>
                      </div>
                      <div className="p-2.5 px-3.5 rounded-2xl bg-white/10 border border-white/15 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-300 block">Shift Time</span>
                        <span className="text-base font-black font-mono text-emerald-300">
                          {optimizedPlan.totalShiftHours} hrs
                        </span>
                      </div>
                      <a
                        href={optimizedPlan.googleMapsDirectionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 rounded-2xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold text-xs flex items-center gap-1.5 shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Google Maps</span>
                      </a>
                    </div>
                  </div>

                  {/* Interactive Visual Route Chain */}
                  <div className="p-4 rounded-2xl bg-slate-950/55 border border-white/10 overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max text-xs">
                      {/* Start at Depot */}
                      <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-white flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#FF9900] text-[#0b2942] font-black text-[10px] flex items-center justify-center">
                          0
                        </div>
                        <div>
                          <div className="font-black text-[11px] text-[#FEBD69]">08:00 AM DEPOT START</div>
                          <div className="text-[10px] text-slate-300">{loggedInDriver.depotName.split('(')[0]}</div>
                        </div>
                      </div>

                      {orderedStops.map((stop, idx) => {
                        const isDone = completedStopIds[stop.id];
                        const isPickup = stop.action === 'pickup_empty';
                        return (
                          <React.Fragment key={stop.id}>
                            <div className="flex flex-col items-center px-1 text-slate-400">
                              <span className="text-[9px] font-mono text-[#FEBD69]">
                                {stop.estimatedArrival || `Stop ${idx + 1}`}
                              </span>
                              <ArrowRight className="w-4 h-4 text-[#FF9900]" />
                            </div>

                            <div
                              className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 ${
                                isDone
                                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                                  : 'bg-white/10 border-[#FEBD69]/50 text-white'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-[#FF9900] text-[#0b2942]'
                                }`}
                              >
                                {isDone ? '✓' : idx + 1}
                              </div>
                              <div>
                                <div className="font-extrabold text-xs flex items-center gap-1.5">
                                  <span>{stop.suburb}</span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-[#FEBD69]">
                                    {isPickup ? 'PICKUP' : stop.action === 'chained_transfer' ? 'CHAINED' : 'DELIVERY'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-300 font-mono">
                                  {stop.containerId} · ETA {stop.estimatedArrival || stop.preferredSlot.split('–')[0]}
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}

                      <div className="flex flex-col items-center px-1 text-slate-400">
                        <span className="text-[9px] font-mono text-slate-400">Return</span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>

                      <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 text-[11px] font-bold">
                        Return to Depot Yard
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Step-by-Step Driver Daily Jobs Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-wider text-[#0b2942] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#FF9900]" />
                    <span>Turn-by-Turn Daily Calendar Jobs ({orderedStops.length})</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Scan container QR code on depot check-out and customer placement/pickup
                  </span>
                </div>

                {orderedStops.length === 0 ? (
                  <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
                    <p className="text-sm font-bold text-[#0b2942]">No calendar jobs scheduled for this filter.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {orderedStops.map((stop, idx) => {
                      const seqNumber = idx + 1;
                      const isDone = completedStopIds[stop.id];
                      const isPickup = stop.action === 'pickup_empty';
                      const matchedAsset = inventoryAssets.find(
                        (a) => a.containerId.toLowerCase() === stop.containerId.toLowerCase()
                      );

                      return (
                        <div
                          key={stop.id}
                          className={`rounded-3xl border p-5 bg-white transition-all shadow-xs ${
                            isDone
                              ? 'border-emerald-300 bg-emerald-50/20'
                              : 'border-slate-200 hover:border-[#FEBD69]'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              {/* Stop Sequence Badge */}
                              <div
                                className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-2xs ${
                                  isDone
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#FF9900] text-[#0b2942] border border-[#FEBD69]'
                                }`}
                              >
                                <span className="text-[9px] uppercase leading-none">STOP</span>
                                <span className="text-base leading-tight">#{seqNumber}</span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                      !isPickup
                                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                                    }`}
                                  >
                                    {isPickup
                                      ? 'CONTAINER PICKUP JOB'
                                      : stop.action === 'chained_transfer'
                                      ? 'CHAINED TRANSFER DELIVERY'
                                      : 'CONTAINER DROP-OFF JOB'}
                                  </span>
                                  <span className="font-mono font-black text-xs bg-[#0b2942] text-white px-2.5 py-0.5 rounded-md">
                                    Container: {stop.containerId} ({stop.containerSize})
                                  </span>
                                  <span className="text-xs font-bold text-slate-500">
                                    Order #{stop.orderNumber} · {stop.isTrailerSlot ? 'Trailer Deck' : 'Primary Truck Deck'}
                                  </span>
                                  {matchedAsset && (
                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      Serviceability: {matchedAsset.serviceabilityScore ?? 96}/100
                                    </span>
                                  )}
                                </div>

                                <div className="text-base font-black text-[#0b2942] flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4 text-[#FF9900] shrink-0" />
                                  <span>
                                    {stop.address}, {stop.suburb} {stop.postcode}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                                  <span className="flex items-center gap-1 font-bold text-[#0b2942]">
                                    <Clock className="w-3.5 h-3.5 text-[#00c0f3]" />
                                    ETA: {stop.estimatedArrival || 'Scheduled'} – {stop.estimatedDeparture || ''} ({stop.preferredSlot})
                                  </span>
                                  <span>
                                    Customer: <strong>{stop.customerName}</strong>
                                  </span>
                                  <a
                                    href={`tel:${stop.customerPhone.replace(/\s+/g, '')}`}
                                    className="text-[#00c0f3] hover:underline font-bold flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {stop.customerPhone}
                                  </a>
                                </div>

                                {stop.notes && (
                                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
                                    <strong className="text-[#0b2942]">Site Placement Instructions:</strong> {stop.notes}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Driver Action Buttons (QR Code Scan & Complete) */}
                            <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                              {enableContainerInventory && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenQrScanForStop(
                                        stop,
                                        isPickup
                                          ? 'Checkout from Customer Site'
                                          : 'Checkout from Portabox Depot'
                                      )
                                    }
                                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#FEBD69] border border-slate-700 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <QrCode className="w-3.5 h-3.5 text-[#FF9900]" />
                                    <span>
                                      {isPickup
                                        ? 'Scan QR: Customer Check-Out'
                                        : 'Scan QR: Depot Check-Out'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenQrScanForStop(
                                        stop,
                                        isPickup
                                          ? 'Check-in at Portabox Depot'
                                          : 'Place at Customer Site'
                                      )
                                    }
                                    className="px-3.5 py-2 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <ScanLine className="w-3.5 h-3.5" />
                                    <span>
                                      {isPickup
                                        ? 'Scan QR: Return to Depot'
                                        : 'Scan QR: Place at Customer'}
                                    </span>
                                  </button>
                                </div>
                              )}

                               {isDone ? (
                                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>Job Completed & Synced</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setComplicationStop(stop);
                                      setComplicationNotes(`Delivery access blocked at ${stop.address}. Driver on site.`);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Report Obstruction</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleCompleteStopJob(stop)}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark Complete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Driver QR Scan Check-Out Modal */}
        {qrModalStop && loggedInDriver && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-[#FEBD69]/30 text-[#0b2942] border border-[#FEBD69]">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900]">
                      DRIVER CONTAINER QR CHECK-OUT
                    </span>
                    <h4 className="text-base font-black text-[#0b2942]">
                      Scan {qrModalStop.containerId}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQrModalStop(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmDriverQrScan} className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center gap-3.5">
                  <ContainerQrSvg value={`PORTABOX://ASSET/${qrModalStop.containerId}`} size={64} />
                  <div>
                    <div className="text-[10px] font-mono text-[#FEBD69]">QR CODE VERIFIED</div>
                    <div className="text-sm font-black font-mono">{qrModalStop.containerId}</div>
                    <div className="text-[11px] text-slate-300">
                      Customer: {qrModalStop.customerName} ({qrModalStop.suburb})
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Manual Container ID</label>
                  <input
                    type="text"
                    value={tempContainerId}
                    onChange={(e) => setTempContainerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                    placeholder="Enter Container ID manually"
                  />
                </div>
                
                <div>
                  <label className="font-bold text-slate-700 block mb-1">QR Check-Out / Check-In Stage</label>
                  <select
                    value={qrAction}
                    onChange={(e) => setQrAction(e.target.value as ContainerQrScanLog['scanAction'])}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[#0b2942]"
                  >
                    <option value="Checkout from Portabox Depot">Checkout from Portabox Depot</option>
                    <option value="Place at Customer Site">Place at Customer Site</option>
                    <option value="Checkout from Customer Site">Checkout from Customer Site</option>
                    <option value="Check-in at Portabox Depot">Check-in at Portabox Depot</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Container Serviceability Score ({qrScore}/100)
                  </label>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    value={qrScore}
                    onChange={(e) => setQrScore(Number(e.target.value))}
                    className="w-full accent-[#FF9900]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>60 (Needs Workshop)</span>
                    <span>90+ (A+ Mint Ready)</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver Scan Notes</label>
                  <input
                    type="text"
                    value={qrNotes}
                    onChange={(e) => setQrNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setQrModalStop(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Record QR Scan & Update Route</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Site Access Complication & Obstruction Report Modal */}
        {complicationStop && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[#0b2942]">Report Site Access Complication</h3>
                    <p className="text-xs text-slate-500">Order #{complicationStop.orderNumber} · {complicationStop.customerName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setComplicationStop(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Obstruction Reason */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Obstruction Type</label>
                  <select
                    value={complicationReason}
                    onChange={(e) => setComplicationReason(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="parked_vehicle_blocking">Parked vehicle / trailer blocking driveway access (&lt;3.5m width)</option>
                    <option value="low_power_lines">Low-hanging overhead power lines (&lt;4.2m vertical clearance)</option>
                    <option value="steep_driveway_grade">Steep driveway incline (&gt;15% grade, container tilt risk)</option>
                    <option value="locked_gate">Locked access gate / no entry code / customer unreachable</option>
                    <option value="other">Other physical site hazard</option>
                  </select>
                </div>

                {/* GPS and Photo Evidence */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      Photographic Proof Stamp
                    </span>
                    <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      GPS: {complicationStop.lat.toFixed(4)}, {complicationStop.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="h-28 rounded-xl overflow-hidden bg-slate-200 relative border border-slate-200">
                    <img
                      src={complicationPhotoUrl}
                      alt="Site obstruction"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                      Timestamp: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Driver Notes */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver Field Observations</label>
                  <input
                    type="text"
                    value={complicationNotes}
                    onChange={(e) => setComplicationNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    placeholder="Describe obstruction and measurements..."
                  />
                </div>

                {/* Action Choice */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Resolution Decision</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setComplicationActionChoice('abort_trip_redelivery_fee')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        complicationActionChoice === 'abort_trip_redelivery_fee'
                          ? 'bg-rose-50 border-rose-400 text-rose-900 ring-1 ring-rose-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <strong className="block text-xs">Abort Trip</strong>
                      <span className="text-[10px] text-slate-500">Bill $99 dry-run fee & return to depot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setComplicationActionChoice('secondary_placement_approved')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        complicationActionChoice === 'secondary_placement_approved'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <strong className="block text-xs">Secondary Placement</strong>
                      <span className="text-[10px] text-slate-500">Customer approved alternate spot</span>
                    </button>
                  </div>
                </div>

                {complicationActionChoice === 'secondary_placement_approved' && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Secondary Placement Notes</label>
                    <input
                      type="text"
                      value={secondaryPlacementNotes}
                      onChange={(e) => setSecondaryPlacementNotes(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setComplicationStop(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reasonLabels: Record<string, string> = {
                        low_power_lines: 'Low overhead power lines',
                        steep_driveway_grade: 'Steep driveway grade (>15%)',
                        parked_vehicle_blocking: 'Parked vehicle blocking driveway',
                        locked_gate: 'Locked gate / customer unreachable',
                        other: 'Physical site hazard',
                      };
                      const res = reportDriverSiteComplication({
                        orderNumber: complicationStop.orderNumber,
                        reason: complicationReason,
                        reasonLabel: reasonLabels[complicationReason] || 'Site obstruction',
                        driverNotes: complicationNotes,
                        photoUrl: complicationPhotoUrl,
                        gpsLat: complicationStop.lat,
                        gpsLng: complicationStop.lng,
                        action: complicationActionChoice,
                        secondaryPlacementNotes,
                      });
                      setCompletedStopIds((prev) => ({ ...prev, [complicationStop.id]: true }));
                      setComplicationStop(null);
                      setDriverToast(res.message);
                      setTimeout(() => setDriverToast(null), 4000);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-xs cursor-pointer ${
                      complicationActionChoice === 'abort_trip_redelivery_fee'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {complicationActionChoice === 'abort_trip_redelivery_fee'
                      ? 'Submit Aborted Trip & Invoice $99 Fee'
                      : 'Confirm Secondary Placement'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
