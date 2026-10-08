import React from 'react';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="text-slate-400" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure your Digital Twin environment.</p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm">
        <h3 className="text-lg font-medium text-slate-200 mb-6 border-b border-slate-700 pb-2">General Configuration</h3>
        
        <form className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">Project Name</label>
              <input type="text" defaultValue="Nexus Production" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
            </div>
            
            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">Primary Cloud Provider</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                <option>AWS</option>
                <option>Google Cloud</option>
                <option>Azure</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">Data Collection Interval</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                <option>Real-time (1s)</option>
                <option>Frequent (10s)</option>
                <option>Standard (1m)</option>
                <option>Relaxed (5m)</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-700 flex justify-end">
            <button type="button" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Save size={16} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
