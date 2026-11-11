/* Renders its children only once the server has confirmed the staff
   password. Renders nothing otherwise — no prompt, no placeholder.
 *
 * AdminGate is the right thing in front of a surface you open: it asks for
 * the password and fills the space while it waits. This is for the pieces
 * that sit permanently beside the quote flow, where a sign-in form would
 * just be a box floating over a customer's screen. The softphone bar is the
 * case it was written for.
 *
 * Why either is needed on top of upstream's own staff session: that session
 * is decided in the browser. Six staff records in services/adminAuthService
 * carry the password 'Portabox2026!' in the shipped bundle, and
 * verifyStaffMfaCode returns true for '123456', '849201' and '000000' for
 * anyone. So hasStaffPermission() answers a question about UI state, not
 * about who is asking. This answers the second one.
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
