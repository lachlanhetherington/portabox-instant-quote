import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Warehouse,
  Truck,
  CheckCircle2,
  CircleDollarSign,
  Info,
} from 'lucide-react';
import { PostcodeRecord, DepotLocation, findClosestDepot } from '../data/australianPostcodes';
import { LogisticsMethod, ServiceType, AppConfig } from '../types/quote';
import { TraditionalStorageComparison } from './TraditionalStorageComparison';
import {
  getMetroHubForPostcode,
  getLocationPricingForHub,
  calculateLegFuelSurcharge,
  DEFAULT_CONFIG,
} from '../services/pricingEngine';

interface Step3LoadingLogisticsProps {
  originPostcode: PostcodeRecord;
  destinationPostcode?: PostcodeRecord | null;
  serviceType: ServiceType;
  originLogisticsMethod: LogisticsMethod;
  onSelectOriginLogistics: (method: LogisticsMethod) => void;
  destinationLogisticsMethod: LogisticsMethod;
  onSelectDestinationLogistics: (method: LogisticsMethod) => void;
  originDepot: DepotLocation;
  destinationDepot?: DepotLocation | null;
  originDistanceKm?: number;
  legsSavedCount?: number;
  legsSavedDollarTotal?: number;
  isInterstate?: boolean;
  onContinue: () => void;
  onBack: () => void;
  config?: AppConfig;
  containerCount?: number;
}

export const Step3LoadingLogistics: React.FC<Step3LoadingLogisticsProps> = ({
  originPostcode,
  destinationPostcode,
  serviceType,
  originLogisticsMethod,
  onSelectOriginLogistics,
  destinationLogisticsMethod,
  onSelectDestinationLogistics,
  originDepot,
  destinationDepot,
  originDistanceKm,
  legsSavedCount = 0,
  legsSavedDollarTotal = 0,
  onContinue,
  onBack,
  config,
  containerCount = 1,
}) => {
  const isStorageFacility = serviceType === 'storage_facility';
  const isMoving = serviceType === 'moving' || serviceType === 'moving_storage';
  const hasDestination = isMoving || isStorageFacility;

  const destDepotToUse = isStorageFacility ? originDepot : (destinationDepot || originDepot);
  const destSuburbLabel = isStorageFacility 
    ? 'When finished storing' 
    : (destinationPostcode ? destinationPostcode.suburb : 'Destination');

  const activeConfig = config || DEFAULT_CONFIG;
  const cCount = containerCount > 0 ? containerCount : 1;
  const isFuelEnabled = activeConfig.fuelSurchargeEnabled !== false;

  // Origin exact savings: 1 delivery leg to customer + 1 delivery leg back to warehouse + fuel surcharge on each leg
  const originHub = getMetroHubForPostcode(originPostcode);
  const originLocConfig = getLocationPricingForHub(activeConfig, originHub);
  const originDeliveryZones = originLocConfig.deliveryZones;
  const oDist = originDistanceKm !== undefined ? originDistanceKm : findClosestDepot(originPostcode.lat, originPostcode.lng).distanceKm;

  let oZone = 'A';
  let oBase = originDeliveryZones.zoneABaseFee ?? 149;
  let oKm = 0;
  if (oDist < (originDeliveryZones.zoneAMaxKm ?? 25)) {
    oZone = 'A';
    oBase = originDeliveryZones.zoneABaseFee ?? 149;
    oKm = Math.round(oDist * (originDeliveryZones.zoneARatePerKm ?? 0));
  } else if (oDist < (originDeliveryZones.zoneBMaxKm ?? 50)) {
    oZone = 'B';
    oBase = originDeliveryZones.zoneBBaseFee ?? 179;
    oKm = Math.round(oDist * (originDeliveryZones.zoneBRatePerKm ?? 0));
  } else if (oDist < (originDeliveryZones.zoneCMaxKm ?? 75)) {
    oZone = 'C';
    oBase = originDeliveryZones.zoneCBaseFee ?? 219;
    oKm = Math.round(oDist * (originDeliveryZones.zoneCRatePerKm ?? 0));
  } else if (oDist <= (originDeliveryZones.zoneDMaxKm ?? 100)) {
    oZone = 'D';
    oBase = originDeliveryZones.zoneDBaseFee ?? 249;
    oKm = Math.round(oDist * (originDeliveryZones.zoneDRatePerKm ?? 0));
  } else {
    oZone = 'E';
    oBase = originDeliveryZones.zoneEBaseFee ?? 249;
    const billableKm = oDist > (originDeliveryZones.zoneDMaxKm ?? 100)
      ? (oDist - (originDeliveryZones.zoneDMaxKm ?? 100))
      : oDist;
    oKm = Math.round(billableKm * (originDeliveryZones.zoneERatePerKm ?? 5.0));
  }

  const oFuel = calculateLegFuelSurcharge({
    zone: oZone,
    distanceKm: oDist,
    containerCount: cCount,
    config: activeConfig,
  });

  const oneOriginLegDeliveryFee = oBase + oKm;
  const oneOriginLegFuel = isFuelEnabled ? oFuel.ratePerContainer : 0;
  // Inclusive of all charges: base leg fee, extra km charge, and fuel surcharge for 2 legs (delivery + pickup)
  const totalOriginSavings = (oneOriginLegDeliveryFee + oneOriginLegFuel) * 2 * cCount;

  // Destination exact savings (for destination unloading):
  // 1 delivery leg to destination + 1 collection leg back to warehouse + fuel surcharge on each leg
  const destPostcodeRecord = destinationPostcode || originPostcode;
  const destHub = getMetroHubForPostcode(destPostcodeRecord);
  const destLocConfig = getLocationPricingForHub(activeConfig, destHub);
  const destDeliveryZones = destLocConfig.deliveryZones;
  const dDist = destinationPostcode
    ? findClosestDepot(destinationPostcode.lat, destinationPostcode.lng).distanceKm
    : oDist;

  let dZone = 'A';
  let dBase = destDeliveryZones.zoneABaseFee ?? 149;
  let dKm = 0;
  if (dDist < (destDeliveryZones.zoneAMaxKm ?? 25)) {
    dZone = 'A';
    dBase = destDeliveryZones.zoneABaseFee ?? 149;
    dKm = Math.round(dDist * (destDeliveryZones.zoneARatePerKm ?? 0));
  } else if (dDist < (destDeliveryZones.zoneBMaxKm ?? 50)) {
    dZone = 'B';
    dBase = destDeliveryZones.zoneBBaseFee ?? 179;
    dKm = Math.round(dDist * (destDeliveryZones.zoneBRatePerKm ?? 0));
  } else if (dDist < (destDeliveryZones.zoneCMaxKm ?? 75)) {
    dZone = 'C';
    dBase = destDeliveryZones.zoneCBaseFee ?? 219;
    dKm = Math.round(dDist * (destDeliveryZones.zoneCRatePerKm ?? 0));
  } else if (dDist <= (destDeliveryZones.zoneDMaxKm ?? 100)) {
    dZone = 'D';
    dBase = destDeliveryZones.zoneDBaseFee ?? 249;
    dKm = Math.round(dDist * (destDeliveryZones.zoneDRatePerKm ?? 0));
  } else {
    dZone = 'E';
    dBase = destDeliveryZones.zoneEBaseFee ?? 249;
    const billableKm = dDist > (destDeliveryZones.zoneDMaxKm ?? 100)
      ? (dDist - (destDeliveryZones.zoneDMaxKm ?? 100))
      : dDist;
    dKm = Math.round(billableKm * (destDeliveryZones.zoneERatePerKm ?? 5.0));
  }

  const dFuel = calculateLegFuelSurcharge({
    zone: dZone,
    distanceKm: dDist,
    containerCount: cCount,
    config: activeConfig,
  });

  const oneDestLegDeliveryFee = dBase + dKm;
  const oneDestLegFuel = isFuelEnabled ? dFuel.ratePerContainer : 0;
  // Inclusive of all charges: base leg fee, extra km charge, and fuel surcharge for 2 legs (redelivery + final pickup)
  const totalDestSavings = (oneDestLegDeliveryFee + oneDestLegFuel) * 2 * cCount;

  // Dynamic calculated savings for the configured options:
  // Reconciled exactly with the individual card badges and comprehensive legs
  const isOriginDepot = originLogisticsMethod === 'depot_loading';
  const isDestDepot = hasDestination && destinationLogisticsMethod === 'depot_loading';

  const totalAmountSaved =
    (isOriginDepot ? totalOriginSavings : 0) +
    (isDestDepot ? totalDestSavings : 0);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#15385E] tracking-tight">
          Where would you like to load your container?
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Load at My Location for maximum convenience or bring your items directly to Portabox Location to save delivery charges.
        </p>
      </div>

      {/* SECTION 1: ORIGIN LOADING */}
      <div className="mb-10">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
          <span className="w-6 h-6 rounded-full bg-[#15385E] text-white text-xs font-black flex items-center justify-center">1</span>
          <h3 className="text-lg font-bold text-slate-900">
            Initial Loading: Origin ({originPostcode.suburb} {originPostcode.postcode})
          </h3>
        </div>

        <div className={`grid grid-cols-1 ${serviceType !== 'storage_at_place' ? 'md:grid-cols-2' : 'max-w-xl'} gap-4 items-stretch`}>
          {/* Option A: Home Delivery */}
          <div
            onClick={() => onSelectOriginLogistics('home_delivery')}
            className={`p-5 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-full ${
              originLogisticsMethod === 'home_delivery'
                ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600 shadow-sm'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    originLogisticsMethod === 'home_delivery' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      My Home (Driveway Delivery)
                    </h4>
                    <span className="text-xs text-slate-500">Full-service delivery to {originPostcode.suburb}</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  originLogisticsMethod === 'home_delivery' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                }`}>
                  {originLogisticsMethod === 'home_delivery' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                We drop the container right at your driveway or street curb. Pack at your own pace.
              </p>
            </div>
          </div>

          {/* Option B: Load at Portabox Location */}
          {serviceType !== 'storage_at_place' && (
            <div
              onClick={() => onSelectOriginLogistics('depot_loading')}
              className={`p-5 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-full ${
                originLogisticsMethod === 'depot_loading'
                  ? 'border-[#15385E] bg-sky-50/40 ring-2 ring-[#15385E] shadow-sm'
                  : 'border-slate-200 bg-white hover:border-sky-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      originLogisticsMethod === 'depot_loading' ? 'bg-[#15385E] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          Our Location (Load at Portabox Depot)
                        </h4>
                        <span className="bg-sky-100 text-[#15385E] border border-sky-200 text-[10px] font-black px-1.5 py-0.5 rounded">
                          SAVE ${totalOriginSavings}
                        </span>
                      </div>
                      <span className="text-xs text-sky-800 font-semibold">
                        {originDepot.name.replace(/\s*Depot/i, ' Location')} ({originDepot.suburb})
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    originLogisticsMethod === 'depot_loading' ? 'border-[#15385E] bg-[#15385E]' : 'border-slate-300'
                  }`}>
                    {originLogisticsMethod === 'depot_loading' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Bring your vehicle, ute, or hire van directly to Portabox Location and load directly into your container.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: DESTINATION OR STORAGE COMPLETION UNLOADING */}
      {hasDestination && (
        <div className="mb-10">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-[#15385E] text-white text-xs font-black flex items-center justify-center">2</span>
            <h3 className="text-lg font-bold text-slate-900">
              {isStorageFacility
                ? 'Completion: Where will you unload when finished storing?'
                : `Destination Unloading: (${destSuburbLabel})`}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* Option A: Deliver Container to My Address */}
            <div
              onClick={() => onSelectDestinationLogistics('home_delivery')}
              className={`p-5 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-full ${
                destinationLogisticsMethod === 'home_delivery'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      destinationLogisticsMethod === 'home_delivery' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {isStorageFacility ? 'My Home (Redelivery to Driveway)' : 'My Home (Delivery to New Address)'}
                      </h4>
                      <span className="text-xs text-slate-500">
                        {isStorageFacility ? `Redelivery to ${originPostcode.suburb}` : `Delivery to ${destSuburbLabel}`}
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    destinationLogisticsMethod === 'home_delivery' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}>
                    {destinationLogisticsMethod === 'home_delivery' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {isStorageFacility
                    ? 'When your storage term ends, we deliver the full container directly to you, let you unpack, and retrieve the empty container.'
                    : `We deliver the container directly to your new address in ${destSuburbLabel}, let you unpack, and retrieve the empty container.`}
                </p>
              </div>
            </div>

            {/* Option B: Unload at Portabox Location */}
            <div
              onClick={() => onSelectDestinationLogistics('depot_loading')}
              className={`p-5 sm:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-full ${
                destinationLogisticsMethod === 'depot_loading'
                  ? 'border-[#15385E] bg-sky-50/40 ring-2 ring-[#15385E] shadow-sm'
                  : 'border-slate-200 bg-white hover:border-sky-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      destinationLogisticsMethod === 'depot_loading' ? 'bg-[#15385E] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          Our Location (Unload at Portabox Depot)
                        </h4>
                        <span className="bg-sky-100 text-[#15385E] border border-sky-200 text-[10px] font-black px-1.5 py-0.5 rounded">
                          SAVE ${totalDestSavings}
                        </span>
                      </div>
                      <span className="text-xs text-sky-800 font-semibold">
                        {destDepotToUse.name.replace(/\s*Depot/i, ' Location')} ({destDepotToUse.suburb})
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    destinationLogisticsMethod === 'depot_loading' ? 'border-[#15385E] bg-[#15385E]' : 'border-slate-300'
                  }`}>
                    {destinationLogisticsMethod === 'depot_loading' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  When your storage term ends, unpack at your pace directly into your vehicle.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Recap Box */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex-1">
          <span className="font-semibold text-slate-700">
            {originLogisticsMethod === 'depot_loading' ? 'Self-load at Portabox Location' : 'Delivery to My Location'}
            {' → '}
            {hasDestination
              ? (destinationLogisticsMethod === 'depot_loading' ? 'Self-unload at Portabox Location' : 'Delivery to My Location')
              : 'Container Stays at My Location'}
          </span>
        </div>
        <div className="shrink-0">
          {isOriginDepot && isDestDepot ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-extrabold bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Total saved: ${Math.round(totalAmountSaved)}</span>
            </span>
          ) : isOriginDepot || isDestDepot ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-extrabold bg-emerald-100/90 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Total saved: ${Math.round(totalAmountSaved)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-200/70 text-slate-600 font-bold border border-slate-200 whitespace-nowrap">
              Full-service delivery
            </span>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* CTA Continue Button */}
        <button
          type="button"
          onClick={onContinue}
          className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
        </button>
      </div>
    </div>
  );
};
