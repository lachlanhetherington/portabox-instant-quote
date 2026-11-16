import {
  StaffMember,
  StaffRole,
  StaffPermissionKey,
  StaffSession,
  RolePermissionMatrix,
  MfaAuditLogEntry,
} from '../types/adminAuth';

const STAFF_STORAGE_KEY = 'portabox_staff_members_v1';
const ROLE_PERMISSIONS_STORAGE_KEY = 'portabox_role_permissions_v1';
const STAFF_SESSION_STORAGE_KEY = 'portabox_staff_active_session_v1';
const MFA_AUDIT_STORAGE_KEY = 'portabox_mfa_audit_logs_v1';

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMatrix = {
  ceo: {
    daily_operations: true,
    field_logistics: true,
    communications_config: true,
    pricing_and_rates: true,
    dispatch_calendar: true,
    softphone_telephony: true,
    driver_portal: true,
    customer_crm: true,
    yard_inventory: true,
    ai_copilot: true,
    manage_permissions: true,
    view_announcement_banner: true,
  },
  manager: {
    daily_operations: false,
    field_logistics: false,
    communications_config: false,
    pricing_and_rates: false,
    dispatch_calendar: true,
    softphone_telephony: true,
    driver_portal: true,
    customer_crm: true,
    yard_inventory: true,
    ai_copilot: false,
    manage_permissions: false,
    view_announcement_banner: false,
  },
  call_center: {
    daily_operations: false,
    field_logistics: false,
    communications_config: false,
    pricing_and_rates: false,
    dispatch_calendar: true,
    softphone_telephony: true,
    driver_portal: false,
    customer_crm: false,
    yard_inventory: false,
    ai_copilot: false,
    manage_permissions: false,
    view_announcement_banner: false,
  },
  call_centre_supervisor: {
    daily_operations: false,
    field_logistics: false,
    communications_config: false,
    pricing_and_rates: false,
    dispatch_calendar: true,
    softphone_telephony: true,
    driver_portal: true,
    customer_crm: true,
    yard_inventory: false,
    ai_copilot: false,
    manage_permissions: false,
    view_announcement_banner: false,
  },
  driver: {
    daily_operations: false,
    field_logistics: false,
    communications_config: false,
    pricing_and_rates: false,
    dispatch_calendar: false,
    softphone_telephony: false,
    driver_portal: true,
    customer_crm: false,
    yard_inventory: false,
    ai_copilot: false,
    manage_permissions: false,
    view_announcement_banner: false,
  },
  admin_pricing: {
    daily_operations: false,
    field_logistics: false,
    communications_config: false,
    pricing_and_rates: true,
    dispatch_calendar: false,
    softphone_telephony: false,
    driver_portal: false,
    customer_crm: false,
    yard_inventory: false,
    ai_copilot: false,
    manage_permissions: false,
    view_announcement_banner: false,
  },
  warehouse: {
    daily_operations: false,
    field_logistics: false,
    communications_config: false,
    pricing_and_rates: false,
    dispatch_calendar: false,
    softphone_telephony: false,
    driver_portal: false,
    customer_crm: false,
    yard_inventory: true,
    ai_copilot: false,
    manage_permissions: false,
    view_announcement_banner: false,
  },
};

export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-ceo-01',
    name: 'Dan Harrington',
    email: 'dan.ceo@portabox.com.au',
    username: 'dan.ceo',
    role: 'ceo',
    title: 'CEO & Managing Director',
    mobile: '0488 123 456',
    depotLocation: 'All Portabox Hubs (HQ Adelaide)',
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    status: 'active',
    lastLogin: 'Today, 08:30 AM',
    createdAt: '2025-01-10',
  },
  {
    id: 'staff-mgr-02',
    name: 'Sarah Collins',
    email: 'sarah.ops@portabox.com.au',
    username: 'sarah.ops',
    role: 'manager',
    title: 'National Operations & Fleet Manager',
    mobile: '0412 889 001',
    depotLocation: 'Melbourne Hub & Interstate',
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    status: 'active',
    lastLogin: 'Today, 09:15 AM',
    createdAt: '2025-02-14',
  },
  {
    id: 'staff-cc-03',
    name: 'Chloe Davis',
    email: 'chloe.agent@portabox.com.au',
    username: 'chloe.agent',
    role: 'call_center',
    title: 'Customer Care & Dispatch Lead',
    mobile: '0433 555 782',
    depotLocation: 'Adelaide Call Center',
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    status: 'active',
    lastLogin: 'Today, 09:42 AM',
    createdAt: '2025-03-01',
  },
  {
    id: 'staff-drv-04',
    name: 'Dave Miller',
    email: 'dave.driver@portabox.com.au',
    username: 'dave.driver',
    role: 'driver',
    title: 'Senior Fleet Driver (Tilt Tray & Crane)',
    mobile: '0421 999 334',
    depotLocation: 'Adelaide Depot Fleet Cab 04',
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    status: 'active',
    lastLogin: 'Yesterday, 04:30 PM',
    createdAt: '2025-04-18',
  },
  {
    id: 'staff-adm-05',
    name: 'Marcus Webb',
    email: 'marcus.admin@portabox.com.au',
    username: 'marcus.admin',
    role: 'admin_pricing',
    title: 'Commercial Analyst & Billing Admin',
    mobile: '0409 666 123',
    depotLocation: 'Finance & Systems (Sydney HQ)',
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    status: 'active',
    lastLogin: '2 days ago',
    createdAt: '2025-05-02',
  },
  {
    id: 'staff-wh-06',
    name: 'Jason Wong',
    email: 'jason.yard@portabox.com.au',
    username: 'jason.yard',
    role: 'warehouse',
    title: 'Yard Logistics & Forklift Supervisor',
    mobile: '0414 777 221',
    depotLocation: 'Adelaide Depot Ground Yard',
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    status: 'active',
    lastLogin: '3 days ago',
    createdAt: '2025-06-11',
  },
];

export function loadStaffMembers(): StaffMember[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(INITIAL_STAFF_MEMBERS));
      return INITIAL_STAFF_MEMBERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all staff have a username; strip legacy credentials from older localStorage
      const enriched = parsed.map((staff: StaffMember) => {
        const username = staff.username || staff.email.split('@')[0];
        // Drop any legacy plaintext password persisted by older versions
        const { password: _legacyPassword, ...rest } = staff as StaffMember & { password?: string };
        return {
          ...rest,
          username,
        };
      });
      return enriched;
    }
    return INITIAL_STAFF_MEMBERS;
  } catch (err) {
    console.error('Failed to load staff members from localStorage:', err);
    return INITIAL_STAFF_MEMBERS;
  }
}

export function saveStaffMembers(members: StaffMember[]): void {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(members));
  } catch (err) {
    console.error('Failed to save staff members:', err);
  }
}

export function loadRolePermissions(): RolePermissionMatrix {
  try {
    const raw = localStorage.getItem(ROLE_PERMISSIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
      return DEFAULT_ROLE_PERMISSIONS;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      // Merge with default role permissions so newly configured sections exist
      const merged: RolePermissionMatrix = {};
      Object.keys(DEFAULT_ROLE_PERMISSIONS).forEach((role) => {
        merged[role] = {
          ...DEFAULT_ROLE_PERMISSIONS[role],
          ...(parsed[role] || {}),
        };
      });
      return merged;
    }
    return DEFAULT_ROLE_PERMISSIONS;
  } catch (err) {
    console.error('Failed to load role permissions:', err);
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

export function saveRolePermissions(matrix: RolePermissionMatrix): void {
  try {
    localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(matrix));
  } catch (err) {
    console.error('Failed to save role permissions:', err);
  }
}

export function resetRolePermissionsToDefault(): RolePermissionMatrix {
  saveRolePermissions(DEFAULT_ROLE_PERMISSIONS);
  return DEFAULT_ROLE_PERMISSIONS;
}

/**
 * Checks whether a staff member has access to a specific feature.
 * 1. Checks specific user custom override (if defined)
 * 2. Falls back to role permission matrix
 */
export function hasStaffPermission(
  member: StaffMember | null | undefined,
  permissionKey: StaffPermissionKey
): boolean {
  if (!member || member.status !== 'active') return false;

  // CEO has unconditional root override
  if (member.role === 'ceo') return true;

  // Check specific user custom override
  if (member.customPermissions && typeof member.customPermissions[permissionKey] === 'boolean') {
    return member.customPermissions[permissionKey] as boolean;
  }

  // Fall back to role permissions
  const matrix = loadRolePermissions();
  const rolePerms = matrix[member.role] || DEFAULT_ROLE_PERMISSIONS[member.role];
  if (!rolePerms) return false;

  return !!rolePerms[permissionKey];
}

/**
 * Checks if the user is authorized to manage staff accounts and permissions
 */
export function canManageStaffPermissions(member: StaffMember | null | undefined): boolean {
  if (!member || member.status !== 'active') return false;
  return member.role === 'ceo' || member.role === 'manager';
}

/**
 * Checks if a staff member is authorized by the CEO to view the top announcement banner.
 * Restricted to CEO Dan Harrington and staff members explicitly granted permission.
 */
export function isStaffAuthorizedForBanner(member: StaffMember | null | undefined): boolean {
  return hasStaffPermission(member, 'view_announcement_banner');
}

/**
 * Grants or revokes top announcement banner visibility for a specific staff member
 */
export function setStaffBannerPermission(staffId: string, allowed: boolean): StaffMember[] {
  const staff = loadStaffMembers();
  const idx = staff.findIndex((s) => s.id === staffId);
  if (idx !== -1) {
    staff[idx].customPermissions = {
      ...(staff[idx].customPermissions || {}),
      view_announcement_banner: allowed,
    };
    saveStaffMembers(staff);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portabox:staff-updated', { detail: staff[idx] }));
    }
  }
  return staff;
}

/**
 * Active Staff Session Management
 */
export function getStaffSession(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session: StaffSession = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearStaffSession();
      return null;
    }
    // Refresh user object from latest store in case permissions or status changed
    const currentStaff = loadStaffMembers();
    const updatedUser = currentStaff.find((s) => s.id === session.user.id);
    if (updatedUser) {
      if (updatedUser.status !== 'active') {
        clearStaffSession();
        return null;
      }
      // Role always comes from the server-verified identity, never the local roster
      session.user = { ...updatedUser, role: session.user.role };
    }
    return session;
  } catch {
    return null;
  }
}

export function setStaffSession(
  user: StaffMember,
  verifiedVia: 'google' = 'google'
): StaffSession {
  const session: StaffSession = {
    user,
    token: 'firebase', // identity is proven by the Firebase ID token, never stored here
    verifiedVia,
    loginTime: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12 hours operational shift
  };
  localStorage.setItem(STAFF_SESSION_STORAGE_KEY, JSON.stringify(session));

  // Update last login
  const staff = loadStaffMembers();
  const idx = staff.findIndex((s) => s.id === user.id);
  if (idx !== -1) {
    staff[idx].lastLogin = 'Just now';
    saveStaffMembers(staff);
  }

  return session;
}

export function clearStaffSession(): void {
  try {
    localStorage.removeItem(STAFF_SESSION_STORAGE_KEY);
  } catch {}
}

/**
 * CEO function to add a staff roster entry (sign-in is via Google; server decides access)
 */
export function createStaffMember(
  data: Omit<StaffMember, 'id' | 'createdAt'>
): StaffMember {
  const staffList = loadStaffMembers();
  const newStaff: StaffMember = {
    ...data,
    id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: data.username || data.email.split('@')[0],
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    status: data.status || 'active',
    createdAt: new Date().toISOString().split('T')[0],
  };

  const updated = [newStaff, ...staffList];
  saveStaffMembers(updated);
  return newStaff;
}

/**
 * Privacy helper: masks Australian mobile numbers (e.g. "0488 123 456" -> "0488 ••• 456")
 */
export function maskAustralianMobile(mobile: string): string {
  if (!mobile) return '04•• ••• •••';
  // Remove non-digit characters except leading plus
  const digits = mobile.replace(/[^\d+]/g, '');

  // If standard 10-digit Australian number: 04XX XXX XXX
  if (digits.startsWith('04') && digits.length >= 10) {
    const prefix = digits.slice(0, 4);
    const suffix = digits.slice(-3);
    return `${prefix} ••• ${suffix}`;
  }

  // If international format +61 4XX XXX XXX
  if (digits.startsWith('+61') && digits.length >= 12) {
    const prefix = '+61 4' + digits.slice(4, 6);
    const suffix = digits.slice(-3);
    return `${prefix} ••• ${suffix}`;
  }

  // Generic fallback if unexpected length
  if (digits.length >= 7) {
    const start = digits.slice(0, 4);
    const end = digits.slice(-3);
    return `${start} ••• ${end}`;
  }

  return '04•• ••• •••';
}

export const INITIAL_MFA_AUDIT_LOGS: MfaAuditLogEntry[] = [
  {
    id: 'mfa-log-101',
    timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    staffId: 'staff-ceo-01',
    staffName: 'Dan Harrington',
    staffEmail: 'dan.ceo@portabox.com.au',
    staffRole: 'ceo',
    maskedMobile: '0488 ••• 456',
    method: 'sms',
    status: 'success',
    messageId: 'CS-MSG-98102',
    carrierRoute: 'Telstra Direct Mobile Gateway (SMPP AU-01)',
    ipAddress: '124.168.92.14 (Adelaide HQ)',
  },
  {
    id: 'mfa-log-102',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    staffId: 'staff-mgr-02',
    staffName: 'Sarah Collins',
    staffEmail: 'sarah.ops@portabox.com.au',
    staffRole: 'manager',
    maskedMobile: '0412 ••• 001',
    method: 'sms',
    status: 'success',
    messageId: 'CS-MSG-98044',
    carrierRoute: 'Optus Australia High-Priority Gateway',
    ipAddress: '203.217.44.88 (Melbourne Fleet Depot)',
  },
  {
    id: 'mfa-log-103',
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    staffId: 'staff-drv-04',
    staffName: 'Dave Miller',
    staffEmail: 'dave.driver@portabox.com.au',
    staffRole: 'driver',
    maskedMobile: '0421 ••• 334',
    method: 'sms',
    status: 'failed',
    failureReason: 'Invalid 6-digit OTP entered (Attempt 1 of 3)',
    messageId: 'CS-MSG-97992',
    carrierRoute: 'Vodafone AU Cellular Network',
    ipAddress: '49.198.112.5 (Adelaide Depot Fleet Cab 04)',
  },
  {
    id: 'mfa-log-104',
    timestamp: new Date(Date.now() - 53 * 60 * 1000).toISOString(),
    staffId: 'staff-drv-04',
    staffName: 'Dave Miller',
    staffEmail: 'dave.driver@portabox.com.au',
    staffRole: 'driver',
    maskedMobile: '0421 ••• 334',
    method: 'sms',
    status: 'success',
    messageId: 'CS-MSG-97998',
    carrierRoute: 'Vodafone AU Cellular Network',
    ipAddress: '49.198.112.5 (Adelaide Depot Fleet Cab 04)',
  },
  {
    id: 'mfa-log-105',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    staffId: 'staff-cc-03',
    staffName: 'Chloe Davis',
    staffEmail: 'chloe.agent@portabox.com.au',
    staffRole: 'call_center',
    maskedMobile: '0433 ••• 782',
    method: 'sms',
    status: 'success',
    messageId: 'CS-MSG-97815',
    carrierRoute: 'Telstra Direct Mobile Gateway (SMPP AU-01)',
    ipAddress: '124.168.92.19 (Adelaide Call Center Hub)',
  },
  {
    id: 'mfa-log-106',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    staffId: 'unknown',
    staffName: 'Unknown Identifier',
    staffEmail: 'robert.hack@external-unknown.com',
    staffRole: 'driver',
    maskedMobile: '04•• ••• •••',
    method: 'sms',
    status: 'failed',
    failureReason: 'Staff account not found or invalid password credentials',
    carrierRoute: 'Rejected at Pre-Auth Barrier',
    ipAddress: '185.220.101.5 (External Unrecognized IP)',
  },
  {
    id: 'mfa-log-107',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    staffId: 'staff-adm-05',
    staffName: 'Marcus Webb',
    staffEmail: 'marcus.admin@portabox.com.au',
    staffRole: 'admin_pricing',
    maskedMobile: '0409 ••• 123',
    method: 'sms',
    status: 'success',
    messageId: 'CS-MSG-97420',
    carrierRoute: 'Optus Australia High-Priority Gateway',
    ipAddress: '139.130.4.5 (Sydney Commercial Office)',
  },
];

export function loadMfaAuditLogs(): MfaAuditLogEntry[] {
  try {
    const raw = localStorage.getItem(MFA_AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MFA_AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_MFA_AUDIT_LOGS));
      return INITIAL_MFA_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MFA_AUDIT_LOGS;
  } catch (err) {
    console.error('Failed to load MFA audit logs from localStorage:', err);
    return INITIAL_MFA_AUDIT_LOGS;
  }
}

export function saveMfaAuditLogs(logs: MfaAuditLogEntry[]): void {
  try {
    // Keep up to 200 most recent logs
    const trimmed = logs.slice(0, 200);
    localStorage.setItem(MFA_AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save MFA audit logs:', err);
  }
}

export function recordMfaAuditLog(
  entry: Omit<MfaAuditLogEntry, 'id' | 'timestamp'>
): MfaAuditLogEntry {
  const currentLogs = loadMfaAuditLogs();
  const newEntry: MfaAuditLogEntry = {
    ...entry,
    id: `mfa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  const updatedLogs = [newEntry, ...currentLogs];
  saveMfaAuditLogs(updatedLogs);

  // Dispatch browser event so any open CEO audit workspace updates instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox:mfa-audit-updated', { detail: newEntry }));
  }

  return newEntry;
}

export function clearMfaAuditLogs(): void {
  try {
    localStorage.setItem(MFA_AUDIT_STORAGE_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portabox:mfa-audit-updated', { detail: null }));
    }
  } catch (err) {
    console.error('Failed to clear MFA audit logs:', err);
  }
}

export function simulateTestMfaAuditLog(status: 'success' | 'failed' | 'dispatched'): MfaAuditLogEntry {
  const staffMembers = loadStaffMembers();
  const randomStaff = staffMembers[Math.floor(Math.random() * staffMembers.length)];

  if (status === 'success') {
    return recordMfaAuditLog({
      staffId: randomStaff.id,
      staffName: randomStaff.name,
      staffEmail: randomStaff.email,
      staffRole: randomStaff.role,
      maskedMobile: maskAustralianMobile(randomStaff.mobile),
      method: 'sms',
      status: 'success',
      messageId: `CS-MSG-${Math.floor(10000 + Math.random() * 90000)}`,
      carrierRoute: 'Telstra Direct Mobile Gateway (SMPP AU-01)',
      ipAddress: '124.168.92.14 (Verified Adelaide Gateway)',
    });
  } else if (status === 'dispatched') {
    return recordMfaAuditLog({
      staffId: randomStaff.id,
      staffName: randomStaff.name,
      staffEmail: randomStaff.email,
      staffRole: randomStaff.role,
      maskedMobile: maskAustralianMobile(randomStaff.mobile),
      method: 'sms',
      status: 'dispatched',
      messageId: `CS-MSG-${Math.floor(10000 + Math.random() * 90000)}`,
      carrierRoute: 'ClickSend SMPP In-Flight Dispatch',
      ipAddress: '124.168.92.14 (Verified Adelaide Gateway)',
    });
  } else {
    return recordMfaAuditLog({
      staffId: randomStaff.id,
      staffName: randomStaff.name,
      staffEmail: randomStaff.email,
      staffRole: randomStaff.role,
      maskedMobile: maskAustralianMobile(randomStaff.mobile),
      method: 'sms',
      status: 'failed',
      failureReason: 'Invalid 6-digit OTP entered or expired challenge window',
      messageId: `CS-MSG-${Math.floor(10000 + Math.random() * 90000)}`,
      carrierRoute: 'Optus Direct Gateway',
      ipAddress: '203.217.44.88 (Unusual IP range flagged)',
    });
  }
}

