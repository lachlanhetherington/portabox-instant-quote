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
  const start = lines.findIndex((l) => /(?:export\s+)?const DEFAULT_CONFIG\b[^=]*=\s*\{/.test(l));
  if (start < 0) return null;

  let depth = 0;
  const region = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    region.push(line);
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    if (depth === 0 && i > start) break;
  }
  return region;
}

/* key: 123  |  key: true  |  key: {   — enough for a config literal, and
   everything it cannot read it simply does not report. */
function scalars(region) {
  if (!region) return null;
  const found = new Map();
  const stack = [];

  for (const raw of region) {
    /* Strip a trailing line comment so a '{' or a number inside a comment
       cannot move the nesting or be read as a value. */
    const line = raw.replace(/\/\/.*$/, '');

    const open = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*\{\s*$/);
    if (open) { stack.push(open[1]); continue; }

    const scalar = line.match(/^\s*([A-Za-z_$][\w$]*)\s*:\s*(-?\d+(?:\.\d+)?|true|false)\s*,?\s*$/);
    if (scalar) {
      found.set([...stack, scalar[1]].join('.'), scalar[2]);
      continue;
    }

    /* A closing brace at the end of a line ends the object it opened. */
    const closes = (line.match(/\}/g) || []).length - (line.match(/\{/g) || []).length;
    for (let i = 0; i < closes; i++) stack.pop();
  }
  return found;
}

const before = scalars(configRegion(fs.readFileSync(oldPath, 'utf8')));
const after = scalars(configRegion(fs.readFileSync(newPath, 'utf8')));

if (!before || !after) {
  console.log('DEFAULT_CONFIG could not be located in one of the two revisions,');
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
  say(`No change to any number or flag default in DEFAULT_CONFIG (${after.size} values compared).`);
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
