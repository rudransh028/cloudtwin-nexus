import React, { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, AlertCircle, ArrowRight, CheckCircle2, Cloud, CloudCog, FileUp, Globe,
  HardDrive, KeyRound, Layers3, Link2, Plus, RefreshCw, Server, ShieldCheck,
  Trash2, Wifi, XCircle,
} from 'lucide-react';

type Provider = 'render' | 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'prometheus';
type ProfileStatus = 'validated-once' | 'setup-required';
type FormValues = {
  name: string; apiKey: string; accountId: string; region: string; roleArn: string;
  subscriptionId: string; tenantId: string; clientId: string; projectId: string;
  clientEmail: string; endpoint: string; clusterName: string; context: string; namespace: string;
};
type Profile = {
  id: string; provider: Provider; name: string; reference: string; endpoint: string;
  region: string; status: ProfileStatus; createdAt: string; checkedAt?: string;
  serviceCount?: number; details: Record<string, string>;
};
type RenderService = { id?: string; name: string; type?: string; region?: string; suspended?: boolean | string; url?: string };
type RenderResult = { connected: boolean; source: string; message: string; checkedAt: string; serviceCountReturned: number; services: RenderService[]; paginationNote?: string };

const STORE_KEY = 'cloudtwin-nexus-connection-profiles-v1';
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const PROVIDERS: { id: Provider; name: string; code: string; description: string; status: string; icon: LucideIcon }[] = [
  { id: 'render', name: 'Render', code: 'REN', description: 'Validate an API key and inspect the account service inventory.', status: 'Live validation', icon: CloudCog },
  { id: 'aws', name: 'Amazon Web Services', code: 'AWS', description: 'Register an account and a read-only IAM role.', status: 'Setup profile', icon: Cloud },
  { id: 'azure', name: 'Microsoft Azure', code: 'AZ', description: 'Register a subscription and tenant.', status: 'Setup profile', icon: Layers3 },
  { id: 'gcp', name: 'Google Cloud', code: 'GCP', description: 'Register a project or extract metadata from a service-account file.', status: 'Setup profile', icon: Globe },
  { id: 'kubernetes', name: 'Kubernetes', code: 'K8S', description: 'Register cluster context and API endpoint metadata.', status: 'Setup profile', icon: Server },
  { id: 'prometheus', name: 'Prometheus', code: 'PROM', description: 'Register a metrics endpoint for a future collector.', status: 'Setup profile', icon: Activity },
];
const EMPTY: FormValues = { name: '', apiKey: '', accountId: '', region: 'ap-south-1', roleArn: '', subscriptionId: '', tenantId: '', clientId: '', projectId: '', clientEmail: '', endpoint: '', clusterName: '', context: '', namespace: 'default' };

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function stringValue(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function getStoredProfiles(): Profile[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(value) ? value.filter((x): x is Profile => isRecord(x) && typeof x.id === 'string' && typeof x.name === 'string') : []; }
  catch { return []; }
}

export default function CloudConnectionsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [provider, setProvider] = useState<Provider>('render');
  const [form, setForm] = useState<FormValues>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => setProfiles(getStoredProfiles()), []);
  const selected = useMemo(() => PROVIDERS.find((item) => item.id === provider) || PROVIDERS[0], [provider]);
  const validated = profiles.filter((p) => p.status === 'validated-once').length;
  const update = (key: keyof FormValues, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const persist = (next: Profile[]) => { setProfiles(next); try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { setError('Could not save profiles in browser storage.'); } };

  const chooseProvider = (id: Provider) => {
    setProvider(id); setForm({ ...EMPTY, name: form.name }); setError(''); setNotice(''); setRenderResult(null); setUploadName(''); setShowForm(true);
  };

  const uploadConfig = async (file?: File) => {
    if (!file) return;
    setUploadName(file.name); setError(''); setNotice('');
    try {
      const content = await file.text();
      let patch: Partial<FormValues> = {};
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed: unknown = JSON.parse(content);
        if (!isRecord(parsed)) throw new Error('The JSON file must contain an object.');
        patch = {
          projectId: stringValue(parsed.project_id) || stringValue(parsed.projectId) || stringValue(parsed.project),
          clientEmail: stringValue(parsed.client_email) || stringValue(parsed.clientEmail),
          tenantId: stringValue(parsed.tenantId) || stringValue(parsed.tenant_id),
          subscriptionId: stringValue(parsed.subscriptionId) || stringValue(parsed.subscription_id),
          clientId: stringValue(parsed.clientId) || stringValue(parsed.client_id),
          region: stringValue(parsed.region) || stringValue(parsed.aws_region) || form.region,
          accountId: stringValue(parsed.accountId) || stringValue(parsed.account_id),
        };
      } else {
        patch = {
          context: content.match(/current-context:\s*([^\s#]+)/)?.[1] || '',
          endpoint: content.match(/server:\s*(https?:\/\/[^\s]+)/)?.[1] || '',
          clusterName: content.match(/clusters:\s*\n[\s\S]*?name:\s*([^\s#]+)/)?.[1] || '',
        };
      }
      setForm((current) => ({ ...current, ...patch }));
      setNotice(`Metadata extracted locally from ${file.name}. The file and any private keys were not uploaded.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not parse the configuration file.'); }
  };

  const buildProfile = (status: ProfileStatus, extras: Partial<Profile> = {}): Profile => {
    const allowlist: (keyof FormValues)[] = provider === 'aws' ? ['accountId', 'region', 'roleArn']
      : provider === 'azure' ? ['subscriptionId', 'tenantId', 'clientId']
      : provider === 'gcp' ? ['projectId', 'clientEmail']
      : provider === 'kubernetes' ? ['clusterName', 'context', 'namespace', 'endpoint']
      : provider === 'prometheus' ? ['endpoint'] : [];
    const details: Record<string, string> = {};
    allowlist.forEach((key) => { const value = form[key]; if (value.trim()) details[key] = value.trim(); });
    const reference = details.accountId || details.subscriptionId || details.projectId || details.context || details.clusterName || details.endpoint || 'Not specified';
    return {
      id: crypto.randomUUID(), provider, name: form.name.trim() || `${selected.name} connection`, reference,
      endpoint: details.endpoint || (provider === 'render' ? 'Render API' : ''), region: provider === 'render' ? '' : form.region.trim(), status,
      createdAt: new Date().toISOString(), details, ...extras,
    };
  };

  const saveSetup = (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!form.name.trim()) { setError('Enter a name for this connection profile.'); return; }
    const valid = provider === 'aws' ? Boolean(form.roleArn.trim() && form.region.trim())
      : provider === 'azure' ? Boolean(form.subscriptionId.trim() && form.tenantId.trim())
      : provider === 'gcp' ? Boolean(form.projectId.trim())
      : provider === 'kubernetes' ? Boolean(form.clusterName.trim() || form.context.trim() || form.endpoint.trim())
      : Boolean(form.endpoint.trim());
    if (!valid) { setError(provider === 'aws' ? 'Enter a read-only IAM role ARN and region.' : provider === 'azure' ? 'Enter the subscription ID and tenant ID.' : provider === 'gcp' ? 'Enter the project ID or extract it from a JSON file.' : provider === 'kubernetes' ? 'Enter a cluster name, context, or endpoint.' : 'Enter the Prometheus base URL.'); return; }
    if (provider === 'prometheus') { try { const url = new URL(form.endpoint); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { setError('Enter a valid http:// or https:// Prometheus URL.'); return; } }
    const next = buildProfile('setup-required'); persist([next, ...profiles]);
    setNotice(`${selected.name} setup profile saved locally. Live monitoring is not enabled for this provider yet.`);
    setShowForm(false); setForm({ ...EMPTY, region: form.region }); setUploadName('');
  };

  const testRender = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice(''); setRenderResult(null);
    if (!form.name.trim()) { setError('Name this Render account before testing it.'); return; }
    if (!form.apiKey.trim()) { setError('Enter a Render API key.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${API_ORIGIN}/api/v1/connections/test/render`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: form.apiKey.trim() }) });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(isRecord(body) ? stringValue(body.detail) || `Connection test failed (${response.status}).` : `Connection test failed (${response.status}).`);
      const result = body as RenderResult;
      setRenderResult(result);
      const next = buildProfile('validated-once', { checkedAt: result.checkedAt, serviceCount: result.serviceCountReturned });
      persist([next, ...profiles]); setForm((current) => ({ ...current, apiKey: '' })); setShowForm(false);
      setNotice(`Render API access was validated. ${result.serviceCountReturned} service record(s) returned. The key was not saved.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not validate this Render account.'); }
    finally { setBusy(false); }
  };

  const remove = (id: string) => persist(profiles.filter((profile) => profile.id !== id));
  const revalidate = (profile: Profile) => { setProvider('render'); setForm({ ...EMPTY, name: profile.name }); setRenderResult(null); setShowForm(true); setError(''); setNotice('Enter the API key again to refresh this account. The previous key was not saved.'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const inputClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500';
  const labelClass = 'mb-1.5 block text-xs font-medium text-slate-300';
  const field = (label: string, key: keyof FormValues, placeholder: string, required = false, type = 'text') => (
    <label className="block" key={key}><span className={labelClass}>{label}{required ? ' *' : ''}</span><input className={inputClass} type={type} autoComplete={type === 'password' ? 'off' : undefined} value={form[key]} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} /></label>
  );

  return <div className="space-y-6 pb-8">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400"><Link2 size={15} /> Account integrations</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">Cloud Connections</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Register multiple cloud accounts, projects, clusters, and metrics endpoints in one place. A provider is marked validated only after a live check succeeds.</p></div><button onClick={() => setShowForm(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"><Plus size={17} /> Add connection</button></div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[{ label: 'Saved profiles', value: profiles.length, sub: 'Stored in this browser', icon: Cloud }, { label: 'Previously validated', value: validated, sub: 'Successful Render API checks', icon: CheckCircle2 }, { label: 'Providers listed', value: PROVIDERS.length, sub: 'Adapters enabled incrementally', icon: Layers3 }].map((metric) => { const MetricIcon = metric.icon; return <div key={metric.label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-400">{metric.label}</span><MetricIcon size={17} className="text-cyan-400" /></div><div className="mt-2 text-2xl font-semibold text-slate-100">{metric.value}</div><div className="mt-1 text-xs text-slate-500">{metric.sub}</div></div>; })}
    </div>

    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-300" /><div><div className="text-sm font-semibold text-amber-100">Credential safety</div><p className="mt-1 text-xs leading-5 text-slate-300">Profiles are saved only in this browser and contain non-secret identifiers. Uploaded files are parsed locally; the full file and private keys are not uploaded. A Render API key is sent to the backend for one validation request only and is not saved. Do not paste access keys or private keys into the other provider forms.</p></div></div>

    <section className="space-y-3"><div><h2 className="text-lg font-semibold text-slate-100">Select a provider</h2><p className="mt-1 text-xs text-slate-500">Choose the type of cloud or monitoring system to add.</p></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">{PROVIDERS.map((item) => { const Icon = item.icon; const active = provider === item.id; return <button key={item.id} onClick={() => chooseProvider(item.id)} className={`rounded-xl border p-4 text-left transition ${active ? 'border-cyan-400/70 bg-cyan-500/[0.08] ring-1 ring-cyan-400/20' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'bg-cyan-400/15 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}><Icon size={20} /></div><div><div className="text-sm font-semibold text-slate-100">{item.name}</div><div className="mt-1 text-[11px] text-slate-500">{item.code}</div></div></div><span className={`rounded-full px-2 py-1 text-[10px] ${item.id === 'render' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{item.status}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">{item.description}</p></button>; })}</div></section>

    {showForm && <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"><div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4"><div><div className="text-xs font-medium uppercase tracking-wider text-cyan-400">New connection profile</div><h2 className="mt-1 text-lg font-semibold text-slate-100">Configure {selected.name}</h2><p className="mt-1 text-xs text-slate-400">{provider === 'render' ? 'Validate access against the actual Render API.' : 'Record non-secret account details; live provider access is not enabled yet.'}</p></div><button aria-label="Close connection form" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"><XCircle size={18} /></button></div>
      <form onSubmit={provider === 'render' ? testRender : saveSetup} className="space-y-5 p-5"><div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {field('Connection name', 'name', `My ${selected.name} account`, true)}
        {provider === 'render' && <label className="block md:col-span-2"><span className={`${labelClass} flex items-center gap-2`}><KeyRound size={14} /> Render API key *</span><input className={inputClass} type="password" autoComplete="off" value={form.apiKey} onChange={(e) => update('apiKey', e.target.value)} placeholder="Paste a Render API key for this test only" /><span className="mt-1.5 block text-[11px] leading-5 text-slate-500">The key is used only to validate access and list up to 20 services; it is not saved.</span></label>}
        {provider === 'aws' && <>{field('AWS account ID', 'accountId', '123456789012')}{field('Read-only IAM role ARN', 'roleArn', 'arn:aws:iam::123456789012:role/CloudTwinReadOnly', true)}{field('Default region', 'region', 'ap-south-1', true)}</>}
        {provider === 'azure' && <>{field('Subscription ID', 'subscriptionId', 'Azure subscription UUID', true)}{field('Tenant ID', 'tenantId', 'Azure tenant UUID', true)}{field('Application / client ID', 'clientId', 'Optional application ID')}</>}
        {provider === 'gcp' && <>{field('Google Cloud project ID', 'projectId', 'my-project-id', true)}{field('Service-account email', 'clientEmail', 'monitor@project.iam.gserviceaccount.com')}</>}
        {provider === 'kubernetes' && <>{field('Cluster name', 'clusterName', 'production-cluster')}{field('Current context', 'context', 'kubectl current-context')}{field('Namespace', 'namespace', 'default')}{field('API server URL', 'endpoint', 'https://cluster.example.com')}</>}
        {provider === 'prometheus' && field('Prometheus base URL', 'endpoint', 'https://prometheus.example.com', true)}
      </div>
      {provider !== 'render' && <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/70 p-4"><div className="flex items-start gap-3"><FileUp size={19} className="mt-0.5 text-cyan-300" /><div className="flex-1"><div className="text-sm font-medium text-slate-200">Upload config file (optional)</div><p className="mt-1 text-xs leading-5 text-slate-500">Choose a JSON metadata/service-account file or YAML kubeconfig. Parsing occurs locally. Only selected identifiers are copied to the form; the raw file and keys never leave your browser.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500 hover:bg-slate-800"><FileUp size={14} /> Choose file<input className="hidden" type="file" accept=".json,.yaml,.yml,.conf,.config" onChange={(e) => { void uploadConfig(e.target.files?.[0]); e.currentTarget.value = ''; }} /></label>{uploadName && <div className="mt-2 text-xs text-slate-400">Selected: {uploadName}</div>}</div></div></div>}
      {provider !== 'render' && <div className="flex items-start gap-2 rounded-lg bg-slate-950/70 p-3 text-xs leading-5 text-slate-400"><AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-300" />Saving this profile records setup metadata only. It does not authenticate to {selected.name} or collect its live metrics yet.</div>}
      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"><XCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}{notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs text-emerald-200"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{notice}</div>}
      <div className="flex flex-col justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center"><span className="text-[11px] text-slate-500">{provider === 'render' ? 'Live API validation · first 20 service records' : 'Non-secret profile only · live collector not enabled'}</span><button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-wait disabled:opacity-60">{busy ? <><RefreshCw size={16} className="animate-spin" /> Validating…</> : provider === 'render' ? <><Wifi size={16} /> Test Render connection</> : <><Plus size={16} /> Save setup profile</>}</button></div>
      </form></section>}

    {renderResult && <section className="overflow-hidden rounded-xl border border-emerald-500/25 bg-slate-900/60"><div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300"><CheckCircle2 size={21} /></div><div><h2 className="font-semibold text-slate-100">Render API validation succeeded</h2><p className="mt-1 text-xs text-slate-400">{renderResult.message} · {new Date(renderResult.checkedAt).toLocaleString()}</p></div></div><div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2"><div className="text-[10px] uppercase tracking-wider text-slate-500">Services returned</div><div className="mt-1 text-xl font-semibold text-emerald-300">{renderResult.serviceCountReturned}</div></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3 font-medium">Service</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Region</th><th className="px-4 py-3 font-medium">State</th></tr></thead><tbody className="divide-y divide-slate-800">{renderResult.services.map((service, index) => <tr key={service.id || `${service.name}-${index}`} className="text-slate-300"><td className="px-4 py-3"><div className="font-medium text-slate-100">{service.name}</div>{service.url && <a href={service.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">Open service <ArrowRight size={11} /></a>}</td><td className="px-4 py-3 text-xs text-slate-400">{service.type || '—'}</td><td className="px-4 py-3 text-xs text-slate-400">{service.region || '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">{service.suspended === true || service.suspended === 'suspended' ? 'Suspended' : 'Listed by API'}</span></td></tr>)}</tbody></table></div><div className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">{renderResult.paginationNote} This validates inventory access only; it does not bypass Render plan restrictions on CPU/memory metrics.</div></section>}

    <section className="space-y-3"><div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-100">Your connection profiles</h2><p className="mt-1 text-xs text-slate-500">Stored only in this browser. Credentials are not stored.</p></div>{profiles.length > 0 && <span className="text-xs text-slate-500">{profiles.length} profile{profiles.length === 1 ? '' : 's'}</span>}</div>
      {profiles.length === 0 ? <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-12 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400"><HardDrive size={22} /></div><h3 className="mt-4 text-sm font-semibold text-slate-200">No accounts added yet</h3><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Validate a Render API key or create setup profiles for other cloud accounts.</p><button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500"><Plus size={14} /> Add your first connection</button></div>
      : <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{profiles.map((profile) => { const item = PROVIDERS.find((p) => p.id === profile.provider) || PROVIDERS[0]; const Icon = item.icon; const ok = profile.status === 'validated-once'; return <article key={profile.id} className="rounded-xl border border-slate-800 bg-slate-900/55 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-300"><Icon size={20} /></div><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-100">{profile.name}</h3><p className="mt-1 text-xs text-slate-500">{item.name}</p></div></div><button onClick={() => remove(profile.id)} title="Remove profile" aria-label={`Remove ${profile.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><Trash2 size={16} /></button></div><div className="mt-4 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}{ok ? 'Validated once' : 'Setup required'}</span><span className="text-[11px] text-slate-500">{profile.region || profile.endpoint || profile.reference}</span></div><div className="mt-3 text-xs leading-5 text-slate-400">{ok ? `${profile.serviceCount ?? 0} service record(s) returned on the last check. Re-enter the key to refresh; it was not saved.` : 'Non-secret configuration saved. Live provider metrics are not enabled for this profile yet.'}</div>{ok && profile.checkedAt && <div className="mt-2 text-[10px] text-slate-600">Last validation: {new Date(profile.checkedAt).toLocaleString()}</div>}{ok && <button onClick={() => { setProvider('render'); setForm({ ...EMPTY, name: profile.name }); setShowForm(true); setRenderResult(null); setError(''); setNotice('Re-enter the API key to revalidate this account.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200"><RefreshCw size={13} /> Revalidate account</button>}</article>; })}</div>}
    </section>

    <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="rounded-lg bg-slate-800 p-2 text-slate-300"><KeyRound size={16} /></div><div><h3 className="text-xs font-semibold text-slate-200">Next platform milestone</h3><p className="mt-1 text-xs leading-5 text-slate-500">Before saving long-lived credentials for multiple people, CloudTwin needs user sign-in and an encrypted credential vault. Then we can enable provider-specific live collectors for AWS, Azure, Google Cloud, Kubernetes, and Prometheus, followed by cost and failure predictions based on their real data.</p></div></div>
  </div>;
}
