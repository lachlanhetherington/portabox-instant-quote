/* The staff token, shared by the two things that need it.
 *
 * AdminGate mints it: the password goes to /api/admin/login, is compared
 * there against ADMIN_PASSWORD, and what comes back is a short HMAC-signed
 * token. StaffOnly only reads it.
 *
 * Kept in sessionStorage, so closing the tab ends the session, and never
 * trusted on its own — the server re-checks the signature on every verify,
 * so editing the stored value by hand gets you nowhere.
 */
export const TOKEN_KEY = 'portabox.admin.token';

export const readToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    /* Private browsing refuses storage. */
    return null;
  }
};

export const storeToken = (token: string): void => {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* The session still works, it just will not survive a reload. Not
       worth blocking on. */
  }
};

/* False on anything unexpected: no token, a bad signature, an expired one,
   or no answer from the server. A surface that cannot confirm the password
   stays shut. */
export async function verifyToken(): Promise<boolean> {
  const token = readToken();
  if (!token) return false;
  try {
    const r = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const d = await r.json().catch(() => ({}));
    return Boolean(d?.valid);
  } catch {
    return false;
  }
}
