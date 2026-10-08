import React from 'react';
import { mockFindings } from '@/data/mockData';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AlertsList() {
  const alerts = mockFindings.slice(0, 5);

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 shadow-lg shadow-slate-900/20 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Recent Findings</h3>
          <p className="text-sm text-slate-400">Security and operational architecture alerts</p>
        </div>
        <Link to="/security" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
          View All <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            className="flex items-start gap-4 p-3 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors"
          >
            <div className="mt-1">
              {getSeverityIcon(alert.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-medium text-slate-200 truncate pr-4">{alert.title}</h4>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityClass(alert.severity)}`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1 mb-2">{alert.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="truncate pr-2">Category: <span className="text-slate-300 capitalize">{alert.category}</span></span>
                <span className="text-cyan-400 text-[11px] font-medium">{alert.impact || 'Reliability risk'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertsList;
