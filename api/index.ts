/* The API, as a single Vercel function.
 *
 * vercel.json rewrites every /api/* request here, and this hands the whole
 * lot to the same Express app the local dev server builds. One function
 * rather than nine files means the routes stay exactly where upstream keeps
 * them: the next drop from the CRM repo changes src/server/apiRoutes.ts and
 * nothing here needs touching.
 *
 * Two things about the shape of this file are load-bearing.
 *
 * The imports are static, and must be. The Vercel Node builder bundles the
 * function's static import graph with esbuild, so a statically imported
 * file is compiled into the output and there is nothing left to resolve at
 * runtime, while an `await import()` is left as a runtime import of a file
 * that was never emitted. Deferring these to first use — to keep twilio and
 * firebase out of every invocation — produced exactly that:
 *
 *   Cannot find module '/var/task/src/server/apiRoutes'
 *   imported from /var/task/api/index.js
 *
 * The default export is a plain handler, not the Express app. The app used
 * to be built at module scope and exported directly, and every /api/* path
 * returned FUNCTION_INVOCATION_FAILED — including paths with no route at
 * all, which Express would have answered with a 404, so the module was
 * failing before any route ran. api/admin.ts, beside it on the same
 * deployment, worked throughout, and what it does differently is export a
 * handler. The app is built on the first request and kept for later ones.
 *
 * A failure also answers with its reason now, as JSON, rather than
 * FUNCTION_INVOCATION_FAILED with nothing attached. That is worth keeping:
 * reading these logs needs the deployment's own Vercel account, and three
 * attempts at this were spent inferring the cause from the outside.
 *
 * Note that these routes are not serving the quote flow. Step 1 to Step 6
 * make no API calls at all — this is the CRM side: the Twilio and ClickSend
 * SMS callbacks, the Google Drive proxy, the Gemini endpoints and the
 * Smartsheet sync. A deployment with none of those secrets set still takes
 * quotes.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import express from 'express';
import { registerApiRoutes } from '../src/server/apiRoutes';
import { registerAdminAuth } from '../src/server/adminAuth';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let app: Handler | null = null;

function build(): Handler {
  const instance = express();
  instance.use(express.json());
  registerAdminAuth(instance);
  registerApiRoutes(instance);
  return instance as unknown as Handler;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!app) app = build();
    return app(req, res);
  } catch (err: any) {
    /* Let the next request try again rather than caching the failure. */
    app = null;
    console.error('API function failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'The API could not start.',
      detail: err?.message || String(err),
    }));
  }
}
