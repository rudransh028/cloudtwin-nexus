import React from 'react';
import { AlertTriangle, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { mockPredictions } from '@/data/mockData';

export default function PredictionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="text-amber-400" />
          Failure Prediction Engine
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Historical trend extrapolation, anomaly detection, and pre-emptive failure prevention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockPredictions.map(pred => {
          const title = pred.title || pred.predictedIssue || 'System Degradation';
          const desc = pred.description || pred.cause || 'Resource saturation trend detected.';
          const eta = pred.timeToImpact || pred.estimatedTime || pred.eta || '15-20 min';
          const sev = (pred.severity || 'HIGH').toString().toUpperCase();

          const isCritical = sev === 'CRITICAL' || sev === 'HIGH';

          return (
            <div key={pred.id} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    isCritical 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {sev} Risk
                  </span>
                  <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {pred.confidence}% Confidence
                  </div>
                </div>

                <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
                <p className="text-xs text-slate-400 mb-4">{desc}</p>
              </div>

              <div>
                {pred.trendData && (
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 mb-3">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                      <TrendingUp size={12} className="text-rose-400" /> Metric Trajectory (Last 5 intervals)
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                      {pred.trendData.map((val, idx) => (
                        <React.Fragment key={idx}>
                          <span className={val > 75 ? 'text-rose-400 font-bold' : ''}>{val}%</span>
                          {idx < (pred.trendData?.length ?? 0) - 1 && <span className="text-slate-600">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-700/50">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Clock size={14} className="text-cyan-400" /> Window: {eta}
                  </span>
                  <span className="text-[11px] text-cyan-400 hover:underline cursor-pointer">
                    Inspect Trace →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
