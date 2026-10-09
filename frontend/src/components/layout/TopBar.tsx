import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, X, ArrowUpRight } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { apiService } from '@/services/apiService';

const searchItems = [
  { label: 'Dashboard', path: '/dashboard', keywords: 'overview health metrics' },
  { label: 'Architecture', path: '/architecture', keywords: 'topology components dependencies' },
  { label: 'Digital Twin', path: '/twin', keywords: 'sync infrastructure twin' },
  { label: 'Simulation Lab', path: '/simulation', keywords: 'what if traffic failure scenario' },
  { label: 'Failure Prediction', path: '/predictions', keywords: 'risk prediction trace' },
  { label: 'Architecture Optimizer', path: '/optimizer', keywords: 'optimization budget sla latency' },
  { label: 'Chaos Lab', path: '/chaos', keywords: 'chaos resilience experiment' },
  { label: 'Performance', path: '/performance', keywords: 'latency throughput' },
  { label: 'Security', path: '/security', keywords: 'vulnerability findings' },
  { label: 'Kubernetes', path: '/kubernetes', keywords: 'pods nodes cluster' },
  { label: 'Network', path: '/network', keywords: 'network path latency' },
  { label: 'Cost Intelligence', path: '/cost', keywords: 'cost spend savings finops' },
  { label: 'Multi-Cloud', path: '/multicloud', keywords: 'aws gcp azure migration' },
  { label: 'Reports', path: '/reports', keywords: 'export audit report' },
  { label: 'Settings', path: '/settings', keywords: 'configuration preferences' },
];

const notificationsList = [
  { title: 'API degradation prediction', detail: 'Review the current failure risk.', path: '/predictions', level: 'High risk' },
  { title: 'Cost recommendations available', detail: 'Review potential monthly savings.', path: '/cost', level: 'Cost' },
  { title: 'Architecture health review', detail: 'Inspect topology and dependencies.', path: '/architecture', level: 'Review' },
];

export const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications } = useUiStore();
  const [isConnected, setIsConnected] = useState(false);
  const [modes, setModes] = useState({ cloud: 'mock', k8s: 'mock', telemetry: 'mock' });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const status = await apiService.getTwinStatus().catch(() => null);
      const healthy = await apiService.checkHealth();
      if (!active) return;
      setIsConnected(healthy && status !== null);
      if (status) {
        setModes({
          cloud: status.cloudMode || 'mock',
          k8s: status.kubernetesMode || 'mock',
          telemetry: status.telemetryMode || 'mock',
        });
      }
    };
    void check();
    const interval = setInterval(() => void check(), 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const title = pathParts.length > 0
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
    : 'Dashboard';
  const isReal = modes.cloud === 'aws' || modes.k8s === 'real' || modes.telemetry === 'prometheus';
  const filteredItems = searchItems.filter((item) =>
    `${item.label} ${item.keywords}`.toLowerCase().includes(searchQuery.trim().toLowerCase())
  ).slice(0, 6);

  const goToSearchResult = (path: string) => {
    navigate(path);
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="h-[56px] bg-[#0c1222]/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
      </div>

      <div className="relative flex-1 max-w-md px-6 hidden md:block">
        <button
          type="button"
          aria-label="Search resources and pages"
          aria-expanded={searchOpen}
          onClick={() => { setSearchOpen((open) => !open); setNotificationsOpen(false); }}
          className="w-full flex items-center px-4 py-1.5 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-lg text-sm text-slate-400 transition-colors group"
        >
          <Search className="h-4 w-4 mr-2 text-slate-500 group-hover:text-slate-400" />
          <span className="flex-1 text-left">Search resources, metrics...</span>
          <span className="text-[10px] text-slate-600">⌘ K</span>
        </button>
        {searchOpen && (
          <div className="absolute top-12 left-6 right-6 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden z-50">
            <div className="flex items-center gap-2 px-3 border-b border-slate-800">
              <Search size={16} className="text-slate-500 shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchOpen(false);
                  if (event.key === 'Enter' && filteredItems[0]) goToSearchResult(filteredItems[0].path);
                }}
                placeholder="Search pages and tools..."
                aria-label="Search pages and tools"
                className="w-full bg-transparent py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="text-slate-500 hover:text-slate-200"><X size={15} /></button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filteredItems.length ? filteredItems.map((item) => (
                <button key={item.path} type="button" onClick={() => goToSearchResult(item.path)} className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
                  <span>{item.label}</span><ArrowUpRight size={14} className="text-slate-600" />
                </button>
              )) : <p className="px-3 py-5 text-sm text-slate-500">No matching pages found.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex flex-col items-end px-3 py-1">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isConnected ? 'Backend Connected' : 'Backend Offline'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            DATA SOURCE: {isConnected ? (isReal ? 'LIVE CLOUD' : 'SIMULATION') : 'MOCK'}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            onClick={() => { setNotificationsOpen((open) => !open); setSearchOpen(false); }}
            className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-brand-500 border-2 border-[#0c1222] text-[10px] font-bold text-white flex items-center justify-center leading-none">
                {notifications}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-slate-100">Notifications</h2>
                <span className="text-[10px] text-slate-500">Demo alerts</span>
              </div>
              {notificationsList.map((item) => (
                <button key={item.title} type="button" onClick={() => { navigate(item.path); setNotificationsOpen(false); }} className="block w-full text-left px-4 py-3 border-b border-slate-800/70 hover:bg-slate-800/70">
                  <span className="flex items-center justify-between gap-2 text-xs font-medium text-slate-200"><span>{item.title}</span><span className="text-[10px] text-cyan-400">{item.level}</span></span>
                  <span className="block mt-1 text-xs text-slate-500">{item.detail}</span>
                </button>
              ))}
              <p className="px-4 py-2 text-[10px] text-slate-600">Notifications are illustrative demo alerts, not live incident events.</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
