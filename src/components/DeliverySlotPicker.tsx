import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, Sparkles, CheckCircle2, AlertCircle, TrendingDown, Truck } from 'lucide-react';
import { DeliverySlotWindow, DepotCalendarConfig, MetroHub } from '../types/quote';
import {
  getDepotDeliverySlots,
  signInWithGoogleCalendar,
  signOutCalendar,
  getCalendarAccessToken,
  initCalendarAuth,
  DEFAULT_DEPOT_CALENDARS,
} from '../services/googleCalendarService';
import { getSlotEfficiencyIncentive } from '../services/routingOptimizationService';
import { loadAppConfig } from '../services/pricingEngine';
import { User } from 'firebase/auth';

interface DeliverySlotPickerProps {
  metroHub: MetroHub;
  preferredDate: string;
  selectedSlot?: DeliverySlotWindow;
  onSelectSlot: (slot: DeliverySlotWindow) => void;
  depotCalendarConfig?: DepotCalendarConfig;
  efficiencyDiscountPercentage?: number;
  ecoIncentiveType?: 'dollar_discount' | 'emissions_only';
  className?: string;
}

export const DeliverySlotPicker: React.FC<DeliverySlotPickerProps> = ({
  metroHub,
  preferredDate,
  selectedSlot,
  onSelectSlot,
  depotCalendarConfig,
  efficiencyDiscountPercentage,
  ecoIncentiveType,
  className = '',
}) => {
  const currentAppConfig = loadAppConfig();
  const ecoIncentiveEnabled = currentAppConfig.enableEcoEfficiencyIncentive !== false;
  const effectiveDiscountPercent = efficiencyDiscountPercentage !== undefined
    ? efficiencyDiscountPercentage
    : currentAppConfig.efficiencyDiscountPercentage ?? 20;
  const effectiveIncentiveMode = ecoIncentiveType || currentAppConfig.ecoIncentiveType || 'dollar_discount';

  const [slots, setSlots] = useState<DeliverySlotWindow[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const activeDepot = depotCalendarConfig || DEFAULT_DEPOT_CALENDARS[metroHub] || DEFAULT_DEPOT_CALENDARS.Adelaide;

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initCalendarAuth(
      (authedUser) => {
        setUser(authedUser);
        setAuthError(null);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch slots whenever preferredDate or user auth changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingSlots(true);

    getDepotDeliverySlots(metroHub, preferredDate, activeDepot)
      .then((fetchedSlots) => {
        if (!isCancelled) {
          setSlots(fetchedSlots);
          // If no slot is selected or current selection is not available, default to first available
          if (!selectedSlot && fetchedSlots.length > 0) {
            const firstAvail = fetchedSlots.find((s) => s.available) || fetchedSlots[0];
            onSelectSlot(firstAvail);
          }
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingSlots(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [metroHub, preferredDate, user]);

  const handleGoogleConnect = async () => {
    try {
      setIsSigningIn(true);
      setAuthError(null);
      const res = await signInWithGoogleCalendar();
      setUser(res.user);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setAuthError('Could not connect Google Calendar. You can still select your slot below.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDisconnect = async () => {
    await signOutCalendar();
    setUser(null);
  };

  return (
    <div className={`p-5 rounded-2xl bg-white border border-[#5CC1EF]/40 shadow-2xs space-y-4 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-[#5CC1EF] shrink-0">
            <Clock className="w-4 h-4 text-[#15385E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-[#15385E]">
                Delivery Time Window
              </h4>
              <span className="text-[10px] font-bold text-[#15385E] bg-sky-100 px-2 py-0.5 rounded-full">
                {activeDepot.depotName}
              </span>
            </div>
          </div>
        </div>

        {/* Google Calendar Connection Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {user ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-800 font-bold">
                Google Calendar Active
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline ml-1 cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleConnect}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.66-5.17 3.66-9.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.09C3.27 21.41 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.26C.46 8.2.01 10.05.01 12s.45 3.8 1.25 5.41l4.02-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.59 1.26 6.59l4.02 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
                />
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sync with Google Calendar'}</span>
            </button>
          )}
        </div>
      </div>

      {authError && (
        <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{authError}</span>
        </p>
      )}

      {/* Slots grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {slots.map((slot) => {
          const isSelected = selectedSlot?.id === slot.id;
          const rawIncentive = getSlotEfficiencyIncentive(
            slot.id,
            undefined,
            effectiveDiscountPercent,
            effectiveIncentiveMode
          );
          const incentive = ecoIncentiveEnabled
            ? rawIncentive
            : { ...rawIncentive, isBestValue: false, discountAud: 0 };

          return (
            <button
              key={slot.id}
              type="button"
              disabled={!slot.available}
              onClick={() => onSelectSlot(slot)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                !slot.available
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  : isSelected
                  ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/40 shadow-xs'
                  : incentive.isBestValue
                  ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 text-slate-700 hover:shadow-2xs'
                  : 'border-[#DAD7D1] bg-white hover:border-[#5CC1EF] text-slate-700 hover:shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {slot.label}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-[#5CC1EF] text-[#15385E] flex items-center justify-center font-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Best Value / Eco Incentive Badge */}
                {incentive.isBestValue && (
                  <div className="mb-2 p-1.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      {effectiveIncentiveMode === 'emissions_only'
                        ? `🌱 ${incentive.co2SavedKg} kg CO₂ Saved`
                        : `Save $${incentive.discountAud} + 🌱 ${incentive.co2SavedKg} kg CO₂`}
                    </span>
                  </div>
                )}

                {/* Date Selected in the Window Box */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#15385E] mb-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-[#15385E]" />
                  <span>{preferredDate}</span>
                </div>

                <div className="text-sm font-black text-[#15385E]">
                  {slot.timeRange}
                </div>

                {incentive.isBestValue && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-[10px] text-emerald-800 font-medium leading-tight">
                      {effectiveIncentiveMode === 'emissions_only'
                        ? `🌱 Clustered route saves 26 km transit & avoids ${incentive.co2SavedKg} kg CO₂ emissions.`
                        : `🌱 Clustered route saves 26 km (${effectiveDiscountPercent}% discount: -$${incentive.discountAud}) & prevents ${incentive.co2SavedKg} kg CO₂.`}
                    </p>
                    <p className="text-[9px] text-[#15385E] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#5CC1EF] shrink-0" />
                      <span>Level-lift: zero tilting, items stay completely flat</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                {slot.available ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {slot.slotsRemaining > 0 ? `${slot.slotsRemaining} slots open` : 'Available'}
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Fully booked</span>
                )}

                {incentive.isBestValue ? (
                  <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded">
                    Eco-Route
                  </span>
                ) : slot.id === 'morning' && slot.available ? (
                  <span className="text-[9px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                    Popular
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
