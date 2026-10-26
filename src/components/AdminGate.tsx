/* Stands in front of the admin interface.
 *
 * Deliberately a separate component rather than an edit inside AdminPortal:
 * that file is seven thousand lines and the most-churned thing upstream
 * ships, so anchoring a change in it would break on the next drop. This
 * wraps it from App.tsx instead and the drop can change whatever it likes.
 *
 * The password goes to /api/admin/login and is compared there, against
 * ADMIN_PASSWORD, which stays on the server. What comes back is a short
 * HMAC-signed token kept in sessionStorage, so closing the tab ends the
 * session.
 */
import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

const TOKEN_KEY = 'portabox.admin.token';

const read = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export function AdminGate({
  children,
  onCancel,
}: {
  children: React.ReactNode;
  onCancel: () => void;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* A token in storage is not taken on trust — the server re-checks the
     signature, so editing the value by hand gets you nowhere. */
  useEffect(() => {
    const token = read();
    if (!token) {
      setChecking(false);
      return;
    }
    fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => setUnlocked(Boolean(d?.valid)))
      .catch(() => setUnlocked(false))
      .finally(() => setChecking(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d?.error || 'Could not sign in.');
        return;
      }
      try {
        sessionStorage.setItem(TOKEN_KEY, d.token);
      } catch {
        /* Private browsing refuses storage; the session still works, it just
           will not survive a reload. Not worth blocking on. */
      }
      setUnlocked(true);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
      setPassword('');
    }
  };

  if (checking) return null;
  if (unlocked) return <>{children}</>;

  return (
    <main className="flex-1 w-full flex items-start justify-center px-4 py-16 bg-slate-50">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 text-[#15385E]">
          <Lock className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          <h1 className="text-lg font-bold">Staff sign-in</h1>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          The admin, dispatch and driver tools are for Portabox staff.
        </p>

        <label htmlFor="admin-password" className="block mt-5 text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-400 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || !password}
            className="flex-1 rounded-lg bg-[#15385E] px-4 py-2.5 font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
