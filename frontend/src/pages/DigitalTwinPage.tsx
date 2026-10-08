import React, { useState } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Clock, 
  Radio, 
  Database, 
  RefreshCw, 
  ArrowRight, 
  Cpu, 
  GitBranch, 
  Activity, 
  Server,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { mockComponents, mockDashboard } from '@/data/mockData';

export default function DigitalTwinPage() {
  const [syncing, setSyncing] = useState(false);
  const [twinState, setTwinState] = useState<'synchronized' | 'forked'>('synchronized');
  const [selectedComp, setSelectedComp] = useState<string>(mockComponents[0].id);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1200);
  };

  const activeComp = mockComponents.find(c => c.id === selectedComp) || mockComponents[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="text-cyan-400" />
            Digital Twin Control Plane
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Software-defined virtual replica of the live AWS/Kubernetes infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTwinState(twinState === 'synchronized' ? 'forked' : 'synchronized')}
            className={`text-xs px-3.5 py-2 rounded-lg font-medium border transition-colors flex items-center gap-1.5 ${
              twinState === 'forked'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <GitBranch size={14} />
            {twinState === 'forked' ? 'Twin Forked (Sandbox Mode)' : 'Fork Twin for Simulation'}
          </button>

          <button 
            onClick={handleSync}
            disabled={syncing}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-cyan-950/50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing Telemetry...' : 'Sync with Real Cloud'}
          </button>
        </div>
      </div>

      {/* Real vs Twin Dual-Plane Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real Cloud Plane */}
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Real Cloud Infrastructure</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              AWS EKS Cluster
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Nodes</div>
              <div className="text-lg font-mono font-bold text-slate-100">{mockDashboard.nodeCount}</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Live Pods</div>
              <div className="text-lg font-mono font-bold text-slate-100">{mockDashboard.podCount}</div>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Live Traffic</div>
              <div className="text-lg font-mono font-bold text-cyan-400">{mockDashboard.requestRate.toLocaleString()} rps</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700/50">
            <span>Telemetry Source: Prometheus Server (15s scrape)</span>
            <span className="text-emerald-400 flex items-center gap-1"><Radio size={12} /> Streaming</span>
          </div>
        </div>

        {/* Digital Twin Plane */}
        <div className={`rounded-xl p-5 border shadow-lg relative overflow-hidden transition-all ${
          twinState === 'forked'
            ? 'bg-amber-950/20 border-amber-500/40'
            : 'bg-cyan-950/20 border-cyan-500/40'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${twinState === 'forked' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                CloudTwin Model (In-Memory Graph)
              </h3>
            </div>
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
              twinState === 'forked'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            }`}>
              {twinState === 'forked' ? 'Isolated Sandbox Copy' : 'Fully Synchronized'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Graph Nodes</div>
              <div className="text-lg font-mono font-bold text-slate-100">{mockComponents.length}</div>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Edges / Deps</div>
              <div className="text-lg font-mono font-bold text-slate-100">12</div>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Twin Drift</div>
              <div className="text-lg font-mono font-bold text-emerald-400">0.00%</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700/50">
            <span>Model Representation: NetworkX Directed Graph</span>
            <span className="text-slate-300 font-mono text-[11px]">Snapshot ID: snap-884b</span>
          </div>
        </div>
      </div>

      {/* Component Inventory & Detail Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Component Selector */}
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between">
            <span>Mirrored Components ({mockComponents.length})</span>
            <span className="text-xs text-slate-500 font-normal">Click to inspect</span>
          </h3>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {mockComponents.map(comp => {
              const isSelected = comp.id === selectedComp;
              const isWarning = comp.status === 'warning' || comp.status === 'critical';

              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedComp(comp.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-slate-100'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold truncate">{comp.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{comp.type} • {comp.region || 'ap-south-1'}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isWarning
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {comp.status}
                    </span>
                    <ArrowRight size={12} className={isSelected ? 'text-cyan-400' : 'text-slate-600'} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Component Twin State */}
        <div className="lg:col-span-2 bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-700/50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">{activeComp.name}</h3>
                <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {activeComp.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Virtual Representation & Telemetry Attributes</p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Monthly Model Spend</div>
              <div className="text-lg font-mono font-bold text-emerald-400">₹{(activeComp.cost || 1200).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Metric Comparison */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">CPU Load</span>
              <span className="text-xl font-mono font-bold text-slate-100">{activeComp.cpu}%</span>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${activeComp.cpu}%` }} />
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Memory Allocation</span>
              <span className="text-xl font-mono font-bold text-slate-100">{activeComp.memory}%</span>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${activeComp.memory}%` }} />
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ingress Rate</span>
              <span className="text-xl font-mono font-bold text-slate-100">{activeComp.requestRate.toLocaleString()} rps</span>
              <span className="text-[10px] text-slate-500 mt-1 block">p95 smoothed</span>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Internal Latency</span>
              <span className="text-xl font-mono font-bold text-slate-100">{activeComp.latency}ms</span>
              <span className="text-[10px] text-slate-500 mt-1 block">round-trip transit</span>
            </div>
          </div>

          {/* State Synchronization details */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" /> Twin Attributes & Replication Fidelity
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Provisioned Replicas</span>
                <span className="font-mono text-slate-200">{activeComp.replicas ?? 2} Pods</span>
              </div>
              <div>
                <span className="text-slate-500 block">Failure Domain</span>
                <span className="font-mono text-slate-200">Multi-AZ (Mumbai-1a, 1b)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Model Convergence</span>
                <span className="font-mono text-emerald-400">99.98% Accuracy</span>
              </div>
              <div>
                <span className="text-slate-500 block">Error Rate</span>
                <span className="font-mono text-slate-200">{activeComp.errorRate}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Telemetry Sync Loop</span>
                <span className="font-mono text-cyan-400">15s Pull cadence</span>
              </div>
              <div>
                <span className="text-slate-500 block">Simulation Hook</span>
                <span className="font-mono text-emerald-400">Attached</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
