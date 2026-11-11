/* Check that every staff surface is still behind the server-checked
   password, by driving a real browser the way anyone could.
 *
 *   node tools/verify-staff-gates.cjs [baseUrl]
 *
 * Run this after every upstream drop, once local-fixes.mjs reports clean.
 * local-fixes tells you the patches still apply; this tells you they still
 * work, which is not the same thing — a drop can move a surface to a new
 * branch that the patch never covered, and that is how the dispatch console
 * and the driver portal each came to be open for a while.
 *
 * Needs:
 *   - a build and a server:  npx vite build
 *                            NODE_ENV=production ADMIN_PASSWORD=<pw> \
 *                            PORT=3111 npx tsx server.ts
 *   - the password in ADMIN_PASSWORD, matching that server
 *   - playwright (PLAYWRIGHT_PATH if it is not resolvable from here)
 *
 * What it asserts, for each staff account upstream ships:
 *   1. upstream's own login can be walked with what is in the public
 *      bundle — the hardcoded password and a universal 2FA code. This is
 *      not a failure, it is the premise: it is why the second gate exists,
 *      and if it ever stops working that is worth knowing too.
 *   2. after that login, the surface does NOT render.
 *   3. upstream's password does not open our gate.
 *   4. the real password does.
 *   5. the public quote flow is untouched by any of it.
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

/* Upstream's own staff records, from src/services/adminAuthService.ts. If a
   drop changes them this list needs updating — which is itself worth
   noticing, so the run says so rather than quietly testing fewer accounts. */
const ACCOUNTS = [
  { email: 'dan.ceo@portabox.com.au',      role: 'ceo',           surface: 'admin portal',     flag: null },
  { email: 'marcus.admin@portabox.com.au', role: 'admin_pricing', surface: 'admin portal',     flag: null },
  { email: 'dave.driver@portabox.com.au',  role: 'driver',        surface: 'driver portal',    flag: null },
  /* The dispatch console only renders when the CEO screen has turned it on,
     so the flag goes on first or there is nothing to gate. */
  { email: 'chloe.agent@portabox.com.au',  role: 'call_center',   surface: 'dispatch console', flag: 'enableCallCenterDispatch' },
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

async function seedFlags(page, flags) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((fs) => {
    const KEY = 'portabox_app_config_v7';
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* fresh */ }
    for (const f of fs) cfg[f] = true;
    localStorage.setItem(KEY, JSON.stringify(cfg));
  }, flags);
}

/* Walk upstream's login with nothing but what is in the public bundle. */
async function upstreamLogin(page, email) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const link = page.locator('a[href="#staff-signin"]');
  if (!(await link.count())) throw new Error('the Staff Sign In link is gone — find where staff enter now');
  await link.first().click();
  await page.waitForTimeout(700);

  const id = page.locator('input[placeholder*="dan.ceo"]');
  if (!(await id.count())) throw new Error('upstream\'s credentials step did not open');
  await id.fill(email);

  const pw = page.locator('input[placeholder="Enter your password"]');
  const prefilled = await pw.inputValue();
  await pw.fill('Portabox2026!');
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(1200);

  let mfa = 'no 2FA step appeared';
  const code = page.locator('input[placeholder="123456"]');
  if (await code.count()) {
    await code.fill('123456');
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForTimeout(1800);
    mfa = 'accepted 123456';
  }
  return { prefilled, mfa };
}

(async () => {
  const browser = await PW.chromium.launch();

  for (const a of ACCOUNTS) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));

    console.log(`\n=== ${a.email}  (${a.role} -> ${a.surface}) ===`);
    if (a.flag) {
      await seedFlags(page, [a.flag]);
      console.log(`  feature flag ${a.flag} turned on for this check`);
    }

    try {
      const info = await upstreamLogin(page, a.email);
      console.log(`  upstream password field pre-filled: ${JSON.stringify(info.prefilled)}`);
      console.log(`  upstream 2FA:                       ${info.mfa}`);
    } catch (e) {
      console.log('  ' + fail(`${a.email}: upstream login could not be driven — ${e.message}`));
      await page.close();
      continue;
    }

    const body = await text(page);
    console.log(`  our gate shown:                     ${GATE(body) ? 'yes' : fail(`${a.surface} did not show our gate`)}`);

    const leaked = CRM.filter((m) => body.includes(m));
    console.log(`  surface content before our gate:    ${leaked.length ? fail(`${a.surface} leaked: ${leaked.join(', ')}`) : 'none'}`);

    if (await page.locator('#admin-password').count()) {
      await page.locator('#admin-password').fill('Portabox2026!');
      await page.locator('#admin-password').press('Enter');
      await page.waitForTimeout(1200);
      const after = await text(page);
      console.log(`  upstream's password at our gate:    ${/Incorrect password/i.test(after) ? 'rejected' : fail('our gate accepted upstream\'s hardcoded password')}`);

      await page.locator('#admin-password').fill(SERVER_PW);
      await page.locator('#admin-password').press('Enter');
      await page.waitForTimeout(2500);
      const open = await text(page);
      const shows = CRM.filter((m) => open.includes(m));
      console.log(`  real password opens it:             ${GATE(open) ? fail(`${a.surface} did not load for a correct password`) : 'yes'}`);
      console.log(`    content now visible:              ${shows.length ? shows.join(', ') : '(no known marker — check by eye)'}`);
    } else if (GATE(body)) {
      console.log('  ' + fail('the gate rendered with no password field'));
    }

    if (errs.length) console.log('  ' + fail(`page errors on ${a.surface}: ${errs.join(' | ')}`));
    await page.close();
  }

  /* The softphone bar is permanent furniture rather than a surface you
     open, so it is checked separately: with its flag on and a forged staff
     session it must still render nothing. */
  {
    const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    console.log('\n=== softphone bar, flag on, forged staff session ===');
    await seedFlags(page, ['enableSoftphone', 'enableCallCenterDispatch']);
    try {
      await upstreamLogin(page, 'chloe.agent@portabox.com.au');
      const hits = await page.locator('text=/Softphone|Dialer|Incoming call/i').count();
      console.log(`  softphone rendered:                 ${hits ? fail(`the softphone bar rendered (${hits} element(s)) without the server password`) : 'no'}`);
    } catch (e) {
      console.log('  ' + fail('softphone check could not be driven — ' + e.message));
    }
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
    console.log(`  postcode prefilled:                 ${prefill.includes('5000') ? JSON.stringify(prefill) : fail('?postcode= no longer prefills step 1')}`);

    const body = await text(page);
    const leaked = CRM.filter((m) => body.includes(m));
    console.log(`  staff content on a cold load:       ${leaked.length ? fail('the public page shows staff content: ' + leaked.join(', ')) : 'none'}`);

    const back = await page.locator('[aria-label="Back to the Portabox website"]').count();
    console.log(`  back button on step 1:              ${back ? 'present' : fail('the step-1 back button is gone')}`);

    if (errs.length) console.log('  ' + fail('page errors on the public page: ' + errs.join(' | ')));
    await page.close();
  }

  await browser.close();

  console.log('');
  if (!problems.length) {
    console.log('All staff surfaces are behind the server-checked password, and the quote flow is intact.');
  } else {
    console.log(`${problems.length} problem(s):`);
    for (const p of problems) console.log('  ! ' + p);
    console.log('\nA surface that opened without the password is the serious kind. Gate it in tools/local-fixes.mjs.');
    process.exitCode = 1;
  }
})();
