# Portabox Instant Quote

The customer quote flow and the staff CRM, in one Vite + React app.

Upstream is `ahammo67/portabox-CRM`. This repository is that codebase plus a
set of local fixes, re-applied on every drop — see **Taking a new drop** below.

## Running it

```sh
npm install
npm run dev          # tsx server.ts — API and Vite on http://localhost:3000
```

One origin serves both the app and `/api/*`, which is what the client code
assumes. `npm run lint` is `tsc --noEmit`.

## Environment

**Nothing here is required for the quote flow.** Steps 1 to 6 make no API
calls and never touch Firebase, so an unconfigured deployment still takes
quotes. Everything below is the CRM side, and each one degrades on its own.

| Variable | Without it |
|---|---|
| `ADMIN_PASSWORD` | **The staff area is closed to everyone.** Set this or no one gets in |
| `ADMIN_SESSION_SECRET` | Falls back to `ADMIN_PASSWORD`; set it to sign sessions separately |
| `VITE_GOOGLE_MAPS_API_KEY` | Coverage map and routing previews do not render. **Billable — use your own key, restricted to your domains** |
| `VITE_FIREBASE_*` | Firestore features fail where they are used: messages, drivers, documents, dunning, telephony. `API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID` |
| `GEMINI_API_KEY` | The admin copilot and discount rule engine return errors |
| `VITE_SITE_URL` | The step-1 back arrow falls back to a built-in URL |
| `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_BRAINTREE_*` | Payment UI does not load its provider |

No credentials belong in this repository. They were committed upstream and
are stripped on every drop by `tools/local-fixes.mjs`.

## The staff area

`AdminGate` stands in front of the admin portal. The password is compared in
`/api/admin/login` against `ADMIN_PASSWORD`, which stays on the server, and
what comes back is a short HMAC-signed token in `sessionStorage`. Unset, it
fails closed.

**This is a door, not a wall.** The admin code still ships in the bundle that
every visitor downloads, so someone determined can read it and forge the
client-side session. What it stops is a customer opening the admin because
the button was there. The data that matters is defended where it lives:
`firestore.rules` denies everything by default and the Firestore collections
require a signed-in user. The durable fix is to stop shipping the admin to
the public deployment at all.

Upstream's own auth screen is not a check: the password is never compared,
the 2FA code is generated in the browser and pre-filled into the field, and
`verifyTwoFactorCode` accepts `123456`, `849201` and `000000` from anyone.
Do not wire it up as a gate.

## Deployment

Vercel. `vercel.json` sets the build and routes `/api/*` to a single function
(`api/index.ts`) that registers the same routes the dev server does, from
`src/server/apiRoutes.ts`. Everything else rewrites to `index.html`.

On a Hobby plan a **private** repository will not deploy when the commit
author is not the Vercel team owner: the push succeeds and no build starts.
Pro removes that, and is required anyway — Hobby prohibits commercial use.

## Taking a new drop

```sh
node tools/local-fixes.mjs          # apply, then verify
node tools/local-fixes.mjs --check  # verify only; exits 1 if anything is missing
```

Copy the new source over, run it, and read the output. It is idempotent and
deliberately strict: a fix whose anchor has moved **fails loudly** rather than
skipping, because a silently unapplied fix here means a published credential
or a blank page. Both have happened.

It currently carries eleven fixes. The ones that matter most:

- three live Google API keys removed, including the billable Maps one
- `firebaseService` reads config from the environment and never throws at
  import — it did, at module scope, which blanked the page before React
  mounted and read as a broken build
- the step-1 exit, which the CRM drop removed, leaving anyone arriving from
  the website with no way back
- the staff gate above
