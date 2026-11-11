/* The API, as a single Vercel function.
 *
 * vercel.json rewrites every /api/* request here, and this hands the whole
 * lot to the same Express app the local dev server builds. One function
 * rather than nine files means the routes stay exactly where upstream keeps
 * them: the next drop from the CRM repo changes src/server/apiRoutes.ts and
 * nothing here needs touching.
 *
 * THIS FUNCTION DOES NOT WORK ON THE DEPLOYMENT YET, and the reason is not
 * in this file. Read this before changing anything here.
 *
 * Every /api/* path returns FUNCTION_INVOCATION_FAILED, including paths
 * with no route at all, which Express would have answered with a 404 — so
 * the module fails before any route runs. The error, caught by making the
 * imports dynamic for one deploy so a handler could report it:
 *
 *   Cannot find module '/var/task/src/server/apiRoutes'
 *   imported from /var/task/api/index.js
 *
 * Node's ESM loader requires an explicit file extension in an import
 * specifier. package.json sets "type": "module", so the compiled function
 * is ESM; tsconfig.json sets "moduleResolution": "bundler", which lets the
 * whole source tree import extensionlessly and is meant only for code that
 * a bundler will consume. Vercel compiles these files but the emitted
 * specifiers stay extensionless, and Node will not guess, so nothing under
 * src/ can be loaded from here. api/admin.ts works on the same deployment
 * because it imports only node: builtins, which need no resolution.
 *
 * Static or dynamic imports only change whether the failure is legible: a
 * dynamic one fails inside the handler, where the catch below can report
 * it; a static one fails at module load, which no catch can reach. They are
 * static here because that is what the fix will want.
 *
 * Three ways out, none of them a change to this file alone:
 *   - compile the function to CommonJS, where extensionless resolution
 *     works. Blocked today by import.meta.env in services/firebaseService,
 *     which CommonJS cannot express, and that file needs it for the
 *     browser.
 *   - bundle the function into one file, so it has no runtime imports at
 *     all. Needs a build step that Vercel will pick up in place of
 *     compiling api/*.ts itself.
 *   - put explicit .js extensions throughout the chain. It is upstream's
 *     code, so that means patching it on every drop.
 *
 * Nothing customer-facing waits on this: the quote flow, Step 1 to Step 6,
 * makes no API calls, and the staff gate is api/admin.ts.
 *
 * The default export is a plain handler rather than the Express app, which
 * is the shape api/admin.ts has. The app is built on the first request and
 * kept for later ones.
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
