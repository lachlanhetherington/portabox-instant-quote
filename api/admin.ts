/* Staff sign-in, on its own.
 *
 * Deliberately separate from api/index.ts. That one pulls in the CRM routes,
 * which reach Twilio, Firebase, Gemini and Smartsheet — and several of those
 * build their clients at module scope from environment variables, so one
 * unset secret takes the whole function down at import. When that happened,
 * /api/admin/login went with it: the gate failed closed and nobody could
 * sign in, staff included.
 *
 * Signing in should not depend on whether the SMS provider is configured.
 * This imports nothing but the password check.
 */
import express from 'express';
import { registerAdminAuth } from '../src/server/adminAuth';

const app = express();
app.use(express.json());
registerAdminAuth(app);

export default app;
