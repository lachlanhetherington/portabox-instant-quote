import React, { useState } from 'react';
import { MessageSquare, Phone, Moon, Clock, MapPin, Sparkles, AlertCircle } from 'lucide-react';
import { AppConfig } from '../types/quote';
import {
  BusinessHoursConfig,
  checkBusinessHoursStatus,
  DEFAULT_BUSINESS_HOURS_CONFIG,
  getLocationBusinessHoursStatus,
  LocationHoursStatus,
  formatTime,
} from '../services/businessHoursService';
import {
  evaluatePostcodeServiceTier,
  PostcodeTierEvaluation,
} from '../services/postcodeServiceTierEngine';
import { AfterHoursTextModal } from './AfterHoursTextModal';

interface AreYouStuckBannerProps {
  className?: string;
  variant?: 'banner' | 'compact' | 'card';
  config?: AppConfig | BusinessHoursConfig;
  customerName?: string;
  customerMobile?: string;
  suburbOrPostcode?: string;
}

export const AreYouStuckBanner: React.FC<AreYouStuckBannerProps> = ({
  className = '',
  variant = 'banner',
  config,
  customerName,
  customerMobile,
  suburbOrPostcode,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract full app config or business hours config
  const appConfig = config && 'phone' in config ? (config as AppConfig) : undefined;
  const hoursConfig: BusinessHoursConfig =
    appConfig?.businessHours ||
    (config && 'startHour' in config ? (config as BusinessHoursConfig) : DEFAULT_BUSINESS_HOURS_CONFIG);

  // Location-specific status based on user's entered postcode
  const locationStatus: LocationHoursStatus = getLocationBusinessHoursStatus(
    suburbOrPostcode,
    appConfig?.locationBusinessHours,
    hoursConfig
  );

  // Postcode tier evaluation if postcode is entered
  const tierEvaluation: PostcodeTierEvaluation | null = suburbOrPostcode
    ? evaluatePostcodeServiceTier(suburbOrPostcode, appConfig?.postcodeServiceTiers)
    : null;

  return (
    <>
      <div
        className={`rounded-2xl border-2 border-[#DAD7D1] bg-sky-50/70 p-4 sm:p-4.5 transition-all shadow-2xs ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5CC1EF] text-[#15385E] shrink-0 shadow-xs relative">
              <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              {locationStatus.isOutside && (
                <span
                  title="Outside operating hours"
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[8px] text-white"
                >
                  🌙
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-[#15385E] tracking-tight">
                  Are you stuck?
                </h4>

                {/* Location Badge */}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#15385E] text-[#F7D347] flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>{locationStatus.depotConfig.depotName}</span>
                </span>

                {/* Live Hours Badge */}
                {locationStatus.isOutside ? (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <Moon className="w-2.5 h-2.5 text-amber-600" />
                    <span>After-Hours ({locationStatus.localTimeFormatted})</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Dispatch Online ({locationStatus.localTimeFormatted})</span>
                  </span>
                )}

                {/* Tier Badge if evaluated */}
                {tierEvaluation && tierEvaluation.tier === 2 && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-300 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                    <span>Tier 2: Container Sales Inquiries</span>
                  </span>
                )}
                {tierEvaluation && tierEvaluation.tier === 3 && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5 text-slate-600" />
                    <span>Tier 3: Unserviced Area</span>
                  </span>
                )}
              </div>

              {/* Sub-text reflecting location and hours */}
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-snug">
                {tierEvaluation && tierEvaluation.tier === 2 ? (
                  <span>
                    Your location ({suburbOrPostcode}) is in <strong>Tier 2 (Extended Regional)</strong>. Message our sales team to arrange container purchase!
                  </span>
                ) : tierEvaluation && tierEvaluation.tier === 3 ? (
                  <span>
                    Your location ({suburbOrPostcode}) is in <strong>Tier 3</strong>. Message us for regional transport questions.
                  </span>
                ) : locationStatus.isOutside ? (
                  <span>
                    {locationStatus.depotConfig.depotName} has wrapped up for the day. Message us anytime &mdash; our local fleet team replies first thing tomorrow morning.
                  </span>
                ) : (
                  <span>
                    {locationStatus.depotConfig.depotName} dispatch is online now. Message us and we will help you right away.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#15385E] hover:bg-[#112F4F] text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer border border-[#112F4F]"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#F7D347]" />
              <span>Message us now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pop-out modal customized to the user's location and business hours */}
      <AfterHoursTextModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={hoursConfig}
        locationDepotConfig={locationStatus.depotConfig}
        postcodeTierEvaluation={tierEvaluation || undefined}
        defaultCustomerName={customerName}
        defaultCustomerMobile={customerMobile}
        defaultSuburbOrPostcode={suburbOrPostcode}
        source="AreYouStuckBanner"
      />
    </>
  );
};
