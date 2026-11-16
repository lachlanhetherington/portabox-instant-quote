/**
 * Firestore security rules (firestore.rules), run against the Firestore emulator:
 *   npm run test:rules
 *
 * The server writes with its own credentials and is not subject to these rules.
 * They decide what a browser (signed in or not) can read and write directly.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-portabox',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  // Seed data the way the server would (rules don't apply to it).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'counters/quotes'), { next: 100005 });
    await setDoc(doc(db, 'quotes/Q-100001'), { quoteNumber: 'Q-100001', status: 'frozen' });
    await setDoc(doc(db, 'settings/public'), { showDeliveryWindowNote: false });
    await setDoc(doc(db, 'adminSettings/portabox-prod'), { appConfigJson: '{}' });
    await setDoc(doc(db, 'adminSettings/portabox-prod/history/h1'), { appConfigJson: '{}' });
    await setDoc(doc(db, 'contacts/c1'), { name: 'Test Customer' });
    await setDoc(doc(db, 'contacts/c1/messages/m1'), validMessage());
  });
});

// --- who is asking ----------------------------------------------------------

type Who = 'anonymous visitor' | 'signed-in customer' | 'staff' | 'staff, email not verified' | 'staff via Microsoft' | 'staff via custom token';

function db(who: Who) {
  const staffClaims = { staff: true, role: 'call_center', email: 'staff@example.com' };
  switch (who) {
    case 'anonymous visitor':
      return env.unauthenticatedContext().firestore();
    case 'signed-in customer':
      return env
        .authenticatedContext('customer', { email: 'c@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } } as any)
        .firestore();
    case 'staff':
      return env
        .authenticatedContext('staff', { ...staffClaims, email_verified: true, firebase: { sign_in_provider: 'google.com' } } as any)
        .firestore();
    case 'staff, email not verified':
      return env
        .authenticatedContext('staff2', { ...staffClaims, email_verified: false, firebase: { sign_in_provider: 'password' } } as any)
        .firestore();
    case 'staff via Microsoft':
      return env
        .authenticatedContext('staff3', { ...staffClaims, email_verified: true, firebase: { sign_in_provider: 'microsoft.com' } } as any)
        .firestore();
    case 'staff via custom token':
      return env
        .authenticatedContext('staff4', { ...staffClaims, email_verified: true, firebase: { sign_in_provider: 'custom' } } as any)
        .firestore();
  }
}

function validMessage(overrides: Record<string, unknown> = {}) {
  return {
    from: '+61400000000',
    to: '+61400000001',
    body: 'Your container is on its way.',
    contactId: 'c1',
    direction: 'outbound',
    timestamp: '2026-11-16T00:00:00.000Z',
    ...overrides,
  };
}

const EVERYONE: Who[] = [
  'anonymous visitor',
  'signed-in customer',
  'staff',
  'staff, email not verified',
  'staff via Microsoft',
  'staff via custom token',
];
const NOT_STAFF: Who[] = EVERYONE.filter((w) => w !== 'staff');

// --- server-only data -------------------------------------------------------

describe('server-only data is closed to every browser', () => {
  const paths = [
    'counters/quotes',
    'quotes/Q-100001',
    'settings/public',
    'adminSettings/portabox-prod',
    'adminSettings/portabox-prod/history/h1',
  ];
  for (const path of paths) {
    for (const who of EVERYONE) {
      it(`${who} can't read or write ${path}`, async () => {
        const d = db(who);
        await assertFails(getDoc(doc(d, path)));
        await assertFails(setDoc(doc(d, path), { tampered: true }));
        await assertFails(deleteDoc(doc(d, path)));
      });
    }
  }

  it("nobody can create a quote number or a quote record", async () => {
    for (const who of EVERYONE) {
      await assertFails(setDoc(doc(db(who), 'counters/quotes'), { next: 1 }));
      await assertFails(setDoc(doc(db(who), 'quotes/Q-999999'), { quoteNumber: 'Q-999999', status: 'issued' }));
    }
  });
});

// --- contacts ---------------------------------------------------------------

describe('contacts', () => {
  it('verified staff (Google or email link) can read', async () => {
    await assertSucceeds(getDoc(doc(db('staff'), 'contacts/c1')));
  });
  for (const who of NOT_STAFF) {
    it(`${who} can't read`, async () => {
      await assertFails(getDoc(doc(db(who), 'contacts/c1')));
    });
  }
  it('nobody can write a contact from the browser, staff included', async () => {
    for (const who of EVERYONE) {
      await assertFails(setDoc(doc(db(who), 'contacts/c2'), { name: 'x' }));
      await assertFails(updateDoc(doc(db(who), 'contacts/c1'), { name: 'x' }));
      await assertFails(deleteDoc(doc(db(who), 'contacts/c1')));
    }
  });
});

// --- messages ---------------------------------------------------------------

describe('contact messages', () => {
  const messages = (who: Who, contactId = 'c1') => collection(db(who), 'contacts', contactId, 'messages');

  it('staff can read and add a valid message', async () => {
    await assertSucceeds(getDoc(doc(db('staff'), 'contacts/c1/messages/m1')));
    await assertSucceeds(addDoc(messages('staff'), validMessage()));
  });

  for (const who of NOT_STAFF) {
    it(`${who} can't read or add messages`, async () => {
      await assertFails(getDoc(doc(db(who), 'contacts/c1/messages/m1')));
      await assertFails(addDoc(messages(who), validMessage()));
    });
  }

  it('messages can never be edited or deleted', async () => {
    for (const who of EVERYONE) {
      await assertFails(updateDoc(doc(db(who), 'contacts/c1/messages/m1'), { body: 'changed' }));
      await assertFails(deleteDoc(doc(db(who), 'contacts/c1/messages/m1')));
    }
  });

  const invalid: Array<[string, Record<string, unknown>]> = [
    ['phone number of the wrong type', { from: 61400000000 }],
    ['phone number too long', { to: '+'.padEnd(33, '1') }],
    ['body over 10,000 characters', { body: 'A'.repeat(10001) }],
    ['body of the wrong type', { body: 42 }],
    ['unknown direction', { direction: 'sideways' }],
    ['timestamp of the wrong type', { timestamp: 1763251200000 }],
    ['contactId too long', { contactId: 'c'.repeat(129) }],
  ];
  for (const [label, change] of invalid) {
    it(`staff can't add a message with ${label}`, async () => {
      await assertFails(addDoc(messages('staff'), validMessage(change)));
    });
  }

  it("staff can't add a message with a required field missing", async () => {
    for (const field of ['from', 'to', 'body', 'contactId', 'direction', 'timestamp']) {
      const m: Record<string, unknown> = validMessage();
      delete m[field];
      await assertFails(addDoc(messages('staff'), m));
    }
  });

  it("staff can't add a message under a contact ID with unsafe characters", async () => {
    await assertFails(setDoc(doc(db('staff'), 'contacts', 'bad id!', 'messages', 'm2'), validMessage({ contactId: 'bad id!' })));
  });

  // Gaps between security_spec.md and firestore.rules today. Each is a rules change
  // (republished to both databases) rather than a test fix.
  it.todo('a message whose contactId differs from its path is rejected (spec #12)');
  it.todo('a message with extra fields is rejected (spec #2)');
  it.todo('a message timestamp must be server time (spec #4)');
});
