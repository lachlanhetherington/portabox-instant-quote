import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Building,
  CheckCircle2,
  Moon,
  MessageSquare,
  Search,
  Sparkles,
  Phone,
  RotateCcw,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppConfig } from '../../types/quote';
import {
  LocationServiceHoursConfig,
  DEFAULT_LOCATION_SERVICE_HOURS,
  getLocationBusinessHoursStatus,
  formatTime,
  formatScheduleSummary,
} from '../../services/businessHoursService';
import { PORTABOX_DEPOTS } from '../../data/australianPostcodes';

interface LocationServiceHoursManagerProps {
  config: AppConfig;
  onUpdateLocationHours: (hoursMap: Record<string, LocationServiceHoursConfig>) => void;
  onSave?: () => void;
}

export const LocationServiceHoursManager: React.FC<LocationServiceHoursManagerProps> = ({
  config,
  onUpdateLocationHours,
  onSave,
}) => {
  const currentMap = config.locationBusinessHours || DEFAULT_LOCATION_SERVICE_HOURS;
  const [locations, setLocations] = useState<Record<string, LocationServiceHoursConfig>>({
    ...DEFAULT_LOCATION_SERVICE_HOURS,
    ...currentMap,
  });

  const [expandedDepotId, setExpandedDepotId] = useState<string>('adelaide');
  const [previewPostcode, setPreviewPostcode] = useState<string>('5061');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const DAYS_OF_WEEK = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
  ];

  const handleUpdateDepot = (depotId: string, updates: Partial<LocationServiceHoursConfig>) => {
    const updated = {
      ...locations,
      [depotId]: {
        ...locations[depotId],
        ...updates,
      },
    };
    setLocations(updated);
    onUpdateLocationHours(updated);
  };

  const handleToggleDay = (depotId: string, dayId: number) => {
    const currentDays = locations[depotId].daysOpen || [1, 2, 3, 4, 5];
    const newDays = currentDays.includes(dayId)
      ? currentDays.filter((d) => d !== dayId)
      : [...currentDays, dayId].sort();
    handleUpdateDepot(depotId, { daysOpen: newDays });
  };

  const handleSaveAll = () => {
    onUpdateLocationHours(locations);
    if (onSave) onSave();
    setSaveToast('Service hours for all Portabox locations saved successfully!');
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleResetDepot = (depotId: string) => {
    if (DEFAULT_LOCATION_SERVICE_HOURS[depotId]) {
      handleUpdateDepot(depotId, { ...DEFAULT_LOCATION_SERVICE_HOURS[depotId] });
      setSaveToast(`Reset ${locations[depotId].depotName} to default hours.`);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Preview reflection for test postcode
  const previewStatus = getLocationBusinessHoursStatus(
    previewPostcode || '5061',
    locations,
    config.businessHours
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {saveToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h4 className="text-base font-extrabold text-[#0b2942] flex items-center gap-2">
            <Building className="w-4 h-4 text-[#00c0f3]" />
            <span>Depot Location Operating Hours (Adelaide, Sydney, Melbourne & Brisbane)</span>
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Customize open/close times, operating days, and after-hours auto-responder responses for each Portabox facility. Changes immediately reflect in the customer &ldquo;Message Us Now&rdquo; pop-out based on their entered postcode.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00c0f3] hover:bg-[#00a6d2] text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-98 self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save All Location Hours</span>
        </button>
      </div>

      {/* ================= POSTCODE REFLECTION SIMULATOR ================= */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#112F4F] to-[#15385E] text-white space-y-3 shadow-sm border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#F7D347] text-[#1A1A1A]">
              CUSTOMER POSTCODE REFLECTION TESTER
            </span>
            <h5 className="text-sm font-extrabold text-white mt-1">
              Verify which location service hours reflect for a customer&apos;s postcode
            </h5>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-300 font-bold whitespace-nowrap">Enter Postcode:</label>
            <input
              type="text"
              value={previewPostcode}
              onChange={(e) => setPreviewPostcode(e.target.value)}
              placeholder="e.g. 5061, 2148, 3000..."
              className="w-28 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-600 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
            />
          </div>
        </div>

        {/* Live Reflection Preview Box */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#5CC1EF]">Matched Depot:</span>
              <span className="font-black text-white">{previewStatus.depotConfig.depotName} ({previewStatus.depotConfig.state})</span>
              <span className="text-slate-400">· Timezone: {previewStatus.depotConfig.timezone.replace('Australia/', '')}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                previewStatus.isOutside
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {previewStatus.isOutside ? 'Currently After-Hours' : 'Currently Open'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
            <div>
              <span className="text-slate-400">Local Time at Depot: </span>
              <strong className="text-white">{previewStatus.localTimeFormatted}</strong>
            </div>
            <div>
              <span className="text-slate-400">Schedule: </span>
              <strong className="text-white">{previewStatus.scheduleSummary}</strong>
            </div>
          </div>

          {/* Customer Facing Pop-out message */}
          <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 text-slate-200 mt-1">
            <span className="text-[10px] text-[#F7D347] font-bold block mb-0.5 uppercase tracking-wider">
              Customer &ldquo;Message Us Now&rdquo; Pop-Out Auto-Responder Copy:
            </span>
            <p className="italic text-[11px] leading-relaxed">
              &ldquo;{previewStatus.depotConfig.autoReplyText}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* ================= LOCATION ACCORDIONS ================= */}
      <div className="space-y-4">
        {PORTABOX_DEPOTS.map((depot) => {
          const cfg = locations[depot.id] || DEFAULT_LOCATION_SERVICE_HOURS[depot.id] || {
            depotId: depot.id,
            depotName: depot.name,
            suburb: depot.suburb,
            state: depot.state,
            timezone: depot.state === 'SA' ? 'Australia/Adelaide' : depot.state === 'QLD' ? 'Australia/Brisbane' : depot.state === 'VIC' ? 'Australia/Melbourne' : 'Australia/Sydney',
            phone: depot.phone,
            enabled: true,
            startHour: 8,
            startMinute: 30,
            endHour: 17,
            endMinute: 0,
            daysOpen: [1, 2, 3, 4, 5],
            autoReplyText: DEFAULT_LOCATION_SERVICE_HOURS[depot.id]?.autoReplyText || 'Thanks for contacting Portabox. We will get back to you in the morning.',
            forceAfterHoursForTesting: false,
          };

          const isExpanded = expandedDepotId === depot.id;
          const status = getLocationBusinessHoursStatus(depot.id, locations, config.businessHours);

          return (
            <div
              key={depot.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'border-[#00c0f3] bg-white shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Accordion Bar */}
              <div
                onClick={() => setExpandedDepotId(isExpanded ? '' : depot.id)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                      status.isOutside ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {status.isOutside ? <Moon className="w-5 h-5 text-amber-600" /> : <Clock className="w-5 h-5 text-emerald-600" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-extrabold text-sm sm:text-base text-[#0b2942]">
                        {cfg.depotName}
                      </h5>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {cfg.state}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          status.isOutside
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {status.isOutside ? 'After-Hours' : 'Open Now'}
                      </span>
                      {cfg.forceAfterHoursForTesting && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          Simulated Test Mode
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {status.scheduleSummary} · Local time: <strong>{status.localTimeFormatted}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#00c0f3] hidden sm:inline">
                    {isExpanded ? 'Collapse' : 'Edit Hours'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Accordion Form Content */}
              {isExpanded && (
                <div className="p-5 sm:p-6 bg-slate-50/70 border-t border-slate-100 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* Opening Time */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        Opening Time
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cfg.startHour}
                          onChange={(e) =>
                            handleUpdateDepot(depot.id, { startHour: Number(e.target.value) })
                          }
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                        >
                          {Array.from({ length: 15 }, (_, i) => i + 6).map((h) => (
                            <option key={h} value={h}>
                              {formatTime(h, 0).replace(':00', '')}
                            </option>
                          ))}
                        </select>
                        <select
                          value={cfg.startMinute}
                          onChange={(e) =>
                            handleUpdateDepot(depot.id, { startMinute: Number(e.target.value) })
                          }
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                        >
                          <option value={0}>:00</option>
                          <option value={15}>:15</option>
                          <option value={30}>:30</option>
                          <option value={45}>:45</option>
                        </select>
                      </div>
                    </div>

                    {/* Closing Time */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        Closing Time
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cfg.endHour}
                          onChange={(e) =>
                            handleUpdateDepot(depot.id, { endHour: Number(e.target.value) })
                          }
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                        >
                          {Array.from({ length: 15 }, (_, i) => i + 10).map((h) => (
                            <option key={h} value={h}>
                              {formatTime(h, 0).replace(':00', '')}
                            </option>
                          ))}
                        </select>
                        <select
                          value={cfg.endMinute}
                          onChange={(e) =>
                            handleUpdateDepot(depot.id, { endMinute: Number(e.target.value) })
                          }
                          className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                        >
                          <option value={0}>:00</option>
                          <option value={15}>:15</option>
                          <option value={30}>:30</option>
                          <option value={45}>:45</option>
                        </select>
                      </div>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        Facility Timezone
                      </label>
                      <select
                        value={cfg.timezone}
                        onChange={(e) => handleUpdateDepot(depot.id, { timezone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        <option value="Australia/Adelaide">Australia/Adelaide (ACST/ACDT)</option>
                        <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
                        <option value="Australia/Melbourne">Australia/Melbourne (AEST/AEDT)</option>
                        <option value="Australia/Brisbane">Australia/Brisbane (AEST Standard)</option>
                      </select>
                    </div>

                    {/* Direct Depot Phone */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        Depot Phone
                      </label>
                      <input
                        type="text"
                        value={cfg.phone}
                        onChange={(e) => handleUpdateDepot(depot.id, { phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                      />
                    </div>
                  </div>

                  {/* Operating Days */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Days Open for Deliveries & Customer Dispatch
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {DAYS_OF_WEEK.map((day) => {
                        const isOpen = (cfg.daysOpen || [1, 2, 3, 4, 5]).includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => handleToggleDay(depot.id, day.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isOpen
                                ? 'bg-[#0b2942] text-white shadow-xs'
                                : 'bg-white border border-slate-300 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Location Auto-Reply Text */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        {cfg.depotName} After-Hours Auto-Responder Text
                      </label>
                      <button
                        type="button"
                        onClick={() => handleResetDepot(depot.id)}
                        className="text-[11px] font-bold text-[#00c0f3] hover:underline cursor-pointer"
                      >
                        Reset to Default Copy
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={cfg.autoReplyText}
                      onChange={(e) => handleUpdateDepot(depot.id, { autoReplyText: e.target.value })}
                      className="w-full p-3 rounded-2xl bg-white border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] resize-none leading-relaxed"
                    />
                  </div>

                  {/* Test Toggle and Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.forceAfterHoursForTesting || false}
                        onChange={(e) =>
                          handleUpdateDepot(depot.id, { forceAfterHoursForTesting: e.target.checked })
                        }
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                      <span>Force Simulated &ldquo;Outside Business Hours&rdquo; Mode for {cfg.depotName}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateLocationHours(locations);
                        if (onSave) onSave();
                        setSaveToast(`Saved hours for ${cfg.depotName}!`);
                        setTimeout(() => setSaveToast(null), 3000);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#0b2942] hover:bg-[#15385E] text-white text-xs font-bold cursor-pointer transition-colors self-start sm:self-auto"
                    >
                      Save {cfg.depotName} Hours
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
