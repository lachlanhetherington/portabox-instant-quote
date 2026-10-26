import React from 'react';
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
} from 'lucide-react';
import { QuoteBreakdown } from '../types/quote';

interface TraditionalQuoteDocumentProps {
  quote: QuoteBreakdown;
  customerData?: {
    firstName: string;
    mobile: string;
    email: string;
  };
  phone?: string;
  onBookNow?: () => void;
}

export const TraditionalQuoteDocument: React.FC<TraditionalQuoteDocumentProps> = ({
  quote,
  customerData,
  phone = '1800 467 637',
  onBookNow,
}) => {
  const quoteRef = `PBQ-${(quote.quoteCreatedAt ? new Date(quote.quoteCreatedAt).getTime() : Date.now()).toString().slice(-6)}`;
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

  // Group 1 Subtotal (Initial Move-In Upfront Fees)
  const initialDeliveryBase = quote.initialDeliveryFee;
  const initialMoveSubtotal = initialDeliveryBase;

  // Group 2 Subtotal (Monthly Storage)
  const monthlyStorageRate = quote.monthlyStorageFee;
  const baseMonthlyRate = quote.baseMonthlyStorageFee || monthlyStorageRate;
  const durationDiscountAud = quote.durationDiscountAmount || 0;

  // Group 3 Subtotal (Supplies & Insurance)
  const suppliesTotal = quote.packingSupplies?.totalSuppliesPrice || 0;
  const insuranceMonthlyFee = quote.insurance?.selected && !quote.insurance.isFreePromo
    ? quote.insurance.totalMonthlyInsuranceFee
    : 0;

  // Total Upfront Payable
  const upfrontPayable = quote.firstPaymentTotal;
  const gstUpfrontComponent = Math.round((upfrontPayable / 11) * 100) / 100;
  const netUpfrontBeforeGst = Math.round((upfrontPayable - gstUpfrontComponent) * 100) / 100;

  // Total Ongoing Monthly Storage (Storage + Insurance if selected)
  const recurringMonthlyTotal = monthlyStorageRate + insuranceMonthlyFee;

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
          <p className="text-xs text-slate-500 font-medium max-w-sm">
            Portabox Australia Pty Ltd · ABN 84 629 184 902<br />
            National Containerised Storage &amp; Door-to-Door Moving Network
          </p>
          <div className="text-[11px] text-slate-600 flex items-center gap-3 pt-1">
            <span>📞 {phone}</span>
            <span>·</span>
            <span>✉️ quotes@portabox.com.au</span>
            <span>·</span>
            <span>🌐 www.portabox.com.au</span>
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
          <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Price Guarantee:</span>
            <span className="font-extrabold text-[#15385E]">30 Days Locked</span>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full mt-2 py-2 px-3 rounded-xl bg-[#15385E] hover:bg-[#0f2844] text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer print:hidden active:scale-98"
            title="Download or print this official quotation / tax invoice as PDF"
          >
            <Download className="w-3.5 h-3.5 text-[#F7D347]" />
            <span>Download Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* 2. CUSTOMER & SERVICED ADDRESS BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            PREPARED FOR (CUSTOMER)
          </span>
          <p className="text-sm font-black text-[#15385E]">{customerName}</p>
          <p className="text-slate-600">Mobile: <span className="font-mono font-semibold text-slate-900">{customerMobile}</span></p>
          <p className="text-slate-600">Email: <span className="font-medium text-slate-900">{customerEmail}</span></p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
            LOCATION &amp; SCHEDULE
          </span>
          <p className="text-sm font-black text-[#15385E]">
            {quote.originPostcode.suburb}, {quote.originPostcode.state} {quote.originPostcode.postcode}
          </p>
          <p className="text-slate-600">
            Delivery Date: <span className="font-bold text-slate-900">{quote.preferredDate}</span>
          </p>
          {quote.selectedSlot && (
            <p className="text-slate-600">
              Time Window: <span className="font-semibold text-slate-900">{quote.selectedSlot.label} ({quote.selectedSlot.timeRange})</span>
            </p>
          )}
          <p className="text-slate-600">
            Servicing Facility: <span className="font-medium text-slate-900">{quote.originDepot.name}</span>
          </p>
        </div>
      </div>

      {/* 3. ITEMISED CHARGES LEDGER TABLE */}
      <div className="space-y-6">
        {/* GROUP 1: INITIAL MOVE-IN & DELIVERY (Payable Today) */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15385E] text-white text-[11px] font-black flex items-center justify-center">
                1
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E]">
                Initial Move-In &amp; Transport Fees (Payable Today)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">One-Off Upfront Charge</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-black">Description</th>
                <th className="py-2.5 px-4 font-black text-center">Qty / Route</th>
                <th className="py-2.5 px-4 font-black text-right">Unit Rate</th>
                <th className="py-2.5 px-4 font-black text-right">Subtotal (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.legs.map((leg, idx) => (
                <tr key={idx} className={leg.isPayableNow ? 'bg-white' : 'bg-slate-50/40 text-slate-500'}>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{leg.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{leg.description}</p>
                    {!leg.isPayableNow && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                        Payable later upon container collection
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    {leg.containerCount || quote.containerCount} container{quote.containerCount > 1 ? 's' : ''}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    ${leg.feePerContainer || leg.fee}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ${leg.fee}
                  </td>
                </tr>
              ))}
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
                    $0 {wLeg.waivedSavings ? `(-$${wLeg.waivedSavings})` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GROUP 2: ONGOING MONTHLY CONTAINER STORAGE */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15385E] text-white text-[11px] font-black flex items-center justify-center">
                2
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E]">
                Ongoing Monthly Storage Rental
              </h4>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
              12-Month Rate Freeze Included
            </span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-black">Description &amp; Specifications</th>
                <th className="py-2.5 px-4 font-black text-center">Billing Period</th>
                <th className="py-2.5 px-4 font-black text-right">Standard Rate</th>
                <th className="py-2.5 px-4 font-black text-right">Monthly Rate (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-white">
                <td className="py-3 px-4">
                  <p className="font-bold text-slate-900">
                    {isMulti ? `${quote.containerCount} × ` : ''}{quote.containerName} ({quote.containerVolume})
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Storage: {quote.serviceType === 'storage_at_place' ? 'Kept on your driveway / property' : 'Secure indoor facility storage'} · Heavy weatherproof steel container
                  </p>
                  {quote.durationDiscountPercent && quote.durationDiscountPercent > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      ✓ {quote.durationDiscountPercent}% Duration Discount Applied (-${durationDiscountAud}/mo)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-medium">
                  {quote.billingCycleLabel || 'Monthly (calendar)'}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-400">
                  {durationDiscountAud > 0 ? (
                    <span className="line-through">${baseMonthlyRate}/mo</span>
                  ) : (
                    `$${baseMonthlyRate}/mo`
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  ${monthlyStorageRate} /month
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* GROUP 3: SUPPLIES & INSURANCE PROTECTION (CPO) */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#15385E] text-white text-[11px] font-black flex items-center justify-center">
                3
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E]">
                Packing Supplies, Padlocks &amp; Insurance Protection (CPO)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Itemised Options</span>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-black">Option / Item Description</th>
                <th className="py-2.5 px-4 font-black text-center">Quantity / Term</th>
                <th className="py-2.5 px-4 font-black text-right">Unit Price</th>
                <th className="py-2.5 px-4 font-black text-right">Line Total (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {/* Blanket Rental */}
              {quote.packingSupplies?.blanketsCount !== undefined && quote.packingSupplies.blanketsCount > 0 && (
                <tr>
                  <td className="py-2.5 px-4">
                    <p className="font-bold text-slate-900">Quilted Moving Blankets (Hire)</p>
                    <p className="text-[11px] text-slate-500">
                      First {quote.packingSupplies.freeBlanketsAllowance || 10} blankets free per container rented
                    </p>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono">
                    {quote.packingSupplies.blanketsCount} blankets ({Math.min(quote.packingSupplies.blanketsCount, quote.packingSupplies.freeBlanketsAllowance || 10)} Free)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                    $25 / 10pk block
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {quote.packingSupplies.blanketsPrice === 0 ? (
                      <span className="text-emerald-700 font-bold">$0 (100% Free)</span>
                    ) : (
                      `$${quote.packingSupplies.blanketsPrice}`
                    )}
                  </td>
                </tr>
              )}

              {/* Padlocks */}
              {quote.packingSupplies?.locksCount !== undefined && quote.packingSupplies.locksCount > 0 && (
                <tr>
                  <td className="py-2.5 px-4">
                    <p className="font-bold text-slate-900">Heavy-Duty Discus Padlock (Sales)</p>
                    <p className="text-[11px] text-slate-500">
                      Stainless-steel anti-bolt cutter disc lock fitted for lockbox shroud
                    </p>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono">
                    {quote.packingSupplies.locksCount} padlock{quote.packingSupplies.locksCount > 1 ? 's' : ''}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                    ${quote.packingSupplies.lockUnitPrice || 20} each
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {quote.packingSupplies.isLockFreePromo ? (
                      <span className="text-emerald-700 font-bold">$0 (Free Promo)</span>
                    ) : (
                      `$${quote.packingSupplies.locksPrice}`
                    )}
                  </td>
                </tr>
              )}

              {/* Moving Boxes */}
              {quote.packingSupplies?.boxesCount !== undefined && quote.packingSupplies.boxesCount > 0 && (
                <tr>
                  <td className="py-2.5 px-4">
                    <p className="font-bold text-slate-900">Double-Walled Moving Boxes (Sales)</p>
                    <p className="text-[11px] text-slate-500">
                      Heavy-duty cartons delivered inside container ready to pack
                    </p>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono">
                    {quote.packingSupplies.boxesCount} cartons
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                    Bundle Rate
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    ${quote.packingSupplies.boxesPrice}
                  </td>
                </tr>
              )}

              {/* CPO Insurance */}
              {quote.insurance && quote.insurance.selected ? (
                <tr>
                  <td className="py-2.5 px-4">
                    <p className="font-bold text-slate-900">Container Protection Option (CPO Insurance)</p>
                    <p className="text-[11px] text-slate-500">
                      Up to ${(quote.insurance.coverageAmount || 10000).toLocaleString()} contents protection against water, storm, fire, transit &amp; theft
                    </p>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono">
                    {quote.containerCount} container{quote.containerCount > 1 ? 's' : ''} (Monthly)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                    ${quote.insurance.monthlyPricePerContainer || 15}/mo
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                    {quote.insurance.isFreePromo ? (
                      <span className="text-emerald-700 font-bold">$0 (Free Promo)</span>
                    ) : (
                      `$${quote.insurance.totalMonthlyInsuranceFee} /mo`
                    )}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="py-2 px-4 text-center text-slate-400 italic text-[11px]">
                    No packing supplies or optional insurance selected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. FORMAL TAX & TOTAL LEDGER SUMMARY */}
      <div className="pt-4 border-t-2 border-slate-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          {/* Notes & Guarantees */}
          <div className="space-y-2 max-w-md text-xs text-slate-600">
            <div className="flex items-center gap-2 text-emerald-800 font-black text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>30-Day Rate Lock &amp; 12-Month Price Freeze Guaranteed</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This quotation is issued pursuant to Portabox Standard Terms of Service. Rates quoted are in Australian Dollars (AUD) and inclusive of 10% Goods and Services Tax (GST).
            </p>
            <div className="text-[11px] text-slate-500">
              Payment Terms: First payment payable upon booking confirmation via Credit/Debit Card. Subsequent monthly storage is billed in 30-day advance cycles.
            </div>
          </div>

          {/* Grand Totals Box */}
          <div className="w-full sm:w-80 bg-[#15385E] text-white p-5 rounded-2xl shadow-lg space-y-2.5">
            <div className="flex items-center justify-between text-xs text-sky-200">
              <span>First Payment Net (ex-GST):</span>
              <span className="font-mono font-bold">${netUpfrontBeforeGst.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-sky-200">
              <span>GST Included (10%):</span>
              <span className="font-mono font-bold">${gstUpfrontComponent.toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-sky-800 flex items-baseline justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#F7D347] block">
                  FIRST PAYMENT TOTAL
                </span>
                <span className="text-[10px] text-slate-300">Due at booking (incl. delivery)</span>
              </div>
              <span className="font-mono text-2xl font-black text-white">
                ${upfrontPayable}
              </span>
            </div>

            <div className="pt-2 border-t border-sky-800 flex items-baseline justify-between text-xs">
              <div>
                <span className="font-bold text-sky-100 block">ONGOING MONTHLY STORAGE</span>
                <span className="text-[10px] text-slate-300">Commences month 2 (12-mo freeze)</span>
              </div>
              <span className="font-mono font-extrabold text-[#F7D347] text-base">
                ${recurringMonthlyTotal} /mo
              </span>
            </div>

            {onBookNow && (
              <button
                type="button"
                onClick={onBookNow}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-[#F7D347] hover:bg-[#eec939] text-[#15385E] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 print:hidden"
              >
                <CheckCircle2 className="w-4 h-4 text-[#15385E]" />
                <span>Ready to Book? Book Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
