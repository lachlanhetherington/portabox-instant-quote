import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import twilio from 'twilio';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

/**
 * Server-side authentication.
 *
 * Staff endpoints require a Firebase ID token (header `X-Staff-Token`) that
 * Google verifies for us via the Identity Toolkit API. The account must either
 * carry the custom claim `staff: true` or have a verified email listed in the
 * STAFF_EMAILS env var (comma separated). With neither configured, every
 * request is rejected (fail closed).
 *
 * Webhook endpoints are verified with the provider's own signature (Twilio) or
 * a shared secret (WEBHOOK_SECRET) passed as `?secret=` or `X-Webhook-Secret`.
 */

const TOKEN_CACHE_MS = 5 * 60 * 1000;
export const STAFF_ROLES = ['ceo', 'manager', 'call_centre_supervisor', 'call_center', 'driver', 'admin_pricing', 'warehouse'] as const;
export type StaffRoleName = (typeof STAFF_ROLES)[number];
export interface StaffUser { email: string; name: string; role: StaffRoleName }

const tokenCache = new Map<string, { user: StaffUser; exp: number }>();

/** STAFF_ROLES_MAP="a@x.com:ceo,b@x.com:driver" — roles for allow-listed emails. */
function roleFromEnv(email: string): StaffRoleName | undefined {
  for (const pair of (process.env.STAFF_ROLES_MAP || '').split(',')) {
    const [e, r] = pair.split(':').map((v) => v?.trim());
    if (e && e.toLowerCase() === email && (STAFF_ROLES as readonly string[]).includes(r)) return r as StaffRoleName;
  }
  return undefined;
}

function staffEmails(): Set<string> {
  return new Set(
    (process.env.STAFF_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function lookupIdToken(idToken: string): Promise<StaffUser | null> {
  const cached = tokenCache.get(idToken);
  if (cached && cached.exp > Date.now()) return cached.user;

  const apiKey = process.env.FIREBASE_API_KEY || (firebaseConfig as any).apiKey;
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  );
  if (!resp.ok) return null;
  const data: any = await resp.json();
  const user = data?.users?.[0];
  if (!user) return null;

  let claims: any = {};
  try {
    claims = user.customAttributes ? JSON.parse(user.customAttributes) : {};
  } catch {
    claims = {};
  }
  const email = String(user.email || '').toLowerCase();
  const emailOk = !!email && user.emailVerified === true && staffEmails().has(email);
  if (!(claims.staff === true || emailOk)) return null;

  // Role: custom claim `role`, else STAFF_ROLES_MAP, else least-privilege default.
  const role: StaffRoleName =
    (STAFF_ROLES as readonly string[]).includes(claims.role) ? claims.role : roleFromEnv(email) || 'call_center';
  const staff: StaffUser = { email, name: String(user.displayName || email), role };
  tokenCache.set(idToken, { user: staff, exp: Date.now() + TOKEN_CACHE_MS });
  if (tokenCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of tokenCache) if (v.exp < now) tokenCache.delete(k);
  }
  return staff;
}

export async function requireStaff(req: Request, res: Response, next: NextFunction) {
  const token = req.get('x-staff-token');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const user = await lookupIdToken(token);
    if (!user) return res.status(403).json({ error: 'Not authorised' });
    (req as any).staffUser = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/** Restrict a route to specific roles (apply after requireStaff). */
export function requireRole(...roles: StaffRoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: StaffUser | undefined = (req as any).staffUser;
    if (!user || (user.role !== 'ceo' && !roles.includes(user.role))) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    return next();
  };
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Shared-secret check for providers that cannot sign requests (ClickSend, Smartsheet). */
export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.WEBHOOK_SECRET;
  const provided = String(req.get('x-webhook-secret') || req.query.secret || '');
  if (!expected || !provided || !safeEqual(provided, expected)) {
    return res.status(401).send('Unauthorized');
  }
  return next();
}

/** Twilio request signature check. Requires TWILIO_AUTH_TOKEN and APP_URL. */
export function requireTwilioSignature(req: Request, res: Response, next: NextFunction) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.APP_URL;
  const signature = req.get('x-twilio-signature');
  if (!authToken || !appUrl || !signature) return res.status(401).send('Unauthorized');
  const url = appUrl.replace(/\/$/, '') + req.originalUrl;
  if (!twilio.validateRequest(authToken, signature, url, req.body || {})) {
    return res.status(401).send('Unauthorized');
  }
  return next();
}
