/* List every staff-looking surface App.tsx renders, and say whether it is
   behind a gate.
 *
 *   node tools/find-staff-surfaces.cjs [--json]
 *
 * This is the check that was missing. Three of the four drops before it
 * added a staff surface that opened with no password: the dispatch console,
 * the driver portal, and the softphone bar. Each was found by reading the
 * diff, which is not a process that scales to an automated pipeline, and
 * local-fixes.mjs could not help — it reports that the existing patches
 * still apply, which stays true while a brand-new branch opens beside them.
 *
 * So this does not ask whether the patches applied. It asks which
 * components App.tsx renders, which of them look like staff tooling, and
 * which of those are inside an AdminGate or a StaffOnly. Anything that is
 * neither gated nor on the list of deliberate exceptions below is reported
 * and the run fails, which is what makes it safe to let a scheduled job
 * apply a drop: a surface nobody has judged yet stops the pipeline instead
 * of shipping.
 *
 * It is a lexical check on one file, so it is not proof — the gate suite in
 * verify-staff-gates.cjs is what actually drives a browser. This is the
 * part that catches what the suite has no test for yet.
 */
const fs = require('fs');
const path = require('path');

const JSON_OUT = process.argv.includes('--json');
/* An explicit path lets this run against a candidate file, and lets the
   check be tested against a deliberately ungated copy. */
const ARG = process.argv.slice(2).find((a) => !a.startsWith('--'));
const APP = ARG ? path.resolve(ARG) : path.resolve(__dirname, '../src/App.tsx');

/* Names that suggest staff tooling. Deliberately broad: a false positive
   costs one line in the list below, a false negative costs a surface. */
const STAFF_NAME = /(Portal|Console|Dashboard|Admin|Dispatch|Driver|Staff|Telephony|CallCenter|Softphone|Customer360|Ledger|Workspace|Yard|Fleet|Depot|CRM)/;

/* The gates. A surface inside one of these has been judged. */
const GATES = ['AdminGate', 'StaffOnly'];

/* Deliberate exceptions, each with the reason it does not need a gate.
 *
 * Adding a name here is a decision, not a silencing — if a drop makes one
 * of these reach server data or take an action, the entry is wrong and
 * needs removing. Keep the reasons specific enough to re-check. */
const ALLOWED = {
  AdminGate:
    'the gate itself',
  StaffOnly:
    'the other gate',
  AdminLoginModal:
    "upstream's own staff login. It is not a credential check — six staff " +
    'records in services/adminAuthService carry the password in the shipped ' +
    'bundle and the 2FA accepts 123456 — so it is a UI step, and the real ' +
    'check is the gate it leads to. Nothing behind it opens without that.',
  CustomerPortal:
    'customer-facing by design, behind the enableCustomerPortal flag. It ' +
    'shows a customer their own quote, not staff tooling.',
  Customer360Drawer:
    'renders only what the event that opened it handed over, and reads ' +
    'nothing privileged itself. Both dispatchers of ' +
    "'portabox-open-screen-pop' are inside gated surfaces (admin's " +
    'ContainerCRMView and CallCenterTelephonyHub), and the softphone path ' +
    'to it is behind StaffOnly. Note separately that the actions it offers ' +
    'post to /api/sms/* and /api/gemini/*, which have no authentication of ' +
    'their own — that is an API problem, not a gating one.',
};

const REL = path.relative(path.resolve(__dirname, '..'), APP).split(path.sep).join('/');
const src = fs.readFileSync(APP, 'utf8');

/* Components imported into App.tsx, by name. */
const imported = new Map();
for (const m of src.matchAll(/^import \{\s*([^}]+?)\s*\} from '([^']+)';?$/gm)) {
  for (const raw of m[1].split(',')) {
    const name = raw.trim().split(/\s+as\s+/).pop().trim();
    if (name) imported.set(name, m[2]);
  }
}

/* Is this position inside an open AdminGate or StaffOnly? Count the tags
   that opened before it against the ones that closed. JSX nests properly,
   so an unbalanced count means we are inside one. */
function gatesAround(index) {
  const before = src.slice(0, index);
  const open = [];
  for (const g of GATES) {
    const opens = (before.match(new RegExp(`<${g}[\\s>]`, 'g')) || []).length;
    const closes = (before.match(new RegExp(`</${g}>`, 'g')) || []).length;
    if (opens > closes) open.push(g);
  }
  return open;
}

/* `<Name` appears in two unrelated places: a JSX element, and a type
   parameter list such as useState<TelephonyCall | null>. The character
   immediately before the '<' separates them — a type parameter list
   follows an identifier, JSX follows whitespace, '(', '{' or '>'. Without
   this, every staff-named type counts as a rendered surface. */
const isJsx = (index) => !/[A-Za-z0-9_$]/.test(src[index - 1] || ' ');

const findings = [];
for (const [name, from] of imported) {
  if (!STAFF_NAME.test(name)) continue;
  /* Types and services are imported here too; only JSX matters. */
  const uses = [...src.matchAll(new RegExp(`<${name}[\\s/>]`, 'g'))]
    .filter((m) => isJsx(m.index));
  if (!uses.length) continue;

  for (const use of uses) {
    const line = src.slice(0, use.index).split('\n').length;
    const gates = gatesAround(use.index);
    findings.push({
      name,
      from,
      line,
      gates,
      allowed: Object.prototype.hasOwnProperty.call(ALLOWED, name),
      reason: ALLOWED[name] || null,
    });
  }
}

const unjudged = findings.filter((f) => !f.gates.length && !f.allowed);

if (JSON_OUT) {
  console.log(JSON.stringify({ findings, unjudged }, null, 2));
} else {
  console.log(`staff-looking components rendered by ${REL} (${findings.length} render sites)\n`);
  for (const f of findings) {
    const where = `${path.basename(REL)}:${f.line}`.padEnd(14);
    if (f.gates.length) {
      console.log(`  gated     ${where} <${f.name}>  inside ${f.gates.join(' + ')}`);
    } else if (f.allowed) {
      console.log(`  allowed   ${where} <${f.name}>`);
    } else {
      console.log(`  UNJUDGED  ${where} <${f.name}>  from ${f.from}`);
    }
  }

  if (unjudged.length) {
    console.log(`\n${unjudged.length} surface(s) render with no gate and no recorded decision:\n`);
    for (const f of unjudged) {
      console.log(`  <${f.name}>  (${f.from})  at ${REL}:${f.line}`);
    }
    console.log(
      '\nRead what it opens. If it is staff tooling, gate it with a fix in\n' +
      'tools/local-fixes.mjs and add a case to tools/verify-staff-gates.cjs.\n' +
      'If it genuinely needs no gate, add it to ALLOWED in this file with the\n' +
      'reason, so the next drop does not stop here again.'
    );
  } else {
    console.log('\nEvery staff-looking surface is either gated or has a recorded reason not to be.');
  }
}

process.exitCode = unjudged.length ? 1 : 0;
