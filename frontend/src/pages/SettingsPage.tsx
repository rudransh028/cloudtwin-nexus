import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'cloudtwin-nexus-settings';

type LocalSettings = {
  projectName: string;
  cloudProvider: string;
  interval: string;
};

export default function SettingsPage() {
  const [form, setForm] = useState<LocalSettings>({
    projectName: 'Nexus Production',
    cloudProvider: 'AWS',
    interval: 'Frequent (10s)',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setForm({ ...form, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.projectName.trim()) {
      setError('Project name is required.');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="text-slate-400" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure your Digital Twin environment. These values are stored in this browser only.</p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm">
        <h3 className="text-lg font-medium text-slate-200 mb-6 border-b border-slate-700 pb-2">General Configuration</h3>
        
        <form className="space-y-6" onSubmit={handleSave}>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">Project Name</label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">Primary Cloud Provider</label>
              <select
                value={form.cloudProvider}
                onChange={(e) => setForm({ ...form, cloudProvider: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option>AWS</option>
                <option>Google Cloud</option>
                <option>Azure</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">Data Collection Interval</label>
              <select
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option>Real-time (1s)</option>
                <option>Frequent (10s)</option>
                <option>Standard (1m)</option>
                <option>Relaxed (5m)</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3">
            {error && <span className="text-xs text-rose-400">{error}</span>}
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={14} /> Saved locally
              </span>
            )}
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
