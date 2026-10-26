import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Edit3,
  ArrowLeftRight,
  ExternalLink,
  Truck,
  CreditCard,
  Tag,
  Calendar,
  Clock,
  User,
  Check,
  ShieldCheck,
  Sparkles,
  Send,
  Layers,
  Phone,
} from 'lucide-react';
import {
  SmartsheetRow,
  SmartsheetInvoiceRow,
  SmartsheetTariffRow,
  SmartsheetConfig,
  YardReviewStatus,
  loadSmartsheetConfig,
  loadSmartsheetStagingRows,
  loadSmartsheetInvoices,
  loadSmartsheetTariffs,
  syncAllToSmartsheet,
  updateSmartsheetBookingRowTwoWay,
  updateSmartsheetInvoiceRowTwoWay,
  addSmartsheetInvoiceRowTwoWay,
  updateSmartsheetTariffRow,
  downloadSmartsheetTemplateCSV,
} from '../services/smartsheetService';
import {
  loadCustomerAccounts,
  setCurrentUserSession,
  ContainerOrder,
} from '../services/customerPortalService';
import { SmartsheetGridView } from './admin/SmartsheetGridView';
import { AdminPhoneIntakeDrawer } from './admin/AdminPhoneIntakeDrawer';
import { loadAppConfig } from '../services/pricingEngine';
import { FinancialDataExportModal } from './admin/FinancialDataExportModal';

interface SmartsheetWorkspaceProps {
  onOpenCustomerPortalForCustomer?: (customerEmail: string) => void;
  compactHeader?: boolean;
}

export const SmartsheetWorkspace: React.FC<SmartsheetWorkspaceProps> = ({
  onOpenCustomerPortalForCustomer,
  compactHeader = false,
}) => {
  const [activeSheet, setActiveSheet] = useState<
    'bookings_billing' | 'invoices_ledger' | 'dispatch_yard' | 'tariffs_pricing'
  >('bookings_billing');

  const [config, setConfig] = useState<SmartsheetConfig>(loadSmartsheetConfig());
  const [bookingRows, setBookingRows] = useState<SmartsheetRow[]>(loadSmartsheetStagingRows());
  const [invoiceRows, setInvoiceRows] = useState<SmartsheetInvoiceRow[]>(loadSmartsheetInvoices());
  const [tariffRows, setTariffRows] = useState<SmartsheetTariffRow[]>(loadSmartsheetTariffs());

  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveSyncBanner, setLiveSyncBanner] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('grid');
  const [isPhoneIntakeOpen, setIsPhoneIntakeOpen] = useState(false);

  // Call Center Row Editor Drawer / Modal for deep editing a booking/billing row
  const [editingRow, setEditingRow] = useState<SmartsheetRow | null>(null);

  // New Invoice Modal in Sheet 2
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [newInvCustomerId, setNewInvCustomerId] = useState('CUST-8021');
  const [newInvDesc, setNewInvDesc] = useState('Additional Monthly Container Storage / Call Center Adjustment');
  const [newInvAmount, setNewInvAmount] = useState<number>(259);
  const [newInvStatus, setNewInvStatus] = useState<'Paid' | 'Pending' | 'Overdue'>('Pending');
  const [showFinancialExportModal, setShowFinancialExportModal] = useState(false);

  const refreshAllSheets = () => {
    setConfig(loadSmartsheetConfig());
    setBookingRows(loadSmartsheetStagingRows());
    setInvoiceRows(loadSmartsheetInvoices());
    setTariffRows(loadSmartsheetTariffs());
  };

  useEffect(() => {
    refreshAllSheets();
    const handleSyncEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      refreshAllSheets();
      if (customEvent.detail?.summary) {
        setLiveSyncBanner(customEvent.detail.summary);
        setTimeout(() => setLiveSyncBanner(null), 5000);
      }
    };
    window.addEventListener('portabox-smartsheet-sync', handleSyncEvent);
    return () => window.removeEventListener('portabox-smartsheet-sync', handleSyncEvent);
  }, []);

  const handleManualFullSync = async () => {
    setIsSyncing(true);
    const res = await syncAllToSmartsheet();
    refreshAllSheets();
    setIsSyncing(false);
    setLiveSyncBanner(res.message);
    setTimeout(() => setLiveSyncBanner(null), 5000);
  };

  // Inline cell update handler for Sheet 1 & Sheet 3
  const handleInlineRowUpdate = (
    orderNumber: string,
    updates: Partial<SmartsheetRow>,
    description?: string
  ) => {
    const res = updateSmartsheetBookingRowTwoWay(orderNumber, updates, description);
    setBookingRows(res.rows);
    setInvoiceRows(loadSmartsheetInvoices());
    setConfig(loadSmartsheetConfig());
    setLiveSyncBanner(res.summary);
    setTimeout(() => setLiveSyncBanner(null), 5000);
  };

  // Save full Call Center Row Editor modal
  const handleSaveRowEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    handleInlineRowUpdate(editingRow.orderNumber, editingRow);
    setEditingRow(null);
  };

  // Inline invoice update handler for Sheet 2
  const handleInlineInvoiceUpdate = (
    invoiceNumber: string,
    updates: Partial<SmartsheetInvoiceRow>
  ) => {
    const updated = updateSmartsheetInvoiceRowTwoWay(invoiceNumber, updates);
    setInvoiceRows(updated);
    setBookingRows(loadSmartsheetStagingRows());
    setConfig(loadSmartsheetConfig());
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = addSmartsheetInvoiceRowTwoWay({
      customerId: newInvCustomerId,
      description: newInvDesc,
      amount: newInvAmount,
      status: newInvStatus,
    });
    setInvoiceRows(updated);
    setBookingRows(loadSmartsheetStagingRows());
    setConfig(loadSmartsheetConfig());
    setShowNewInvoiceModal(false);
  };

  const handleOpenPortalForRow = (row: SmartsheetRow) => {
    const accounts = loadCustomerAccounts();
    const match = accounts.find(
      (a) => a.id === row.customerId || a.email.toLowerCase() === row.customerEmail.toLowerCase()
    );
    if (match) {
      setCurrentUserSession(match);
    }
    if (onOpenCustomerPortalForCustomer) {
      onOpenCustomerPortalForCustomer(row.customerEmail);
    }
  };

  const filteredBookingRows = bookingRows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.orderNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.customerEmail.toLowerCase().includes(q) ||
      r.containerId.toLowerCase().includes(q) ||
      r.deliveryAddress.toLowerCase().includes(q) ||
      r.paymentStatus.toLowerCase().includes(q)
    );
  });

  const filteredInvoiceRows = invoiceRows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.invoiceNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Architecture & Two-Way Bridge Header */}
      <div className="bg-gradient-to-r from-[#0b2942] via-[#0e3556] to-[#082238] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00c0f3] text-white shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                TWO-WAY SMARTSHEET INTERMEDIARY BRIDGE
              </span>
              <span className="text-[11px] text-sky-200 font-mono">
                App / Customer Portal ⇄ Smartsheet Grid ⇄ Call Center Operations
              </span>
            </div>
            <h3 className={compactHeader ? 'text-lg font-black' : 'text-xl sm:text-2xl font-black'}>
              Interactive Two-Way Smartsheets (Bookings, Billing, Dispatch & Tariffs)
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Customer bookings, billing plans, payments, and self-service requests from the app &amp; Customer Portal automatically write to these intermediary Smartsheets. <strong>Any cell edited below by the Call Center immediately updates the live App and the Customer Portal.</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleManualFullSync}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-[#00c0f3] hover:bg-[#00a8d6] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Two-Way...' : 'Sync All Sheets Now'}</span>
            </button>

            <button
              type="button"
              onClick={() => downloadSmartsheetTemplateCSV(bookingRows)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Visual Two-Way Flow Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-[#00c0f3] font-black shrink-0">
              1
            </div>
            <div>
              <div className="font-extrabold text-white">App &amp; Customer Portal → Smartsheet</div>
              <div className="text-[11px] text-slate-300">
                New quotes, Braintree payments, pickup requests &amp; access notes auto-populate rows.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/30 flex items-center justify-center text-emerald-300 font-black shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-emerald-200">Intermediary Smartsheet Validation</div>
              <div className="text-[11px] text-emerald-100/90">
                Call Center reviews bookings, adjusts slots/rates, applies credits, or marks invoices Paid.
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 font-black shrink-0">
              3
            </div>
            <div>
              <div className="font-extrabold text-white">Smartsheet → Customer Portal &amp; App</div>
              <div className="text-[11px] text-slate-300">
                Edits push instantaneously to Customer Portal delivery ETA, invoices, discounts &amp; calendar.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Two-Way Sync Toast Banner */}
      {liveSyncBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{liveSyncBanner}</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md shrink-0">
            LIVE 2-WAY SYNC
          </span>
        </div>
      )}

      {/* 4 Intermediary Smartsheets Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSheet('bookings_billing')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSheet === 'bookings_billing'
                ? 'bg-[#0b2942] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#00c0f3]" />
            <span>Sheet 1: Customer Bookings, Billing &amp; Payments ({bookingRows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSheet('invoices_ledger')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSheet === 'invoices_ledger'
                ? 'bg-[#0b2942] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>Sheet 2: Invoices &amp; Billing Ledger ({invoiceRows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSheet('dispatch_yard')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSheet === 'dispatch_yard'
                ? 'bg-[#0b2942] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4 text-amber-500" />
            <span>Sheet 3: Dispatch &amp; Yard Operations ({bookingRows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSheet('tariffs_pricing')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSheet === 'tariffs_pricing'
                ? 'bg-[#0b2942] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-500" />
            <span>Sheet 4: Live Tariffs &amp; Competitor Rates ({tariffRows.length})</span>
          </button>
        </div>

        {/* View Mode Toggle, Phone Booking, and Search Input */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#0b2942] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>Smartsheet Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#0b2942] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>Card Dispatch</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPhoneIntakeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-[#00c0f3] hover:from-sky-600 hover:to-[#00a6d2] text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
            title="15% Call-In Intake: Fill form for caller and dispatch quote via Email, SMS, or Customer Portal"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>+ 15% Call-In Intake</span>
          </button>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rows..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          SHEET 1: CUSTOMER BOOKINGS, BILLING & PAYMENTS SMARTSHEET (TWO-WAY)
         ===================================================================== */}
      {activeSheet === 'bookings_billing' && (
        viewMode === 'grid' ? (
          <SmartsheetGridView
            rows={bookingRows}
            onRefreshRows={(updated) => setBookingRows(updated)}
            onOpenPhoneIntake={() => setIsPhoneIntakeOpen(true)}
            sheetName="portabox smart sheet Ai agent"
            userEmail="ahammo@gmail.com"
          />
        ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-sky-100 text-[#0b2942] px-2 py-0.5 rounded">
                SHEET ID: {config.bookingsSheetId}
              </span>
              <span className="font-extrabold text-[#0b2942]">
                Customer Bookings, Billing &amp; Payment Intermediary Sheet
              </span>
              <span className="text-slate-500 hidden md:inline">
                — Click any dropdown or cell to edit directly. Changes sync immediately to the Customer Portal.
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Two-Way Portal Sync Active</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0b2942] text-white uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="p-3 border-r border-slate-700/60 text-center w-8">#</th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap">Order &amp; Account</th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap">Customer Details</th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap bg-sky-900/60">
                    Container &amp; Size (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap bg-sky-900/60">
                    Delivery Date &amp; Slot (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap bg-[#00c0f3] text-white">
                    Portal Order Status (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap bg-emerald-900/70">
                    Billing Plan &amp; Rate (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap bg-emerald-900/70">
                    Payment Status (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap bg-emerald-900/70">
                    Call Center Credit ($)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 whitespace-nowrap">
                    Pickup &amp; Access Notes
                  </th>
                  <th className="p-3 whitespace-nowrap text-center">Two-Way Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBookingRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-sky-50/30 transition-colors">
                    {/* Row Number */}
                    <td className="p-2.5 text-center font-mono text-[11px] text-slate-400 bg-slate-50 border-r border-slate-200">
                      {index + 1}
                    </td>

                    {/* Order & Account */}
                    <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                      <div className="font-mono font-black text-[#0b2942]">{row.orderNumber}</div>
                      <div className="text-[10px] font-mono text-slate-400">{row.customerId}</div>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          row.lastUpdatedBy === 'Customer Portal'
                            ? 'bg-purple-100 text-purple-800'
                            : row.lastUpdatedBy === 'Call Center Smartsheet'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Via: {row.lastUpdatedBy}
                      </span>
                    </td>

                    {/* Customer Details */}
                    <td className="p-3 border-r border-slate-200 min-w-[160px]">
                      <div className="font-extrabold text-[#0b2942]">{row.customerName}</div>
                      <div className="text-[11px] text-slate-600 font-mono">{row.customerPhone}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{row.customerEmail}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[160px] mt-0.5" title={row.deliveryAddress}>
                        📍 {row.deliveryAddress}
                      </div>
                    </td>

                    {/* Container & Size (Editable) */}
                    <td className="p-2.5 border-r border-slate-200 bg-sky-50/20 whitespace-nowrap space-y-1">
                      <input
                        type="text"
                        value={row.containerId}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, { containerId: e.target.value })
                        }
                        className="w-28 px-2 py-1 rounded border border-slate-200 bg-white font-mono font-bold text-[11px] text-[#0b2942] focus:ring-1 focus:ring-[#00c0f3]"
                        title="Edit Container Asset ID"
                      />
                      <select
                        value={row.containerSize}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, { containerSize: e.target.value })
                        }
                        className="block w-28 px-1.5 py-1 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="10 m³">10 m³</option>
                        <option value="19 m³">19 m³</option>
                        <option value="25 m³">25 m³</option>
                        <option value="50 m³ (2x 25m³)">50 m³ (2x 25m³)</option>
                      </select>
                    </td>

                    {/* Delivery Date & Slot Window (Editable) */}
                    <td className="p-2.5 border-r border-slate-200 bg-sky-50/20 whitespace-nowrap space-y-1">
                      <input
                        type="text"
                        value={row.scheduledDeliveryDate}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, { scheduledDeliveryDate: e.target.value })
                        }
                        className="w-36 px-2 py-1 rounded border border-slate-200 bg-white font-mono text-[11px] font-bold text-[#0b2942]"
                      />
                      <select
                        value={row.deliveryWindow}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, { deliveryWindow: e.target.value })
                        }
                        className="block w-36 px-1.5 py-1 rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="9:00 AM – 11:30 AM (Morning Window)">9:00 AM – 11:30 AM</option>
                        <option value="11:30 AM – 2:00 PM (Midday Window)">11:30 AM – 2:00 PM</option>
                        <option value="1:30 PM – 4:00 PM">1:30 PM – 4:00 PM</option>
                        <option value="2:00 PM – 4:30 PM (Afternoon Window)">2:00 PM – 4:30 PM</option>
                        <option value="4:30 PM – 7:00 PM (Evening Window)">4:30 PM – 7:00 PM</option>
                      </select>
                    </td>

                    {/* Portal Order Status (Editable) */}
                    <td className="p-2.5 border-r border-slate-200 bg-sky-50/40 whitespace-nowrap">
                      <select
                        value={row.orderStatus}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, {
                            orderStatus: e.target.value as ContainerOrder['status'],
                          })
                        }
                        className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-extrabold cursor-pointer ${
                          row.orderStatus === 'Placed at Customer'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : row.orderStatus === 'Out for Delivery'
                            ? 'bg-sky-50 border-sky-300 text-sky-800'
                            : row.orderStatus === 'Scheduled'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                            : 'bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Placed at Customer">Placed at Customer</option>
                        <option value="Stored at Depot">Stored at Depot</option>
                        <option value="Collected">Collected</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                        <span>ETA hrs:</span>
                        <input
                          type="number"
                          min={0}
                          value={row.timeToDeliveryHours}
                          onChange={(e) =>
                            handleInlineRowUpdate(row.orderNumber, {
                              timeToDeliveryHours: Number(e.target.value),
                            })
                          }
                          className="w-14 px-1 py-0.5 rounded border border-slate-200 bg-white font-mono text-right text-[10px] font-bold"
                        />
                      </div>
                    </td>

                    {/* Billing Plan & Rate (Editable) */}
                    <td className="p-2.5 border-r border-slate-200 bg-emerald-50/20 whitespace-nowrap space-y-1">
                      <select
                        value={row.paymentPlan}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, { paymentPlan: e.target.value })
                        }
                        className="w-40 px-1.5 py-1 rounded border border-slate-200 bg-white text-[11px] font-bold text-[#0b2942] cursor-pointer"
                      >
                        <option value="Monthly Automatic Debit">Monthly Automatic Debit</option>
                        <option value="Weekly Debit">Weekly Debit</option>
                        <option value="3 Months Upfront Prepayment">3 Months Upfront</option>
                        <option value="6 Months Upfront Prepayment">6 Months Upfront</option>
                        <option value="12 Months Upfront Prepayment">12 Months Upfront</option>
                      </select>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-slate-500 font-bold">$</span>
                        <input
                          type="number"
                          value={row.periodicRateAud}
                          onChange={(e) =>
                            handleInlineRowUpdate(row.orderNumber, {
                              periodicRateAud: Number(e.target.value),
                            })
                          }
                          className="w-16 px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono font-bold text-[#0b2942]"
                        />
                        <span className="text-[10px] text-slate-400">/period</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Next: <span className="font-mono text-slate-600">{row.nextBillingDate}</span>
                      </div>
                    </td>

                    {/* Payment Status & Paid/Due (Editable) */}
                    <td className="p-2.5 border-r border-slate-200 bg-emerald-50/20 whitespace-nowrap space-y-1">
                      <select
                        value={row.paymentStatus}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, {
                            paymentStatus: e.target.value as 'Paid' | 'Pending' | 'Overdue',
                          })
                        }
                        className={`w-28 px-2 py-1 rounded-lg border text-[11px] font-black uppercase cursor-pointer ${
                          row.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : row.paymentStatus === 'Overdue'
                            ? 'bg-red-100 border-red-300 text-red-800'
                            : 'bg-amber-100 border-amber-300 text-amber-800'
                        }`}
                      >
                        <option value="Paid">PAID</option>
                        <option value="Pending">PENDING</option>
                        <option value="Overdue">OVERDUE</option>
                      </select>
                      <div className="text-[10px] font-mono text-slate-600">
                        Paid: <strong className="text-emerald-700">${row.amountPaid}</strong>
                      </div>
                      {row.balanceDueAud > 0 && (
                        <div className="text-[10px] font-mono text-red-600 font-bold">
                          Due: ${row.balanceDueAud}
                        </div>
                      )}
                    </td>

                    {/* Call Center Courtesy Discount / Credit ($) */}
                    <td className="p-2.5 border-r border-slate-200 bg-emerald-50/10 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-700 font-bold text-xs">-$</span>
                        <input
                          type="number"
                          min={0}
                          step={10}
                          value={row.callCenterDiscountAud}
                          onChange={(e) =>
                            handleInlineRowUpdate(row.orderNumber, {
                              callCenterDiscountAud: Number(e.target.value),
                              callCenterDiscountReason: 'Call Center Smartsheet Special Discount',
                            })
                          }
                          className="w-20 px-2 py-1 rounded border border-emerald-300 bg-emerald-50/50 font-mono font-black text-emerald-800 text-xs"
                          title="Increase discount to award a Call Center credit in Customer Portal"
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Syncs to Portal Discounts
                      </span>
                    </td>

                    {/* Pickup & Access Notes */}
                    <td className="p-2.5 border-r border-slate-200 max-w-[200px]">
                      {row.pickupRequestedDate ? (
                        <div className="mb-1 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold">
                          📦 Pickup Req: {row.pickupRequestedDate}
                        </div>
                      ) : null}
                      <input
                        type="text"
                        value={row.accessNotes}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, { accessNotes: e.target.value })
                        }
                        className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-[11px] text-slate-700"
                        placeholder="Driver & placement notes..."
                      />
                    </td>

                    {/* Two-Way Actions */}
                    <td className="p-2.5 whitespace-nowrap text-center space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingRow(row)}
                        className="w-full px-2.5 py-1.5 bg-[#0b2942] hover:bg-[#081e30] text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3 h-3 text-[#00c0f3]" />
                        <span>Call Center Edit</span>
                      </button>

                      {onOpenCustomerPortalForCustomer && (
                        <button
                          type="button"
                          onClick={() => handleOpenPortalForRow(row)}
                          className="w-full px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0b2942] border border-sky-200 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 text-[#00c0f3]" />
                          <span>Verify in Portal</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* =====================================================================
          SHEET 2: INVOICES & BILLING LEDGER SMARTSHEET
         ===================================================================== */}
      {activeSheet === 'invoices_ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                SHEET ID: {config.invoicesSheetId}
              </span>
              <span className="font-extrabold text-[#0b2942]">
                Customer Invoices, Payments &amp; AASB-15 Billing Ledger Sheet
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowFinancialExportModal(true)}
                className="px-3.5 py-1.5 bg-[#0b2942] hover:bg-[#15385E] text-[#00c0f3] rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Export Financial Data (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewInvoiceModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue New Invoice / Charge to Customer Portal</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0b2942] text-white uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="p-3 border-r border-slate-700/60 text-center w-8">#</th>
                  <th className="p-3 border-r border-slate-700/60">Invoice #</th>
                  <th className="p-3 border-r border-slate-700/60">Customer</th>
                  <th className="p-3 border-r border-slate-700/60">Date / Due</th>
                  <th className="p-3 border-r border-slate-700/60 bg-sky-900/60">
                    Description (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 text-right bg-sky-900/60">
                    Amount AUD (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 text-right">GST (10%)</th>
                  <th className="p-3 border-r border-slate-700/60 bg-[#00c0f3] text-white">
                    Payment Status (2-Way Sync)
                  </th>
                  <th className="p-3 border-r border-slate-700/60">Revenue Recognition</th>
                  <th className="p-3">Payment Method &amp; Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoiceRows.map((inv, idx) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="p-2.5 text-center font-mono text-[11px] text-slate-400 bg-slate-50 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-mono font-bold text-[#0b2942] whitespace-nowrap">
                      {inv.invoiceNumber}
                      <div className="text-[10px] text-slate-400">{inv.orderNumber}</div>
                    </td>
                    <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                      <div className="font-bold text-[#0b2942]">{inv.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.customerId}</div>
                    </td>
                    <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{inv.date}</div>
                      <div className="text-[10px] text-slate-400">Due: {inv.dueDate}</div>
                    </td>
                    <td className="p-2.5 border-r border-slate-200 min-w-[220px]">
                      <input
                        type="text"
                        value={inv.description}
                        onChange={(e) =>
                          handleInlineInvoiceUpdate(inv.invoiceNumber, { description: e.target.value })
                        }
                        className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs text-slate-800 font-medium"
                      />
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          value={inv.amount}
                          onChange={(e) =>
                            handleInlineInvoiceUpdate(inv.invoiceNumber, {
                              amount: Number(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 rounded border border-slate-200 bg-white font-mono font-black text-right text-[#0b2942]"
                        />
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-right font-mono text-slate-500 whitespace-nowrap">
                      ${inv.gstAmount.toFixed(2)}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 bg-sky-50/40 whitespace-nowrap">
                      <select
                        value={inv.status}
                        onChange={(e) =>
                          handleInlineInvoiceUpdate(inv.invoiceNumber, {
                            status: e.target.value as 'Paid' | 'Pending' | 'Overdue',
                          })
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-black uppercase cursor-pointer ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : inv.status === 'Overdue'
                            ? 'bg-red-100 border-red-300 text-red-800'
                            : 'bg-amber-100 border-amber-300 text-amber-800'
                        }`}
                      >
                        <option value="Paid">Paid (Settled)</option>
                        <option value="Pending">Pending</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {inv.revenueType}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-[11px] font-medium text-slate-700">{inv.paymentMethod}</div>
                      <div className="text-[10px] font-mono text-slate-400">{inv.transactionRef}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SHEET 3: DISPATCH, YARD REVIEW & DRIVER MOBILE SMARTSHEET
         ===================================================================== */}
      {activeSheet === 'dispatch_yard' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                SHEET ID: 4829-DISPATCH-03
              </span>
              <span className="font-extrabold text-[#0b2942]">
                Yard Prep, Horizontal Level-Lift Truck Allocation &amp; Driver Dispatch Sheet
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Updating Yard Status or Driver immediately updates the Customer Portal Live Delivery Tracker.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0b2942] text-white uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="p-3 border-r border-slate-700/60">Order #</th>
                  <th className="p-3 border-r border-slate-700/60">Customer &amp; Site</th>
                  <th className="p-3 border-r border-slate-700/60">Container ID</th>
                  <th className="p-3 border-r border-slate-700/60 bg-[#00c0f3] text-white">
                    Yard Dispatch Status (2-Way Sync)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 bg-sky-900/60">
                    Assigned Driver (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60">Delivery Window</th>
                  <th className="p-3 border-r border-slate-700/60">Dispatch Hold Check</th>
                  <th className="p-3">Driver Placement Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBookingRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="p-3 border-r border-slate-200 font-mono font-black text-[#0b2942]">
                      {row.orderNumber}
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-[#0b2942]">{row.customerName}</div>
                      <div className="text-[11px] text-slate-500">{row.deliveryAddress}</div>
                    </td>
                    <td className="p-3 border-r border-slate-200 font-mono font-bold text-[#0b2942]">
                      {row.containerId} ({row.containerSize})
                    </td>
                    <td className="p-2.5 border-r border-slate-200 bg-sky-50/40">
                      <select
                        value={row.yardReviewStatus}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, {
                            yardReviewStatus: e.target.value as YardReviewStatus,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-sky-300 bg-white text-xs font-bold text-[#0b2942] cursor-pointer"
                      >
                        <option value="Pending Inspection">Pending Inspection</option>
                        <option value="Container Washed & Tagged">Container Washed &amp; Tagged</option>
                        <option value="Loaded on Level-Lift Truck">Loaded on Level-Lift Truck</option>
                        <option value="Dispatched - En Route">Dispatched - En Route</option>
                        <option value="Delivered to Site">Delivered to Site</option>
                        <option value="Returned to Depot">Returned to Depot</option>
                      </select>
                    </td>
                    <td className="p-2.5 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.assignedDriver}
                        onChange={(e) =>
                          handleInlineRowUpdate(row.orderNumber, { assignedDriver: e.target.value })
                        }
                        className="w-48 px-2 py-1 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                      />
                    </td>
                    <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                      <div className="font-bold text-[#0b2942]">{row.scheduledDeliveryDate}</div>
                      <div className="text-[10px] text-slate-500">{row.deliveryWindow}</div>
                    </td>
                    <td className="p-3 border-r border-slate-200 whitespace-nowrap">
                      {row.operationalHold ? (
                        <span className="px-2 py-1 rounded bg-red-100 text-red-800 font-black text-[10px]">
                          ⚠ HOLD (Overdue Invoice)
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">
                          ✓ CLEAR TO DISPATCH
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 italic text-[11px]">{row.accessNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SHEET 4: LIVE TARIFFS & COMPETITOR BENCHMARK SMARTSHEET
         ===================================================================== */}
      {activeSheet === 'tariffs_pricing' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                SHEET ID: {config.tariffsSheetId}
              </span>
              <span className="font-extrabold text-[#0b2942]">
                Live Tariffs, Surcharges &amp; Competitor Benchmark Intermediary Sheet
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Editing any Portabox Rate below immediately updates the live Quoting Flow calculator.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0b2942] text-white uppercase text-[10px] font-extrabold tracking-wider">
                <tr>
                  <th className="p-3 border-r border-slate-700/60">Item Code</th>
                  <th className="p-3 border-r border-slate-700/60">Category</th>
                  <th className="p-3 border-r border-slate-700/60">Tariff Item Description</th>
                  <th className="p-3 border-r border-slate-700/60 bg-[#00c0f3] text-white text-right">
                    Portabox Rate AUD (Editable)
                  </th>
                  <th className="p-3 border-r border-slate-700/60 text-right">
                    Competitor Benchmark (Modular Containers)
                  </th>
                  <th className="p-3 border-r border-slate-700/60">Billing Unit</th>
                  <th className="p-3">Intermediary Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tariffRows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="p-3 border-r border-slate-200 font-mono font-bold text-[#0b2942]">
                      {t.itemCode}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-semibold text-slate-600">
                      {t.category}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-extrabold text-[#0b2942]">
                      {t.itemName}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 bg-sky-50/40 text-right">
                      <div className="inline-flex items-center gap-1">
                        <span className="font-bold text-slate-500">$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={t.portaboxRateAud}
                          onChange={(e) => {
                            const updated = updateSmartsheetTariffRow(
                              t.itemCode,
                              Number(e.target.value)
                            );
                            setTariffRows(updated);
                          }}
                          className="w-24 px-2 py-1 rounded border border-sky-300 bg-white font-mono font-black text-right text-[#0b2942]"
                        />
                      </div>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-right font-mono text-slate-500">
                      ${t.competitorRateAud}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-slate-500">{t.billingUnit}</td>
                    <td className="p-3 text-[11px] text-slate-600">{t.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          CALL CENTER FULL ROW EDITOR MODAL (DEEP TWO-WAY UPDATE)
         ===================================================================== */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#00c0f3] text-white px-2.5 py-0.5 rounded-full">
                  CALL CENTER SMARTSHEET ROW EDITOR
                </span>
                <h4 className="text-lg font-black text-[#0b2942] mt-1">
                  Edit Order #{editingRow.orderNumber} ({editingRow.customerName})
                </h4>
                <p className="text-xs text-slate-500">
                  Saving this row pushes all booking, billing, payment, and discount updates directly to the Customer Portal &amp; App.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRowEditor} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    value={editingRow.customerName}
                    onChange={(e) => setEditingRow({ ...editingRow, customerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Mobile</label>
                  <input
                    type="text"
                    value={editingRow.customerPhone}
                    onChange={(e) => setEditingRow({ ...editingRow, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Delivery Date</label>
                  <input
                    type="text"
                    value={editingRow.scheduledDeliveryDate}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, scheduledDeliveryDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Delivery Time Window</label>
                  <select
                    value={editingRow.deliveryWindow}
                    onChange={(e) => setEditingRow({ ...editingRow, deliveryWindow: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  >
                    <option value="9:00 AM – 11:30 AM (Morning Window)">
                      9:00 AM – 11:30 AM (Morning Window)
                    </option>
                    <option value="11:30 AM – 2:00 PM (Midday Window)">
                      11:30 AM – 2:00 PM (Midday Window)
                    </option>
                    <option value="1:30 PM – 4:00 PM">1:30 PM – 4:00 PM</option>
                    <option value="2:00 PM – 4:30 PM (Afternoon Window)">
                      2:00 PM – 4:30 PM (Afternoon Window)
                    </option>
                    <option value="4:30 PM – 7:00 PM (Evening Window)">
                      4:30 PM – 7:00 PM (Evening Window)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Customer Portal Order Status
                  </label>
                  <select
                    value={editingRow.orderStatus}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        orderStatus: e.target.value as ContainerOrder['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-[#0b2942]"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Placed at Customer">Placed at Customer</option>
                    <option value="Stored at Depot">Stored at Depot</option>
                    <option value="Collected">Collected</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={editingRow.paymentStatus}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        paymentStatus: e.target.value as 'Paid' | 'Pending' | 'Overdue',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  >
                    <option value="Paid">Paid (Settle all open invoices)</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue (Flag overdue alert in Portal)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Periodic Storage Rate ($ AUD)
                  </label>
                  <input
                    type="number"
                    value={editingRow.periodicRateAud}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, periodicRateAud: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Total Discounts / Call Center Credit ($ AUD)
                  </label>
                  <input
                    type="number"
                    value={editingRow.callCenterDiscountAud}
                    onChange={(e) =>
                      setEditingRow({
                        ...editingRow,
                        callCenterDiscountAud: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 font-mono font-bold text-emerald-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Delivery Address / Placement Location
                  </label>
                  <input
                    type="text"
                    value={editingRow.deliveryAddress}
                    onChange={(e) =>
                      setEditingRow({ ...editingRow, deliveryAddress: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Driver Placement &amp; Access Notes (Two-Way with Customer Portal)
                  </label>
                  <textarea
                    rows={2}
                    value={editingRow.accessNotes}
                    onChange={(e) => setEditingRow({ ...editingRow, accessNotes: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00c0f3] hover:bg-[#00a8d6] text-white font-extrabold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save in Smartsheet &amp; Push to Customer Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          ISSUE NEW INVOICE MODAL (SHEET 2 -> CUSTOMER PORTAL)
         ===================================================================== */}
      {showNewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-black text-[#0b2942]">
                Add Invoice Row in Smartsheet → Customer Portal
              </h4>
              <button
                type="button"
                onClick={() => setShowNewInvoiceModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Customer Account</label>
                <select
                  value={newInvCustomerId}
                  onChange={(e) => setNewInvCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  {loadCustomerAccounts().map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.id} - {c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Description</label>
                <input
                  type="text"
                  value={newInvDesc}
                  onChange={(e) => setNewInvDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount ($ AUD)</label>
                  <input
                    type="number"
                    value={newInvAmount}
                    onChange={(e) => setNewInvAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newInvStatus}
                    onChange={(e) =>
                      setNewInvStatus(e.target.value as 'Paid' | 'Pending' | 'Overdue')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold cursor-pointer"
                >
                  Create &amp; Push to Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TWO-WAY SMARTSHEET SYNC LOG & AUDIT STREAM
         ===================================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-[#00c0f3]" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0b2942]">
              Live Two-Way Smartsheet Communication Log (App &amp; Portal ⇄ Smartsheet)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Last Sync: {config.lastSyncTime}
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {config.syncHistory.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 mt-0.5 ${
                    log.direction === 'sheet_to_portal'
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : log.direction === 'portal_to_sheet'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : log.direction === 'inbound_webhook'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {log.direction === 'sheet_to_portal'
                    ? 'SMARTSHEET → PORTAL'
                    : log.direction === 'portal_to_sheet'
                    ? 'PORTAL → SMARTSHEET'
                    : log.direction === 'inbound_webhook'
                    ? 'WEBHOOK → APP'
                    : 'APP → SMARTSHEET'}
                </span>
                <div>
                  <span className="font-extrabold text-[#0b2942]">{log.action}</span>
                  <span className="text-slate-400 text-[10px] ml-2">({log.timestamp})</span>
                  <p className="text-slate-600 text-[11px] mt-0.5">{log.details}</p>
                </div>
              </div>
              {log.sheetName && (
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                  {log.sheetName}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Call Center Phone Intake Drawer */}
      <AdminPhoneIntakeDrawer
        isOpen={isPhoneIntakeOpen}
        onClose={() => setIsPhoneIntakeOpen(false)}
        config={loadAppConfig()}
        initialNoPhoneOrEmail={true}
        onBookingCreated={() => {
          refreshAllSheets();
        }}
      />

      {/* Financial Data CSV Extraction & Duration Query Modal */}
      <FinancialDataExportModal
        isOpen={showFinancialExportModal}
        onClose={() => setShowFinancialExportModal(false)}
        defaultStartDate="2026-01-01"
        defaultEndDate="2026-03-31"
      />
    </div>
  );
};
