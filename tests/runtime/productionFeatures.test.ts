/** Simulated modules are always off in production, whatever the saved admin settings say. */
import { afterEach, describe, expect, it } from 'vitest';
import {
  PRODUCTION_LOCKED_FEATURES,
  PRODUCTION_FEATURE_LABELS,
  applyProductionLocks,
  isFeatureLocked,
  productionLockReason,
} from '../../src/services/productionFeatures';
import { DEFAULT_CONFIG } from '../../src/services/pricingEngine';
import type { AppConfig } from '../../src/types/quote';

const setEnv = (env?: string) => {
  if (env) (globalThis as any).window = { __PUBLIC_ENV__: { VITE_APP_ENV: env } };
  else delete (globalThis as any).window;
};

const allOn: AppConfig = {
  ...DEFAULT_CONFIG,
  enableCustomerPortal: true,
  enableNextStepsFlow: true,
  enableCallCenterDispatch: true,
  enableSoftphone: true,
  enableCustomersLedger: true,
  enableContainerInventory: true,
  enableDropOffFunnelAnalytics: true,
  enablePhoneCallIntake: true,
  enableQuoteBooking: true,
  enableSmartsheetYardDispatch: true,
};

describe('production feature locks', () => {
  afterEach(() => setEnv());

  it('switches every simulated module off in production', () => {
    setEnv('production');
    const locked = applyProductionLocks(allOn);
    for (const key of Object.keys(PRODUCTION_LOCKED_FEATURES).filter((k) => k.startsWith('enable'))) {
      expect((locked as any)[key], key).toBe(false);
    }
    expect(isFeatureLocked('driverPortal')).toBe(true);
    expect(productionLockReason('enableCustomerPortal')).toMatch(/simulated/);
  });

  it('leaves real modules alone in production', () => {
    setEnv('production');
    const locked = applyProductionLocks(allOn);
    expect(locked.enablePhoneCallIntake).toBe(true); // saves real quote records
    expect(locked.enableQuoteBooking).toBe(true); // server-backed booking from a frozen quote
    expect(locked.enableSmartsheetYardDispatch).toBe(true); // real Smartsheet
    expect((locked as any).driverPortal).toBeUndefined(); // not a config key
  });

  it('changes nothing on staging or locally', () => {
    for (const env of ['staging', undefined]) {
      setEnv(env);
      expect(applyProductionLocks(allOn)).toBe(allOn);
      expect(isFeatureLocked('driverPortal')).toBe(false);
      expect(productionLockReason('enableCustomerPortal')).toBeUndefined();
    }
  });

  it('returns the same object when nothing needs changing', () => {
    setEnv('production');
    const once = applyProductionLocks(allOn);
    expect(applyProductionLocks(once)).toBe(once);
  });

  it('has a staff-facing label for every locked module', () => {
    for (const key of Object.keys(PRODUCTION_LOCKED_FEATURES)) expect(PRODUCTION_FEATURE_LABELS[key], key).toBeTruthy();
  });
});
