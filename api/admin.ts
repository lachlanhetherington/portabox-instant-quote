/* Staff sign-in, as a plain Vercel function.
 *
 * Two things kept this from working in production, and both are worth
 * recording because they look like each other from outside.
 *
 * It is separate from api/index.ts because that one pulls in the CRM routes,
 * and those build Twilio, Firebase and Gemini clients at module scope from
 * environment variables. One unset secret takes the whole function down at
 * import — and /api/admin/login went down with it, so the gate failed closed
 * and nobody could sign in, staff included. Signing in should not depend on
 * whether the SMS provider is configured, so this imports nothing but the
 * password check.
 *
 * And it is plain rather than Express because this package is "type":
 * "module" and an Express app exported as default crashes Vercel's ESM
 * runtime with FUNCTION_INVOCATION_FAILED, which reports identically to the
 * import problem above. Three JSON endpoints do not need a framework.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { issueToken, verifyToken } from '../src/server/adminAuth';

type Req = IncomingMessage & { body?: unknown; url?: string };

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

/* Vercel parses JSON bodies, but a direct invocation might not have, so read
   the stream when the field is absent rather than assume one or the other. */
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

/* Length-independent comparison. timingSafeEqual throws on a length
   mismatch, which would leak the password's length through the error. */
const sameSecret = async (a: string, b: string) => {
  const { createHash, timingSafeEqual } = await import('crypto');
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
};

export default async function handler(req: Req, res: ServerResponse) {
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
    const supplied = String(body.password ?? '');
    if (!(await sameSecret(supplied, expected))) {
      return send(res, 401, { error: 'Incorrect password.' });
    }
    return send(res, 200, { token: issueToken() });
  }

  return send(res, 404, { error: 'Not found' });
}
