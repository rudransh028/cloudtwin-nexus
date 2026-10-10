import React, { useEffect, useState } from 'react';
import { DollarSign, RefreshCw, CircleAlert, CheckCircle2 } from 'lucide-react';
import { apiService, RealCloudCosts } from '@/services/apiService';

export default function CostPage() {
  const [data, setData] = useState<RealCloudCosts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setData(await apiService.getRealCloudCosts()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not fetch actual cloud costs'); setData(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const money = (amount: number | null | undefined, currency: string | null | undefined) => amount == null ? 'Unavailable' : new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100"><DollarSign className="text-emerald-400"/> FinOps & Cost Intelligence</h1><p className="mt-1 text-sm text-slate-400">Actual billing data and provider forecasts only. No synthetic spend or savings figures.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div>
    <div className="rounded-xl border border-cyan-700/50 bg-cyan-950/20 p-4 text-xs text-cyan-100">Render metrics are connected separately. This page will not invent a bill: actual Render charges must be verified in Render Dashboard → Billing because this integration does not retrieve an invoice total.</div>
    {loading && <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">Fetching actual cost data…</div>}
    {error && !loading && <div className="rounded-xl border border-rose-800 bg-rose-950/30 p-5 text-sm text-rose-200"><CircleAlert className="mb-2"/>{error}</div>}
    {data && !loading && <>
      {data.connected ? <><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6"><div className="text-xs uppercase tracking-wider text-slate-400">Render month-to-date actual cost</div><div className="mt-3 text-3xl font-bold text-slate-100">{money(data.monthToDate, data.currency)}</div><p className="mt-2 text-xs text-slate-500">Period: {data.periodStart} to {data.periodEndExclusive} (end exclusive)</p></div><div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6"><div className="text-xs uppercase tracking-wider text-slate-400">Next-month cost forecast</div><div className="mt-3 text-3xl font-bold text-slate-100">{money(data.nextMonthForecast?.amount, data.nextMonthForecast?.currency || data.currency)}</div><p className="mt-2 text-xs text-slate-500">{data.nextMonthForecast ? `${data.nextMonthForecast.periodStart} to ${data.nextMonthForecast.periodEnd}` : (data.forecastMessage || 'Forecast not available')}</p></div></div><section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40"><div className="border-b border-slate-700 p-5"><h2 className="font-semibold text-slate-100">Actual Render spend by service</h2><p className="mt-1 text-xs text-slate-400">Source: Render billing · {data.dataFreshness}</p></div><div className="divide-y divide-slate-700/70">{data.services.length ? data.services.map(item => <div key={item.service} className="flex items-center justify-between gap-4 px-5 py-3"><span className="text-sm text-slate-200">{item.service}</span><span className="font-mono text-sm text-slate-100">{money(item.amount, item.currency)}</span></div>) : <p className="p-5 text-sm text-slate-400">No AWS service costs were returned for this period.</p>}</div></section><p className="flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={14}/> Values above came from Render billing, not from the demo cost model.</p></> : <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-5"><h2 className="font-semibold text-amber-200">Actual Render billing total is not available through this integration</h2><p className="mt-2 text-sm text-slate-300">{data.message}</p><p className="mt-3 text-xs text-slate-400">Open Render Dashboard → Billing to verify actual charges. No AWS account or AWS credentials are required for this Render-only setup.</p></div>}
    </>}
  </div>;
}
