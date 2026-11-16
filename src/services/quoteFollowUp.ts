/**
 * Dan (16 Nov, "Quote Inquiries & Leads"): All Quotes is the only quote list in admin, with the
 * follow-up status buttons and notes on each quote. They are saved on the server with the quote,
 * so every staff member sees the same thing (the old list kept them in each browser).
 */

export const FOLLOW_UP_STATUSES = ['New', 'Contacted', 'Booked', 'Follow-up'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export interface FollowUpNote {
  at: string;
  by: string;
  text: string;
}

export interface FollowUpFields {
  followUpStatus?: FollowUpStatus;
  followUpNotes?: FollowUpNote[];
  followUpUpdatedAt?: string;
  followUpUpdatedBy?: string;
}

export const MAX_NOTE_LENGTH = 1000;
export const MAX_NOTES = 100;

export const isFollowUpStatus = (v: unknown): v is FollowUpStatus =>
  typeof v === 'string' && (FOLLOW_UP_STATUSES as readonly string[]).includes(v);

/** A staff update from the request body: a new status and/or a note. Null when there is nothing valid to save. */
export function cleanFollowUpUpdate(body: any): { status?: FollowUpStatus; note?: string } | null {
  const status = isFollowUpStatus(body?.status) ? body.status : undefined;
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, MAX_NOTE_LENGTH) : '';
  if (!status && !note) return null;
  return { status, note: note || undefined };
}

/** The fields to save for an update. Notes are kept newest last, up to MAX_NOTES. */
export function applyFollowUp(
  current: FollowUpFields,
  update: { status?: FollowUpStatus; note?: string },
  by: string,
  now: string
): FollowUpFields {
  const notes = [...(current.followUpNotes || [])];
  if (update.note) notes.push({ at: now, by, text: update.note });
  return {
    followUpStatus: update.status || current.followUpStatus || 'New',
    followUpNotes: notes.slice(-MAX_NOTES),
    followUpUpdatedAt: now,
    followUpUpdatedBy: by,
  };
}

/** Adds a lead, replacing any earlier lead for the same quote number (a resend), newest first. */
export function upsertLeadByQuoteNumber<T extends { quoteNumber?: string }>(leads: T[], lead: T): T[] {
  const rest = lead.quoteNumber ? leads.filter((l) => l.quoteNumber !== lead.quoteNumber) : leads;
  return [lead, ...rest];
}
