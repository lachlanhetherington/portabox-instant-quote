/**
 * Keeps the admin settings (full pricing config + competitor benchmark) on the server,
 * so every customer and staff browser uses the same prices.
 *
 * - On page load: fetch the server's copy for this environment and use it in place of
 *   whatever this browser had. If the server has nothing yet, the browser keeps its copy.
 * - On every admin save: send the config to the server (debounced, because the tariff grid
 *   saves on each keystroke). Only signed-in staff can save; the server checks the role.
 *
 * Progress is broadcast as `portabox:admin-settings-sync` events for the admin status badge.
 */
import { apiFetch } from './apiClient';
import { auth } from './firebaseService';
import {
  loadAppConfig,
  saveAppConfigLocally,
  setAppConfigSaveListener,
} from './pricingEngine';
import {
  COMPETITOR_BENCHMARK_STORAGE_KEY,
  setCompetitorSaveListener,
  type CompetitorBenchmark,
} from './competitorPricingService';
import type { AppConfig } from '../types/quote';

export type AdminSettingsSyncStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'saved'; at: string }
  | { state: 'error'; message: string };

let lastStatus: AdminSettingsSyncStatus = { state: 'idle' };
export function getAdminSettingsSyncStatus(): AdminSettingsSyncStatus {
  return lastStatus;
}

function broadcast(status: AdminSettingsSyncStatus) {
  lastStatus = status;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox:admin-settings-sync', { detail: status }));
  }
}

const PUSH_DELAY_MS = 800;
let pending: { appConfig?: AppConfig; competitorBenchmark?: CompetitorBenchmark } = {};
let timer: ReturnType<typeof setTimeout> | null = null;

async function pushPending() {
  timer = null;
  const body = pending;
  pending = {};
  if (!body.appConfig && !body.competitorBenchmark) return;
  broadcast({ state: 'saving' });
  try {
    const r = await apiFetch('/api/settings/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message =
        r.status === 403
          ? 'Not saved for customers: your role cannot change pricing'
          : data?.error || 'Not saved for customers: the server could not save';
      broadcast({ state: 'error', message });
      return;
    }
    broadcast({ state: 'saved', at: data?.updatedAt || new Date().toISOString() });
  } catch {
    broadcast({ state: 'error', message: 'Not saved for customers: no connection to the server' });
  }
}

function queuePush(part: typeof pending) {
  // Customers never save settings; only signed-in staff send them to the server.
  if (!auth.currentUser) {
    broadcast({ state: 'error', message: 'Not saved for customers: sign in as staff to save pricing' });
    return;
  }
  pending = { ...pending, ...part };
  if (timer) clearTimeout(timer);
  broadcast({ state: 'saving' });
  timer = setTimeout(pushPending, PUSH_DELAY_MS);
}

let started = false;

/** Call once when the app starts. */
export async function startAdminSettingsSync(): Promise<void> {
  if (started) return;
  started = true;
  setAppConfigSaveListener((config) => queuePush({ appConfig: config }));
  setCompetitorSaveListener((benchmark) => queuePush({ competitorBenchmark: benchmark }));
  await loadServerAdminSettings();
}

/** Loads the server's saved settings into this page (also used when a quote shows prices changed). */
export async function loadServerAdminSettings(): Promise<void> {
  try {
    const r = await fetch('/api/public/admin-settings', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    // A save started while the page was loading wins over the copy just fetched.
    if (timer || pending.appConfig || pending.competitorBenchmark) return;
    if (data?.appConfig && typeof data.appConfig === 'object') {
      saveAppConfigLocally(data.appConfig as AppConfig);
      // loadAppConfig fills in any settings added since the server copy was saved
      window.dispatchEvent(new CustomEvent('portabox:pricing-updated', { detail: loadAppConfig() }));
    }
    if (data?.competitorBenchmark && typeof data.competitorBenchmark === 'object') {
      localStorage.setItem(COMPETITOR_BENCHMARK_STORAGE_KEY, JSON.stringify(data.competitorBenchmark));
      window.dispatchEvent(new CustomEvent('portabox:competitor-rates-updated', { detail: data.competitorBenchmark }));
    }
  } catch (err) {
    console.warn('Could not load saved pricing from the server; using this browser’s copy.', err);
  }
}

export interface AdminSettingsVersion {
  id: string;
  savedAt: string;
  savedBy: string;
  hasPricing: boolean;
  hasCompetitorPricing: boolean;
  restoredFrom?: string;
}

async function readError(r: Response, fallback: string): Promise<string> {
  const data = await r.json().catch(() => ({}));
  if (r.status === 403) return 'Only the CEO and pricing admins can see or restore saved versions';
  if (r.status === 401) return 'Sign in as staff to see saved versions';
  return data?.error || fallback;
}

/** Recent pricing saves for this environment, newest first. Throws with a message to show. */
export async function listAdminSettingsHistory(): Promise<AdminSettingsVersion[]> {
  const r = await apiFetch('/api/settings/admin/history');
  if (!r.ok) throw new Error(await readError(r, 'History unavailable'));
  return (await r.json()).versions || [];
}

/** Makes an earlier save the current settings for everyone. Throws with a message to show. */
export async function restoreAdminSettingsVersion(id: string): Promise<void> {
  const r = await apiFetch(`/api/settings/admin/history/${encodeURIComponent(id)}/restore`, { method: 'POST' });
  if (!r.ok) throw new Error(await readError(r, 'The settings could not be restored'));
}
