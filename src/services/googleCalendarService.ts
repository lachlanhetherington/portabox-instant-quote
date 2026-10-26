import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DeliverySlotWindow, DepotCalendarConfig, MetroHub } from '../types/quote';

// 1. Initialize Firebase App (safe reuse)
// Firebase is only touched when a real config is present. initializeApp
// throws auth/invalid-api-key on an empty key, and because this runs at
// module scope the throw lands before React mounts — a blank page. The
// three call sites below treat a null auth as "signed out", which is what
// sends DeliverySlotPicker to the static windows.
const hasFirebaseConfig = Boolean(firebaseConfig?.apiKey && firebaseConfig?.projectId);
const app = hasFirebaseConfig
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;
export const auth = app ? getAuth(app) : null;
export const isCalendarConfigured = hasFirebaseConfig;

// 2. Configure Google Auth Provider with Google Calendar Scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// In-memory token storage (MANDATORY per skill: never store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// 3. Depot Calendar Configuration for each Portabox location
export const DEFAULT_DEPOT_CALENDARS: Record<MetroHub, DepotCalendarConfig> = {
  Adelaide: {
    depotId: 'adelaide',
    depotName: 'Portabox Adelaide Depot',
    calendarId: 'primary',
    timeZone: 'Australia/Adelaide',
    dailyMaxSlots: 4,
  },
  Melbourne: {
    depotId: 'melbourne',
    depotName: 'Portabox Melbourne Depot',
    calendarId: 'primary',
    timeZone: 'Australia/Melbourne',
    dailyMaxSlots: 6,
  },
  Sydney: {
    depotId: 'sydney',
    depotName: 'Portabox Sydney Depot',
    calendarId: 'primary',
    timeZone: 'Australia/Sydney',
    dailyMaxSlots: 6,
  },
  Brisbane: {
    depotId: 'brisbane',
    depotName: 'Portabox Brisbane Depot',
    calendarId: 'primary',
    timeZone: 'Australia/Brisbane',
    dailyMaxSlots: 4,
  },
};

// Standard 2.5-hour Portabox Delivery Slot Windows
export const STANDARD_DELIVERY_SLOTS: Omit<DeliverySlotWindow, 'available' | 'slotsRemaining'>[] = [
  {
    id: 'morning',
    label: 'Morning Window',
    timeRange: '8:00 AM – 10:30 AM',
    startHour: 8,
    startMinute: 0,
    endHour: 10,
    endMinute: 30,
  },
  {
    id: 'midday',
    label: 'Midday Window',
    timeRange: '11:00 AM – 1:30 PM',
    startHour: 11,
    startMinute: 0,
    endHour: 13,
    endMinute: 30,
  },
  {
    id: 'afternoon',
    label: 'Afternoon Window',
    timeRange: '2:00 PM – 4:30 PM',
    startHour: 14,
    startMinute: 0,
    endHour: 16,
    endMinute: 30,
  },
];

/**
 * Initialize Auth state listener
 */
export const initCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google to grant Calendar access
 */
export const signInWithGoogleCalendar = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    if (!auth) {
      throw new Error(
        'Google Calendar is not configured. Fill in firebase-applet-config.json to enable it.'
      );
    }
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No access token returned from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Calendar sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCalendarAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const signOutCalendar = async () => {
  if (auth) await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Parse human date string like "Wed 14 Oct 2026" or YYYY-MM-DD into a Date object
 */
export function parseDateInput(dateStr: string): Date {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;

  // Fallback for custom formats:
  const parts = dateStr.split(' ');
  if (parts.length >= 4) {
    // "Wed 14 Oct 2026" -> day=14, month=Oct, year=2026
    const cleanStr = `${parts[2]} ${parts[1]}, ${parts[3]}`;
    const p2 = new Date(cleanStr);
    if (!isNaN(p2.getTime())) return p2;
  }

  // Default to 3 days ahead
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d;
}

/**
 * Get available delivery slot windows for a depot on a given date.
 * If signed into Google Calendar, checks FreeBusy availability on the calendar.
 */
export async function getDepotDeliverySlots(
  metroHub: MetroHub,
  dateStr: string,
  calendarConfig?: DepotCalendarConfig
): Promise<DeliverySlotWindow[]> {
  const targetDepot = calendarConfig || DEFAULT_DEPOT_CALENDARS[metroHub] || DEFAULT_DEPOT_CALENDARS.Adelaide;
  const dateObj = parseDateInput(dateStr);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  // If user is authenticated with Google Calendar, query freebusy
  if (cachedAccessToken) {
    try {
      const timeMin = new Date(year, month, day, 7, 0, 0).toISOString();
      const timeMax = new Date(year, month, day, 18, 0, 0).toISOString();

      const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeMin,
          timeMax,
          timeZone: targetDepot.timeZone,
          items: [{ id: targetDepot.calendarId || 'primary' }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const busyRanges: { start: string; end: string }[] =
          data.calendars?.[targetDepot.calendarId || 'primary']?.busy || [];

        return STANDARD_DELIVERY_SLOTS.map((slot) => {
          const slotStart = new Date(year, month, day, slot.startHour, slot.startMinute).getTime();
          const slotEnd = new Date(year, month, day, slot.endHour, slot.endMinute).getTime();

          // Check if any busy event overlaps this slot window
          const isOverlapping = busyRanges.some((b) => {
            const bStart = new Date(b.start).getTime();
            const bEnd = new Date(b.end).getTime();
            return (slotStart < bEnd && slotEnd > bStart);
          });

          return {
            ...slot,
            available: !isOverlapping,
            slotsRemaining: isOverlapping ? 0 : 2,
          };
        });
      }
    } catch (err) {
      console.warn('Google Calendar freeBusy query fallback:', err);
    }
  }

  // Standalone mode: provide realistic dispatch slots for the depot
  const dayOfWeek = dateObj.getDay();
  // Sunday: limited service
  if (dayOfWeek === 0) {
    return STANDARD_DELIVERY_SLOTS.map((slot, idx) => ({
      ...slot,
      available: idx === 0,
      slotsRemaining: idx === 0 ? 1 : 0,
    }));
  }

  return STANDARD_DELIVERY_SLOTS.map((slot, idx) => {
    // Deterministic realistic slot availability based on day
    const isBooked = (day + idx) % 4 === 0;
    return {
      ...slot,
      available: !isBooked,
      slotsRemaining: isBooked ? 0 : (idx === 1 ? 1 : 2),
    };
  });
}

/**
 * Schedule container delivery booking on Google Calendar
 */
export async function scheduleDeliveryOnGoogleCalendar(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryDateStr: string;
  slot: DeliverySlotWindow;
  metroHub: MetroHub;
  suburb: string;
  state: string;
  postcode: string;
  containerName: string;
  containerCount: number;
  serviceType: string;
  storageDuration: string;
  firstPaymentTotal: number;
  calendarConfig?: DepotCalendarConfig;
}): Promise<{ success: boolean; eventId?: string; eventLink?: string; error?: string }> {
  if (!cachedAccessToken) {
    return {
      success: false,
      error: 'Google Calendar is not connected. Please sign in with Google.',
    };
  }

  const targetDepot = params.calendarConfig || DEFAULT_DEPOT_CALENDARS[params.metroHub] || DEFAULT_DEPOT_CALENDARS.Adelaide;
  const dateObj = parseDateInput(params.deliveryDateStr);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  // Create start and end date objects
  const startDateTime = new Date(year, month, day, params.slot.startHour, params.slot.startMinute);
  const endDateTime = new Date(year, month, day, params.slot.endHour, params.slot.endMinute);

  const eventPayload = {
    summary: `Portabox Delivery - ${params.containerCount > 1 ? `${params.containerCount}x ` : ''}${params.containerName} (${params.suburb})`,
    location: `${params.suburb}, ${params.state} ${params.postcode}, Australia`,
    description: [
      `📦 PORTABOX CONTAINER DELIVERY & DISPATCH`,
      `-----------------------------------------`,
      `Customer: ${params.customerName}`,
      `Mobile: ${params.customerPhone}`,
      `Email: ${params.customerEmail}`,
      ``,
      `Order Details:`,
      `• Container: ${params.containerCount} x ${params.containerName}`,
      `• Service: ${params.serviceType.replace(/_/g, ' ')}`,
      `• Duration: ${params.storageDuration.replace(/_/g, ' ')}`,
      `• Initial Payment: $${params.firstPaymentTotal} (GST incl)`,
      `• Delivery Window: ${params.slot.label} (${params.slot.timeRange})`,
      `• Depot: ${targetDepot.depotName} (${params.metroHub})`,
      ``,
      `Delivery Notes:`,
      `Driver will text 30 mins prior to arrival at ${params.suburb}. Ground-level walk-in placement.`,
    ].join('\n'),
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: targetDepot.timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: targetDepot.timeZone,
    },
    attendees: [
      { email: params.customerEmail, displayName: params.customerName },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24 hours before
        { method: 'popup', minutes: 120 },     // 2 hours before
      ],
    },
  };

  try {
    const calendarTarget = targetDepot.calendarId && targetDepot.calendarId !== 'primary'
      ? encodeURIComponent(targetDepot.calendarId)
      : 'primary';

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarTarget}/events?sendUpdates=all`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      console.error('Google Calendar event insert failed:', errData);
      return {
        success: false,
        error: errData.error?.message || 'Failed to create calendar event',
      };
    }

    const createdEvent = await response.json();
    return {
      success: true,
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink,
    };
  } catch (err: any) {
    console.error('Error scheduling calendar event:', err);
    return {
      success: false,
      error: err.message || 'Network error communicating with Google Calendar',
    };
  }
}
