/**
 * Frozen quotes: what a customer chose, priced by the server, held for 30 days.
 *
 *   Quote Frozen  → prices held for `quoteValidityDays` (30) from when the quote was sent
 *   Quote Expired → after that; reopening offers a new quote at today's prices
 *   Booked        → staff began a booking within the 30 days; the frozen quote prices become
 *                   the Booking Frozen Price, held for 12 months from the booking date
 *
 * Pure (no browser APIs), shared by the server and the browser.
 */
import { AUSTRALIAN_POSTCODES, type PostcodeRecord } from '../data/australianPostcodes';
import { calculateQuote } from './pricingEngine';
import type {
  AnnualMilestoneOption,
  AppConfig,
  BillingCycle,
  ContainerSizeId,
  DeliverySlotWindow,
  LogisticsMethod,
  ProtectionPlanType,
  QuoteBreakdown,
  ServiceType,
} from '../types/quote';

export type FrozenQuoteStatus = 'frozen' | 'expired' | 'booked';

/** Sheet "FOLLOW UP - Customer Status" values for each state. */
export const QUOTE_STATUS_LABEL: Record<FrozenQuoteStatus, string> = {
  frozen: 'Quote Frozen',
  expired: 'Quote Expired',
  booked: 'Booking Frozen Price',
};

export const BOOKING_FREEZE_MONTHS = 12;

/** Everything the customer chose. Postcodes are sent as postcode + suburb and looked up again. */
export interface QuoteInputs {
  origin: { postcode: string; suburb: string };
  destination?: { postcode: string; suburb: string };
  serviceType: ServiceType;
  storagePlacement?: 'my_place' | 'facility';
  containerSize: ContainerSizeId;
  containerCount: number;
  containerSelections: Record<ContainerSizeId, number>;
  billingCycle: BillingCycle;
  storageDuration: string;
  storageDurationMonths?: number;
  preferredDate: string;
  selectedSlot?: DeliverySlotWindow;
  boxesCount?: number;
  blanketsCount?: number;
  locksCount?: number;
  protectionPlan?: ProtectionPlanType;
  originLogisticsMethod?: LogisticsMethod;
  destinationLogisticsMethod?: LogisticsMethod;
  annualDiscountOption?: AnnualMilestoneOption;
  appliedPromoCode?: string;
}

const SERVICE_TYPES: ServiceType[] = ['storage_at_place', 'storage_facility', 'moving', 'moving_storage'];
const SIZES: ContainerSizeId[] = ['small_10m3', 'medium_19m3', 'large_25m3', 'two_large_50m3'];
const CYCLES: BillingCycle[] = ['weekly', 'monthly', '3_months_upfront', '6_months_upfront', '12_months_upfront'];
const PLANS: ProtectionPlanType[] = ['cpo', 'coo', 'cpo_coo', 'none'];
const METHODS: LogisticsMethod[] = ['home_delivery', 'depot_loading'];

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  allowed.includes(v as T) ? (v as T) : undefined;
const count = (v: unknown, max: number): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};
const text = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

export function findPostcode(p: unknown): PostcodeRecord | undefined {
  const pc = text((p as any)?.postcode, 4);
  const suburb = text((p as any)?.suburb, 80)?.toLowerCase();
  if (!pc) return undefined;
  const matches = AUSTRALIAN_POSTCODES.filter((r) => r.postcode === pc);
  return matches.find((r) => r.suburb.toLowerCase() === suburb) || matches[0];
}

/** Takes the browser's choices and keeps only valid values. Returns null if the quote can't be priced. */
export function cleanQuoteInputs(raw: any): QuoteInputs | null {
  if (!raw || typeof raw !== 'object') return null;
  const origin = findPostcode(raw.origin);
  const serviceType = oneOf(raw.serviceType, SERVICE_TYPES);
  const containerSize = oneOf(raw.containerSize, SIZES);
  if (!origin || !serviceType || !containerSize) return null;
  const destination = raw.destination ? findPostcode(raw.destination) : undefined;
  const selections = {} as Record<ContainerSizeId, number>;
  for (const s of SIZES) selections[s] = count(raw.containerSelections?.[s], 5);
  const slot = raw.selectedSlot && typeof raw.selectedSlot === 'object'
    ? {
        id: text(raw.selectedSlot.id, 40) || 'standard',
        label: text(raw.selectedSlot.label, 80) || 'Standard window',
        timeRange: text(raw.selectedSlot.timeRange, 80) || '',
        startHour: count(raw.selectedSlot.startHour, 23),
        startMinute: count(raw.selectedSlot.startMinute, 59),
        endHour: count(raw.selectedSlot.endHour, 23),
        endMinute: count(raw.selectedSlot.endMinute, 59),
        available: true,
        slotsRemaining: count(raw.selectedSlot.slotsRemaining, 99),
      }
    : undefined;
  const months = Number(raw.storageDurationMonths);
  return {
    origin: { postcode: origin.postcode, suburb: origin.suburb },
    destination: destination ? { postcode: destination.postcode, suburb: destination.suburb } : undefined,
    serviceType,
    storagePlacement: raw.storagePlacement === 'my_place' ? 'my_place' : raw.storagePlacement === 'facility' ? 'facility' : undefined,
    containerSize,
    containerCount: Math.max(1, count(raw.containerCount, 20)),
    containerSelections: selections,
    billingCycle: oneOf(raw.billingCycle, CYCLES) || 'monthly',
    storageDuration: text(raw.storageDuration, 40) || '1_to_3_months',
    storageDurationMonths: Number.isFinite(months) && months > 0 ? Math.min(60, months) : undefined,
    preferredDate: text(raw.preferredDate, 40) || new Date().toISOString().slice(0, 10),
    selectedSlot: slot,
    boxesCount: count(raw.boxesCount, 500),
    blanketsCount: count(raw.blanketsCount, 500),
    locksCount: count(raw.locksCount, 50),
    protectionPlan: oneOf(raw.protectionPlan, PLANS),
    originLogisticsMethod: oneOf(raw.originLogisticsMethod, METHODS),
    destinationLogisticsMethod: oneOf(raw.destinationLogisticsMethod, METHODS),
    annualDiscountOption: raw.annualDiscountOption === '400A' ? '400A' : '400B',
    appliedPromoCode: text(raw.appliedPromoCode, 40),
  };
}

/** Prices the customer's choices with the given pricing. */
export function priceQuoteInputs(inputs: QuoteInputs, config: AppConfig): QuoteBreakdown {
  const originPostcode = findPostcode(inputs.origin);
  if (!originPostcode) throw new Error('Unknown postcode');
  return calculateQuote({
    originPostcode,
    destinationPostcode: inputs.destination ? findPostcode(inputs.destination) : undefined,
    serviceType: inputs.serviceType,
    storagePlacement: inputs.storagePlacement,
    containerSize: inputs.containerSize,
    containerCount: inputs.containerCount,
    containerSelections: inputs.containerSelections,
    billingCycle: inputs.billingCycle,
    storageDuration: inputs.storageDuration,
    storageDurationMonths: inputs.storageDurationMonths,
    preferredDate: inputs.preferredDate,
    selectedSlot: inputs.selectedSlot,
    boxesCount: inputs.boxesCount,
    blanketsCount: inputs.blanketsCount,
    locksCount: inputs.locksCount,
    insuranceSelected: inputs.protectionPlan !== 'none',
    protectionPlan: inputs.protectionPlan,
    originLogisticsMethod: inputs.originLogisticsMethod,
    destinationLogisticsMethod: inputs.destinationLogisticsMethod,
    annualDiscountOption: inputs.annualDiscountOption,
    appliedPromoCode: inputs.appliedPromoCode,
    config,
  });
}

/** The browser's choices, in the shape the server expects. */
export function quoteInputsFrom(params: {
  originPostcode: PostcodeRecord;
  destinationPostcode?: PostcodeRecord | null;
} & Omit<QuoteInputs, 'origin' | 'destination'>): QuoteInputs {
  const { originPostcode, destinationPostcode, ...rest } = params;
  return {
    ...rest,
    origin: { postcode: originPostcode.postcode, suburb: originPostcode.suburb },
    destination: destinationPostcode ? { postcode: destinationPostcode.postcode, suburb: destinationPostcode.suburb } : undefined,
  };
}

/** The money figures a customer sees; used to tell whether two pricings of a quote agree. */
export function quoteTotals(q: QuoteBreakdown) {
  return {
    monthlyStorageFee: Math.round(q.monthlyStorageFee || 0),
    currentPeriodicStorageFee: Math.round(q.currentPeriodicStorageFee || 0),
    firstPaymentTotal: Math.round(q.firstPaymentTotal || 0),
  };
}

export function sameTotals(a: ReturnType<typeof quoteTotals>, b: ReturnType<typeof quoteTotals>): boolean {
  return (
    a.monthlyStorageFee === b.monthlyStorageFee &&
    a.currentPeriodicStorageFee === b.currentPeriodicStorageFee &&
    a.firstPaymentTotal === b.firstPaymentTotal
  );
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** The status a quote has right now: a frozen quote past its 30 days is expired. */
export function currentStatus(status: FrozenQuoteStatus, expiresAt: string | undefined, now = new Date()): FrozenQuoteStatus {
  if (status === 'frozen' && expiresAt && new Date(expiresAt).getTime() <= now.getTime()) return 'expired';
  return status;
}

/** Lower-cased email, or an Australian mobile as 04xxxxxxxx. */
export function normalizeContact(v: unknown): string {
  const s = String(v || '').trim().toLowerCase();
  if (s.includes('@')) return s;
  let digits = s.replace(/\D/g, '');
  if (digits.startsWith('61')) digits = '0' + digits.slice(2);
  return digits;
}

/** The choices a priced quote was made from (every input calculateQuote keeps on the quote). */
export function quoteInputsFromQuote(q: QuoteBreakdown): QuoteInputs {
  return quoteInputsFrom({
    originPostcode: q.originPostcode,
    destinationPostcode: q.destinationPostcode,
    serviceType: q.serviceType,
    storagePlacement: q.storagePlacement,
    containerSize: q.containerSize,
    containerCount: q.containerCount,
    // No per-size picks: the server then uses containerSize + containerCount, as the quote did
    containerSelections: q.containerSelections || ({} as Record<ContainerSizeId, number>),
    billingCycle: q.billingCycle,
    storageDuration: q.storageDuration,
    storageDurationMonths: q.storageDurationMonths,
    preferredDate: q.preferredDate,
    selectedSlot: q.selectedSlot,
    boxesCount: q.packingSupplies?.boxesCount,
    blanketsCount: q.packingSupplies?.blanketsCount,
    locksCount: q.packingSupplies?.locksCount,
    protectionPlan: q.protectionPlan,
    originLogisticsMethod: q.originLogisticsMethod,
    destinationLogisticsMethod: q.destinationLogisticsMethod,
    annualDiscountOption: q.annualDiscountOption,
    appliedPromoCode: q.appliedPromoCode,
  });
}
