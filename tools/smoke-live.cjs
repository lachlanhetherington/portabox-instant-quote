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

/* Node 18+ has fetch. A timeout matters: a hung deploy should report as a
   failure rather than sit until the job's own limit. */
async function get(path, { asText = true } = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow' });
    return { status: r.status, body: asText ? await r.text() : null };
  } catch (e) {
    return { status: 0, body: '', error: e.message };
  } finally {
    clearTimeout(timer);
  }
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
