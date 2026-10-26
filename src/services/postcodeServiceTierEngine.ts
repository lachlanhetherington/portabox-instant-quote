import { PostcodeRecord, DepotLocation, findClosestDepot, AUSTRALIAN_POSTCODES } from '../data/australianPostcodes';

export type ServiceTierLevel = 1 | 2 | 3;

export interface PostcodeServiceTierConfig {
  tier1MaxKm: number; // default: 200 km from any depot
  servicedStates: ('SA' | 'VIC' | 'NSW' | 'QLD')[]; // 4 states
  tier1Title: string;
  tier1Message: string;
  tier2Title: string;
  tier2Message: string;
  tier3Title: string;
  tier3Message: string;
  salesInquiryPhone: string;
  customOverrides?: Record<string, { tier: ServiceTierLevel; customNote?: string }>;
}

export const DEFAULT_POSTCODE_SERVICE_TIERS: PostcodeServiceTierConfig = {
  tier1MaxKm: 200,
  servicedStates: ['SA', 'VIC', 'NSW', 'QLD'],
  tier1Title: 'Tier 1: Serviceable Delivery Zone (0–200 km)',
  tier1Message: 'Within our standard service area. Full delivery, moving & storage container options available.',
  tier2Title: 'Tier 2: Extended Regional (Inside 4 States > 200 km)',
  tier2Message: 'This is outside our normal service area, but call in as we may be able to accommodate via selling you a container.',
  tier3Title: 'Tier 3: Unserviced State / Territory',
  tier3Message: 'We do not service your location.',
  salesInquiryPhone: '1800 467 637',
  customOverrides: {},
};

export interface PostcodeTierEvaluation {
  tier: ServiceTierLevel;
  title: string;
  message: string;
  closestDepot: DepotLocation;
  distanceKm: number;
  state: string;
  postcode: string;
  suburb: string;
  isInsideServicedState: boolean;
  isWithin200Km: boolean;
  isCustomOverride?: boolean;
  overrideNote?: string;
  canProceedToQuote: boolean;
  ctaText?: string;
  ctaPhone?: string;
}

/**
 * Evaluates which service tier an Australian postcode falls into:
 * a) Three tiers for all postcodes in Australia
 * b) Tier 1 - all locations within 200 km's from our current locations (what we service -Zones)
 * c) Tier 2 - all other locations inside 4 states above 200 km's - message: this is outside our normal service area, but call in as we may be able to accommodate via selling you a container.
 * d) Tier 3 - all other postcodes in other states and territories - we do not service your location -
 */
export function evaluatePostcodeServiceTier(
  postcodeRecordOrQuery: PostcodeRecord | string,
  config?: PostcodeServiceTierConfig,
  enableSunshineCoast: boolean = true
): PostcodeTierEvaluation {
  const tierCfg = config || DEFAULT_POSTCODE_SERVICE_TIERS;
  const maxKm = tierCfg.tier1MaxKm ?? 200;
  const validStates = tierCfg.servicedStates || ['SA', 'VIC', 'NSW', 'QLD'];

  let record: PostcodeRecord;

  if (typeof postcodeRecordOrQuery === 'string') {
    const clean = postcodeRecordOrQuery.trim();
    const matched = AUSTRALIAN_POSTCODES.find((p) => p.postcode === clean);
    if (matched) {
      record = matched;
    } else {
      // Synthetic record based on Australian postcode ranges
      const pcNum = parseInt(clean, 10);
      let state: PostcodeRecord['state'] = 'NSW';
      let lat = -33.8688;
      let lng = 151.2093;
      let region = 'NSW';

      if (pcNum >= 5000 && pcNum <= 5999) {
        state = 'SA';
        lat = -34.9285;
        lng = 138.6007;
        region = 'Adelaide';
      } else if (pcNum >= 3000 && pcNum <= 3999) {
        state = 'VIC';
        lat = -37.8136;
        lng = 144.9631;
        region = 'Melbourne';
      } else if (pcNum >= 4000 && pcNum <= 4999) {
        state = 'QLD';
        lat = -27.4698;
        lng = 153.0251;
        region = 'Brisbane';
      } else if (pcNum >= 2600 && pcNum <= 2620) {
        state = 'ACT';
        lat = -35.2819;
        lng = 149.1189;
        region = 'ACT';
      } else if (pcNum >= 6000 && pcNum <= 6999) {
        state = 'WA';
        lat = -31.9523;
        lng = 115.8613;
        region = 'WA';
      } else if (pcNum >= 7000 && pcNum <= 7999) {
        state = 'TAS';
        lat = -42.8821;
        lng = 147.3272;
        region = 'TAS';
      } else if (pcNum >= 800 && pcNum <= 899) {
        state = 'NT';
        lat = -12.4634;
        lng = 130.8456;
        region = 'NT';
      }

      record = {
        postcode: clean,
        suburb: `Location (${clean})`,
        state,
        lat,
        lng,
        region,
      };
    }
  } else {
    record = postcodeRecordOrQuery;
  }

  // Find closest depot & distance
  const { depot, distanceKm } = findClosestDepot(
    record.lat,
    record.lng,
    record.postcode,
    enableSunshineCoast
  );

  // Check manual overrides if any
  const override = tierCfg.customOverrides?.[record.postcode];
  if (override) {
    const isTier1 = override.tier === 1;
    const isTier2 = override.tier === 2;
    return {
      tier: override.tier,
      title: isTier1 ? tierCfg.tier1Title : isTier2 ? tierCfg.tier2Title : tierCfg.tier3Title,
      message: override.customNote || (isTier1 ? tierCfg.tier1Message : isTier2 ? tierCfg.tier2Message : tierCfg.tier3Message),
      closestDepot: depot,
      distanceKm,
      state: record.state,
      postcode: record.postcode,
      suburb: record.suburb,
      isInsideServicedState: (validStates as string[]).includes(record.state),
      isWithin200Km: distanceKm <= maxKm,
      isCustomOverride: true,
      overrideNote: override.customNote,
      canProceedToQuote: isTier1,
      ctaPhone: tierCfg.salesInquiryPhone,
      ctaText: isTier2 ? 'Inquire About Buying a Container' : undefined,
    };
  }

  const isInsideServicedState = (validStates as string[]).includes(record.state);
  const isWithin200Km = distanceKm <= maxKm;

  // d) Tier 3 - all other postcodes in other states and territories - we do not service your location -
  if (!isInsideServicedState) {
    return {
      tier: 3,
      title: tierCfg.tier3Title,
      message: tierCfg.tier3Message,
      closestDepot: depot,
      distanceKm,
      state: record.state,
      postcode: record.postcode,
      suburb: record.suburb,
      isInsideServicedState: false,
      isWithin200Km: false,
      canProceedToQuote: false,
      ctaPhone: tierCfg.salesInquiryPhone,
    };
  }

  // b) Tier 1 - all locations within 200 km's from our current locations (what we service -Zones)
  if (isWithin200Km) {
    return {
      tier: 1,
      title: tierCfg.tier1Title,
      message: tierCfg.tier1Message,
      closestDepot: depot,
      distanceKm,
      state: record.state,
      postcode: record.postcode,
      suburb: record.suburb,
      isInsideServicedState: true,
      isWithin200Km: true,
      canProceedToQuote: true,
      ctaPhone: tierCfg.salesInquiryPhone,
    };
  }

  // c) Tier 2 - all other locations inside 4 states above 200 km's
  // message: this is outside our normal service area, but call in as we may be able to accommodate via selling you a container.
  return {
    tier: 2,
    title: tierCfg.tier2Title,
    message: tierCfg.tier2Message,
    closestDepot: depot,
    distanceKm,
    state: record.state,
    postcode: record.postcode,
    suburb: record.suburb,
    isInsideServicedState: true,
    isWithin200Km: false,
    canProceedToQuote: false, // requires phone call or container purchase inquiry
    ctaText: 'Call 1800 467 637 to Purchase Container',
    ctaPhone: tierCfg.salesInquiryPhone,
  };
}
