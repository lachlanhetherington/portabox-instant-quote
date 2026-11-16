import type { AppConfig } from '../types/quote';
import { publicEnv } from '../utils/publicEnv';

/**
 * Modules that only simulate their work today: their data lives in one browser's
 * storage, or they fake a payment/booking/call. They stay available on staging and
 * locally (for demos and building them out), but production always switches them
 * off, whatever the saved admin settings say.
 *
 * To make one live in production: give it real server-side data and providers,
 * then remove it from this list.
 */
export const PRODUCTION_LOCKED_FEATURES = {
  enableCustomerPortal:
    'Customer accounts, bookings and EFT payments are kept only in the browser, and payments are simulated.',
  enableNextStepsFlow: 'Self-booking takes a simulated payment and confirms a booking nobody receives.',
  enableCallCenterDispatch: 'Scheduled deliveries are kept only in the browser that entered them.',
  enableSoftphone: 'Twilio calling is not set up for production.',
  enableCustomersLedger: 'Customer accounts and the ledger are kept only in the browser.',
  enableContainerInventory: 'Container inventory is kept only in the browser that entered it.',
  enableDropOffFunnelAnalytics: 'Funnel data only covers quotes started in this browser.',
  driverPortal: 'Driver jobs are read from browser storage, not from real bookings.',
} as const;

export type LockedFeature = keyof typeof PRODUCTION_LOCKED_FEATURES;

/** Names staff see for each locked module. */
export const PRODUCTION_FEATURE_LABELS: Record<string, string> = {
  enableCustomerPortal: 'Customer portal',
  enableNextStepsFlow: 'Next Steps self-booking',
  enableCallCenterDispatch: 'Call centre fleet calendar',
  enableSoftphone: 'Softphone',
  enableCustomersLedger: 'Customers & ledger',
  enableContainerInventory: 'Container inventory',
  enableDropOffFunnelAnalytics: 'Drop-off funnel analytics',
  driverPortal: 'Driver portal',
};

/** True on the production service (APP_ENV=production, injected into the page by the server). */
export function isProductionApp(): boolean {
  if (publicEnv('VITE_APP_ENV') === 'production') return true;
  return typeof process !== 'undefined' && process.env?.APP_ENV === 'production';
}

/** Why a module is switched off in production, or undefined if it's allowed here. */
export function productionLockReason(feature: string): string | undefined {
  if (!isProductionApp()) return undefined;
  return (PRODUCTION_LOCKED_FEATURES as Record<string, string>)[feature];
}

export function isFeatureLocked(feature: LockedFeature): boolean {
  return productionLockReason(feature) !== undefined;
}

/** The config with every locked module switched off (unchanged outside production). */
export function applyProductionLocks(config: AppConfig): AppConfig {
  if (!isProductionApp()) return config;
  const locked: Partial<AppConfig> = {};
  for (const key of Object.keys(PRODUCTION_LOCKED_FEATURES)) {
    if (key in config || key.startsWith('enable')) (locked as any)[key] = false;
  }
  // Return the same object when nothing changes, so React doesn't re-render needlessly.
  return Object.entries(locked).every(([k, v]) => (config as any)[k] === v) ? config : { ...config, ...locked };
}
