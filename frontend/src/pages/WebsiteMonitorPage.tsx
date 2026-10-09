import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Globe, Loader2, Play, ShieldCheck, Sparkles, Timer, XCircle } from 'lucide-react';

type Finding = { severity: string; title: string; detail: string; recommendation: string };
type CheckResult = {
  url: string;
  checkedAt: string;
  statusCode: number | null;
  responseTimeMs: number;
  health: string;
  error: string | null;
  diagnosis: { provider: string; summary: string; findings: Finding[]; note?: string };
};

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const healthStyle: Record<string, string> = {
  up: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  slow: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  warning: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  degraded: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  down: 'text-rose-300 bg-rose-500/10 border-rose-500/30'
};

export default function WebsiteMonitorPage() {
  const [url, setUrl] = useState('https://cloudtwin-nexus-frontend.onrender.com');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<number | null>(null);

  const runCheck = async (target = url) => {
    if (!target.trim()) { setError('Enter a public website URL to begin.'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_ORIGIN}/api/v1/website-monitor/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: target.trim() })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.detail || `Monitor request failed (${response.status})`);
      const check = body as CheckResult;
      setResult(check);
      setUrl(check.url);
      setHistory(previous => [check, ...previous.filter(item => item.checkedAt !== check.checkedAt)].slice(0, 12));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the monitoring service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoCheck) {
      intervalRef.current = window.setInterval(() => { void runCheck(); }, 60000);
    }
    return () => { if (intervalRef.current !== null) window.clearInterval(intervalRef.current); };
  }, [autoCheck, url]);

  const submit = (event: FormEvent) => { event.preventDefault(); void runCheck(); };
  const latencyColor = !result ? 'text-slate-100' : result.responseTimeMs >= 2000 ? 'text-rose-300' : result.responseTimeMs >= 800 ? 'text-amber-300' : 'text-emerald-300';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-[0.2em] mb-2"><Activity size={15} /> Live external check</div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2"><Globe className="text-cyan-400" /> Website Health Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">Measure a public website's reachability, HTTP status and response time, then generate a diagnostic.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-300 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 cursor-pointer">
          <input type="checkbox" checked={autoCheck} onChange={e => setAutoCheck(e.target.checked)} className="accent-cyan-400" /> Recheck every 60 seconds while this page is open
        </label>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 md:p-5 flex flex-col md:flex-row gap-3 shadow-lg">
        <div className="relative flex-1"><Globe size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" aria-label="Public website URL" className="w-full bg-slate-950/80 border border-slate-700 rounded-lg py-3 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500" /></div>
        <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors">{loading ? <Loader2 size={17} className="animate-spin" /> : <Play size={16} fill="currentColor" />}{loading ? 'Checking…' : 'Check website'}</button>
      </form>
      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-start gap-2"><AlertTriangle size={17} className="shrink-0 mt-0.5" />{error}</div>}

      {result ? <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Activity size={18} />} label="Current status" value={result.health.toUpperCase()} sub={result.error || `HTTP ${result.statusCode ?? '—'}`} valueClass={result.health === 'up' ? 'text-emerald-300' : 'text-amber-300'} />
          <Metric icon={<Timer size={18} />} label="Response time" value={`${Math.round(result.responseTimeMs)} ms`} sub="Measured by backend request" valueClass={latencyColor} />
          <Metric icon={<ShieldCheck size={18} />} label="HTTP response" value={result.statusCode === null ? 'No response' : `${result.statusCode}`} sub={result.statusCode && result.statusCode < 400 ? 'Successful response / redirect' : 'Review status details'} valueClass="text-slate-100" />
          <Metric icon={<Clock3 size={18} />} label="Last checked" value={new Date(result.checkedAt).toLocaleTimeString()} sub={new Date(result.checkedAt).toLocaleDateString()} valueClass="text-slate-100" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-100 flex items-center gap-2"><Sparkles size={18} className="text-violet-300" /> AI health analysis</h2><p className="text-xs text-slate-500 mt-1">Evidence-based guidance from the measured check</p></div><span className={`text-[10px] uppercase tracking-wider border rounded-full px-2.5 py-1 ${result.diagnosis.provider === 'openai' ? 'text-violet-200 border-violet-500/30 bg-violet-500/10' : 'text-slate-300 border-slate-600 bg-slate-700/50'}`}>{result.diagnosis.provider === 'openai' ? 'AI model' : 'Baseline analysis'}</span></div>
            <p className="text-sm leading-6 text-slate-300">{result.diagnosis.summary}</p>
            {result.diagnosis.note && <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">{result.diagnosis.note}</p>}
            <div className="space-y-3">
              {result.diagnosis.findings.map((finding, index) => <div key={`${finding.title}-${index}`} className="rounded-lg border border-slate-700 bg-slate-950/50 p-4 space-y-2"><div className="flex items-center gap-2">{finding.severity === 'healthy' ? <CheckCircle2 size={16} className="text-emerald-300" /> : finding.severity === 'critical' ? <XCircle size={16} className="text-rose-300" /> : <AlertTriangle size={16} className="text-amber-300" />}<h3 className="text-sm font-semibold text-slate-100">{finding.title}</h3><span className="ml-auto text-[10px] uppercase text-slate-500">{finding.severity}</span></div><p className="text-sm text-slate-400">{finding.detail}</p><div className="text-xs text-cyan-200/90"><span className="font-semibold">Suggested next step: </span>{finding.recommendation}</div></div>)}
            </div>
            <p className="text-[11px] text-slate-500">A single HTTP check cannot confirm the health of every page, API, database, or user journey.</p>
          </section>

          <section className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-5 space-y-4">
            <div><h2 className="font-semibold text-slate-100">Recent measurements</h2><p className="text-xs text-slate-500 mt-1">Checks from this browser session</p></div>
            {history.length ? <div className="space-y-2">{history.map((item, index) => <div key={`${item.checkedAt}-${index}`} className="flex items-center gap-3 rounded-lg bg-slate-950/50 border border-slate-800 px-3 py-3"><span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.health === 'up' ? 'bg-emerald-400' : item.health === 'slow' || item.health === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`} /><div className="min-w-0 flex-1"><p className="text-sm text-slate-200 truncate">{new URL(item.url).hostname}</p><p className="text-[11px] text-slate-500">{new Date(item.checkedAt).toLocaleTimeString()} · HTTP {item.statusCode ?? '—'}</p></div><span className="font-mono text-xs text-slate-300">{Math.round(item.responseTimeMs)} ms</span><span className={`text-[10px] border rounded px-1.5 py-0.5 ${healthStyle[item.health] || healthStyle.warning}`}>{item.health}</span></div>)}</div> : <div className="text-sm text-slate-500 border border-dashed border-slate-700 rounded-lg p-8 text-center">Your check history will appear here.</div>}
            <div className="border-t border-slate-700 pt-4 text-xs text-slate-500 flex items-start gap-2"><ArrowUpRight size={15} className="shrink-0 mt-0.5" />Checks run from the CloudTwin backend, not your browser. Automatic rechecks run only while this page remains open.</div>
          </section>
        </div>
      </> : <div className="grid place-items-center min-h-64 rounded-xl border border-dashed border-slate-700 bg-slate-800/20 text-center p-8"><div className="max-w-md"><div className="mx-auto h-14 w-14 rounded-2xl bg-cyan-500/10 text-cyan-300 grid place-items-center mb-4"><Activity size={26} /></div><h2 className="text-lg font-semibold text-slate-200">Ready to run a live check</h2><p className="text-sm text-slate-500 mt-2">Enter a public URL and click Check website. The backend will measure a real HTTP response and analyze the result.</p></div></div>}
      <p className="text-[11px] text-slate-600">Safety: private, local, and non-public IP targets are blocked. Redirects are reported rather than followed. Do not use this tool to scan websites you do not own or have permission to test.</p>
    </div>
  );
}

function Metric({ icon, label, value, sub, valueClass }: { icon: React.ReactNode; label: string; value: string; sub: string; valueClass: string }) {
  return <div className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4"><div className="flex items-center gap-2 text-xs text-slate-400">{icon}<span>{label}</span></div><div className={`text-2xl font-bold mt-3 ${valueClass}`}>{value}</div><div className="text-xs text-slate-500 mt-1 truncate" title={sub}>{sub}</div></div>;
}
