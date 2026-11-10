import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  Tag,
  MapPin,
  ShieldBan,
  Truck,
  RotateCcw,
  Clock,
  Layers,
  UserCheck,
  SlidersHorizontal,
  QrCode,
  Calendar,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Search,
  Sparkles,
  Zap,
  PhoneCall,
  ShieldCheck,
  Percent,
  Lock,
  Compass,
  X,
  User,
  Shield,
} from 'lucide-react';
import { AppConfig } from '../../types/quote';
import { StaffSession, StaffMember, StaffPermissionKey } from '../../types/adminAuth';
import {
  getStaffSession,
  setStaffSession,
  loadStaffMembers,
  hasStaffPermission,
} from '../../services/adminAuthService';

export type AdminTabId =
  | 'admin_copilot'
  | 'staff_permissions'
  | 'pricing_matrix'
  | 'pricing'
  | 'competitor_pricing'
  | 'duration_discounts'
  | 'quote_lifecycle'
  | 'freeze_management'
  | 'customers'
  | 'inventory'
  | 'smartsheet'
  | 'call_center_routing'
  | 'telephony'
  | 'leads'
  | 'dropoffs'
  | 'zones'
  | 'interstate'
  | 'promotions'
  | 'blocked'
  | 'postcode_tiers'
  | 'depots'
  | 'features'
  | 'business_hours'
  | 'branding';

interface AdminSidebarProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId, label?: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  config: AppConfig;
  onOpenPhoneIntake?: () => void;
  staffSession?: StaffSession | null;
  onSelectSession?: (session: StaffSession) => void;
  counts: {
    customers: number;
    leads: number;
    dropoffs: number;
    inventory: number;
    smartsheet: number;
    pendingAfterHours: number;
    promotions: number;
    blocked: number;
  };
}

interface NavItem {
  id: AdminTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  highlight?: boolean;
  permissionKey?: StaffPermissionKey;
}

interface NavSection {
  title: string;
  permissionKey?: StaffPermissionKey;
  items: NavItem[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  config,
  counts,
  onOpenPhoneIntake,
  staffSession,
  onSelectSession,
}) => {
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const currentSession = staffSession || getStaffSession();
  const currentUser = currentSession?.user;
  const isCeo = currentUser?.role === 'ceo';

  // Helper: check if a section or item is accessible by current staff
  const checkAccess = (permKey?: StaffPermissionKey): boolean => {
    if (isCeo) return true;
    if (!currentUser) return false;
    if (!permKey) return true;
    return hasStaffPermission(currentUser, permKey);
  };

  // Sections ordered with DAILY OPERATIONS moved directly beneath Phone Call Intake
  const sections: NavSection[] = [
    {
      title: 'DAILY OPERATIONS',
      permissionKey: 'daily_operations',
      items: [
        {
          id: 'customers',
          label: 'Customers & Ledger',
          shortLabel: 'Customers',
          icon: UserCheck,
          badge: counts.customers,
          permissionKey: 'customer_crm',
        },
        {
          id: 'leads',
          label: 'Quote Inquiries & Leads',
          shortLabel: 'Leads',
          icon: Users,
          badge: counts.leads,
          badgeColor: 'bg-[#FF9900] text-[#0b2942]',
          permissionKey: 'customer_crm',
        },
        {
          id: 'smartsheet',
          label: 'Smartsheet Yard Dispatch',
          shortLabel: 'Yard',
          icon: Layers,
          badge: counts.smartsheet,
          permissionKey: 'yard_inventory',
        },
        {
          id: 'call_center_routing',
          label: 'Call Center Fleet Calendar',
          shortLabel: 'Fleet',
          icon: Calendar,
          badge: config.enableCallCenterDispatch === false ? 'Off' : undefined,
          badgeColor: 'bg-rose-100 text-rose-700',
          permissionKey: 'dispatch_calendar',
        },
        {
          id: 'dropoffs',
          label: 'Drop-Off Funnel Analytics',
          shortLabel: 'Dropoffs',
          icon: TrendingDown,
          badge: counts.dropoffs,
          permissionKey: 'customer_crm',
        },
      ],
    },
    {
      title: 'SECURITY & GOVERNANCE',
      permissionKey: 'manage_permissions',
      items: [
        {
          id: 'staff_permissions',
          label: 'Staff Roles & 2FA Governance',
          shortLabel: 'Permissions',
          icon: ShieldCheck,
          highlight: true,
          badge: 'CEO / Ops',
          badgeColor: 'bg-[#F7D347] text-[#1A1A1A]',
          permissionKey: 'manage_permissions',
        },
      ],
    },
    {
      title: 'AI COPILOT (ADMIN ONLY)',
      permissionKey: 'ai_copilot',
      items: [
        {
          id: 'admin_copilot',
          label: 'Admin AI Copilot',
          shortLabel: 'Copilot',
          icon: Sparkles,
          highlight: true,
          badge: 'Gemini',
          badgeColor: 'bg-purple-600 text-white',
          permissionKey: 'ai_copilot',
        },
      ],
    },
    {
      title: 'PRICING & REVENUE',
      permissionKey: 'pricing_and_rates',
      items: [
        {
          id: 'pricing_matrix',
          label: 'Tariff Matrix & Simulator',
          shortLabel: 'Matrix',
          icon: Calculator,
          highlight: true,
          permissionKey: 'pricing_and_rates',
        },
        {
          id: 'competitor_pricing',
          label: 'Competitor Rates & Benchmarks',
          shortLabel: 'Competitors',
          icon: TrendingDown,
          highlight: true,
          permissionKey: 'pricing_and_rates',
        },
        {
          id: 'duration_discounts',
          label: 'Duration Discounts (2–12 mo)',
          shortLabel: 'Discounts',
          icon: Percent,
          highlight: true,
          permissionKey: 'pricing_and_rates',
        },
        {
          id: 'quote_lifecycle',
          label: 'Quote Lifecycle & Annual Cap',
          shortLabel: 'Lifecycle',
          icon: ShieldCheck,
          highlight: true,
          permissionKey: 'pricing_and_rates',
        },
        {
          id: 'freeze_management',
          label: 'Frozen Pricing & Revenue Impact',
          shortLabel: 'Price Locks',
          icon: Lock,
          highlight: true,
          permissionKey: 'pricing_and_rates',
        },
        {
          id: 'zones',
          label: 'Delivery Zones A–E',
          shortLabel: 'Zones',
          icon: MapPin,
          permissionKey: 'pricing_and_rates',
        },
        {
          id: 'interstate',
          label: 'Interstate Freight Legs',
          shortLabel: 'Interstate',
          icon: Truck,
          permissionKey: 'pricing_and_rates',
        },
        {
          id: 'promotions',
          label: 'Promotions & Discounts',
          shortLabel: 'Promos',
          icon: Tag,
          badge: counts.promotions,
          permissionKey: 'pricing_and_rates',
        },
      ],
    },
    {
      title: 'FIELD ASSETS & LOGISTICS',
      permissionKey: 'field_logistics',
      items: [
        ...(config.enableContainerInventory !== false
          ? [
              {
                id: 'inventory' as AdminTabId,
                label: 'Container Assets & QR',
                shortLabel: 'Containers',
                icon: QrCode,
                badge: counts.inventory,
                permissionKey: 'yard_inventory' as StaffPermissionKey,
              },
            ]
          : []),
        {
          id: 'postcode_tiers',
          label: 'Postcode Coverage Areas',
          shortLabel: 'Coverage',
          icon: Compass,
          highlight: true,
          permissionKey: 'field_logistics',
        },
        {
          id: 'depots',
          label: 'Depot Metro Hubs',
          shortLabel: 'Depots',
          icon: MapPin,
          permissionKey: 'field_logistics',
        },
        {
          id: 'blocked',
          label: 'Blocked Postcodes',
          shortLabel: 'Blocked',
          icon: ShieldBan,
          badge: counts.blocked,
          permissionKey: 'field_logistics',
        },
      ],
    },
    {
      title: 'COMMUNICATIONS & CONFIG',
      permissionKey: 'communications_config',
      items: [
        {
          id: 'telephony',
          label: 'Twilio Telephony & Screen-Pop',
          shortLabel: 'Telephony',
          icon: PhoneCall,
          highlight: true,
          permissionKey: 'softphone_telephony',
        },
        {
          id: 'business_hours',
          label: 'Business Hours & SMS',
          shortLabel: 'Hours/SMS',
          icon: Clock,
          badge: counts.pendingAfterHours > 0 ? counts.pendingAfterHours : undefined,
          badgeColor: 'bg-amber-500 text-white animate-pulse',
          permissionKey: 'communications_config',
        },
        {
          id: 'branding',
          label: 'Top Banner & Slogan',
          shortLabel: 'Banner',
          icon: Sparkles,
          permissionKey: 'communications_config',
        },
        {
          id: 'features',
          label: 'Feature Flags & Modules',
          shortLabel: 'Modules',
          icon: SlidersHorizontal,
          permissionKey: 'manage_permissions',
        },
      ],
    },
  ];

  const handlePersonaSelect = (member: StaffMember) => {
    const newSession = setStaffSession(member, 'passkey');
    if (onSelectSession) {
      onSelectSession(newSession);
    }
    setIsPersonaModalOpen(false);
  };

  return (
    <aside
      className={`bg-[#0b2942] text-white flex flex-col shrink-0 transition-all duration-200 select-none border-r border-slate-800 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand & Collapse Toggle */}
      <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#00c0f3] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              P
            </div>
            <div className="truncate">
              <div className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>portabox</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#FF9900] text-[#0b2942]">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Admin Command Center
              </div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 mx-auto rounded-xl bg-[#00c0f3] text-white flex items-center justify-center font-black text-sm shadow-xs">
            P
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
            isCollapsed ? 'mx-auto mt-1' : ''
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Staff Persona / Role Card */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/60">
        {!isCollapsed ? (
          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                  isCeo ? 'bg-[#FF9900] text-[#0b2942]' : 'bg-slate-700 text-white'
                }`}
              >
                {currentUser?.name?.split(' ').map((n) => n[0]).join('') || 'DH'}
              </div>
              <div className="min-w-0 truncate">
                <div className="text-[11px] font-black text-white truncate flex items-center gap-1">
                  <span>{currentUser?.name || 'Dan Harrington'}</span>
                  {isCeo && <span className="text-[10px] text-[#FF9900]" title="CEO Persona Active">👑</span>}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  {currentUser?.title || (isCeo ? 'CEO & Managing Director' : 'Staff Member')}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPersonaModalOpen(true)}
              title="Switch persona (CEO, Call Center, Driver) to verify permissions"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 hover:text-white rounded-lg transition-colors shrink-0 border border-slate-700 cursor-pointer"
            >
              Role
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsPersonaModalOpen(true)}
            title={`Active: ${currentUser?.name || 'Dan Harrington'} (${currentUser?.role || 'CEO'}) - Click to switch persona`}
            className="w-10 h-10 mx-auto rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-[#FF9900] hover:scale-105 transition-all cursor-pointer shadow-xs"
          >
            {currentUser?.name?.split(' ').map((n) => n[0]).join('') || 'DH'}
          </button>
        )}
      </div>

      {/* Quick Action: Phone Intake */}
      {onOpenPhoneIntake && (
        <div className="p-2 border-b border-slate-800/80 bg-slate-900/30">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={onOpenPhoneIntake}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-950/40 cursor-pointer transition-all hover:scale-[1.02]"
              title="Open instant Phone Intake drawer for live customer quote & booking"
            >
              <PhoneCall className="w-4 h-4 animate-pulse shrink-0" />
              <span>Phone Call Intake</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPhoneIntake}
              title="Phone Call Intake (Customer on Phone)"
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs"
            >
              <PhoneCall className="w-4 h-4 animate-pulse" />
            </button>
          )}
        </div>
      )}

      {/* Navigation Suite - DAILY OPERATIONS is Section 1 directly under Phone Call Intake */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs font-semibold">
        {sections.map((section) => {
          const isSectionAllowed = checkAccess(section.permissionKey);

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>{section.title}</span>
                  {!isSectionAllowed && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      <span>CEO Access</span>
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  const isItemAllowed = checkAccess(item.permissionKey || section.permissionKey);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id, item.label)}
                      title={
                        isCollapsed
                          ? item.label
                          : !isItemAllowed
                          ? `Restricted to CEO (Dan Harrington) — Access can be granted in Permissions section`
                          : undefined
                      }
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer text-left ${
                        isActive
                          ? item.highlight
                            ? 'bg-[#FF9900] text-[#0b2942] font-black shadow-sm'
                            : 'bg-white text-[#0b2942] font-black shadow-sm'
                          : isItemAllowed
                          ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          : 'text-slate-400/80 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? item.highlight
                              ? 'text-[#0b2942]'
                              : 'text-[#00c0f3]'
                            : isItemAllowed
                            ? 'text-slate-400'
                            : 'text-amber-400/80'
                        }`}
                      />

                      {!isCollapsed && (
                        <span className="truncate flex-1 flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {!isItemAllowed && (
                            <span title="Restricted to CEO">
                              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                            </span>
                          )}
                        </span>
                      )}

                      {!isCollapsed && item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                            item.badgeColor ||
                            (isActive
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-slate-800 text-slate-300')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {!isCollapsed && !isItemAllowed && item.badge === undefined && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          CEO
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Support Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-400 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-white">Adelaide Hub</span>
              <p className="text-[10px] text-slate-400">Dispatch: {config.phone}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online" />
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="System Online" />
          </div>
        )}
      </div>

      {/* Persona Switcher Modal */}
      {isPersonaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in text-slate-900">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-[#0b2942] text-white p-4 flex items-center justify-between border-b border-slate-700">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Staff Persona & Role Switcher</span>
                  <span className="text-[10px] bg-[#FF9900] text-[#0b2942] px-1.5 py-0.2 rounded font-black uppercase">
                    CEO Control
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Switch roles to test permissions & CEO restrictions across the application.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPersonaModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-96 overflow-y-auto space-y-2">
              {loadStaffMembers().map((staff) => {
                const isSelected = currentUser?.id === staff.id;
                const isStaffCeo = staff.role === 'ceo';
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => handlePersonaSelect(staff)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isStaffCeo ? 'bg-[#FF9900] text-[#0b2942]' : 'bg-[#0b2942] text-white'
                        }`}
                      >
                        {staff.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5 truncate">
                          <span>{staff.name}</span>
                          {isStaffCeo && <span className="text-amber-500 text-xs">👑</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{staff.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{staff.depotLocation}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isStaffCeo
                            ? 'bg-amber-100 text-amber-900'
                            : staff.role === 'call_center'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {staff.role.toUpperCase()}
                      </span>
                      {isSelected && (
                        <div className="text-[10px] text-emerald-600 font-bold mt-1">Active Now</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPersonaModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-xs hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
