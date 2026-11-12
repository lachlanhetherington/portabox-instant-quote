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
  (s) => {
    /* Match the whole declaration rather than its internals. Upstream has
       rewritten the expression around this key twice — first a plain
       import.meta.env read, then a typeof-guarded one — and each rewrite
       left the live billable key in the file while the fix reported itself
       applied. Anything up to the semicolon goes; what replaces it does not
       depend on what was there. */
    const decl = /export const GOOGLE_MAPS_API_KEY\s*=[\s\S]*?;/;
    if (!decl.test(s)) throw new Error('the GOOGLE_MAPS_API_KEY declaration moved');
    return s.replace(decl,
      `/**
` +
      ` * Supplied with a live key hardcoded as the fallback. A Maps Platform key
` +
      ` * is billable, so a public repository is the last place for one — and it
` +
      ` * belonged to the original developer's Google Cloud project rather than
` +
      ` * Portabox's. Read from the environment only.
` +
      ` */
` +
      `export const GOOGLE_MAPS_API_KEY =
` +
      `  ((import.meta as unknown as { env?: Record<string, string> }).env
` +
      `    ?.VITE_GOOGLE_MAPS_API_KEY) || '';`);
  }
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
    /* Match the import by where it comes from, not by what is currently in
       it. Upstream has added names to this block twice now, and both times
       a contents-based pattern stopped matching and left searchPostcodes
       undefined — which only shows up as a type error, never at runtime. */
    let out = s.replace(
      /import \{([^}]*)\} from '\.\/data\/australianPostcodes';/,
      (m, names) => names.includes('searchPostcodes')
        ? m
        : `import {${names.replace(/\s*$/, '')}\n  searchPostcodes,\n} from './data/australianPostcodes';`
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
    /* The step-4 guard names a flag that upstream renames — it was
       isMyPlaceStorage, now isBypassStep3 — so capture whatever condition is
       there and put it back untouched. Only the trailing else is ours. */
    /const handleBack = \(\) => \{\s*\n(\s*)if \((.+?)\) \{\s*\n\s*setCurrentStep\(2\);\s*\n\s*\} else if \(currentStep > 1\) \{\s*\n\s*setCurrentStep\(\(prev\) => prev - 1\);\s*\n\s*\}\s*\n\s*\};/,
    (m, ind, cond) =>
      `${ind}/* Where the arrow goes once there is no previous step: back through\n` +
      `${ind}   history if this tab has any, so a visitor who followed the CTA\n` +
      `${ind}   lands on the page they left, and the configured site otherwise. */\n` +
      `${ind}const leaveToSite = () => {\n` +
      `${ind}  const site = (import.meta.env.VITE_SITE_URL as string) || '${SITE_FALLBACK}';\n` +
      `${ind}  if (window.history.length > 1) window.history.back();\n` +
      `${ind}  else window.location.href = site;\n` +
      `${ind}};\n\n` +
      `${ind.slice(2)}const handleBack = () => {\n` +
      `${ind}if (${cond}) {\n` +
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
  /* signedOutAuth, not just hasFirebaseConfig: an older version of this fix
     produced the latter without the former, and that combination is the one
     that takes the public page down. */
  (s) => !/AIza[A-Za-z0-9_-]{20,}/.test(s) && /signedOutAuth/.test(s),
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
    `   sites across seven admin services take db as given, and they are\n` +
    `   upstream's files — widening the type here would mean editing every one\n` +
    `   of them and re-doing it on each drop. Unconfigured, a call throws where\n` +
    `   it is made, so the admin feature fails rather than the page. Guard with\n` +
    `   hasFirebaseConfig before reaching for it. */\n` +
    `export const db = (app ? getFirestore(app) : null) as Firestore;\n\n` +
    `/* auth cannot be null, and that is not a style preference.\n` +
    `   App.tsx calls onAuthStateChanged(auth, ...) as the component mounts,\n` +
    `   so this module is now reached by the public quote flow and not only by\n` +
    `   the admin screens. With no Firebase project configured, a null here\n` +
    `   threw before React rendered anything: blank page, no quote form,\n` +
    `   nothing — for every customer, not just staff.\n` +
    `\n` +
    `   An earlier version of this comment said the quote flow never imported\n` +
    `   this module. That was true until the drop that moved staff login into\n` +
    `   Firebase, and it is the assumption that broke.\n` +
    `\n` +
    `   So unconfigured, auth is a stand-in that answers exactly one question —\n` +
    `   "is anyone signed in?" — with "no", and does nothing else. Any real\n` +
    `   authentication still fails at the point of use, which is where it\n` +
    `   should: this keeps the page up, it does not pretend to log anyone in. */\n` +
    `const reportSignedOut = (next: unknown) => {\n` +
    `  const cb =\n` +
    `    typeof next === 'function'\n` +
    `      ? (next as (u: null) => void)\n` +
    `      : (next as { next?: (u: null) => void } | null)?.next;\n` +
    `  if (typeof cb === 'function') cb(null);\n` +
    `  return () => {};\n` +
    `};\n\n` +
    `const signedOutAuth = {\n` +
    `  currentUser: null,\n` +
    `  onAuthStateChanged: reportSignedOut,\n` +
    `  onIdTokenChanged: reportSignedOut,\n` +
    `  beforeAuthStateChanged: () => () => {},\n` +
    `  signOut: async () => {},\n` +
    `};\n\n` +
    `export const auth = (app ? getAuth(app) : signedOutAuth) as unknown as Auth;`
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

/* -- 12. smsService.ts ----------------------------------------------------
   This used to be a patch. The file built a Twilio client at module scope
   from environment variables that may not be set, so twilio(undefined,
   undefined) was evaluated the moment anything imported it — and server.ts
   imports it through apiRoutes, so on a deployment without Twilio
   credentials the whole API function failed at import rather than the one
   route that needed SMS.

   The ClickSend drop rewrote this file and upstream now does it correctly
   themselves: getTwilioConfig() reads the environment when called, and the
   client is constructed inside sendSms behind an isConfigured guard. There
   is nothing left to patch.

   Kept as a check rather than deleted, because the property still matters
   and nothing else in the repo asserts it. If a later drop moves the
   construction back to module scope, this fails here and names the file,
   instead of the deployment failing at import with nothing to point at. */
fix(
  'sms service: Twilio client is built on call, not at import',
  'src/services/smsService.ts',
  (s) => !/^(?:const|let|var)\s+\w+\s*=\s*twilio\(/m.test(s)
      && /^\s+const client = twilio\(/m.test(s),
  () => {
    throw new Error(
      'upstream no longer builds the Twilio client lazily inside sendSms — ' +
      'either it is back at module scope (make it lazy again, as it was ' +
      'before the ClickSend drop) or the call moved and this check needs ' +
      're-anchoring');
  }
);

/* -- 13. the dispatch console -------------------------------------------
   The admin portal is gated; the call centre console was not. The RBAC
   drop added it as its own branch in App.tsx, opening on a boolean exactly
   as the admin portal used to, with no password anywhere in the path —
   while the header announces "Staff Mode Active · 2FA Verified" on a
   browser that has never signed in.

   It carries the dispatch calendar, routing and customer records, so it
   goes behind the same gate. Wrapped from App.tsx rather than edited
   inside the component, for the same reason as the admin portal: that file
   is upstream's and this one is not. */
fix(
  'App: put the dispatch console behind the same gate',
  'src/App.tsx',
  /* Not `<AdminGate[^>]*>`: the onCancel arrow contains a ">" and the class
     stops at it, so that pattern never matches what this fix writes. */
  (s) => /<AdminGate[\s\S]{0,200}?<CallCenterCalendarPortal/.test(s),
  (s) => {
    const open = /(\{isCallCenterOpen && config\.enableCallCenterDispatch !== false \? \(\r?\n)(\s*)(<main className="flex-1 w-full flex flex-col p-0 m-0 overflow-hidden">)/;
    if (!open.test(s)) throw new Error('the isCallCenterOpen branch moved');
    let out = s.replace(open, (m, head, ind, main) =>
      `${head}${ind}<AdminGate onCancel={() => setIsCallCenterOpen(false)}>\n${ind}${main}`);

    /* Close it before the branch that follows. The admin branch is the next
       thing rendered, so its opening line is the reliable boundary. */
    const close = /(<\/main>\r?\n)(\s*)(\) : isAdminOpen \? \()/;
    if (!close.test(out)) throw new Error('could not find the end of the dispatch branch');
    out = out.replace(close, (m, end, ind, tail) => `${end}${ind}</AdminGate>\n${ind}${tail}`);
    return out;
  }
);

/* -- 14. the driver portal ----------------------------------------------
   The third staff surface, and the last one that was still open.

   Written when the staff session was UI state rather than a credential:
   six staff records carried the password 'Portabox2026!' in the shipped
   bundle, verifyStaffMfaCode returned true for '123456', '849201' and
   '000000' for anyone, and inside the portal the driver PIN check accepted
   '0000' with the failure message printing the fallback on screen. Anyone
   who read the public JavaScript could mint a session.

   Upstream has since closed that: sign-in is a Firebase email link checked
   on the server, the passwords and the universal codes are gone from the
   bundle, and a session with no Firebase identity behind it is discarded.

   The gate stays anyway. The portal holds the day's job list with customer
   names and delivery addresses, it costs nothing to ask for a password the
   server checks, and upstream's guarantees are only as old as the most
   recent drop. The gate's own copy has said "admin, dispatch and driver
   tools" since it was written; this is the part that makes that true.

   Rendered as an overlay rather than inline, because unlike the other two
   this is a modal that sits beside the quote flow rather than replacing
   it: gating it in place would push the sign-in form into the page above
   the quote. The wrapper mirrors the modal's own backdrop so a locked
   portal looks like the portal, not like a broken page. */
fix(
  'App: put the driver portal behind the same gate',
  'src/App.tsx',
  (s) => /<AdminGate[\s\S]{0,200}?<DriverPortalModal/.test(s),
  (s) => {
    /* Match the whole element, self-closing, however many props upstream
       gives it — they change between drops and all of them carry through
       untouched. */
    const el = /^([ \t]*)<DriverPortalModal\b[\s\S]*?\/>\r?\n/m;
    const m = s.match(el);
    if (!m) throw new Error('the DriverPortalModal element moved');

    const ind = m[1];
    /* Two levels deeper inside the wrapper. isOpen becomes implied, since
       the condition it read now guards the whole block. */
    const inner = m[0]
      .replace(/\r?\n$/, '')
      .replace(/isOpen=\{isDriverPortalOpen\}/, 'isOpen')
      .split(/\r?\n/)
      .map((l) => '      ' + l)
      .join('\n');

    return s.replace(
      el,
      `${ind}{/* driver portal gated */}\n` +
      `${ind}{isDriverPortalOpen && (\n` +
      `${ind}  <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-start justify-center">\n` +
      `${ind}    <AdminGate onCancel={() => setIsDriverPortalOpen(false)}>\n` +
      inner + '\n' +
      `${ind}    </AdminGate>\n` +
      `${ind}  </div>\n` +
      `${ind})}\n`
    );
  }
);

/* -- 15. the softphone bar ----------------------------------------------
   The fourth staff surface, and the one that can spend money.

   This drop put the bar behind a feature flag and a permission check:
   config.enableSoftphone && staffSession && hasStaffPermission(user,
   'softphone_telephony'). The flag ships off, so nothing renders on the
   live deployment today. When this was written staffSession was browser
   state anyone could mint — see fix 14 — so turning the flag on would have
   handed a live dialler on the business's Twilio account to whoever asked.
   Upstream has since closed that route, but the reasoning for the gate
   survives it: outbound calls are billed to the client, so this is the one
   surface where being wrong costs money rather than only exposing data.

   Not AdminGate: the bar is pinned beside the quote flow rather than
   replacing it, so a sign-in form here would be a password box floating
   over a customer's screen. StaffOnly renders nothing at all until the
   server has confirmed the password, which is the right behaviour for a
   permanent fixture.

   The flag and the permission check are upstream's and both stay — this
   only adds the question neither of them asks. */
fix(
  'App: the softphone bar needs the server-checked password too',
  'src/App.tsx',
  (s) => /<StaffOnly>[\s\S]{0,400}?<TwilioSoftphoneBar/.test(s),
  (s) => {
    const el = /^([ \t]*)<TwilioSoftphoneBar\b[\s\S]*?\/>\r?\n/m;
    const m = s.match(el);
    if (!m) throw new Error('the TwilioSoftphoneBar element moved');

    const ind = m[1];
    const inner = m[0]
      .replace(/\r?\n$/, '')
      .split(/\r?\n/)
      .map((l) => '  ' + l)
      .join('\n');

    let out = s.replace(
      el,
      `${ind}<StaffOnly>\n` + inner + '\n' + `${ind}</StaffOnly>\n`
    );

    /* Next to the AdminGate import, which fix 11 has already put in. */
    const anchor = /^(import \{ AdminGate \} from '\.\/components\/AdminGate';)$/m;
    if (!anchor.test(out)) throw new Error('the AdminGate import is not there to anchor to');
    return out.replace(anchor, `$1\nimport { StaffOnly } from './components/StaffOnly';`);
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
