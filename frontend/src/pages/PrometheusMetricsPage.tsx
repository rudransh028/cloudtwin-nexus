import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, CircleHelp, Cpu, HardDrive, LockKeyhole,
  MemoryStick, Network, RefreshCw, Server, ShieldCheck, Wifi, XCircle,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const ENDPOINT_KEY = 'cloudtwin-prometheus-endpoint-v1';

type Resource = {
  instance: string;
  job?: string | null;
  up: boolean | null;
  cpuPercent?: number | null;
  memoryPercent?: number | null;
  diskPercent?: number | null;
  load1?: number | null;
  networkRxBytesPerSecond?: number | null;
  networkTxBytesPerSecond?: number | null;
  containerCount?: number | null;
  containerMemoryBytes?: number | null;
  containerCpuCoresPercent?: number | null;
  httpRequestsPerSecond?: number | null;
};
type TrendPoint = { timestamp: string; value: number };
type Insight = { severity: 'high' | 'medium' | 'info'; title: string; detail: string };
type Snapshot = {
  connected: boolean;
  source: string;
  endpointHost: string;
  observedAt: string;
  dataType: string;
  targetsTotal: number;
  targetsUp: number;
  targetsDown: number;
  averageCpuPercent: number | null;
  averageMemoryPercent: number | null;
  averageDiskPercent: number | null;
  containerMetricSeries: number;
  metricAvailability: Record<string, boolean>;
  resources: Resource[];
  history: { cpu: TrendPoint[]; memory: TrendPoint[] };
  insights: Insight[];
  notes: string[];
  credentialHandling: string;
};

function fmtPercent(value: number | null | undefined) { return value == null ? 'Unavailable' : `${value.toFixed(1)}%`; }
function fmtRate(value: number | null | undefined) {
  if (value == null) return '—';
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(2)} MiB/s`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB/s`;
  return `${value.toFixed(1)} B/s`;
}
function fmtBytes(value: number | null | undefined) {
  if (value == null) return '—';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index += 1; }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
function friendlyTime(value: string) {
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function MetricCard({ title, value, detail, icon: Icon, status }: {
  title: string; value: string; detail: string; icon: React.ElementType; status?: 'good' | 'warn' | 'neutral';
}) {
  const iconClass = status === 'good' ? 'text-emerald-300' : status === 'warn' ? 'text-amber-300' : 'text-cyan-300';
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/10">
    <div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-400">{title}</span><Icon size={18} className={iconClass}/></div>
    <div className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-100">{value}</div>
    <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
  </div>;
}

function ChartCard({ title, data, color, unavailable }: { title: string; data: TrendPoint[]; color: string; unavailable: boolean }) {
  const chartData = useMemo(() => data.map(point => ({
    time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: point.value,
  })), [data]);
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-100">{title}</h2><p className="mt-1 text-xs text-slate-500">Last hour · Prometheus query history</p></div><span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">60s step</span></div>
    {unavailable || !chartData.length ? <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-center"><Activity size={22} className="text-slate-600"/><p className="mt-3 text-sm text-slate-400">History unavailable</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-600">Configure Node Exporter and wait for enough samples. No chart values are fabricated.</p></div> :
      <div className="h-52 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false}/>
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} minTickGap={26} axisLine={false} tickLine={false}/>
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`}/>
        <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #334155', borderRadius: 10, color: '#e2e8f0' }} formatter={(value) => [`${Number(value).toFixed(1)}%`, title]} labelStyle={{ color: '#94a3b8' }}/>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls={false}/>
      </LineChart></ResponsiveContainer></div>}
  </section>;
}

export default function PrometheusMetricsPage() {
  const [endpoint, setEndpoint] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    try { setEndpoint(localStorage.getItem(ENDPOINT_KEY) || ''); } catch { /* browser storage is optional */ }
  }, []);

  const connect = async (event?: FormEvent) => {
    event?.preventDefault();
    setError(''); setNotice(''); setLoading(true);
    try {
      const trimmedEndpoint = endpoint.trim();
      if (!trimmedEndpoint) throw new Error('Enter your Prometheus query API base URL.');
      const response = await fetch(`${API_ORIGIN}/api/v1/prometheus/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: trimmedEndpoint,
          bearer_token: bearerToken.trim() || null,
          username: username.trim() || null,
          password: password || null,
          include_history: true,
        }),
      });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = body && typeof body === 'object' && 'detail' in body ? String((body as { detail?: unknown }).detail || '') : '';
        throw new Error(detail || `Metrics request failed (${response.status}).`);
      }
      const result = body as Snapshot;
      setSnapshot(result);
      try { localStorage.setItem(ENDPOINT_KEY, trimmedEndpoint); } catch { /* URL persistence is optional */ }
      setNotice(`Connected to ${result.endpointHost}. The displayed snapshot came from live Prometheus query results.`);
    } catch (e) {
      setSnapshot(null);
      setError(e instanceof Error ? e.message : 'Could not connect to Prometheus.');
    } finally { setLoading(false); }
  };

  const avg = (key: 'cpuPercent' | 'memoryPercent' | 'diskPercent') => {
    if (!snapshot) return null;
    const values = snapshot.resources.map(resource => resource[key]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };

  return <div className="space-y-6 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-800/70 bg-cyan-950/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200"><Activity size={13}/> Live telemetry connector</div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-100">Metrics Explorer</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Connect CloudTwin Nexus to a Prometheus-compatible query API to inspect actual host and container measurements, discover gaps, and surface transparent operational warnings.</p>
      </div>
      <button onClick={() => void connect()} disabled={loading || !endpoint.trim()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-700 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>{loading ? 'Querying metrics…' : 'Refresh metrics'}</button>
    </div>

    <form onSubmit={(event) => void connect(event)} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/10">
      <div className="flex items-start gap-3"><div className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-cyan-300"><Server size={20}/></div><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-100">Connect a metrics source</h2><p className="mt-1 text-xs leading-5 text-slate-500">Use your Prometheus base URL, including any path prefix. Examples: <span className="font-mono text-slate-400">https://metrics.example.com</span> or your hosted metrics query endpoint.</p></div><span className="hidden items-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500 sm:inline-flex"><LockKeyhole size={11}/> Secrets not saved</span></div>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Prometheus base URL</span><input value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://prometheus.example.com" type="url" required autoComplete="url" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-600"/><span className="mt-2 block text-[11px] leading-5 text-slate-600">The CloudTwin backend must be able to reach this endpoint. Public endpoints must use HTTPS.</span></label>
        <div className="flex items-end"><button type="submit" disabled={loading || !endpoint.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? <RefreshCw size={16} className="animate-spin"/> : <Wifi size={16}/>} {loading ? 'Connecting…' : 'Connect and load metrics'}</button></div>
      </div>
      <div className="mt-4 border-t border-slate-800 pt-4">
        <button type="button" onClick={() => setShowAdvanced(value => !value)} className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-200"><ShieldCheck size={14}/>{showAdvanced ? 'Hide' : 'Configure'} authentication (optional)</button>
        {showAdvanced && <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Bearer token</span><input type="password" value={bearerToken} onChange={event => setBearerToken(event.target.value)} autoComplete="new-password" placeholder="Optional API token" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-600"/><span className="mt-1 block text-[10px] text-slate-600">Use this or basic auth, not both.</span></label>
          <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Basic-auth username</span><input value={username} onChange={event => setUsername(event.target.value)} autoComplete="off" placeholder="Optional username / instance ID" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-600"/></label>
          <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Password / access token</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder="Optional secret" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-600"/></label>
        </div>}
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-600"><LockKeyhole size={13} className="mt-0.5 shrink-0"/>Credentials stay in page memory and are sent only to your CloudTwin backend for the current request. They are not stored in browser storage or the database. The endpoint URL alone may be saved locally for convenience.</p>
      </div>
    </form>

    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-900/80 bg-rose-950/30 p-4 text-sm text-rose-200"><XCircle size={18} className="mt-0.5 shrink-0"/><div><p className="font-semibold">Could not load live metrics</p><p className="mt-1 leading-6">{error}</p><p className="mt-2 text-xs text-rose-200/70">A public CloudTwin backend cannot access localhost on your laptop. Use a publicly reachable HTTPS query endpoint, or configure a trusted private-network deployment explicitly.</p></div></div>}
    {notice && snapshot && <div className="flex items-start gap-3 rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-4 text-sm text-emerald-200"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/><div className="flex-1"><p className="font-semibold">Live source connected</p><p className="mt-1 text-xs leading-5 text-emerald-100/70">{notice}</p><p className="mt-1 text-[10px] text-slate-500">Last queried: {friendlyTime(snapshot.observedAt)} · Source: {snapshot.source}</p></div></div>}

    {!snapshot && !error && <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5"><div className="flex items-center gap-2 text-cyan-300"><Cpu size={18}/><span className="text-sm font-semibold text-slate-200">Host metrics</span></div><p className="mt-3 text-sm leading-6 text-slate-500">Prometheus + Node Exporter provides CPU, memory, disk, load, and network measurements for configured hosts.</p></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5"><div className="flex items-center gap-2 text-cyan-300"><HardDrive size={18}/><span className="text-sm font-semibold text-slate-200">Container metrics</span></div><p className="mt-3 text-sm leading-6 text-slate-500">Configure cAdvisor or another container exporter to expose per-container resource usage.</p></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5"><div className="flex items-center gap-2 text-cyan-300"><ShieldCheck size={18}/><span className="text-sm font-semibold text-slate-200">Honest analysis</span></div><p className="mt-3 text-sm leading-6 text-slate-500">Warnings are based on observed series and explicit thresholds. No fake samples or unsupported failure probabilities.</p></div>
    </section>}

    {snapshot && <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Scrape targets up" value={`${snapshot.targetsUp} / ${snapshot.targetsTotal}`} detail={snapshot.targetsDown ? `${snapshot.targetsDown} target(s) report down` : snapshot.targetsTotal ? 'All returned targets report healthy' : 'No up series found'} icon={snapshot.targetsDown ? AlertTriangle : CheckCircle2} status={snapshot.targetsDown ? 'warn' : snapshot.targetsTotal ? 'good' : 'neutral'}/>
        <MetricCard title="CPU utilization" value={fmtPercent(snapshot.averageCpuPercent)} detail="Average of live host CPU series returned by Prometheus" icon={Cpu} status={snapshot.averageCpuPercent != null && snapshot.averageCpuPercent >= 85 ? 'warn' : 'neutral'}/>
        <MetricCard title="Memory utilization" value={fmtPercent(snapshot.averageMemoryPercent)} detail="Average of live host memory series returned by Prometheus" icon={MemoryStick} status={snapshot.averageMemoryPercent != null && snapshot.averageMemoryPercent >= 90 ? 'warn' : 'neutral'}/>
        <MetricCard title="Root disk usage" value={fmtPercent(snapshot.averageDiskPercent)} detail="Available only when root filesystem series are exposed" icon={HardDrive} status={snapshot.averageDiskPercent != null && snapshot.averageDiskPercent >= 90 ? 'warn' : 'neutral'}/>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><ChartCard title="CPU utilization" data={snapshot.history.cpu || []} color="#22d3ee" unavailable={!snapshot.metricAvailability.cpu}/><ChartCard title="Memory utilization" data={snapshot.history.memory || []} color="#a78bfa" unavailable={!snapshot.metricAvailability.memory}/></div>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="font-semibold text-slate-100">Discovered infrastructure</h2><p className="mt-1 text-xs leading-5 text-slate-500">Up to 100 target/resource rows from available Prometheus series. A dash means the corresponding series was not returned.</p></div><span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">{snapshot.resources.length} resources</span></div>
        {snapshot.resources.length === 0 ? <div className="p-8 text-center"><CircleHelp size={24} className="mx-auto text-slate-600"/><p className="mt-3 text-sm font-medium text-slate-300">Prometheus connected, but no matching resource series were found</p><p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-slate-500">Add scrape targets in Prometheus. Node Exporter is needed for host metrics; cAdvisor can provide Docker/container metrics.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Target / instance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">CPU</th><th className="px-4 py-3">Memory</th><th className="px-4 py-3">Disk</th><th className="px-4 py-3">Network RX / TX</th><th className="px-4 py-3">Containers</th></tr></thead><tbody>{snapshot.resources.map(resource => <tr key={`${resource.instance}-${resource.job || ''}`} className="border-t border-slate-800/80 transition hover:bg-slate-800/30"><td className="px-4 py-4"><div className="max-w-[280px] break-all font-medium text-slate-200">{resource.instance}</div><div className="mt-1 text-[10px] text-slate-600">{resource.job || 'Job unavailable'}</div></td><td className="px-4 py-4">{resource.up === true ? <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 size={13}/>Up</span> : resource.up === false ? <span className="inline-flex items-center gap-1.5 text-xs text-rose-300"><XCircle size={13}/>Down</span> : <span className="text-xs text-slate-600">Unknown</span>}</td><td className="px-4 py-4 font-mono text-xs text-slate-300">{fmtPercent(resource.cpuPercent)}</td><td className="px-4 py-4 font-mono text-xs text-slate-300">{fmtPercent(resource.memoryPercent)}</td><td className="px-4 py-4 font-mono text-xs text-slate-300">{fmtPercent(resource.diskPercent)}</td><td className="px-4 py-4 font-mono text-[11px] text-slate-400"><div>{fmtRate(resource.networkRxBytesPerSecond)} ↓</div><div className="mt-1">{fmtRate(resource.networkTxBytesPerSecond)} ↑</div></td><td className="px-4 py-4 font-mono text-xs text-slate-300">{resource.containerCount == null ? '—' : resource.containerCount.toLocaleString()}<div className="mt-1 text-[10px] text-slate-600">{fmtBytes(resource.containerMemoryBytes)}</div></td></tr>)}</tbody></table></div>}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-100">Operational intelligence</h2><p className="mt-1 text-xs leading-5 text-slate-500">Rule-based observations derived from the current live snapshot—not a trained model or guaranteed failure prediction.</p></div><span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500">Evidence-based</span></div>
        {snapshot.insights.length === 0 ? <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><CheckCircle2 size={18} className="text-emerald-300"/><div><p className="text-sm font-medium text-slate-200">No threshold warnings in this snapshot</p><p className="mt-1 text-xs text-slate-500">This means no configured rule fired on the returned series; it does not guarantee the infrastructure is risk-free.</p></div></div> : <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">{snapshot.insights.map((insight, index) => <div key={`${insight.title}-${index}`} className={`rounded-xl border p-4 ${insight.severity === 'high' ? 'border-rose-900/60 bg-rose-950/20' : insight.severity === 'medium' ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-800 bg-slate-950/50'}`}><div className="flex items-start gap-2.5"><AlertTriangle size={16} className={`mt-0.5 shrink-0 ${insight.severity === 'high' ? 'text-rose-300' : insight.severity === 'medium' ? 'text-amber-300' : 'text-cyan-300'}`}/><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-200">{insight.title}</h3><span className="text-[9px] uppercase tracking-wider text-slate-600">{insight.severity}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{insight.detail}</p></div></div></div>)}</div>}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-300"><Network size={14}/> Metric availability</div><div className="flex flex-wrap gap-2">{Object.entries(snapshot.metricAvailability).map(([key, available]) => <span key={key} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${available ? 'border-emerald-900/70 bg-emerald-950/30 text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-500'}`}>{available ? <CheckCircle2 size={11}/> : <CircleHelp size={11}/>} {key}: {available ? 'available' : 'not detected'}</span>)}</div><div className="mt-3 space-y-1">{snapshot.notes.map(note => <p key={note} className="text-[11px] leading-5 text-slate-600">• {note}</p>)}</div></section>
    </>}
  </div>;
}
