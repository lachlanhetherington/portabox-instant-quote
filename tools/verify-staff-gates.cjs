/* Check that no staff surface opens to someone who has not signed in, by
   driving a real browser.
 *
 *   node tools/verify-staff-gates.cjs [baseUrl]
 *
 * Run after every upstream drop, once local-fixes.mjs reports clean.
 * local-fixes tells you the patches still apply; this tells you they still
 * work, which is not the same thing — a drop can move a surface to a branch
 * no patch covers, and that is how the dispatch console, the driver portal
 * and the softphone bar each came to be open for a while.
 *
 * WHAT THIS TESTS CHANGED WITH THE DROP d76b975, and the change is good
 * news. It used to sign in as each staff member using what was in the public
 * bundle — six staff records carried the password 'Portabox2026!', and
 * verifyStaffMfaCode returned true for '123456', '849201' and '000000' for
 * anyone — and then checked the surface behind that still refused to open.
 *
 * Upstream removed all of it. verifyStaffMfaCode is gone, the plaintext
 * passwords are gone and are actively stripped from any older localStorage,
 * sign-in is a Firebase email link verified on the server, and a staff
 * session is now discarded the moment Firebase reports nobody signed in.
 * There is no longer a credential in the bundle to sign in with, so that
 * route cannot be driven any more — not because it broke, because it was
 * closed.
 *
 * So the question is now the one that is left: if someone forges a staff
 * session directly in localStorage, which costs nothing and needs no
 * credential, does anything open? Two things should stop them, and both are
 * checked here together:
 *
 *   - upstream's own: onAuthStateChanged clears a session with no Firebase
 *     identity behind it
 *   - ours: AdminGate and StaffOnly ask the server for a password
 *
 * Needs:
 *   - a build and a server:  npx vite build
 *                            NODE_ENV=production ADMIN_PASSWORD=<pw> \
 *                            PORT=3111 npx tsx server.ts
 *   - the password in ADMIN_PASSWORD, matching that server
 *   - playwright (PLAYWRIGHT_PATH if it is not resolvable from here)
 */
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:3111';
const SERVER_PW = process.env.ADMIN_PASSWORD;

if (!SERVER_PW) {
  console.error('ADMIN_PASSWORD must be set, to the same value the server under test is using.');
  process.exit(2);
}

let PW;
for (const p of [
  process.env.PLAYWRIGHT_PATH,
  'playwright',
  path.resolve(__dirname, '../node_modules/playwright'),
].filter(Boolean)) {
  try { PW = require(p); break; } catch { /* try the next */ }
}
if (!PW) {
  console.error('playwright not found. Set PLAYWRIGHT_PATH to a playwright install.');
  process.exit(2);
}

const SESSION_KEY = 'portabox_staff_active_session_v1';
const CONFIG_KEY = 'portabox_app_config_v7';

/* Roles upstream ships, and the surface each one routes to on sign-in. */
const ROLES = [
  { role: 'ceo',           name: 'Dan Harrington', email: 'dan.ceo@portabox.com.au',      surface: 'admin portal',     flags: [] },
  { role: 'admin_pricing', name: 'Marcus Webb',    email: 'marcus.admin@portabox.com.au', surface: 'admin portal',     flags: [] },
  { role: 'driver',        name: 'Dave Miller',    email: 'dave.driver@portabox.com.au',  surface: 'driver portal',    flags: [] },
  { role: 'call_center',   name: 'Chloe Davis',    email: 'chloe.agent@portabox.com.au',  surface: 'dispatch console', flags: ['enableCallCenterDispatch'] },
];

/* Text that exists only behind a staff surface. */
const CRM = [
  'Pricing Matrix', 'Staff Permissions', 'MFA Audit', 'Routing',
  'Container Inventory', 'Dispatch Calendar', 'Driver PIN', 'Daily Job',
  'Dave Higgins', 'Mick Thornton', 'Rob Davies', 'Chris Lang',
];

const GATE = (b) => b.includes('Staff sign-in') && b.includes('for Portabox staff');
const text = (page) => page.evaluate(() => document.body.innerText);

const problems = [];
const fail = (what) => { problems.push(what); return 'FAIL  <-- ' + what; };

/* Plant a staff session and any feature flags, then load the app. No
   credential involved: this is what anyone can do from a dev console. */
async function forge(page, role) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ sessionKey, configKey, role, flags }) => {
    const session = {
      user: {
        id: 'forged', name: role.name, email: role.email,
        username: role.email.split('@')[0], role: role.role,
        status: 'active', permissions: {},
      },
      token: 'firebase',
      verifiedVia: 'google',
      loginTime: '09:00',
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    };
    try { localStorage.setItem(sessionKey, JSON.stringify(session)); } catch {}
    if (flags.length) {
      let cfg = {};
      try { cfg = JSON.parse(localStorage.getItem(configKey) || '{}'); } catch {}
      for (const f of flags) cfg[f] = true;
      try { localStorage.setItem(configKey, JSON.stringify(cfg)); } catch {}
    }
  }, { sessionKey: SESSION_KEY, configKey: CONFIG_KEY, role, flags: role.flags });

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
}

(async () => {
  const browser = await PW.chromium.launch();

  for (const r of ROLES) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));

    console.log(`\n=== forged ${r.role} session (${r.surface}) ===`);
    if (r.flags.length) console.log(`  feature flag(s) on: ${r.flags.join(', ')}`);
    await forge(page, r);

    const body = await text(page);
    const leaked = CRM.filter((m) => body.includes(m));
    console.log(`  ${r.surface} content:   ${leaked.length ? fail(`a forged ${r.role} session reached ${r.surface}: ${leaked.join(', ')}`) : 'none'}`);

    /* Either outcome is a pass: upstream discards the session, or our gate
       asks for the server password. Both mean nothing opened. */
    const gated = GATE(body);
    const cleared = !gated && !leaked.length;
    console.log(`  stopped by:              ${gated ? 'our AdminGate (server password)' : cleared ? "upstream (session discarded, no Firebase identity)" : fail('nothing stopped it')}`);

    if (gated) {
      const field = page.locator('#admin-password');
      if (await field.count()) {
        await field.fill('Portabox2026!');
        await field.press('Enter');
        await page.waitForTimeout(1200);
        const after = await text(page);
        console.log(`  old leaked password:     ${/Incorrect password/i.test(after) ? 'rejected' : fail('our gate accepted the old hardcoded password')}`);
      }
    }

    if (errs.length) console.log('  ' + fail(`page errors with a forged ${r.role} session: ${errs.join(' | ')}`));
    await page.close();
  }

  /* The softphone bar is permanent furniture rather than a surface you
     open, so it is checked separately: with its flag on and a forged
     session it must still render nothing. */
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    console.log('\n=== softphone bar, flag on, forged session ===');
    await forge(page, { ...ROLES[3], flags: ['enableSoftphone', 'enableCallCenterDispatch'] });
    const hits = await page.locator('text=/Softphone|Dialer|Incoming call/i').count();
    console.log(`  softphone rendered:      ${hits ? fail(`the softphone bar rendered (${hits} element(s)) to a forged session`) : 'no'}`);
    if (errs.length) console.log('  ' + fail('page errors: ' + errs.join(' | ')));
    await page.close();
  }

  /* None of the above may touch what customers see. */
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    console.log('\n=== public quote flow, ?postcode=5000 ===');
    await page.goto(BASE + '/?postcode=5000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const prefill = await page.evaluate(() => (document.querySelector('input') || {}).value || '');
    console.log(`  postcode prefilled:      ${prefill.includes('5000') ? JSON.stringify(prefill) : fail('?postcode= no longer prefills step 1')}`);

    const body = await text(page);
    const leaked = CRM.filter((m) => body.includes(m));
    console.log(`  staff content:           ${leaked.length ? fail('the public page shows staff content: ' + leaked.join(', ')) : 'none'}`);

    const back = await page.locator('[aria-label="Back to the Portabox website"]').count();
    console.log(`  back button on step 1:   ${back ? 'present' : fail('the step-1 back button is gone')}`);

    /* A crash here is the whole page, not one feature: the quote form never
       renders. This is exactly how the Firebase auth listener broke it. */
    if (errs.length) console.log('  ' + fail('page errors on the public page: ' + errs.join(' | ')));
    await page.close();
  }

  await browser.close();

  console.log('');
  if (!problems.length) {
    console.log('No staff surface opens to a forged session, and the quote flow is intact.');
  } else {
    console.log(`${problems.length} problem(s):`);
    for (const p of problems) console.log('  ! ' + p);
    console.log('\nA surface that opened is the serious kind. Gate it in tools/local-fixes.mjs.');
    process.exitCode = 1;
  }
})();
