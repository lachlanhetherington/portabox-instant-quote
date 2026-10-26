import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  ShieldCheck,
  Phone,
  Search,
  Clock,
  Compass,
  Truck,
  Building,
  ChevronRight,
  RotateCcw,
  Plus,
  Minus,
  Navigation,
  AlertCircle,
  Send,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  PORTABOX_DEPOTS,
  DepotLocation,
  searchPostcodes,
  getPostcodeRecord,
  PostcodeRecord,
} from '../data/australianPostcodes';
import { AppConfig } from '../types/quote';
import {
  evaluatePostcodeServiceTier,
  PostcodeTierEvaluation,
  DEFAULT_POSTCODE_SERVICE_TIERS,
} from '../services/postcodeServiceTierEngine';
import {
  getLocationBusinessHoursStatus,
  LocationHoursStatus,
  saveAfterHoursMessage,
} from '../services/businessHoursService';

interface CoverageAreaMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  initialPostcode?: string;
  onSelectPostcode?: (postcode: string) => void;
  onOpenMessageModal?: (depotId?: string, postcode?: string) => void;
}

// 4 Core Metropolitan Hubs (Adelaide, Sydney, Melbourne, Brisbane)
const ACTIVE_DEPOTS: DepotLocation[] = PORTABOX_DEPOTS.filter(
  (d) => d.id !== 'sunshine_coast'
);

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

// National center of Australia overview
const AUSTRALIA_NATIONAL_CENTER: google.maps.LatLngLiteral = {
  lat: -28.5,
  lng: 135.0,
};
const AUSTRALIA_NATIONAL_ZOOM = 4.3;

/**
 * Circle overlay on Google Map for 200 km service area around a depot
 */
interface CoverageCircleProps {
  center: google.maps.LatLngLiteral;
  radius: number;
  isSelected?: boolean;
}

const CoverageCircle: React.FC<CoverageCircleProps> = ({
  center,
  radius,
  isSelected = false,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const circle = new google.maps.Circle({
      map,
      center,
      radius,
      fillColor: isSelected ? '#15803d' : '#22c55e',
      fillOpacity: isSelected ? 0.22 : 0.14,
      strokeColor: isSelected ? '#166534' : '#16a34a',
      strokeWeight: isSelected ? 3 : 2,
      strokeOpacity: 0.9,
      clickable: false,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, center.lat, center.lng, radius, isSelected]);

  return null;
};

/**
 * Visual geodesic line connecting closest depot to searched location
 */
interface CoveragePolylineProps {
  path: google.maps.LatLngLiteral[];
  isWithin200Km: boolean;
}

const CoveragePolyline: React.FC<CoveragePolylineProps> = ({
  path,
  isWithin200Km,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length < 2) return;

    const polyline = new google.maps.Polyline({
      map,
      path,
      strokeColor: isWithin200Km ? '#16a34a' : '#d97706',
      strokeWeight: 3,
      strokeOpacity: 0.85,
      geodesic: true,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, path, isWithin200Km]);

  return null;
};

/**
 * On-map zoom in / zoom out floating control buttons
 */
const MapZoomControls: React.FC = () => {
  const map = useMap();

  return (
    <div className="absolute bottom-6 right-3 z-10 flex flex-col bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden divide-y divide-slate-100">
      <button
        type="button"
        onClick={() => {
          if (map) map.setZoom((map.getZoom() || 10) + 1);
        }}
        className="p-2 hover:bg-slate-50 text-slate-700 active:bg-slate-100 transition-colors cursor-pointer"
        title="Zoom In"
        aria-label="Zoom In"
      >
        <Plus className="w-4 h-4 text-[#15385E]" />
      </button>
      <button
        type="button"
        onClick={() => {
          if (map) map.setZoom((map.getZoom() || 10) - 1);
        }}
        className="p-2 hover:bg-slate-50 text-slate-700 active:bg-slate-100 transition-colors cursor-pointer"
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <Minus className="w-4 h-4 text-[#15385E]" />
      </button>
    </div>
  );
};

// Calculate geodesic distance in km between two lat/lng coordinates
const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const findClosestDepot = (lat: number, lng: number) => {
  let closest = ACTIVE_DEPOTS[0];
  let minDistance = Infinity;

  ACTIVE_DEPOTS.forEach((depot) => {
    const dist = calculateDistanceKm(lat, lng, depot.lat, depot.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = depot;
    }
  });

  return { depot: closest, distanceKm: minDistance };
};

/**
 * Camera controller for smooth pan and zoom
 */
interface MapControllerProps {
  target: { center: google.maps.LatLngLiteral; zoom: number; key: string } | null;
}

const MapController: React.FC<MapControllerProps> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target.center);
    map.setZoom(target.zoom);
  }, [map, target]);

  return null;
};

/**
 * Interactive Google Map with 200 km Coverage Boundaries and Zoom Functionality
 */
export const CoverageAreaMapModal: React.FC<CoverageAreaMapModalProps> = ({
  isOpen,
  onClose,
  config,
  initialPostcode = '',
  onSelectPostcode,
  onOpenMessageModal,
}) => {
  const [testQuery, setTestQuery] = useState(initialPostcode || '5061');
  const [selectedDepotId, setSelectedDepotId] = useState<string>('adelaide');
  const [mapType, setMapType] = useState<google.maps.MapTypeId | 'roadmap' | 'satellite'>('roadmap');
  const [cameraTarget, setCameraTarget] = useState<{
    center: google.maps.LatLngLiteral;
    zoom: number;
    key: string;
  } | null>(null);

  // Matched postcode record from comprehensive Australian dataset
  const [matchedRecord, setMatchedRecord] = useState<PostcodeRecord | null>(null);

  // Interactive clicked point on map
  const [clickedPoint, setClickedPoint] = useState<{
    lat: number;
    lng: number;
    closestDepot: DepotLocation;
    distanceKm: number;
    isWithin200Km: boolean;
  } | null>(null);

  // Prompt customer to contact us for custom options when clicking outside the 200km zone
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customContactName, setCustomContactName] = useState('');
  const [customContactPhone, setCustomContactPhone] = useState('');
  const [customContactNotes, setCustomContactNotes] = useState('');
  const [customServiceType, setCustomServiceType] = useState<'delivery' | 'sale' | 'relocation'>('delivery');
  const [customSubmitSuccess, setCustomSubmitSuccess] = useState(false);

  // Keep testQuery synchronized with initialPostcode if reopened
  useEffect(() => {
    if (initialPostcode) {
      setTestQuery(initialPostcode);
    }
  }, [initialPostcode]);

  // Lookup matched postcode record whenever query changes
  useEffect(() => {
    const clean = testQuery.trim();
    if (!clean) {
      setMatchedRecord(null);
      return;
    }

    // Try direct postcode record first
    const direct = getPostcodeRecord(clean);
    if (direct) {
      setMatchedRecord(direct);
      return;
    }

    // Otherwise try search
    const results = searchPostcodes(clean);
    if (results.length > 0) {
      setMatchedRecord(results[0]);
    } else {
      setMatchedRecord(null);
    }
  }, [testQuery]);

  // When matchedRecord changes, center map on user's location with a close zoom so they can see boundaries
  useEffect(() => {
    if (matchedRecord && isOpen) {
      setCameraTarget({
        center: { lat: matchedRecord.lat, lng: matchedRecord.lng },
        zoom: 9.5,
        key: `loc-${matchedRecord.postcode}-${Date.now()}`,
      });
    }
  }, [matchedRecord, isOpen]);

  if (!isOpen) return null;

  const tierConfig = config.postcodeServiceTiers || DEFAULT_POSTCODE_SERVICE_TIERS;

  // Evaluate current test query
  const evaluation: PostcodeTierEvaluation = evaluatePostcodeServiceTier(
    testQuery || '5061',
    tierConfig,
    false
  );

  const selectedDepot =
    ACTIVE_DEPOTS.find((d) => d.id === selectedDepotId) || ACTIVE_DEPOTS[0];

  const depotHoursStatus: LocationHoursStatus = getLocationBusinessHoursStatus(
    selectedDepot.id,
    config.locationBusinessHours,
    config.businessHours
  );

  const evaluatedDepotHours: LocationHoursStatus = getLocationBusinessHoursStatus(
    evaluation.closestDepot.id,
    config.locationBusinessHours,
    config.businessHours
  );

  // Quick camera presets
  const handleFocusNational = () => {
    setCameraTarget({
      center: AUSTRALIA_NATIONAL_CENTER,
      zoom: AUSTRALIA_NATIONAL_ZOOM,
      key: `national-${Date.now()}`,
    });
  };

  const handleFocusDepot = (depotId: string) => {
    const depot = ACTIVE_DEPOTS.find((d) => d.id === depotId);
    if (!depot) return;
    setSelectedDepotId(depotId);
    setCameraTarget({
      center: { lat: depot.lat, lng: depot.lng },
      zoom: 8.2, // 200 km circle fills viewport nicely at zoom 8
      key: `depot-${depotId}-${Date.now()}`,
    });
  };

  const handleFocusSearchedLocation = () => {
    if (matchedRecord) {
      setCameraTarget({
        center: { lat: matchedRecord.lat, lng: matchedRecord.lng },
        zoom: 10,
        key: `user-${matchedRecord.postcode}-${Date.now()}`,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#15385E] text-white flex items-center justify-between border-b border-sky-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5CC1EF]/20 border border-[#5CC1EF]/40 flex items-center justify-center text-[#5CC1EF] shrink-0">
              <Compass className="w-5 h-5 text-[#5CC1EF]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Portabox Coverage Areas Map
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Google Maps · Live Satellite &amp; Street Zoom
                </span>
              </div>
              <p className="text-xs text-slate-300">
                4 Core Metropolitan Hubs · 200 km Direct Service Areas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Search & Postcode Checker Bar */}
        <div className="p-3.5 sm:p-4 bg-sky-50/80 border-b border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-[#15385E]" />
            </div>
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Search any Australian suburb or postcode (e.g. 5061, 2000, 3000, 4000)..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-sky-200 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF] shadow-2xs"
            />
            {testQuery && (
              <button
                type="button"
                onClick={() => setTestQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick status pill for searched postcode */}
          <div className="flex items-center gap-2 text-xs font-bold w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">Active Zone:</span>
              {evaluation.isWithin200Km ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Direct Service Area (&le;200 km)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px]">
                  Outside 200 km Radius
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body: Google Map Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          {/* Postcode Result Banner */}
          <div
            className={`p-4 rounded-2xl border-2 transition-all ${
              evaluation.isWithin200Km
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
                : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-white ${
                    evaluation.isWithin200Km ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {evaluation.isWithin200Km ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900">
                        DIRECT SERVICE AREA · METRO ZONE (&le;200 KM)
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                        REGIONAL FREIGHT INQUIRY
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-700">
                      Postcode {evaluation.postcode} ({evaluation.suburb}, {evaluation.state})
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      · {evaluation.distanceKm} km from {evaluation.closestDepot.name}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold mt-1 text-slate-800 leading-snug">
                    {evaluation.isWithin200Km
                      ? 'Within our standard 200 km service area. Full direct delivery, moving, and storage container options available with horizontal level-lift zero-tilt transport.'
                      : `Location is ${evaluation.distanceKm} km from nearest depot (${evaluation.closestDepot.name}). Mobile container delivery operates within 200 km of our metro depots. Please call 1800 467 637 to inquire about regional container delivery or container purchases.`}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{evaluation.closestDepot.name} status:</span>
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        evaluatedDepotHours.isOutside
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {evaluatedDepotHours.isOutside
                        ? `After-Hours (${evaluatedDepotHours.nextOpenText})`
                        : `Open Now (${evaluatedDepotHours.localTimeFormatted})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                {evaluation.isWithin200Km ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectPostcode) onSelectPostcode(evaluation.postcode);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-xs uppercase tracking-wider border border-[#e6c338] shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Use {evaluation.postcode} in Quote</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${config.phone || '1800467637'}`}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#F7D347]" />
                      <span>Call {config.phone || '1800 467 637'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowCustomPrompt(true)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Custom Options</span>
                    </button>
                    {onOpenMessageModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenMessageModal(evaluation.closestDepot.id, evaluation.postcode);
                          onClose();
                        }}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs cursor-pointer hidden sm:block"
                      >
                        Message Us
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Depot Focus Presets Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <span className="font-extrabold text-[#15385E] text-xs shrink-0 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-[#5CC1EF]" />
                <span>Zoom To:</span>
              </span>

              <button
                type="button"
                onClick={handleFocusNational}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
              >
                🗺️ All Australia
              </button>

              {ACTIVE_DEPOTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleFocusDepot(d.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                    selectedDepotId === d.id
                      ? 'bg-[#15385E] text-white border-[#15385E] shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                  }`}
                >
                  📍 {d.name.replace(' Depot', '')} (200 km)
                </button>
              ))}

              {matchedRecord && (
                <button
                  type="button"
                  onClick={handleFocusSearchedLocation}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-2xs whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-white" />
                  <span>{matchedRecord.suburb} ({matchedRecord.postcode})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-semibold shrink-0 hidden md:block">
              Pinch or scroll wheel to zoom · Drag to pan
            </div>
          </div>

          {/* ================= REAL GOOGLE MAP CONTAINER ================= */}
          <div className="relative w-full h-[460px] sm:h-[500px] lg:h-[540px] rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-slate-100">
            {/* Top-Left: Google Maps Map / Satellite Switcher */}
            <div className="absolute top-3 left-3 z-10 flex items-center bg-white/95 backdrop-blur-xs rounded-xl shadow-md border border-slate-200 overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMapType('roadmap')}
                className={`px-3.5 py-1.5 transition-colors cursor-pointer ${
                  mapType === 'roadmap'
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border-b-2 border-[#1A73E8] font-black'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-3.5 py-1.5 transition-colors cursor-pointer ${
                  mapType === 'satellite'
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border-b-2 border-[#1A73E8] font-black'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* Top-Right: Quick Reset to National View */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleFocusNational}
                className="px-3 py-1.5 bg-white/95 hover:bg-white text-slate-700 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                title="Reset to Full Australia Overview"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#15385E]" />
                <span className="text-[11px]">Overview</span>
              </button>
            </div>

            {/* Real Google Map Component */}
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                internalUsageAttributionIds={['gmp_git_agentskills_v1']}
                mapId="DEMO_MAP_ID"
                defaultCenter={AUSTRALIA_NATIONAL_CENTER}
                defaultZoom={AUSTRALIA_NATIONAL_ZOOM}
                gestureHandling={'greedy'}
                mapTypeId={mapType}
                mapTypeControl={false}
                fullscreenControl={false}
                streetViewControl={false}
                zoomControl={false}
                style={{ width: '100%', height: '100%' }}
                onClick={(e: MapMouseEvent) => {
                  if (!e.detail.latLng) return;
                  const lat = e.detail.latLng.lat;
                  const lng = e.detail.latLng.lng;
                  const { depot, distanceKm } = findClosestDepot(lat, lng);
                  const isWithin = distanceKm <= 200;
                  setClickedPoint({
                    lat,
                    lng,
                    closestDepot: depot,
                    distanceKm,
                    isWithin200Km: isWithin,
                  });
                  // If the customer clicks on the outside 200km zone, prompt customer to contact us for custom options
                  if (!isWithin) {
                    setShowCustomPrompt(true);
                  } else {
                    setShowCustomPrompt(false);
                  }
                }}
              >
                <MapController target={cameraTarget} />
                <MapZoomControls />

                {/* 200 km Service Coverage Area Circles & Markers for the 4 Metros */}
                {ACTIVE_DEPOTS.map((depot) => {
                  const isSelected = selectedDepotId === depot.id;
                  return (
                    <React.Fragment key={depot.id}>
                      {/* 200 km green circle overlay */}
                      <CoverageCircle
                        center={{ lat: depot.lat, lng: depot.lng }}
                        radius={200000} // exactly 200 km in meters
                        isSelected={isSelected}
                      />

                      {/* Custom Depot Pin */}
                      <AdvancedMarker
                        position={{ lat: depot.lat, lng: depot.lng }}
                        title={`${depot.name} - 200 km Service Area Hub`}
                        onClick={() => handleFocusDepot(depot.id)}
                      >
                        <div className="flex flex-col items-center cursor-pointer group">
                          <div
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black shadow-md border-2 whitespace-nowrap transition-transform group-hover:scale-105 flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[#15385E] text-[#F7D347] border-white ring-2 ring-[#5CC1EF]'
                                : 'bg-[#15385E] text-white border-white/90'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-[#F7D347] animate-pulse" />
                            <span>{depot.name}</span>
                          </div>
                          <div
                            className={`w-3 h-3 bg-[#15385E] rotate-45 -mt-1.5 border-r border-b ${
                              isSelected ? 'border-white' : 'border-white/90'
                            }`}
                          />
                        </div>
                      </AdvancedMarker>
                    </React.Fragment>
                  );
                })}

                {/* Geodesic route line connecting closest depot to searched location */}
                {matchedRecord && (
                  <CoveragePolyline
                    path={[
                      { lat: evaluation.closestDepot.lat, lng: evaluation.closestDepot.lng },
                      { lat: matchedRecord.lat, lng: matchedRecord.lng },
                    ]}
                    isWithin200Km={evaluation.isWithin200Km}
                  />
                )}

                {/* Searched location pin */}
                {matchedRecord && (
                  <AdvancedMarker
                    position={{ lat: matchedRecord.lat, lng: matchedRecord.lng }}
                    title={`${matchedRecord.suburb} (${matchedRecord.postcode})`}
                  >
                    <div className="flex flex-col items-center cursor-pointer">
                      <div
                        className={`px-3 py-1.5 rounded-2xl text-xs font-black shadow-xl border-2 flex items-center gap-1.5 whitespace-nowrap animate-bounce ${
                          evaluation.isWithin200Km
                            ? 'bg-emerald-600 text-white border-white ring-2 ring-emerald-300'
                            : 'bg-amber-500 text-white border-white ring-2 ring-amber-300'
                        }`}
                      >
                        <MapPin className="w-4 h-4 text-white" />
                        <span>
                          {matchedRecord.suburb} ({matchedRecord.postcode})
                        </span>
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rotate-45 -mt-2 border-r border-b border-white ${
                          evaluation.isWithin200Km ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </AdvancedMarker>
                )}

                {/* Interactive Click-to-Test Custom Point Pin */}
                {clickedPoint && (
                  <AdvancedMarker
                    position={{ lat: clickedPoint.lat, lng: clickedPoint.lng }}
                    title={`Clicked Point: ${clickedPoint.distanceKm} km to ${clickedPoint.closestDepot.name}`}
                  >
                    <div className="flex flex-col items-center cursor-pointer animate-in fade-in zoom-in-90 duration-150">
                      <div
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-xl border-2 flex items-center gap-1.5 whitespace-nowrap ${
                          clickedPoint.isWithin200Km
                            ? 'bg-emerald-700 text-white border-white'
                            : 'bg-amber-600 text-white border-white ring-2 ring-amber-300'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-white" />
                        <span>
                          {clickedPoint.isWithin200Km ? '✓ Serviced' : '! Outside 200 km'} · {clickedPoint.distanceKm} km from {clickedPoint.closestDepot.name.replace(' Depot', '')}
                        </span>
                        {!clickedPoint.isWithin200Km && (
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setShowCustomPrompt(true);
                            }}
                            className="ml-1.5 px-2 py-0.5 rounded-lg bg-white text-amber-900 font-extrabold hover:bg-amber-100 text-[10px] uppercase shadow-2xs cursor-pointer"
                          >
                            Custom Options
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setClickedPoint(null);
                            setShowCustomPrompt(false);
                          }}
                          className="ml-1 text-white/80 hover:text-white cursor-pointer"
                          title="Dismiss point"
                        >
                          ✕
                        </button>
                      </div>
                      <div
                        className={`w-3 h-3 rotate-45 -mt-1.5 border-r border-b border-white ${
                          clickedPoint.isWithin200Km ? 'bg-emerald-700' : 'bg-amber-600'
                        }`}
                      />
                    </div>
                  </AdvancedMarker>
                )}
              </Map>
            </APIProvider>

            {/* Custom Options Prompt for points clicked outside the 200 km zone */}
            {showCustomPrompt && (
              <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-20 bg-white/98 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-2xl border-2 border-amber-400 animate-in slide-in-from-bottom-3 duration-200 text-slate-800">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 font-black">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Outside 200 km Zone · Custom Options
                      </h4>
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                        {clickedPoint
                          ? `${clickedPoint.distanceKm} km from ${clickedPoint.closestDepot.name}`
                          : `${evaluation.distanceKm} km from ${evaluation.closestDepot.name}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomPrompt(false);
                      setCustomFormOpen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  This location is outside our standard 200 km local hire radius. Our regional logistics team provides <strong>custom container transport, container sales, or long-distance relocation</strong>. Please contact us for custom options.
                </p>

                {!customFormOpen ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`tel:${config.phone || '1800467637'}`}
                      className="flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#F7D347]" />
                      <span>Call {config.phone || '1800 467 637'}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setCustomFormOpen(true)}
                      className="flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl bg-[#15385E] hover:bg-[#1f4e82] text-white text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#5CC1EF]" />
                      <span>Inquire Online</span>
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customContactPhone.trim()) return;
                      const locText = clickedPoint
                        ? `Map Point (${clickedPoint.lat.toFixed(4)}, ${clickedPoint.lng.toFixed(4)}) · ${clickedPoint.distanceKm} km to ${clickedPoint.closestDepot.name}`
                        : `${evaluation.suburb} ${evaluation.postcode} · ${evaluation.distanceKm} km to ${evaluation.closestDepot.name}`;

                      saveAfterHoursMessage({
                        customerName: customContactName || 'Map Explorer',
                        customerMobile: customContactPhone,
                        message: `[CUSTOM 200KM+ INQUIRY - ${customServiceType.toUpperCase()}] ${customContactNotes || 'Customer clicked outside 200km zone and requested custom options.'} Location: ${locText}`,
                        suburbOrPostcode: clickedPoint ? `Map Point (${clickedPoint.distanceKm} km to ${clickedPoint.closestDepot.name})` : `${evaluation.suburb} ${evaluation.postcode}`,
                        source: 'Direct',
                      });

                      setCustomSubmitSuccess(true);
                      setTimeout(() => {
                        setCustomSubmitSuccess(false);
                        setCustomFormOpen(false);
                        setShowCustomPrompt(false);
                      }, 3500);
                    }}
                    className="space-y-2.5 pt-1"
                  >
                    {customSubmitSuccess ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Thank you! Our regional transport team will contact you shortly with custom options.</span>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Your Name"
                            value={customContactName}
                            onChange={(e) => setCustomContactName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                          />
                          <input
                            type="tel"
                            required
                            placeholder="Mobile / Phone *"
                            value={customContactPhone}
                            onChange={(e) => setCustomContactPhone(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500">Need:</span>
                          {[
                            { id: 'delivery', label: 'Regional Delivery' },
                            { id: 'sale', label: 'Buy Container' },
                            { id: 'relocation', label: 'Long Distance Move' },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setCustomServiceType(opt.id as any)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                                customServiceType === opt.id
                                  ? 'bg-[#15385E] text-white border-[#15385E]'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Tell us about your location and timing (optional)..."
                          value={customContactNotes}
                          onChange={(e) => setCustomContactNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF] resize-none"
                        />

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setCustomFormOpen(false)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Submit Custom Request</span>
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Map Legend (Showing 200 km Service Area in Green) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/30 border-2 border-emerald-600 inline-block" />
                <span>Service Zone (Within 200 km radius of Metro Depots)</span>
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3 h-3 rounded-full bg-[#15385E] border border-[#F7D347] inline-block" />
                <span>Portabox Metro Depot Facility</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Horizontal Zero-Tilt Mobile Delivery</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Zoom in with mouse wheel or double-click to see street-level boundary details
            </div>
          </div>

          {/* Selected Depot Card (4 Depots only: Adelaide, Melbourne, Sydney, Brisbane) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#15385E] text-white flex items-center justify-center font-black shrink-0">
                  <Building className="w-5 h-5 text-[#F7D347]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-extrabold text-[#15385E] text-base">
                      {selectedDepot.name}
                    </h5>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                      Metro Hub Facility ({selectedDepot.state})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedDepot.address}, {selectedDepot.suburb} {selectedDepot.postcode} · Phone:{' '}
                    <strong className="text-slate-800">{selectedDepot.phone}</strong>
                  </p>
                </div>
              </div>

              {/* Depot Status & Hours */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-500">Local Hours</div>
                  <div className="text-xs font-black text-[#15385E] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{depotHoursStatus.scheduleSummary}</span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                    depotHoursStatus.isOutside
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  {depotHoursStatus.isOutside ? 'After-Hours' : 'Open Now'}
                </span>
              </div>
            </div>

            {/* Quick Depot Selector Tabs */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-400 mr-1">Switch Depot:</span>
              {ACTIVE_DEPOTS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleFocusDepot(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDepotId === d.id
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {d.name.replace(' Depot', '')} ({d.state})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All serviced locations enjoy horizontal zero-tilt hydraulic level-lift mobile container delivery.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer transition-colors self-end sm:self-auto"
          >
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
};
