import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Lock,
  Search,
  Filter,
  Download,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  Fingerprint,
  User,
  Radio,
  FileSpreadsheet,
  Plus,
  Info,
  Calendar,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { StaffSession, StaffRole, MfaAuditLogEntry, StaffMember } from '../../types/adminAuth';
import {
  loadMfaAuditLogs,
  saveMfaAuditLogs,
  clearMfaAuditLogs,
  simulateTestMfaAuditLog,
  loadStaffMembers,
  INITIAL_MFA_AUDIT_LOGS,
  setStaffSession,
  INITIAL_STAFF_MEMBERS,
} from '../../services/adminAuthService';

interface StaffMfaAuditLogWorkspaceProps {
  currentSession: StaffSession | null;
  onSwitchToCeo?: () => void;
}

export const StaffMfaAuditLogWorkspace: React.FC<StaffMfaAuditLogWorkspaceProps> = ({
  currentSession,
  onSwitchToCeo,
}) => {
  const [logs, setLogs] = useState<MfaAuditLogEntry[]>(loadMfaAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'dispatched'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'sms' | 'passkey'>('all');
  const [selectedEntry, setSelectedEntry] = useState<MfaAuditLogEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUser = currentSession?.user;
  const isCeo = currentUser?.role === 'ceo';

  // Listen for live audit updates dispatched from AdminLoginModal or other sessions
  useEffect(() => {
    const handleAuditUpdate = () => {
      setLogs(loadMfaAuditLogs());
    };
    window.addEventListener('portabox:mfa-audit-updated', handleAuditUpdate);
    return () => window.removeEventListener('portabox:mfa-audit-updated', handleAuditUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSimulateEvent = (status: 'success' | 'failed' | 'dispatched') => {
    const newEntry = simulateTestMfaAuditLog(status);
    setLogs(loadMfaAuditLogs());
    showToast(
      status === 'success'
        ? `✓ Simulated successful SMS MFA verification for ${newEntry.staffName}`
        : status === 'failed'
        ? `⚠ Simulated suspicious failed login attempt recorded in audit log`
        : `✉ Simulated ClickSend SMS dispatch to ${newEntry.maskedMobile}`
    );
  };

  const handleResetToSeedLogs = () => {
    if (confirm('Reset MFA audit log to initial baseline data?')) {
      saveMfaAuditLogs(INITIAL_MFA_AUDIT_LOGS);
      setLogs(INITIAL_MFA_AUDIT_LOGS);
      showToast('✓ MFA audit log restored to default historical baseline.');
    }
  };

  const handleClearAllLogs = () => {
    if (confirm('Clear all MFA verification audit logs? This action is recorded.')) {
      clearMfaAuditLogs();
      setLogs([]);
      showToast('✓ MFA audit trail cleared.');
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('No audit log entries available to export.');
      return;
    }

    const headers = [
      'Audit_ID',
      'Timestamp_ISO',
      'Staff_Name',
      'Staff_Email',
      'Staff_Role',
      'Masked_Mobile',
      'MFA_Method',
      'Status',
      'Failure_Reason',
      'ClickSend_Message_ID',
      'Carrier_Route',
      'IP_Address',
    ];

    const rows = logs.map((log) => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${log.staffName}"`,
      `"${log.staffEmail}"`,
      `"${log.staffRole.toUpperCase()}"`,
      `"${log.maskedMobile}"`,
      `"${log.method.toUpperCase()}"`,
      `"${log.status.toUpperCase()}"`,
      `"${(log.failureReason || '').replace(/"/g, '""')}"`,
      `"${log.messageId || 'N/A'}"`,
      `"${(log.carrierRoute || 'N/A').replace(/"/g, '""')}"`,
      `"${log.ipAddress || 'Adelaide Gateway'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `portabox_mfa_audit_log_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ MFA Audit CSV exported successfully.');
  };

  // If the logged in user is NOT the CEO, show the security clearance warning
  if (!isCeo) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border-2 border-rose-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-black uppercase tracking-wider border border-rose-200">
            <Lock className="w-3.5 h-3.5" />
            <span>Executive Clearance Required</span>
          </div>
          <h2 className="text-2xl font-black text-[#0b2942]">Staff MFA Verification Audit</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            In accordance with Australian Privacy Principle 11 and Portabox security governance,
            multi-factor authentication access logs and phone verification telemetry are strictly
            restricted to <strong>Dan Harrington (CEO &amp; Managing Director)</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex justify-between pb-1 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Current Logged-in Persona:</span>
            <span className="font-bold text-slate-800">{currentUser?.name || 'Staff Member'} ({currentUser?.role.toUpperCase()})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Required Role:</span>
            <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              CEO (dan.ceo@portabox.com.au)
            </span>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              if (onSwitchToCeo) {
                onSwitchToCeo();
              }
            }}
            className="px-6 py-3 bg-[#0b2942] hover:bg-[#15385E] text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all hover:scale-105"
          >
            <ShieldCheck className="w-4 h-4 text-[#F7D347]" />
            <span>Switch to CEO Persona (Dan Harrington)</span>
          </button>
        </div>
      </div>
    );
  }

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchQuery ||
      log.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.staffEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.maskedMobile.includes(searchQuery) ||
      (log.failureReason && log.failureReason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.messageId && log.messageId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.carrierRoute && log.carrierRoute.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesRole = roleFilter === 'all' || log.staffRole === roleFilter;
    const matchesMethod = methodFilter === 'all' || log.method === methodFilter;

    return matchesSearch && matchesStatus && matchesRole && matchesMethod;
  });

  // Calculate Metrics
  const totalVerifications = logs.length;
  const successfulLogins = logs.filter((l) => l.status === 'success').length;
  const failedAttempts = logs.filter((l) => l.status === 'failed').length;
  const inFlightDispatches = logs.filter((l) => l.status === 'dispatched').length;
  const successRate = totalVerifications > 0 ? Math.round((successfulLogins / totalVerifications) * 100) : 100;

  const staffMembers = loadStaffMembers();
  const enrolledWith2Fa = staffMembers.filter((s) => s.twoFactorEnabled).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-[#0b2942] text-white text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-4 h-4 text-[#F7D347] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CEO Executive Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0b2942] via-[#15385E] to-[#0b2942] text-white border-2 border-slate-700/60 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00c0f3]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-[#F7D347] text-[#0b2942] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-wider flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>CEO Executive Oversight</span>
              </span>
              <span className="bg-[#00c0f3]/20 text-[#00c0f3] border border-[#00c0f3]/40 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                ClickSend SMPP Real-Time
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Feed
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Staff MFA Verification &amp; Security Audit Log</span>
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Complete forensic visibility of all staff sign-in attempts, password validations,
              ClickSend SMS one-time passcode dispatches, carrier telemetry, and verification results.
              Mobile numbers are masked with privacy masking (<code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">0488 ••• 456</code>)
              per Australian data protection standards.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-[#0b2942] text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateEvent('success')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#00c0f3] hover:bg-[#00a7d4] text-[#0b2942] text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              title="Inject a simulated successful SMS verification event"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Simulate Success</span>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateEvent('failed')}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              title="Inject a simulated failed login attempt to verify alerting"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Simulate Failed Attempt</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total MFA Events */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total MFA Verifications</span>
            <Smartphone className="w-4 h-4 text-[#00c0f3]" />
          </div>
          <div className="text-3xl font-black text-[#0b2942] font-mono tabular-nums">
            {totalVerifications}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Logged via ClickSend &amp; Passkey</span>
          </div>
        </div>

        {/* Verification Success Rate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">MFA Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono tabular-nums">
            {successRate}%
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold">
            {successfulLogins} of {totalVerifications} verifications passed
          </div>
        </div>

        {/* Failed / Flagged Attempts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Failed / Flagged</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-rose-600 font-mono tabular-nums">
            {failedAttempts}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold">
            {failedAttempts > 0 ? 'Requires CEO security review' : 'No security flags recorded'}
          </div>
        </div>

        {/* Enrolled Staff with 2FA */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">MFA Enrolled Staff</span>
            <ShieldCheck className="w-4 h-4 text-[#15385E]" />
          </div>
          <div className="text-3xl font-black text-[#0b2942] font-mono tabular-nums">
            {enrolledWith2Fa} / {staffMembers.length}
          </div>
          <div className="text-[11px] text-slate-500">
            100% staff enforced with 2FA
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by staff name, email, masked mobile (0488 ••• 456), message ID, or failure reason..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0b2942] focus:ring-2 focus:ring-[#00c0f3]/20 outline-none"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0b2942] cursor-pointer"
            >
              <option value="all">Status: All Attempts</option>
              <option value="success">Status: Verified Success</option>
              <option value="failed">Status: Failed / Rejected</option>
              <option value="dispatched">Status: SMS Dispatched</option>
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0b2942] cursor-pointer"
            >
              <option value="all">Role: All Roles</option>
              <option value="ceo">CEO &amp; Managing Director</option>
              <option value="manager">Operations Manager</option>
              <option value="call_center">Call Center Operative</option>
              <option value="driver">Fleet Driver</option>
              <option value="admin_pricing">Pricing &amp; Commercial</option>
              <option value="warehouse">Yard &amp; Warehouse</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-[#0b2942] cursor-pointer"
            >
              <option value="all">Method: SMS &amp; Passkey</option>
              <option value="sms">Method: ClickSend SMS</option>
              <option value="passkey">Method: Biometric Passkey</option>
            </select>

            {/* Reset Defaults button */}
            <button
              type="button"
              onClick={handleResetToSeedLogs}
              title="Restore initial seed audit records"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-[#0b2942] uppercase tracking-wider">
              Audit Event Trail
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full">
              {filteredLogs.length} Records
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAllLogs}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
            >
              Clear Log History
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4">Timestamp (ACST)</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Masked Mobile</th>
                <th className="py-3 px-4">MFA Method</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Routing / Details</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm text-slate-600">No MFA audit events found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'No records match your query. Try clearing search filters.'
                        : 'Staff sign-ins via ClickSend SMS will be recorded here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedTime = dateObj.toLocaleTimeString('en-AU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const formattedDate = dateObj.toLocaleDateString('en-AU', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedEntry(log)}
                      className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formattedTime}</div>
                        <div className="text-[10px] text-slate-400">{formattedDate}</div>
                      </td>

                      {/* Staff Member */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${
                              log.staffRole === 'ceo'
                                ? 'bg-[#FF9900] text-[#0b2942]'
                                : log.status === 'failed'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-[#0b2942] text-white'
                            }`}
                          >
                            {log.staffName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-[#0b2942] flex items-center gap-1">
                              <span>{log.staffName}</span>
                              {log.staffRole === 'ceo' && <span title="CEO">👑</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                              {log.staffEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            log.staffRole === 'ceo'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : log.staffRole === 'manager'
                              ? 'bg-blue-100 text-blue-900'
                              : log.staffRole === 'call_center'
                              ? 'bg-emerald-100 text-emerald-900'
                              : log.staffRole === 'driver'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {log.staffRole.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Masked Mobile */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums text-xs font-bold text-slate-800">
                        {log.maskedMobile}
                      </td>

                      {/* MFA Method */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.method === 'sms' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 text-[11px] font-semibold border border-sky-200">
                            <Send className="w-3 h-3 text-[#00c0f3]" />
                            <span>ClickSend SMS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 text-[11px] font-semibold border border-indigo-200">
                            <Fingerprint className="w-3 h-3 text-indigo-600" />
                            <span>Biometric Passkey</span>
                          </span>
                        )}
                      </td>

                      {/* Outcome Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-extrabold border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Failed / Blocked</span>
                          </span>
                        )}
                        {log.status === 'dispatched' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[11px] font-extrabold border border-sky-200">
                            <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
                            <span>In-Flight OTP</span>
                          </span>
                        )}
                      </td>

                      {/* Routing / Details */}
                      <td className="py-3 px-4 text-xs max-w-xs">
                        {log.status === 'failed' ? (
                          <span className="text-rose-600 font-semibold text-[11px] block truncate">
                            {log.failureReason || 'Verification rejected'}
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            {log.messageId && (
                              <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                                <span className="font-bold text-slate-700">{log.messageId}</span>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 truncate">
                              {log.carrierRoute || 'Telstra Direct Tier-1'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntry(log);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Audit Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in text-slate-900">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col">
            {/* Header */}
            <div className="bg-[#0b2942] text-white p-5 flex items-center justify-between border-b-4 border-[#F7D347]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    selectedEntry.status === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : selectedEntry.status === 'failed'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-sky-500/20 text-sky-400'
                  }`}
                >
                  {selectedEntry.status === 'success' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : selectedEntry.status === 'failed' ? (
                    <XCircle className="w-6 h-6" />
                  ) : (
                    <Smartphone className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">MFA Forensic Verification Record</h3>
                  <p className="text-xs text-slate-300 font-mono">Event ID: {selectedEntry.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  selectedEntry.status === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : selectedEntry.status === 'failed'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-sky-50 border-sky-200 text-sky-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm uppercase tracking-wide">
                    Outcome: {selectedEntry.status}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold">
                  {new Date(selectedEntry.timestamp).toLocaleTimeString('en-AU')}
                </span>
              </div>

              {selectedEntry.failureReason && (
                <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold">
                  <strong>Security Alert:</strong> {selectedEntry.failureReason}
                </div>
              )}

              {/* Staff Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Staff Member:</span>
                  <span className="font-bold text-slate-900">{selectedEntry.staffName}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Email Address:</span>
                  <span className="font-mono text-slate-800">{selectedEntry.staffEmail}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Assigned Role:</span>
                  <span className="font-bold uppercase text-[#0b2942]">{selectedEntry.staffRole}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Masked Mobile:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                    {selectedEntry.maskedMobile}
                  </span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Auth Method:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedEntry.method === 'sms' ? 'ClickSend SMS (Australia SMPP)' : 'Biometric Passkey (FIDO2)'}
                  </span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">ClickSend Message ID:</span>
                  <span className="font-mono text-slate-800">{selectedEntry.messageId || 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Carrier Gateway Route:</span>
                  <span className="text-slate-800">{selectedEntry.carrierRoute || 'Tier-1 Direct'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">IP Address / Location:</span>
                  <span className="font-mono text-slate-700">{selectedEntry.ipAddress || 'Adelaide Office'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 bg-[#0b2942] hover:bg-[#15385E] text-white text-xs font-black rounded-xl cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
