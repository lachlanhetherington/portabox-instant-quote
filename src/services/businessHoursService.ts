import {
  PORTABOX_DEPOTS,
  findClosestDepot,
  AUSTRALIAN_POSTCODES,
  DepotLocation,
} from '../data/australianPostcodes';

/**
 * Business Hours & After-Hours Texting Service
 * Tracks whether the user is contacting Portabox outside configured business hours,
 * pops out the after-hours auto-responder modal, and saves their details for morning callback.
 */

export interface BusinessHoursConfig {
  enabled: boolean;
  startHour: number; // e.g. 8 (8:30 AM)
  startMinute: number; // e.g. 30
  endHour: number; // e.g. 17 (5:00 PM)
  endMinute: number; // e.g. 0
  timezone: string; // e.g. 'Australia/Sydney', 'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Perth'
  daysOpen: number[]; // 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 0 = Sunday
  autoReplyText: string;
  forceAfterHoursForTesting?: boolean;
}

export interface AfterHoursMessage {
  id: string;
  createdAt: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  message: string;
  suburbOrPostcode?: string;
  source: 'AreYouStuckBanner' | 'CustomerPortal' | 'Direct';
  status: 'Pending Morning Response' | 'Contacted' | 'Closed';
  notes?: string;
}

export interface LocationServiceHoursConfig {
  depotId: string;
  depotName: string;
  suburb: string;
  state: string;
  timezone: string;
  phone: string;
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  daysOpen: number[];
  autoReplyText: string;
  forceAfterHoursForTesting?: boolean;
}

export const DEFAULT_BUSINESS_HOURS_CONFIG: BusinessHoursConfig = {
  enabled: true,
  startHour: 8,
  startMinute: 30,
  endHour: 17,
  endMinute: 0,
  timezone: 'Australia/Sydney',
  daysOpen: [1, 2, 3, 4, 5], // Monday through Friday
  autoReplyText:
    "Thanks for reaching out! Our team has stepped away for the day, but we’ve saved your message and will get right back to you first thing tomorrow morning. While you're here, leave us all the details! Tell us what you're looking for, and we'll take care of the rest in the morning.",
  forceAfterHoursForTesting: false,
};

export const DEFAULT_LOCATION_SERVICE_HOURS: Record<string, LocationServiceHoursConfig> = {
  adelaide: {
    depotId: 'adelaide',
    depotName: 'Adelaide Depot',
    suburb: 'Edinburgh North',
    state: 'SA',
    timezone: 'Australia/Adelaide',
    phone: '1800 467 637',
    enabled: true,
    startHour: 8,
    startMinute: 30,
    endHour: 17,
    endMinute: 0,
    daysOpen: [1, 2, 3, 4, 5],
    autoReplyText:
      "Thanks for contacting Portabox Adelaide (Edinburgh North)! Our South Australian dispatch office is currently closed. Leave your details and postcode below, and our local team will call or text you first thing tomorrow morning.",
    forceAfterHoursForTesting: false,
  },
  sydney: {
    depotId: 'sydney',
    depotName: 'Sydney Depot',
    suburb: 'Blacktown',
    state: 'NSW',
    timezone: 'Australia/Sydney',
    phone: '1800 467 637',
    enabled: true,
    startHour: 8,
    startMinute: 30,
    endHour: 17,
    endMinute: 0,
    daysOpen: [1, 2, 3, 4, 5],
    autoReplyText:
      "Thanks for contacting Portabox Sydney (Blacktown)! Our NSW dispatch office has closed for the day. Leave your details below and our Sydney operations team will phone or text you first thing tomorrow morning.",
    forceAfterHoursForTesting: false,
  },
  melbourne: {
    depotId: 'melbourne',
    depotName: 'Melbourne Depot',
    suburb: 'Laverton North',
    state: 'VIC',
    timezone: 'Australia/Melbourne',
    phone: '1800 467 637',
    enabled: true,
    startHour: 8,
    startMinute: 30,
    endHour: 17,
    endMinute: 0,
    daysOpen: [1, 2, 3, 4, 5],
    autoReplyText:
      "Thanks for contacting Portabox Melbourne (Laverton North)! Our Victorian dispatch team has wrapped up for the day. Leave your note below and we'll reach out first thing tomorrow morning.",
    forceAfterHoursForTesting: false,
  },
  brisbane: {
    depotId: 'brisbane',
    depotName: 'Brisbane Depot',
    suburb: 'Gilberton',
    state: 'QLD',
    timezone: 'Australia/Brisbane',
    phone: '1800 467 637',
    enabled: true,
    startHour: 8,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    daysOpen: [1, 2, 3, 4, 5],
    autoReplyText:
      "Thanks for contacting Portabox Brisbane (Gilberton)! Our Queensland operations office has closed for the day. Leave your details and we'll be in touch first thing tomorrow morning.",
    forceAfterHoursForTesting: false,
  },
};

const STORAGE_KEY_AFTER_HOURS_MESSAGES = 'portabox_after_hours_messages_v1';

/**
 * Checks if current time is outside configured business hours.
 */
export function checkBusinessHoursStatus(config?: BusinessHoursConfig): {
  isOutside: boolean;
  reason: string;
  scheduleSummary: string;
  nextOpenText: string;
} {
  const cfg = config || DEFAULT_BUSINESS_HOURS_CONFIG;

  if (cfg.enabled === false) {
    return {
      isOutside: false,
      reason: 'Business hours check is disabled',
      scheduleSummary: 'Always open / Direct SMS available',
      nextOpenText: 'Team is online now',
    };
  }

  // Admin test mode override
  if (cfg.forceAfterHoursForTesting) {
    return {
      isOutside: true,
      reason: 'Outside business hours (Simulated Admin Test Mode)',
      scheduleSummary: formatScheduleSummary(cfg),
      nextOpenText: 'Tomorrow morning at ' + formatTime(cfg.startHour, cfg.startMinute),
    };
  }

  const tz = cfg.timezone || 'Australia/Sydney';
  const now = new Date();

  // Extract current weekday and time in the configured timezone
  let dayOfWeek = now.getDay();
  let hour = now.getHours();
  let minute = now.getMinutes();

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(now);

    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value || '';
    const hourPart = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minutePart = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    const DAY_MAP: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    if (DAY_MAP[weekdayPart] !== undefined) {
      dayOfWeek = DAY_MAP[weekdayPart];
    }
    hour = hourPart;
    minute = minutePart;
  } catch (err) {
    console.warn('Could not format timezone, using local time:', err);
  }

  const isOpenToday = cfg.daysOpen.includes(dayOfWeek);
  const currentTimeVal = hour * 60 + minute;
  const startTimeVal = cfg.startHour * 60 + cfg.startMinute;
  const endTimeVal = cfg.endHour * 60 + cfg.endMinute;

  const scheduleSummary = formatScheduleSummary(cfg);

  if (!isOpenToday) {
    return {
      isOutside: true,
      reason: 'Closed today (Weekend or non-operating day)',
      scheduleSummary,
      nextOpenText: getNextOpenDayString(cfg, dayOfWeek),
    };
  }

  if (currentTimeVal < startTimeVal) {
    return {
      isOutside: true,
      reason: 'Before opening hours',
      scheduleSummary,
      nextOpenText: `This morning at ${formatTime(cfg.startHour, cfg.startMinute)}`,
    };
  }

  if (currentTimeVal >= endTimeVal) {
    return {
      isOutside: true,
      reason: 'Stepped away for the day (After 5:00 PM close)',
      scheduleSummary,
      nextOpenText: getNextOpenDayString(cfg, dayOfWeek),
    };
  }

  return {
    isOutside: false,
    reason: 'Within business hours',
    scheduleSummary,
    nextOpenText: `Open until ${formatTime(cfg.endHour, cfg.endMinute)}`,
  };
}

export function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute < 10 ? `0${minute}` : `${minute}`;
  return `${displayHour}:${displayMinute} ${ampm}`;
}

export function formatScheduleSummary(cfg: BusinessHoursConfig): string {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNames = cfg.daysOpen.map((d) => DAYS[d]).join(', ');
  return `${dayNames} · ${formatTime(cfg.startHour, cfg.startMinute)} – ${formatTime(cfg.endHour, cfg.endMinute)} (${cfg.timezone.replace('Australia/', '')})`;
}

function getNextOpenDayString(cfg: BusinessHoursConfig, currentDay: number): string {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    if (cfg.daysOpen.includes(nextDay)) {
      if (i === 1) {
        return `Tomorrow morning at ${formatTime(cfg.startHour, cfg.startMinute)}`;
      }
      return `${DAYS[nextDay]} morning at ${formatTime(cfg.startHour, cfg.startMinute)}`;
    }
  }
  return `Next business morning at ${formatTime(cfg.startHour, cfg.startMinute)}`;
}

export interface LocationHoursStatus {
  isOutside: boolean;
  reason: string;
  scheduleSummary: string;
  nextOpenText: string;
  depotConfig: LocationServiceHoursConfig;
  localTimeFormatted: string;
  isSpecificLocation: boolean;
}

export function getLocationBusinessHoursStatus(
  locationIdOrPostcode?: string | DepotLocation | null,
  locationMap?: Record<string, LocationServiceHoursConfig>,
  globalConfig?: BusinessHoursConfig
): LocationHoursStatus {
  const map = locationMap || DEFAULT_LOCATION_SERVICE_HOURS;
  let targetDepotId = 'sydney'; // default fallback

  if (locationIdOrPostcode) {
    if (typeof locationIdOrPostcode === 'object' && 'id' in locationIdOrPostcode) {
      targetDepotId = locationIdOrPostcode.id;
    } else {
      const query = String(locationIdOrPostcode).trim().toLowerCase();
      // If it matches a known depot id
      if (map[query]) {
        targetDepotId = query;
      } else {
        // Try extracting 4-digit postcode
        const pcMatch = query.match(/\b\d{4}\b/);
        const pc = pcMatch ? pcMatch[0] : query;
        const found = AUSTRALIAN_POSTCODES.find((p) => p.postcode === pc);
        if (found) {
          const closest = findClosestDepot(found.lat, found.lng, found.postcode);
          targetDepotId = closest.depot.id;
        } else {
          const pcNum = parseInt(pc, 10);
          if (pcNum >= 5000 && pcNum <= 5999) targetDepotId = 'adelaide';
          else if (pcNum >= 3000 && pcNum <= 3999) targetDepotId = 'melbourne';
          else if (pcNum >= 4000 && pcNum <= 4999) targetDepotId = 'brisbane';
          else targetDepotId = 'sydney';
        }
      }
    }
  }

  const depotConfig =
    map[targetDepotId] ||
    DEFAULT_LOCATION_SERVICE_HOURS[targetDepotId] ||
    DEFAULT_LOCATION_SERVICE_HOURS['sydney'];

  // Check status using depotConfig
  const status = checkBusinessHoursStatus({
    enabled: depotConfig.enabled,
    startHour: depotConfig.startHour,
    startMinute: depotConfig.startMinute,
    endHour: depotConfig.endHour,
    endMinute: depotConfig.endMinute,
    timezone: depotConfig.timezone,
    daysOpen: depotConfig.daysOpen,
    autoReplyText: depotConfig.autoReplyText,
    forceAfterHoursForTesting: depotConfig.forceAfterHoursForTesting ?? globalConfig?.forceAfterHoursForTesting,
  });

  // Calculate formatted local time at the depot
  let localTimeFormatted = '';
  try {
    localTimeFormatted = new Intl.DateTimeFormat('en-AU', {
      timeZone: depotConfig.timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(new Date());
  } catch (err) {
    localTimeFormatted = new Date().toLocaleTimeString();
  }

  return {
    ...status,
    depotConfig,
    localTimeFormatted,
    isSpecificLocation: Boolean(locationIdOrPostcode),
  };
}

/**
 * Storage helpers for After-Hours Messages
 */
export function loadAfterHoursMessages(): AfterHoursMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AFTER_HOURS_MESSAGES);
    if (!raw) {
      // Seed with initial example messages so the admin queue is demonstrative
      const initial: AfterHoursMessage[] = [
        {
          id: 'msg-seed-1',
          createdAt: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
          customerName: 'Sarah Jenkins',
          customerMobile: '0412 345 678',
          customerEmail: 'sarah.j@example.com',
          message: 'Hi Portabox team, looking to book a 25m³ container for delivery next Tuesday in Hyde Park. Need ground-level drop-off on my driveway.',
          suburbOrPostcode: '5061 Hyde Park',
          source: 'AreYouStuckBanner',
          status: 'Pending Morning Response',
        },
        {
          id: 'msg-seed-2',
          createdAt: new Date(Date.now() - 3600 * 1000 * 10).toISOString(),
          customerName: 'Liam O’Connor',
          customerMobile: '0423 987 654',
          message: 'Can I store 2 containers on site for 6 weeks during renovation? What clearance width is required for the tilt tray truck?',
          suburbOrPostcode: '3000 Melbourne',
          source: 'AreYouStuckBanner',
          status: 'Contacted',
          notes: 'Driver phoned customer at 8:45 AM, site access confirmed OK.',
        },
      ];
      localStorage.setItem(STORAGE_KEY_AFTER_HOURS_MESSAGES, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load after hours messages:', err);
    return [];
  }
}

export function saveAfterHoursMessage(
  data: Omit<AfterHoursMessage, 'id' | 'createdAt' | 'status'>
): AfterHoursMessage {
  const existing = loadAfterHoursMessages();
  const newMsg: AfterHoursMessage = {
    id: `msg-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'Pending Morning Response',
    ...data,
  };

  const updated = [newMsg, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY_AFTER_HOURS_MESSAGES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('portabox-after-hours-message-saved', { detail: newMsg }));
  } catch (err) {
    console.error('Failed to save after hours message:', err);
  }
  return newMsg;
}

export function updateAfterHoursMessageStatus(
  id: string,
  status: AfterHoursMessage['status'],
  notes?: string
): void {
  const existing = loadAfterHoursMessages();
  const updated = existing.map((m) => {
    if (m.id === id) {
      return {
        ...m,
        status,
        notes: notes !== undefined ? notes : m.notes,
      };
    }
    return m;
  });
  try {
    localStorage.setItem(STORAGE_KEY_AFTER_HOURS_MESSAGES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('portabox-after-hours-message-saved'));
  } catch (err) {
    console.error('Failed to update after hours message:', err);
  }
}
