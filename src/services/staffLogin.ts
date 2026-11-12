import type { User } from 'firebase/auth';
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { StaffMember, StaffRole, StaffSession } from '../types/adminAuth';
import { loadStaffMembers, setStaffSession, recordMfaAuditLog } from './adminAuthService';
import { auth } from './firebaseService';
import { apiFetch } from './apiClient';

const EMAIL_FOR_SIGNIN_KEY = 'portabox_staff_email_for_signin';

/** Emails a one-time sign-in link. Works for any address (no Google account needed). */
export async function sendStaffSignInLink(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  await sendSignInLinkToEmail(auth, clean, {
    url: `${window.location.origin}/`,
    handleCodeInApp: true,
  });
  try {
    localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, clean);
  } catch {}
}

export function isStaffSignInLink(href: string = window.location.href): boolean {
  return isSignInWithEmailLink(auth, href);
}

/** Completes sign-in when the user lands from the emailed link. */
export async function finishStaffEmailLinkSignIn(
  promptForEmail: () => string | null,
  href: string = window.location.href,
): Promise<User> {
  let email: string | null = null;
  try {
    email = localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
  } catch {}
  // Opened on a different device/browser: ask the user to confirm their email.
  if (!email) email = promptForEmail();
  if (!email) throw new Error('Email is required to complete sign-in.');
  const result = await signInWithEmailLink(auth, email.trim().toLowerCase(), href);
  try {
    localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
  } catch {}
  return result.user;
}

/**
 * Asks the server whether this signed-in identity is staff and what role it has,
 * then builds the local UI session. Signs out again if the server says no.
 */
export async function completeStaffLogin(
  user: User,
  provider: 'google' | 'email_link',
): Promise<StaffSession> {
  const attemptedEmail = user.email || 'unknown';
  const fail = async (message: string): Promise<never> => {
    await auth.signOut().catch(() => {});
    recordMfaAuditLog({
      staffId: 'unknown',
      staffName: attemptedEmail,
      staffEmail: attemptedEmail,
      staffRole: 'call_center',
      maskedMobile: '',
      method: 'google',
      status: 'failed',
      failureReason: message,
      carrierRoute: provider === 'google' ? 'Google / Firebase Authentication' : 'Email link / Firebase Authentication',
    });
    throw new Error(message);
  };

  const res = await apiFetch('/api/auth/me');
  if (!res.ok) {
    return fail(
      res.status === 403
        ? 'This email is not authorised for staff access. Ask the CEO to add you.'
        : 'Could not verify your staff access. Please try again.',
    );
  }
  const me: { email: string; name: string; role: StaffRole } = await res.json();

  const roster = loadStaffMembers().find((s) => s.email.toLowerCase() === me.email.toLowerCase());
  const member: StaffMember = {
    id: roster?.id || `staff-${me.email}`,
    name: roster?.name || me.name,
    email: me.email,
    username: roster?.username || me.email.split('@')[0],
    role: me.role, // server-verified
    title: roster?.title || me.role.replace('_', ' '),
    mobile: roster?.mobile || '',
    depotLocation: roster?.depotLocation || '',
    twoFactorEnabled: true,
    twoFactorMethod: 'passkey',
    status: roster?.status || 'active',
    customPermissions: roster?.customPermissions,
    avatarUrl: roster?.avatarUrl || user.photoURL || undefined,
    lastLogin: roster?.lastLogin,
    createdAt: roster?.createdAt || new Date().toISOString().split('T')[0],
  };
  if (member.status !== 'active') {
    return fail('This staff account has been suspended. Please contact the CEO for access.');
  }

  const session = setStaffSession(member, 'google');
  recordMfaAuditLog({
    staffId: member.id,
    staffName: member.name,
    staffEmail: member.email,
    staffRole: member.role,
    maskedMobile: '',
    method: 'google',
    status: 'success',
    carrierRoute: provider === 'google' ? 'Google / Firebase Authentication' : 'Email link / Firebase Authentication',
  });
  return session;
}
