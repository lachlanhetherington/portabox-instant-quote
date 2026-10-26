import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Warehouse,
  Truck,
  CheckCircle2,
  MapPin,
  Clock,
  CircleDollarSign,
  Info,
} from 'lucide-react';
import { PostcodeRecord, DepotLocation } from '../data/australianPostcodes';
import { LogisticsMethod, ServiceType, AppConfig } from '../types/quote';
import { TraditionalStorageComparison } from './TraditionalStorageComparison';

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
}) => {
  const isStorageFacility = serviceType === 'storage_facility';
  const isMoving = serviceType === 'moving' || serviceType === 'moving_storage';
  const hasDestination = isMoving || isStorageFacility;

  const destDepotToUse = isStorageFacility ? originDepot : (destinationDepot || originDepot);
  const destSuburbLabel = isStorageFacility 
    ? 'When finished storing' 
    : (destinationPostcode ? destinationPostcode.suburb : 'Destination');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-slate-200/80 shadow-xs">
      {/* Header */}
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif] mb-3">
          STEP 3 OF 8 · LOADING &amp; UNLOADING OPTIONS
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#15385E] tracking-tight">
          Where would you like to load your container?
        </h2>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Load at home for maximum convenience, or bring your items directly to our secure Portabox depot location to eliminate delivery fees and save up to 4 legs!
        </p>
      </div>

      {/* Live Savings Alert Banner */}
      {legsSavedCount > 0 ? (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-emerald-900 flex items-center gap-2">
                <span>Saving {legsSavedCount} Delivery Legs!</span>
                {legsSavedDollarTotal > 0 && (
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md text-xs font-black">
                    Save ~${legsSavedDollarTotal}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                {legsSavedCount === 4
                  ? 'Maximum savings active! All local delivery and retrieval leg fees are waived.'
                  : 'Great savings! Local delivery and retrieval fees waived for your chosen depot legs.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shrink-0">
            100% Free Depot Access
          </span>
        </div>
      ) : (
        <div className="mb-8 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-3">
          <Info className="w-5 h-5 text-slate-500 shrink-0" />
          <p className="text-xs sm:text-sm">
            <strong className="font-semibold text-slate-900">Pro Tip:</strong> Choosing to load or unload at a Portabox Depot saves between 2 and 4 delivery legs (saving $240 to $500+).
          </p>
        </div>
      )}

      {/* SECTION 1: ORIGIN LOADING */}
      <div className="mb-10">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
          <span className="w-6 h-6 rounded-full bg-[#15385E] text-white text-xs font-black flex items-center justify-center">1</span>
          <h3 className="text-lg font-bold text-slate-900">
            Initial Loading: Origin ({originPostcode.suburb} {originPostcode.postcode})
          </h3>
        </div>

        <div className={`grid grid-cols-1 ${serviceType !== 'storage_at_place' ? 'md:grid-cols-2' : 'max-w-xl'} gap-4`}>
          {/* Option A: Home Delivery (Green Focus) */}
          <div
            onClick={() => onSelectOriginLogistics('home_delivery')}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              originLogisticsMethod === 'home_delivery'
                ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600 shadow-sm'
                : 'border-slate-200 bg-white hover:border-emerald-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    originLogisticsMethod === 'home_delivery' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900">
                      Deliver Container to My Home
                    </h4>
                    <span className="text-xs text-slate-500">Full-service delivery to {originPostcode.suburb}</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  originLogisticsMethod === 'home_delivery' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                }`}>
                  {originLogisticsMethod === 'home_delivery' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                We drop the container right at your driveway or street curb. Pack at your own pace over several days before we pick it up.
              </p>

              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ground-level easy loading at your front door</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>No hire trailer or truck rental needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Convenient scheduled delivery window</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Delivery Fee</span>
              <span className={`font-bold ${originLogisticsMethod === 'home_delivery' ? 'text-emerald-700' : 'text-slate-900'}`}>Standard Delivery Rates</span>
            </div>
          </div>

          {/* Option B: Depot Loading (Blue Focus) - Only displayed for Portabox facility or moving, not storage at place */}
          {serviceType !== 'storage_at_place' && (
            <div
              onClick={() => onSelectOriginLogistics('depot_loading')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                originLogisticsMethod === 'depot_loading'
                  ? 'border-[#15385E] bg-sky-50/40 ring-2 ring-[#15385E] shadow-sm'
                  : 'border-slate-200 bg-white hover:border-sky-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      originLogisticsMethod === 'depot_loading' ? 'bg-[#15385E] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          Load at Portabox Depot
                        </h4>
                        <span className="bg-sky-100 text-[#15385E] border border-sky-200 text-[10px] font-black px-1.5 py-0.5 rounded">
                          SAVE 2 LEGS
                        </span>
                      </div>
                      <span className="text-xs text-sky-800 font-semibold">{originDepot.name}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    originLogisticsMethod === 'depot_loading' ? 'border-[#15385E] bg-[#15385E]' : 'border-slate-300'
                  }`}>
                    {originLogisticsMethod === 'depot_loading' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Bring your vehicle, ute, or hire van directly to our secure facility. Back straight into a ground-level bay and load directly into your container.
                </p>

                {/* Depot Address & Info Card */}
                <div className="p-3 bg-white rounded-xl border border-sky-200/80 mb-3 space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-[#15385E] shrink-0 mt-0.5" />
                    <span className="font-semibold">{originDepot.address}, {originDepot.suburb} {originDepot.state} {originDepot.postcode}</span>
                  </div>
                  {originDistanceKm !== undefined && (
                    <div className="text-[11px] text-slate-500 pl-5">
                      Approximately {originDistanceKm} km road driving from {originPostcode.suburb}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-5">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Mon–Fri: 7:00 AM – 5:00 PM · Sat: 8:00 AM – 2:00 PM</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15385E] shrink-0" />
                    <span>Zero initial delivery fee &amp; zero pickup fee</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[#15385E] font-semibold">Delivery Fee</span>
                <span className="font-black text-[#15385E] text-sm">One delivery fee saved</span>
              </div>
            </div>
          )}
        </div>

        {/* Why Portabox Depot Storage Beats Traditional Self-Storage - Only shown when depot loading is applicable */}
        {serviceType !== 'storage_at_place' && (
          <TraditionalStorageComparison
            variant="compact"
            className="mt-4"
            defaultExpanded={originLogisticsMethod === 'depot_loading'}
          />
        )}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A: Home Redelivery (Green Focus) */}
            <div
              onClick={() => onSelectDestinationLogistics('home_delivery')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                destinationLogisticsMethod === 'home_delivery'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-emerald-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      destinationLogisticsMethod === 'home_delivery' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        Deliver to Address
                      </h4>
                      <span className="text-xs text-slate-500">
                        {isStorageFacility ? `Redelivery to ${originPostcode.suburb}` : `Delivery to ${destSuburbLabel}`}
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    destinationLogisticsMethod === 'home_delivery' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}>
                    {destinationLogisticsMethod === 'home_delivery' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {isStorageFacility
                    ? 'When you finish storing, we redeliver the full container directly to your home address, let you unpack, and retrieve the empty container.'
                    : `We deliver the container directly to your address in ${destSuburbLabel} and return to pick up the empty container once unpacked.`}
                </p>

                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Unpack comfortably at your home address</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Container picked up once unpacked</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Delivery Fee</span>
                <span className={`font-bold ${destinationLogisticsMethod === 'home_delivery' ? 'text-emerald-700' : 'text-slate-900'}`}>Standard Delivery Rates</span>
              </div>
            </div>

            {/* Option B: Depot Unloading (Blue Focus) */}
            <div
              onClick={() => onSelectDestinationLogistics('depot_loading')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                destinationLogisticsMethod === 'depot_loading'
                  ? 'border-[#15385E] bg-sky-50/40 ring-2 ring-[#15385E] shadow-sm'
                  : 'border-slate-200 bg-white hover:border-sky-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      destinationLogisticsMethod === 'depot_loading' ? 'bg-[#15385E] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">
                          Unload at Portabox Depot
                        </h4>
                        <span className="bg-sky-100 text-[#15385E] border border-sky-200 text-[10px] font-black px-1.5 py-0.5 rounded">
                          SAVE 2 LEGS
                        </span>
                      </div>
                      <span className="text-xs text-sky-800 font-semibold">{destDepotToUse.name}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    destinationLogisticsMethod === 'depot_loading' ? 'border-[#15385E] bg-[#15385E]' : 'border-slate-300'
                  }`}>
                    {destinationLogisticsMethod === 'depot_loading' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {isStorageFacility
                    ? 'When your storage term ends, drive in to the depot, unpack your container straight into your vehicle, and leave without paying redelivery or collection fees.'
                    : `Drive in to the destination ${destDepotToUse.name} to unpack your container directly into your vehicle. No local delivery or retrieval fees at destination.`}
                </p>

                {/* Destination Depot Details */}
                <div className="p-3 bg-white rounded-xl border border-sky-200/80 mb-3 space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-[#15385E] shrink-0 mt-0.5" />
                    <span className="font-semibold">{destDepotToUse.address}, {destDepotToUse.suburb} {destDepotToUse.state}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-5">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Mon–Fri: 7:00 AM – 5:00 PM · Sat: 8:00 AM – 2:00 PM</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#15385E] shrink-0" />
                    <span>Eliminates redelivery fee &amp; container collection fee</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[#15385E] font-semibold">Delivery Fee</span>
                <span className="font-black text-[#15385E] text-sm">One delivery fee saved</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Recap Box */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="font-bold text-slate-900">Configured Logistics: </span>
          <span>
            {originLogisticsMethod === 'depot_loading' ? 'Self-load at Depot' : 'Home Delivery'}
            {' → '}
            {hasDestination
              ? (destinationLogisticsMethod === 'depot_loading' ? 'Self-unload at Depot' : 'Home Redelivery')
              : 'Container Stays at Place'}
          </span>
        </div>
        <div className="text-slate-600">
          {legsSavedCount > 0 ? (
            <span className="text-emerald-700 font-bold">
              Total {legsSavedCount} legs waived from delivery quote
            </span>
          ) : (
            <span>Full-service door-to-door delivery</span>
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
