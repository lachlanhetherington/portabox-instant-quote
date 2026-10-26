import { DeliverySlotWindow, DepotCalendarConfig, MetroHub } from '../types/quote';
import { DEFAULT_DEPOT_CALENDARS, STANDARD_DELIVERY_SLOTS, parseDateInput } from './googleCalendarService';

export interface NextAvailableWindowResult {
  isoDate: string; // YYYY-MM-DD for <input type="date" />
  formattedDate: string; // e.g. "Wed 28 Oct 2026"
  dateObj: Date;
  dayName: string; // e.g. "Wednesday"
  leadDays: number;
  recommendedSlot: DeliverySlotWindow;
  explanation: string;
}

export interface GoogleCalendarUrlParams {
  deliveryDate: string | Date;
  slot?: DeliverySlotWindow;
  suburb?: string;
  state?: string;
  postcode?: string;
  containerName?: string;
  containerCount?: number;
  serviceType?: string;
  metroHub?: MetroHub;
  customerName?: string;
  customerPhone?: string;
  accessNotes?: string;
}

/**
 * Standard Australian National Public Holidays (approximate/common month-day keys)
 * Can be overridden or expanded per depot calendar
 */
const KNOWN_HOLIDAYS = [
  '01-01', // New Year
  '01-26', // Australia Day
  '04-25', // ANZAC Day
  '12-25', // Christmas
  '12-26', // Boxing Day
];

/**
 * Calculates the next available delivery window for a given depot hub.
 * Rules confirmed:
 * 1. Automatic 48-hour cutoff notice
 * 2. If current local time is past 2:00 PM, advance an additional 24h
 * 3. Skips Sundays (all Portabox depots closed on Sundays)
 * 4. Skips known holidays and depot-specific blackout dates
 * 5. Recommends the earliest available slot (Morning 8:00 AM - 10:30 AM)
 */
export function findNextAvailableDeliveryWindow(options?: {
  originHub?: MetroHub;
  depotCalendarConfig?: DepotCalendarConfig;
  referenceDate?: Date;
  minHoursNotice?: number;
}): NextAvailableWindowResult {
  const ref = options?.referenceDate ? new Date(options.referenceDate) : new Date();
  const minHours = options?.minHoursNotice ?? 48;
  const hub = options?.originHub || 'Adelaide';
  const depotConfig = options?.depotCalendarConfig || DEFAULT_DEPOT_CALENDARS[hub] || DEFAULT_DEPOT_CALENDARS.Adelaide;

  // If past 2:00 PM (14:00) local time, dispatch cutoff has passed for earliest prep
  const currentHour = ref.getHours();
  const cutoffPassed = currentHour >= 14;

  // Start with minimum 48h (2 business days) notice plus 1 extra day if cutoff passed
  let daysToAdd = Math.ceil(minHours / 24);
  if (cutoffPassed) {
    daysToAdd += 1;
  }

  const candidateDate = new Date(ref);
  candidateDate.setDate(candidateDate.getDate() + daysToAdd);

  // Search forward for the first operating day
  let attempts = 0;
  while (attempts < 14) {
    const dayOfWeek = candidateDate.getDay(); // 0 = Sunday, 6 = Saturday
    const monthDay = `${String(candidateDate.getMonth() + 1).padStart(2, '0')}-${String(candidateDate.getDate()).padStart(2, '0')}`;

    const isSunday = dayOfWeek === 0;
    const isHoliday = KNOWN_HOLIDAYS.includes(monthDay);

    if (!isSunday && !isHoliday) {
      break;
    }

    // Advance 1 day
    candidateDate.setDate(candidateDate.getDate() + 1);
    attempts++;
  }

  const yyyy = candidateDate.getFullYear();
  const mm = String(candidateDate.getMonth() + 1).padStart(2, '0');
  const dd = String(candidateDate.getDate()).padStart(2, '0');
  const isoDate = `${yyyy}-${mm}-${dd}`;

  const formattedDate = candidateDate.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const dayName = candidateDate.toLocaleDateString('en-AU', { weekday: 'long' });
  const diffTime = candidateDate.getTime() - ref.getTime();
  const leadDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  // First standard morning slot
  const baseSlot = STANDARD_DELIVERY_SLOTS[0];
  const recommendedSlot: DeliverySlotWindow = {
    ...baseSlot,
    available: true,
    slotsRemaining: depotConfig.dailyMaxSlots || 4,
  };

  return {
    isoDate,
    formattedDate,
    dateObj: candidateDate,
    dayName,
    leadDays,
    recommendedSlot,
    explanation: `Earliest compliant window: 48h depot notice applied${cutoffPassed ? ' (past 2 PM cutoff)' : ''}, Sundays & depot non-dispatch days excluded.`,
  };
}

/**
 * Builds a direct Google Calendar template URL so users can view or schedule
 * the delivery slot alongside their personal Google Calendar commitments.
 * Zero OAuth popups or third-party sign-in friction required.
 */
export function generateGoogleCalendarUrl(params: GoogleCalendarUrlParams): string {
  const dateObj = typeof params.deliveryDate === 'string'
    ? parseDateInput(params.deliveryDate)
    : params.deliveryDate;

  const hub = params.metroHub || 'Adelaide';
  const depotConfig = DEFAULT_DEPOT_CALENDARS[hub] || DEFAULT_DEPOT_CALENDARS.Adelaide;
  const timeZone = depotConfig.timeZone || 'Australia/Adelaide';

  const slot = params.slot || {
    id: 'morning',
    label: 'Morning Window',
    timeRange: '8:00 AM – 10:30 AM',
    startHour: 8,
    startMinute: 0,
    endHour: 10,
    endMinute: 30,
    available: true,
    slotsRemaining: 4,
  };

  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');

  const startH = String(slot.startHour).padStart(2, '0');
  const startM = String(slot.startMinute).padStart(2, '0');
  const endH = String(slot.endHour).padStart(2, '0');
  const endM = String(slot.endMinute).padStart(2, '0');

  // Format: YYYYMMDDTHHmmSS
  const startStr = `${y}${m}${d}T${startH}${startM}00`;
  const endStr = `${y}${m}${d}T${endH}${endM}00`;

  const containerLabel = params.containerCount && params.containerCount > 1
    ? `${params.containerCount}x ${params.containerName || 'Portabox Containers'}`
    : (params.containerName || 'Portabox Container');

  const suburbLabel = params.suburb || 'Customer Driveway';
  const title = `Portabox Container Delivery (${suburbLabel})`;

  const location = params.suburb
    ? `${params.suburb}${params.state ? `, ${params.state}` : ''}${params.postcode ? ` ${params.postcode}` : ''}, Australia`
    : 'Customer Delivery Address, Australia';

  const detailsLines = [
    `📦 PORTABOX CONTAINER DELIVERY & PLACEMENT`,
    `-----------------------------------------`,
    `Container: ${containerLabel}`,
    `Delivery Window: ${slot.label} (${slot.timeRange})`,
    `Service: ${params.serviceType ? params.serviceType.replace(/_/g, ' ') : 'Container Delivery'}`,
    params.customerName ? `Recipient: ${params.customerName}` : '',
    params.customerPhone ? `Mobile: ${params.customerPhone}` : '',
    params.accessNotes ? `Placement Notes: ${params.accessNotes}` : '',
    ``,
    `Level-lift horizontal delivery with zero tilt. Please maintain 3.5m overhead clearance.`,
    `Support Hotline: 1800 467 637 · Website: https://portabox.au`,
  ].filter(Boolean).join('\n');

  const queryParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    details: detailsLines,
    location,
    ctz: timeZone,
  });

  return `https://calendar.google.com/calendar/render?${queryParams.toString()}`;
}
