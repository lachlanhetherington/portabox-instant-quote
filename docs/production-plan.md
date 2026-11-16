# Portabox CRM: production launch plan

Drafted 16 Nov 2026 from a review of the code on `main` (ff333e9) and the live staging service.

## 1. Where things stand

**Works today and can go to production**

- One Docker image. Config comes from env vars at runtime (`window.__PUBLIC_ENV__`), so staging and production can run the same build.
- Cloud Run staging service `portabox-staging` in Sydney (`australia-southeast1`).
- Staff sign-in: Firebase Auth (Google, email link, optional Microsoft). Server-side role checks (`serverAuth.ts`). Every `/api` route requires staff unless it's on the public/webhook allowlist.
- Rate limits on public and costly routes. Twilio signature checks and webhook shared secrets.
- Firestore (`(default)`, Sydney) holds quote numbers, quote records/freezes, public settings, admin pricing settings and their history.
- Smartsheet is the shared system of record for finished quotes.
- CI on every PR: type check and pricing tests.

**Not ready for real customers**

| Area | Finding | Where |
|---|---|---|
| Data exposure | `public/assets/aistudio/*.csv` are Smartsheet exports with name/email/phone columns (about 10 rows with email addresses). Anything in `public/` is publicly downloadable: staging serves them now (HTTP 200). Screenshots and PDFs sit in the same folder. | `public/assets/aistudio/` |
| Payments | Braintree is simulated: `processBraintreePayment` waits 950 ms and returns a fake "settled" transaction, falling back to a made-up sandbox key. Zepto EFT works the same way. | `src/services/braintreeService.ts`, `zeptoEftService.ts` |
| SMS | Without provider keys, sending reports success with `providerUsed: 'simulated'`. In production that would silently lose customer texts. | `src/services/smsService.ts` |
| Browser-only data | About 25 services keep data in `localStorage`: leads, drop-offs, customer-portal accounts, container inventory, scheduled deliveries, driver/telephony state. That data lives in one browser, isn't shared between staff, and is lost when the cache is cleared. | `pricingEngine.ts`, `customerPortalService.ts`, and others |
| Shared database | Local, staging and production would share one Firestore database. They also share the quote counter, so testing uses up real quote numbers. | `serverStore.ts` |
| Secrets | Secrets (Smartsheet token, Gemini key, Twilio, ClickSend, webhook secret) are plain Cloud Run env vars, visible to anyone with viewer access. | `scripts/deploy-staging.sh` |
| Permissions | The server runs as the default compute service account, which has `roles/editor` on the whole project. | Cloud Run |
| Deploys | Deploys build from whatever local folder runs the script (`--source .`), not from `main`. Two folders have already overwritten each other's deploys, and a deploy with a stale `.env.staging` locked Dan out. | `deploy-staging.sh` |
| Runtime | Production runs `npx tsx server.ts`, compiling TypeScript at startup, which slows cold starts. There's no health-check endpoint and no security headers (CSP, HSTS, frame options). | `Dockerfile`, `server.ts` |
| Backups and monitoring | No Firestore backups or point-in-time recovery, no uptime checks, no error alerts, no budget alerts. | GCP |
| Firestore rules | Rules are deny-by-default, which is good, but the rules tests in `security_spec.md` were never written. | `firestore.rules` |
| GitHub | `main` isn't protected, so a failing check doesn't block a merge. | GitHub (needs Pro) |

## 2. Recommended launch scope

Don't try to launch every module at once. Launch in two phases.

**Phase 1 (go-live):** customers use the quote tool (steps 1 to 9, quote number, saved quote, reopen quote) and staff run quoting and admin pricing. Finished quotes go to Dan's live Smartsheet. Bookings are confirmed by staff over phone or email, and payment is taken the way Portabox takes it today, outside the app.

**Phase 2 (after go-live):** real payments, a customer portal with server-side accounts, driver/warehouse/inventory modules, and live telephony. Each of these needs its data moved off `localStorage` to Firestore or Smartsheet before it's real.

During Phase 1, modules that aren't real yet are hidden behind a production feature flag. That includes the payment step and the driver, warehouse, customer-portal and telephony screens. Customers then can't "pay" into a simulator, and staff can't enter data that disappears.

## 3. Work plan

Owners: **A** = Andrew, **D** = Dan, **C** = Claude Code (as PRs for Andrew to review).

### Phase 0: urgent, this week

1. **C (done 16 Nov):** Removed the CSVs, screenshots and PDFs from `public/assets/aistudio/`. The three container images the quote steps use moved to `public/images/containers/`. **A:** merge, then redeploy staging so the files stop being served.
2. **A:** Decide whether those rows are real customers. If they are, record what happened: the files were public on the staging URL from 11 Nov.
3. **C:** Purge the files from git history only if needed. The repo is private, so removing them from the served folder is the main fix.

### Phase 1A: separate production from staging (about 1 to 2 days)

> **Status (16 Nov): done and live on staging** (revision 00031: `staging` database, Secret Manager, `portabox-run`, staff claims set). The code: `FIRESTORE_DATABASE_ID`, `QUOTE_NUMBER_START`, `scripts/deploy.sh`, `scripts/push-secrets.sh`, `scripts/setup-gcp.sh`, `scripts/copy-settings.ts`, and the `deploy/` config. Andrew runs the setup steps (see "Phase 1A rollout" below).

4. **C:** Add `FIRESTORE_DATABASE_ID` to `serverStore.ts`. Create a named database `staging` in Sydney for staging and local dev, and keep `(default)` for production. This also gives each environment its own quote counter. (A separate GCP project is the stronger option, but it needs Firebase config injected at runtime and a second Auth tenant. Not worth it for Phase 1.)
5. **A:** Create a dedicated service account `portabox-run@…` with `roles/datastore.user` and `roles/secretmanager.secretAccessor` only, and run both services as it.
6. **A/C:** Move secrets to Secret Manager and mount them with `--set-secrets`. Keep non-secret config (`STAFF_ROLES_MAP`, sheet IDs, rate limits) as env vars, defined in a committed `deploy/prod.env.yaml` / `deploy/staging.env.yaml` (no secrets). Every deploy then gets the same staff list, which fixes the drift that locked Dan out.
7. **C:** Move staff access to Firebase custom claims (`npm run staff:claims`, which already exists). `STAFF_EMAILS` then stays a bootstrap fallback rather than the only list.

### Phase 1B: harden the app (about 2 to 3 days)

> **Status (16 Nov):** items 8, 9, 10, 12 and 14 are live on staging (PRs #33 and #35; the health check is `/health`, because Cloud Run reserves `/healthz`). Item 11 is merged (PR #37, `src/services/productionFeatures.ts`). Item 13: Firestore rules tests (`npm run test:rules`) and Playwright end-to-end tests (`npm run test:e2e`) run in CI's `checks` job. With that, Phase 1B is complete. The CSP is report-only until staging's reports are clean.

8. **C:** Bundle the server with esbuild (`dist/server.js`) and run it with `node` instead of `npx tsx`.
9. **C:** Add `GET /health` and point Cloud Run's startup/liveness probes at it.
10. **C:** Add security headers (helmet: CSP allowing Google Maps/Firebase/Gemini, HSTS, `frame-ancestors`, `nosniff`).
11. **C:** Add a `PRODUCTION_FEATURES` flag that hides the simulated modules (see section 2), served through `/api/public/settings`.
12. **C:** Make simulations fail loudly in production. With `NODE_ENV=production` and no provider keys, SMS returns an error instead of a fake success, and the Braintree sandbox fallback key is never used.
13. **C:** Write the Firestore rules tests (emulator and vitest) and an end-to-end smoke test (Playwright): create a quote, get a number, submit to the TEST sheet, reopen it. Add both to CI.
14. **C:** Add structured JSON logging with a request ID so logs group properly in Cloud Logging.

### Phase 1C: production infrastructure (about 1 to 2 days, mostly Andrew in the GCP console)

15. **D/A:** Pick the domain, e.g. `quote.portabox.com.au` (customers) and `crm.portabox.com.au` (staff), or a single domain. **Caution:** Cloud Run's built-in domain mapping isn't offered in Sydney. Put Firebase Hosting in front, rewriting to the Cloud Run service (simplest, free certificate), or use a global HTTPS load balancer with a serverless NEG (more control, adds Cloud Armor, about US$18/month).
16. **A:** Create the `portabox-prod` Cloud Run service with min instances 1 (no cold start for customers, roughly AU$15 to 30/month), max instances 3, 1 GiB memory, CPU boost on startup.
    - The rate limiter keeps counts in memory, so each instance counts separately. That's acceptable at this scale. Move to a shared store only if traffic grows.
17. **A:** Set `APP_URL` to the custom domain (Twilio signature checks depend on it). Add the domain to Firebase Auth authorised domains. Lock the Maps browser key to the production referrer. Create a separate, restricted Maps key for production.
18. **A:** Firestore: enable point-in-time recovery and a daily scheduled backup with 14 to 30 day retention. Keep delete protection on. Publish the rules to both databases.
19. **A:** Monitoring: an uptime check on `/health`, an alert on 5xx rate and on error-log spikes (email or SMS to Andrew), and Error Reporting. Set a billing budget with alerts at 50/90/100%, and a Gemini API quota cap.

### Phase 1D: deploy pipeline (about 1 day)

20. **C:** GitHub Actions deploy workflow using Workload Identity Federation (no JSON keys):
    - every merge to `main` builds the image once, pushes it to Artifact Registry tagged with the commit SHA, and deploys it to **staging**
    - **production** is a manual "promote" step (`workflow_dispatch` with a GitHub environment that requires Andrew's approval) that deploys the *same image* already tested on staging
    - roll back by moving traffic to the previous revision (`gcloud run services update-traffic --to-revisions`)
21. **A:** Turn on branch protection once GitHub Pro is active. Require the `checks` status and one review.
22. Retire `scripts/deploy-staging.sh`, or keep it only for emergencies.

### Phase 1E: integrations and business setup (in parallel, mostly Dan and Andrew)

23. **D/A:** Smartsheet: production points at the live CRM sheet `3517583962886020` with `SMARTSHEET_QUOTES_ONLY` off. Staging keeps the TEST copy. Confirm with Dan which columns he relies on, and sign off with one real test quote that's then deleted.
24. **D/A:** SMS: choose ClickSend or Twilio for production. Register the sender ID "Portabox" (Australian sender-ID registration is now required). Point inbound webhooks at the production URL with the webhook secret.
25. **A:** Gemini: use a production API key in its own project or quota, with a spending limit.
26. **D:** Legal (Australian Privacy Act and Spam Act):
    - publish a privacy policy and a collection notice on the quote form
    - get SMS/email consent, with a working "STOP" opt-out
    - add quote terms and conditions, and the 5-day disclaimer wording
    - data stays in Sydney, which is good to state

### Phase 1F: launch (1 day, plus 2 weeks of support)

27. **Dress rehearsal on staging:** Dan and a call-centre user run a full day of real-looking quotes. Staff sign in with every provider they'll use. Check the Smartsheet rows column by column.
28. **Production smoke test:** one internal quote end to end on the production domain. Then reset the production quote counter (`counters/quotes`) to the agreed starting number.
29. **Go live:** switch the website's "Get a quote" links to the production domain. Andrew watches logs and alerts for the first few days.
30. **Support period (2 weeks):** a daily check of errors and Smartsheet rows, and a quick fix-forward process (PR → staging → promote).

### Phase 2: after go-live

- **Payments:** a real Braintree integration. The server SDK creates a client token and runs the sale with the private key, which lives in Secret Manager. The browser uses Hosted Fields/Drop-in only (PCI SAQ-A), and a webhook records settlement. Test it fully in the Braintree sandbox before going live.
- Move leads, customer-portal accounts, inventory and deliveries from `localStorage` to Firestore, behind server APIs with the same role checks. Use Firebase Auth for customer sign-in.
- Driver, warehouse and telephony modules, one at a time, each with its own data model, tests and feature flag.
- Load testing and a disaster-recovery drill (restore a Firestore backup to a scratch database).

## 4. Decisions needed

1. **Scope:** is the Phase 1 scope right, with quoting live and payments/portal/drivers hidden?
2. **Domain:** which domain(s), and who manages DNS?
3. **Database separation:** a named Firestore database for staging (recommended), or a separate GCP project?
4. **SMS provider** for production: ClickSend or Twilio?
5. **Quote numbers:** the starting quote number for production, and whether the numbers used during testing matter.
6. **Customer CSV rows:** are the rows in `public/assets/aistudio/*.csv` real customers?
7. **Target go-live date**, which sets how much of Phase 1B is must-have and how much can follow later.

## 5. Rough timeline

If decisions come back quickly, about **2 to 3 weeks** to go-live:

| Week | Work |
|---|---|
| 1 | Phase 0, 1A, 1B |
| 2 | Phase 1C, 1D; Dan's legal and SMS work in parallel |
| 3 | Dress rehearsal, launch, start of the support period |

Phase 2 (payments first) can start straight after.

## Phase 1A rollout (Andrew, in a terminal, from the main checkout after merging)

```bash
git pull
gcloud auth application-default login                       # once; for the two npm scripts
gcloud auth application-default set-quota-project gen-lang-client-0776892310
scripts/setup-gcp.sh                                         # service account, staging DB, rules, Secret Manager
scripts/push-secrets.sh staging .env.staging                 # secrets from the existing staging file
npm run settings:copy -- --from-db "(default)" --from-env portabox-staging --to-db staging --dry-run
npm run settings:copy -- --from-db "(default)" --from-env portabox-staging --to-db staging
scripts/deploy.sh staging
DOTENV_CONFIG_PATH=.env.staging npm run staff:claims -- --dry-run
DOTENV_CONFIG_PATH=.env.staging npm run staff:claims
```

After that, staging uses the `staging` database (quote numbers from Q-900001), runs as `portabox-run`, and reads its secrets from Secret Manager. To change the staff list, edit `.env.staging`, then run `push-secrets.sh` and `staff:claims` and redeploy. The old `(default)` data (Q-100001 to Q-100004 and the staging settings) stays there until the production counter is reset at launch.

Once nothing runs as the default compute service account any more, remove its `roles/editor` grant.
