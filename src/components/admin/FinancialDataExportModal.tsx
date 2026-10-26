import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  DollarSign,
  Layers,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  extractFinancialRecords,
  exportFinancialDataToCSV,
  PRESET_FINANCIAL_DATE_RANGES,
  FinancialRecord,
} from '../../services/financialExportService';

interface FinancialDataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export const FinancialDataExportModal: React.FC<FinancialDataExportModalProps> = ({
  isOpen,
  onClose,
  defaultStartDate = '2026-01-01',
  defaultEndDate = '2026-03-31',
}) => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('q1_2026');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const { records, summary } = useMemo(() => {
    return extractFinancialRecords({
      startDate,
      endDate,
      statusFilter,
      searchTerm,
    });
  }, [startDate, endDate, statusFilter, searchTerm]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: (typeof PRESET_FINANCIAL_DATE_RANGES)[number]) => {
    setSelectedPresetId(preset.id);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  const handleDownloadCSV = () => {
    if (records.length === 0) {
      alert('No financial records found in the specified duration.');
      return;
    }
    exportFinancialDataToCSV(records, { startDate, endDate });
    setDownloadSuccessToast(
      `✓ Exported ${records.length} financial records (${startDate} to ${endDate}) to CSV!`
    );
    setTimeout(() => setDownloadSuccessToast(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-5xl rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0b2942] text-[#00c0f3] flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                  FINANCIAL EXTRACTION ENGINE
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  Invoices · Payments · GST · Container Ledgers
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#0b2942] mt-0.5">
                Financial Data CSV Export &amp; Query Duration
              </h3>
              <p className="text-xs text-slate-500">
                Set query duration (e.g. <strong>Jan 1 2026 to Mar 31 2026</strong>) to extract complete audit-ready invoicing, payment receipts, taxes, and customer records.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Controls Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {downloadSuccessToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{downloadSuccessToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setDownloadSuccessToast(null)}
                className="text-white hover:text-emerald-200 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Duration Presets Ribbon */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0b2942] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Quick Duration Presets</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to apply instant range</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_FINANCIAL_DATE_RANGES.map((preset) => {
                const isSelected =
                  selectedPresetId === preset.id &&
                  startDate === preset.startDate &&
                  endDate === preset.endDate;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#00c0f3] text-white shadow-xs font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Duration Query Inputs & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs">
            {/* Start Date */}
            <div className="sm:col-span-3 space-y-1">
              <label className="font-extrabold text-slate-700 block">Query Start Date (From)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setSelectedPresetId('');
                  setStartDate(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
            </div>

            {/* End Date */}
            <div className="sm:col-span-3 space-y-1">
              <label className="font-extrabold text-slate-700 block">Query End Date (To)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setSelectedPresetId('');
                  setEndDate(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3 space-y-1">
              <label className="font-extrabold text-slate-700 block">Payment Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              >
                <option value="All">All Invoices &amp; Payments</option>
                <option value="Paid">Paid / Settled Only</option>
                <option value="Pending">Pending Due</option>
                <option value="Overdue">Overdue Balances</option>
              </select>
            </div>

            {/* Search Term */}
            <div className="sm:col-span-3 space-y-1">
              <label className="font-extrabold text-slate-700 block">Search Query</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Invoice #, customer, suburb..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                />
              </div>
            </div>
          </div>

          {/* Financial Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Records</span>
              <div className="text-xl font-black text-[#0b2942]">{summary.recordCount} Transactions</div>
              <span className="text-[10px] text-slate-500">{startDate} to {endDate}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Invoiced (AUD)</span>
              <div className="text-xl font-black text-[#00c0f3] font-mono">
                ${summary.totalGrossAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">Includes 10% GST</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GST 10% (AUD)</span>
              <div className="text-xl font-black text-slate-800 font-mono">
                ${summary.totalGstAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">ATO Remittance</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Revenue (AUD)</span>
              <div className="text-xl font-black text-slate-800 font-mono">
                ${summary.totalNetAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-500">Ex-GST Earnings</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cleared / Settled</span>
              <div className="text-xl font-black text-emerald-600 font-mono">
                ${summary.totalPaidAud.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold">100% Reconciled</span>
            </div>
          </div>

          {/* Financial Records Data Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#0b2942] uppercase tracking-wider">
                Matching Financial Records Preview ({records.length})
              </h4>
              <span className="text-[10px] text-slate-400">
                Ready for full CSV export
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer &amp; Location</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Gross (AUD)</th>
                    <th className="py-2.5 px-3 text-right">GST (10%)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        No financial records found in date range {startDate} to {endDate}.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0b2942]">
                          {r.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {r.displayDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{r.customerName}</div>
                          <div className="text-[10px] text-slate-400">
                            {r.suburb ? `${r.suburb}, ${r.state}` : r.customerEmail}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[240px] truncate text-slate-600" title={r.description}>
                          {r.description}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-[#0b2942]">
                          ${r.grossAmountAud.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          ${r.gstAud.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              r.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : r.paymentStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {r.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {r.paymentMethod}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Query Range: <strong>{startDate}</strong> to <strong>{endDate}</strong> · <strong>{records.length}</strong> transactions selected
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleDownloadCSV}
              disabled={records.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b2942] hover:bg-[#15385E] text-[#00c0f3] text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#00c0f3]" />
              <span>Download Financial CSV ({records.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
