/**
 * Copies admin settings (pricing, discounts, switches, competitor benchmark),
 * with their save history, from one Firestore database/environment to another.
 * Also copies settings/public.
 *
 * Usage:
 *   npm run settings:copy -- --from-db "(default)" --from-env portabox-staging --to-db staging --dry-run
 *   npm run settings:copy -- --from-db "(default)" --from-env portabox-staging --to-db staging
 *   # at launch, seed production from staging:
 *   npm run settings:copy -- --from-db staging --from-env portabox-staging --to-db "(default)" --to-env portabox-prod
 *
 * --to-env defaults to --from-env. Refuses to overwrite settings that already
 * exist in the target unless --force is given. Uses your gcloud credentials:
 *   gcloud auth application-default login
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const fromDb = arg('from-db');
const toDb = arg('to-db');
const fromEnv = arg('from-env');
const toEnv = arg('to-env') || fromEnv;

if (!fromDb || !toDb || !fromEnv || !toEnv) {
  console.error('Usage: --from-db <db> --from-env <env> --to-db <db> [--to-env <env>] [--dry-run] [--force]');
  process.exit(1);
}
if (fromDb === toDb && fromEnv === toEnv) {
  console.error('Source and target are the same.');
  process.exit(1);
}

const app = initializeApp({ credential: applicationDefault(), projectId: (firebaseConfig as any).projectId });
const open = (id: string): Firestore => (id === '(default)' ? getFirestore(app) : getFirestore(app, id));

async function main() {
  const src = open(fromDb!);
  const dst = open(toDb!);
  const prefix = DRY_RUN ? '[dry run] ' : '';
  console.log(`${prefix}${fromDb}/adminSettings/${fromEnv}  ->  ${toDb}/adminSettings/${toEnv}`);

  const current = await src.doc(`adminSettings/${fromEnv}`).get();
  if (!current.exists) {
    console.error(`Nothing to copy: ${fromDb}/adminSettings/${fromEnv} does not exist.`);
    process.exit(1);
  }
  const target = dst.doc(`adminSettings/${toEnv}`);
  if ((await target.get()).exists && !FORCE) {
    console.error(`${toDb}/adminSettings/${toEnv} already exists. Re-run with --force to overwrite it.`);
    process.exit(1);
  }

  const history = await src.collection(`adminSettings/${fromEnv}/history`).get();
  const publicSettings = await src.doc('settings/public').get();
  console.log(`  current settings: last saved ${current.get('updatedAt') || '?'} by ${current.get('updatedBy') || '?'}`);
  console.log(`  history entries:  ${history.size}`);
  console.log(`  settings/public:  ${publicSettings.exists ? 'yes' : 'none'}`);
  if (DRY_RUN) {
    console.log('\nDry run only: nothing written.');
    return;
  }

  const copiedAt = new Date().toISOString();
  const note = { copiedFrom: `${fromDb}/adminSettings/${fromEnv}`, copiedAt };
  await target.set({ ...current.data(), env: toEnv, ...note });
  // Firestore batches hold up to 500 writes
  for (let i = 0; i < history.docs.length; i += 400) {
    const batch = dst.batch();
    for (const d of history.docs.slice(i, i + 400)) batch.set(target.collection('history').doc(d.id), d.data());
    await batch.commit();
  }
  if (publicSettings.exists) {
    const dstPublic = dst.doc('settings/public');
    if (!(await dstPublic.get()).exists || FORCE) await dstPublic.set(publicSettings.data()!);
    else console.log('  settings/public already exists in the target: left as is.');
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
