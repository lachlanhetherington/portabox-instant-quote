import React, { useEffect, useState } from 'react';
import { AlertTriangle, CloudUpload, Cloud } from 'lucide-react';
import { getAdminSettingsSyncStatus, type AdminSettingsSyncStatus } from '../../services/adminSettingsSync';

/** Shows whether admin pricing changes have reached the server (and so every customer). */
export const AdminSettingsSyncBadge: React.FC = () => {
  const [status, setStatus] = useState<AdminSettingsSyncStatus>(getAdminSettingsSyncStatus());

  useEffect(() => {
    const onSync = (e: Event) => setStatus((e as CustomEvent<AdminSettingsSyncStatus>).detail);
    window.addEventListener('portabox:admin-settings-sync', onSync);
    return () => window.removeEventListener('portabox:admin-settings-sync', onSync);
  }, []);

  if (status.state === 'idle') return null;

  if (status.state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-sky-200 bg-sky-950/90 border border-sky-800 px-2.5 py-1 rounded-lg">
        <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
        <span>Saving for customers…</span>
      </span>
    );
  }

  if (status.state === 'saved') {
    const time = new Date(status.at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    return (
      <span
        className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-800 px-2.5 py-1 rounded-lg"
        title="Saved on the server: every customer and staff member now gets these prices"
      >
        <Cloud className="w-3.5 h-3.5" />
        <span>Live for customers · {time}</span>
      </span>
    );
  }

  return (
    <span
      role="alert"
      className="flex items-center gap-1.5 text-xs font-bold text-amber-200 bg-amber-950/90 border border-amber-700 px-2.5 py-1 rounded-lg"
      title="This change is only in this browser. Customers still get the previous prices."
    >
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>{status.message}</span>
    </span>
  );
};
