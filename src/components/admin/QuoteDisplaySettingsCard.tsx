import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { usePublicSettings, savePublicSettings } from '../../services/quoteNumberService';

/**
 * CEO-only switches for what customers see on their quote. Saved on the server,
 * so a change applies to every visitor, not just this browser.
 */
export const QuoteDisplaySettingsCard: React.FC = () => {
  const { showDeliveryWindowNote } = usePublicSettings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setSaving(true);
    setError(null);
    try {
      await savePublicSettings({ showDeliveryWindowNote: !showDeliveryWindowNote });
    } catch (err: any) {
      setError(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all ${
        showDeliveryWindowNote ? 'bg-white border-emerald-300 ring-2 ring-emerald-100 shadow-sm' : 'bg-slate-50/80 border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl text-white shrink-0 ${showDeliveryWindowNote ? 'bg-[#00a9d7]' : 'bg-slate-400'}`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-[#0b2942]">Quote: delivery window note</h4>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  showDeliveryWindowNote
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                {showDeliveryWindowNote ? 'Active (ON)' : 'Off'}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                CEO only
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Shows “Delivery window &amp; date selected in Next Steps upon booking” on customer quotes and in shared quote messages.
              Applies to every customer.
            </p>
            {error && <p className="text-xs text-rose-700 font-bold mt-1">{error}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-60 ${
            showDeliveryWindowNote
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-[#0b2942] hover:bg-[#15385E] text-white shadow-xs'
          }`}
        >
          {saving ? 'Saving…' : showDeliveryWindowNote ? 'Turn OFF' : 'Turn ON'}
        </button>
      </div>
    </div>
  );
};
