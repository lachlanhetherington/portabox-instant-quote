/* A real check behind the admin door.
 *
 * What shipped was a demonstration of a login rather than a login: the
 * password box is pre-filled with bullet characters and never compared to
 * anything, handleAdminCredentialsSubmit only checks the email field is
 * non-empty, the 2FA code is generated in the browser and typed into the box
 * for you, and verifyTwoFactorCode accepts 123456, 849201 or 000000 from
 * anyone. Wiring that up as the gate would have looked like security while
 * admitting every visitor.
 *
 * So the password is checked here instead, in a function, against a secret
 * that is only ever on the server. ADMIN_PASSWORD never reaches the bundle.
 *
 * Be clear about what this is and is not. The admin interface is part of a
 * single-page bundle that every visitor downloads, so a determined person
 * can still read its code and forge the client-side session. What this stops
 * is a visitor opening the admin because the button was there. The data that
 * actually matters is defended where it lives: firestore.rules denies
 * everything by default and the Firestore-backed collections require a
 * signed-in user. The durable fix for the rest is to stop shipping the admin
 * to the public deployment at all.
 */
import crypto from 'crypto';
import type { Express, Request, Response } from 'express';

const TTL_MS = 8 * 60 * 60 * 1000; // a working day

const secret = () =>
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';

const sign = (expiresAt: number) =>
  crypto.createHmac('sha256', secret()).update(String(expiresAt)).digest('hex');

export function issueToken(): string {
  const expiresAt = Date.now() + TTL_MS;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifyToken(token: unknown): boolean {
  if (typeof token !== 'string' || !secret()) return false;
  const [expRaw, mac] = token.split('.');
  const expiresAt = Number(expRaw);
  if (!expiresAt || !mac || Date.now() > expiresAt) return false;
  const expected = sign(expiresAt);
  /* Fixed-length compare; both sides are hex digests of the same size. */
  if (mac.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected));
}

export function registerAdminAuth(app: Express) {
  /* Unconfigured, every attempt fails closed. An admin nobody can open is a
     smaller problem than one everybody can. */
  app.get('/api/admin/status', (_req: Request, res: Response) => {
    res.json({ configured: Boolean(process.env.ADMIN_PASSWORD) });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return res.status(503).json({
        error: 'Admin access is not configured on this deployment.',
      });
    }
    const supplied = String((req.body || {}).password ?? '');
    const ok =
      supplied.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    if (!ok) return res.status(401).json({ error: 'Incorrect password.' });
    res.json({ token: issueToken() });
  });

  app.post('/api/admin/verify', (req: Request, res: Response) => {
    res.json({ valid: verifyToken((req.body || {}).token) });
  });
}
