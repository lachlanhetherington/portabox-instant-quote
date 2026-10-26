import React, { useState, useEffect } from 'react';
import {
  QrCode,
  MapPin,
  DollarSign,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Package,
  Search,
  RefreshCw,
  Plus,
  Wrench,
  Clock,
  ArrowRight,
  ScanLine,
  Building2,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import {
  ContainerAsset,
  ContainerQrScanLog,
  loadContainerAssets,
  saveContainerAssets,
  recordContainerQrScan,
} from '../services/smartsheetService';

interface ContainerInventoryManagerProps {
  enableSunshineCoast?: boolean;
}

/**
 * Generates a crisp deterministic SVG QR Code pattern for any container ID
 */
export const ContainerQrSvg: React.FC<{ value: string; size?: number }> = ({ value, size = 84 }) => {
  // Deterministic 11x11 matrix seeded from value string
  const grid = 11;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinderCorner = (r: number, c: number) => {
    const topLeft = r < 3 && c < 3;
    const topRight = r < 3 && c >= grid - 3;
    const bottomLeft = r >= grid - 3 && c < 3;
    return topLeft || topRight || bottomLeft;
  };

  const cells: boolean[][] = [];
  for (let r = 0; r < grid; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < grid; c++) {
      if (isFinderCorner(r, c)) {
        row.push(true);
      } else {
        const bit = ((hash >>> ((r * grid + c) % 28)) ^ (r * 7 + c * 13 + value.charCodeAt((r + c) % value.length))) & 1;
        row.push(bit === 1);
      }
    }
    cells.push(row);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${grid + 2} ${grid + 2}`}
      className="bg-white p-1 rounded-xl border border-slate-300 shadow-2xs shrink-0"
    >
      <rect width={grid + 2} height={grid + 2} fill="#ffffff" />
      {cells.map((row, rIdx) =>
        row.map((filled, cIdx) =>
          filled ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + 1}
              y={rIdx + 1}
              width={0.92}
              height={0.92}
              rx={0.12}
              fill={isFinderCorner(rIdx, cIdx) ? '#0b2942' : '#0f172a'}
            />
          ) : null
        )
      )}
    </svg>
  );
};

export const ContainerInventoryManager: React.FC<ContainerInventoryManagerProps> = ({
  enableSunshineCoast = true,
}) => {
  const [assets, setAssets] = useState<ContainerAsset[]>(loadContainerAssets());
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<'ALL' | 'Customer Location' | 'Portabox Depot' | 'In Transit on Truck' | 'Maintenance Workshop'>('ALL');
  const [incomeFilter, setIncomeFilter] = useState<'ALL' | 'INCOME' | 'IDLE'>('ALL');
  const [selectedContainer, setSelectedContainer] = useState<ContainerAsset | null>(null);

  // Driver QR Code Scanner Modal / Drawer State
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [scanContainerId, setScanContainerId] = useState<string>('PB-BOX-25-088');
  const [scanAction, setScanAction] = useState<ContainerQrScanLog['scanAction']>('Checkout from Portabox Depot');
  const [scanDriver, setScanDriver] = useState<string>('Dave Higgins (Driver #03)');
  const [scanLocation, setScanLocation] = useState<string>('42 Osmond Terrace, Norwood SA 5067');
  const [scanCustomerName, setScanCustomerName] = useState<string>('Sarah Jenkins');
  const [scanServiceabilityScore, setScanServiceabilityScore] = useState<number>(98);
  const [scanGeneratingIncome, setScanGeneratingIncome] = useState<boolean>(true);
  const [scanMonthlyIncome, setScanMonthlyIncome] = useState<number>(259);
  const [scanNotes, setScanNotes] = useState<string>('Driver scanned QR code on container lockbox shroud. Level-lift locks verified.');
  const [scanToast, setScanToast] = useState<string | null>(null);

  // Add New Container State
  const [isAddingContainer, setIsAddingContainer] = useState(false);
  const [newContainerId, setNewContainerId] = useState('PB-BOX-25-145');
  const [newContainerSize, setNewContainerSize] = useState('25 m³');
  const [newContainerDepot, setNewContainerDepot] = useState('Portabox Adelaide Central Depot');
  const [newContainerScore, setNewContainerScore] = useState(100);

  useEffect(() => {
    const refresh = () => setAssets(loadContainerAssets());
    window.addEventListener('portabox-smartsheet-sync', refresh);
    return () => window.removeEventListener('portabox-smartsheet-sync', refresh);
  }, []);

  const visibleAssets = assets.filter((a) => {
    if (a.depotName.toLowerCase().includes('sunshine coast')) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      a.containerId.toLowerCase().includes(q) ||
      (a.currentLocationDetail || '').toLowerCase().includes(q) ||
      (a.customerName || '').toLowerCase().includes(q) ||
      a.depotName.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (locationFilter !== 'ALL' && (a.currentLocationType || 'Portabox Depot') !== locationFilter) return false;
    if (incomeFilter === 'INCOME' && !a.isGeneratingIncome) return false;
    if (incomeFilter === 'IDLE' && a.isGeneratingIncome) return false;
    return true;
  });

  // Fleet KPIs
  const totalUnits = visibleAssets.length;
  const incomeGeneratingCount = visibleAssets.filter((a) => a.isGeneratingIncome).length;
  const monthlyRecurringRevenue = visibleAssets.reduce((sum, a) => sum + (a.isGeneratingIncome ? (a.monthlyIncomeAud || 0) : 0), 0);
  const avgServiceability =
    totalUnits > 0
      ? Math.round(visibleAssets.reduce((sum, a) => sum + (a.serviceabilityScore ?? 95), 0) / totalUnits)
      : 95;
  const atCustomerCount = visibleAssets.filter((a) => a.currentLocationType === 'Customer Location').length;

  const handleOpenScannerForContainer = (asset: ContainerAsset) => {
    setScanContainerId(asset.containerId);
    setScanServiceabilityScore(asset.serviceabilityScore ?? 96);
    if (asset.currentLocationType === 'Portabox Depot') {
      setScanAction('Checkout from Portabox Depot');
      setScanLocation(asset.customerAddress || 'Customer Driveway Site');
      setScanGeneratingIncome(true);
      setScanMonthlyIncome(asset.size.includes('10') ? 159 : 259);
    } else if (asset.currentLocationType === 'Customer Location') {
      setScanAction('Checkout from Customer Site');
      setScanLocation(asset.depotName + ' (Return Bay)');
      setScanGeneratingIncome(false);
      setScanMonthlyIncome(0);
    } else {
      setScanAction('Place at Customer Site');
      setScanLocation(asset.currentLocationDetail || 'Customer Driveway');
      setScanGeneratingIncome(true);
    }
    setIsQrScannerOpen(true);
  };

  const handleSubmitQrScan = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = recordContainerQrScan({
      containerId: scanContainerId,
      scanAction,
      scannedByDriver: scanDriver,
      destinationOrCustomerLocation: scanLocation,
      customerName: scanCustomerName,
      serviceabilityScore: scanServiceabilityScore,
      isGeneratingIncome: scanGeneratingIncome,
      monthlyIncomeAud: scanMonthlyIncome,
      notes: scanNotes,
    });
    setAssets(updated);
    const refreshedTarget = updated.find((a) => a.containerId === scanContainerId);
    if (refreshedTarget) setSelectedContainer(refreshedTarget);
    setIsQrScannerOpen(false);
    setScanToast(
      `✓ QR Code Scanned: ${scanContainerId} (${scanAction}) — Location, Serviceability (${scanServiceabilityScore}/100) & Income Status updated!`
    );
    setTimeout(() => setScanToast(null), 5000);
  };

  const handleCreateContainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContainerId.trim()) return;
    const newAsset: ContainerAsset = {
      containerId: newContainerId.trim().toUpperCase(),
      qrCodePayload: `PORTABOX://ASSET/${newContainerId.trim().toUpperCase()}?SIZE=${ encodeURIComponent(newContainerSize) }`,
      size: newContainerSize,
      depotName: newContainerDepot,
      bayNumber: 'Bay 01-New',
      currentLocationType: 'Portabox Depot',
      currentLocationDetail: `${newContainerDepot} · Ready Line`,
      isGeneratingIncome: false,
      monthlyIncomeAud: 0,
      serviceabilityScore: newContainerScore,
      tareWeightKg: newContainerSize.includes('10') ? 720 : 1280,
      maxGrossWeightKg: newContainerSize.includes('10') ? 2500 : 4500,
      condition: newContainerScore >= 95 ? 'A+ Mint' : newContainerScore >= 85 ? 'A Excellent' : 'B Commercial',
      status: 'Available in Depot',
      lastInspectionDate: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }),
      scanHistory: [
        {
          id: `scan-${Date.now()}`,
          timestamp: new Date().toLocaleString('en-AU'),
          qrCode: `PORTABOX://ASSET/${newContainerId.trim().toUpperCase()}`,
          scanAction: 'Check-in at Portabox Depot',
          scannedByDriver: 'Portabox Fleet Admin',
          fromLocation: 'Manufacturing / Commissioning',
          toLocation: newContainerDepot,
          serviceabilityScoreRecorded: newContainerScore,
          notes: 'New container commissioned with weatherproof QR plate.',
        },
      ],
    };
    const next = [newAsset, ...assets];
    saveContainerAssets(next);
    setAssets(next);
    setIsAddingContainer(false);
    setScanToast(`✓ Added container ${newAsset.containerId} with QR Code tag to ${newContainerDepot}.`);
    setTimeout(() => setScanToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0b2942] via-[#0f385a] to-[#0b2942] text-white rounded-3xl p-6 sm:p-7 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-[#FF9900] text-[#0b2942] px-2.5 py-0.5 rounded-md border border-[#FEBD69]">
              <QrCode className="w-3.5 h-3.5" />
              QR-TRACKED CONTAINER INVENTORY SYSTEM
            </span>
            <span className="text-[11px] font-bold text-[#FEBD69] bg-white/10 px-2.5 py-0.5 rounded-full">
              100% Fleet Visibility · Location · Serviceability · Income Yield
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Portabox Container Asset & QR Code Telemetry
          </h3>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Every container is fitted with a serialized QR code plate. When drivers scan a container upon checking out from a Portabox depot or customer site, its live GPS location, 0–100 serviceability score, and active income generation status update automatically.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setIsQrScannerOpen(true)}
            className="px-4 py-3 rounded-2xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <ScanLine className="w-4 h-4 stroke-[2.5]" />
            <span>Driver QR Check-Out / Scan</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingContainer(!isAddingContainer)}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FEBD69]" />
            <span>Register Container</span>
          </button>
        </div>
      </div>

      {scanToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{scanToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Executive Visibility KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Tracked Fleet
            </span>
            <Package className="w-4 h-4 text-[#0b2942]" />
          </div>
          <div className="text-2xl font-black text-[#0b2942]">{totalUnits} Containers</div>
          <span className="text-[11px] text-slate-500 font-medium block">
            {atCustomerCount} at Customer Sites · {totalUnits - atCustomerCount} at Depots
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Generating Income Now
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {incomeGeneratingCount} / {totalUnits} ({totalUnits > 0 ? Math.round((incomeGeneratingCount / totalUnits) * 100) : 0}%)
          </div>
          <span className="text-[11px] text-emerald-700 font-bold block">
            ${monthlyRecurringRevenue.toLocaleString()}/mo active storage yield
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Avg Serviceability Score
            </span>
            <Shield className="w-4 h-4 text-[#00c0f3]" />
          </div>
          <div className="text-2xl font-black text-[#0b2942] font-mono">{avgServiceability} / 100</div>
          <span className="text-[11px] text-emerald-600 font-bold block">
            Weather-seal & level-lift rated
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Non-Revenue / Idle Units
            </span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {totalUnits - incomeGeneratingCount} Units
          </div>
          <span className="text-[11px] text-slate-500 font-medium block">
            Available in depot or workshop prep
          </span>
        </div>
      </div>

      {/* Add Container Form */}
      {isAddingContainer && (
        <form
          onSubmit={handleCreateContainer}
          className="p-5 rounded-2xl bg-[#FEBD69]/15 border-2 border-[#FEBD69] space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-[#0b2942] flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#FF9900]" />
              <span>Commission New Container & Generate QR Tag</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingContainer(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Container Serial ID</label>
              <input
                type="text"
                value={newContainerId}
                onChange={(e) => setNewContainerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Container Size</label>
              <select
                value={newContainerSize}
                onChange={(e) => setNewContainerSize(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="10 m³">10 m³ Small</option>
                <option value="19 m³">19 m³ Medium</option>
                <option value="25 m³">25 m³ Large</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Home Portabox Depot</label>
              <select
                value={newContainerDepot}
                onChange={(e) => setNewContainerDepot(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="Portabox Adelaide Central Depot">Adelaide Central Depot</option>
                <option value="Portabox Melbourne West Depot">Melbourne West Depot</option>
                <option value="Portabox Sydney Metro Hub">Sydney Metro Hub</option>
                <option value="Brisbane Depot">Brisbane Depot</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Serviceability Score (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={newContainerScore}
                onChange={(e) => setNewContainerScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold text-xs cursor-pointer shadow-2xs"
            >
              Save Container & Generate QR Code
            </button>
          </div>
        </form>
      )}

      {/* Search & Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Container ID (e.g. PB-BOX-25-088), customer name, suburb, or depot..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9900]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {(['ALL', 'Customer Location', 'Portabox Depot', 'In Transit on Truck', 'Maintenance Workshop'] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocationFilter(loc)}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
                locationFilter === loc
                  ? 'bg-[#0b2942] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {loc === 'ALL' ? 'All Locations' : loc}
            </button>
          ))}

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => setIncomeFilter(incomeFilter === 'INCOME' ? 'ALL' : 'INCOME')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              incomeFilter === 'INCOME'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Generating Income</span>
          </button>

          <button
            type="button"
            onClick={() => setIncomeFilter(incomeFilter === 'IDLE' ? 'ALL' : 'IDLE')}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer ${
              incomeFilter === 'IDLE'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            Non-Income / Idle
          </button>
        </div>
      </div>

      {/* Container Inventory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleAssets.map((asset) => {
          const score = asset.serviceabilityScore ?? 95;
          const isIncome = Boolean(asset.isGeneratingIncome);
          const locType = asset.currentLocationType || 'Portabox Depot';

          return (
            <div
              key={asset.containerId}
              className={`rounded-3xl border p-5 bg-white transition-all shadow-xs flex flex-col justify-between gap-4 ${
                isIncome ? 'border-emerald-200/90' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <ContainerQrSvg value={asset.qrCodePayload || asset.containerId} size={74} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm bg-[#0b2942] text-white px-2.5 py-0.5 rounded-lg">
                        {asset.containerId}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {asset.size}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <DollarSign className="w-3 h-3" />
                        {isIncome ? `Generating Income ($${asset.monthlyIncomeAud || 259}/mo)` : 'Not Generating Income ($0)'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#0b2942] flex items-center gap-1.5 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF9900] shrink-0" />
                      <span>
                        {locType}: <span className="text-slate-700">{asset.currentLocationDetail || asset.depotName}</span>
                      </span>
                    </div>

                    {asset.customerName && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Customer: <strong>{asset.customerName}</strong>
                          {asset.assignedOrderNumber ? ` (Order #${asset.assignedOrderNumber})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Serviceability Level Score Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#0b2942] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#00c0f3]" />
                    <span>Serviceability Level Score:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-black text-sm ${
                        score >= 90
                          ? 'text-emerald-600'
                          : score >= 75
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {score} / 100
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      {asset.condition}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      score >= 90
                        ? 'bg-emerald-500'
                        : score >= 75
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Home Hub: {asset.depotName}</span>
                  <span>Last Inspected: {asset.lastInspectionDate}</span>
                </div>
              </div>

              {/* Bottom Action Row */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedContainer(
                      selectedContainer?.containerId === asset.containerId ? null : asset
                    )
                  }
                  className="text-xs font-bold text-slate-600 hover:text-[#0b2942] flex items-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {selectedContainer?.containerId === asset.containerId
                      ? 'Hide QR Audit Trail'
                      : `QR Scan History (${asset.scanHistory?.length || 0})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenScannerForContainer(asset)}
                  className="px-3.5 py-2 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan QR / Check Out</span>
                </button>
              </div>

              {/* Expanded QR Scan Log */}
              {selectedContainer?.containerId === asset.containerId && (
                <div className="pt-3 border-t border-slate-200 space-y-2 text-xs animate-in fade-in">
                  <div className="font-extrabold text-[#0b2942] text-[11px] uppercase tracking-wider">
                    QR Code Telemetry & Check-Out Log ({asset.qrCodePayload || asset.containerId})
                  </div>
                  {(asset.scanHistory || []).length === 0 ? (
                    <p className="text-slate-400 text-[11px]">No driver QR scans recorded yet for this unit.</p>
                  ) : (
                    <div className="space-y-2">
                      {(asset.scanHistory || []).map((scan) => (
                        <div key={scan.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between font-bold text-[#0b2942]">
                            <span>{scan.scanAction}</span>
                            <span className="font-mono text-[10px] text-emerald-700">
                              Score: {scan.serviceabilityScoreRecorded}/100
                            </span>
                          </div>
                          <div className="text-slate-600">
                            From <strong>{scan.fromLocation}</strong> → To <strong>{scan.toLocation}</strong>
                          </div>
                          <div className="text-slate-400 text-[10px] flex justify-between pt-0.5">
                            <span>Driver: {scan.scannedByDriver}</span>
                            <span>{scan.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Driver QR Code Scanner Modal */}
      {isQrScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#FEBD69]/30 text-[#0b2942] border border-[#FEBD69]">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900]">
                    DRIVER MOBILE QR SCANNER
                  </span>
                  <h4 className="text-lg font-black text-[#0b2942]">
                    Scan Container QR Code Check-Out / Check-In
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrScannerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitQrScan} className="space-y-4 text-xs">
              {/* Visual QR Code Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center gap-4">
                <ContainerQrSvg value={`PORTABOX://ASSET/${scanContainerId}`} size={68} />
                <div className="space-y-1">
                  <div className="text-[10px] font-mono text-[#FEBD69] uppercase tracking-wider">
                    OPTICAL QR TARGET LOCKED
                  </div>
                  <div className="text-sm font-black font-mono">{scanContainerId}</div>
                  <div className="text-[11px] text-slate-300">
                    Payload: <code className="text-sky-300">PORTABOX://ASSET/{scanContainerId}</code>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Container QR Tag</label>
                  <select
                    value={scanContainerId}
                    onChange={(e) => setScanContainerId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-[#0b2942]"
                  >
                    {assets.map((a) => (
                      <option key={a.containerId} value={a.containerId}>
                        {a.containerId} ({a.size})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver QR Scan Action</label>
                  <select
                    value={scanAction}
                    onChange={(e) => {
                      const act = e.target.value as ContainerQrScanLog['scanAction'];
                      setScanAction(act);
                      if (act === 'Place at Customer Site' || act === 'Checkout from Portabox Depot') {
                        setScanGeneratingIncome(true);
                      } else if (act === 'Check-in at Portabox Depot') {
                        setScanGeneratingIncome(false);
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-[#0b2942]"
                  >
                    <option value="Checkout from Portabox Depot">Checkout from Portabox Depot</option>
                    <option value="Place at Customer Site">Place at Customer Site</option>
                    <option value="Checkout from Customer Site">Checkout from Customer Site</option>
                    <option value="Check-in at Portabox Depot">Check-in at Portabox Depot</option>
                    <option value="Quality Inspection Scan">Quality Inspection Scan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Scanning Driver</label>
                  <input
                    type="text"
                    value={scanDriver}
                    onChange={(e) => setScanDriver(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Name (if applicable)</label>
                  <input
                    type="text"
                    value={scanCustomerName}
                    onChange={(e) => setScanCustomerName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  New Location (Customer Address, Truck Rego, or Portabox Depot Bay)
                </label>
                <input
                  type="text"
                  value={scanLocation}
                  onChange={(e) => setScanLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Serviceability Level Score ({scanServiceabilityScore}/100)
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={scanServiceabilityScore}
                    onChange={(e) => setScanServiceabilityScore(Number(e.target.value))}
                    className="w-full accent-[#FF9900]"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 font-extrabold text-[#0b2942] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scanGeneratingIncome}
                      onChange={(e) => setScanGeneratingIncome(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <span>Container Generating Income (${scanGeneratingIncome ? scanMonthlyIncome : 0}/mo)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQrScannerOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Confirm QR Scan & Update Telemetry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
