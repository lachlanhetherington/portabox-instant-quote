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
   sites across seven admin services take db and auth as given, and they
   are upstream's files — widening the type here would mean editing every
   one of them and re-doing it on each drop. The runtime behaviour is the
   same either way: unconfigured, a call throws where it is made, so the
   admin feature fails and the quote flow, which never imports this, does
   not. Guard with hasFirebaseConfig before reaching for either. */
export const db = (app ? getFirestore(app) : null) as Firestore;
export const auth = (app ? getAuth(app) : null) as Auth;
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
