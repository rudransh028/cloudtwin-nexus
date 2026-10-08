import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const TopBar = () => {
  const location = useLocation();
  const { notifications, currentProject } = useUiStore();
  const [isConnected, setIsConnected] = useState(false);
  const [modes, setModes] = useState({ cloud: 'mock', k8s: 'mock', telemetry: 'mock' });

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_ORIGIN}/api/v1/twin/status`);
        if (res.ok) {
          setIsConnected(true);
          const data = await res.json();
          setModes({ 
            cloud: data.cloudMode || 'mock', 
            k8s: data.kubernetesMode || 'mock', 
            telemetry: data.telemetryMode || 'mock' 
          });
        } else {
          setIsConnected(false);
        }
      } catch {
        setIsConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const title = pathParts.length > 0 
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
    : 'Dashboard';

  const isReal = modes.cloud === 'aws' || modes.k8s === 'real' || modes.telemetry === 'prometheus';

  return (
    <header className="h-[56px] bg-[#0c1222]/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10 shrink-0">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
      </div>

      <div className="flex-1 max-w-md px-6 hidden md:block">
        <button className="w-full flex items-center px-4 py-1.5 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-lg text-sm text-slate-400 transition-colors group">
          <Search className="h-4 w-4 mr-2 text-slate-500 group-hover:text-slate-400" />
          <span className="flex-1 text-left">Search resources, metrics...</span>
        </button>
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

        <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-brand-500 border-2 border-[#0c1222] text-[10px] font-bold text-white flex items-center justify-center leading-none">
              {notifications}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
