import React from 'react';
import { Container, Server, AlertTriangle, Cpu, HardDrive } from 'lucide-react';
import { mockKubernetesNodes, mockKubernetesPods } from '@/data/mockData';

export default function KubernetesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Container className="text-cyan-400" />
          Kubernetes Intelligence
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Cluster health, pod distribution, resource saturation, and workload restart analytics.
        </p>
      </div>

      {/* Intelligence Callout */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-amber-300">Cluster Anomaly Detected</h4>
          <p className="text-xs text-slate-300 mt-1">
            Pod restart frequency on <span className="font-mono text-cyan-300">api-687489569-x5pq</span> increased 340% (CrashLoopBackOff). Node <span className="font-mono text-cyan-300">ip-10-0-3-88</span> is currently running at only 45% utilization.
          </p>
        </div>
      </div>

      {/* Nodes Section */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Server size={18} className="text-cyan-400" /> Worker Nodes ({mockKubernetesNodes.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockKubernetesNodes.map(node => {
            const cpu = node.cpuUsage ?? node.cpu ?? 50;
            const mem = node.memoryUsage ?? node.memory ?? 50;
            const isReady = node.status === 'Ready' || node.status === 'healthy';

            return (
              <div key={node.id} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-mono text-sm text-slate-200 font-semibold truncate pr-2">{node.name}</div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {isReady ? 'Ready' : 'NotReady'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span className="flex items-center gap-1"><Cpu size={12} /> CPU Usage</span>
                      <span className="font-mono">{cpu}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cpu > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${cpu}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span className="flex items-center gap-1"><HardDrive size={12} /> Memory Usage</span>
                      <span className="font-mono">{mem}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${mem > 80 ? 'bg-rose-500' : 'bg-cyan-500'}`} style={{ width: `${mem}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between text-xs text-slate-400">
                  <span>Scheduled Pods:</span>
                  <span className="font-semibold text-slate-200">{node.podCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pods Table */}
      <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg">
        <h2 className="text-base font-semibold text-slate-200 mb-4">Pod Fleet Inventory ({mockKubernetesPods.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900/60 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Pod Name</th>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">Node</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Restarts</th>
                <th className="px-4 py-3">CPU</th>
                <th className="px-4 py-3 rounded-tr-lg">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {mockKubernetesPods.map(pod => {
                const nodeName = pod.nodeName || pod.node || 'unassigned';
                const cpu = pod.cpuUsage ?? pod.cpu ?? 0;
                const mem = pod.memoryUsage ?? pod.memory ?? 0;
                const isFailed = pod.status === 'CrashLoopBackOff' || pod.status === 'Failed';

                return (
                  <tr key={pod.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-100">{pod.name}</td>
                    <td className="px-4 py-3 text-cyan-400">{pod.namespace}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{nodeName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isFailed ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {pod.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={pod.restarts > 3 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {pod.restarts}
                      </span>
                    </td>
                    <td className="px-4 py-3">{cpu}%</td>
                    <td className="px-4 py-3">{mem}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
