/* Re-extract the API surface from an upstream server.ts into
   src/server/apiRoutes.ts.
 *
 *   node tools/extract-api-routes.cjs <path-to-upstream-server.ts>
 *
 * Why this exists. Upstream develops against `tsx server.ts`, where one
 * Express app both serves the API and mounts Vite. Production is Vercel,
 * where nothing calls listen(): the build is served from dist/ by the
 * platform and the API runs as a function (api/index.ts). So the routes
 * have to live somewhere both entry points can register them from, and
 * server.ts becomes a thin wrapper that does the Vite half.
 *
 * Every upstream drop rewrites server.ts, which means the extraction has to
 * be redone each time. It used to be done by hand, which is how a drop can
 * quietly add routes that work in local development and 404 in production.
 * Running this is the step that stops that.
 *
 * Afterwards: `git checkout -- server.ts` to put the wrapper back, then
 * `node tools/local-fixes.mjs`.
 */
const fs = require('fs');
const path = require('path');

const upstream = process.argv[2];
if (!upstream) {
  console.error('usage: node tools/extract-api-routes.cjs <path-to-upstream-server.ts>');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(upstream, 'utf8').split(/\r?\n/);

/* The route body runs from the first express.json() mount to the Vite
   branch, which is the part that does not belong in a serverless function.
   Both markers are upstream's own lines; if either moves, stop rather than
   guess at a boundary and silently drop routes. */
const START = /^\s*app\.use\(express\.json\(/;
const END = /^\s*if \(process\.env\.NODE_ENV !== 'production'\) \{/;

const start = src.findIndex((l) => START.test(l));
const end = src.findIndex((l) => END.test(l));
if (start < 0) throw new Error('could not find the express.json() mount that starts the route body');
if (end < 0) throw new Error("could not find the NODE_ENV !== 'production' branch that ends it");
if (end <= start) throw new Error('the route body markers are out of order');

/* One level of indentation comes off, since the body was inside
   createServer() and is now inside registerApiRoutes(). Blank lines stay
   blank. Then both kinds of path get rewritten for the new location:
   src/server/apiRoutes.ts is two levels down, so './src/x' is '../x'. This
   covers inline `await import('./src/...')` as well as the top-level
   imports — missing those is a type error at best and a runtime failure in
   the one route that needs them at worst. */
const rewrite = (s) => s.replace(/(['"])\.\/src\//g, '$1../');

const body = rewrite(
  src.slice(start, end)
    .map((l) => (l.startsWith('  ') ? l.slice(2) : l))
    .join('\n')
).replace(/\s+$/, '');

/* Upstream's own imports, minus the ones that belong to the server shell
   rather than the routes. */
const SHELL = /from '(express|http|vite|path)'/;
const upstreamImports = src.slice(0, start)
  .filter((l) => /^import /.test(l) && !SHELL.test(l))
  .map(rewrite);

/* Modules that must not be imported at the top of this file.
 *
 * In production the whole file becomes one Vercel function, and a top-level
 * import runs when the function is invoked at all — not when the route that
 * needs it is hit. smsService reaches twilio and firebase, which together
 * are most of the function's weight, for the sake of two SMS routes. If
 * anything in that chain fails to load, every route in the file dies with
 * FUNCTION_INVOCATION_FAILED, including the ones that touch none of it: the
 * ClickSend routes talk to the ClickSend API over plain fetch and need
 * neither library.
 *
 * So these are loaded on first use instead. The named bindings are replaced
 * by thin async wrappers with upstream's own types, which means the route
 * bodies below are still upstream's code, unedited. Anything not on this
 * list stays a normal import, and the run says so, because a service that
 * is not a handful of async functions would not survive this treatment. */
const LAZY = ['../services/smsService'];

const lazyBlocks = [];
const eagerImports = [];
for (const line of upstreamImports) {
  const m = line.match(/^import \{([^}]+)\} from '([^']+)';?$/);
  if (!m || !LAZY.includes(m[2])) { eagerImports.push(line); continue; }

  const mod = m[2];
  const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (names.some((n) => / as |^\*/.test(n))) {
    throw new Error(`cannot lazy-load a renamed or namespace import from ${mod}: ${m[1]}`);
  }
  lazyBlocks.push(
    `/* ${mod}, on first use — see tools/extract-api-routes.cjs */\n` +
    names.map((n) =>
      `const ${n}: typeof import('${mod}').${n} = async (...args: any[]) =>\n` +
      `  (await import('${mod}')).${n}(...(args as Parameters<typeof import('${mod}').${n}>));`
    ).join('\n')
  );
}

const header = `/* The API surface, lifted out of server.ts so one definition serves both
   ways this runs: tsx server.ts locally, where Vite also mounts, and a
   single Vercel function in production, where Vercel serves dist/ itself.
   Re-extracted from each upstream drop by tools/extract-api-routes.cjs —
   do not edit this file by hand, the next drop will overwrite it. The
   routes themselves are upstream's, moved unchanged. */
import express from 'express';
${eagerImports.join('\n')}
import type { Express } from 'express';

${lazyBlocks.join('\n\n')}

export function registerApiRoutes(app: Express) {

`;

fs.writeFileSync(path.join(root, 'src/server/apiRoutes.ts'), header + body + '\n\n}\n');

const routes = body.match(/^app\.(get|post|put|patch|delete|use)\((['"])\/api[^'"]*/gm) || [];
console.log(`extracted lines ${start + 1}-${end} of ${upstream}`);
console.log(`${routes.length} /api routes:`);
for (const r of routes) console.log('  ' + r.replace(/^app\.(\w+)\((['"])/, '$1 ').toUpperCase().replace(/^(\w+) /, (m, v) => v.padEnd(7)));
console.log('imported at the top:' + (eagerImports.length ? '\n  ' + eagerImports.join('\n  ') : ' nothing but express'));
console.log('loaded on first use:' + (lazyBlocks.length ? '\n  ' + LAZY.join('\n  ') : ' nothing'));
console.log('\nnow: git checkout -- server.ts && node tools/local-fixes.mjs');
