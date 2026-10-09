import { useCallback, useEffect, useState } from 'react';
import { Activity, ExternalLink, RefreshCw, Server, TriangleAlert } from 'lucide-react';
import { apiService } from '@/services/apiService';

type RenderService = {
  id: string;
  name: string;
  type: string;
  region?: string | null;
  url?: string | null;
  repo?: string | null;
  branch?: string | null;
  status: string;
  suspended?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RenderServicesResponse = {
  connected: boolean;
  source: string;
  fetchedAt: string;
  count: number;
  services: RenderService[];
  message?: string | null;
};

function readableDate(value?: string | null) {
  if (!value) return 'Not provided by API';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function RenderServicesCard() {
  const [data, setData] = useState<RenderServicesResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiService.getRenderServices();
      setData(result);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Could not load Render services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-5 shadow-lg">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Server size={19} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-slate-100">Live Render Services</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Read-only service inventory fetched from the Render API
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && <p className="py-5 text-sm text-slate-400">Fetching actual services from Render…</p>}

      {!loading && error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Could not load live Render services</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-xs text-rose-200/80">Check the backend deployment logs and its RENDER_API_KEY environment variable.</p>
          </div>
        </div>
      )}

      {!loading && data && !data.connected && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {data.message || 'Render API is not configured.'}
          <p className="mt-1 text-xs text-amber-100/70">Add RENDER_API_KEY to the backend service environment in Render, then redeploy.</p>
        </div>
      )}

      {!loading && data?.connected && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-xs text-slate-400">Services returned</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{data.count}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-xs text-slate-400">API connection</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-emerald-300"><Activity size={15} /> Connected</p>
            </div>
            <div className="col-span-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 sm:col-span-1">
              <p className="text-xs text-slate-400">Last fetched</p>
              <p className="mt-1 text-xs text-slate-200">{readableDate(data.fetchedAt)}</p>
            </div>
          </div>

          {data.services.length === 0 ? (
            <p className="rounded-lg border border-slate-700 p-4 text-sm text-slate-400">The API connection succeeded, but no services were returned for this account.</p>
          ) : (
            <div className="space-y-3">
              {data.services.map((service) => (
                <article key={service.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-slate-100">{service.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">{service.type} · {service.region || 'Region not provided'}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${service.suspended ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'}`}>
                      {service.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                    <p><span className="text-slate-300">Service ID:</span> <span className="break-all">{service.id}</span></p>
                    <p><span className="text-slate-300">Branch:</span> {service.branch || 'Not provided'}</p>
                    <p><span className="text-slate-300">Created:</span> {readableDate(service.createdAt)}</p>
                    <p><span className="text-slate-300">Updated:</span> {readableDate(service.updatedAt)}</p>
                  </div>
                  {service.url && (
                    <a href={service.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200">
                      Open service <ExternalLink size={13} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Source: Render API. “Configured” means the service is not marked suspended; it is not a live health check. CPU, memory, traffic, and billing metrics are not supplied by this service-inventory endpoint.
          </p>
        </>
      )}
    </section>
  );
}
