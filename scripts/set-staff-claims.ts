/**
 * Sets Firebase custom claims { staff: true, role } for every staff member in
 * STAFF_ROLES_MAP, so Firestore rules (which require the `staff` claim) and the
 * server (which reads the `role` claim) recognise them.
 *
 * Usage:
 *   npm run staff:claims -- --dry-run        # show what would change
 *   npm run staff:claims                     # apply
 *   npm run staff:claims -- --prune          # also remove staff claims from anyone not listed
 *
 * Needs a Firebase service-account key (Firebase Console → Project settings →
 * Service accounts → Generate new private key). Point to it with
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 * Keep that file out of git.
 *
 * Staff who have never signed in are created up front (no password, email
 * marked verified) so their claims are ready before their first sign-in.
 * Whenever someone's claims change, their sessions are revoked so the new role
 * applies on their next sign-in rather than up to an hour later.
 */
import 'dotenv/config';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import { STAFF_ROLES, type StaffRoleName } from '../serverAuth';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const PRUNE = args.has('--prune');

function parseRoleMap(): Map<string, StaffRoleName> {
  const map = new Map<string, StaffRoleName>();
  const errors: string[] = [];
  for (const pair of (process.env.STAFF_ROLES_MAP || '').split(',')) {
    if (!pair.trim()) continue;
    const [rawEmail, rawRole] = pair.split(':').map((v) => v?.trim());
    const email = (rawEmail || '').toLowerCase();
    if (!email.includes('@')) {
      errors.push(`"${pair}": not an email`);
      continue;
    }
    if (!(STAFF_ROLES as readonly string[]).includes(rawRole)) {
      errors.push(`"${pair}": unknown role "${rawRole}" (use one of ${STAFF_ROLES.join(', ')})`);
      continue;
    }
    map.set(email, rawRole as StaffRoleName);
  }
  if (errors.length) {
    console.error('STAFF_ROLES_MAP has problems:\n  ' + errors.join('\n  '));
    process.exit(1);
  }
  return map;
}

function sameClaims(user: UserRecord, role: StaffRoleName): boolean {
  const c = user.customClaims || {};
  return c.staff === true && c.role === role;
}

async function main() {
  const roles = parseRoleMap();
  if (roles.size === 0) {
    console.error('STAFF_ROLES_MAP is empty. Set it in .env (email:role,email:role).');
    process.exit(1);
  }
  const allowList = new Set(
    (process.env.STAFF_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
  for (const email of roles.keys()) {
    if (!allowList.has(email)) console.warn(`! ${email} has a role but is not in STAFF_EMAILS`);
  }

  initializeApp({ credential: applicationDefault(), projectId: (firebaseConfig as any).projectId });
  const auth = getAuth();
  console.log(`${DRY_RUN ? '[dry run] ' : ''}Project: ${(firebaseConfig as any).projectId}\n`);

  for (const [email, role] of roles) {
    let user: UserRecord | null = null;
    try {
      user = await auth.getUserByEmail(email);
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found') throw err;
    }

    if (!user) {
      console.log(`+ ${email}: create user, set role ${role}`);
      if (!DRY_RUN) {
        user = await auth.createUser({ email, emailVerified: true });
        await auth.setCustomUserClaims(user.uid, { staff: true, role });
      }
      continue;
    }

    if (sameClaims(user, role)) {
      console.log(`= ${email}: already ${role}`);
      continue;
    }

    const before = user.customClaims?.role ? `${user.customClaims.role}` : 'no staff role';
    console.log(`~ ${email}: ${before} -> ${role}`);
    if (!DRY_RUN) {
      await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), staff: true, role });
      await auth.revokeRefreshTokens(user.uid);
    }
  }

  if (PRUNE) {
    console.log('\nChecking for staff claims on accounts not in STAFF_ROLES_MAP...');
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const user of page.users) {
        const email = (user.email || '').toLowerCase();
        if (user.customClaims?.staff === true && !roles.has(email)) {
          console.log(`- ${email || user.uid}: remove staff access`);
          if (!DRY_RUN) {
            const { staff: _s, role: _r, ...rest } = user.customClaims || {};
            await auth.setCustomUserClaims(user.uid, rest);
            await auth.revokeRefreshTokens(user.uid);
          }
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);
  }

  console.log(DRY_RUN ? '\nDry run only: nothing changed.' : '\nDone.');
}

main().catch((err) => {
  if (String(err?.message || err).includes('Could not load the default credentials')) {
    console.error('No Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS to your service-account key file.');
  } else {
    console.error(err?.message || err);
  }
  process.exit(1);
});
