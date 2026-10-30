import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Truck,
  Warehouse,
  Home,
  ShieldAlert,
  ShieldCheck,
  Navigation,
  Sparkles,
  Info,
  X,
  MessageSquare,
} from 'lucide-react';
import { PORTABOX_IMAGES } from '../assets/images';
import {
  AUSTRALIAN_POSTCODES,
  calculateDrivingDistance,
  PostcodeRecord,
  searchPostcodes,
} from '../data/australianPostcodes';
import { AppConfig, BlockedPostcode, ServiceType } from '../types/quote';
import { getLocationPricingForHub, getMetroHubForPostcode, isPostcodeBlocked, calculateLegFuelSurcharge } from '../services/pricingEngine';

import { AreYouStuckBanner } from './AreYouStuckBanner';

interface Step2WhatProps {
  originPostcode: PostcodeRecord;
  destinationPostcode: PostcodeRecord | null;
  onSelectDestinationPostcode: (record: PostcodeRecord | null) => void;
  serviceType: ServiceType;
  onSelectServiceType: (service: ServiceType) => void;
  storagePlacement: 'my_place' | 'facility';
  onSelectStoragePlacement: (placement: 'my_place' | 'facility') => void;
  containerCount?: number;
  includeFuelSurcharge?: boolean;
  onToggleFuelSurcharge?: (enabled: boolean) => void;
  onChangeLocation: () => void;
  onContinue: () => void;
  onBack: () => void;
  config: AppConfig;
}

export const Step2What: React.FC<Step2WhatProps> = ({
  originPostcode,
  destinationPostcode,
  onSelectDestinationPostcode,
  serviceType,
  onSelectServiceType,
  storagePlacement,
  onSelectStoragePlacement,
  containerCount = 1,
  includeFuelSurcharge = true,
  onToggleFuelSurcharge,
  onChangeLocation,
  onContinue,
  onBack,
  config,
}) => {
  const isMoving = serviceType === 'moving' || serviceType === 'moving_storage';

  const [destQuery, setDestQuery] = useState(
    destinationPostcode ? `${destinationPostcode.postcode} ${destinationPostcode.suburb}` : ''
  );
  const [destSuggestions, setDestSuggestions] = useState<PostcodeRecord[]>([]);
  const [isDestOpen, setIsDestOpen] = useState(false);
  const [destBlockedNotice, setDestBlockedNotice] = useState<BlockedPostcode | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);

  // Sync input when destinationPostcode changes externally
  useEffect(() => {
    if (destinationPostcode) {
      setDestQuery(`${destinationPostcode.postcode} ${destinationPostcode.suburb}`);
    }
  }, [destinationPostcode]);

  const enableSunshineCoast = false;

  // Search logic for destination postcode/suburb
  useEffect(() => {
    if (destQuery.trim().length > 0) {
      const results = searchPostcodes(destQuery);
      setDestSuggestions(results);
    } else {
      setDestSuggestions(
        AUSTRALIAN_POSTCODES.filter(
          (p) => p.postcode !== originPostcode.postcode || p.suburb !== originPostcode.suburb
        ).slice(0, 6)
      );
    }
  }, [destQuery, originPostcode]);

  // Click outside to dismiss suggestions dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (destDropdownRef.current && !destDropdownRef.current.contains(e.target as Node)) {
        setIsDestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDestination = (record: PostcodeRecord) => {
    const blocked = isPostcodeBlocked(record.postcode, config);
    if (blocked) {
      setDestBlockedNotice(blocked);
      onSelectDestinationPostcode(null);
      setDestQuery(`${record.postcode} ${record.suburb}`);
      setIsDestOpen(false);
      return;
    }

    setDestBlockedNotice(null);
    setValidationError(null);
    onSelectDestinationPostcode(record);
    setDestQuery(`${record.postcode} ${record.suburb}`);
    setIsDestOpen(false);
  };

  const handleClearDestination = () => {
    onSelectDestinationPostcode(null);
    setDestQuery('');
    setDestBlockedNotice(null);
    setValidationError(null);
    setIsDestOpen(true);
  };

  // Road driving distance calculation (using actual road network, NOT as the crow flies)
  const movingDistanceKm = destinationPostcode
    ? calculateDrivingDistance(
        originPostcode.lat,
        originPostcode.lng,
        destinationPostcode.lat,
        destinationPostcode.lng,
        originPostcode.postcode,
        destinationPostcode.postcode
      )
    : null;

  // Origin and destination metro hubs
  const originHub = getMetroHubForPostcode(originPostcode, enableSunshineCoast);
  const originLocConfig = getLocationPricingForHub(config, originHub);
  const destHub = destinationPostcode ? getMetroHubForPostcode(destinationPostcode, enableSunshineCoast) : null;
  const isInterstateMove = destHub ? originHub !== destHub : false;
  const interstateKey = destHub ? `${originHub}->${destHub}` : '';
  const interstatePrice = isInterstateMove && config.interstateRates[interstateKey] ? config.interstateRates[interstateKey] : null;

  // Zone determination based on road driving distance
  const {
    zoneAMaxKm = 25,
    zoneARatePerKm = 0,
    zoneBMaxKm = 50,
    zoneBRatePerKm = 0,
    zoneCMaxKm = 75,
    zoneCRatePerKm = 0,
    zoneDMaxKm = 100,
    zoneDRatePerKm = 0,
    zoneERatePerKm = 0,
  } = originLocConfig.deliveryZones;

  let movingZone = 'A';
  let movingRatePerKm = zoneARatePerKm;
  let movingKmRatePerContainer = 0;
  let isZoneECall = false;

  if (movingDistanceKm !== null) {
    if (movingDistanceKm < zoneAMaxKm) {
      movingZone = 'A';
      movingRatePerKm = zoneARatePerKm;
      movingKmRatePerContainer = Math.round(movingDistanceKm * zoneARatePerKm);
    } else if (movingDistanceKm < zoneBMaxKm) {
      movingZone = 'B';
      movingRatePerKm = zoneBRatePerKm;
      movingKmRatePerContainer = Math.round(movingDistanceKm * zoneBRatePerKm);
    } else if (movingDistanceKm < zoneCMaxKm) {
      movingZone = 'C';
      movingRatePerKm = zoneCRatePerKm;
      movingKmRatePerContainer = Math.round(movingDistanceKm * zoneCRatePerKm);
    } else if (movingDistanceKm <= zoneDMaxKm) {
      movingZone = 'D';
      movingRatePerKm = zoneDRatePerKm;
      movingKmRatePerContainer = Math.round(movingDistanceKm * zoneDRatePerKm);
    } else {
      movingZone = 'E';
      movingRatePerKm = zoneERatePerKm;
      movingKmRatePerContainer = Math.round(movingDistanceKm * zoneERatePerKm);
      if (!isInterstateMove) {
        isZoneECall = true;
      }
    }
  }

  // Extra delivery charge assessed per container
  const effectiveContainerCount = containerCount > 0 ? containerCount : 1;
  const movingKmChargeTotal = movingKmRatePerContainer * effectiveContainerCount;

  // Fuel surcharge: Zone-based fixed rate OR $0.50/km travelled
  const legFuel = calculateLegFuelSurcharge({
    zone: movingZone,
    distanceKm: movingDistanceKm || 0,
    containerCount: effectiveContainerCount,
    config,
  });
  const fuelSurchargePerContainer = legFuel.ratePerContainer;
  const fuelSurchargeTotal = legFuel.totalAmount;

  const handleContinueClick = () => {
    if (isMoving && !destinationPostcode) {
      // Check if current destQuery matches any suggestion
      if (destSuggestions.length > 0) {
        handleSelectDestination(destSuggestions[0]);
        onContinue();
      } else {
        setValidationError('Please select your destination postcode or suburb before continuing.');
      }
      return;
    }
    onContinue();
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xs border-2 border-[#DAD7D1]">
      {/* Header kicker: #F7D347 Vibrant Gold with #1A1A1A text */}
      <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#1A1A1A] bg-[#F7D347] border border-[#e6c338] px-2.5 py-0.5 rounded-md font-['Cabinet_Grotesk',sans-serif]">
        INSTANT QUOTE
      </span>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1 mb-3">
        <h1 className="text-2xl sm:text-4xl font-black text-[#15385E] tracking-tight">
          What do you need?
        </h1>

        {/* Selected location pill */}
        <button
          onClick={onChangeLocation}
          className="flex items-center gap-1.5 text-xs font-bold text-[#15385E] bg-sky-50 hover:bg-sky-100 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer self-start sm:self-auto border border-[#5CC1EF]/40"
        >
          <span className="text-[#15385E] font-black">✓</span>
          <span>{originPostcode.suburb}, {originPostcode.state} {originPostcode.postcode}</span>
          <span className="text-[#15385E] ml-1 underline font-black">Change</span>
        </button>
      </div>

      {/* 2 Main Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 max-w-4xl">
        {/* Card 1: Moving */}
        <div
          onClick={() => {
            onSelectServiceType('moving');
            setValidationError(null);
          }}
          className={`group rounded-2xl border-2 transition-all p-5 flex flex-col justify-between cursor-pointer ${
            serviceType === 'moving' || serviceType === 'moving_storage'
              ? 'border-[#5CC1EF] bg-sky-50/30 shadow-md ring-2 ring-[#5CC1EF]/30'
              : 'border-[#DAD7D1] hover:border-slate-300 bg-white hover:shadow-xs'
          }`}
        >
          <div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-4 relative border border-[#DAD7D1]">
              <img
                src={PORTABOX_IMAGES.moving}
                alt="Portabox moving truck"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <h3 className="text-lg font-black text-[#15385E]">Moving</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Door-to-door moving, or load at our location and save delivery charges. Local or Interstate.
            </p>

            {/* Feature Badges: Moving Capabilities */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 text-[10px] font-bold border border-slate-200/80">
                <Truck className="w-3 h-3 text-[#15385E]" />
                <span>Door-to-Door</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 text-[10px] font-bold border border-slate-200/80">
                <Navigation className="w-3 h-3 text-[#15385E]" />
                <span>Local &amp; Interstate</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            className={`w-full mt-5 py-2.5 rounded-xl font-black text-xs tracking-wide transition-all cursor-pointer ${
              serviceType === 'moving' || serviceType === 'moving_storage'
                ? 'bg-[#15385E] text-white shadow-xs'
                : 'border border-[#DAD7D1] text-slate-700 group-hover:bg-slate-50'
            }`}
          >
            {serviceType === 'moving' || serviceType === 'moving_storage' ? 'Selected' : 'Select'}
          </button>
        </div>

        {/* Card 2: Storage */}
        <div
          onClick={() => {
            onSelectServiceType(storagePlacement === 'my_place' ? 'storage_at_place' : 'storage_facility');
            setValidationError(null);
          }}
          className={`group rounded-2xl border-2 transition-all p-5 flex flex-col justify-between cursor-pointer relative ${
            serviceType === 'storage_at_place' || serviceType === 'storage_facility'
              ? 'border-[#5CC1EF] bg-sky-50/30 shadow-md ring-2 ring-[#5CC1EF]/30'
              : 'border-[#DAD7D1] hover:border-slate-300 bg-white hover:shadow-xs'
          }`}
        >
          <div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 mb-4 relative border border-[#DAD7D1]">
              <img
                src={PORTABOX_IMAGES.storage}
                alt="Portabox storage customers"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-2 right-2 bg-[#F7D347] text-[#1A1A1A] border border-[#e6c338] font-black text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-md shadow-xs">
                MOST POPULAR
              </span>
            </div>
            <h3 className="text-lg font-black text-[#15385E]">Storage</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {storagePlacement === 'my_place'
                ? 'Store securely at your property for convenient on-site driveway access.'
                : 'Store at your location or ours. Load at our location and save delivery charges.'}
            </p>

            {/* Feature Badges: Loading & Storage Options */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 text-[10px] font-bold border border-slate-200/80">
                <Home className="w-3 h-3 text-[#15385E]" />
                <span>Your Home</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 text-[10px] font-bold border border-slate-200/80">
                <Warehouse className="w-3 h-3 text-[#15385E]" />
                <span>Our Location</span>
              </span>
              {storagePlacement === 'my_place' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-200 animate-in fade-in">
                  <span className="text-sky-600 font-extrabold">✓</span>
                  <span>Driveway Level-Lift Delivery</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className={`w-full mt-5 py-2.5 rounded-xl font-black text-xs tracking-wide transition-all cursor-pointer ${
              serviceType === 'storage_at_place' || serviceType === 'storage_facility'
                ? 'bg-[#15385E] text-white shadow-xs'
                : 'border border-[#DAD7D1] text-slate-700 group-hover:bg-slate-50'
            }`}
          >
            {serviceType === 'storage_at_place' || serviceType === 'storage_facility' ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>

      {/* Sub-question: If Storage is selected, where will it live? */}
      {(serviceType === 'storage_at_place' || serviceType === 'storage_facility') && (
        <div className="mt-8 p-5 bg-slate-50 rounded-2xl border-2 border-[#DAD7D1] flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-[#15385E]">Where do you want the container stored?</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {storagePlacement === 'my_place'
                  ? 'Keep the container at your property for convenient on-site driveway access.'
                  : 'We store your container in our secure location.'}
              </p>
            </div>

            <div className="inline-flex p-1 bg-white border border-[#DAD7D1] rounded-xl shadow-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  onSelectStoragePlacement('my_place');
                  onSelectServiceType('storage_at_place');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  storagePlacement === 'my_place'
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Your Home
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectStoragePlacement('facility');
                  onSelectServiceType('storage_facility');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  storagePlacement === 'facility'
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Our Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Destination Postcode Search Section (for Moving & Moving+Storage) */}
      {isMoving && (
        <div className="mt-8 p-6 bg-sky-50/70 rounded-3xl border-2 border-[#DAD7D1] relative animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-[#5CC1EF] text-[#15385E]">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#15385E]">
                Where are you moving to?
              </h3>
            </div>
          </div>

          {/* Blocked Postcode Alert */}
          {destBlockedNotice && (
            <div className="mt-3 mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Destination {destBlockedNotice.postcode} is restricted</p>
                <p className="mt-0.5 text-amber-800">{destBlockedNotice.reason}</p>
                <p className="mt-1 text-amber-700">Please choose another delivery location or contact 1800 467 637.</p>
              </div>
            </div>
          )}

          {/* Validation Error if user clicks continue without selecting */}
          {validationError && (
            <div className="mt-2 mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {validationError}
            </div>
          )}

          {/* Autocomplete Input Container */}
          <div className="mt-4 relative" ref={destDropdownRef}>
            <label className="block text-xs font-black text-[#15385E] uppercase tracking-wider mb-1.5">
              Destination suburb or postcode
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-[#15385E]" />
              </div>
              <input
                type="text"
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setIsDestOpen(true);
                  setDestBlockedNotice(null);
                  setValidationError(null);
                }}
                onFocus={() => setIsDestOpen(true)}
                placeholder="Search destination e.g. 3000 Melbourne, 2000 Sydney, 4000 Brisbane..."
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border-2 border-[#5CC1EF] text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#5CC1EF]/30 shadow-xs"
              />
              {destQuery && (
                <button
                  type="button"
                  onClick={handleClearDestination}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown (Identical to Step 1 Where) */}
            {isDestOpen && destSuggestions.length > 0 && (
              <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Suggested Destination Locations
                </div>
                {destSuggestions.map((p) => {
                  const isSelected = destinationPostcode?.postcode === p.postcode && destinationPostcode?.suburb === p.suburb;
                  return (
                    <button
                      key={`dest-${p.postcode}-${p.suburb}`}
                      type="button"
                      onClick={() => handleSelectDestination(p)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-sky-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-[#15385E]" />
                        <span className="text-sm font-semibold text-slate-900">
                          <span className="font-bold text-[#15385E]">{p.postcode}</span> {p.suburb}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-[#15385E]">
                        {p.state}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clean Destination Confirmation */}
          {destinationPostcode && !destBlockedNotice && (
            <div className="mt-4 p-4 rounded-2xl bg-white border border-[#5CC1EF]/50 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#5CC1EF] text-[#15385E] flex items-center justify-center font-black">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-bold text-[#15385E]">
                    Moving to {destinationPostcode.suburb}, {destinationPostcode.state} {destinationPostcode.postcode}
                  </p>
                  <p className="text-xs text-slate-500">
                    Destination confirmed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearDestination}
                className="text-xs text-slate-600 hover:text-[#15385E] font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Change
              </button>
            </div>
          )}

          {/* Optional Interim Storage Checkbox for Movers */}
          <div className="mt-5 pt-4 border-t border-sky-200/80">
            <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${
              serviceType === 'moving_storage'
                ? 'bg-sky-100/70 border-[#5CC1EF] ring-2 ring-[#5CC1EF]/30 shadow-xs'
                : 'bg-white border-[#DAD7D1] hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={serviceType === 'moving_storage'}
                onChange={(e) => {
                  onSelectServiceType(e.target.checked ? 'moving_storage' : 'moving');
                }}
                className="mt-0.5 w-4 h-4 rounded text-[#15385E] focus:ring-[#5CC1EF] cursor-pointer shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-[#15385E]">
                    Need interim storage between homes?
                  </span>
                  {serviceType === 'moving_storage' ? (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ Interim Storage Added
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We collect your container from {originPostcode.suburb}, store it securely at our location and deliver it to your new address when you&apos;re ready.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* 30-Day & 1-Year Price-Lock Guarantee Transparency */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#DAD7D1] shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-[#15385E]">
            <Sparkles className="w-4 h-4 text-[#008fbb]" />
            <h4 className="text-xs font-black uppercase tracking-wider">30-Day Price-Lock Guarantee</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Quoted prices are locked for 30 days from quote date. Changes to quotes that affect pricing will result in updated pricing and a new 30-day lock period. This does not include date changes or other non-pricing items.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#DAD7D1] shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-[#15385E]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider">1-Year Rate Freeze Guarantee</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            When a booking is made, prices on all attributes (container rental, delivery fees, ancillaries, etc.) are locked for 1 year. Beyond 1 year, delivery fees will default to live pricing and container rental prices can go up or down with a 30-day notification.
          </p>
        </div>
      </div>

      {/* Are You Stuck Banner */}
      <div className="mt-8">
        <AreYouStuckBanner
          config={config}
          suburbOrPostcode={`${originPostcode.postcode} ${originPostcode.suburb}`}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="mt-10 flex items-center justify-between pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-2 px-3 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* CTA Continue Button: #F7D347 Vibrant Gold with #1A1A1A text */}
        <button
          onClick={handleContinueClick}
          className="px-8 py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black rounded-2xl border-2 border-[#e6c338] flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-98"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 stroke-[3] text-[#1A1A1A]" />
        </button>
      </div>
    </div>
  );
};
