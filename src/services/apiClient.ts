import { auth } from './firebaseService';

/**
 * fetch wrapper for the server's /api routes. Attaches the signed-in staff
 * member's Firebase ID token; the server rejects /api calls without it.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const user = auth.currentUser;
  if (user) {
    headers.set('X-Staff-Token', await user.getIdToken());
  }
  return fetch(input, { ...init, headers });
}
