import { MetroHub, QuoteBreakdown, QuoteLegBreakdown } from '../types/quote';
import { getMetroHubForPostcode } from './pricingEngine';

/**
 * Builds the quotes-sheet rows for a quote: one row per container in Smartsheet (Dan's
 * 51-column layout). The row fields are the app-side names the server maps to sheet columns.
 * Pure (no browser APIs), so the server builds the rows from its own recalculated quote.
 */

export interface QuoteSheetRow {
  quoteDate: string;
  containerSize: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  customerEmail?: string;
  customerPhone?: string;
  durationMonths: number;
  moveStoreScenario: string;
  location: string;
  postalCodeSuburbFrom: string;
  postalCodeSuburbTo?: string;
  interstateYn: 'Y' | 'N';
  quotingAgent: string;
  monthlyRentalRate: number;
  initialDeliveryFee: number;
  idFuelLevy: number;
  returnToPortaboxFee: number;
  wrtFuelLevy: number;
  relocationFeeMove: number;
  moveFuelLevy: number;
  interstateRelocationFee: number;
  interstateRelocationFuelLevy: number;
  redeliveryFee: number;
  redelFuelLevy: number;
  finalPickUpFee: number;
  fpuFuelLevy: number;
  sidYn: 'Y' | 'N';
  sfpuYn: 'Y' | 'N';
  protectionPlanCpoCoo: string;
  supplies?: string;
  discountOffered?: string;
  typeOfBilling: string;
}

export interface QuoteCustomer {
  name: string;
  companyName?: string;
  email?: string;
  mobile?: string;
  /** Staff member who took the quote; empty for online quotes. */
  agentName?: string;
  channels?: { email?: boolean; sms?: boolean; portal?: boolean };
}

type LegColumn = 'id' | 'wrt' | 'move' | 'interstate' | 'rdl' | 'fpu';

/** Which sheet column pair (fee + fuel levy) a transport leg belongs to. */
export function legColumn(label: string): LegColumn {
  const l = label.toLowerCase().replace('[waived] ', '');
  if (l.includes('interstate')) return 'interstate';
  if (l.startsWith('move to')) return 'move';
  if (l.includes('final') || l.includes('collection')) return 'fpu';
  if (l.includes('redelivery') || l.includes('delivery from interim') || l.includes('deliver loaded') || l.includes('drop off')) return 'rdl';
  if (l.includes('transit') || l.includes('transport to portabox')) return 'wrt';
  return 'id';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function durationMonths(quote: QuoteBreakdown): number {
  // The months the customer picked (e.g. 2), not the pricing bucket ("1 to 3 months" would give 1)
  if (quote.storageDurationMonths && quote.storageDurationMonths > 0) return quote.storageDurationMonths;
  const d = String(quote.storageDuration || '');
  const fixed: Record<string, number> = { '2_weeks': 0.5, '1_to_3_months': 1, '4_to_11_months': 4, '12_plus_months': 12 };
  if (fixed[d] !== undefined) return fixed[d];
  const months = d.match(/^(\d+)_months?$/);
  if (months) return Number(months[1]);
  const weeks = d.match(/^(\d+)_weeks?$/);
  if (weeks) return Math.round((Number(weeks[1]) / 4.33) * 10) / 10;
  return 1;
}

const HUB_CODE: Record<MetroHub, string> = { Adelaide: 'Ade', Brisbane: 'Bri', Melbourne: 'Mel', Sydney: 'Syd' };

/** Dan's sheet: "Ade", "Bri", "Mel", "Syd"; interstate moves "Origin-Destination", e.g. "Bri-Ade". */
export function locationCode(quote: QuoteBreakdown): string {
  const origin = quote.originPostcode ? getMetroHubForPostcode(quote.originPostcode) : undefined;
  const from = origin ? HUB_CODE[origin] : '';
  if (quote.isInterstate && quote.destinationPostcode) {
    const dest = getMetroHubForPostcode(quote.destinationPostcode);
    if (dest && dest !== origin) return `${from}-${HUB_CODE[dest]}`;
  }
  return from;
}

function scenario(quote: QuoteBreakdown): string {
  const names: Record<string, string> = {
    storage_at_place: 'Store at your place',
    storage_facility: 'Store at Portabox',
    moving: 'Move',
    moving_storage: 'Move & store',
  };
  return `${names[quote.serviceType] || quote.serviceType}${quote.isInterstate ? ' (interstate)' : ''}`;
}

function place(p?: { suburb: string; state: string; postcode: string }): string {
  return p ? `${p.suburb}, ${p.state} ${p.postcode}` : '';
}

/** One entry per container: its size label and its monthly rate after duration discounts. */
function containers(quote: QuoteBreakdown): { size: string; monthly: number }[] {
  const out: { size: string; monthly: number }[] = [];
  for (const line of quote.discountBreakdownBySize || []) {
    const each = (line.listMonthlyRate - (line.durationDiscountMonthly || 0)) / Math.max(1, line.count);
    for (let i = 0; i < line.count; i++) out.push({ size: line.label, monthly: round2(each) });
  }
  if (out.length === quote.containerCount) return out;
  const each = quote.monthlyRatePerContainer || quote.monthlyStorageFee / Math.max(1, quote.containerCount);
  return Array.from({ length: quote.containerCount }, () => ({
    size: `${quote.containerName} (${quote.containerVolume})`,
    monthly: round2(each),
  }));
}

/** Per-container transport fees and fuel levies, by sheet column. */
function transportPerContainer(quote: QuoteBreakdown) {
  const fees: Record<LegColumn, { fee: number; fuel: number }> = {
    id: { fee: 0, fuel: 0 }, wrt: { fee: 0, fuel: 0 }, move: { fee: 0, fuel: 0 },
    interstate: { fee: 0, fuel: 0 }, rdl: { fee: 0, fuel: 0 }, fpu: { fee: 0, fuel: 0 },
  };
  for (const leg of quote.legs as QuoteLegBreakdown[]) {
    const count = Math.max(1, leg.containerCount || quote.containerCount);
    const fuelInFee = leg.fuelSurchargeDeferred ? 0 : leg.fuelSurcharge || 0;
    const fuelLater = leg.fuelSurchargeDeferred ? leg.fuelSurchargeEstimatedAmount || 0 : 0;
    const col = fees[legColumn(leg.label)];
    col.fee += (leg.fee - fuelInFee) / count;
    col.fuel += (fuelInFee + fuelLater) / count;
  }
  for (const k of Object.keys(fees) as LegColumn[]) {
    fees[k].fee = round2(fees[k].fee);
    fees[k].fuel = round2(fees[k].fuel);
  }
  return fees;
}

function suppliesSummary(quote: QuoteBreakdown): string {
  const p = quote.packingSupplies;
  if (!p) return '';
  const parts: string[] = [];
  if (p.blanketsCount > 0) {
    const free = Math.min(p.blanketsCount, p.freeBlanketsAllowance || 0);
    const paid = p.blanketsCount - free;
    parts.push([free > 0 ? `${free} free blankets` : '', paid > 0 ? `${paid} paid blankets` : ''].filter(Boolean).join(' + '));
  }
  if (p.locksCount) parts.push(`${p.locksCount} padlock${p.locksCount > 1 ? 's' : ''}${p.isLockFreePromo ? ' (free)' : ''}`);
  if (p.boxesCount) parts.push(`${p.boxesCount} boxes`);
  return parts.filter(Boolean).join(' + ');
}

function protection(quote: QuoteBreakdown): string {
  if (quote.protectionPlan === 'cpo_coo') return 'CPO (Contents Protection Option) + COO (Container Only Option)';
  if (quote.protectionPlan === 'coo') return 'COO (Container Only Option)';
  if (quote.protectionPlan === 'cpo' || quote.insurance?.selected) return 'CPO (Contents Protection Option)';
  return 'None';
}

function discounts(quote: QuoteBreakdown): string {
  // Every perk on the quote (Dan, 15 Nov: the Discount Offered column was blank for 1st-month-free quotes).
  const parts: string[] = [];
  if (quote.isFirstMonthFree) parts.push('1st Mth Free');
  const kit = [
    quote.freeBlanketsIncluded || (quote.durationFreeBlanketsCount || 0) > 0 ? 'blankets' : '',
    quote.freeLockIncluded ? 'lock' : '',
  ].filter(Boolean);
  if (kit.length) parts.push(`Free Kit (${kit.join(' + ')})`);
  const credit = quote.milestoneCreditTotal || 0;
  if (credit > 0) {
    const option = quote.milestoneCreditOption || quote.annualDiscountOption;
    parts.push(`$${credit} Credit${option ? ` (${option})` : ''}`);
  }
  if (quote.durationDiscountPercent) parts.push(`${quote.durationDiscountPercent}% duration discount`);
  if (quote.upfrontDiscountPercent) parts.push(`${quote.upfrontDiscountPercent}% upfront discount`);
  for (const p of quote.appliedPromotions || []) parts.push(p.rule?.code ? `${p.rule.code}: ${p.description}` : p.description);
  return parts.join('; ');
}

/** Builds one sheet row per container for a finished quote. */
export function buildQuoteSheetRows(quote: QuoteBreakdown, customer: QuoteCustomer, today = new Date()): QuoteSheetRow[] {
  const [firstName, ...rest] = customer.name.trim().split(/\s+/);
  const fees = transportPerContainer(quote);
  const waived = (quote.waivedLegs || []).map((l) => legColumn(l.label));

  const shared = {
    quoteDate: today.toISOString().slice(0, 10),
    firstName: firstName || '',
    lastName: rest.join(' '),
    companyName: customer.companyName,
    customerEmail: customer.email,
    customerPhone: customer.mobile,
    durationMonths: durationMonths(quote),
    moveStoreScenario: scenario(quote),
    location: locationCode(quote),
    postalCodeSuburbFrom: place(quote.originPostcode),
    postalCodeSuburbTo: place(quote.destinationPostcode),
    interstateYn: (quote.isInterstate ? 'Y' : 'N') as 'Y' | 'N',
    quotingAgent: customer.agentName || 'Online quote',
    initialDeliveryFee: fees.id.fee,
    idFuelLevy: fees.id.fuel,
    returnToPortaboxFee: fees.wrt.fee,
    wrtFuelLevy: fees.wrt.fuel,
    relocationFeeMove: fees.move.fee,
    moveFuelLevy: fees.move.fuel,
    interstateRelocationFee: fees.interstate.fee,
    interstateRelocationFuelLevy: fees.interstate.fuel,
    redeliveryFee: fees.rdl.fee,
    redelFuelLevy: fees.rdl.fuel,
    finalPickUpFee: fees.fpu.fee,
    fpuFuelLevy: fees.fpu.fuel,
    // Customer loads/unloads at the Portabox location, so that delivery or pick-up is waived.
    sidYn: (waived.includes('id') ? 'Y' : 'N') as 'Y' | 'N',
    sfpuYn: (waived.includes('fpu') ? 'Y' : 'N') as 'Y' | 'N',
    protectionPlanCpoCoo: protection(quote),
    discountOffered: discounts(quote),
    typeOfBilling: quote.billingCycleLabel || quote.billingCycle,
    // Dan: "Send Quote Confirmation", "FOLLOW UP - Customer Status", "Contact Me this way please",
    // "Send Booking Form" and "Book (Move to Ozilla)" stay blank; his team fills them in.
  };

  return containers(quote).map((c, i) => ({
    ...shared,
    containerSize: c.size,
    monthlyRentalRate: c.monthly,
    // Supplies are for the whole order, so they go on the first (Parent) row only.
    supplies: i === 0 ? suppliesSummary(quote) : undefined,
  }));
}

