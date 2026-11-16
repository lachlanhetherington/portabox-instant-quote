# Taking an upstream drop, by hand

Upstream is **ahammo67/portabox-CRM** (private). It is not a git remote of
this repository and the two histories are unrelated: a drop arrives as a file
copy, because this repo also carries the local fixes in `local-fixes.mjs` and
the deployment wiring (`api/`, `vercel.json`, `src/server/`) that upstream has
no equivalent of.

`.upstream-crm.json` records which upstream revision this repo currently
carries. It is the only record of where we are up to.

There used to be a scheduled GitHub Action doing all of this. It was removed
on 16 Nov 2026 in favour of running it by hand. The tools it called are all
still here and are the same ones it used — "manual" means a handful of
commands, not starting from nothing.

---

## The procedure

```bash
# 1. Start clean, from main
git checkout main && git pull --ff-only

# 2. Get upstream (needs an account with access; the repo is private)
git clone https://github.com/ahammo67/portabox-CRM.git /tmp/crm
#    or, if you already have it:  git -C /tmp/crm fetch origin

# 3. Apply it. Copies the files, re-extracts the API routes, restores our
#    server.ts wrapper, re-applies the local fixes, scans for credentials,
#    diffs the prices, and lists every staff surface with whether it is gated.
node tools/apply-upstream-drop.mjs --upstream /tmp/crm --report /tmp/drop.md

# 4. Read /tmp/drop.md. It ends with a "for a person to read" section and,
#    if anything blocks, a "Blocking" section. Deal with those first.

# 5. Check it builds and passes
npm install
npx tsc --noEmit
npx vitest run                 # upstream's suite, including the pricing grid
npx vite build

# 6. Check nothing opens that should not, in a real browser
ADMIN_PASSWORD=anything PORT=3111 NODE_ENV=production npx tsx server.ts &
ADMIN_PASSWORD=anything node tools/verify-staff-gates.cjs

# 7. Put it on staging, never straight on main
git add -A && git commit
git push origin HEAD:staging

# 8. Look at it: https://portabox-instant-quote-git-staging-lhm-edia.vercel.app
#    (sign in to Vercel first — preview deployments are protected)

# 9. When happy, merge staging into main. That is what deploys production.
#    Use a merge commit, not a squash, so staging stays an ancestor of main.
git checkout main && git merge --no-ff staging && git push origin main

# 10. Check production actually came up
node tools/smoke-live.cjs https://portabox-instant-quote-dun.vercel.app
```

---

## What each tool is for

| | |
|---|---|
| `apply-upstream-drop.mjs` | the whole of step 3; writes the report |
| `extract-api-routes.cjs` | re-extracts `src/server/apiRoutes.ts` from upstream's `server.ts` |
| `local-fixes.mjs` | re-applies our patches; `--check` verifies without writing |
| `find-staff-surfaces.cjs` | lists staff surfaces and whether each is gated |
| `verify-staff-gates.cjs` | drives a browser; proves nothing opens to a forged session |
| `diff-pricing.cjs` | every number and flag that moved between two revisions |
| `smoke-live.cjs` | checks a deployed URL is actually serving the quote flow |

---

## The things that have actually gone wrong

Worth reading before trusting a clean run.

**A fix that no longer applies is not a formality.** `local-fixes.mjs` fails
loudly on purpose. Each fix is either a credential kept out of the bundle or a
staff surface kept shut. One drop moved the Firebase code, the fix stopped
applying, and a live Google key went into the staged commit — the credential
scan is what caught it.

**A green build is not a working site.** One drop added
`onAuthStateChanged(auth, ...)` on mount. With no Firebase config, `auth` was
null and the whole page rendered blank — for every customer. The type check,
the build and the unit tests all passed. Only `verify-staff-gates.cjs`, which
loads it in a browser, found it.

**Upstream's commit messages are not evidence.** One said "remove dev auth
bypass" and did not: the universal 2FA codes were still there, and the same
commit added a shared plaintext password. Read the diff.

**Prices move quietly.** `diff-pricing.cjs` reads every top-level constant in
the pricing engine, but it cannot tell you whether a change is the one the
client asked for. That question goes to Dan.

**Upstream's `.github/` is deliberately not copied.** Their CI installs with
bun against a lockfile that our patched `package.json` no longer matches, so
it fails in ten seconds and emails the repo owner on every push.
