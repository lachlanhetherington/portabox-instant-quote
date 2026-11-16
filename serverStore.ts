import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { applyFollowUp, type FollowUpFields, type FollowUpStatus } from './src/services/quoteFollowUp';

/**
 * Server-only data kept in Firestore, written with the server's own Google
 * credentials (Cloud Run's service account, or `gcloud auth application-default
 * login` locally). Firestore rules deny all client access to these documents.
 *
 *   counters/quotes   { next: number }        sequential quote numbers
 *   settings/public   PublicSettings          settings every visitor's page reads
 *   adminSettings/{env}  AdminSettingsRecord  admin config + competitor benchmark, one per environment
 *   adminSettings/{env}/history/{id}          every save of those settings, so an earlier one can be restored
 */

export interface PublicSettings {
  /** Show "Delivery window & date selected in Next Steps upon booking" on quotes. CEO switches it on. */
  showDeliveryWindowNote: boolean;
}

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  showDeliveryWindowNote: false,
};

/**
 * First number a fresh database hands out. Staging starts at 900001 so its quotes
 * (Q-900001, ...) can't be mistaken for real ones. Only used before the counter exists.
 */
const FIRST_QUOTE_NUMBER = (() => {
  const n = Number(process.env.QUOTE_NUMBER_START);
  return Number.isInteger(n) && n >= 100000 && n <= 999999999 ? n : 100001;
})();

/**
 * Which Firestore database this environment uses. Production sets "(default)"
 * explicitly (deploy/production.env.yaml); anything that doesn't say otherwise
 * (staging, local dev) uses the separate "staging" database, so testing never
 * touches production quote numbers, quotes or settings.
 */
export const FIRESTORE_DATABASE_ID = (process.env.FIRESTORE_DATABASE_ID || '').trim() || 'staging';

let db: Firestore | null = null;
function store(): Firestore {
  if (!db) {
    const app = getApps()[0] || initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || (firebaseConfig as any).projectId,
    });
    db = FIRESTORE_DATABASE_ID === '(default)' ? getFirestore(app) : getFirestore(app, FIRESTORE_DATABASE_ID);
  }
  return db;
}

/**
 * Hands out the next quote number (Q-100001, Q-100002, ...). Never reuses a number.
 * Each issued number gets a `quotes/{number}` record, so only real numbers can be submitted.
 */
export async function nextQuoteNumber(): Promise<string> {
  const counter = store().doc('counters/quotes');
  return store().runTransaction(async (tx) => {
    const snap = await tx.get(counter);
    const current = Number(snap.get('next')) || FIRST_QUOTE_NUMBER;
    const quoteNumber = `Q-${current}`;
    const now = new Date().toISOString();
    tx.set(counter, { next: current + 1, updatedAt: now }, { merge: true });
    tx.set(store().doc(`quotes/${quoteNumber}`), { quoteNumber, status: 'issued', issuedAt: now });
    return quoteNumber;
  });
}

export interface QuoteRecord extends FollowUpFields {
  quoteNumber: string;
  /** issued: number handed out. submitted: legacy. frozen/expired/booked: see src/services/quoteFreeze.ts */
  status: 'issued' | 'submitted' | 'frozen' | 'expired' | 'booked';
  issuedAt?: string;
  submittedAt?: string;
  smartsheetRowIds?: number[];
  smartsheetSheetId?: string;
  rows?: Record<string, unknown>[];
  /** What the customer chose and the server's priced quote (JSON text: Firestore can't hold nested arrays). */
  inputsJson?: string;
  quoteJson?: string;
  customerName?: string;
  contactEmail?: string;
  contactMobile?: string;
  frozenAt?: string;
  expiresAt?: string;
  expiredAt?: string;
  bookedAt?: string;
  bookedBy?: string;
  bookingFrozenUntil?: string;
}

export async function getQuoteRecord(quoteNumber: string): Promise<QuoteRecord | null> {
  const snap = await store().doc(`quotes/${quoteNumber}`).get();
  return snap.exists ? (snap.data() as QuoteRecord) : null;
}

export async function saveQuoteRecord(quoteNumber: string, data: Partial<QuoteRecord>): Promise<void> {
  await store().doc(`quotes/${quoteNumber}`).set(data, { merge: true });
}

function cleanSettings(raw: any): PublicSettings {
  return {
    showDeliveryWindowNote: raw?.showDeliveryWindowNote === true,
  };
}

const SETTINGS_CACHE_MS = 30 * 1000;
let settingsCache: { value: PublicSettings; exp: number } | null = null;

export async function getPublicSettings(): Promise<PublicSettings> {
  if (settingsCache && settingsCache.exp > Date.now()) return settingsCache.value;
  const snap = await store().doc('settings/public').get();
  const value = { ...DEFAULT_PUBLIC_SETTINGS, ...cleanSettings(snap.data()) };
  settingsCache = { value, exp: Date.now() + SETTINGS_CACHE_MS };
  return value;
}

export async function updatePublicSettings(patch: Partial<PublicSettings>, by: string): Promise<PublicSettings> {
  const next = cleanSettings({ ...(await getPublicSettings()), ...patch });
  await store().doc('settings/public').set({ ...next, updatedAt: new Date().toISOString(), updatedBy: by });
  settingsCache = { value: next, exp: Date.now() + SETTINGS_CACHE_MS };
  return next;
}

/**
 * Admin settings (pricing, discounts, feature switches, competitor benchmark).
 * Kept per environment so a local or staging edit never changes production prices:
 * SETTINGS_ENV if set, else the Cloud Run service name (K_SERVICE), else "local".
 * Stored as JSON text because Firestore can't hold nested arrays or undefined values.
 */
export const SETTINGS_ENV = (process.env.SETTINGS_ENV || process.env.K_SERVICE || 'local')
  .toLowerCase()
  .replace(/[^a-z0-9_-]/g, '_')
  .slice(0, 100);

export interface AdminSettings {
  appConfig: Record<string, unknown> | null;
  competitorBenchmark: Record<string, unknown> | null;
  updatedAt?: string;
  updatedBy?: string;
}

const ADMIN_SETTINGS_CACHE_MS = 15 * 1000;
let adminSettingsCache: { value: AdminSettings; exp: number } | null = null;

function parseJsonObject(text: unknown): Record<string, unknown> | null {
  if (typeof text !== 'string' || !text) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export async function getAdminSettings(): Promise<AdminSettings> {
  if (adminSettingsCache && adminSettingsCache.exp > Date.now()) return adminSettingsCache.value;
  const snap = await store().doc(`adminSettings/${SETTINGS_ENV}`).get();
  const value: AdminSettings = {
    appConfig: parseJsonObject(snap.get('appConfigJson')),
    competitorBenchmark: parseJsonObject(snap.get('competitorBenchmarkJson')),
    updatedAt: snap.get('updatedAt') || undefined,
    updatedBy: snap.get('updatedBy') || undefined,
  };
  adminSettingsCache = { value, exp: Date.now() + ADMIN_SETTINGS_CACHE_MS };
  return value;
}

export async function saveAdminSettings(
  patch: { appConfig?: Record<string, unknown>; competitorBenchmark?: Record<string, unknown> },
  by: string,
  restoredFrom?: string
): Promise<AdminSettings> {
  const now = new Date().toISOString();
  const data: Record<string, string> = { updatedAt: now, updatedBy: by, env: SETTINGS_ENV };
  if (patch.appConfig) data.appConfigJson = JSON.stringify(patch.appConfig);
  if (patch.competitorBenchmark) data.competitorBenchmarkJson = JSON.stringify(patch.competitorBenchmark);
  const current = store().doc(`adminSettings/${SETTINGS_ENV}`);
  // The new current settings and their history entry are written together
  const batch = store().batch();
  batch.set(current, data, { merge: true });
  batch.set(current.collection('history').doc(), {
    ...data,
    savedAt: now,
    savedBy: by,
    ...(restoredFrom ? { restoredFrom } : {}),
  });
  await batch.commit();
  adminSettingsCache = null;
  return getAdminSettings();
}

export interface AdminSettingsVersion {
  id: string;
  savedAt: string;
  savedBy: string;
  hasPricing: boolean;
  hasCompetitorPricing: boolean;
  restoredFrom?: string;
}

/** The most recent saves, newest first (without the settings themselves). */
export async function listAdminSettingsHistory(limit = 50): Promise<AdminSettingsVersion[]> {
  const snap = await store()
    .collection(`adminSettings/${SETTINGS_ENV}/history`)
    .orderBy('savedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    savedAt: d.get('savedAt'),
    savedBy: d.get('savedBy'),
    hasPricing: typeof d.get('appConfigJson') === 'string',
    hasCompetitorPricing: typeof d.get('competitorBenchmarkJson') === 'string',
    restoredFrom: d.get('restoredFrom') || undefined,
  }));
}

/** Makes an earlier save the current settings again (recorded as a new save). */
export async function restoreAdminSettingsVersion(id: string, by: string): Promise<AdminSettings | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const snap = await store().doc(`adminSettings/${SETTINGS_ENV}/history/${id}`).get();
  if (!snap.exists) return null;
  const appConfig = parseJsonObject(snap.get('appConfigJson'));
  const competitorBenchmark = parseJsonObject(snap.get('competitorBenchmarkJson'));
  if (!appConfig && !competitorBenchmark) return null;
  return saveAdminSettings(
    { ...(appConfig ? { appConfig } : {}), ...(competitorBenchmark ? { competitorBenchmark } : {}) },
    by,
    id
  );
}

/** Frozen quotes, for the sweep that marks them expired after 30 days. */
export async function listFrozenQuotes(limit = 500): Promise<QuoteRecord[]> {
  const snap = await store().collection('quotes').where('status', '==', 'frozen').limit(limit).get();
  return snap.docs.map((d) => d.data() as QuoteRecord);
}

/**
 * Staff follow-up on a sent quote (status and/or a note), in a transaction so two staff adding
 * notes at once don't overwrite each other. Returns the saved fields, or null if no such sent quote.
 */
export async function updateQuoteFollowUp(
  quoteNumber: string,
  update: { status?: FollowUpStatus; note?: string },
  by: string
): Promise<FollowUpFields | null> {
  const ref = store().doc(`quotes/${quoteNumber}`);
  return store().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || !snap.get('frozenAt')) return null;
    const fields = applyFollowUp(snap.data() as QuoteRecord, update, by, new Date().toISOString());
    tx.set(ref, fields, { merge: true });
    return fields;
  });
}

/** Saved (sent) quotes, newest first. Quotes only given a number but never sent have no frozenAt and are left out. */
export async function listSavedQuotes(limit = 200): Promise<QuoteRecord[]> {
  const snap = await store().collection('quotes').orderBy('frozenAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => d.data() as QuoteRecord);
}
