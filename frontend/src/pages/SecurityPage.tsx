import React from 'react';
import { Shield, ShieldAlert } from 'lucide-react';
import { mockFindings } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function SecurityPage() {
  const securityFindings = mockFindings.filter(f => f.category === 'security');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
          <Shield className="text-emerald-500" />
          Security Posture
        </h1>
        <p className="text-slate-400 text-sm mt-1">Infrastructure security findings and compliance score.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm flex flex-col items-center justify-center">
          <div className="relative mb-2">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="56" className="stroke-slate-700" strokeWidth="12" fill="none" />
              <circle cx="64" cy="64" r="56" className="stroke-amber-400" strokeWidth="12" fill="none" strokeDasharray="351.8" strokeDashoffset="77.4" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-3xl font-bold text-slate-100">78</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <h3 className="text-lg font-medium text-slate-200">Security Score</h3>
          <p className="text-sm text-slate-400 mt-1">Fair posture, needs attention</p>
        </div>

        <div className="md:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-sm">
          <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-amber-500" /> Active Findings
          </h3>
          <div className="space-y-3">
            {securityFindings.map((finding) => (
              <div key={finding.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex gap-4">
                <div className={cn(
                  "w-2 rounded-full",
                  finding.severity === 'high' ? 'bg-red-500' :
                  finding.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                )} />
                <div>
                  <h4 className="text-sm font-medium text-slate-200">{finding.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{finding.description}</p>
                </div>
              </div>
            ))}
            {securityFindings.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-4">No active security findings.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
