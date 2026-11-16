/**
 * Tariff grid edits must come back exactly as entered after the config is saved and loaded again.
 * Before: a 7' (10 m³) monthly price of $112 came back as $209, and $0 came back as the default.
 */
import { beforeEach, describe, expect, it } from 'vitest';

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
};

import {
  getLocationPricingForHub,
  loadAppConfig,
  saveAppConfig,
  setAppConfigSaveListener,
} from '../../src/services/pricingEngine';
import type { AppConfig, MetroHub } from '../../src/types/quote';

type Category = 'containerPrices' | 'onsiteContainerPrices' | 'interstateContainerPrices';

function editAndReload(hub: MetroHub, cat: Category, size: string, field: string, val: number): number {
  const cfg = loadAppConfig();
  const loc: any = getLocationPricingForHub(cfg, hub);
  const prices = loc[cat] || loc.containerPrices;
  const next = {
    ...cfg,
    locationPricing: { ...cfg.locationPricing, [hub]: { ...loc, [cat]: { ...prices, [size]: { ...prices[size], [field]: val } } } },
  } as AppConfig;
  saveAppConfig(next);
  const reloaded: any = getLocationPricingForHub(loadAppConfig(), hub);
  return (reloaded[cat] || reloaded.containerPrices)[size][field];
}

describe('tariff grid prices survive save and reload', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    setAppConfigSaveListener(null);
  });

  const cases: [MetroHub, Category, string, string, number][] = [
    ['Sydney', 'containerPrices', 'large_25m3', 'monthlyRate', 333],
    ['Sydney', 'containerPrices', 'small_10m3', 'monthlyRate', 112],
    ['Adelaide', 'containerPrices', 'small_10m3', 'monthlyRate', 0],
    ['Sydney', 'containerPrices', 'small_10m3', 'weeklyRate', 0],
    ['Melbourne', 'onsiteContainerPrices', 'medium_19m3', 'monthlyRate', 201],
    ['Brisbane', 'interstateContainerPrices', 'large_25m3', 'monthlyRate', 444],
  ];
  for (const [hub, cat, size, field, val] of cases) {
    it(`${hub} ${cat} ${size} ${field} = $${val}`, () => {
      expect(editAndReload(hub, cat, size, field, val)).toBe(val);
    });
  }

  it('hands every admin save to the server sync', () => {
    const sent: AppConfig[] = [];
    setAppConfigSaveListener((c) => sent.push(c));
    editAndReload('Sydney', 'containerPrices', 'large_25m3', 'monthlyRate', 350);
    expect(sent).toHaveLength(1);
    expect((sent[0].locationPricing as any).Sydney.containerPrices.large_25m3.monthlyRate).toBe(350);
  });
});
