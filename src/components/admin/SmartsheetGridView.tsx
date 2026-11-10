import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Filter,
  Check,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Truck,
  Box,
  ShieldCheck,
  Tag,
  GitBranch,
  Key,
  ExternalLink as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import {
  SmartsheetRow,
  updateSmartsheetRowInline,
  loadSmartsheetStagingRows,
  saveSmartsheetStagingRows,
  notifySmartsheetTwoWaySync,
  downloadSmartsheetTemplateCSV,
  parseSmartsheetCSVText,
  createSmartsheetInUserAccount,
  loadSmartsheetConfig,
  syncWithDanSmartsheet,
  downloadDan51ColCSV,
  DAN_51_COLUMNS,
} from '../../services/smartsheetService';
import { Dan51ColumnTable } from './Dan51ColumnTable';
import { AgentNotificationBell } from './AgentNotificationBell';

interface SmartsheetGridViewProps {
  rows: SmartsheetRow[];
  onRefreshRows: (updatedRows: SmartsheetRow[]) => void;
  onOpenPhoneIntake: () => void;
  sheetName?: string;
  workspaceName?: string;
  userEmail?: string;
}

export const SmartsheetGridView: React.FC<SmartsheetGridViewProps> = ({
  rows,
  onRefreshRows,
  onOpenPhoneIntake,
  sheetName = 'CRM-Phase I (Quotezilla - QZ4)',
  workspaceName = 'New CRM - Porta',
  userEmail = 'andrew@weva.ai',
}) => {
  const [columnViewMode, setColumnViewMode] = useState<'dan51' | 'operational'>('dan51');
  const [isSyncingWithDan, setIsSyncingWithDan] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [containerGroupFilter, setContainerGroupFilter] = useState<'All' | 'Multi-Container' | 'Single'>('All');
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: keyof SmartsheetRow;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');

  // Create Sheet in Smartsheet Account modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'api' | 'csv'>('api');
  const [smartsheetToken, setSmartsheetToken] = useState(() => {
    try {
      return loadSmartsheetConfig().apiToken || '';
    } catch {
      return '';
    }
  });
  const [newSheetName, setNewSheetName] = useState('CRM-Phase I (Quotezilla - QZ4)');
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [createResult, setCreateResult] = useState<{
    success: boolean;
    sheetId?: string;
    permalink?: string;
    name?: string;
    error?: string;
  } | null>(null);

  // Filtering
  const filteredRows = useMemo(() => {
    // Count rows per Quote ID or Order Number to identify multi-container quotes
    const quoteCounts: Record<string, number> = {};
    rows.forEach(r => {
      const qKey = r.quoteNumber || r.orderNumber;
      quoteCounts[qKey] = (quoteCounts[qKey] || 0) + 1;
    });

    return rows.filter((r) => {
      const qKey = r.quoteNumber || r.orderNumber;
      const isMulti = (quoteCounts[qKey] || 1) > 1 || (r.totalContainers && r.totalContainers > 1) || r.prim === 'Child';

      const matchSearch =
        !searchQuery ||
        r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.quoteNumber && r.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerPhone.includes(searchQuery) ||
        r.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.suburb && r.suburb.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.zoneFromLetter && r.zoneFromLetter.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.containerNumber && r.containerNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.containerId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'All' ||
        r.orderStatus === statusFilter ||
        r.yardReviewStatus === statusFilter ||
        r.paymentStatus === statusFilter;

      const matchZone =
        zoneFilter === 'All' ||
        r.zoneFromLetter === zoneFilter ||
        r.deliveryZone === zoneFilter ||
        (zoneFilter === 'Interstate' && r.isInterstate);

      const matchContainerGroup =
        containerGroupFilter === 'All' ||
        (containerGroupFilter === 'Multi-Container' && isMulti) ||
        (containerGroupFilter === 'Single' && !isMulti);

      return matchSearch && matchStatus && matchZone && matchContainerGroup;
    });
  }, [rows, searchQuery, statusFilter, zoneFilter, containerGroupFilter]);

  // Inline Cell Editing
  const handleStartEdit = (rowId: string, field: keyof SmartsheetRow, currentValue: any) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue ?? '');
  };

  const handleSaveEdit = (rowId: string, field: keyof SmartsheetRow) => {
    const updated = updateSmartsheetRowInline(rowId, { [field]: editValue });
    onRefreshRows(updated);
    setEditingCell(null);
    setToastMessage(`Updated ${String(field)} for row`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  // Add a blank row directly into Smartsheet
  const handleAddBlankRow = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    const newRow: SmartsheetRow = {
      id: `sm-row-${Date.now()}`,
      orderNumber: `PBO-${num}`,
      quoteNumber: `P-${num}`,
      customerId: `CUST-${num}`,
      prim: 'Parent',
      containerNumber: '1 of 1',
      containerIndex: 1,
      totalContainers: 1,
      customerName: 'New Phone Inquiry',
      customerPhone: '0400 000 000',
      customerEmail: 'inquiry@portabox.com.au',
      containerId: 'PB-BOX-25-TBD',
      containerSize: '25 m³',
      serviceType: 'Storage at Your Place',
      orderStatus: 'Scheduled',
      deliveryAddress: 'Pending Address, Adelaide SA 5000',
      suburb: 'Adelaide',
      postcode: '5000',
      deliveryZone: 'Zone A',
      zoneFromLetter: 'Zone A',
      zoneToLetter: 'Zone A',
      zoneNameFrom: 'Adelaide Metro',
      zoneNameTo: 'Adelaide Metro',
      distanceFromDepotKm: 15,
      isInterstate: false,
      scheduledDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      deliveryWindow: '09:00 AM – 11:30 AM (Morning Window)',
      timeToDeliveryHours: 48,
      assignedDriver: 'Dave Higgins (Driver #03)',
      driverPhone: '0488 123 456',
      assignedTruckId: 'TRUCK-ADL-01',
      yardReviewStatus: 'Pending Inspection',
      paymentStatus: 'Pending',
      paymentPlan: 'Standard Monthly Plan',
      periodicRateAud: 219,
      monthlyStorageFee: 219,
      initialDeliveryFee: 179,
      idFuelLevy: 5,
      finalPickUpFeeFpu: 179,
      fpuFuelLevy: 5,
      protectionPlan: 'Customer Goods in Transit/Storage Cover ($5,000 Included)',
      protectionCoverageAmount: 5000,
      protectionMonthlyFee: 0,
      isMandatoryInterstateProtection: false,
      freeBlanketsCount: 5,
      freePadlocksCount: 1,
      freeSuppliesRetailValue: 50,
      discountOffered: 'Free Blankets & Lock',
      isFirstMonthFree: false,
      nextBillingDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-AU'),
      autopayEnabled: true,
      amountPaid: 0,
      balanceDueAud: 368,
      callCenterDiscountAud: 0,
      braintreeTransactionId: 'pending_smartsheet_direct',
      accessNotes: 'Direct Smartsheet entry',
      placementSurface: 'Concrete Driveway',
      doorOrientation: 'Doors Facing Street / Road',
      accessGateWidth: 'Wide Open (>3.5m)',
      overheadClearanceClear: true,
      secondaryContactName: '',
      secondaryContactPhone: '',
      referralSource: 'Phone Call',
      siteNotes: '',
      lastUpdatedBy: 'Call Center Smartsheet',
      lastSyncedTimestamp: new Date().toLocaleString('en-AU'),
      syncedToSmartsheet: true,
      operationalHold: false,
    };

    const updated = [newRow, ...rows];
    saveSmartsheetStagingRows(updated);
    onRefreshRows(updated);
    notifySmartsheetTwoWaySync({
      source: 'smartsheet_grid_add_row',
      summary: `Added new blank Smartsheet row #${newRow.orderNumber}`,
    });
    setToastMessage(`Added new row #${newRow.orderNumber} to Smartsheet`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Add a linked child container line to an existing quote for staggered delivery logistics
  const handleAddContainerLine = (parentRow: SmartsheetRow) => {
    const parentKey = parentRow.quoteNumber || parentRow.orderNumber;
    const relatedRows = rows.filter(
      (r) => (r.quoteNumber || r.orderNumber) === parentKey
    );
    const newIndex = relatedRows.length + 1;
    const staggeredDays = (newIndex - 1) * 3;
    const baseDate = new Date(parentRow.scheduledDeliveryDate || Date.now());
    const staggeredDate = new Date(baseDate.getTime() + staggeredDays * 86400000)
      .toISOString()
      .slice(0, 10);

    const childRow: SmartsheetRow = {
      ...parentRow,
      id: `sm-child-${Date.now()}-${newIndex}`,
      prim: 'Child',
      containerNumber: `${newIndex} of ${newIndex}`,
      containerIndex: newIndex,
      totalContainers: newIndex,
      containerId: `PB-BOX-${parentRow.containerSize.slice(0, 2)}-${Math.floor(100 + Math.random() * 900)}`,
      scheduledDeliveryDate: staggeredDate,
      orderStatus: 'Scheduled',
      yardReviewStatus: 'Pending Inspection',
      initialDeliveryFee: parentRow.initialDeliveryFee,
      finalPickUpFeeFpu: parentRow.finalPickUpFeeFpu || parentRow.finalPickupFee || 179,
      lastUpdatedBy: 'Call Center Smartsheet',
      lastSyncedTimestamp: new Date().toLocaleString('en-AU'),
    };

    // Update parent's and existing siblings' totalContainers
    const updated = rows.map((r) => {
      if ((r.quoteNumber || r.orderNumber) === parentKey) {
        return {
          ...r,
          totalContainers: newIndex,
          containerNumber: `${r.containerIndex || 1} of ${newIndex}`,
        };
      }
      return r;
    });

    // Insert child immediately after the parent's group
    const lastIndex = updated.reduce(
      (acc, r, idx) => ((r.quoteNumber || r.orderNumber) === parentKey ? idx : acc),
      -1
    );
    if (lastIndex >= 0) {
      updated.splice(lastIndex + 1, 0, childRow);
    } else {
      updated.unshift(childRow);
    }

    saveSmartsheetStagingRows(updated);
    onRefreshRows(updated);
    notifySmartsheetTwoWaySync({
      source: 'smartsheet_add_container_line',
      summary: `Added Container ${newIndex} to Quote #${parentKey}`,
    });
    setToastMessage(`Added Container #${newIndex} to Quote ${parentKey} (Sched: ${staggeredDate})`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Export full 93-column CSV
  const handleExportCsv = () => {
    downloadSmartsheetTemplateCSV(filteredRows);
  };

  // Import custom CSV from user's Smartsheet export (supports New_smart_sheet_f80c7241.csv & modern 93-col)
  const handleProcessCsvImport = () => {
    if (!csvRawText.trim()) return;
    const parsed = parseSmartsheetCSVText(csvRawText);
    if (parsed.length === 0) {
      alert('CSV must contain a header row and valid quote or order data rows.');
      return;
    }

    const combined = [...parsed, ...rows];
    saveSmartsheetStagingRows(combined);
    onRefreshRows(combined);
    setIsCsvImportOpen(false);
    setCsvRawText('');
    setToastMessage(`Successfully imported ${parsed.length} rows with multi-container linking!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Programmatic Smartsheet Account Creation
  const handleCreateSmartsheet = async () => {
    if (!smartsheetToken.trim()) {
      setCreateResult({
        success: false,
        error: 'Please enter your Smartsheet Personal Access Token to create the sheet in your account.',
      });
      return;
    }

    setIsCreatingSheet(true);
    setCreateResult(null);

    const result = await createSmartsheetInUserAccount({
      apiToken: smartsheetToken.trim(),
      sheetName: newSheetName.trim() || 'CRM-Phase I (Quotezilla - QZ4)',
    });

    setIsCreatingSheet(false);
    setCreateResult(result);

    if (result.success) {
      setToastMessage(`Created Smartsheet "${result.name || newSheetName}" in your account!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const [activeSheetId, setActiveSheetId] = useState<string>('3517583962886020');

  // Sync with CEO Dan Harrington's Smartsheet (Two-Way Push & Pull)
  const handleSyncDan = async (customSheetId?: string) => {
    const targetId = customSheetId || activeSheetId;
    setIsSyncingWithDan(true);
    try {
      const res = await syncWithDanSmartsheet({
        sheetId: targetId,
        sheetName,
        workspaceName,
      });
      setIsSyncingWithDan(false);
      if (res.success) {
        onRefreshRows(loadSmartsheetStagingRows());
        setToastMessage(
          `Two-Way Sync Success: "${res.sheetName}" · Pulled ${res.pulledCount ?? 0} rows from Smartsheet, Pushed ${res.pushedCount ?? 0} new quotes`
        );
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        setToastMessage(`Sync failed: ${res.error}`);
        setTimeout(() => setToastMessage(null), 4500);
      }
    } catch (err: any) {
      setIsSyncingWithDan(false);
      setToastMessage(`Sync error: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  const handleExportDan51 = () => {
    downloadDan51ColCSV(filteredRows);
    setToastMessage(`Downloaded Dan's 51-column CSV with ${filteredRows.length} rows`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col space-y-3 overflow-hidden">
      {/* Account & Sheet Status Banner */}
      <div className="bg-linear-to-r from-[#081e30] to-[#0b2942] text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded">
                LIVE 2-WAY SMARTSHEET API
              </span>
              <span className="font-extrabold text-white text-sm bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span>CRM-Phase I (Quotezilla - QZ4)</span>
                <span className="text-emerald-400 font-mono text-[11px] font-bold">#3517583962886020</span>
              </span>
              <span className="text-emerald-300 font-semibold">· Workspace: {workspaceName || 'New CRM - Porta'}</span>
              <span className="text-slate-400">· Token: New CRM - Phase I</span>
            </div>
            <p className="text-[11px] text-sky-200 mt-0.5">
              CEO Dan Harrington Phase I Architecture · 51 Columns (36 App-pushed / 15 Smartsheet follow-up) · Q- Prefix &amp; Multi-Container Split.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSyncDan()}
            disabled={isSyncingWithDan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Perform live two-way sync with Smartsheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithDan ? 'animate-spin' : ''}`} />
            <span>{isSyncingWithDan ? 'Syncing...' : "Sync with Smartsheet"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPhoneIntake}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00c0f3] hover:bg-[#00a6d2] text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ New Phone Booking</span>
          </button>

          <button
            type="button"
            onClick={handleAddBlankRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          {/* Real-time Agent Alert & Overnight Bell */}
          <div className="bg-white/10 rounded-xl p-0.5 border border-white/20">
            <AgentNotificationBell onNavigateToQuote={(qid) => setSearchQuery(qid)} />
          </div>
        </div>
      </div>

      {/* Control Utility Toolbar with Multi-Container and Zone Pricing Filters */}
      <div className="px-5 pt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes, order #, customer, zone, box #..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
          />
        </div>

        {/* Filter & Import / Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 text-xs"
            >
              <option value="All">All Statuses ({rows.length})</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Placed at Customer">Placed at Customer</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Payment Pending</option>
              <option value="Overdue">Overdue Balance</option>
            </select>
          </div>

          {/* Zone Letter Pricing Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Zone:</span>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 text-xs"
            >
              <option value="All">All Zones</option>
              <option value="Zone A">Zone A (&lt;25km · $5)</option>
              <option value="Zone B">Zone B (25-50km · $15)</option>
              <option value="Zone C">Zone C (50-75km · $25)</option>
              <option value="Zone D">Zone D (75-100km · $35)</option>
              <option value="Zone E">Zone E (&gt;100km · $50)</option>
              <option value="Interstate">Interstate Move</option>
            </select>
          </div>

          {/* Multi-Container Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Containers:</span>
            <select
              value={containerGroupFilter}
              onChange={(e) => setContainerGroupFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 text-xs"
            >
              <option value="All">All Orders</option>
              <option value="Multi-Container">Multi-Container Quotes</option>
              <option value="Single">Single Container</option>
            </select>
          </div>

          {/* Column View Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setColumnViewMode('dan51')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                columnViewMode === 'dan51'
                  ? 'bg-[#0b2942] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dan&apos;s 51-Col Phase I
            </button>
            <button
              type="button"
              onClick={() => setColumnViewMode('operational')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                columnViewMode === 'operational'
                  ? 'bg-[#0b2942] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Logistics (17-Col)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportDan51}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs shadow-xs"
            title="Export Dan's clean 51-column CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 51-Col CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCsvImportOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 rounded-xl bg-[#0b2942] hover:bg-[#081e30] text-white font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export 93-Col CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateResult(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-xs"
            title="Create and link this sheet in your Smartsheet account"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>Create in My Smartsheet</span>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="mx-5 p-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* High-Density Spreadsheet Table */}
      {columnViewMode === 'dan51' ? (
        <Dan51ColumnTable
          rows={filteredRows}
          onUpdateRow={updateSmartsheetRowInline}
        />
      ) : (
        <div className="overflow-x-auto border-t border-slate-200/90 max-h-[640px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80"># Quote / Order</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Container Line</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Customer</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Phone</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Zone (A–E)</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Delivery Address</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Container Size &amp; ID</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Protection</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Discounts Applied</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Sched. Delivery Date</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Window</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Surface &amp; Doors</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Assigned Driver</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Order Status</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Payment</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-slate-200/80">Balance (AUD)</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Access Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-12 text-center text-slate-400 font-semibold">
                  No matching rows found in Smartsheet. Click &ldquo;Add Row&rdquo; or &ldquo;New Phone Booking&rdquo; above.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isChild = row.prim === 'Child';
                const zoneLetter = row.zoneFromLetter || row.deliveryZone || 'Zone A';
                const hasFirstMthFree = row.isFirstMonthFree || (row.discountOffered && row.discountOffered.toLowerCase().includes('1st mth'));
                const hasMilestone = row.annualDiscountOption && row.annualDiscountOption !== 'None';

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors group ${
                      isChild ? 'bg-amber-50/25 hover:bg-amber-100/40' : 'hover:bg-sky-50/40'
                    }`}
                  >
                    {/* Order / Quote Number */}
                    <td className="py-2 px-3 font-mono font-black border-r border-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isChild && (
                          <span className="text-amber-600 font-bold text-[10px]" title="Linked Child Container Line">
                            ↳
                          </span>
                        )}
                        <span className="text-[#0b2942]">{row.orderNumber}</span>
                      </div>
                      {row.quoteNumber && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Quote: {row.quoteNumber}
                        </div>
                      )}
                    </td>

                    {/* Container Line Item */}
                    <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            isChild
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : (row.totalContainers && row.totalContainers > 1)
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.containerNumber || (isChild ? '2 of 2' : '1 of 1')}
                        </span>

                        {!isChild && (
                          <button
                            type="button"
                            onClick={() => handleAddContainerLine(row)}
                            title="Add another linked container line for this quote (+3 days staggered)"
                            className="text-[10px] font-bold text-sky-600 hover:text-sky-800 hover:bg-sky-100 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            + Box
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Customer Name */}
                    <td
                      className="py-2 px-3 font-bold border-r border-slate-100 cursor-pointer hover:bg-sky-100/50"
                      onClick={() => handleStartEdit(row.id, 'customerName', row.customerName)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'customerName' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.id, 'customerName');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs font-bold w-full"
                          />
                          <button
                            onClick={() => handleSaveEdit(row.id, 'customerName')}
                            className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[#0b2942] group-hover:underline block">{row.customerName}</span>
                          {row.companyName && (
                            <span className="text-[10px] text-slate-500 font-medium block">
                              🏢 {row.companyName}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td
                      className="py-2 px-3 font-mono border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                      onClick={() => handleStartEdit(row.id, 'customerPhone', row.customerPhone)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'customerPhone' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.id, 'customerPhone');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs font-mono w-full"
                          />
                          <button
                            onClick={() => handleSaveEdit(row.id, 'customerPhone')}
                            className="text-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span>{row.customerPhone}</span>
                      )}
                    </td>

                    {/* Zone Letter A-E */}
                    <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            zoneLetter === 'Zone A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : zoneLetter === 'Zone B'
                              ? 'bg-blue-100 text-blue-800'
                              : zoneLetter === 'Zone C'
                              ? 'bg-amber-100 text-amber-800'
                              : zoneLetter === 'Zone D'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {zoneLetter}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {row.suburb || 'Adelaide'}
                        </span>
                      </div>
                    </td>

                    {/* Delivery Address */}
                    <td
                      className="py-2 px-3 border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 max-w-xs truncate"
                      title={row.deliveryAddress}
                      onClick={() => handleStartEdit(row.id, 'deliveryAddress', row.deliveryAddress)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'deliveryAddress' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(row.id, 'deliveryAddress');
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs w-full"
                          />
                          <button
                            onClick={() => handleSaveEdit(row.id, 'deliveryAddress')}
                            className="text-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span>{row.deliveryAddress}</span>
                      )}
                    </td>

                    {/* Container Size & ID */}
                    <td
                      className="py-2 px-3 font-bold border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                      onClick={() => handleStartEdit(row.id, 'containerSize', row.containerSize)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'containerSize' ? (
                        <select
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            handleSaveEdit(row.id, 'containerSize');
                          }}
                          autoFocus
                          className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs font-bold"
                        >
                          <option value="10 m³">10 m³</option>
                          <option value="19 m³">19 m³</option>
                          <option value="25 m³">25 m³</option>
                          <option value="50 m³">50 m³ (2x 25m³)</option>
                        </select>
                      ) : (
                        <div>
                          <span className="text-[#00c0f3] block">{row.containerSize}</span>
                          <span className="text-[10px] font-mono text-slate-400 block">{row.containerId}</span>
                        </div>
                      )}
                    </td>

                    {/* Protection Plan */}
                    <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {row.protectionPlan?.includes('$5,000') ? 'CPO $5,000' : 'CPO Included'}
                      </span>
                    </td>

                    {/* Discounts Applied */}
                    <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {hasFirstMthFree && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded w-fit">
                            <Tag className="w-2.5 h-2.5" /> 1st Mth Free
                          </span>
                        )}
                        {hasMilestone && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded w-fit">
                            Milestone {row.annualDiscountOption}
                          </span>
                        )}
                        {row.freeBlanketsCount && row.freeBlanketsCount > 0 ? (
                          <span className="text-[9px] font-semibold text-slate-500">
                            +{row.freeBlanketsCount} Blankets &amp; Lock
                          </span>
                        ) : null}
                        {!hasFirstMthFree && !hasMilestone && (!row.freeBlanketsCount || row.freeBlanketsCount === 0) && (
                          <span className="text-[10px] text-slate-400">Standard Rate</span>
                        )}
                      </div>
                    </td>

                    {/* Scheduled Delivery Date */}
                    <td
                      className="py-2 px-3 font-semibold border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                      onClick={() => handleStartEdit(row.id, 'scheduledDeliveryDate', row.scheduledDeliveryDate)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'scheduledDeliveryDate' ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            handleSaveEdit(row.id, 'scheduledDeliveryDate');
                          }}
                          autoFocus
                          className="px-1 py-0.5 rounded border border-sky-400 bg-white text-xs font-bold"
                        />
                      ) : (
                        <div>
                          <span className="font-bold text-[#0b2942] block">{row.scheduledDeliveryDate}</span>
                          {isChild && (
                            <span className="text-[9px] text-amber-700 font-bold block">
                              (Staggered Leg +3 Days)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Window */}
                    <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600 text-[11px]">
                      {row.deliveryWindow || '09:00 AM – 11:30 AM'}
                    </td>

                    {/* Surface & Orientation */}
                    <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap text-[11px] text-slate-700">
                      <div>{row.placementSurface || 'Concrete Driveway'}</div>
                      <div className="text-[9px] text-slate-400">{row.doorOrientation || 'Facing Street'}</div>
                    </td>

                    {/* Assigned Driver */}
                    <td
                      className="py-2 px-3 border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                      onClick={() => handleStartEdit(row.id, 'assignedDriver', row.assignedDriver)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'assignedDriver' ? (
                        <select
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            handleSaveEdit(row.id, 'assignedDriver');
                          }}
                          autoFocus
                          className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs font-bold"
                        >
                          <option value="Dave Higgins (Driver #03)">Dave Higgins</option>
                          <option value="Mick Thornton (Driver #04)">Mick Thornton</option>
                          <option value="Rob Davies (Driver #01)">Rob Davies</option>
                          <option value="Chris Lang (Driver #02)">Chris Lang</option>
                        </select>
                      ) : (
                        <span className="font-semibold text-slate-800">{row.assignedDriver}</span>
                      )}
                    </td>

                    {/* Order Status */}
                    <td
                      className="py-2 px-3 border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                      onClick={() => handleStartEdit(row.id, 'orderStatus', row.orderStatus)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'orderStatus' ? (
                        <select
                          value={editValue}
                          onChange={(e) => {
                            setEditValue(e.target.value);
                            handleSaveEdit(row.id, 'orderStatus');
                          }}
                          autoFocus
                          className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs font-bold"
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Placed at Customer">Placed at Customer</option>
                          <option value="Stored at Depot">Stored at Depot</option>
                          <option value="Completed">Completed</option>
                        </select>
                      ) : (
                        <span
                          className={`font-bold text-xs ${
                            row.orderStatus === 'Placed at Customer'
                              ? 'text-emerald-700 font-extrabold'
                              : row.orderStatus === 'Out for Delivery'
                              ? 'text-sky-700 font-extrabold'
                              : 'text-slate-800'
                          }`}
                        >
                          {row.orderStatus}
                        </span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="py-2 px-3 border-r border-slate-100 whitespace-nowrap">
                      <span
                        className={`font-black text-[11px] ${
                          row.paymentStatus === 'Paid'
                            ? 'text-emerald-700'
                            : row.paymentStatus === 'Pending'
                            ? 'text-amber-700'
                            : 'text-rose-700 font-extrabold'
                        }`}
                      >
                        {row.paymentStatus}
                      </span>
                    </td>

                    {/* Balance Due */}
                    <td className="py-2 px-3 font-mono font-bold text-right border-r border-slate-100 whitespace-nowrap">
                      ${row.balanceDueAud}
                    </td>

                    {/* Notes */}
                    <td
                      className="py-2 px-3 cursor-pointer hover:bg-sky-100/50 max-w-xs truncate text-slate-500"
                      title={row.accessNotes}
                      onClick={() => handleStartEdit(row.id, 'accessNotes', row.accessNotes)}
                    >
                      {editingCell?.rowId === row.id && editingCell.field === 'accessNotes' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(row.id, 'accessNotes');
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs w-full"
                        />
                      ) : (
                        <span>{row.accessNotes || '—'}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* Footer Info Row */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          Showing {filteredRows.length} of {rows.length} rows in Smartsheet grid · Click any cell to edit inline
        </span>
        <span className="font-semibold text-slate-600">
          Two-way synced with Customer Portal &amp; Call Center Dispatch
        </span>
      </div>

      {/* CSV Import Modal */}
      {isCsvImportOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#00c0f3]" />
                <h4 className="text-base font-extrabold text-[#0b2942]">
                  Import Smartsheet CSV
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Paste CSV text exported from your Smartsheet <strong>&ldquo;CRM-Phase I (Quotezilla - QZ4)&rdquo;</strong>.
              Columns will be mapped automatically to Order #, Customer, Phone, Suburb, Address, and Logistics.
            </p>

            <textarea
              rows={8}
              value={csvRawText}
              onChange={(e) => setCsvRawText(e.target.value)}
              placeholder="Order Number,Customer Name,Phone,Email,Delivery Address,Suburb,Postcode,Zone,Container Size..."
              className="w-full p-3 rounded-xl border border-slate-200 font-mono text-[11px] focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCsvImportOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessCsvImport}
                disabled={!csvRawText.trim()}
                className="px-5 py-2 rounded-xl bg-[#00c0f3] hover:bg-[#00a6d2] text-white text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50"
              >
                Import Rows
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create in My Smartsheet Account Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#0b2942]">
                    Create Sheet in Your Smartsheet Login
                  </h4>
                  <p className="text-xs text-slate-500">
                    Target Account: <strong className="text-slate-800">{userEmail}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreateResult(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setCreateModalTab('api')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  createModalTab === 'api'
                    ? 'bg-[#0b2942] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Option 1: Direct API (Automated)</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateModalTab('csv')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  createModalTab === 'csv'
                    ? 'bg-[#0b2942] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Option 2: 1-Click CSV Import (No Token)</span>
              </button>
            </div>

            {createModalTab === 'api' ? (
              <div className="space-y-4">
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-[#0b2942]">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    How to create the 93-column sheet automatically in your account:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 text-[11px]">
                    <li>
                      Log in to <a href="https://app.smartsheet.com" target="_blank" rel="noopener noreferrer" className="text-[#00c0f3] underline font-semibold">app.smartsheet.com</a> with <strong>{userEmail}</strong>.
                    </li>
                    <li>Click your profile avatar (bottom-left) → <strong>Personal Settings</strong>.</li>
                    <li>Click <strong>API Access</strong> → <strong>Generate new access token</strong>.</li>
                    <li>Copy and paste your token below, then click &ldquo;Create Sheet in My Account&rdquo;.</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Sheet Name
                    </label>
                    <input
                      type="text"
                      value={newSheetName}
                      onChange={(e) => setNewSheetName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Smartsheet Personal Access Token
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={smartsheetToken}
                        onChange={(e) => setSmartsheetToken(e.target.value)}
                        placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tokens are processed securely via server-side proxy and never stored publicly.
                    </p>
                  </div>
                </div>

                {/* Result Message */}
                {createResult && (
                  <div
                    className={`p-3 rounded-2xl text-xs space-y-2 ${
                      createResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border border-rose-200 text-rose-900'
                    }`}
                  >
                    {createResult.success ? (
                      <div>
                        <div className="flex items-center gap-2 font-black text-emerald-800">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>Sheet Created Successfully in Your Smartsheet Account!</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Sheet <strong>&ldquo;{createResult.name}&rdquo;</strong> (ID: {createResult.sheetId}) is now connected with 93 columns, multi-container logistics, and zone pricing formulas.
                        </p>
                        {createResult.permalink && (
                          <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                            <span className="text-[11px] text-emerald-800 font-semibold">Direct Smartsheet URL:</span>
                            <a
                              href={createResult.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition-colors"
                            >
                              <span>Open in Smartsheet</span>
                              <LinkIcon className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Creation Failed</p>
                          <p className="text-[11px] text-rose-700">{createResult.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreateResult(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSmartsheet}
                    disabled={isCreatingSheet || !smartsheetToken.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    {isCreatingSheet ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating in Smartsheet...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Create Sheet in My Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                  <p className="font-extrabold text-[#0b2942] flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[#00c0f3]" />
                    Instant Setup via Smartsheet Native CSV Import (Zero API Token needed)
                  </p>
                  <ol className="list-decimal list-inside space-y-2 pl-1 text-[11px]">
                    <li>
                      <strong>Step 1:</strong> Download the pre-formatted 93-column CSV containing all existing quotes, multi-container lines, protection plans, and zone calculations.
                    </li>
                    <li>
                      <strong>Step 2:</strong> Go to <a href="https://app.smartsheet.com" target="_blank" rel="noopener noreferrer" className="text-[#00c0f3] underline font-semibold">app.smartsheet.com</a> and sign in as <strong>{userEmail}</strong>.
                    </li>
                    <li>
                      <strong>Step 3:</strong> In the left navigation, click <strong>+ Create New</strong> → <strong>Import</strong> → <strong>Import from CSV</strong>.
                    </li>
                    <li>
                      <strong>Step 4:</strong> Select the downloaded file and set Sheet Name to <strong>&ldquo;CRM-Phase I (Quotezilla - QZ4)&rdquo;</strong>.
                    </li>
                  </ol>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-emerald-950 text-xs">Ready to download:</p>
                    <p className="text-[11px] text-emerald-800">
                      portabox_smart_sheet_ai_agent_93col.csv ({rows.length} rows)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Now</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
