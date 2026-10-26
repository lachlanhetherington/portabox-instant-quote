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
} from 'lucide-react';
import {
  SmartsheetRow,
  updateSmartsheetRowInline,
  loadSmartsheetStagingRows,
  saveSmartsheetStagingRows,
  notifySmartsheetTwoWaySync,
} from '../../services/smartsheetService';

interface SmartsheetGridViewProps {
  rows: SmartsheetRow[];
  onRefreshRows: (updatedRows: SmartsheetRow[]) => void;
  onOpenPhoneIntake: () => void;
  sheetName?: string;
  userEmail?: string;
}

export const SmartsheetGridView: React.FC<SmartsheetGridViewProps> = ({
  rows,
  onRefreshRows,
  onOpenPhoneIntake,
  sheetName = 'portabox smart sheet Ai agent',
  userEmail = 'ahammo@gmail.com',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: keyof SmartsheetRow;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');

  // Filtering
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.customerPhone.includes(searchQuery) ||
        r.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.suburb && r.suburb.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.containerId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'All' ||
        r.orderStatus === statusFilter ||
        r.yardReviewStatus === statusFilter ||
        r.paymentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [rows, searchQuery, statusFilter]);

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
      customerId: `CUST-${num}`,
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

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Order Number',
      'Customer Name',
      'Phone',
      'Email',
      'Delivery Address',
      'Suburb',
      'Postcode',
      'Zone',
      'Container Size',
      'Container ID',
      'Service Type',
      'Scheduled Date',
      'Delivery Window',
      'Surface Type',
      'Door Orientation',
      'Gate Width',
      'Driver',
      'Order Status',
      'Yard Review Status',
      'Payment Status',
      'Amount Paid',
      'Balance Due',
      'Access Notes',
      'Secondary Contact',
    ];

    const csvLines = [headers.join(',')];
    rows.forEach((r) => {
      const line = [
        `"${r.orderNumber || ''}"`,
        `"${r.customerName || ''}"`,
        `"${r.customerPhone || ''}"`,
        `"${r.customerEmail || ''}"`,
        `"${(r.deliveryAddress || '').replace(/"/g, '""')}"`,
        `"${r.suburb || ''}"`,
        `"${r.postcode || ''}"`,
        `"${r.deliveryZone || ''}"`,
        `"${r.containerSize || ''}"`,
        `"${r.containerId || ''}"`,
        `"${r.serviceType || ''}"`,
        `"${r.scheduledDeliveryDate || ''}"`,
        `"${r.deliveryWindow || ''}"`,
        `"${r.placementSurface || 'Concrete Driveway'}"`,
        `"${r.doorOrientation || 'Doors Facing Street / Road'}"`,
        `"${r.accessGateWidth || 'Wide Open (>3.5m)'}"`,
        `"${r.assignedDriver || ''}"`,
        `"${r.orderStatus || ''}"`,
        `"${r.yardReviewStatus || ''}"`,
        `"${r.paymentStatus || ''}"`,
        `"${r.amountPaid || 0}"`,
        `"${r.balanceDueAud || 0}"`,
        `"${(r.accessNotes || '').replace(/"/g, '""')}"`,
        `"${r.secondaryContactName || ''}"`,
      ];
      csvLines.push(line.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `portabox_smartsheet_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import custom CSV from user's Smartsheet export
  const handleProcessCsvImport = () => {
    if (!csvRawText.trim()) return;
    const lines = csvRawText.trim().split('\n');
    if (lines.length < 2) {
      alert('CSV must contain a header row and at least one data row.');
      return;
    }

    const newImportedRows: SmartsheetRow[] = [];
    const timestampStr = new Date().toLocaleString('en-AU');

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 3) continue;

      const orderNumber = parts[0] || `PBO-IMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const customerName = parts[1] || 'Imported Customer';
      const customerPhone = parts[2] || '0400 000 000';
      const address = parts[4] || 'Adelaide SA';
      const containerSize = parts[8] || '25 m³';

      newImportedRows.push({
        id: `imp-${Date.now()}-${i}`,
        orderNumber,
        customerId: `CUST-IMP-${i}`,
        customerName,
        customerPhone,
        customerEmail: parts[3] || 'imported@lead.com',
        containerId: parts[9] || 'PB-BOX-25-IMP',
        containerSize,
        serviceType: parts[10] || 'Storage at Your Place',
        orderStatus: 'Scheduled',
        deliveryAddress: address,
        suburb: parts[5] || 'Adelaide',
        postcode: parts[6] || '5000',
        deliveryZone: parts[7] || 'Zone A',
        scheduledDeliveryDate: parts[11] || new Date().toISOString().slice(0, 10),
        deliveryWindow: parts[12] || '09:00 AM – 11:30 AM (Morning Window)',
        placementSurface: (parts[13] as any) || 'Concrete Driveway',
        doorOrientation: (parts[14] as any) || 'Doors Facing Street / Road',
        accessGateWidth: (parts[15] as any) || 'Wide Open (>3.5m)',
        overheadClearanceClear: true,
        assignedDriver: parts[16] || 'Dave Higgins (Driver #03)',
        driverPhone: '0488 123 456',
        timeToDeliveryHours: 24,
        yardReviewStatus: 'Pending Inspection',
        paymentStatus: 'Pending',
        paymentPlan: 'Standard Monthly Plan',
        periodicRateAud: 219,
        nextBillingDate: new Date().toLocaleDateString('en-AU'),
        autopayEnabled: true,
        amountPaid: Number(parts[20]) || 0,
        balanceDueAud: Number(parts[21]) || 368,
        callCenterDiscountAud: 0,
        braintreeTransactionId: 'csv_imported_row',
        accessNotes: parts[22] || 'Imported from Smartsheet CSV',
        secondaryContactName: parts[23] || '',
        secondaryContactPhone: '',
        referralSource: 'Smartsheet Import',
        lastUpdatedBy: 'Call Center Smartsheet',
        lastSyncedTimestamp: timestampStr,
        syncedToSmartsheet: true,
        operationalHold: false,
      });
    }

    const combined = [...newImportedRows, ...rows];
    saveSmartsheetStagingRows(combined);
    onRefreshRows(combined);
    setIsCsvImportOpen(false);
    setCsvRawText('');
    setToastMessage(`Successfully imported ${newImportedRows.length} rows from Smartsheet CSV!`);
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
                CONNECTED SMARTSHEET
              </span>
              <span className="font-extrabold text-white">{sheetName}</span>
              <span className="text-slate-400">· Account: {userEmail}</span>
            </div>
            <p className="text-[11px] text-sky-200 mt-0.5">
              Live Bi-Directional Grid · Changes made here update Customer Accounts, Drivers, and Invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Control Utility Toolbar */}
      <div className="px-5 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rows by customer, order #, mobile, address, box ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
          />
        </div>

        {/* Filter & Import / Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 text-xs"
            >
              <option value="All">All Rows ({rows.length})</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Placed at Customer">Placed at Customer</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Payment Pending</option>
              <option value="Overdue">Overdue Balance</option>
            </select>
          </div>

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
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
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
      <div className="overflow-x-auto border-t border-slate-200/90 max-h-[640px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/90 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80"># Order</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Customer Name</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Phone</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Delivery Suburb</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Delivery Address</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Container Size</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Surface Type</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Doors Facing</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Gate Clearance</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Delivery Date</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Assigned Driver</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Order Status</th>
              <th className="py-2.5 px-3 whitespace-nowrap border-r border-slate-200/80">Payment</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap border-r border-slate-200/80">Balance (AUD)</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Site Placement Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-12 text-center text-slate-400 font-semibold">
                  No matching rows found in Smartsheet. Click &ldquo;Add Row&rdquo; or &ldquo;New Phone Booking&rdquo; above.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-sky-50/40 transition-colors group">
                  {/* Order Number */}
                  <td className="py-2 px-3 font-mono font-black text-[#0b2942] border-r border-slate-100 whitespace-nowrap">
                    {row.orderNumber}
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
                      <span className="text-[#0b2942] group-hover:underline">{row.customerName}</span>
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

                  {/* Suburb */}
                  <td className="py-2 px-3 font-semibold border-r border-slate-100 whitespace-nowrap text-slate-700">
                    {row.suburb || 'Adelaide'} ({row.deliveryZone || 'Zone A'})
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

                  {/* Container Size */}
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
                      <span className="text-[#00c0f3]">{row.containerSize}</span>
                    )}
                  </td>

                  {/* Surface Type (Smartsheet Field) */}
                  <td
                    className="py-2 px-3 font-medium border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                    onClick={() => handleStartEdit(row.id, 'placementSurface', row.placementSurface)}
                  >
                    {editingCell?.rowId === row.id && editingCell.field === 'placementSurface' ? (
                      <select
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          handleSaveEdit(row.id, 'placementSurface');
                        }}
                        autoFocus
                        className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs font-bold"
                      >
                        <option value="Concrete Driveway">Concrete Driveway</option>
                        <option value="Paved Asphalt">Paved Asphalt</option>
                        <option value="Grass / Lawn">Grass / Lawn</option>
                        <option value="Gravel / Dirt">Gravel / Dirt</option>
                        <option value="Roadside / Nature Strip">Roadside / Nature Strip</option>
                      </select>
                    ) : (
                      <span className="text-slate-800 font-semibold">{row.placementSurface || 'Concrete Driveway'}</span>
                    )}
                  </td>

                  {/* Door Orientation (Smartsheet Field) */}
                  <td
                    className="py-2 px-3 font-medium border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                    onClick={() => handleStartEdit(row.id, 'doorOrientation', row.doorOrientation)}
                  >
                    {editingCell?.rowId === row.id && editingCell.field === 'doorOrientation' ? (
                      <select
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          handleSaveEdit(row.id, 'doorOrientation');
                        }}
                        autoFocus
                        className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs font-bold"
                      >
                        <option value="Doors Facing Street / Road">Doors Facing Street</option>
                        <option value="Doors Facing House / Property">Doors Facing House</option>
                        <option value="Driver Discretion">Driver Discretion</option>
                      </select>
                    ) : (
                      <span className="text-slate-700">{row.doorOrientation || 'Doors Facing Street'}</span>
                    )}
                  </td>

                  {/* Gate Clearance */}
                  <td
                    className="py-2 px-3 border-r border-slate-100 cursor-pointer hover:bg-sky-100/50 whitespace-nowrap"
                    onClick={() => handleStartEdit(row.id, 'accessGateWidth', row.accessGateWidth)}
                  >
                    {editingCell?.rowId === row.id && editingCell.field === 'accessGateWidth' ? (
                      <select
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          handleSaveEdit(row.id, 'accessGateWidth');
                        }}
                        autoFocus
                        className="px-1.5 py-0.5 rounded border border-sky-400 bg-white text-xs"
                      >
                        <option value="Wide Open (>3.5m)">Wide Open (&gt;3.5m)</option>
                        <option value="Standard (3.0m - 3.5m)">Standard (3.0m–3.5m)</option>
                        <option value="Narrow (<3.0m - Caution)">Narrow (&lt;3.0m)</option>
                      </select>
                    ) : (
                      <span className="text-slate-600">{row.accessGateWidth || 'Wide Open (>3.5m)'}</span>
                    )}
                  </td>

                  {/* Delivery Date */}
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
                      <span>{row.scheduledDeliveryDate}</span>
                    )}
                  </td>

                  {/* Driver */}
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
              ))
            )}
          </tbody>
        </table>
      </div>

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
              Paste CSV text exported from your Smartsheet <strong>&ldquo;portabox smart sheet Ai agent&rdquo;</strong>.
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
    </div>
  );
};
