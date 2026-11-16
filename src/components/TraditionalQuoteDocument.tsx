import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Calendar,
  MapPin,
  Truck,
  Package,
  Lock,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Building,
  Download,
  ArrowRight,
  MessageSquare,
  Smartphone,
  Send,
  Check,
  Copy,
  X,
  Sparkles,
} from 'lucide-react';
import { QuoteBreakdown, QuoteLegBreakdown as QuoteLeg } from '../types/quote';
import { formatMoney } from '../utils/currency';
import { useQuoteNumber, usePublicSettings } from '../services/quoteNumberService';
import { SALES_EMAIL } from '../utils/contact';
import { getQuoteDurationLabel } from '../services/pricingEngine';
import { getQuoteCostSections, CostLine, INITIAL_PAYMENT_DISCLAIMER } from '../services/quoteCostSections';

/** Leg description without the fuel-levy wording (the "Fuel levy – $X" line and columns show it). */
function cleanLegDescription(description: string): string {
  return description
    .replace(/\s*\+\s*\$[\d.,]+ fuel levy \([^)]*\)/gi, '')
    .split(' · ')
    .filter((part) => !/fuel levy/i.test(part))
    .join(' · ')
    .trim();
}

interface TraditionalQuoteDocumentProps {
  quote: QuoteBreakdown;
  /** The saved quote's own number. Without it, the number of the quote being built in this browser is shown. */
  quoteNumber?: string;
  customerData?: {
    firstName: string;
    companyName?: string;
    mobile: string;
    email: string;
  };
  phone?: string;
  onBookNow?: () => void;
  /** Show the "Delivery window & date selected in Next Steps" note. Follows the Next Steps flow feature flag. */
  showNextStepsDeliveryNote?: boolean;
}

export const TraditionalQuoteDocument: React.FC<TraditionalQuoteDocumentProps> = ({
  quote,
  customerData,
  phone = '1800 467 637',
  onBookNow,
  showNextStepsDeliveryNote = false,
  quoteNumber,
}) => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // A saved quote shows its own number; only the quote being built uses this browser's current number.
  const currentQuoteNumber = useQuoteNumber();
  const quoteRef = quoteNumber || currentQuoteNumber || 'Q-…';
  // The note shows when the Next Steps flow is on, or when the CEO has switched it on for everyone.
  const { showDeliveryWindowNote } = usePublicSettings();
  const showDeliveryNote = showNextStepsDeliveryNote || showDeliveryWindowNote;
  const issueDateStr = quote.quoteCreatedAt
    ? new Date(quote.quoteCreatedAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const expiryDateStr = quote.quoteExpiresAt
    ? new Date(quote.quoteExpiresAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
      })();

  const customerName = customerData?.firstName || 'Valued Customer';
  const customerMobile = customerData?.mobile || 'Not provided';
  const customerEmail = customerData?.email || 'Not provided';

  const isMulti = quote.containerCount > 1;

  // Group 2 Subtotal (Monthly Storage)
  const monthlyStorageRate = quote.monthlyStorageFee;
  const baseMonthlyRate = quote.baseMonthlyStorageFee || monthlyStorageRate;
  const durationDiscountAud = quote.durationDiscountAmount || 0;

  // Dan (16 Nov): 1. Initial Upfront Payment, 2. Ongoing monthly costs (no separate supplies section)
  const costSections = getQuoteCostSections(quote);
  const upfrontNonLegLines = costSections.upfront.lines.filter((l) => !l.key.startsWith('leg-'));

  // Total Upfront Payable
  const upfrontPayable = quote.firstPaymentTotal;
  const gstUpfrontComponent = Math.round((upfrontPayable / 11) * 100) / 100;
  const netUpfrontBeforeGst = Math.round((upfrontPayable - gstUpfrontComponent) * 100) / 100;

  // Total ongoing monthly costs: storage + blanket rental + CPO / COO
  const recurringMonthlyTotal = costSections.ongoing.total;

  // Every transport leg is shown the same way in sections 1 and 1b:
  // Qty | Delivery Rate (per container, excl. fuel) | Subtotal incl. Fuel Levy.
  // Payable-now legs already have the levy inside leg.fee; later legs carry it separately
  // (fuelSurchargeEstimatedAmount) because it is charged when that leg happens.
  const legFuelLevy = (leg: QuoteLeg) =>
    leg.fuelSurchargeDeferred ? leg.fuelSurchargeEstimatedAmount || 0 : leg.fuelSurcharge || 0;
  const legDeliveryTotal = (leg: QuoteLeg) =>
    leg.fuelSurchargeDeferred ? leg.fee : leg.fee - (leg.fuelSurcharge || 0);
  const legSubtotalInclFuel = (leg: QuoteLeg) => legDeliveryTotal(leg) + legFuelLevy(leg);

  const renderLegRow = (leg: QuoteLeg, key: string) => {
    const count = leg.containerCount || quote.containerCount;
    const fuel = legFuelLevy(leg);
    return (
      <tr key={key} className="bg-white">
        <td className="py-3 px-4">
          <p className="font-bold text-slate-900">{leg.label}</p>
          {/* Dan 16 Nov: the fuel levy sits at the end of the same line as the leg description */}
          <p className="text-[11px] text-slate-500 mt-0.5">
            {cleanLegDescription(leg.description)}
            {fuel > 0 && <> · Fuel levy – ${formatMoney(fuel)}</>}
          </p>
        </td>
        <td className="py-3 px-4 text-center font-mono">
          {count} container{count > 1 ? 's' : ''}
        </td>
        <td className="py-3 px-4 text-right font-mono">
          ${formatMoney(legDeliveryTotal(leg) / Math.max(1, count))}
        </td>
        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
          ${formatMoney(legSubtotalInclFuel(leg))}
        </td>
      </tr>
    );
  };

  const renderCostLine = (line: CostLine, suffix = '') => (
    <tr key={line.key} className="bg-white">
      <td className="py-3 px-4" colSpan={3}>
        <p className="font-bold text-slate-900">{line.label}</p>
        {line.detail && <p className="text-[11px] text-emerald-700 font-bold mt-0.5">{line.detail}</p>}
      </td>
      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
        {line.listAmount !== undefined && (
          <span className="line-through text-slate-400 font-normal mr-1.5">${formatMoney(line.listAmount)}</span>
        )}
        {line.amount < 0 ? `-$${formatMoney(-line.amount)}` : `$${formatMoney(line.amount)}`}
        {suffix}
      </td>
    </tr>
  );

  // Transport legs billed later (pick-up, interstate line-haul, final delivery and collection),
  // including the fuel levy for each leg. Not part of the first payment.
  const laterLegs = quote.legs.filter((leg) => !leg.isPayableNow);
  const laterTransportTotal = laterLegs.reduce((sum, leg) => sum + legSubtotalInclFuel(leg), 0);

  // Ongoing monthly billing starts after any prepaid months.
  const prepaidMonths: Record<string, number> = { '3_months_upfront': 3, '6_months_upfront': 6, '12_months_upfront': 12 };
  const ongoingStartsMonth = (prepaidMonths[quote.billingCycle] ?? 1) + 1;

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-md p-6 sm:p-10 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800 space-y-8 print:border-none print:shadow-none print:p-0 print:space-y-6 print:rounded-none">
      {/* 1. OFFICIAL QUOTATION HEADER */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b-2 border-slate-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl font-black text-[#15385E] tracking-tight">
              PORTABOX
            </span>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md">
              OFFICIAL QUOTATION
            </span>
          </div>
          <div className="text-xs text-slate-600 flex items-center gap-3 pt-1 font-semibold flex-wrap">
            <span>📞 {phone}</span>
            <span>·</span>
            <span>🌐 www.portabox.au</span>
          </div>
        </div>

        {/* Quotation Metadata Box */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 text-xs space-y-1.5 min-w-[240px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Quote Number:</span>
            <span className="font-mono font-black text-[#15385E] text-sm">{quoteRef}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Date Issued:</span>
            <span className="font-semibold">{issueDateStr}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Valid Until:</span>
            <span className="font-bold text-emerald-700">{expiryDateStr}</span>
          </div>
        </div>
      </div>

      {/* 2. CUSTOMER & SERVICED ADDRESS BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            PREPARED FOR (CUSTOMER)
          </span>
          <p className="text-sm font-black text-[#15385E]">
            {customerName}
          </p>
          {customerData?.companyName && (
            <p className="text-xs font-bold text-slate-700">
              Company: <span className="font-medium text-slate-900">{customerData.companyName}</span>
            </p>
          )}
          <p className="text-slate-600">Mobile: <span className="font-mono font-semibold text-slate-900">{customerMobile}</span></p>
          <p className="text-slate-600">Email: <span className="font-medium text-slate-900">{customerEmail}</span></p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            LOCATION &amp; SERVICING DEPOT
          </span>
          <p className="text-sm font-black text-[#15385E]">
            {quote.originPostcode.suburb}, {quote.originPostcode.state} {quote.originPostcode.postcode}
          </p>
          <p className="text-slate-600">
            Servicing Facility: <span className="font-medium text-slate-900">{quote.originDepot.name}</span>
          </p>
          <p className="text-slate-600">
            Storage Duration: <span className="font-bold text-slate-900">{getQuoteDurationLabel(quote)}</span>
          </p>
          {showDeliveryNote && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex items-center gap-1.5 text-[11px] text-[#00a9d7] font-bold">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Delivery window &amp; date selected in Next Steps upon booking</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. ITEMISED CHARGES LEDGER TABLE */}
      <div className="space-y-6">
        {/* GROUP 1: INITIAL UPFRONT PAYMENT */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15385E] text-white text-[11px] font-black flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E]">
                Initial Upfront Payment
              </h4>
            </div>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-black">Description</th>
                <th className="py-2.5 px-4 font-black text-center">Qty / Route</th>
                <th className="py-2.5 px-4 font-black text-right">Delivery Rate</th>
                <th className="py-2.5 px-4 font-black text-right">Subtotal incl. Fuel Levy (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.legs.filter((leg) => leg.isPayableNow).map((leg, idx) => renderLegRow(leg, `now-${idx}`))}
              {quote.waivedLegs && quote.waivedLegs.map((wLeg, wIdx) => (
                <tr key={`waived-${wIdx}`} className="bg-emerald-50/40 text-emerald-900 border-t border-emerald-100">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="line-through text-slate-400">{wLeg.label.replace('[Waived] ', '')}</span>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        ✓ {wLeg.waivedReason || 'Waived at Depot'}
                      </span>
                    </p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">{wLeg.description}</p>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-800">
                    {wLeg.containerCount || quote.containerCount} container{quote.containerCount > 1 ? 's' : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">
                    $0 (Free)
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    $0 {wLeg.waivedSavings ? `(-$${formatMoney(wLeg.waivedSavings)})` : ''}
                  </td>
                </tr>
              ))}
              {upfrontNonLegLines.map((line) => renderCostLine(line))}
              <tr className="bg-slate-50">
                <td className="py-3 px-4 font-black text-[#15385E]" colSpan={3}>
                  Initial upfront payment total
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-[#15385E]">
                  ${formatMoney(costSections.upfront.total)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="py-2 px-4 text-[11px] text-slate-500 italic">
                  {INITIAL_PAYMENT_DISCLAIMER}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* GROUP 1b: TRANSPORT CHARGED LATER (pick-up, interstate line-haul, final delivery & collection) */}
        {laterLegs.length > 0 && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="min-w-5 h-5 px-1 rounded-full bg-[#15385E] text-white text-[11px] font-black flex items-center justify-center">
                  1b
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E]">
                  Later Transport Fees (Charged When Each Move Happens)
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Not Included In First Payment</span>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-black">Description</th>
                  <th className="py-2.5 px-4 font-black text-center">Qty / Route</th>
                  <th className="py-2.5 px-4 font-black text-right">Delivery Rate</th>
                  <th className="py-2.5 px-4 font-black text-right">Subtotal incl. Fuel Levy (AUD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {laterLegs.map((leg, idx) => renderLegRow(leg, `later-${idx}`))}
                <tr className="bg-slate-50">
                  <td className="py-3 px-4 font-black text-[#15385E]" colSpan={3}>
                    Total later transport fees
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-[#15385E]">
                    ${formatMoney(laterTransportTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* GROUP 2: ONGOING MONTHLY COSTS */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15385E] text-white text-[11px] font-black flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E]">
                Ongoing Monthly Costs
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">From month {ongoingStartsMonth}</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-black">Description</th>
                <th className="py-2.5 px-4 font-black text-right" colSpan={2}>Standard Rate</th>
                <th className="py-2.5 px-4 font-black text-right">Monthly (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-white">
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-900">
                    Monthly storage rental: {isMulti ? `${quote.containerCount} × ` : ''}{quote.containerName} ({quote.containerVolume})
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Storage: {quote.serviceType === 'storage_at_place' ? 'Kept on your driveway / property' : 'Secure indoor facility storage'} · Heavy weatherproof steel container
                  </p>
                  {quote.durationDiscountPercent && quote.durationDiscountPercent > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      ✓ {quote.durationDiscountPercent}% Duration Discount Applied (-${formatMoney(durationDiscountAud)}/mo)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-400" colSpan={2}>
                  {durationDiscountAud > 0 ? (
                    <span className="line-through">${formatMoney(baseMonthlyRate)}/mo</span>
                  ) : (
                    `$${formatMoney(baseMonthlyRate)}/mo`
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  ${formatMoney(monthlyStorageRate)} /month
                </td>
              </tr>
              {costSections.ongoing.lines.filter((l) => l.key !== 'storage').map((line) => renderCostLine(line, ' /mo'))}
              <tr className="bg-slate-50">
                <td className="py-3 px-4 font-black text-[#15385E]" colSpan={3}>
                  Total ongoing monthly costs
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-[#15385E]">
                  ${formatMoney(recurringMonthlyTotal)} /mo
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3b. YOUR SAVINGS (itemised real savings on this booking) */}
      {quote.savingsBreakdown && quote.savingsBreakdown.length > 0 && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-4 pb-2 mb-2 border-b border-emerald-200">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900">Your savings on this quote</span>
            <span className="font-mono text-xl font-black text-emerald-800">${formatMoney(quote.totalSavings || 0)}</span>
          </div>
          <ul className="space-y-1 text-xs text-emerald-900">
            {quote.savingsBreakdown.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-4">
                <span>✓ {s.label}</span>
                <span className="font-mono font-bold shrink-0">${formatMoney(s.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. FORMAL TAX & TOTAL LEDGER SUMMARY */}
      <div className="pt-4 border-t-2 border-slate-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          {/* Notes & Guarantees */}
          <div className="space-y-2 max-w-md text-xs text-slate-600">
            <div className="flex items-center gap-2 text-emerald-800 font-black text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>30-Day Quote Price Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This quotation is issued pursuant to Portabox Standard Terms of Service. Rates quoted are in Australian Dollars (AUD) and inclusive of 10% Goods and Services Tax (GST).
            </p>
          </div>

          {/* Grand Totals Box */}
          <div className="w-full sm:w-80 bg-[#15385E] text-white p-5 rounded-2xl shadow-lg space-y-2.5">
            <div className="flex items-center justify-between text-xs text-sky-200">
              <span>First Payment Net (ex-GST):</span>
              <span className="font-mono font-bold">${formatMoney(netUpfrontBeforeGst, true)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-sky-200">
              <span>GST Included (10%):</span>
              <span className="font-mono font-bold">${formatMoney(gstUpfrontComponent, true)}</span>
            </div>

            <div className="pt-2 border-t border-sky-800 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#F7D347] block">
                  FIRST PAYMENT TOTAL
                </span>
              </div>
              <span className="font-mono text-2xl font-black text-white">
                ${formatMoney(upfrontPayable, true)}
              </span>
            </div>

            <div className="pt-2 border-t border-sky-800 flex items-baseline justify-between text-xs">
              <div>
                <span className="font-bold text-sky-100 block">ONGOING MONTHLY COSTS</span>
                <span className="text-[10px] text-slate-300">Commences month {ongoingStartsMonth}</span>
              </div>
              <span className="font-mono font-extrabold text-[#F7D347] text-base">
                ${formatMoney(recurringMonthlyTotal, recurringMonthlyTotal % 1 !== 0)} /mo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. WHEN YOU'RE READY TO BOOK SECTION */}
      <div className="p-6 rounded-2xl bg-slate-50 border-2 border-[#15385E]/20 space-y-4 print:bg-white print:border-slate-300">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-sm font-black text-[#15385E] uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#00a9d7]" />
            <span>When you're ready to book:</span>
          </h4>
          <span className="text-[11px] font-semibold text-slate-500">
            Quote Ref: <span className="font-mono font-bold text-[#15385E]">{quoteRef}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          {/* Option 1: Call Our Team */}
          <div className="flex flex-col justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#15385E] text-[#F7D347] font-black text-xs flex items-center justify-center shrink-0">1</span>
                <p className="font-extrabold text-[#15385E] text-sm">Call Our Team</p>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Speak directly with our team to book over the phone and we will get you booked.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100">
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#15385E] font-bold text-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#00a9d7]" />
                <span>Call {phone}</span>
              </a>
            </div>
          </div>

          {/* Option 2: Message us when you are ready to book - HIGHLIGHTED */}
          <div className="relative flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50/70 to-amber-100/40 border-2 border-[#F7D347] shadow-sm ring-2 ring-[#F7D347]/30">
            {/* Highlighted Ribbon Badge */}
            <div className="absolute -top-2.5 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#15385E] text-[#F7D347] text-[10px] font-black uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3 h-3 text-[#F7D347]" />
                <span>Fastest · Highlighted</span>
              </span>
            </div>

            <div className="space-y-2 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#F7D347] text-[#15385E] font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">2</span>
                <p className="font-black text-[#15385E] text-sm">
                  Message us when you are ready to book
                </p>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed font-medium">
                Send an SMS or instant booking message with Quote Ref <strong className="font-mono text-[#15385E]">{quoteRef}</strong>. We confirm your date &amp; delivery window.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-amber-200/80 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#15385E] hover:bg-[#1d4b7a] text-white font-extrabold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#F7D347]" />
                <span>Message Us Now</span>
              </button>
              <a
                href={`sms:0488883637?&body=${encodeURIComponent(`Hi Portabox team, I am ready to book quote ${quoteRef} for ${customerName}. Please confirm my delivery window.`)}`}
                className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-amber-100 text-[#15385E] border border-amber-300 font-bold transition-colors shrink-0"
                title="Send SMS from mobile"
              >
                <Smartphone className="w-4 h-4 text-emerald-700" />
              </a>
            </div>
          </div>

          {/* Option 3: Request Booking Form */}
          <div className="flex flex-col justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#15385E] text-[#F7D347] font-black text-xs flex items-center justify-center shrink-0">3</span>
                <p className="font-extrabold text-[#15385E] text-sm">Request Booking Form</p>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Send us an email and we will confirm a date and delivery window.
              </p>
            </div>
            <div className="pt-3 mt-3 border-t border-slate-100">
              <a
                href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Booking Form Request - ${quoteRef} (${customerName})`)}&body=${encodeURIComponent(`Hi Portabox,\n\nPlease send through the booking form for Quote ${quoteRef}.\n\nCustomer: ${customerName}\nPhone: ${customerMobile}\nEmail: ${customerEmail}\n\nThank you!`)}`}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#15385E] font-bold text-xs transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#00a9d7]" />
                <span>Email {SALES_EMAIL}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Message Us to Book Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border-2 border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#15385E] text-[#F7D347] flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#15385E]">Message Us to Book</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Portabox Dispatch &amp; Booking Desk · Fast Response
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">Quotation Reference:</span>
                    <span className="font-mono font-black text-[#15385E]">{quoteRef}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">Customer:</span>
                    <span className="font-bold text-slate-900">{customerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">Mobile:</span>
                    <span className="font-mono font-bold text-slate-900">{customerMobile}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">Service:</span>
                    <span className="font-medium text-slate-900">{quote.containerName || 'Portabox Container'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-[#15385E] uppercase tracking-wider">
                    Booking Message
                  </label>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono leading-relaxed select-all">
                    {`Hi Portabox team, I am ready to book quote ${quoteRef} (${customerName}). Phone: ${customerMobile}. Please lock in my container and contact me to confirm delivery.`}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <a
                    href={`sms:0488883637?&body=${encodeURIComponent(`Hi Portabox team, I am ready to book quote ${quoteRef} (${customerName}). Phone: ${customerMobile}. Please lock in my container and contact me to confirm delivery.`)}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#15385E] hover:bg-[#1d4b7a] text-white font-black text-xs shadow-xs transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-[#F7D347]" />
                    <span>Open SMS on Phone</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const text = `Hi Portabox team, I am ready to book quote ${quoteRef} (${customerName}). Phone: ${customerMobile}. Please lock in my container and contact me to confirm delivery.`;
                      navigator.clipboard.writeText(text);
                      setCopiedMessage(true);
                      setTimeout(() => setCopiedMessage(false), 2500);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMessage ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
