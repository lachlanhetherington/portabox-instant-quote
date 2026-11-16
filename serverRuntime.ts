import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request, Response, NextFunction } from 'express';

/**
 * Runtime environment, security headers and structured logging for the server.
 */

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export type AppEnv = 'production' | 'staging' | 'local';

/** APP_ENV from deploy/<env>.env.yaml. Anything unrecognised counts as local. */
export const APP_ENV: AppEnv = (() => {
  const v = (process.env.APP_ENV || '').trim().toLowerCase();
  return v === 'production' || v === 'staging' ? v : 'local';
})();

export const IS_PRODUCTION = APP_ENV === 'production';

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

/**
 * Who may show the app inside a frame. 'self' by default (stops clickjacking of the
 * staff portal). To embed the quote tool on the Portabox website, set
 * FRAME_ANCESTORS="'self' https://portabox.com.au https://www.portabox.com.au".
 */
const FRAME_ANCESTORS = (process.env.FRAME_ANCESTORS || "'self'").trim();

/**
 * Content-Security-Policy, sent as Report-Only for now: browsers report what it would
 * block (to /csp-report, visible in Cloud Logging) without blocking anything. Once the
 * reports are clean, switch CSP_MODE=enforce.
 */
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' covers the injected window.__PUBLIC_ENV__ script and inline handlers.
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://*.gstatic.com https://apis.google.com https://www.google.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://*.google.com https://*.twilio.com wss://*.twilio.com",
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://login.microsoftonline.com https://js.stripe.com https://www.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'report-uri /csp-report',
].join('; ');

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Firebase sign-in uses a popup that must be able to report back to this window.
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    // Camera: container QR scanning. Microphone: softphone. Location: drivers.
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self), payment=(self), usb=(), interest-cohort=()',
  });
  if (process.env.CSP_MODE === 'enforce') {
    res.set('Content-Security-Policy', `${CSP}; frame-ancestors ${FRAME_ANCESTORS}`);
  } else {
    // Enforce only the frame rule; report the rest until the reports are clean.
    res.set('Content-Security-Policy', `frame-ancestors ${FRAME_ANCESTORS}`);
    res.set('Content-Security-Policy-Report-Only', CSP);
  }
  // HTTPS only (Cloud Run is always HTTPS; skip on localhost so dev isn't pinned).
  if (APP_ENV !== 'local') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------

const requestContext = new AsyncLocalStorage<{ trace?: string; requestId: string }>();

/** Ties every log line written while handling a request to that request (and its trace). */
export function requestLogging(req: Request, res: Response, next: NextFunction) {
  const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0776892310';
  // X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=1 (set by Cloud Run's front end)
  const traceId = String(req.get('x-cloud-trace-context') || '').split('/')[0];
  const requestId = traceId || Math.random().toString(36).slice(2, 12);
  res.set('X-Request-Id', requestId);
  requestContext.run({ requestId, trace: traceId ? `projects/${project}/traces/${traceId}` : undefined }, next);
}

function format(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

/**
 * On Cloud Run, writes console output as one JSON object per line, which Cloud Logging
 * turns into entries with a severity and the request's trace. Locally, leaves console alone.
 * Set LOG_FORMAT=json or LOG_FORMAT=text to override.
 */
export function installStructuredLogging() {
  const json = process.env.LOG_FORMAT ? process.env.LOG_FORMAT === 'json' : !!process.env.K_SERVICE;
  if (!json) return;
  const write = (severity: string, stream: NodeJS.WriteStream) => (...args: unknown[]) => {
    const ctx = requestContext.getStore();
    const entry: Record<string, unknown> = { severity, message: format(args) };
    if (ctx?.trace) entry['logging.googleapis.com/trace'] = ctx.trace;
    if (ctx?.requestId) entry.requestId = ctx.requestId;
    stream.write(JSON.stringify(entry) + '\n');
  };
  console.log = write('INFO', process.stdout);
  console.info = write('INFO', process.stdout);
  console.debug = write('DEBUG', process.stdout);
  console.warn = write('WARNING', process.stderr);
  console.error = write('ERROR', process.stderr);
}
