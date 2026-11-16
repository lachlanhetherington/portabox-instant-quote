/* Renders its children only once the server has confirmed the staff
   password. Renders nothing otherwise — no prompt, no placeholder.
 *
 * AdminGate is the right thing in front of a surface you open: it asks for
 * the password and fills the space while it waits. This is for the pieces
 * that sit permanently beside the quote flow, where a sign-in form would
 * just be a box floating over a customer's screen. The softphone bar is the
 * case it was written for.
 *
 * Why this exists on top of upstream's own staff session.
 *
 * It was written when that session was decided entirely in the browser: six
 * staff records carried the password 'Portabox2026!' in the shipped bundle
 * and verifyStaffMfaCode returned true for '123456', '849201' and '000000'
 * for anyone, so hasStaffPermission() answered a question about UI state
 * rather than about who was asking.
 *
 * That is no longer true. Upstream now signs staff in with a Firebase email
 * link verified on the server, the plaintext passwords are gone and are
 * stripped from any older localStorage, verifyStaffMfaCode no longer exists,
 * and a session is discarded as soon as Firebase reports nobody signed in.
 *
 * So this is defence in depth now rather than the only lock on the door, and
 * it is kept for two reasons: it is a second, independent check that does not
 * depend on Firebase being configured correctly, and it is the thing that
 * holds while a drop is being reviewed — upstream's own guarantees are only
 * as old as the most recent drop, and three of the four before this one
 * shipped a staff surface with nothing in front of it at all.
 */
import React, { useEffect, useState } from 'react';
import { verifyToken } from './adminToken';

export function StaffOnly({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let live = true;
    verifyToken().then((ok) => {
      if (live) setUnlocked(ok);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!unlocked) return null;
  return <>{children}</>;
}
