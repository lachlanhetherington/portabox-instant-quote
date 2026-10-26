export interface PostcodeRecord {
  postcode: string;
  suburb: string;
  state: 'SA' | 'VIC' | 'NSW' | 'QLD' | 'WA' | 'TAS' | 'ACT' | 'NT';
  lat: number;
  lng: number;
  region?: string;
}

export interface DepotLocation {
  id: string;
  name: string;
  address: string;
  postcode: string;
  suburb: string;
  state: string;
  lat: number;
  lng: number;
  phone: string;
}

export const PORTABOX_DEPOTS: DepotLocation[] = [
  {
    id: 'adelaide',
    name: 'Adelaide Depot',
    address: '10 Barfield Crescent',
    suburb: 'Edinburgh North',
    postcode: '5113',
    state: 'SA',
    lat: -34.7077,
    lng: 138.6836,
    phone: '1800 467 637',
  },
  {
    id: 'sydney',
    name: 'Sydney Depot',
    address: '20 Carnegie Place',
    suburb: 'Blacktown',
    postcode: '2148',
    state: 'NSW',
    lat: -33.7712,
    lng: 150.9063,
    phone: '1800 467 637',
  },
  {
    id: 'melbourne',
    name: 'Melbourne Depot',
    address: '103 Fitzgerald Road',
    suburb: 'Laverton North',
    postcode: '3026',
    state: 'VIC',
    lat: -37.8288,
    lng: 144.8028,
    phone: '1800 467 637',
  },
  {
    id: 'brisbane',
    name: 'Brisbane Depot',
    address: '9 Citywest Court',
    suburb: 'Gilberton',
    postcode: '4208',
    state: 'QLD',
    lat: -27.7327,
    lng: 153.2847,
    phone: '1800 467 637',
  },
];

export function isSunshineCoastPostcode(_postcode: string, _region?: string): boolean {
  return false;
}

export function getActiveDepots(_enableSunshineCoast: boolean = false): DepotLocation[] {
  return PORTABOX_DEPOTS;
}

import ALL_AUSTRALIAN_POSTCODES_DATA from './allAustralianPostcodes.json';

// Curated priority list of depot-adjacent & metropolitan suburbs to guarantee instant initial rendering
const CURATED_PRIORITY_POSTCODES: PostcodeRecord[] = [
  // SA - Adelaide & Surrounds
  { postcode: '5061', suburb: 'Hyde Park', state: 'SA', lat: -34.9542, lng: 138.6019, region: 'Adelaide' },
  { postcode: '5061', suburb: 'Malvern', state: 'SA', lat: -34.9567, lng: 138.6144, region: 'Adelaide' },
  { postcode: '5061', suburb: 'Unley Park', state: 'SA', lat: -34.9556, lng: 138.5986, region: 'Adelaide' },
  { postcode: '5000', suburb: 'Adelaide CBD', state: 'SA', lat: -34.9285, lng: 138.6007, region: 'Adelaide' },
  { postcode: '5006', suburb: 'North Adelaide', state: 'SA', lat: -34.9080, lng: 138.5950, region: 'Adelaide' },
  { postcode: '5067', suburb: 'Norwood', state: 'SA', lat: -34.9208, lng: 138.6342, region: 'Adelaide' },
  { postcode: '5045', suburb: 'Glenelg', state: 'SA', lat: -34.9814, lng: 138.5178, region: 'Adelaide' },
  { postcode: '5113', suburb: 'Edinburgh North', state: 'SA', lat: -34.7077, lng: 138.6836, region: 'Adelaide' },
  { postcode: '5112', suburb: 'Elizabeth', state: 'SA', lat: -34.7214, lng: 138.6792, region: 'Adelaide' },
  { postcode: '5159', suburb: 'Blackwood', state: 'SA', lat: -35.0211, lng: 138.6167, region: 'Adelaide' },
  { postcode: '5162', suburb: 'Morphett Vale', state: 'SA', lat: -35.1294, lng: 138.5286, region: 'Adelaide' },
  { postcode: '5251', suburb: 'Mount Barker', state: 'SA', lat: -35.0667, lng: 138.8667, region: 'Adelaide Hills' },
  { postcode: '5352', suburb: 'Tanunda (Barossa)', state: 'SA', lat: -34.5244, lng: 138.9603, region: 'Barossa' },
  { postcode: '5211', suburb: 'Victor Harbor', state: 'SA', lat: -35.5500, lng: 138.6167, region: 'Fleurieu' },
  { postcode: '5540', suburb: 'Port Pirie', state: 'SA', lat: -33.1856, lng: 138.0169, region: 'Regional SA' },

  // NSW - Sydney & Surrounds
  { postcode: '2000', suburb: 'Sydney CBD', state: 'NSW', lat: -33.8688, lng: 151.2093, region: 'Sydney' },
  { postcode: '2010', suburb: 'Surry Hills', state: 'NSW', lat: -33.8860, lng: 151.2114, region: 'Sydney' },
  { postcode: '2026', suburb: 'Bondi', state: 'NSW', lat: -33.8915, lng: 151.2767, region: 'Sydney' },
  { postcode: '2095', suburb: 'Manly', state: 'NSW', lat: -33.7972, lng: 151.2872, region: 'Sydney' },
  { postcode: '2148', suburb: 'Blacktown', state: 'NSW', lat: -33.7712, lng: 150.9063, region: 'Sydney' },
  { postcode: '2150', suburb: 'Parramatta', state: 'NSW', lat: -33.8150, lng: 151.0011, region: 'Sydney' },
  { postcode: '2170', suburb: 'Liverpool', state: 'NSW', lat: -33.9200, lng: 150.9242, region: 'Sydney' },
  { postcode: '2220', suburb: 'Hurstville', state: 'NSW', lat: -33.9678, lng: 151.1039, region: 'Sydney' },
  { postcode: '2230', suburb: 'Cronulla', state: 'NSW', lat: -34.0583, lng: 151.1528, region: 'Sydney' },
  { postcode: '2500', suburb: 'Wollongong', state: 'NSW', lat: -34.4278, lng: 150.8931, region: 'Illawarra' },
  { postcode: '2250', suburb: 'Gosford (Central Coast)', state: 'NSW', lat: -33.4267, lng: 151.3417, region: 'Central Coast' },
  { postcode: '2300', suburb: 'Newcastle', state: 'NSW', lat: -32.9283, lng: 151.7817, region: 'Newcastle' },
  { postcode: '2750', suburb: 'Penrith', state: 'NSW', lat: -33.7511, lng: 150.6942, region: 'Sydney' },
  { postcode: '2795', suburb: 'Bathurst', state: 'NSW', lat: -33.4194, lng: 149.5778, region: 'Regional NSW' },

  // VIC - Melbourne & Surrounds
  { postcode: '3000', suburb: 'Melbourne CBD', state: 'VIC', lat: -37.8136, lng: 144.9631, region: 'Melbourne' },
  { postcode: '3006', suburb: 'Southbank', state: 'VIC', lat: -37.8250, lng: 144.9600, region: 'Melbourne' },
  { postcode: '3026', suburb: 'Laverton North', state: 'VIC', lat: -37.8288, lng: 144.8028, region: 'Melbourne' },
  { postcode: '3030', suburb: 'Werribee', state: 'VIC', lat: -37.9000, lng: 144.6667, region: 'Melbourne' },
  { postcode: '3121', suburb: 'Richmond', state: 'VIC', lat: -37.8231, lng: 144.9981, region: 'Melbourne' },
  { postcode: '3141', suburb: 'South Yarra', state: 'VIC', lat: -37.8400, lng: 144.9900, region: 'Melbourne' },
  { postcode: '3182', suburb: 'St Kilda', state: 'VIC', lat: -37.8640, lng: 144.9820, region: 'Melbourne' },
  { postcode: '3175', suburb: 'Dandenong', state: 'VIC', lat: -37.9810, lng: 145.2150, region: 'Melbourne' },
  { postcode: '3199', suburb: 'Frankston', state: 'VIC', lat: -38.1436, lng: 145.1278, region: 'Melbourne' },
  { postcode: '3220', suburb: 'Geelong', state: 'VIC', lat: -38.1499, lng: 144.3617, region: 'Geelong' },
  { postcode: '3350', suburb: 'Ballarat', state: 'VIC', lat: -37.5622, lng: 143.8503, region: 'Regional VIC' },
  { postcode: '3550', suburb: 'Bendigo', state: 'VIC', lat: -36.7570, lng: 144.2794, region: 'Regional VIC' },

  // QLD - Brisbane & Surrounds
  { postcode: '4000', suburb: 'Brisbane City', state: 'QLD', lat: -27.4698, lng: 153.0251, region: 'Brisbane' },
  { postcode: '4006', suburb: 'Fortitude Valley', state: 'QLD', lat: -27.4578, lng: 153.0361, region: 'Brisbane' },
  { postcode: '4101', suburb: 'West End', state: 'QLD', lat: -27.4833, lng: 153.0125, region: 'Brisbane' },
  { postcode: '4122', suburb: 'Mount Gravatt', state: 'QLD', lat: -27.5350, lng: 153.0800, region: 'Brisbane' },
  { postcode: '4208', suburb: 'Gilberton', state: 'QLD', lat: -27.7327, lng: 153.2847, region: 'Gold Coast / Brisbane' },
  { postcode: '4207', suburb: 'Yatala', state: 'QLD', lat: -27.7558, lng: 153.2300, region: 'Gold Coast' },
  { postcode: '4217', suburb: 'Surfers Paradise', state: 'QLD', lat: -28.0024, lng: 153.4294, region: 'Gold Coast' },
  { postcode: '4220', suburb: 'Burleigh Heads', state: 'QLD', lat: -28.0931, lng: 153.4472, region: 'Gold Coast' },
  { postcode: '4300', suburb: 'Springfield', state: 'QLD', lat: -27.6717, lng: 152.9150, region: 'Ipswich' },
  { postcode: '4305', suburb: 'Ipswich', state: 'QLD', lat: -27.6167, lng: 152.7667, region: 'Ipswich' },
  { postcode: '4350', suburb: 'Toowoomba', state: 'QLD', lat: -27.5606, lng: 151.9547, region: 'Darling Downs' },

  // ACT - Canberra
  { postcode: '2600', suburb: 'Canberra (Barton)', state: 'ACT', lat: -35.3056, lng: 149.1350, region: 'Canberra' },
  { postcode: '2601', suburb: 'Acton', state: 'ACT', lat: -35.2819, lng: 149.1189, region: 'Canberra' },
  { postcode: '2612', suburb: 'Braddon', state: 'ACT', lat: -35.2717, lng: 149.1353, region: 'Canberra' },

  // WA - Perth
  { postcode: '6000', suburb: 'Perth CBD', state: 'WA', lat: -31.9523, lng: 115.8613, region: 'Perth' },
  { postcode: '6008', suburb: 'Subiaco', state: 'WA', lat: -31.9472, lng: 115.8239, region: 'Perth' },
  { postcode: '6160', suburb: 'Fremantle', state: 'WA', lat: -32.0569, lng: 115.7485, region: 'Perth' },
];

/**
 * Builds the complete unified list of 18,500+ Australian postcodes and suburbs.
 * Prioritizes curated records at the front to preserve standard defaults.
 */
function buildAllAustralianPostcodes(): PostcodeRecord[] {
  const seen = new Set<string>();
  const list: PostcodeRecord[] = [];

  for (const item of CURATED_PRIORITY_POSTCODES) {
    const key = `${item.postcode}_${item.suburb.toLowerCase()}`;
    seen.add(key);
    list.push(item);
  }

  const rawList = ALL_AUSTRALIAN_POSTCODES_DATA as PostcodeRecord[];
  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i];
    const key = `${raw.postcode}_${raw.suburb.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push(raw);
    }
  }

  return list;
}

// Complete master database of all Australian postcodes (18,500+ suburbs across all states & territories)
export const AUSTRALIAN_POSTCODES: PostcodeRecord[] = buildAllAustralianPostcodes();

// Fast lookup maps
const POSTCODES_BY_NUMBER = new Map<string, PostcodeRecord[]>();
for (let i = 0; i < AUSTRALIAN_POSTCODES.length; i++) {
  const item = AUSTRALIAN_POSTCODES[i];
  const list = POSTCODES_BY_NUMBER.get(item.postcode);
  if (list) {
    list.push(item);
  } else {
    POSTCODES_BY_NUMBER.set(item.postcode, [item]);
  }
}

/**
 * Known precise road driving distances for key Australian corridors.
 * Based on actual road network navigation (e.g. M2, A13, M20, M1, M4)
 */
const KNOWN_DRIVING_DISTANCES: Record<string, number> = {
  // Hyde Park (5061) to Victor Harbor (5211) via Southern Expressway M2 & Victor Harbor Rd A13 is 84 km driving
  '5061-5211': 84,
  '5211-5061': 84,
  // Adelaide Depot Edinburgh North (5113) to Hyde Park (5061) via Northern Expressway M20 & Main North Rd
  '5113-5061': 35,
  '5061-5113': 35,
  // Adelaide Depot Edinburgh North (5113) to Adelaide CBD (5000)
  '5113-5000': 32,
  '5000-5113': 32,
  // Adelaide Depot Edinburgh North (5113) to Victor Harbor (5211)
  '5113-5211': 118,
  '5211-5113': 118,
  // Adelaide CBD (5000) to Victor Harbor (5211)
  '5000-5211': 82,
  '5211-5000': 82,
  // Morphett Vale (5162) to Victor Harbor (5211)
  '5162-5211': 56,
  '5211-5162': 56,
  // Sydney Depot Blacktown (2148) to Sydney CBD (2000)
  '2148-2000': 38,
  '2000-2148': 38,
  // Sydney Depot Blacktown (2148) to Penrith (2750)
  '2148-2750': 25,
  '2750-2148': 25,
  // Melbourne Depot Laverton North (3026) to Melbourne CBD (3000)
  '3026-3000': 22,
  '3000-3026': 22,
  // Melbourne Depot Laverton North (3026) to Frankston (3199)
  '3026-3199': 68,
  '3199-3026': 68,
  // Melbourne CBD (3000) to Frankston (3199)
  '3000-3199': 54,
  '3199-3000': 54,
  // Brisbane Depot Gilberton (4208) to Brisbane CBD (4000)
  '4208-4000': 44,
  '4000-4208': 44,
  // Brisbane Depot Gilberton (4208) to Surfers Paradise (4217)
  '4208-4217': 39,
  '4217-4208': 39,
};

/**
 * Calculate Haversine distance in km between two lat/lng points (as the crow flies)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculate Road Driving Distance in km between two points.
 * Uses exact road driving routes for known Australian corridors,
 * or standard Australian road transport circuity factor (1.27x straight-line).
 * Specifically provides real road driving distance instead of "as the crow flies".
 */
export function calculateDrivingDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  postcode1?: string,
  postcode2?: string
): number {
  if (postcode1 && postcode2) {
    const key = `${postcode1.trim()}-${postcode2.trim()}`;
    if (KNOWN_DRIVING_DISTANCES[key]) {
      return KNOWN_DRIVING_DISTANCES[key];
    }
  }

  const straightLine = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  if (straightLine === 0) return 0;

  // Road circuity factor for Australian road transport networks
  let circuity = 1.27;
  if (straightLine < 20) {
    circuity = 1.25;
  } else if (straightLine > 150) {
    circuity = 1.22;
  }

  return Math.round(straightLine * circuity);
}

/**
 * Find closest Portabox depot to a given coordinate using driving distance
 */
export function findClosestDepot(
  lat: number,
  lng: number,
  postcode?: string,
  enableSunshineCoast: boolean = true
): { depot: DepotLocation; distanceKm: number } {
  const depots = getActiveDepots(enableSunshineCoast);
  let closest = depots[0];
  let minDistance = calculateDrivingDistance(lat, lng, closest.lat, closest.lng, postcode, closest.postcode);

  for (let i = 1; i < depots.length; i++) {
    const d = calculateDrivingDistance(lat, lng, depots[i].lat, depots[i].lng, postcode, depots[i].postcode);
    if (d < minDistance) {
      minDistance = d;
      closest = depots[i];
    }
  }

  return { depot: closest, distanceKm: minDistance };
}

/**
 * Postcode search utility
 * Fast multi-tier search across all 18,500+ Australian postcodes & suburbs.
 */
export function searchPostcodes(query: string, _enableSunshineCoast: boolean = false): PostcodeRecord[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const results: PostcodeRecord[] = [];
  const seenKeys = new Set<string>();

  const addRecord = (p: PostcodeRecord) => {
    const key = `${p.postcode}_${p.suburb.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(p);
    }
  };

  // 1. Exact 4-digit postcode match via O(1) Map
  const exactMatches = POSTCODES_BY_NUMBER.get(clean);
  if (exactMatches) {
    for (const match of exactMatches) {
      addRecord(match);
    }
    if (results.length >= 10) {
      return results.slice(0, 10);
    }
  }

  // 2. Postcode prefix match (e.g. typing "50" or "21")
  const isNumericQuery = /^\d+$/.test(clean);
  if (isNumericQuery) {
    for (let i = 0; i < AUSTRALIAN_POSTCODES.length; i++) {
      const p = AUSTRALIAN_POSTCODES[i];
      if (p.postcode.startsWith(clean)) {
        addRecord(p);
        if (results.length >= 12) break;
      }
    }
    if (results.length > 0) {
      return results.slice(0, 10);
    }
  }

  // 3. Suburb prefix match (e.g. typing "hyd" -> "Hyde Park")
  for (let i = 0; i < AUSTRALIAN_POSTCODES.length; i++) {
    const p = AUSTRALIAN_POSTCODES[i];
    if (p.suburb.toLowerCase().startsWith(clean)) {
      addRecord(p);
      if (results.length >= 12) break;
    }
  }

  // 4. Suburb substring match (if fewer than 10 results)
  if (results.length < 10) {
    for (let i = 0; i < AUSTRALIAN_POSTCODES.length; i++) {
      const p = AUSTRALIAN_POSTCODES[i];
      if (p.suburb.toLowerCase().includes(clean)) {
        addRecord(p);
        if (results.length >= 10) break;
      }
    }
  }

  // 5. Fallback synthetic record if an unusual 4-digit code is typed
  if (/^\d{4}$/.test(clean) && results.length === 0) {
    const pcNum = parseInt(clean, 10);
    let state: PostcodeRecord['state'] = 'NSW';
    let lat = -33.8688;
    let lng = 151.2093;
    let region = 'Sydney Area';

    if (pcNum >= 5000 && pcNum <= 5999) {
      state = 'SA';
      lat = -34.9285;
      lng = 138.6007;
      region = 'Adelaide Area';
    } else if (pcNum >= 3000 && pcNum <= 3999) {
      state = 'VIC';
      lat = -37.8136;
      lng = 144.9631;
      region = 'Melbourne Area';
    } else if (pcNum >= 4000 && pcNum <= 4999) {
      state = 'QLD';
      lat = -27.4698;
      lng = 153.0251;
      region = 'Brisbane Area';
    } else if (pcNum >= 2600 && pcNum <= 2620) {
      state = 'ACT';
      lat = -35.2819;
      lng = 149.1189;
      region = 'Canberra Area';
    } else if (pcNum >= 6000 && pcNum <= 6999) {
      state = 'WA';
      lat = -31.9523;
      lng = 115.8613;
      region = 'Perth Area';
    } else if (pcNum >= 7000 && pcNum <= 7999) {
      state = 'TAS';
      lat = -42.8821;
      lng = 147.3272;
      region = 'Tasmania Area';
    } else if (pcNum >= 800 && pcNum <= 899) {
      state = 'NT';
      lat = -12.4634;
      lng = 130.8456;
      region = 'Darwin Area';
    }

    return [{
      postcode: clean,
      suburb: `Location (${clean})`,
      state,
      lat,
      lng,
      region,
    }];
  }

  return results.slice(0, 10);
}

/**
 * Direct O(1) postcode record lookup
 */
export function getPostcodeRecord(postcode: string): PostcodeRecord | undefined {
  const matches = POSTCODES_BY_NUMBER.get(postcode.trim());
  return matches && matches.length > 0 ? matches[0] : undefined;
}

