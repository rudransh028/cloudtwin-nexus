import React from 'react';
import { Globe, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import { mockNetworkPaths } from '@/data/mockData';

export default function NetworkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Globe className="text-cyan-400" />
          Network Topology & Latency Paths
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Service-to-service transit latency, VPC egress, and choke point diagnosis.
        </p>
      </div>

      <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg">
        <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Activity size={18} className="text-cyan-400" /> Critical Traffic Transit Paths
        </h2>
        <div className="space-y-4">
          {mockNetworkPaths.map(path => {
            const lat = path.totalLatency ?? path.latency ?? path.totalLatencyMs ?? 50;
            const isHighLatency = lat > 100;
            const hopList = Array.isArray(path.hops)
              ? path.hops.map(h => typeof h === 'string' ? h : h.name)
              : ['Source', 'Target'];

            return (
              <div key={path.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{path.name || path.id}</span>
                    {isHighLatency && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle size={10} /> Elevated Latency
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-bold ${isHighLatency ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {lat}ms
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {path.status || (isHighLatency ? 'warning' : 'optimal')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {hopList.map((hop, idx) => (
                    <React.Fragment key={idx}>
                      <span className="px-2 py-1 rounded bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-700">
                        {hop}
                      </span>
                      {idx < hopList.length - 1 && (
                        <ArrowRight size={12} className="text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
