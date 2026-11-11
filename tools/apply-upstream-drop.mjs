/* Take a drop from the upstream CRM repo, and write up what a person still
   has to look at.
 *
 *   node tools/apply-upstream-drop.mjs
 *   node tools/apply-upstream-drop.mjs --upstream <dir>   (already cloned)
 *   node tools/apply-upstream-drop.mjs --report drop.md
 *
 * Upstream is the client developer's repo. It is not a remote of this one —
 * the histories are unrelated, because this repo also carries the local
 * fixes and the deployment wiring that upstream has no equivalent of. So a
 * drop is a file copy, and .upstream-crm.json records where we are up to.
 *
 * This does the mechanical half, which is the half that is safe to automate:
 *
 *   1. work out what is new since the recorded revision
 *   2. copy upstream's tracked files in
 *   3. re-extract the API surface from the new server.ts, and restore our
 *      server.ts wrapper
 *   4. re-apply the local fixes
 *   5. scan the result for live credentials
 *   6. list every staff surface and whether it is gated
 *
 * It deliberately does not commit, push, or deploy. The judgement that
 * every drop has needed cannot be done here: whether a fix that failed to
 * re-anchor should move or be retired, whether a new surface is staff
 * tooling, whether a commit message describes what the commit does. Three
 * of the four drops before this tool existed added a staff surface that
 * opened with no password, and each was found by reading the diff.
 *
 * So the output is a report, written for whoever reviews the pull request,
 * with a section for the things only a person can settle. The exit code is
 * non-zero when something in it blocks.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = path.join(ROOT, '.upstream-crm.json');

const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const REPORT = argOf('--report') || path.join(ROOT, 'upstream-drop-report.md');
/* A status file for the scheduled job to branch on, since the exit code
   cannot tell "nothing new" apart from "applied cleanly". */
const STATUS = argOf('--status');

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
const git = (args, cwd) => run('git', args, { cwd }).trimEnd();

/* ------------------------------------------------------------------ report */

const out = [];
const blockers = [];
const say = (s = '') => out.push(s);
const block = (s) => { blockers.push(s); return s; };

let status = { status: 'unknown', sha: null, subject: null, blockers: 0 };

function finish(code) {
  if (blockers.length) {
    say('');
    say('## Blocking');
    say('');
    say('Each of these needs a person before this is merged:');
    say('');
    for (const b of blockers) say(`- ${b}`);
  }
  fs.writeFileSync(REPORT, out.join('\n') + '\n');
  console.log(`\nreport written to ${path.relative(ROOT, REPORT)}`);

  if (STATUS) {
    status.blockers = blockers.length;
    if (status.status === 'unknown') status.status = blockers.length ? 'blocked' : 'ready';
    fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
    console.log(`status: ${status.status}`);
  }

  if (blockers.length) {
    console.log(`\n${blockers.length} blocking item(s):`);
    for (const b of blockers) console.log('  ! ' + b.replace(/\*\*/g, ''));
  }
  process.exit(code ?? (blockers.length ? 1 : 0));
}

/* ------------------------------------------------------------ the upstream */

const marker = JSON.parse(fs.readFileSync(MARKER, 'utf8'));
const branch = marker.branch || 'main';

let upstream = argOf('--upstream');
let temp = null;
if (!upstream) {
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-upstream-'));
  console.log(`cloning ${marker.repo} into ${temp}`);
  run('git', ['clone', '--quiet', marker.repo, temp]);
  upstream = temp;
}
upstream = path.resolve(upstream);

const head = git(['rev-parse', `origin/${branch}`], upstream).trim();
const headSubject = git(['log', '-1', '--format=%s', head], upstream);
const headDate = git(['log', '-1', '--format=%cI', head], upstream);

say(`# Upstream CRM drop`);
say('');
say(`\`${marker.repo}\` @ \`${branch}\``);
say('');
say(`| | |`);
say(`|---|---|`);
say(`| this repo had | \`${marker.sha.slice(0, 7)}\` — ${marker.subject || '(not recorded)'} |`);
say(`| upstream now has | \`${head.slice(0, 7)}\` — ${headSubject} |`);
say(`| dated | ${headDate} |`);
say('');

status.sha = head;
status.subject = headSubject;

if (head === marker.sha) {
  say('Nothing new. Up to date with upstream.');
  console.log('nothing new upstream — already at ' + head.slice(0, 7));
  status.status = 'none';
  finish(0);
}

/* What arrived. Printed in full, because a commit message is a claim about
   the code and the last drop's claim was not true: "remove dev auth bypass"
   left the universal 2FA codes in place and added a shared password to six
   staff records in client-side code. */
let commits = '';
let fileStatus = '';
try {
  commits = git(['log', '--no-merges', '--format=%h %s%n%w(78,4,4)%b', `${marker.sha}..${head}`], upstream);
  fileStatus = git(['diff', '--name-status', marker.sha, head], upstream);
} catch {
  say('> The recorded revision is not an ancestor of upstream\'s head — upstream');
  say('> may have been rebased or force-pushed. Showing the head commit only;');
  say('> the file-level comparison below is unavailable.');
  say('');
  commits = git(['log', '-1', '--format=%h %s%n%w(78,4,4)%b', head], upstream);
  block('**Upstream history does not line up** with the recorded revision, so the list of what changed may be incomplete. Compare by hand before merging.');
}

say('## What upstream changed');
say('');
say('```');
say(commits || '(no commits listed)');
say('```');
say('');

const added = [];
const removed = [];
for (const line of fileStatus.split('\n').filter(Boolean)) {
  const [status, file] = line.split('\t');
  if (status === 'A') added.push(file);
  if (status === 'D') removed.push(file);
}

/* New component files are the thing to look at first. Every staff surface
   that has turned up ungated arrived as one. */
const newComponents = added.filter((f) => /^src\/components\/.*\.tsx$/.test(f));

/* ------------------------------------------------------- routes, before */

const routesOf = (file) => {
  if (!fs.existsSync(file)) return [];
  const s = fs.readFileSync(file, 'utf8');
  return [...s.matchAll(/^app\.(get|post|put|patch|delete|use)\((['"])(\/api[^'"]*)/gm)]
    .map((m) => `${m[1].toUpperCase()} ${m[3]}`);
};
const routesBefore = routesOf(path.join(ROOT, 'src/server/apiRoutes.ts'));

/* -------------------------------------------------------------- the copy */

console.log('copying upstream\'s tracked files in');
const tracked = git(['ls-files'], upstream).split('\n').filter(Boolean);
let copied = 0;
for (const rel of tracked) {
  const from = path.join(upstream, rel);
  const to = path.join(ROOT, rel);
  if (!fs.existsSync(from)) continue;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied++;
}
console.log(`  ${copied} files`);

/* ------------------------------------------------- re-extract the routes */

say('## The API surface');
say('');
let extractOut = '';
try {
  extractOut = run('node', [path.join(ROOT, 'tools/extract-api-routes.cjs'), path.join(upstream, 'server.ts')], { cwd: ROOT });
  console.log('re-extracted the API routes');
} catch (e) {
  const msg = (e.stderr || e.stdout || e.message || '').toString().trim();
  say('Re-extraction **failed**:');
  say('');
  say('```');
  say(msg.slice(0, 2000));
  say('```');
  say('');
  block('**The API routes could not be re-extracted** from the new `server.ts`. Its shape changed; `tools/extract-api-routes.cjs` needs its markers updated. Until then the deployment would serve the previous drop\'s routes.');
  finish(1);
}

/* Our server.ts is a wrapper around the extracted routes; upstream's copy
   has just overwritten it. */
git(['checkout', '--', 'server.ts'], ROOT);

const routesAfter = routesOf(path.join(ROOT, 'src/server/apiRoutes.ts'));
const routesAdded = routesAfter.filter((r) => !routesBefore.includes(r));
const routesGone = routesBefore.filter((r) => !routesAfter.includes(r));

say(`${routesAfter.length} routes, was ${routesBefore.length}.`);
say('');
if (routesAdded.length) {
  say('New:');
  say('');
  for (const r of routesAdded) say(`- \`${r}\``);
  say('');
}
if (routesGone.length) {
  say('Gone:');
  say('');
  for (const r of routesGone) say(`- \`${r}\``);
  say('');
  block(`**${routesGone.length} API route(s) disappeared** from upstream. If anything still calls them they will 404. Check before merging.`);
}
if (!routesAdded.length && !routesGone.length) say('Unchanged.');
say('');

/* Upstream's own dynamic imports of files in this tree do not survive into
   the deployed function — see the header of api/index.ts. Only relative
   specifiers are affected: a bare package name like '@google/genai' goes
   through normal node_modules resolution, which needs no extension, so it
   is fine and does not belong in this warning. */
const dyn = [...new Set(
  [...fs.readFileSync(path.join(ROOT, 'src/server/apiRoutes.ts'), 'utf8')
    .matchAll(/await import\((['"])([^'"]+)\1\)/g)]
    .map((m) => m[2])
    .filter((spec) => spec.startsWith('.') || spec.startsWith('/'))
)];
if (dyn.length) {
  say(`Some routes reach files in this tree with \`await import()\`, which does not`);
  say(`resolve in the deployed function — see the header of \`api/index.ts\`. These`);
  say(`work locally and fail on Vercel: ${dyn.map((d) => `\`${d}\``).join(', ')}.`);
  say('');
}

/* ---------------------------------------------------------- local fixes */

say('## Local fixes');
say('');
let fixesOut = '';
let fixesFailed = false;
try {
  fixesOut = run('node', [path.join(ROOT, 'tools/local-fixes.mjs')], { cwd: ROOT });
} catch (e) {
  fixesOut = ((e.stdout || '') + (e.stderr || '')).toString();
  fixesFailed = true;
}
console.log(fixesOut.trimEnd());
say('```');
say(fixesOut.trimEnd());
say('```');
say('');

if (fixesFailed) {
  const failedNames = fixesOut.split('\n')
    .filter((l) => /^\s*! /.test(l))
    .map((l) => l.replace(/^\s*! /, '').trim());
  block(
    `**${failedNames.length || 'Some'} local fix(es) no longer apply**` +
    (failedNames.length ? `: ${failedNames.map((n) => `\`${n}\``).join(', ')}` : '') +
    '. A fix that fails means upstream moved the code it patched. Read the new ' +
    'code and decide whether the fix should be re-anchored or retired — upstream ' +
    'has fixed one of these themselves before, and that one became a check ' +
    'instead. Do not merge with a fix unapplied: each one is either a ' +
    'credential kept out of the bundle or a staff surface kept shut.'
  );
}

/* ------------------------------------------------------------- secrets */

say('## Credentials');
say('');
const SECRET = [
  [/AIza[A-Za-z0-9_\-]{30,}/, 'Google API key'],
  [/AC[0-9a-f]{32}/, 'Twilio account SID'],
  [/sk_live_[A-Za-z0-9]{10,}/, 'Stripe live secret key'],
  [/SG\.[A-Za-z0-9_\-]{20,}/, 'SendGrid key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
];
const changedFiles = git(['diff', '--name-only', 'HEAD'], ROOT).split('\n').filter(Boolean)
  .concat(git(['ls-files', '--others', '--exclude-standard'], ROOT).split('\n').filter(Boolean));

const hits = [];
for (const rel of changedFiles) {
  const abs = path.join(ROOT, rel);
  let text;
  try {
    if (!fs.statSync(abs).isFile() || fs.statSync(abs).size > 4 * 1024 * 1024) continue;
    text = fs.readFileSync(abs, 'utf8');
  } catch { continue; }
  for (const [re, what] of SECRET) {
    const m = text.match(re);
    if (m) hits.push({ rel, what, sample: m[0].slice(0, 8) + '…' });
  }
}
if (hits.length) {
  for (const h of hits) say(`- \`${h.rel}\` — ${h.what} (\`${h.sample}\`)`);
  say('');
  block(
    `**${hits.length} live credential(s) in this drop**: ` +
    hits.map((h) => `${h.what} in \`${h.rel}\``).join(', ') +
    '. Replace each with a placeholder before merging — this repo is public, and ' +
    'a key that reaches a commit has to be rotated, not just deleted. Three ' +
    'Google keys are in the history already for exactly this reason.'
  );
} else {
  say('No live credentials found in the changed files.');
  say('');
}

/* ------------------------------------------------------- staff surfaces */

say('## Staff surfaces');
say('');
let surfacesOut = '';
let surfacesFailed = false;
try {
  surfacesOut = run('node', [path.join(ROOT, 'tools/find-staff-surfaces.cjs')], { cwd: ROOT });
} catch (e) {
  surfacesOut = ((e.stdout || '') + (e.stderr || '')).toString();
  surfacesFailed = true;
}
console.log(surfacesOut.trimEnd());
say('```');
say(surfacesOut.trimEnd());
say('```');
say('');
if (surfacesFailed) {
  block(
    '**A staff-looking surface renders with no gate and no recorded decision.** ' +
    'This is the one that matters: the browser suite in `verify-staff-gates.cjs` ' +
    'only tests surfaces it already knows about, so a new one passes every other ' +
    'check. Read what it opens, then either gate it with a fix in ' +
    '`tools/local-fixes.mjs` and add a case to the suite, or record in ' +
    '`tools/find-staff-surfaces.cjs` why it needs no gate.'
  );
}

/* --------------------------------------------------- for a person to read */

say('## For a person to read');
say('');
say('None of the checks above can settle these.');
say('');
say('- **The commit messages, against the diff.** The previous drop\'s');
say('  `a581d0e` said "remove dev auth bypass". It did not: `verifyStaffMfaCode`');
say('  still returns true for `123456`, `849201` and `000000` for any account,');
say('  and the same commit put the password `Portabox2026!` on six staff records');
say('  in client-side code, pre-filled into the login field. Read what the');
say('  commits above actually do.');
if (newComponents.length) {
  say(`- **${newComponents.length} new component file(s).** This is how every ungated`);
  say('  staff surface so far has arrived. Check each against the gates:');
  for (const f of newComponents) say(`  - \`${f}\``);
} else {
  say('- **No new component files**, so no new surface arrived this way.');
}
if (added.length - newComponents.length > 0) {
  const others = added.filter((f) => !newComponents.includes(f));
  say(`- **${others.length} other new file(s).**`);
  for (const f of others.slice(0, 20)) say(`  - \`${f}\``);
  if (others.length > 20) say(`  - …and ${others.length - 20} more`);
}
if (removed.length) {
  say(`- **${removed.length} file(s) upstream deleted.** They are not deleted here —`);
  say('  this is a copy, not a sync — so anything stale stays until someone says');
  say('  otherwise:');
  for (const f of removed.slice(0, 20)) say(`  - \`${f}\``);
  if (removed.length > 20) say(`  - …and ${removed.length - 20} more`);
}
say('- **Prices and rates.** A pricing change is a question for the client, not');
say('  a merge decision. The website and the quote engine have disagreed on the');
say('  Medium size before ($209 against $219).');
say('- **Feature flag defaults.** Flipping one changes what the public sees');
say('  without changing any copy. The last drop turned the promo banner and the');
say('  dispatch console off.');
say('');

/* ------------------------------------------------------------- the marker */

/* Advanced whether or not anything blocks, because this write lands on the
   pull request's branch rather than on main. Until that branch merges, main
   still records the old revision and the next run offers the drop again, so
   an abandoned PR cannot make a drop look taken. Merging is what records
   it. */
marker.sha = head;
marker.subject = headSubject;
marker.applied = new Date().toISOString().slice(0, 10);
fs.writeFileSync(MARKER, JSON.stringify(marker, null, 2) + '\n');

say('---');
say('');
say(`\`.upstream-crm.json\` moves to \`${head.slice(0, 7)}\` on this branch. Merging is what`);
say('records the drop as taken — until then `main` still points at the previous');
say('revision, so closing this without merging simply offers it again.');

if (temp) {
  try { fs.rmSync(temp, { recursive: true, force: true }); } catch { /* a temp dir */ }
}

finish();
