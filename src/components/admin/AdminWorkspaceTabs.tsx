import React from 'react';
import {
  X,
  Plus,
  Save,
  Search,
  CheckCircle,
  ExternalLink,
  RotateCcw,
  Maximize2,
  Minimize2,
  PhoneCall,
  Sparkles,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { AdminTabId } from './AdminSidebar';

export interface WorkspaceTab {
  id: string;
  tabKey: AdminTabId;
  title: string;
  isClosable?: boolean;
  isDirty?: boolean;
  dataId?: string;
}

interface AdminWorkspaceTabsProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onOpenNewQuoteTab: () => void;
  onSave: () => void;
  onCloseAdmin: () => void;
  saveSuccess?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode?: 'crm' | 'smartsheet';
  onToggleViewMode?: (mode: 'crm' | 'smartsheet') => void;
  onOpenPhoneIntake?: () => void;
  onLockSession?: () => void;
  onOpenFinancialExport?: () => void;
}

export const AdminWorkspaceTabs: React.FC<AdminWorkspaceTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenNewQuoteTab,
  onSave,
  onCloseAdmin,
  saveSuccess = false,
  searchQuery,
  onSearchChange,
  viewMode = 'crm',
  onToggleViewMode,
  onOpenPhoneIntake,
  onLockSession,
  onOpenFinancialExport,
}) => {
  return (
    <div className="bg-[#081e30] text-white border-b border-slate-800 flex flex-col shrink-0">
      {/* Top utility row: Global search, View switcher, Phone intake, Save, Back */}
      <div className="h-13 px-4 flex items-center justify-between gap-3 text-xs flex-wrap sm:flex-nowrap">
        {/* Universal Quick Search (HubSpot style) */}
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search customers, quotes, orders, containers, postcodes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] focus:bg-slate-900"
          />
        </div>

        {/* View Mode Switcher: Lead Management vs Classic Smartsheet Grid */}
        {onToggleViewMode && (
          <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-slate-700/80 shadow-xs">
            <button
              type="button"
              onClick={() => onToggleViewMode('crm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'crm'
                  ? 'bg-[#00c0f3] text-white shadow-xs font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Modern Lead Management View (Tariff matrix simulator, interactive drawers, KPI cards)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lead Management</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('smartsheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'smartsheet'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Smartsheet Grid View (Full spreadsheet layout with cell editing and CSV import/export)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Smartsheet View</span>
            </button>
          </div>
        )}

        {/* Global Action buttons */}
        <div className="flex items-center gap-2">
          {onOpenPhoneIntake && (
            <button
              type="button"
              onClick={onOpenPhoneIntake}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
              title="Open instant Phone Intake drawer for fast customer quote & booking collection"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span>Phone Intake</span>
            </button>
          )}

          {saveSuccess && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/90 border border-emerald-800 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saved</span>
            </span>
          )}

          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00c0f3] hover:bg-[#00a8d6] text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          {onOpenFinancialExport && (
            <button
              type="button"
              onClick={onOpenFinancialExport}
              title="Extract Financial Data to CSV (Custom Date Duration e.g. Jan 1 2026 to Mar 31 2026)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-[#00c0f3]/20 border border-slate-700 hover:border-[#00c0f3]/50 text-[#00c0f3] font-bold text-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span className="hidden md:inline">Export Financials CSV</span>
            </button>
          )}

          {onLockSession && (
            <button
              type="button"
              onClick={onLockSession}
              title="Lock Admin Session (Requires Passkey or 2FA to re-open)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-600/60 text-slate-300 hover:text-rose-200 font-bold text-xs transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Lock Session</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCloseAdmin}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Back to App
          </button>
        </div>
      </div>

      {/* Zendesk-style multi-tab horizontal strip */}
      <div className="flex items-center px-2 pt-1 gap-1 overflow-x-auto scrollbar-none bg-slate-950/40">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x select-none max-w-[220px] shrink-0 ${
                isActive
                  ? 'bg-white text-[#0b2942] border-white shadow-xs font-black'
                  : 'bg-slate-900/60 text-slate-300 border-transparent hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span className="truncate">{tab.title}</span>

              {tab.isDirty && (
                <span
                  title="Unsaved changes in this tab"
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                />
              )}

              {tab.isClosable !== false && tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close tab"
                  className={`p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer ${
                    isActive ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onOpenNewQuoteTab}
          title="Open New Live Quote Simulator tab"
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
        >
          <Plus className="w-3.5 h-3.5 text-[#00c0f3]" />
          <span className="text-[11px] font-bold">New Quote</span>
        </button>
      </div>
    </div>
  );
};
