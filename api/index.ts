/* The API, as a single Vercel function.
 *
 * vercel.json rewrites every /api/* request here, and this hands the whole
 * lot to the same Express app the local dev server builds. One function
 * rather than nine files means the routes stay exactly where upstream keeps
 * them: the next drop from the CRM repo changes src/server/apiRoutes.ts and
 * nothing here needs touching.
 *
 * Nothing is imported at the top of this file, and that is deliberate.
 *
 * This used to be `import express from 'express'` with the app built at
 * module scope and exported directly. It returned FUNCTION_INVOCATION_FAILED
 * for every /api/* path — including paths with no route at all, which
 * Express would have answered with a 404, so the module was failing before
 * any route ran. api/admin.ts, sitting beside it, worked throughout: it
 * exports a plain handler and imports only node:crypto. The difference is
 * the shape, and package.json sets "type": "module", which makes a
 * top-level default import of a CommonJS package like express depend on how
 * the platform compiled this file.
 *
 * So the module body is now free of imports and the default export is a
 * plain async handler, which is the shape that works. Everything is pulled
 * in on the first request and kept for later ones, so the cost falls on one
 * cold start rather than every invocation.
 *
 * A failure now answers with the reason instead of taking the whole
 * function down unexplained — which is also the only way to see it from
 * outside, since these logs need the deployment's own Vercel account.
 *
 * Note that these routes are not serving the quote flow. Step 1 to Step 6
 * make no API calls at all — this is the CRM side: the Twilio and ClickSend
 * SMS callbacks, the Google Drive proxy, the Gemini endpoints and the
 * Smartsheet sync. A deployment with none of those secrets set still takes
 * quotes.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let app: Promise<Handler> | null = null;

async function build(): Promise<Handler> {
  /* Read off the namespace rather than the default binding: under
     "type": "module" a CommonJS package can arrive either way depending on
     how this file was compiled, and this works for both. */
  const mod: any = await import('express');
  const express = mod.default ?? mod;

  const { registerApiRoutes } = await import('../src/server/apiRoutes');
  const { registerAdminAuth } = await import('../src/server/adminAuth');

  const instance = express();
  instance.use(express.json());
  registerAdminAuth(instance);
  registerApiRoutes(instance);
  return instance as Handler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!app) app = build();
    return (await app)(req, res);
  } catch (err: any) {
    /* Let the next request try again rather than caching the failure. */
    app = null;
    console.error('API function failed to start:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'The API could not start.',
      detail: err?.message || String(err),
    }));
  }
}
