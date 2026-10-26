/* Re-apply the local fixes on top of a fresh drop from the client.
 *
 * Every version so far has arrived with the same handful of problems, and
 * each new version reverts whatever was fixed last time — V2 and V3 both did.
 * Rather than hand-patching the same six places again, this applies them and
 * then verifies them.
 *
 *   node tools/local-fixes.mjs          apply, then verify
 *   node tools/local-fixes.mjs --check  verify only; exits 1 if anything is missing
 *
 * It is idempotent: running it twice changes nothing the second time.
 *
 * It is deliberately strict. If a fix cannot be applied because the code it
 * anchors to has moved, it fails loudly rather than skipping quietly — a
 * silently unapplied fix here means a blank page or a published credential.
 */
import fs from 'node:fs';

const CHECK_ONLY = process.argv.includes('--check');
const applied = [];
const already = [];
const failed = [];

const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, s) => fs.writeFileSync(f, s);

/**
 * @param name   what the fix is, for the report
 * @param file   the file it touches
 * @param done   (src) => boolean — is it already in place?
 * @param apply  (src) => string  — return the patched source, or throw
 */
function fix(name, file, done, apply) {
  let src;
  try {
    src = read(file);
  } catch {
    failed.push(`${name}: ${file} is missing`);
    return;
  }
  if (done(src)) { already.push(name); return; }
  if (CHECK_ONLY) { failed.push(`${name}: NOT APPLIED`); return; }
  try {
    const out = apply(src);
    if (out === src || !done(out)) throw new Error('anchor not found — the upstream code moved');
    write(file, out);
    applied.push(name);
  } catch (e) {
    failed.push(`${name}: ${e.message}`);
  }
}

/* -- 1. package.json ------------------------------------------------------
   esbuild ^0.25 conflicts with vite@8's peer range (^0.27 || ^0.28), so
   npm install fails outright with ERESOLVE. Nothing calls esbuild directly;
   Vite ships its own. The name arrives as the scaffolding default. */
fix(
  'package.json: drop the esbuild pin, restore the name',
  'package.json',
  (s) => { const p = JSON.parse(s); return !p.devDependencies?.esbuild && p.name === 'portabox-instant-quote'; },
  (s) => {
    const p = JSON.parse(s);
    delete p.devDependencies.esbuild;
    p.name = 'portabox-instant-quote';
    return JSON.stringify(p, null, 2) + '\n';
  }
);

/* -- 2. firebase-applet-config.json ---------------------------------------
   Arrives carrying a live API key and OAuth client for the original
   developer's Google Cloud project, not Portabox's — and a different project
   each version. It is imported statically, so the file must exist; it ships
   with empty values. */
fix(
  'firebase config: blank the developer\'s project credentials',
  'firebase-applet-config.json',
  (s) => { const c = JSON.parse(s); return !c.apiKey && !c.projectId; },
  (s) => {
    const c = JSON.parse(s);
    const blank = {};
    for (const k of Object.keys(c)) blank[k] = '';
    return JSON.stringify(blank, null, 2) + '\n';
  }
);

/* -- 3. .env.example ------------------------------------------------------
   A Google Maps Platform key is billable. One arrives committed here. */
fix(
  '.env.example: replace the live Maps key with a placeholder',
  '.env.example',
  (s) => !/AIza[A-Za-z0-9_-]{20,}/.test(s),
  (s) => s.replace(/VITE_GOOGLE_MAPS_API_KEY="[^"]*"/, 'VITE_GOOGLE_MAPS_API_KEY="MY_GOOGLE_MAPS_API_KEY"')
);

/* -- 4. routingOptimizationService.ts -------------------------------------
   The same Maps key, hardcoded as a runtime fallback. Unset, only the
   call-centre map embed stops rendering; the slot-efficiency incentive the
   pricing engine imports is arithmetic over depot coordinates. */
fix(
  'routing service: read the Maps key from the environment only',
  'src/services/routingOptimizationService.ts',
  (s) => !/AIza[A-Za-z0-9_-]{20,}/.test(s),
  (s) => s.replace(
    /export const GOOGLE_MAPS_API_KEY =\s*\(import\.meta\.env\.VITE_GOOGLE_MAPS_API_KEY as string\) \|\|\s*'AIza[A-Za-z0-9_-]+';/,
    `/**\n` +
    ` * Supplied with a live key hardcoded as the fallback. A Maps Platform key\n` +
    ` * is billable, so a public repository is the last place for one — and it\n` +
    ` * belonged to the original developer's Google Cloud project rather than\n` +
    ` * Portabox's. Read from the environment only.\n` +
    ` */\n` +
    `export const GOOGLE_MAPS_API_KEY =\n` +
    `  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';`
  )
);

/* -- 5. googleCalendarService.ts ------------------------------------------
   The calendar is documented as falling back to static delivery slots without
   a config. It does not: initializeApp throws auth/invalid-api-key on an empty
   key, and that call sits at module scope, so the throw lands before React
   mounts and takes the whole page down. Blank page, one console error. */
fix(
  'calendar service: make Firebase genuinely optional',
  'src/services/googleCalendarService.ts',
  (s) => s.includes('hasFirebaseConfig'),
  (s) => {
    let out = s.replace(
      /const app = getApps\(\)\.length === 0 \? initializeApp\(firebaseConfig\) : getApp\(\);\s*\nexport const auth = getAuth\(app\);/,
      `// Firebase is only touched when a real config is present. initializeApp\n` +
      `// throws auth/invalid-api-key on an empty key, and because this runs at\n` +
      `// module scope the throw lands before React mounts — a blank page. The\n` +
      `// three call sites below treat a null auth as "signed out", which is what\n` +
      `// sends DeliverySlotPicker to the static windows.\n` +
      `const hasFirebaseConfig = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);\n` +
      `const app = hasFirebaseConfig\n` +
      `  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())\n` +
      `  : null;\n` +
      `export const auth = app ? getAuth(app) : null;\n` +
      `export const isCalendarConfigured = hasFirebaseConfig;`
    );
    out = out.replace(
      '  return onAuthStateChanged(auth, async (user: User | null) => {',
      `  if (!auth) {\n` +
      `    if (onAuthFailure) onAuthFailure();\n` +
      `    return () => {};\n` +
      `  }\n` +
      `  return onAuthStateChanged(auth, async (user: User | null) => {`
    );
    out = out.replace(
      '    const result = await signInWithPopup(auth, provider);',
      `    if (!auth) {\n` +
      `      throw new Error(\n` +
      `        'Google Calendar is not configured. Fill in firebase-applet-config.json to enable it.'\n` +
      `      );\n` +
      `    }\n` +
      `    const result = await signInWithPopup(auth, provider);`
    );
    out = out.replace('  await signOut(auth);', '  if (auth) await signOut(auth);');
    return out;
  }
);

/* -- 6. App.tsx -----------------------------------------------------------
   The website's postcode boxes hand off as ?postcode=3000. Without this the
   app opens on its built-in default and asks for it a second time, which is
   the one thing the hand-off exists to prevent. */
fix(
  'App: read ?postcode= from the URL',
  'src/App.tsx',
  (s) => s.includes('postcodeFromUrl'),
  (s) => {
    let out = s.replace(
      /import \{\s*AUSTRALIAN_POSTCODES,\s*PostcodeRecord,\s*\} from '\.\/data\/australianPostcodes';/,
      `import {\n  AUSTRALIAN_POSTCODES,\n  PostcodeRecord,\n  searchPostcodes,\n} from './data/australianPostcodes';`
    );
    out = out.replace(
      'export default function App() {',
      `/**\n` +
      ` * The website's postcode boxes hand off here as ?postcode=3000.\n` +
      ` *\n` +
      ` * searchPostcodes resolves anything valid: one of the known suburbs, or a\n` +
      ` * synthetic record placed by state range. Anything else is ignored and the\n` +
      ` * default stands, so a junk parameter cannot break the opening screen.\n` +
      ` */\n` +
      `function postcodeFromUrl(): PostcodeRecord | null {\n` +
      `  if (typeof window === 'undefined') return null;\n` +
      `  const raw = new URLSearchParams(window.location.search).get('postcode');\n` +
      `  if (!raw || !/^[0-9]{4}$/.test(raw.trim())) return null;\n` +
      `  return searchPostcodes(raw.trim())[0] || null;\n` +
      `}\n\n` +
      `export default function App() {`
    );
    out = out.replace(
      /useState<PostcodeRecord \| null>\(\s*AUSTRALIAN_POSTCODES\[0\]/,
      'useState<PostcodeRecord | null>(\n    postcodeFromUrl() || AUSTRALIAN_POSTCODES[0]'
    );
    return out;
  }
);

/* -- 7. getting back out of the quote ------------------------------------
   The CRM drop dropped the cancel-quote modal and, with it, every way back
   to the website from the first screen: its header renders the back button
   only when currentStep > 1, and handleBack does nothing at step 1. Someone
   who clicks "Instant Quote" on the site and changes their mind is stuck
   with the browser chrome.

   Restored as a plain exit. History first, so arriving from a link returns
   people to the page they actually came from; the configured site URL is
   the fallback for a typed URL or a new tab. */
const SITE_FALLBACK = 'https://portabox-website-ten.vercel.app/';

fix(
  'App: step 1 back leaves the quote and returns to the site',
  'src/App.tsx',
  (s) => s.includes('VITE_SITE_URL') && /leaveToSite/.test(s),
  (s) => s.replace(
    /const handleBack = \(\) => \{\s*\n(\s*)if \(currentStep === 4 && isMyPlaceStorage\) \{\s*\n\s*setCurrentStep\(2\);\s*\n\s*\} else if \(currentStep > 1\) \{\s*\n\s*setCurrentStep\(\(prev\) => prev - 1\);\s*\n\s*\}\s*\n\s*\};/,
    (m, ind) =>
      `${ind}/* Where the arrow goes once there is no previous step: back through\n` +
      `${ind}   history if this tab has any, so a visitor who followed the CTA\n` +
      `${ind}   lands on the page they left, and the configured site otherwise. */\n` +
      `${ind}const leaveToSite = () => {\n` +
      `${ind}  const site = (import.meta.env.VITE_SITE_URL as string) || '${SITE_FALLBACK}';\n` +
      `${ind}  if (window.history.length > 1) window.history.back();\n` +
      `${ind}  else window.location.href = site;\n` +
      `${ind}};\n\n` +
      `${ind.slice(2)}const handleBack = () => {\n` +
      `${ind}if (currentStep === 4 && isMyPlaceStorage) {\n` +
      `${ind}  setCurrentStep(2);\n` +
      `${ind}} else if (currentStep > 1) {\n` +
      `${ind}  setCurrentStep((prev) => prev - 1);\n` +
      `${ind}} else {\n` +
      `${ind}  leaveToSite();\n` +
      `${ind}}\n` +
      `${ind.slice(2)}};`
  )
);

/* -- 8. showing that exit ------------------------------------------------
   The button itself is gated on currentStep > 1, so restoring the behaviour
   above is invisible without this. Shown at every step, with the label
   changing to say which of the two things it will do. */
fix(
  'header: show the back button on step 1 as well',
  'src/components/Header.tsx',
  (s) => s.includes("currentStep > 1 ? 'Previous step' : 'Back to the Portabox website'"),
  (s) => s.replace(
    /\{currentStep > 1 && !isAdminOpen && !isCallCenterOpen \? \(\s*\n(\s*)<button\s*\n\s*onClick=\{onBack\}\s*\n\s*aria-label="Previous step"/,
    (m, ind) =>
      `{!isAdminOpen && !isCallCenterOpen ? (\n` +
      `${ind}<button\n` +
      `${ind}  onClick={onBack}\n` +
      `${ind}  aria-label={currentStep > 1 ? 'Previous step' : 'Back to the Portabox website'}`
  )
);

/* -- 9. CoverageAreaMapModal.tsx ------------------------------------------
   New in the CRM drop: a third copy of the same billable Maps key, again as
   a hardcoded fallback. Same treatment as the routing service — without a
   key the coverage map does not render, which is an admin feature failing
   honestly rather than someone else's card being charged. */
fix(
  'coverage map: read the Maps key from the environment only',
  'src/components/CoverageAreaMapModal.tsx',
  (s) => !/AIza[A-Za-z0-9_-]{20,}/.test(s),
  (s) => s.replace(
    /const GOOGLE_MAPS_API_KEY =\s*\(import\.meta\.env\.VITE_GOOGLE_MAPS_API_KEY as string\) \|\|\s*'AIza[A-Za-z0-9_-]+';/,
    `const GOOGLE_MAPS_API_KEY =\n` +
    `  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';`
  )
);

/* -- 10. firebaseService.ts -----------------------------------------------
   New in the CRM drop, and the dangerous shape: a literal config holding a
   live key, passed to initializeApp at module scope. An absent or revoked
   key throws auth/invalid-api-key before React mounts, so the page comes up
   blank and reads as a broken build rather than a missing setting. That is
   exactly how this presented the last time.

   The config moves to the environment and initialisation becomes
   conditional. db and auth are null when it is unset, so the Firestore-backed
   admin features fail where they are used instead. The customer quote flow
   never imports this module — Step1 to Step6 do not touch Firebase — so an
   unconfigured deployment still takes quotes. */
fix(
  'firebase service: config from the environment, and never throw at import',
  'src/services/firebaseService.ts',
  (s) => !/AIza[A-Za-z0-9_-]{20,}/.test(s) && /hasFirebaseConfig/.test(s),
  (s) => s.replace(
    /const firebaseConfig = \{[\s\S]*?\};\s*\n+const app = !getApps\(\)\.length \? initializeApp\(firebaseConfig\) : getApps\(\)\[0\];\s*\nexport const db = getFirestore\(app\);\s*\nexport const auth = getAuth\(app\);/,
    `/**\n` +
    ` * Shipped with the original developer's own Firebase project hardcoded,\n` +
    ` * key and all. Two problems: the credentials are not Portabox's, and\n` +
    ` * initializeApp throws at module scope the moment the key is absent or\n` +
    ` * revoked — before React mounts, so the whole app renders blank.\n` +
    ` *\n` +
    ` * Read from the environment, and only initialise when it is actually\n` +
    ` * configured. The quote flow does not import this module, so an\n` +
    ` * unconfigured deployment still takes quotes; the admin features are the\n` +
    ` * ones that degrade, and they do it at the point of use.\n` +
    ` */\n` +
    `/* Read through both runtimes. This module is imported by the Vite client\n` +
    `   bundle and by the Node server alike — smsService pulls it in, and\n` +
    `   server.ts pulls in smsService — but import.meta.env exists only in the\n` +
    `   former. Reaching for it directly under Node throws at import, which\n` +
    `   takes the whole dev server down before it binds a port. */\n` +
    `const viteEnv =\n` +
    `  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};\n` +
    `const nodeEnv = typeof process !== 'undefined' ? process.env ?? {} : {};\n` +
    `const envVar = (k: string) => viteEnv[k] ?? nodeEnv[k] ?? '';\n\n` +
    `const firebaseConfig = {\n` +
    `  apiKey: envVar('VITE_FIREBASE_API_KEY'),\n` +
    `  authDomain: envVar('VITE_FIREBASE_AUTH_DOMAIN'),\n` +
    `  projectId: envVar('VITE_FIREBASE_PROJECT_ID'),\n` +
    `  storageBucket: envVar('VITE_FIREBASE_STORAGE_BUCKET'),\n` +
    `  messagingSenderId: envVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),\n` +
    `  appId: envVar('VITE_FIREBASE_APP_ID'),\n` +
    `};\n\n` +
    `export const hasFirebaseConfig = Boolean(\n` +
    `  firebaseConfig.apiKey && firebaseConfig.projectId\n` +
    `);\n\n` +
    `const app = hasFirebaseConfig\n` +
    `  ? (!getApps().length ? initializeApp(firebaseConfig) : getApps()[0])\n` +
    `  : null;\n\n` +
    `/* Asserted rather than typed as nullable on purpose. Around sixty call\n` +
    `   sites across seven admin services take db and auth as given, and they\n` +
    `   are upstream's files — widening the type here would mean editing every\n` +
    `   one of them and re-doing it on each drop. The runtime behaviour is the\n` +
    `   same either way: unconfigured, a call throws where it is made, so the\n` +
    `   admin feature fails and the quote flow, which never imports this, does\n` +
    `   not. Guard with hasFirebaseConfig before reaching for either. */\n` +
    `export const db = (app ? getFirestore(app) : null) as Firestore;\n` +
    `export const auth = (app ? getAuth(app) : null) as Auth;`
  ).replace(
    /^import \{ getFirestore \} from 'firebase\/firestore';$/m,
    `import { getFirestore, type Firestore } from 'firebase/firestore';`
  ).replace(
    /^import \{ getAuth, signInWithPopup, GoogleAuthProvider, User \} from 'firebase\/auth';$/m,
    `import { getAuth, signInWithPopup, GoogleAuthProvider, type Auth, User } from 'firebase/auth';`
  )
);

/* -- 11. the admin door ---------------------------------------------------
   The portal opens on a boolean. isAdminOpen is plain React state, the
   button toggles it, and App.tsx never once consults getAdminAuthSession —
   so the tariff matrix, the ledger and Export Financials CSV are one click
   from the customer quote page.

   The drop does carry auth machinery, but it does not hold: the password box
   is pre-filled with bullets and never compared, the submit handler only
   checks the email is non-empty, the 2FA code is generated in the browser
   and typed into the field for you, and verifyTwoFactorCode returns true for
   123456, 849201 or 000000 from anyone. Wiring that up would have looked
   like a fix while admitting every visitor.

   So AdminPortal is wrapped instead, in a gate that asks a server function.
   Wrapped rather than edited: AdminPortal.tsx is seven thousand lines and
   the most-churned file upstream ships, and an anchor in it would not
   survive the next drop. */
fix(
  'App: put the staff gate in front of the admin portal',
  'src/App.tsx',
  (s) => s.includes('<AdminGate'),
  (s) => {
    /* The drop arrives with CRLF, so match the break rather than assume it. */
    const open = /(\) : isAdminOpen \? \(\r?\n)(\s*)(<main className="flex-1 w-full flex flex-col p-0 m-0 overflow-hidden">)/;
    const close = /(<\/main>\r?\n)(\s*)(\) : \(\r?\n\s*\/\* Normal User Quote Flow)/;
    if (!open.test(s) || !close.test(s)) {
      throw new Error('the isAdminOpen branch moved');
    }
    let out = s.replace(
      open,
      (m, head, ind, main) =>
        `${head}${ind}<AdminGate onCancel={() => setIsAdminOpen(false)}>\n${ind}${main}`
    );
    out = out.replace(
      close,
      (m, end, ind, tail) => `${end}${ind}</AdminGate>\n${ind}${tail}`
    );
    return out.replace(
      /^(import \{ Header \} from '\.\/components\/Header';)$/m,
      `$1\nimport { AdminGate } from './components/AdminGate';`
    );
  }
);

/* -- report --------------------------------------------------------------- */
const line = (mark, xs) => xs.forEach((x) => console.log(`  ${mark} ${x}`));
if (applied.length) { console.log('applied:'); line('+', applied); }
if (already.length) { console.log('already in place:'); line('=', already); }
if (failed.length) { console.log('FAILED:'); line('!', failed); }

console.log(
  `\n${applied.length} applied, ${already.length} already in place, ${failed.length} failed`
);
if (failed.length) {
  console.log('A failed fix means the upstream code moved. Re-read it and update this file.');
  process.exitCode = 1;
}
