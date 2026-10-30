import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserPlus,
  Lock,
  Unlock,
  Key,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  X,
  Sliders,
  Eye,
  SlidersHorizontal,
  Info,
  Calendar,
  PhoneCall,
  Truck,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  StaffMember,
  StaffRole,
  StaffPermissionKey,
  PERMISSION_DEFINITIONS,
  StaffSession,
  RolePermissionMatrix,
} from '../../types/adminAuth';
import {
  loadStaffMembers,
  saveStaffMembers,
  loadRolePermissions,
  saveRolePermissions,
  resetRolePermissionsToDefault,
  hasStaffPermission,
  canManageStaffPermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../services/adminAuthService';

interface StaffPermissionsWorkspaceProps {
  currentSession: StaffSession | null;
  onRefreshPermissions?: () => void;
}

export const StaffPermissionsWorkspace: React.FC<StaffPermissionsWorkspaceProps> = ({
  currentSession,
  onRefreshPermissions,
}) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMatrix>(DEFAULT_ROLE_PERMISSIONS);
  const [selectedStaffForOverride, setSelectedStaffForOverride] = useState<StaffMember | null>(null);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; time: string; text: string }>>([
    {
      id: 'log-1',
      time: 'Today 08:30 AM',
      text: 'CEO Andrew Campbell initialized role governance policy with 2FA enforcement.',
    },
    {
      id: 'log-2',
      time: 'Today 09:15 AM',
      text: 'Ops Manager Sarah Collins synchronized depot fleet permissions for Adelaide & Melbourne.',
    },
  ]);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // New staff form state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('call_center');
  const [newStaffTitle, setNewStaffTitle] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffDepot, setNewStaffDepot] = useState('Adelaide Depot');
  const [newStaff2FaMethod, setNewStaff2FaMethod] = useState<'sms' | 'authenticator'>('sms');

  useEffect(() => {
    setStaffMembers(loadStaffMembers());
    setRolePermissions(loadRolePermissions());
  }, []);

  const isAuthorized = canManageStaffPermissions(currentSession?.user);

  const addAuditLog = (text: string) => {
    const newLog = {
      id: `log-${Date.now()}`,
      time: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
      text,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  const handleToggleRolePermission = (role: StaffRole, permissionKey: StaffPermissionKey) => {
    if (!isAuthorized) return;

    // CEO permissions cannot be turned off
    if (role === 'ceo') return;

    const currentVal = rolePermissions[role]?.[permissionKey] ?? false;
    const newVal = !currentVal;

    const updated = {
      ...rolePermissions,
      [role]: {
        ...rolePermissions[role],
        [permissionKey]: newVal,
      },
    };

    setRolePermissions(updated);
    saveRolePermissions(updated);

    const permDef = PERMISSION_DEFINITIONS.find((p) => p.key === permissionKey);
    addAuditLog(
      `${currentSession?.user.name || 'Executive'} ${newVal ? 'granted' : 'restricted'} [${permDef?.shortLabel || permissionKey}] for all [${role.toUpperCase()}] staff.`
    );

    setSaveBanner(`Updated permissions for ${role.toUpperCase()}`);
    setTimeout(() => setSaveBanner(null), 3000);

    onRefreshPermissions?.();
  };

  const handleResetToDefault = () => {
    if (!window.confirm('Reset all role permissions to Portabox default security policy?')) return;
    const defaults = resetRolePermissionsToDefault();
    setRolePermissions(defaults);
    addAuditLog(`${currentSession?.user.name || 'CEO'} reset role permissions matrix to default enterprise template.`);
    setSaveBanner('Permissions matrix restored to default');
    setTimeout(() => setSaveBanner(null), 3000);
    onRefreshPermissions?.();
  };

  const handleToggleStaffStatus = (staffId: string) => {
    if (!isAuthorized) return;
    const updated = staffMembers.map((s) => {
      if (s.id === staffId) {
        const newStatus = s.status === 'active' ? 'suspended' : 'active';
        addAuditLog(`${currentSession?.user.name || 'CEO'} set ${s.name} status to ${newStatus.toUpperCase()}`);
        return { ...s, status: newStatus as 'active' | 'suspended' };
      }
      return s;
    });
    setStaffMembers(updated);
    saveStaffMembers(updated);
    onRefreshPermissions?.();
  };

  const handleToggleIndividualOverride = (permissionKey: StaffPermissionKey) => {
    if (!selectedStaffForOverride || !isAuthorized) return;

    const currentCustom = selectedStaffForOverride.customPermissions || {};
    const defaultVal = rolePermissions[selectedStaffForOverride.role]?.[permissionKey] ?? false;
    const currentlyEffective = typeof currentCustom[permissionKey] === 'boolean'
      ? currentCustom[permissionKey]
      : defaultVal;

    const nextVal = !currentlyEffective;

    const updatedCustom = {
      ...currentCustom,
      [permissionKey]: nextVal,
    };

    const updatedStaff = staffMembers.map((s) => {
      if (s.id === selectedStaffForOverride.id) {
        return {
          ...s,
          customPermissions: updatedCustom,
        };
      }
      return s;
    });

    setStaffMembers(updatedStaff);
    saveStaffMembers(updatedStaff);
    setSelectedStaffForOverride({
      ...selectedStaffForOverride,
      customPermissions: updatedCustom,
    });

    addAuditLog(
      `${currentSession?.user.name || 'CEO'} configured custom override: [${permissionKey}] = ${nextVal ? 'ALLOWED' : 'DENIED'} for ${selectedStaffForOverride.name}`
    );

    onRefreshPermissions?.();
  };

  const handleClearIndividualOverrides = () => {
    if (!selectedStaffForOverride || !isAuthorized) return;
    const updatedStaff = staffMembers.map((s) => {
      if (s.id === selectedStaffForOverride.id) {
        const { customPermissions, ...rest } = s;
        return rest as StaffMember;
      }
      return s;
    });
    setStaffMembers(updatedStaff);
    saveStaffMembers(updatedStaff);
    setSelectedStaffForOverride({
      ...selectedStaffForOverride,
      customPermissions: undefined,
    });
    addAuditLog(`${currentSession?.user.name || 'CEO'} cleared all individual overrides for ${selectedStaffForOverride.name}`);
    onRefreshPermissions?.();
  };

  const handleAddNewStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    const newMember: StaffMember = {
      id: `staff-${Date.now()}`,
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      title: newStaffTitle.trim() || `${newStaffRole.toUpperCase()} Officer`,
      mobile: newStaffMobile.trim() || '0400 000 000',
      depotLocation: newStaffDepot,
      twoFactorEnabled: true,
      twoFactorMethod: newStaff2FaMethod,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: 'Never',
    };

    const updated = [newMember, ...staffMembers];
    setStaffMembers(updated);
    saveStaffMembers(updated);

    addAuditLog(`${currentSession?.user.name || 'Executive'} added new staff member: ${newMember.name} (${newMember.role}) with mandatory 2FA`);

    // Reset form
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffTitle('');
    setNewStaffMobile('');
    setIsAddStaffModalOpen(false);
    onRefreshPermissions?.();
  };

  const rolesList: Array<{ role: StaffRole; label: string; desc: string; badgeColor: string }> = [
    { role: 'ceo', label: 'CEO & Managing Director', desc: 'Full executive command & permission override', badgeColor: 'bg-[#15385E] text-white' },
    { role: 'manager', label: 'National Operations Manager', desc: 'Fleet dispatch, pricing, and staff governance', badgeColor: 'bg-sky-700 text-white' },
    { role: 'call_center', label: 'Call Center & Dispatch Staff', desc: 'Twilio softphone, booking dispatch, customer CRM', badgeColor: 'bg-emerald-700 text-white' },
    { role: 'driver', label: 'Fleet Drivers & Contractors', desc: 'Driver daily run sheets, container QR check', badgeColor: 'bg-[#F7D347] text-[#1A1A1A]' },
    { role: 'admin_pricing', label: 'Pricing & Billing Admin', desc: 'Tariffs, duration discounts, promotions, quotes', badgeColor: 'bg-purple-700 text-white' },
    { role: 'warehouse', label: 'Yard Logistics & Forklift Staff', desc: 'Depot container tracking & yard inspections', badgeColor: 'bg-amber-700 text-white' },
  ];

  const filteredStaff = staffMembers.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.depotLocation.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Executive Security Header */}
      <div className="bg-gradient-to-r from-[#15385E] to-[#1e4c7e] rounded-2xl p-6 text-white shadow-xl border-b-4 border-[#F7D347]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#F7D347] shadow-inner">
              <ShieldCheck className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Staff Roles & Permissions Governance</h2>
                <span className="bg-[#F7D347] text-[#1A1A1A] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  2FA Mandatory
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                Restricting and granting employee access to the Pricing Matrix, Dispatch Calendar, Softphone Dialer, and Driver Portal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-black/25 border border-white/15 text-right">
              <div className="text-[10px] font-bold text-slate-300 uppercase">Authenticated As</div>
              <div className="text-xs font-black text-[#5CC1EF] flex items-center gap-1.5 justify-end">
                <span>{currentSession?.user.name || 'Andrew Campbell'}</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono uppercase text-white">
                  {currentSession?.user.role || 'CEO'}
                </span>
              </div>
            </div>

            {isAuthorized && (
              <button
                onClick={() => setIsAddStaffModalOpen(true)}
                className="px-4 py-2.5 bg-[#F7D347] hover:bg-[#ebd034] text-[#1A1A1A] font-black text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-[#15385E]" />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-black/20 p-3 rounded-xl border border-white/10">
            <div className="text-[10px] font-bold text-slate-300 uppercase">Enrolled Staff</div>
            <div className="text-lg font-black text-white">{staffMembers.length} Members</div>
          </div>
          <div className="bg-black/20 p-3 rounded-xl border border-white/10">
            <div className="text-[10px] font-bold text-slate-300 uppercase">Two-Factor Auth</div>
            <div className="text-lg font-black text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Active</span>
            </div>
          </div>
          <div className="bg-black/20 p-3 rounded-xl border border-white/10">
            <div className="text-[10px] font-bold text-slate-300 uppercase">Controlled Features</div>
            <div className="text-lg font-black text-white">{PERMISSION_DEFINITIONS.length} Feature Gates</div>
          </div>
          <div className="bg-black/20 p-3 rounded-xl border border-white/10">
            <div className="text-[10px] font-bold text-slate-300 uppercase">Executive Governance</div>
            <div className="text-lg font-black text-[#F7D347]">CEO & Ops Mgr Only</div>
          </div>
        </div>
      </div>

      {saveBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* Warning if not authorized */}
      {!isAuthorized && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Read-Only View: Manager / CEO Authorization Required</div>
            <p className="text-slate-600 mt-0.5">
              You are currently signed in with a restricted role. Only the CEO or Operations Manager can toggle employee permission switches or register new staff accounts.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 1: ROLE PERMISSION MATRIX TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#15385E]" />
              Role-Based Access Matrix (Employee Type Restrictions)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any toggle to permit or restrict feature access for that entire employee category across Portabox.
            </p>
          </div>
          {isAuthorized && (
            <button
              onClick={handleResetToDefault}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-extrabold">
                <th className="py-3 px-4 min-w-[200px]">Employee Role / Type</th>
                {PERMISSION_DEFINITIONS.map((perm) => (
                  <th key={perm.key} className="py-3 px-3 text-center min-w-[110px]" title={perm.description}>
                    <div className="font-bold text-slate-800">{perm.shortLabel}</div>
                    <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-tighter">
                      {perm.category}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rolesList.map(({ role, label, desc, badgeColor }) => {
                const isCeo = role === 'ceo';
                return (
                  <tr key={role} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {role.toUpperCase()}
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">{label}</div>
                          <div className="text-[10px] text-slate-500">{desc}</div>
                        </div>
                      </div>
                    </td>

                    {PERMISSION_DEFINITIONS.map((perm) => {
                      const isAllowed = isCeo ? true : !!rolePermissions[role]?.[perm.key];
                      return (
                        <td key={perm.key} className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={!isAuthorized || isCeo}
                            onClick={() => handleToggleRolePermission(role, perm.key)}
                            className={`w-14 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                              isAllowed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                            } ${!isAuthorized || isCeo ? 'cursor-not-allowed opacity-90' : ''}`}
                            title={
                              isCeo
                                ? 'CEO has permanent master access'
                                : isAllowed
                                ? `Click to restrict ${perm.shortLabel} from ${role}`
                                : `Click to grant ${perm.shortLabel} to ${role}`
                            }
                          >
                            {isAllowed ? (
                              <span className="flex items-center justify-center gap-1">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>YES</span>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1 text-slate-400">
                                <X className="w-3 h-3" />
                                <span>NO</span>
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: STAFF DIRECTORY & INDIVIDUAL OVERRIDES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#15385E]" />
              Employee Directory & Custom Overrides
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect specific staff members, manage active 2FA credentials, and grant individual exception permissions.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Filter by name or depot..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-[#15385E] w-full sm:w-48"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-[#15385E]"
            >
              <option value="all">All Roles</option>
              <option value="ceo">CEO</option>
              <option value="manager">Ops Manager</option>
              <option value="call_center">Call Center</option>
              <option value="driver">Driver</option>
              <option value="admin_pricing">Pricing Admin</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredStaff.map((staff) => {
            const hasOverrides = staff.customPermissions && Object.keys(staff.customPermissions).length > 0;
            return (
              <div
                key={staff.id}
                className={`p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors ${
                  staff.status === 'suspended' ? 'bg-slate-50 opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#15385E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {staff.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">{staff.name}</span>
                      <span className="text-xs text-slate-500 font-mono">({staff.email})</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          staff.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {staff.status}
                      </span>
                      {hasOverrides && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          Custom Overrides Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-slate-700">{staff.title}</span>
                      <span>·</span>
                      <span className="text-slate-500">{staff.depotLocation}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-500">{staff.mobile}</span>
                      <span>·</span>
                      <span className="text-slate-400">Last login: {staff.lastLogin || 'Recent'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
                    <Smartphone className="w-3.5 h-3.5 text-[#15385E]" />
                    <span>2FA: {staff.twoFactorMethod.toUpperCase()}</span>
                  </div>

                  {isAuthorized && (
                    <>
                      <button
                        onClick={() => setSelectedStaffForOverride(staff)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#15385E]" />
                        <span>Configure Overrides</span>
                      </button>

                      {staff.role !== 'ceo' && (
                        <button
                          onClick={() => handleToggleStaffStatus(staff.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            staff.status === 'active'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {staff.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: AUDIT TRAIL LOG */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Security & Permission Audit Trail (CEO / Ops Manager Action Log)
          </div>
          <span className="text-[10px] text-slate-400">Live operational ledger</span>
        </div>
        <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
          {auditLogs.map((log) => (
            <div key={log.id} className="text-slate-600 flex items-start gap-2">
              <span className="text-slate-400 font-semibold shrink-0">[{log.time}]</span>
              <span>{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: INDIVIDUAL CUSTOM OVERRIDE DRAWER */}
      {selectedStaffForOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-[#15385E] px-6 py-4 text-white flex items-center justify-between border-b-4 border-[#F7D347]">
              <div>
                <h3 className="text-base font-black text-white">
                  Individual Permission Overrides
                </h3>
                <p className="text-xs text-slate-300">
                  Configure custom permissions for <span className="font-bold text-[#F7D347]">{selectedStaffForOverride.name}</span> ({selectedStaffForOverride.role.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setSelectedStaffForOverride(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
                Individual overrides supersede standard role restrictions. Use this when a senior driver needs dispatch access or a customer agent needs pricing authority.
              </div>

              <div className="space-y-2">
                {PERMISSION_DEFINITIONS.map((perm) => {
                  const defaultRoleVal = rolePermissions[selectedStaffForOverride.role]?.[perm.key] ?? false;
                  const customVal = selectedStaffForOverride.customPermissions?.[perm.key];
                  const hasCustom = typeof customVal === 'boolean';
                  const effectiveVal = hasCustom ? customVal : defaultRoleVal;

                  return (
                    <div
                      key={perm.key}
                      className="p-3 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                          <span>{perm.label}</span>
                          {hasCustom && (
                            <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-black uppercase">
                              Override
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{perm.description}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleIndividualOverride(perm.key)}
                        className={`w-16 py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          effectiveVal
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {effectiveVal ? 'ALLOWED' : 'DENIED'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleClearIndividualOverrides}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                Clear All Custom Overrides (Reset to Role)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStaffForOverride(null)}
                className="px-4 py-2 bg-[#15385E] text-white rounded-xl text-xs font-bold hover:bg-[#112F4F] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW EMPLOYEE FORM */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col">
            <div className="bg-[#15385E] px-6 py-4 text-white flex items-center justify-between border-b-4 border-[#F7D347]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#F7D347]" />
                <h3 className="text-base font-black text-white">Enroll New Portabox Employee</h3>
              </div>
              <button
                onClick={() => setIsAddStaffModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Employee Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Evans"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#15385E] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Portabox Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="liam.ops@portabox.com.au"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#15385E] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Phone (2FA SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0422 123 456"
                    value={newStaffMobile}
                    onChange={(e) => setNewStaffMobile(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#15385E] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#15385E] outline-none"
                  >
                    <option value="call_center">Call Center & Dispatch</option>
                    <option value="driver">Fleet Driver</option>
                    <option value="admin_pricing">Pricing Admin</option>
                    <option value="warehouse">Yard Logistics</option>
                    <option value="manager">Operations Manager</option>
                    <option value="ceo">CEO & Executive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Dispatch Officer"
                    value={newStaffTitle}
                    onChange={(e) => setNewStaffTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-[#15385E] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Depot / Operational Base
                </label>
                <select
                  value={newStaffDepot}
                  onChange={(e) => setNewStaffDepot(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#15385E] outline-none"
                >
                  <option value="Adelaide Depot HQ">Adelaide Depot HQ</option>
                  <option value="Melbourne Metro Depot">Melbourne Metro Depot</option>
                  <option value="Sydney Metro Hub">Sydney Metro Hub</option>
                  <option value="Brisbane Regional Depot">Brisbane Regional Depot</option>
                  <option value="All Hubs / National">All Hubs / National</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Mandatory 2FA Enrollment</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Upon creation, this staff member will be required to authenticate via 2FA verification before accessing any Portabox operational modules.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#15385E] hover:bg-[#112F4F] text-white text-xs font-black shadow-md cursor-pointer"
                >
                  Save & Enroll Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
