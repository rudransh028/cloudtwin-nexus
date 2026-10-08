import React from 'react';
import { Server, Box, Layers, Cpu, Map, Network, Cloud } from 'lucide-react';

export function InfrastructureSummary() {
  const items = [
    { label: 'Services', count: 8, icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Containers', count: 18, icon: Box, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { label: 'Pods', count: 14, icon: Network, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Nodes', count: 3, icon: Server, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Regions', count: 1, icon: Map, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Clusters', count: 1, icon: Cpu, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  ];

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 shadow-lg shadow-slate-900/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Infrastructure Summary</h3>
          <p className="text-sm text-slate-400">Current running resources</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-lg border border-slate-700">
            <Cloud className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-slate-200">AWS</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            99.99% Uptime
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <div key={item.label} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center text-center">
            <div className={`p-3 rounded-full ${item.bg} ${item.color} mb-3`}>
              <item.icon className="w-6 h-6" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mb-1">{item.count}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
