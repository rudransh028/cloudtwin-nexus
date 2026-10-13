import React, { useCallback, useEffect, useState } from 'react';
import { Activity, MemoryStick, RefreshCw, Server, AlertTriangle, CheckCircle2, CircleAlert, ExternalLink } from 'lucide-react';
import { apiService } from '@/services/apiService';

function Metric({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: React.ElementType }) {
  return <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{title}</span><Icon size={18} className="text-cyan-400" /></div><div className="mt-3 text-3xl font-bold text-slate-100">{value}</div><p className="mt-2 text-xs text-slate-500">{detail}</p></div>;
}

export default function DashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof apiService.getAwsMetrics>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getAwsMetrics(1);
      setData(result);
      setError(null);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Could not retrieve AWS CloudWatch metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const instances = data?.instances ?? [];
  const cpuValues = instances.map(i => i.cpuAveragePercent).filter((v): v is number => v != null);
  const avgCpu = cpuValues.length ? cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length : null;
  const cpuCount = instances.filter(i => i.cpuLatestPercent != null).length;
  const observedAt = data?.observedAt ? new Date(data.observedAt).toLocaleString() : '—';
  const fmt = (v: number | null) => v == null ? 'Unavailable' : `${v.toFixed(1)}%`;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-100">Cloud Overview</h1><p className="mt-1 text-sm text-slate-400">Live EC2 inventory and CPU telemetry from AWS CloudWatch.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh live data</button>
    </div>

    <div className="rounded-xl border border-cyan-700/50 bg-cyan-950/20 p-4 text-sm text-cyan-100">
      <div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={17}/> AWS live-data mode</div>
      <p className="mt-1 text-xs text-cyan-200/80">EC2 inventory and CPU readings come from AWS APIs. Memory, request counts and latency are not inferred from CPU metrics.</p>
      {data && <p className="mt-2 text-xs text-slate-400">Source: {data.source} · Region: {data.region} · Observed at: {observedAt}</p>}
    </div>

    {loading && <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">Fetching AWS CloudWatch metrics…</div>}
    {error && !loading && <div className="rounded-xl border border-rose-800 bg-rose-950/30 p-5 text-sm text-rose-200"><div className="flex items-center gap-2 font-semibold"><CircleAlert size={18}/> AWS metrics unavailable</div><p className="mt-2">{error}</p><p className="mt-2 text-xs">Check the AWS credentials and region configured on the deployed backend.</p></div>}

    {data && !loading && <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Average EC2 CPU" value={fmt(avgCpu)} detail="Average of available CloudWatch instance averages" icon={Activity}/>
        <Metric title="Instances with CPU data" value={String(cpuCount)} detail="Instances with a recent CPU datapoint" icon={MemoryStick}/>
        <Metric title="Discovered EC2 instances" value={String(data.instanceCount)} detail={`Actual EC2 inventory in ${data.region}`} icon={Server}/>
        <Metric title="Instances awaiting metrics" value={String(instances.filter(i => i.cpuLatestPercent == null).length)} detail="CloudWatch may publish basic metrics every five minutes" icon={AlertTriangle}/>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40">
        <div className="border-b border-slate-700 p-5"><h2 className="font-semibold text-slate-100">Real EC2 CPU telemetry</h2><p className="mt-1 text-xs text-slate-400">Latest, average and peak CPU utilization from AWS CloudWatch.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Instance</th><th className="px-4 py-3">Type / Zone</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Latest CPU</th><th className="px-4 py-3">Average CPU</th><th className="px-4 py-3">Peak CPU</th></tr></thead>
          <tbody>{instances.map(i => <tr key={i.instanceId} className="border-t border-slate-700/70">
            <td className="px-4 py-3"><div className="font-medium text-slate-100">{i.name}</div><div className="font-mono text-[10px] text-slate-500">{i.instanceId}</div></td>
            <td className="px-4 py-3 text-slate-300">{i.instanceType}<div className="text-xs text-slate-500">{i.availabilityZone || 'Zone unavailable'}</div></td>
            <td className="px-4 py-3 text-slate-200">{i.state}</td><td className="px-4 py-3 font-mono text-slate-100">{fmt(i.cpuLatestPercent)}</td><td className="px-4 py-3 font-mono text-slate-100">{fmt(i.cpuAveragePercent)}</td><td className="px-4 py-3 font-mono text-slate-100">{fmt(i.cpuMaximumPercent)}</td>
          </tr>)}</tbody>
        </table></div>
        {instances.length === 0 && <p className="p-5 text-sm text-slate-400">No EC2 instances were returned for this region.</p>}
      </section>
      <p className="text-xs text-slate-500">{data.note}</p>
    </>}
  </div>;
}
