import React, { useEffect, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import {
  listAdminSettingsHistory,
  restoreAdminSettingsVersion,
  type AdminSettingsVersion,
} from '../../services/adminSettingsSync';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Every saved version of the pricing settings, with Restore. */
export const AdminSettingsHistoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [versions, setVersions] = useState<AdminSettingsVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    listAdminSettingsHistory()
      .then(setVersions)
      .catch((err) => setError(err?.message || 'History unavailable'));
  }, []);

  const restore = async (v: AdminSettingsVersion) => {
    const ok = window.confirm(
      `Restore the settings saved ${fmt(v.savedAt)} by ${v.savedBy}?\n\nThey become the live prices for every customer straight away. The current settings stay in this history, so you can switch back.`
    );
    if (!ok) return;
    setRestoring(v.id);
    setError(null);
    try {
      await restoreAdminSettingsVersion(v.id);
      // Reload so every admin screen starts from the restored settings (none keeps an old copy to save over them)
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || 'The settings could not be restored');
      setRestoring(null);
    }
  };

  const describe = (v: AdminSettingsVersion) =>
    [v.hasPricing ? 'Pricing & settings' : null, v.hasCompetitorPricing ? 'Competitor prices' : null].filter(Boolean).join(' + ');

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/60 flex items-start justify-center overflow-y-auto p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Pricing history">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 my-6">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="flex items-center gap-2 text-base font-black text-[#0b2942]">
            <History className="w-5 h-5" /> Pricing history
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600">
            Every save of the pricing settings, newest first (last 50). Restoring makes that version the live prices for every customer, and is saved here too, so it can be undone.
          </p>
          {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
          {!versions && !error && <p className="text-sm text-slate-500">Loading…</p>}
          {versions && versions.length === 0 && <p className="text-sm text-slate-500">No saves yet.</p>}
          {versions && versions.length > 0 && (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {versions.map((v, i) => (
                <li key={v.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0b2942]">
                      {fmt(v.savedAt)}
                      {i === 0 && (
                        <span className="ml-2 text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {v.savedBy} · {describe(v)}
                      {v.restoredFrom ? ' · restored from an earlier save' : ''}
                    </div>
                  </div>
                  {i > 0 && (
                    <button
                      type="button"
                      disabled={restoring !== null}
                      onClick={() => restore(v)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-xs font-bold text-[#0b2942] cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {restoring === v.id ? 'Restoring…' : 'Restore'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
