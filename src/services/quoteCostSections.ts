import type { QuoteBreakdown } from '../types/quote';

/**
 * Dan (16 Nov): the quote shows what is paid up front and what is paid every month.
 *   1. Initial Upfront Payment: delivery legs payable now, 1st storage rental, lock(s),
 *      1st month of blanket rental, 1st month of CPO / COO (less any promotion).
 *   2. Ongoing monthly costs: storage rental, blanket rental, CPO / COO.
 * Later transport legs (move, final pickup...) stay in their own section, charged when they happen.
 */
/** Dan (16 Nov): later deliveries within 5 days of the initial delivery may be added to the first payment. */
export const INITIAL_PAYMENT_DISCLAIMER =
  "Your initial payment covers your 1st month's rent and initial delivery. It may increase if later deliveries are booked within 5 days of the initial delivery.";

/** Dan (16 Nov): upfront savings are estimates until the other deliveries are booked. */
export const UPFRONT_SAVING_DISCLAIMER =
  "This is an estimate and will change during booking to reflect other booked deliveries.";

export interface CostLine {
  key: string;
  label: string;
  detail?: string;
  amount: number;
  /** Full price before a free / promotional saving, when it differs from amount. */
  listAmount?: number;
}

export interface QuoteCostSections {
  upfront: { lines: CostLine[]; total: number };
  ongoing: { lines: CostLine[]; total: number };
}

const UPFRONT_MONTHS: Record<string, number> = { '3_months_upfront': 3, '6_months_upfront': 6, '12_months_upfront': 12 };

export function protectionLabel(plan: QuoteBreakdown['protectionPlan']): string {
  if (plan === 'coo') return 'Container Only Option (COO)';
  if (plan === 'cpo_coo') return 'Contents Protection Option (CPO) + Container Only Option (COO)';
  return 'Contents Protection Option (CPO)';
}

export function getQuoteCostSections(quote: QuoteBreakdown): QuoteCostSections {
  const upfront: CostLine[] = [];
  const ongoing: CostLine[] = [];
  const supplies = quote.packingSupplies;
  const insuranceMonthly =
    quote.insurance?.selected && !quote.insurance.isFreePromo ? quote.insurance.totalMonthlyInsuranceFee : 0;
  const prepaidMonths = UPFRONT_MONTHS[quote.billingCycle];

  // Transport legs payable now (their fee already includes the fuel levy)
  quote.legs
    .filter((l) => l.isPayableNow)
    .forEach((l, i) => upfront.push({ key: `leg-${i}`, label: l.label, detail: 'Delivery incl. fuel levy', amount: l.fee }));

  // Storage rental in the first payment
  const storageFirst = quote.firstPaymentStorageFee ?? quote.currentPeriodicStorageFee ?? quote.monthlyStorageFee;
  upfront.push({
    key: 'storage',
    label: prepaidMonths ? `Storage rental – ${prepaidMonths} months upfront` : '1st month storage rental',
    detail: !prepaidMonths && quote.isFirstMonthFree
      ? '1st month free'
      : prepaidMonths && quote.upfrontMilestoneCredit
        ? `After $${quote.upfrontMilestoneCredit} milestone credit and ${quote.upfrontDiscountPercent || 0}% upfront discount`
        : undefined,
    amount: storageFirst,
    listAmount: !prepaidMonths && storageFirst < quote.monthlyStorageFee ? quote.monthlyStorageFee : undefined,
  });

  const locksCount = supplies?.locksCount || 0;
  if (supplies && locksCount > 0) {
    const locksPrice = supplies.locksPrice || 0;
    const listLocks = (supplies.lockUnitPrice || 0) * locksCount;
    upfront.push({
      key: 'locks',
      label: `Disc lock${locksCount > 1 ? 's' : ''} (${locksCount})`,
      detail: locksPrice === 0 ? 'Free' : undefined,
      amount: locksPrice,
      listAmount: listLocks > locksPrice ? listLocks : undefined,
    });
  }

  if (supplies && supplies.blanketsCount > 0) {
    upfront.push({
      key: 'blankets',
      label: `1st month blanket rental (${supplies.blanketsCount} blankets)`,
      detail: supplies.blanketsPrice === 0 ? 'Free blanket rental' : undefined,
      amount: supplies.blanketsPrice,
    });
  }

  if (supplies && supplies.boxesCount > 0) {
    upfront.push({ key: 'boxes', label: `Moving boxes (${supplies.boxesCount})`, amount: supplies.boxesPrice });
  }

  if (quote.insurance?.selected) {
    upfront.push({
      key: 'protection',
      label: `1st month ${protectionLabel(quote.protectionPlan)}`,
      detail: quote.insurance.isFreePromo ? 'Free' : undefined,
      amount: insuranceMonthly,
    });
  }

  const deliveryUpfront = quote.upfrontDeliveryDiscount || 0;
  if (deliveryUpfront > 0) {
    upfront.push({
      key: 'upfront-delivery',
      label: `${quote.upfrontDiscountPercent || ''}% upfront discount on initial delivery`.trim(),
      amount: -deliveryUpfront,
    });
  }

  const discount = quote.firstPaymentDiscount || 0;
  if (discount > 0) {
    upfront.push({ key: 'discount', label: 'Promotion', amount: -discount });
  }

  // Ongoing monthly costs
  ongoing.push({ key: 'storage', label: 'Monthly storage rental', amount: quote.monthlyStorageFee });
  if (supplies && supplies.blanketsCount > 0) {
    ongoing.push({
      key: 'blankets',
      label: `Monthly blanket rental (${supplies.blanketsCount} blankets)`,
      detail: supplies.blanketsPrice === 0 ? 'Free blanket rental' : undefined,
      amount: supplies.blanketsPrice,
    });
  }
  if (quote.insurance?.selected) {
    ongoing.push({
      key: 'protection',
      label: protectionLabel(quote.protectionPlan),
      detail: quote.insurance.isFreePromo ? 'Free' : undefined,
      amount: insuranceMonthly,
    });
  }

  const sum = (lines: CostLine[]) => Math.round(lines.reduce((t, l) => t + l.amount, 0) * 100) / 100;
  return {
    upfront: { lines: upfront, total: quote.firstPaymentTotal },
    ongoing: { lines: ongoing, total: sum(ongoing) },
  };
}
