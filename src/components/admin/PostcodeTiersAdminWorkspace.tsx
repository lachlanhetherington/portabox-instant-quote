import React, { useState } from 'react';
import {
  MapPin,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Info,
  Phone,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  Sparkles,
  ShieldCheck,
  Building,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AppConfig } from '../../types/quote';
import {
  PostcodeServiceTierConfig,
  DEFAULT_POSTCODE_SERVICE_TIERS,
  evaluatePostcodeServiceTier,
  PostcodeTierEvaluation,
  ServiceTierLevel,
} from '../../services/postcodeServiceTierEngine';
import { PORTABOX_DEPOTS, AUSTRALIAN_POSTCODES } from '../../data/australianPostcodes';
import { getLocationBusinessHoursStatus } from '../../services/businessHoursService';
import { CoverageAreaMapModal } from '../CoverageAreaMapModal';

interface PostcodeTiersAdminWorkspaceProps {
  config: AppConfig;
  onUpdateTierConfig: (tierConfig: PostcodeServiceTierConfig) => void;
  onSave?: () => void;
}

export const PostcodeTiersAdminWorkspace: React.FC<PostcodeTiersAdminWorkspaceProps> = ({
  config,
  onUpdateTierConfig,
  onSave,
}) => {
  const currentTierConfig = config.postcodeServiceTiers || DEFAULT_POSTCODE_SERVICE_TIERS;
  const [formData, setFormData] = useState<PostcodeServiceTierConfig>({
    ...currentTierConfig,
    servicedStates: currentTierConfig.servicedStates || ['SA', 'VIC', 'NSW', 'QLD'],
    customOverrides: currentTierConfig.customOverrides || {},
  });

  const [testPostcode, setTestPostcode] = useState('3585'); // Swan Hill (Tier 2 sample)
  const [newOverridePostcode, setNewOverridePostcode] = useState('');
  const [newOverrideTier, setNewOverrideTier] = useState<ServiceTierLevel>(1);
  const [newOverrideNote, setNewOverrideNote] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const enableSunshineCoast = false;

  // Run live evaluation on test postcode
  const testEval: PostcodeTierEvaluation = evaluatePostcodeServiceTier(
    testPostcode || '5061',
    formData,
    enableSunshineCoast
  );

  const testDepotHours = getLocationBusinessHoursStatus(
    testEval.closestDepot.id,
    config.locationBusinessHours,
    config.businessHours
  );

  const handleApplyChanges = () => {
    onUpdateTierConfig(formData);
    if (onSave) onSave();
    setSaveSuccessMessage('Service Tier configurations saved successfully!');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleResetToDefaults = () => {
    setFormData({ ...DEFAULT_POSTCODE_SERVICE_TIERS });
    onUpdateTierConfig({ ...DEFAULT_POSTCODE_SERVICE_TIERS });
    setSaveSuccessMessage('Reset to factory default service tier settings.');
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const pc = newOverridePostcode.trim();
    if (!pc) return;

    const updated = {
      ...formData,
      customOverrides: {
        ...(formData.customOverrides || {}),
        [pc]: {
          tier: newOverrideTier,
          customNote: newOverrideNote.trim() || undefined,
        },
      },
    };

    setFormData(updated);
    onUpdateTierConfig(updated);
    setNewOverridePostcode('');
    setNewOverrideNote('');
  };

  const handleRemoveOverride = (pc: string) => {
    const updatedOverrides = { ...(formData.customOverrides || {}) };
    delete updatedOverrides[pc];
    const updated = { ...formData, customOverrides: updatedOverrides };
    setFormData(updated);
    onUpdateTierConfig(updated);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-extrabold text-[#0b2942]">
              Australian Postcode Coverage Areas (Metro &amp; Regional)
            </h3>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#00c0f3]/20 text-[#0b2942] border border-[#00c0f3]/40">
              National Dispatch Rules
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure delivery coverage rules across all Australian postcodes. Controls distance thresholds, service messages, container purchase policies, and map overlays.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsMapModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Preview Coverage Map</span>
          </button>
          <button
            type="button"
            onClick={handleApplyChanges}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00c0f3] hover:bg-[#00a6d2] text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Tier Settings</span>
          </button>
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Reset to original defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ================= 3 TIER RULES OVERVIEW CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1 Box */}
        <div className="p-4.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
              Tier 1
            </span>
            <span className="text-xs font-bold text-emerald-800">&le; {formData.tier1MaxKm} km</span>
          </div>
          <h4 className="text-sm font-black text-emerald-950">Serviceable Delivery Zones</h4>
          <p className="text-xs text-emerald-900 leading-relaxed">
            All customer addresses within <strong>{formData.tier1MaxKm} km</strong> from our 5 metro hub depots. Standard quote and level-lift delivery available.
          </p>
        </div>

        {/* Tier 2 Box */}
        <div className="p-4.5 rounded-2xl border-2 border-amber-300 bg-amber-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-950">
              Tier 2
            </span>
            <span className="text-xs font-bold text-amber-900">&gt; {formData.tier1MaxKm} km (4 States)</span>
          </div>
          <h4 className="text-sm font-black text-amber-950">Extended Regional (Container Sales)</h4>
          <p className="text-xs text-amber-900 leading-relaxed">
            All other locations inside <strong>{formData.servicedStates.join(', ')}</strong> beyond {formData.tier1MaxKm} km. Message offers container purchase options.
          </p>
        </div>

        {/* Tier 3 Box */}
        <div className="p-4.5 rounded-2xl border-2 border-slate-300 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
              Tier 3
            </span>
            <span className="text-xs font-bold text-slate-600">Other States</span>
          </div>
          <h4 className="text-sm font-black text-slate-900">Unserviced States & Territories</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            All other postcodes in WA, TAS, NT, ACT. Displays standard unserviced location notice.
          </p>
        </div>
      </div>

      {/* ================= EDITABLE TIER SETTINGS FORM ================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-2xs">
        <h4 className="text-base font-extrabold text-[#0b2942] flex items-center gap-2">
          <Building className="w-4 h-4 text-[#00c0f3]" />
          <span>Tier Thresholds & Customer Messaging Configuration</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Tier 1 Max Distance */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tier 1 Maximum Road Distance (km)
            </label>
            <div className="relative">
              <input
                type="number"
                min={50}
                max={500}
                value={formData.tier1MaxKm}
                onChange={(e) => setFormData({ ...formData, tier1MaxKm: Number(e.target.value) || 200 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                km from depot
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Locations within this distance from any active Portabox depot qualify for Tier 1 standard delivery.
            </p>
          </div>

          {/* Sales Inquiry Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Container Sales / Call-In Phone Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.salesInquiryPhone}
                onChange={(e) => setFormData({ ...formData, salesInquiryPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Displayed on Tier 2 & Tier 3 call-in buttons across the application.
            </p>
          </div>
        </div>

        {/* Tier 2 Message Editor */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Tier 2 Customer Notification Message
            </label>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  tier2Message: DEFAULT_POSTCODE_SERVICE_TIERS.tier2Message,
                })
              }
              className="text-[11px] font-bold text-[#00c0f3] hover:underline cursor-pointer"
            >
              Reset to User Prompt Default
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Displayed when a postcode is inside SA, VIC, NSW, or QLD but further than {formData.tier1MaxKm} km from a depot.
          </p>
          <textarea
            rows={2}
            value={formData.tier2Message}
            onChange={(e) => setFormData({ ...formData, tier2Message: e.target.value })}
            className="w-full p-3 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs sm:text-sm font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] resize-none leading-relaxed"
          />
        </div>

        {/* Tier 3 Message Editor */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Tier 3 Customer Notification Message
            </label>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  tier3Message: DEFAULT_POSTCODE_SERVICE_TIERS.tier3Message,
                })
              }
              className="text-[11px] font-bold text-[#00c0f3] hover:underline cursor-pointer"
            >
              Reset to User Prompt Default
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Displayed when a postcode is located in an unserviced state or territory (WA, TAS, NT, ACT).
          </p>
          <textarea
            rows={2}
            value={formData.tier3Message}
            onChange={(e) => setFormData({ ...formData, tier3Message: e.target.value })}
            className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00c0f3] resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* ================= LIVE POSTCODE TIER SIMULATOR & TESTER ================= */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#00c0f3]" />
              <span>Live Postcode Tier Simulator & Distance Tester</span>
            </h4>
            <p className="text-xs text-slate-400">
              Type any Australian postcode or suburb to preview distance calculations, assigned tier, and the customer message.
            </p>
          </div>

          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              value={testPostcode}
              onChange={(e) => setTestPostcode(e.target.value)}
              placeholder="e.g. 5061, 3585, 4700, 6000..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Live Simulator Result Card */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            testEval.tier === 1
              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-100'
              : testEval.tier === 2
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-100'
              : 'bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    testEval.tier === 1
                      ? 'bg-emerald-500 text-slate-900 font-black'
                      : testEval.tier === 2
                      ? 'bg-amber-400 text-slate-900 font-black'
                      : 'bg-slate-600 text-white font-black'
                  }`}
                >
                  TIER {testEval.tier}
                </span>
                <span className="text-sm font-extrabold text-white">
                  {testEval.suburb} ({testEval.state} {testEval.postcode})
                </span>
                <span className="text-xs text-slate-400">
                  · {testEval.distanceKm} km from {testEval.closestDepot.name}
                </span>
              </div>

              {/* Message Display */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-semibold">
                &ldquo;{testEval.message}&rdquo;
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Depot Operating Status:</span>
                  <strong className={testDepotHours.isOutside ? 'text-amber-400' : 'text-emerald-400'}>
                    {testDepotHours.isOutside ? 'After-Hours' : 'Open Now'} ({testDepotHours.localTimeFormatted})
                  </strong>
                </span>
              </div>
            </div>

            {/* Quick action preview */}
            <div className="shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Show On Map</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CUSTOM POSTCODE OVERRIDES TABLE ================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-extrabold text-[#0b2942] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00c0f3]" />
              <span>Manual Postcode Tier Overrides & Exceptions</span>
            </h4>
            <p className="text-xs text-slate-500">
              Force specific postcodes into Tier 1, 2, or 3 regardless of automated distance calculation (e.g. islands, mine sites, special commercial accounts).
            </p>
          </div>
        </div>

        {/* Add Override Form */}
        <form
          onSubmit={handleAddOverride}
          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-700 mb-1">Postcode</label>
            <input
              type="text"
              required
              value={newOverridePostcode}
              onChange={(e) => setNewOverridePostcode(e.target.value)}
              placeholder="e.g. 5222"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Force Assigned Tier</label>
            <select
              value={newOverrideTier}
              onChange={(e) => setNewOverrideTier(Number(e.target.value) as ServiceTierLevel)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
            >
              <option value={1}>Tier 1 (Serviceable)</option>
              <option value={2}>Tier 2 (Container Sale)</option>
              <option value={3}>Tier 3 (Unserviced)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Custom Note / Reason</label>
            <input
              type="text"
              value={newOverrideNote}
              onChange={(e) => setNewOverrideNote(e.target.value)}
              placeholder="e.g. Kangaroo Island special ferry required"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-4 bg-[#0b2942] hover:bg-[#15385E] text-white rounded-xl font-extrabold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#00c0f3]" />
              <span>Add Override</span>
            </button>
          </div>
        </form>

        {/* Overrides List */}
        {Object.keys(formData.customOverrides || {}).length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            No custom overrides configured. All Australian postcodes follow the automated 200 km rule and state boundaries.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Postcode</th>
                  <th className="p-3">Forced Tier</th>
                  <th className="p-3">Custom Note</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(formData.customOverrides || {}).map(([pc, ov]) => (
                  <tr key={pc} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{pc}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          ov.tier === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : ov.tier === 2
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        Tier {ov.tier}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{ov.customNote || '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(pc)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete override"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coverage Map Modal for Admin Preview */}
      <CoverageAreaMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        config={{
          ...config,
          postcodeServiceTiers: formData,
        }}
        initialPostcode={testPostcode}
      />
    </div>
  );
};
