import React from 'react';
import { X, Activity, Server, AlertCircle, ShieldAlert } from 'lucide-react';
import { Component } from '@/lib/types';
import { cn } from '@/lib/utils';
import { mockDependencies } from '@/data/mockData';

interface ComponentDetailProps {
  component: Component | null;
  onClose: () => void;
}

export default function ComponentDetail({ component, onClose }: ComponentDetailProps) {
  if (!component) return null;

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'healthy':
      case 'active':
      case 'success':
        return 'text-emerald-400';
      case 'warning':
      case 'degraded':
        return 'text-amber-400';
      case 'critical':
      case 'error':
      case 'failed':
        return 'text-rose-400';
      default:
        return 'text-slate-400';
    }
  };

  const compId = component.id;
  const dependsOn = mockDependencies.filter(
    d => d.sourceId === compId || d.source === compId
  );
  const dependedBy = mockDependencies.filter(
    d => d.targetId === compId || d.target === compId
  );

  const cpuVal = component.metrics?.cpu ?? component.cpu ?? 0;
  const memVal = component.metrics?.memory ?? component.memory ?? 0;
  const reqVal = component.metrics?.requestRate ?? component.requestRate ?? 0;
  const latVal = component.metrics?.latency ?? component.latency ?? 0;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 shadow-2xl flex flex-col z-50 transform transition-transform duration-300">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/60">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{component.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", getStatusColor(component.status))}>
              {component.status}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{component.type}</span>
            {component.region && (
              <>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">{component.region}</span>
              </>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {component.status === 'warning' || component.status === 'critical' ? (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-semibold">Architecture Risk: </span>
              {component.name === 'PostgreSQL Primary'
                ? 'Identified as Single Point of Failure (SPOF). No automated multi-region failover configured.'
                : 'Component operating near provisioned thresholds. May cascade to downstream services under surge.'}
            </div>
          </div>
        ) : null}

        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" /> Real-Time Telemetry
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">CPU Usage</div>
              <div className="text-lg font-semibold text-slate-100">{cpuVal}%</div>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${cpuVal > 80 ? 'bg-rose-500' : cpuVal > 60 ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${cpuVal}%` }} />
              </div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Memory</div>
              <div className="text-lg font-semibold text-slate-100">{memVal}%</div>
              <div className="w-full bg-slate-700 h-1 rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${memVal > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${memVal}%` }} />
              </div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Throughput</div>
              <div className="text-lg font-semibold text-slate-100">{reqVal.toLocaleString()} req/s</div>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Avg Latency</div>
              <div className="text-lg font-semibold text-slate-100">{latVal}ms</div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server size={14} className="text-cyan-400" /> Dependency Graph
          </h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-400 mb-2 font-medium">Downstream Dependencies ({dependsOn.length})</div>
              {dependsOn.length > 0 ? (
                <ul className="space-y-2">
                  {dependsOn.map(d => (
                    <li key={d.id} className="text-xs text-slate-300 bg-slate-800/50 p-2.5 rounded border border-slate-700/40 flex justify-between items-center">
                      <span className="font-mono text-cyan-300">{d.targetId || d.target}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">{d.latency ?? 12}ms</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-xs text-slate-500 italic bg-slate-800/30 p-2 rounded">No downstream dependencies</div>}
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-2 font-medium">Inbound Callers ({dependedBy.length})</div>
              {dependedBy.length > 0 ? (
                <ul className="space-y-2">
                  {dependedBy.map(d => (
                    <li key={d.id} className="text-xs text-slate-300 bg-slate-800/50 p-2.5 rounded border border-slate-700/40 flex justify-between items-center">
                      <span className="font-mono text-emerald-300">{d.sourceId || d.source}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">{d.traffic ?? 1200} rps</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-xs text-slate-500 italic bg-slate-800/30 p-2 rounded">No inbound callers</div>}
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-cyan-400" /> Cost Attribution
          </h3>
          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/50 flex justify-between items-center">
            <div>
              <span className="text-xs text-slate-400 block">Estimated Spend</span>
              <span className="text-xs text-slate-500">Based on instance tier</span>
            </div>
            <span className="text-base font-bold text-emerald-400">₹{(component.cost ?? 1800).toLocaleString('en-IN')}/mo</span>
          </div>
        </section>
      </div>
    </div>
  );
}
