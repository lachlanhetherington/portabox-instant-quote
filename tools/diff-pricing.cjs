/* Diff the numbers and the feature-flag defaults in DEFAULT_CONFIG between
   two revisions of services/pricingEngine.ts.
 *
 *   node tools/diff-pricing.cjs <old pricingEngine.ts> <new pricingEngine.ts>
 *
 * Why this is its own check. A drop can change what a customer is quoted
 * without touching a word of copy, and it can change what the public sees
 * by flipping one boolean. Neither shows up in anything else the pipeline
 * runs: the fixes still apply, the gates still hold, the build is green,
 * and the price went up.
 *
 * The report used to say "check the prices", which is the sort of
 * instruction that gets skimmed. This prints the numbers that changed, old
 * against new, so there is nothing to go and look up.
 *
 * It does not judge. A price change may be exactly what the client asked
 * for — the point is that someone sees it before it is quoted to a
 * customer. The website and this quote engine have disagreed on the Medium
 * size before, $209 against $219, which is the kind of thing that is
 * cheap to spot here and expensive to find in a customer's email.
 *
 * Lexical, not evaluated: the file imports half the app, so running it is
 * not on. It reads the DEFAULT_CONFIG object literal and pulls out every
 * `key: <number | true | false>`, keeping the nesting as a dotted path.
 */
const fs = require('fs');

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error('usage: node tools/diff-pricing.cjs <old pricingEngine.ts> <new pricingEngine.ts>');
  process.exit(2);
}

/* Pull DEFAULT_CONFIG's object literal out, by brace depth from its opening
   line — the file has many other objects and some contain the same keys. */
function configRegion(src) {
  const lines = src.split(/\r?\n/);
  /* Every top-level constant, not just DEFAULT_CONFIG.
   *
   * This read DEFAULT_CONFIG alone, and that turned out to cover much less
   * than it sounded like. The per-city container rates live in
   * DEFAULT_LOCATION_PRICING, a few hundred lines earlier in the same file,
   * so a drop that reworked them was reported as "no change to any number".
   * A pricing check that answers "no" when prices moved is worse than no
   * check, because it gets believed.
   *
   * So: every `const NAME = {` or `= [` at column zero, with its name as
   * the path prefix. A new pricing object in a later drop is then covered
   * the day it arrives rather than the day someone notices. */
  const DECL = /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*[{[]/;
  const regions = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(DECL);
    if (!m) continue;

    let depth = 0;
    const region = [];
    for (let j = i; j < lines.length; j++) {
      const line = lines[j].replace(/\/\/.*$/, '');
      region.push(lines[j]);
      for (const ch of line) {
        if (ch === '{' || ch === '[') depth++;
        else if (ch === '}' || ch === ']') depth--;
      }
      if (depth === 0 && j > i) { i = j; break; }
    }
    regions.push({ name: m[1], region });
  }

  return regions.length ? regions : null;
}

/* key: 123  |  key: true  |  key: {   — enough for a config literal, and
   everything it cannot read it simply does not report. */
function scalars(regions) {
  if (!regions) return null;
  const all = new Map();
  for (const { name, region } of regions) {
    for (const [k, v] of scanOne(region)) all.set(`${name}.${k}`, v);
  }
  return all;
}

function scanOne(region) {
  const found = new Map();
  const stack = [];
  /* Array elements have no key, so they are numbered. Without this every
     element of a list of rate tiers collapses onto the same path and only
     the last survives. */
  let arrayDepth = 0;
  let elementIndex = 0;

  for (const raw of region) {
    /* Strip a trailing line comment so a '{' or a number inside a comment
       cannot move the nesting or be read as a value. */
    const line = raw.replace(/\/\/.*$/, '');

    /* `key: [` opens a list; its elements are numbered below. */
    const openArray = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*\[\s*$/);
    if (openArray) { stack.push(openArray[1]); arrayDepth = stack.length; elementIndex = 0; continue; }

    /* A bare `{` is an element of the list we are inside. */
    if (arrayDepth === stack.length && /^\s*\{\s*$/.test(line)) {
      stack.push(String(elementIndex++));
      continue;
    }

    const open = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*\{\s*$/);
    if (open) { stack.push(open[1]); continue; }

    /* An element written on one line: `{ id: 'x', percent: 5 },` */
    if (arrayDepth === stack.length && /^\s*\{.+\}\s*,?\s*$/.test(line)) {
      const base = [...stack, String(elementIndex++)].join('.');
      for (const m of line.matchAll(
        /([A-Za-z_$][\w$]*)\s*:\s*(-?\d+(?:\.\d+)?|true|false)/g
      )) {
        found.set(`${base}.${m[1]}`, m[2]);
      }
      continue;
    }

    const scalar = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*(-?\d+(?:\.\d+)?|true|false)\s*,?\s*$/);
    if (scalar) {
      found.set([...stack, scalar[1]].join('.'), scalar[2]);
      continue;
    }

    /* A nested object written on one line, which is how the container
       rates are written:
         small_10m3: { monthlyRate: 209, weeklyRate: 69 },
       Without this the whole object is invisible — the open-brace branch
       above only fires when `key: {` ends a line — so every container
       price went unreported and the tool said "no change" while rates
       moved. That is worse than having no check, and it is why this
       exists. */
    const inline = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*\{(.+)\}\s*,?\s*$/);
    if (inline) {
      const base = [...stack, inline[1]].join('.');
      for (const m of inline[2].matchAll(
        /([A-Za-z_$][\w$]*)\s*:\s*(-?\d+(?:\.\d+)?|true|false)/g
      )) {
        found.set(`${base}.${m[1]}`, m[2]);
      }
      continue;
    }

    /* Closing brackets end whatever they opened. Brackets count too, since
       a list can close here. */
    const opened = (line.match(/[{[]/g) || []).length;
    const closed = (line.match(/[}\]]/g) || []).length;
    for (let i = 0; i < closed - opened; i++) {
      stack.pop();
      if (stack.length < arrayDepth) arrayDepth = 0;
    }
  }
  return found;
}

const before = scalars(configRegion(fs.readFileSync(oldPath, 'utf8')));
const after = scalars(configRegion(fs.readFileSync(newPath, 'utf8')));

if (!before || !after) {
  console.log('No top-level constants could be read in one of the two revisions,');
  console.log('so prices and flag defaults were NOT compared. Check them by hand,');
  console.log('and re-anchor tools/diff-pricing.cjs.');
  process.exit(3);
}

const isFlag = (v) => v === 'true' || v === 'false';

const changed = [];
const addedKeys = [];
const removedKeys = [];

for (const [key, val] of after) {
  if (!before.has(key)) addedKeys.push([key, val]);
  else if (before.get(key) !== val) changed.push([key, before.get(key), val]);
}
for (const [key, val] of before) {
  if (!after.has(key)) removedKeys.push([key, val]);
}

const numbers = changed.filter(([, a, b]) => !isFlag(a) && !isFlag(b));
const flags = changed.filter(([, a, b]) => isFlag(a) || isFlag(b));

const say = console.log;

if (!changed.length && !addedKeys.length && !removedKeys.length) {
  say(`No number or flag default changed in any top-level constant (${after.size} values compared).`);
  process.exit(0);
}

if (numbers.length) {
  say(`Prices and rates — ${numbers.length} changed:`);
  say('');
  for (const [key, a, b] of numbers) {
    const dir = Number(b) > Number(a) ? 'up' : 'down';
    say(`  ${key}`);
    say(`    ${a}  ->  ${b}   (${dir})`);
  }
  say('');
}

if (flags.length) {
  say(`Feature flag defaults — ${flags.length} changed:`);
  say('');
  for (const [key, a, b] of flags) {
    say(`  ${key}: ${a} -> ${b}${b === 'true' ? '   (now on for everyone by default)' : ''}`);
  }
  say('');
}

if (addedKeys.length) {
  say(`New settings — ${addedKeys.length}:`);
  say('');
  for (const [key, val] of addedKeys) say(`  ${key} = ${val}`);
  say('');
}

if (removedKeys.length) {
  say(`Settings that disappeared — ${removedKeys.length}:`);
  say('');
  for (const [key, val] of removedKeys) say(`  ${key} (was ${val})`);
  say('');
}

say('A price change is a question for the client, not a merge decision.');

/* Exit 1 so the caller can mark this as needing a person. Not a failure:
   the drop may be carrying a change the client asked for. */
process.exitCode = numbers.length || flags.length ? 1 : 0;
