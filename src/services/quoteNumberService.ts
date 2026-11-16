import { useEffect, useState } from 'react';
import { apiFetch } from './apiClient';

/**
 * Quote numbers and quote display settings, both held on the server.
 *
 * Quote numbers are sequential (Q-100001, Q-100002, ...) once the server has a
 * Firestore database; until then a time-based number is used. A quote asks the
 * server once and keeps its number for the rest of the browser session, so
 * recalculating or editing the quote keeps the same number. Starting a new
 * quote (e.g. a new phone caller) calls resetQuoteNumber().
 */

const STORAGE_KEY = 'portabox_quote_number';
const listeners = new Set<() => void>();
let current: string | null = null;
let pending: Promise<string | null> | null = null;

function readStored(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setCurrent(value: string | null) {
  current = value;
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: keep it in memory */
  }
  listeners.forEach((fn) => fn());
}

/** The current quote's number, or '' if it hasn't been assigned yet. */
export function getQuoteNumber(): string {
  if (current === null) current = readStored();
  return current || '';
}

/** Assigns a number to the current quote if it doesn't have one yet. */
export function ensureQuoteNumber(): Promise<string | null> {
  const existing = getQuoteNumber();
  if (existing) return Promise.resolve(existing);
  if (!pending) {
    pending = fetch('/api/public/quote-number', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data) => {
        // Until the server's number store is available, fall back to a time-based
        // number. It is still fixed for the rest of this quote, so it doesn't change on edits.
        const n = typeof data?.quoteNumber === 'string' ? data.quoteNumber : `Q-${Date.now().toString().slice(-6)}`;
        setCurrent(n);
        return n;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** Forget the current number so the next quote gets a new one. */
export function resetQuoteNumber() {
  setCurrent(null);
}

/** The current quote number for display; asks the server for one if needed. '' while waiting. */
export function useQuoteNumber(): string {
  const [value, setValue] = useState(getQuoteNumber);
  useEffect(() => {
    const update = () => setValue(getQuoteNumber());
    listeners.add(update);
    ensureQuoteNumber();
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return value;
}

// ---- Quote display settings (CEO-controlled) ----

export interface PublicSettings {
  showDeliveryWindowNote: boolean;
}

const DEFAULT_SETTINGS: PublicSettings = { showDeliveryWindowNote: false };
let settings: PublicSettings = DEFAULT_SETTINGS;
let settingsLoaded: Promise<PublicSettings> | null = null;
const settingsListeners = new Set<() => void>();

export function loadPublicSettings(force = false): Promise<PublicSettings> {
  if (!settingsLoaded || force) {
    settingsLoaded = fetch('/api/public/settings')
      .then((r) => (r.ok ? r.json() : DEFAULT_SETTINGS))
      .catch(() => DEFAULT_SETTINGS)
      .then((data) => {
        settings = { ...DEFAULT_SETTINGS, showDeliveryWindowNote: data?.showDeliveryWindowNote === true };
        settingsListeners.forEach((fn) => fn());
        return settings;
      });
  }
  return settingsLoaded;
}

export function usePublicSettings(): PublicSettings {
  const [value, setValue] = useState(settings);
  useEffect(() => {
    const update = () => setValue(settings);
    settingsListeners.add(update);
    loadPublicSettings().then(update);
    return () => {
      settingsListeners.delete(update);
    };
  }, []);
  return value;
}

/** CEO only (the server checks). Throws with the server's message on failure. */
export async function savePublicSettings(patch: Partial<PublicSettings>): Promise<PublicSettings> {
  const r = await apiFetch('/api/settings/public', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'Settings could not be saved');
  settings = { ...DEFAULT_SETTINGS, showDeliveryWindowNote: data?.showDeliveryWindowNote === true };
  settingsLoaded = Promise.resolve(settings);
  settingsListeners.forEach((fn) => fn());
  return settings;
}
