/* Check the deployed site is still standing.
 *
 *   node tools/smoke-live.cjs <baseUrl> [--expect-bundle-change <old hash>]
 *
 * Written for the auto-merge pipeline. Once a drop can reach production
 * without anyone reading it, the gap that matters is the one between "the
 * checks passed in CI" and "the thing customers load still works" — a build
 * that is green on a runner can still be broken live, and with nobody
 * watching it stays broken until a customer says so.
 *
 * So this runs against the real URL after the deploy. It is deliberately
 * about the things a customer or a staff member would notice:
 *
 *   - the page loads at all
 *   - the quote flow's entry point is there, and ?postcode= still works
 *   - the staff gate shipped in the bundle, rather than being optimised
 *     away or dropped by a bad merge
 *   - no staff-only content on a cold anonymous load
 *   - the gate's own API function answers, since every staff surface is
 *     shut without it
 *
 * What it does not do is log in. That is verify-staff-gates.cjs, which runs
 * in CI against a build with a password this pipeline controls. Production's
 * ADMIN_PASSWORD is the client's and is not in here.
 *
 * Exit 0 if everything a customer touches is fine, 1 otherwise, and the
 * failure names what to do about it.
 */
const BASE = (process.argv[2] || '').replace(/\/+$/, '');
if (!BASE) {
  console.error('usage: node tools/smoke-live.cjs <baseUrl> [--expect-bundle-change <old hash>]');
  process.exit(2);
}
const i = process.argv.indexOf('--expect-bundle-change');
const OLD_BUNDLE = i > 0 ? process.argv[i + 1] : null;

const problems = [];
const note = (s) => console.log(s);
const fail = (s) => { problems.push(s); return 'FAIL'; };

/* A preview deployment is normally behind Vercel Deployment Protection, and
   a protected deployment does not answer 401 — it 302s to vercel.com/sso-api
   and that page returns 200 with a Vercel login form. So a test that follows
   redirects sees "200" and a page with no application in it, and reports a
   broken build. Hence: redirects are not followed blindly, and the protection
   handshake is recognised for what it is.
 *
 * VERCEL_PROTECTION_BYPASS, when set, is sent as the header Vercel accepts
 * for automation, which makes a protected deployment testable. It is created
 * in Project Settings -> Deployment Protection -> Protection Bypass for
 * Automation, and belongs in a repository secret, not in this file. */
const BYPASS = process.env.VERCEL_PROTECTION_BYPASS || '';

const PROTECTION = /vercel\.com\/sso-api|\/_vercel\/sso|vercel\.com\/login/;

/* Node 18+ has fetch. A timeout matters: a hung deploy should report as a
   failure rather than sit until the job's own limit. */
async function raw(url, redirect) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  try {
    const headers = BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {};
    const r = await fetch(url, { signal: ctl.signal, redirect, headers });
    return { status: r.status, location: r.headers.get('location') || '', res: r };
  } catch (e) {
    return { status: 0, location: '', error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function get(path) {
  const url = path.startsWith('http') ? path : BASE + path;

  const first = await raw(url, 'manual');
  if (first.error) return { status: 0, body: '', error: first.error };

  if (first.status >= 300 && first.status < 400 && PROTECTION.test(first.location)) {
    return { status: first.status, body: '', protected: true };
  }
  if (first.status === 401 || first.status === 403) {
    return { status: first.status, body: '', protected: true };
  }

  /* Not protection — follow it properly (trailing slashes, canonical hosts). */
  if (first.status >= 300 && first.status < 400) {
    const followed = await raw(url, 'follow');
    if (followed.error) return { status: 0, body: '', error: followed.error };
    const body = await followed.res.text();
    /* A protected deployment can also end on a 200 login page. */
    if (/<title>\s*Login\s*[–\-—]\s*Vercel\s*<\/title>/i.test(body)) {
      return { status: followed.status, body: '', protected: true };
    }
    return { status: followed.status, body };
  }

  const body = await first.res.text();
  if (/<title>\s*Login\s*[–\-—]\s*Vercel\s*<\/title>/i.test(body)) {
    return { status: first.status, body: '', protected: true };
  }
  return { status: first.status, body };
}

/* Strings that must never appear on a page loaded by nobody. */
const STAFF_ONLY = [
  'Pricing Matrix', 'Staff Permissions', 'MFA Audit', 'Dispatch Calendar',
  'Driver PIN', 'Dave Higgins', 'Mick Thornton', 'Rob Davies', 'Chris Lang',
];

(async () => {
  note(`smoke test against ${BASE}\n`);

  /* 1. the page itself */
  const home = await get('/');

  /* Behind Deployment Protection there is nothing to test — every request
     lands on a Vercel login page. Its own message, because it looks exactly
     like a broken deployment otherwise, and the fix is a project setting
     rather than anything in the code. */
  if (home.protected) {
    note(`  homepage                 ${fail(
      'this deployment is behind Vercel Deployment Protection, so it cannot be ' +
      'checked from here' + (BYPASS ? ' — and the bypass token that was supplied did not work, so it may have been rotated' : '')
    )}`);
    note('');
    note('  The deployment is almost certainly fine. Nothing can see it, which is');
    note('  not the same thing. Two ways to make it testable:');
    note('');
    note('    - Vercel -> Project Settings -> Deployment Protection, and turn');
    note('      Vercel Authentication off for Preview deployments; or');
    note('    - the same page -> Protection Bypass for Automation, then put the');
    note('      token in a repository secret and pass it to this script as');
    note('      VERCEL_PROTECTION_BYPASS.');
    note('');
    note('  You can still open the URL yourself — protection blocks automation,');
    note('  not a signed-in browser.');
    report();
    return;
  }

  note(`  homepage                 ${home.status === 200 ? '200' : fail(`the homepage returned ${home.status || home.error}`)}`);
  if (home.status !== 200) {
    note('\nNothing else is worth checking if the page will not load.');
    report();
    return;
  }

  /* 2. the bundle, and whether the deploy actually landed */
  const m = home.body.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
  const bundle = m ? m[0] : null;
  note(`  bundle referenced        ${bundle || fail('the page references no JS bundle, so the build did not deploy')}`);
  if (!bundle) { report(); return; }

  if (OLD_BUNDLE) {
    const changed = !bundle.includes(OLD_BUNDLE);
    note(`  bundle changed           ${changed ? `yes (${OLD_BUNDLE} -> ${bundle})` : fail(`the bundle is still ${OLD_BUNDLE}, so the deploy has not landed yet`)}`);
  }

  const js = await get('/' + bundle);
  note(`  bundle fetchable         ${js.status === 200 ? `200, ${Math.round(js.body.length / 1024)} kB` : fail(`the bundle returned ${js.status || js.error}`)}`);

  /* 3. the staff gate has to be in there. If a merge ever drops the local
        fixes, this is the cheapest place it shows up. */
  if (js.status === 200) {
    const gate = js.body.includes('for Portabox staff');
    const token = js.body.includes('portabox.admin.token');
    note(`  staff gate in bundle     ${gate && token ? 'present' : fail('the staff gate is NOT in the deployed bundle — the local fixes did not survive this deploy, and the admin, dispatch and driver surfaces may be open')}`);
  }

  /* 4. the quote flow's entry point */
  const pc = await get('/?postcode=5000');
  note(`  /?postcode=5000          ${pc.status === 200 ? '200' : fail(`the quote entry point returned ${pc.status || pc.error}`)}`);

  /* 5. nothing staff-only on a cold load. The page is a single-page app, so
        this is the served HTML, not a rendered DOM — a crude check, but it
        catches anything server-rendered into the shell. */
  const leaked = STAFF_ONLY.filter((s) => home.body.includes(s));
  note(`  staff content on /       ${leaked.length ? fail(`the public page serves staff content: ${leaked.join(', ')}`) : 'none'}`);

  /* 6. the gate's own function. Every staff surface is shut without it, so
        this failing is not customer-facing but it locks the client's own
        staff out, which they will notice within the day. */
  const verify = await get('/api/admin/verify');
  const ok = verify.status === 200 || verify.status === 400 || verify.status === 405;
  note(`  /api/admin/verify        ${ok ? `${verify.status} (answering)` : fail(`the staff gate's function returned ${verify.status || verify.error} — staff cannot sign in`)}`);

  /* Reported, not failed: this has been broken since before the pipeline
     existed, for a reason recorded in the header of api/index.ts, and
     failing every deploy over a known outage would train people to ignore
     this test. */
  const api = await get('/api/clicksend/account');
  const apiOk = api.status < 500;
  note(`  /api/* (known issue)     ${apiOk ? `${api.status}` : `${api.status || api.error} — still the module-format problem, see api/index.ts`}`);

  report();
})();

function report() {
  console.log('');
  if (!problems.length) {
    console.log('The deployed site is serving the quote flow with the staff gate in place.');
    process.exitCode = 0;
    return;
  }
  console.log(`${problems.length} problem(s) with the deployed site:`);
  for (const p of problems) console.log('  ! ' + p);
  console.log('');
  console.log('If this ran after an automatic merge, production is in this state now.');
  console.log('To put it back, open the merged pull request on GitHub and press Revert.');
  console.log('From a terminal it is `git revert <sha> && git push` for the squashed');
  console.log('commit the pipeline makes. Vercel redeploys from main either way, so the');
  console.log('revert is the rollback — and the drop stays on its branch to look at.');
  process.exitCode = 1;
}
