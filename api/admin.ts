/* Staff sign-in, self-contained.
 *
 * Three things had to be stripped out of this before it would run on
 * Vercel, and they all report identically from outside — a 500 with
 * FUNCTION_INVOCATION_FAILED — which is why it took three passes.
 *
 *   1. It must not import the CRM routes. Those build Twilio, Firebase and
 *      Gemini clients at module scope from environment variables, so one
 *      unset secret takes the function down at import and the gate fails
 *      closed on staff as well as customers.
 *   2. It must not be an Express app. This package is "type": "module" and
 *      an Express default export crashes Vercel's ESM runtime.
 *   3. It must not import from outside api/. Cross-directory imports are
 *      not reliably traced into the function bundle.
 *
 * So it imports node:crypto and nothing else. The logic is small enough
 * that keeping a copy here is cheaper than the coupling; src/server/
 * adminAuth.ts keeps the Express version for local development, and the
 * token format is the same in both.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const TTL_MS = 8 * 60 * 60 * 1000; // a working day

type Req = IncomingMessage & { body?: unknown; url?: string };

const secret = () =>
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';

const sign = (expiresAt: number) =>
  createHmac('sha256', secret()).update(String(expiresAt)).digest('hex');

function issueToken(): string {
  const expiresAt = Date.now() + TTL_MS;
  return `${expiresAt}.${sign(expiresAt)}`;
}

function verifyToken(token: unknown): boolean {
  if (typeof token !== 'string' || !secret()) return false;
  const [expRaw, mac] = token.split('.');
  const expiresAt = Number(expRaw);
  if (!expiresAt || !mac || Date.now() > expiresAt) return false;
  return same(mac, sign(expiresAt));
}

/* Hash both sides first: timingSafeEqual throws on a length mismatch, and
   that alone would leak how long the password is. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest()
  );
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

async function readBody(req: Req): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export default async function handler(req: Req, res: ServerResponse) {
  try {
    const path = (req.url || '').split('?')[0].replace(/\/+$/, '');

    if (path.endsWith('/status')) {
      return send(res, 200, { configured: Boolean(process.env.ADMIN_PASSWORD) });
    }

    if (path.endsWith('/verify')) {
      const body = await readBody(req);
      return send(res, 200, { valid: verifyToken(body.token) });
    }

    if (path.endsWith('/login')) {
      const expected = process.env.ADMIN_PASSWORD;
      if (!expected) {
        return send(res, 503, { error: 'Admin access is not configured on this deployment.' });
      }
      const body = await readBody(req);
      if (!same(String(body.password ?? ''), expected)) {
        return send(res, 401, { error: 'Incorrect password.' });
      }
      return send(res, 200, { token: issueToken() });
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    /* Never fail opaquely here. A 500 with no body is what sent the last
       three fixes down the wrong path. */
    return send(res, 500, { error: 'Sign-in is unavailable', detail: String(e) });
  }
}
