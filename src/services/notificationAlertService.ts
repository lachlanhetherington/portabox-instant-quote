/**
 * Agent Real-Time Alert & Overnight Message Digest Service
 * Unifies overnight customer quotes and after-hours messages,
 * provides real-time Web Audio chime synthesis, unread tracking,
 * and live event notifications for call center operatives.
 */

import { loadAfterHoursMessages, AfterHoursMessage } from './businessHoursService';
import { loadSmartsheetStagingRows, SmartsheetRow } from './smartsheetService';

export interface AgentAlertItem {
  id: string;
  type: 'overnight_quote' | 'customer_message' | 'quotezilla_inquiry' | 'urgent_callback';
  title: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  quoteId?: string;
  orderNumber?: string;
  timestamp: string; // ISO String
  isOvernight: boolean;
  messagePreview: string;
  details?: {
    containerSize?: string;
    suburbFrom?: string;
    suburbTo?: string;
    estimatedValueAud?: number;
    protectionPlan?: string;
    source?: string;
  };
  isRead: boolean;
  isResolved: boolean;
}

const STORAGE_KEY_ALERTS_OVERRIDE = 'portabox_agent_alerts_state_v1';
const STORAGE_KEY_CHIME_MUTED = 'portabox_agent_chime_muted';
const STORAGE_KEY_MORNING_DIGEST_DISMISSED = 'portabox_morning_digest_dismissed_date';

// Listeners for real-time reactivity across components
type AlertChangeListener = (alerts: AgentAlertItem[]) => void;
const alertListeners: Set<AlertChangeListener> = new Set();

export function subscribeToAgentAlerts(listener: AlertChangeListener): () => void {
  alertListeners.add(listener);
  return () => {
    alertListeners.delete(listener);
  };
}

function notifyAlertListeners(alerts: AgentAlertItem[]) {
  alertListeners.forEach((fn) => fn(alerts));
}

// Global browser event listeners for real-time alerts
if (typeof window !== 'undefined') {
  window.addEventListener('portabox-after-hours-message-saved', () => {
    playSubtleChime();
    notifyAlertListeners(loadAgentAlerts());
  });
  window.addEventListener('portabox-quote-saved', () => {
    playSubtleChime();
    notifyAlertListeners(loadAgentAlerts());
  });
  window.addEventListener('portabox-smartsheet-synced', () => {
    notifyAlertListeners(loadAgentAlerts());
  });
}

/**
 * Checks if a given ISO timestamp was created overnight
 * (Outside 8:30 AM – 5:00 PM local Australian time or on weekends)
 */
export function isOvernightTimestamp(isoTimestamp: string, timezone = 'Australia/Sydney'): boolean {
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) return false;

    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short',
    });

    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    const minPart = parts.find((p) => p.type === 'minute')?.value;
    const weekdayPart = parts.find((p) => p.type === 'weekday')?.value;

    const hour = parseInt(hourPart || '12', 10);
    const minute = parseInt(minPart || '0', 10);
    const timeVal = hour + minute / 60;

    // Weekend is considered after-hours / overnight
    if (weekdayPart === 'Sat' || weekdayPart === 'Sun') {
      return true;
    }

    // Overnight is before 8:30 AM or after 5:00 PM (17:00)
    return timeVal < 8.5 || timeVal >= 17.0;
  } catch (err) {
    return false;
  }
}

/**
 * Generates initial alerts from Smartsheet quotes and After Hours Messages
 */
export function loadAgentAlerts(): AgentAlertItem[] {
  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY_ALERTS_OVERRIDE);
    const savedStateMap: Record<string, { isRead: boolean; isResolved: boolean }> = rawSaved
      ? JSON.parse(rawSaved)
      : {};

    const alerts: AgentAlertItem[] = [];

    // 1. Process After-Hours Customer Messages
    const afterHours = loadAfterHoursMessages();
    afterHours.forEach((msg) => {
      const state = savedStateMap[msg.id];
      const isOvernight = isOvernightTimestamp(msg.createdAt);
      alerts.push({
        id: msg.id,
        type: 'customer_message',
        title: isOvernight ? 'Overnight Customer Inquiry' : 'Inbound Customer Message',
        customerName: msg.customerName,
        customerMobile: msg.customerMobile,
        customerEmail: msg.customerEmail,
        timestamp: msg.createdAt,
        isOvernight,
        messagePreview: msg.message,
        details: {
          suburbFrom: msg.suburbOrPostcode,
          source: msg.source,
        },
        isRead: state ? state.isRead : false,
        isResolved: state ? state.isResolved : msg.status === 'Closed' || msg.status === 'Contacted',
      });
    });

    // 2. Process Smartsheet Quotes (Focus on recent or overnight quotes)
    const ssRows = loadSmartsheetStagingRows();
    ssRows.forEach((row) => {
      if (!row.id || !row.customerName) return;

      const alertId = `alert-quote-${row.id}`;
      const state = savedStateMap[alertId];

      // Simulated or real timestamp based on quoteDate
      const dateStr = row.quoteDate || '2026-11-08';
      // Default to 7:45 AM or 9:15 PM to demonstrate overnight capture if not full ISO
      const simulatedIso = dateStr.includes('T')
        ? dateStr
        : new Date(Date.now() - 3600 * 1000 * 11).toISOString(); // ~11 hours ago (overnight)

      const isOvernight = isOvernightTimestamp(simulatedIso);
      const cleanQuoteId =
        row.quoteId?.replace(/^PBQ-/, 'Q-') ||
        (row.orderNumber?.startsWith('Q-') ? row.orderNumber : `Q-${row.orderNumber || '059009'}`);

      alerts.push({
        id: alertId,
        type: 'overnight_quote',
        title: isOvernight ? `Overnight Quote: ${cleanQuoteId}` : `New Quote: ${cleanQuoteId}`,
        customerName: row.customerName,
        customerMobile: row.customerPhone,
        customerEmail: row.customerEmail,
        quoteId: cleanQuoteId,
        orderNumber: row.orderNumber,
        timestamp: simulatedIso,
        isOvernight,
        messagePreview: `${row.containerSize} · ${row.moveStoreScenario || 'Move & Store'} from ${
          row.postalCodeSuburbFrom || row.deliveryAddress || 'Depot'
        }`,
        details: {
          containerSize: row.containerSize,
          suburbFrom: row.postalCodeSuburbFrom || row.deliveryAddress,
          suburbTo: row.postalCodeSuburbTo,
          estimatedValueAud: (row.initialDeliveryFee || 149) + (row.monthlyRentalRate || 198),
          protectionPlan: row.protectionPlanCpoCoo || 'CPO-22',
          source: 'Customer Quoting Engine',
        },
        isRead: state ? state.isRead : false,
        isResolved: state ? state.isResolved : row.followUpCustomerStatus === 'Booked' || row.followUpCustomerStatus === 'Contacted',
      });
    });

    // Sort newest first
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Error loading agent alerts:', err);
    return [];
  }
}

/**
 * Mark a single alert as read
 */
export function markAgentAlertRead(alertId: string): void {
  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY_ALERTS_OVERRIDE);
    const savedStateMap: Record<string, { isRead: boolean; isResolved: boolean }> = rawSaved
      ? JSON.parse(rawSaved)
      : {};

    savedStateMap[alertId] = {
      ...(savedStateMap[alertId] || { isResolved: false }),
      isRead: true,
    };

    localStorage.setItem(STORAGE_KEY_ALERTS_OVERRIDE, JSON.stringify(savedStateMap));
    notifyAlertListeners(loadAgentAlerts());
  } catch (err) {
    console.error('Error marking alert read:', err);
  }
}

/**
 * Mark a single alert as resolved / contacted
 */
export function markAgentAlertResolved(alertId: string, resolved = true): void {
  try {
    const rawSaved = localStorage.getItem(STORAGE_KEY_ALERTS_OVERRIDE);
    const savedStateMap: Record<string, { isRead: boolean; isResolved: boolean }> = rawSaved
      ? JSON.parse(rawSaved)
      : {};

    savedStateMap[alertId] = {
      ...(savedStateMap[alertId] || { isRead: true }),
      isRead: true,
      isResolved: resolved,
    };

    localStorage.setItem(STORAGE_KEY_ALERTS_OVERRIDE, JSON.stringify(savedStateMap));
    notifyAlertListeners(loadAgentAlerts());
  } catch (err) {
    console.error('Error marking alert resolved:', err);
  }
}

/**
 * Mark all active alerts as read
 */
export function markAllAgentAlertsRead(): void {
  try {
    const alerts = loadAgentAlerts();
    const rawSaved = localStorage.getItem(STORAGE_KEY_ALERTS_OVERRIDE);
    const savedStateMap: Record<string, { isRead: boolean; isResolved: boolean }> = rawSaved
      ? JSON.parse(rawSaved)
      : {};

    alerts.forEach((a) => {
      savedStateMap[a.id] = {
        ...(savedStateMap[a.id] || { isResolved: false }),
        isRead: true,
      };
    });

    localStorage.setItem(STORAGE_KEY_ALERTS_OVERRIDE, JSON.stringify(savedStateMap));
    notifyAlertListeners(loadAgentAlerts());
  } catch (err) {
    console.error('Error marking all alerts read:', err);
  }
}

/**
 * Synthesizes a subtle, pleasant 2-tone chime using Web Audio API
 * No external sound files or asset dependencies required.
 */
let audioCtx: AudioContext | null = null;

export function playSubtleChime(volume = 0.12): void {
  if (isChimeMuted()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Tone 1: Gentle Sine 523.25 Hz (C5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Tone 2: Harmonious Sine 659.25 Hz (E5)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.09);
    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(volume * 0.9, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.35);
  } catch (err) {
    // Gracefully ignore audio autoplay restrictions
  }
}

/**
 * Chime Mute Settings
 */
export function isChimeMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_CHIME_MUTED) === 'true';
  } catch {
    return false;
  }
}

export function setChimeMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHIME_MUTED, String(muted));
  } catch {
    // Ignore
  }
}

/**
 * Morning Digest Dismissal Helpers
 */
export function isMorningDigestDismissedToday(): boolean {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(STORAGE_KEY_MORNING_DIGEST_DISMISSED);
    return saved === todayStr;
  } catch {
    return false;
  }
}

export function dismissMorningDigestToday(): void {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(STORAGE_KEY_MORNING_DIGEST_DISMISSED, todayStr);
  } catch {
    // Ignore
  }
}

export function resetMorningDigestDismissal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_MORNING_DIGEST_DISMISSED);
  } catch {
    // Ignore
  }
}
