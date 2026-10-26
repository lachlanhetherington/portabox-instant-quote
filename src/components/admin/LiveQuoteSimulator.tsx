import React, { useState, useMemo } from 'react';
import {
  Calculator,
  MapPin,
  Truck,
  Box,
  Send,
  Copy,
  Check,
  Sparkles,
  Phone,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  AUSTRALIAN_POSTCODES,
  PostcodeRecord,
  searchPostcodes,
} from '../../data/australianPostcodes';
import {
  AppConfig,
  BillingCycle,
  ContainerSizeId,
  ServiceType,
  StorageDuration,
} from '../../types/quote';
import { calculateQuote } from '../../services/pricingEngine';

interface LiveQuoteSimulatorProps {
  config: AppConfig;
  onSendSmsQuote?: (quoteDetails: string) => void;
  onCreateLeadFromQuote?: (quote: any) => void;
}

export const LiveQuoteSimulator: React.FC<LiveQuoteSimulatorProps> = ({
  config,
  onSendSmsQuote,
  onCreateLeadFromQuote,
}) => {
  const [originQuery, setOriginQuery] = useState('5061 Hyde Park');
  const [originPostcode, setOriginPostcode] = useState<PostcodeRecord>(
    AUSTRALIAN_POSTCODES[0] // 5061 Hyde Park
  );
  const [destinationPostcode, setDestinationPostcode] = useState<PostcodeRecord | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('storage_at_place');
  const [containerSize, setContainerSize] = useState<ContainerSizeId>('large_25m3');
  const [containerCount, setContainerCount] = useState<number>(1);
  const [storageDuration, setStorageDuration] = useState<StorageDuration>('1_to_3_months');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [customerPhone, setCustomerPhone] = useState('');
  const [copied, setCopied] = useState(false);

  // Compute live quote on any change
  const quote = useMemo(() => {
    return calculateQuote({
      originPostcode,
      destinationPostcode: destinationPostcode || undefined,
      serviceType,
      containerSize,
      containerCount,
      billingCycle,
      storageDuration,
      storageDurationMonths: 1,
      preferredDate: new Date().toISOString().slice(0, 10),
      config,
    });
  }, [
    originPostcode,
    destinationPostcode,
    serviceType,
    containerSize,
    containerCount,
    billingCycle,
    storageDuration,
    config,
  ]);

  const handleCopySummary = () => {
    if (!quote) return;
    const summary = `PORTABOX INSTANT QUOTE:
Customer Location: ${quote.originPostcode.suburb} ${quote.originPostcode.postcode}
Container: ${quote.containerName} (Qty: ${quote.containerCount})
Service: ${quote.serviceType === 'storage_at_place' ? 'Storage at Place' : 'Depot Facility Storage'}
Storage Rent: $${quote.monthlyContainerRate}/mo ($${quote.weeklyContainerRate}/wk)
Delivery Leg: Zone ${quote.deliveryZone} (${quote.deliveryZoneRangeLabel || '<25km'}) - $${quote.domesticLegFeePerContainer}
First Payment Total: $${quote.firstPaymentTotal} (Includes initial delivery + first month)
Quote Ref: PB-SIM-${Date.now().toString().slice(-4)}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Header Banner */}
      <div className="bg-[#0b2942] text-white p-4.5 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#00c0f3] text-white shadow-xs">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black tracking-tight text-white">
              Live Phone Quote Simulator
            </h4>
            <p className="text-[11px] text-sky-200">
              Instant quote calculation preview for incoming customer inquiries
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#FF9900] text-[#0b2942]">
          Real-Time Sync
        </span>
      </div>

      <div className="p-5 space-y-4 text-xs font-semibold">
        {/* Origin Suburb / Postcode Picker */}
        <div>
          <label className="block text-slate-700 font-bold mb-1">
            Customer Suburb or Postcode
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <MapPin className="w-3.5 h-3.5 text-[#00c0f3] absolute left-3 top-2.5" />
              <input
                type="text"
                value={originQuery}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  const found = searchPostcodes(e.target.value);
                  if (found.length > 0) {
                    setOriginPostcode(found[0]);
                  }
                }}
                placeholder="e.g. 5061, Hyde Park, 3000 Melbourne..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
            </div>
            <select
              value={`${originPostcode.postcode}-${originPostcode.suburb}`}
              onChange={(e) => {
                const [pc, sub] = e.target.value.split('-');
                const found = AUSTRALIAN_POSTCODES.find(
                  (p) => p.postcode === pc && p.suburb === sub
                );
                if (found) {
                  setOriginPostcode(found);
                  setOriginQuery(`${found.postcode} ${found.suburb}`);
                }
              }}
              className="px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="5061-Hyde Park">5061 Hyde Park (Adelaide)</option>
              <option value="3000-Melbourne">3000 Melbourne (VIC)</option>
              <option value="2000-Sydney">2000 Sydney (NSW)</option>
              <option value="4000-Brisbane">4000 Brisbane (QLD)</option>
            </select>
          </div>
        </div>

        {/* Container Size & Service Type Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Container Size
            </label>
            <select
              value={containerSize}
              onChange={(e) => setContainerSize(e.target.value as ContainerSizeId)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
            >
              <option value="small_10m3">Small 10 m³ Portabox</option>
              <option value="medium_19m3">Medium 19 m³ Portabox</option>
              <option value="large_25m3">Large 25 m³ Portabox</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Service Setup
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
            >
              <option value="storage_at_place">Storage at Customer's Place</option>
              <option value="storage_facility">Storage at Portabox Depot</option>
              <option value="moving">Local / Interstate Moving</option>
            </select>
          </div>
        </div>

        {/* Live Calculation Output Card */}
        {quote && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-sky-200/70">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">
                  {quote.originDepot.name} Depot
                </span>
                <div className="font-extrabold text-sm text-[#0b2942]">
                  Zone {quote.deliveryZone} ({quote.deliveryZoneRangeLabel || '<25km'})
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase">First Payment</span>
                <div className="text-xl font-black text-[#0b2942] font-mono tabular-nums">
                  ${quote.firstPaymentTotal}
                </div>
              </div>
            </div>

            {/* Breakdown table */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>Monthly Storage Rate:</span>
                <span className="font-mono font-bold">${quote.monthlyContainerRate}/mo</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Equivalent Weekly Rate:</span>
                <span className="font-mono font-bold text-slate-500">${quote.weeklyContainerRate}/wk</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Initial Delivery Leg (Zone {quote.deliveryZone}):</span>
                <span className="font-mono font-bold">${quote.domesticLegFeePerContainer}</span>
              </div>
              {quote.isInterstate && (
                <div className="flex items-center justify-between text-indigo-700 font-bold">
                  <span>Interstate Route Freight:</span>
                  <span className="font-mono">${quote.interstateFee}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Quote!' : 'Copy Quote Text'}</span>
          </button>

          {onCreateLeadFromQuote && quote && (
            <button
              type="button"
              onClick={() => onCreateLeadFromQuote(quote)}
              className="py-2.5 px-3.5 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-black text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Book Quote</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
