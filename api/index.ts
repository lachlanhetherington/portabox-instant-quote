/* The API, as a single Vercel function.
 *
 * vercel.json rewrites every /api/* request here, and this hands the whole
 * lot to the same Express app the local dev server builds. One function
 * rather than nine files means the routes stay exactly where upstream keeps
 * them: the next drop from the CRM repo changes src/server/apiRoutes.ts and
 * nothing here needs touching.
 *
 * Vercel invokes the default export with the Node request and response, and
 * an Express app is already that function, so it is exported directly.
 *
 * Note that these routes are not serving the quote flow. Step 1 to Step 6
 * make no API calls at all — this is the CRM side: the Twilio SMS and voice
 * callbacks, the Google Drive proxy, the Gemini endpoints and the Smartsheet
 * sync. A deployment with none of those secrets set still takes quotes.
 */
import express from 'express';
import { registerApiRoutes } from '../src/server/apiRoutes';
import { registerAdminAuth } from '../src/server/adminAuth';

const app = express();
app.use(express.json());
registerAdminAuth(app);
registerApiRoutes(app);

export default app;
