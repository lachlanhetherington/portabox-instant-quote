export type StaffRole =
  | 'ceo'
  | 'manager'
  | 'call_center'
  | 'driver'
  | 'admin_pricing'
  | 'warehouse';

export type StaffPermissionKey =
  | 'daily_operations'
  | 'field_logistics'
  | 'communications_config'
  | 'pricing_and_rates'
  | 'dispatch_calendar'
  | 'softphone_telephony'
  | 'driver_portal'
  | 'customer_crm'
  | 'yard_inventory'
  | 'ai_copilot'
  | 'manage_permissions'
  | 'view_announcement_banner';

export interface PermissionDefinition {
  key: StaffPermissionKey;
  label: string;
  shortLabel: string;
  description: string;
  category: 'Commercial' | 'Logistics' | 'Customer' | 'Security';
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'view_announcement_banner',
    label: 'Top Announcement Banner (Customer Header Strip)',
    shortLabel: 'Announcement Banner',
    description: 'Gold marketing announcement strip on the top header. Restricted to CEO and CEO-authorized staff only.',
    category: 'Commercial',
  },
  {
    key: 'daily_operations',
    label: 'Daily Operations Suite (Tariff Simulator, Customers & Yard)',
    shortLabel: 'Daily Operations',
    description: 'Access Tariff Matrix & Live Simulator, customer accounts, quote inquiries, Smartsheet yard dispatch, fleet calendar, and drop-off analytics. Restricted to CEO by default.',
    category: 'Logistics',
  },
  {
    key: 'field_logistics',
    label: 'Field Assets & Logistics (Containers, Depots & Postcodes)',
    shortLabel: 'Field Logistics',
    description: 'Container asset tracking, QR codes, postcode coverage tiers, and depot hubs. Restricted to CEO by default.',
    category: 'Logistics',
  },
  {
    key: 'communications_config',
    label: 'Communications & App Config (Twilio, SMS & Flags)',
    shortLabel: 'Comms & Config',
    description: 'Twilio telephony configuration, business hours SMS, promotional branding, and feature flags. Restricted to CEO by default.',
    category: 'Security',
  },
  {
    key: 'pricing_and_rates',
    label: 'Tariff Matrix & Pricing Engine',
    shortLabel: 'Pricing Matrix',
    description: 'Configure container delivery rates, fuel surcharges, duration discounts, and promotions.',
    category: 'Commercial',
  },
  {
    key: 'dispatch_calendar',
    label: 'Call Center Fleet Dispatch Calendar',
    shortLabel: 'Fleet Dispatch',
    description: 'Google Calendar booking schedule, driver assignment, and metro route optimizer.',
    category: 'Logistics',
  },
  {
    key: 'softphone_telephony',
    label: 'Twilio Call Center Softphone',
    shortLabel: 'Softphone Dialer',
    description: 'Inbound/outbound call dialer bar, customer intake, and screen-pop CRM drawers.',
    category: 'Customer',
  },
  {
    key: 'driver_portal',
    label: 'Driver Daily Run Sheets & QR Check',
    shortLabel: 'Driver Portal',
    description: 'Access driver run sheets, container QR scanning, and pre-trip vehicle safety checklists.',
    category: 'Logistics',
  },
  {
    key: 'customer_crm',
    label: 'Customer Accounts & Ledger CRM',
    shortLabel: 'Customer CRM',
    description: 'Customer contact records, active container leases, quote overrides, and Zepto payment receipts.',
    category: 'Customer',
  },
  {
    key: 'yard_inventory',
    label: 'Yard Staging & Container Inventory',
    shortLabel: 'Yard Inventory',
    description: 'Depot container tracking, forklift yard inspections, and Smartsheet two-way sync.',
    category: 'Logistics',
  },
  {
    key: 'ai_copilot',
    label: 'Admin AI Copilot & Funnel Analytics',
    shortLabel: 'AI Copilot',
    description: 'AI-assisted tariff recommendations, drop-off analytics, and competitor price tracking.',
    category: 'Commercial',
  },
  {
    key: 'manage_permissions',
    label: 'Staff Governance & Access Control',
    shortLabel: 'Manage Access',
    description: 'Grant or revoke feature permissions for employees and drivers. Restricted to CEO and Operations Manager.',
    category: 'Security',
  },
];

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: StaffRole;
  title: string;
  mobile: string;
  depotLocation: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'sms' | 'authenticator' | 'passkey';
  status: 'active' | 'suspended';
  customPermissions?: Partial<Record<StaffPermissionKey, boolean>>;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface StaffSession {
  user: StaffMember;
  token: string;
  verifiedVia: '2fa_sms' | '2fa_totp' | 'passkey';
  loginTime: string;
  expiresAt: number;
}

export interface RolePermissionMatrix {
  [role: string]: Record<StaffPermissionKey, boolean>;
}

export interface MfaAuditLogEntry {
  id: string;
  timestamp: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  staffRole: StaffRole;
  maskedMobile: string;
  method: 'sms' | 'passkey';
  status: 'success' | 'failed' | 'dispatched';
  failureReason?: string;
  messageId?: string;
  carrierRoute?: string;
  ipAddress?: string;
}

