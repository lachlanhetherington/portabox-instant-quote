import React from 'react';
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
} from 'lucide-react';
import { AppConfig } from '../../types/quote';

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
}

interface NavSection {
  title: string;
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
}) => {
  const sections: NavSection[] = [
    {
      title: 'SECURITY & GOVERNANCE',
      items: [
        {
          id: 'staff_permissions',
          label: 'Staff Roles & 2FA Governance',
          shortLabel: 'Permissions',
          icon: ShieldCheck,
          highlight: true,
          badge: 'CEO / Ops',
          badgeColor: 'bg-[#F7D347] text-[#1A1A1A]',
        },
      ],
    },
    {
      title: 'AI COPILOT (ADMIN ONLY)',
      items: [
        {
          id: 'admin_copilot',
          label: 'Admin AI Copilot',
          shortLabel: 'Copilot',
          icon: Sparkles,
          highlight: true,
          badge: 'Gemini',
          badgeColor: 'bg-purple-600 text-white',
        },
      ],
    },
    {
      title: 'PRICING & REVENUE',
      items: [
        {
          id: 'pricing_matrix',
          label: 'Tariff Matrix & Simulator',
          shortLabel: 'Matrix',
          icon: Calculator,
          highlight: true,
        },
        {
          id: 'competitor_pricing',
          label: 'Competitor Rates & Benchmarks',
          shortLabel: 'Competitors',
          icon: TrendingDown,
          highlight: true,
        },
        {
          id: 'duration_discounts',
          label: 'Duration Discounts (2–12 mo)',
          shortLabel: 'Discounts',
          icon: Percent,
          highlight: true,
        },
        {
          id: 'quote_lifecycle',
          label: 'Quote Lifecycle & Annual Cap',
          shortLabel: 'Lifecycle',
          icon: ShieldCheck,
          highlight: true,
        },
        {
          id: 'freeze_management',
          label: 'Frozen Pricing & Revenue Impact',
          shortLabel: 'Price Locks',
          icon: Lock,
          highlight: true,
        },
        {
          id: 'zones',
          label: 'Delivery Zones A–E',
          shortLabel: 'Zones',
          icon: MapPin,
        },
        {
          id: 'interstate',
          label: 'Interstate Freight Legs',
          shortLabel: 'Interstate',
          icon: Truck,
        },
        {
          id: 'promotions',
          label: 'Promotions & Discounts',
          shortLabel: 'Promos',
          icon: Tag,
          badge: counts.promotions,
        },
      ],
    },
    {
      title: 'DAILY OPERATIONS',
      items: [
        {
          id: 'customers',
          label: 'Customers & Ledger',
          shortLabel: 'Customers',
          icon: UserCheck,
          badge: counts.customers,
        },
        {
          id: 'leads',
          label: 'Quote Inquiries & Leads',
          shortLabel: 'Leads',
          icon: Users,
          badge: counts.leads,
          badgeColor: 'bg-[#FF9900] text-[#0b2942]',
        },
        {
          id: 'smartsheet',
          label: 'Smartsheet Yard Dispatch',
          shortLabel: 'Yard',
          icon: Layers,
          badge: counts.smartsheet,
        },
        {
          id: 'call_center_routing',
          label: 'Call Center Fleet Calendar',
          shortLabel: 'Fleet',
          icon: Calendar,
          badge: config.enableCallCenterDispatch === false ? 'Off' : undefined,
          badgeColor: 'bg-rose-100 text-rose-700',
        },
        {
          id: 'dropoffs',
          label: 'Drop-Off Funnel Analytics',
          shortLabel: 'Dropoffs',
          icon: TrendingDown,
          badge: counts.dropoffs,
        },
      ],
    },
    {
      title: 'FIELD ASSETS & LOGISTICS',
      items: [
        ...(config.enableContainerInventory !== false
          ? [
              {
                id: 'inventory' as AdminTabId,
                label: 'Container Assets & QR',
                shortLabel: 'Containers',
                icon: QrCode,
                badge: counts.inventory,
              },
            ]
          : []),
        {
          id: 'postcode_tiers',
          label: 'Postcode Coverage Areas',
          shortLabel: 'Coverage',
          icon: Compass,
          highlight: true,
        },
        {
          id: 'depots',
          label: 'Depot Metro Hubs',
          shortLabel: 'Depots',
          icon: MapPin,
        },
        {
          id: 'blocked',
          label: 'Blocked Postcodes',
          shortLabel: 'Blocked',
          icon: ShieldBan,
          badge: counts.blocked,
        },
      ],
    },
    {
      title: 'COMMUNICATIONS & CONFIG',
      items: [
        {
          id: 'telephony',
          label: 'Twilio Telephony & Screen-Pop',
          shortLabel: 'Telephony',
          icon: PhoneCall,
          highlight: true,
        },
        {
          id: 'business_hours',
          label: 'Business Hours & SMS',
          shortLabel: 'Hours/SMS',
          icon: Clock,
          badge: counts.pendingAfterHours > 0 ? counts.pendingAfterHours : undefined,
          badgeColor: 'bg-amber-500 text-white animate-pulse',
        },
        {
          id: 'branding',
          label: 'Top Banner & Slogan',
          shortLabel: 'Banner',
          icon: Sparkles,
        },
        {
          id: 'features',
          label: 'Feature Flags & Modules',
          shortLabel: 'Modules',
          icon: SlidersHorizontal,
        },
      ],
    },
  ];

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

      {/* Navigation Suite */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs font-semibold">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {section.title}
              </div>
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id, item.label)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all cursor-pointer text-left ${
                      isActive
                        ? item.highlight
                          ? 'bg-[#FF9900] text-[#0b2942] font-black shadow-sm'
                          : 'bg-white text-[#0b2942] font-black shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? item.highlight
                            ? 'text-[#0b2942]'
                            : 'text-[#00c0f3]'
                          : 'text-slate-400'
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1">{item.label}</span>
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
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
    </aside>
  );
};
