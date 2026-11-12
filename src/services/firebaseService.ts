import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, type Auth, User } from 'firebase/auth';

/**
 * Shipped with the original developer's own Firebase project hardcoded,
 * key and all. Two problems: the credentials are not Portabox's, and
 * initializeApp throws at module scope the moment the key is absent or
 * revoked — before React mounts, so the whole app renders blank.
 *
 * Read from the environment, and only initialise when it is actually
 * configured. The quote flow does not import this module, so an
 * unconfigured deployment still takes quotes; the admin features are the
 * ones that degrade, and they do it at the point of use.
 */
/* Read through both runtimes. This module is imported by the Vite client
   bundle and by the Node server alike — smsService pulls it in, and
   server.ts pulls in smsService — but import.meta.env exists only in the
   former. Reaching for it directly under Node throws at import, which
   takes the whole dev server down before it binds a port. */
const viteEnv =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const nodeEnv = typeof process !== 'undefined' ? process.env ?? {} : {};
const envVar = (k: string) => viteEnv[k] ?? nodeEnv[k] ?? '';

const firebaseConfig = {
  apiKey: envVar('VITE_FIREBASE_API_KEY'),
  authDomain: envVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: envVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: envVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: envVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: envVar('VITE_FIREBASE_APP_ID'),
};

export const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app = hasFirebaseConfig
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

/* Asserted rather than typed as nullable on purpose. Around sixty call
   sites across seven admin services take db as given, and they are
   upstream's files — widening the type here would mean editing every one
   of them and re-doing it on each drop. Unconfigured, a call throws where
   it is made, so the admin feature fails rather than the page. Guard with
   hasFirebaseConfig before reaching for it. */
export const db = (app ? getFirestore(app) : null) as Firestore;

/* auth cannot be null, and that is not a style preference.
   App.tsx calls onAuthStateChanged(auth, ...) as the component mounts,
   so this module is now reached by the public quote flow and not only by
   the admin screens. With no Firebase project configured, a null here
   threw before React rendered anything: blank page, no quote form,
   nothing — for every customer, not just staff.

   An earlier version of this comment said the quote flow never imported
   this module. That was true until the drop that moved staff login into
   Firebase, and it is the assumption that broke.

   So unconfigured, auth is a stand-in that answers exactly one question —
   "is anyone signed in?" — with "no", and does nothing else. Any real
   authentication still fails at the point of use, which is where it
   should: this keeps the page up, it does not pretend to log anyone in. */
const reportSignedOut = (next: unknown) => {
  const cb =
    typeof next === 'function'
      ? (next as (u: null) => void)
      : (next as { next?: (u: null) => void } | null)?.next;
  if (typeof cb === 'function') cb(null);
  return () => {};
};

const signedOutAuth = {
  currentUser: null,
  onAuthStateChanged: reportSignedOut,
  onIdTokenChanged: reportSignedOut,
  beforeAuthStateChanged: () => () => {},
  signOut: async () => {},
};

export const auth = (app ? getAuth(app) : signedOutAuth) as unknown as Auth;
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        return { user: result.user, accessToken: cachedAccessToken };
    }
    return null;
};

export const getAccessToken = async (): Promise<string | null> => {
    return cachedAccessToken;
};
