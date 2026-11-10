import React from 'react';
import type { SmartsheetStagingRow } from '../../services/smartsheetService';

interface Dan51ColumnTableProps {
  rows: SmartsheetStagingRow[];
  onUpdateRow: (rowId: string, updates: Partial<SmartsheetStagingRow>) => void;
}

export const Dan51ColumnTable: React.FC<Dan51ColumnTableProps> = ({
  rows,
  onUpdateRow,
}) => {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 font-semibold bg-white">
        No rows found matching current search or filters in Dan&apos;s 51-column Smartsheet view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[640px] border-t border-slate-200">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="sticky top-0 z-20 shadow-xs">
          {/* Top Tier: Schema Boundary Group Headers */}
          <tr className="text-[11px] font-black uppercase tracking-wider text-white">
            <th colSpan={37} className="py-2 px-3 bg-[#0b2942] border-r border-[#1a3d5f]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  Portabox App Pushed Fields (Columns 1–37)
                </span>
                <span className="text-[10px] font-semibold text-sky-200 uppercase tracking-wider">
                  Automated Two-Way App Sync
                </span>
              </div>
            </th>
            <th colSpan={14} className="py-2 px-3 bg-emerald-900 border-l border-emerald-800">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Smartsheet Inbound &amp; Follow-Up (Columns 38–51)
                </span>
                <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                  Call Center Follow-Up &amp; Ozilla
                </span>
              </div>
            </th>
          </tr>

          {/* Second Tier: All 51 Exact Smartsheet Columns */}
          <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
            {/* 1-37 App Pushed */}
            <th className="py-2 px-2.5 border-r border-slate-200">1. Prim</th>
            <th className="py-2 px-2.5 border-r border-slate-200">2. Quote Date</th>
            <th className="py-2 px-2.5 border-r border-slate-200">3. Quote ID</th>
            <th className="py-2 px-2.5 border-r border-slate-200">4. Order Number</th>
            <th className="py-2 px-2.5 border-r border-slate-200">5. Container #</th>
            <th className="py-2 px-2.5 border-r border-slate-200">6. Container Size</th>
            <th className="py-2 px-2.5 border-r border-slate-200">7. First Name</th>
            <th className="py-2 px-2.5 border-r border-slate-200">8. Last Name</th>
            <th className="py-2 px-2.5 border-r border-slate-200">9. Company Name</th>
            <th className="py-2 px-2.5 border-r border-slate-200">10. Email Address</th>
            <th className="py-2 px-2.5 border-r border-slate-200">11. Mobile Phone</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-center">12. Duration (Mo)</th>
            <th className="py-2 px-2.5 border-r border-slate-200">13. Move / Store Scenario</th>
            <th className="py-2 px-2.5 border-r border-slate-200">14. Location</th>
            <th className="py-2 px-2.5 border-r border-slate-200">15. Suburb From</th>
            <th className="py-2 px-2.5 border-r border-slate-200">16. Suburb To</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-center">17. Interstate</th>
            <th className="py-2 px-2.5 border-r border-slate-200">18. Quoting Agent</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">19. MRR</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">20. ID Fee</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">21. ID Fuel</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">22. WRT Fee</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">23. WRT Fuel</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">24. Reloc Fee</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">25. Move Fuel</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">26. Int Reloc</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">27. Int Fuel</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">28. RDL Fee</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">29. RDL Fuel</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">30. FPU Fee</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-right">31. FPU Fuel</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-center">32. SID</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-center">33. SFPU</th>
            <th className="py-2 px-2.5 border-r border-slate-200">34. Protection (CPO/COO)</th>
            <th className="py-2 px-2.5 border-r border-slate-200">35. Supplies</th>
            <th className="py-2 px-2.5 border-r border-slate-200">36. Discount Offered</th>
            <th className="py-2 px-2.5 border-r border-slate-200">37. Type of Billing</th>

            {/* 38-51 Smartsheet Inbound */}
            <th className="py-2 px-2.5 border-r border-slate-200 text-center bg-emerald-50 text-emerald-900">38. Send Quote Conf</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">39. Follow Up Agent 1</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">40. Follow Up Agent 2</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">41. Re-Contact Date</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">42. Status</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">43. Contact Pref</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">44. Call Back Time</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-center bg-emerald-50 text-emerald-900">45. Send Booking Form</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">46. Booking Date</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">47. Booking Agent</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">48. Final Discount</th>
            <th className="py-2 px-2.5 border-r border-slate-200 text-center bg-emerald-50 text-emerald-900">49. Book (Move to Ozilla)</th>
            <th className="py-2 px-2.5 border-r border-slate-200 bg-emerald-50 text-emerald-900">50. Day 7 Auto</th>
            <th className="py-2 px-2.5 bg-emerald-50 text-emerald-900">51. Day 20 Final</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
          {rows.map((row) => {
            const isChild = row.prim === 'Child';
            
            // Format Quote ID to Q- format
            const cleanQuoteId = row.quoteId?.replace(/^PBQ-/, 'Q-') || 
              (row.orderNumber?.startsWith('PBQ-') ? row.orderNumber.replace(/^PBQ-/, 'Q-') : (row.orderNumber?.startsWith('Q-') ? row.orderNumber : `Q-${row.orderNumber || '059009'}`));

            // Format compound protection plan (CPO-22, COO-22, COO-0)
            const protCode = row.protectionPlanCpoCoo || 
              (row.protectionPlanTier && row.protectionPlanTier !== 'None' 
                ? (row.protectionPlanTier.toLowerCase().includes('customer') ? 'COO-22' : 'CPO-22') 
                : 'COO-0');

            // Format discounts using Dan's standard codes (1stFREE, 400A, 400B, BLKTFREE)
            const discountCode = row.discountOffered || 
              (row.isFirstMonthFree ? '1stFREE' : (row.annualDiscountOption && row.annualDiscountOption !== 'None' ? '400A' : 'None'));

            const firstName = row.firstName || row.customerName?.split(' ')[0] || '—';
            const lastName = row.lastName || row.customerName?.split(' ').slice(1).join(' ') || '—';

            return (
              <tr
                key={row.id}
                className={`transition-colors group ${
                  isChild ? 'bg-amber-50/30 hover:bg-amber-100/40' : 'hover:bg-sky-50/40'
                }`}
              >
                {/* 1. Prim */}
                <td className="py-2 px-2.5 font-bold border-r border-slate-100 whitespace-nowrap">
                  {isChild ? (
                    <span className="text-amber-700 font-semibold text-[11px] flex items-center gap-1">
                      <span>↳</span> Child
                    </span>
                  ) : (
                    <span className="text-slate-900 font-bold text-[11px]">Primary</span>
                  )}
                </td>

                {/* 2. Quote Date */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                  {row.quoteDate || row.bookingDate || '2026-03-30'}
                </td>

                {/* 3. Quote ID (Q- format) */}
                <td className="py-2 px-2.5 font-mono font-bold text-sky-800 border-r border-slate-100 whitespace-nowrap">
                  {cleanQuoteId}
                </td>

                {/* 4. Order Number */}
                <td className="py-2 px-2.5 font-mono font-semibold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                  {row.orderNumber || '—'}
                </td>

                {/* 5. Container Number */}
                <td className="py-2 px-2.5 font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                  {row.containerNumber || (isChild ? '2 of 2' : '1 of 1')}
                </td>

                {/* 6. Container Size */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700">
                  {row.containerSize || 'Standard 3.0m'}
                </td>

                {/* 7. First Name */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap font-medium text-slate-800">
                  {firstName}
                </td>

                {/* 8. Last Name */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap font-medium text-slate-800">
                  {lastName}
                </td>

                {/* 9. Company Name */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600">
                  {row.companyName || '—'}
                </td>

                {/* 10. Email Address */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                  {row.customerEmail || '—'}
                </td>

                {/* 11. Mobile Phone */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                  {row.customerPhone || '—'}
                </td>

                {/* 12. Duration months */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-center font-bold text-slate-800">
                  {row.durationMonths || 3}
                </td>

                {/* 13. Move store scenarios 13 */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700">
                  {row.moveStoreScenario || 'Move and Store'}
                </td>

                {/* 14. Location */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700">
                  {row.location || 'Melbourne Depot'}
                </td>

                {/* 15. Postal Code Suburb From */}
                <td
                  className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700 truncate max-w-[140px]"
                  title={row.postalCodeSuburbFrom || row.deliveryAddress}
                >
                  {row.postalCodeSuburbFrom || row.deliveryAddress || '—'}
                </td>

                {/* 16. Postal Code Suburb To */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700">
                  {row.postalCodeSuburbTo || '—'}
                </td>

                {/* 17. Interstate Y/N */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-center font-bold">
                  {row.interstateYn || (row.isInterstate ? 'Y' : 'N')}
                </td>

                {/* 18. Quoting Agent */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700">
                  {row.quotingAgent || 'Dan Harrington (CEO)'}
                </td>

                {/* 19-31 Financial Fees */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                  ${row.monthlyRentalRate ?? 198}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.initialDeliveryFee ?? 149}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.idFuelLevy ?? 22}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.returnToPortaboxFee ?? 149}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.wrtFuelLevy ?? 22}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.relocationFee ?? 0}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.moveFuelLevy ?? 0}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.interstateRelocationFee ?? 0}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.interstateRelocationFuelLevy ?? 0}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.redeliveryFee ?? 0}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.redelFuelLevy ?? 0}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.finalPickUpFee ?? 149}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-right font-mono">
                  ${row.fpuFuelLevy ?? 22}
                </td>

                {/* 32. SID Y/N */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-center font-bold">
                  {row.sidYn || (row.sidIncluded ? 'Y' : 'N')}
                </td>

                {/* 33. SFPU Y/N */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-center font-bold">
                  {row.sfpuYn || (row.sfpuIncluded ? 'Y' : 'N')}
                </td>

                {/* 34. Protection Plan CPO/COO */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap font-mono font-bold text-sky-900">
                  {protCode}
                </td>

                {/* 35. Supplies */}
                <td
                  className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-700 truncate max-w-[120px]"
                  title={row.suppliesSummary || row.supplies}
                >
                  {row.suppliesSummary || row.supplies || '—'}
                </td>

                {/* 36. Discount Offered */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap font-bold text-emerald-800">
                  {discountCode}
                </td>

                {/* 37. Type of Billing */}
                <td className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap text-slate-700">
                  {row.typeOfBilling || 'Monthly Card Auto-Debit'}
                </td>

                {/* --- SMARTSHEET INBOUND FIELDS (38–51) --- */}
                {/* 38. Send Quote Confirmation to Customer */}
                <td className="py-2 px-2.5 border-r border-slate-100 text-center bg-emerald-50/40">
                  <input
                    type="checkbox"
                    checked={!!row.sendQuoteConfirmation}
                    onChange={(e) => onUpdateRow(row.id, { sendQuoteConfirmation: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Toggle Send Quote Confirmation"
                  />
                </td>

                {/* 39. Follow Up Agent 1 */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <input
                    type="text"
                    value={row.followUpAgent1 || ''}
                    placeholder="Agent name"
                    onChange={(e) => onUpdateRow(row.id, { followUpAgent1: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs w-28 font-medium focus:border-emerald-500"
                  />
                </td>

                {/* 40. Follow Up Agent 2 */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <input
                    type="text"
                    value={row.followUpAgent2 || ''}
                    placeholder="Agent 2"
                    onChange={(e) => onUpdateRow(row.id, { followUpAgent2: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs w-24 font-medium focus:border-emerald-500"
                  />
                </td>

                {/* 41. Re-Contact Customer Date */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <input
                    type="date"
                    value={row.reContactCustomerDate || ''}
                    onChange={(e) => onUpdateRow(row.id, { reContactCustomerDate: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs font-mono focus:border-emerald-500"
                  />
                </td>

                {/* 42. FOLLOW UP - Customer Status */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <select
                    value={row.followUpCustomerStatus || 'New'}
                    onChange={(e) => onUpdateRow(row.id, { followUpCustomerStatus: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:border-emerald-500"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested">Interested</option>
                    <option value="Booked">Booked</option>
                    <option value="Lost">Lost</option>
                  </select>
                </td>

                {/* 43. Contact Me this way please */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <select
                    value={row.contactMeThisWay || 'Mobile'}
                    onChange={(e) => onUpdateRow(row.id, { contactMeThisWay: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs focus:border-emerald-500"
                  >
                    <option value="Mobile">Mobile</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </td>

                {/* 44. Call Me Back On */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <input
                    type="text"
                    value={row.callMeBackOn || ''}
                    placeholder="e.g. 2pm Tuesday"
                    onChange={(e) => onUpdateRow(row.id, { callMeBackOn: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs w-28 focus:border-emerald-500"
                  />
                </td>

                {/* 45. Send Booking Form to our Customers */}
                <td className="py-2 px-2.5 border-r border-slate-100 text-center bg-emerald-50/40">
                  <input
                    type="checkbox"
                    checked={!!row.sendBookingForm}
                    onChange={(e) => onUpdateRow(row.id, { sendBookingForm: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Toggle Send Booking Form"
                  />
                </td>

                {/* 46. Booking Date */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <input
                    type="date"
                    value={row.bookingDate || ''}
                    onChange={(e) => onUpdateRow(row.id, { bookingDate: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs font-mono focus:border-emerald-500"
                  />
                </td>

                {/* 47. Booking Agent */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <input
                    type="text"
                    value={row.bookingAgent || ''}
                    placeholder="Agent"
                    onChange={(e) => onUpdateRow(row.id, { bookingAgent: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs w-24 focus:border-emerald-500"
                  />
                </td>

                {/* 48. Final Discount Accepted */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40">
                  <input
                    type="text"
                    value={row.finalDiscountAccepted || ''}
                    placeholder="Code/Amount"
                    onChange={(e) => onUpdateRow(row.id, { finalDiscountAccepted: e.target.value })}
                    className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-xs w-24 focus:border-emerald-500"
                  />
                </td>

                {/* 49. Book (Move to Ozilla) */}
                <td className="py-2 px-2.5 border-r border-slate-100 text-center bg-emerald-50/40">
                  <input
                    type="checkbox"
                    checked={!!row.bookMoveToOzilla}
                    onChange={(e) => onUpdateRow(row.id, { bookMoveToOzilla: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Move to Ozilla"
                  />
                </td>

                {/* 50. Day 7 Auto Follow Up */}
                <td className="py-2 px-2.5 border-r border-slate-100 whitespace-nowrap bg-emerald-50/40 text-slate-700 font-mono text-[11px]">
                  {row.day7AutoFollowUp || 'Pending'}
                </td>

                {/* 51. Day 20 Final Check In! */}
                <td className="py-2 px-2.5 whitespace-nowrap bg-emerald-50/40 text-slate-700 font-mono text-[11px]">
                  {row.day20FinalCheckIn || 'Pending'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
