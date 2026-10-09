import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, Clock, X, Activity, BarChart2, CheckCircle2, Loader2, Search } from 'lucide-react';
import { FailurePrediction } from '@/lib/types';
import { apiService } from '@/services/apiService';
import { mockPredictions } from '@/data/mockData';

function investigationSteps(pred: FailurePrediction): string[] {
  const component = pred.componentId || pred.componentName || 'the affected service';
  const title = (pred.title || pred.predictedIssue || '').toLowerCase();
  const steps = [
    `Confirm recent telemetry for ${component} against the predicted trend window (${pred.timeToImpact || pred.estimatedTime || pred.eta || 'unknown'}).`,
    'Compare error rate, saturation, and latency with the Digital Twin baseline — not a distributed trace ID.',
  ];
  if (title.includes('cpu') || title.includes('api') || component === 'comp-api') {
    steps.push('Inspect API pod CPU, HPA replica count, and request queue depth.');
    steps.push('If saturation continues, simulate adding API replicas in Simulation Lab before changing production.');
  } else if (title.includes('postgres') || title.includes('database') || title.includes('connection') || component === 'comp-db-primary') {
    steps.push('Check PostgreSQL connection pool utilization and slow-query wait events.');
    steps.push('Evaluate diverting reads to the replica or adding cache in a twin simulation.');
  } else if (title.includes('memory') || title.includes('worker') || component === 'comp-worker') {
    steps.push('Review worker container RSS growth and restart history.');
    steps.push('Confirm job backlog is not driving unbounded heap allocation.');
  } else {
    steps.push('Open the Architecture view for the component and review dependent hop latency.');
  }
  steps.push('No OpenTelemetry/Jaeger collector is configured in this deployment, so this panel is a telemetry investigation, not a retrieved distributed trace.');
  return steps;
}

export default function PredictionPage() {
  const [predictions, setPredictions] = useState<FailurePrediction[]>(mockPredictions);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPred, setSelectedPred] = useState<FailurePrediction | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiService.getPredictions();
        if (!cancelled) {
          setPredictions(data);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Unable to load predictions');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin text-cyan-400" /> Loading prediction engine output…
        </div>
      )}
      {loadError && (
        <p className="text-xs text-amber-400">Showing cached predictions ({loadError})</p>
      )}
      {!loading && predictions.length === 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-8 text-center text-slate-400 text-sm">
          No active failure predictions from the intelligence engine.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {predictions.map(pred => {
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
                {pred.trendData && pred.trendData.length > 0 && (
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
                  <button
                    type="button"
                    onClick={() => setSelectedPred(pred)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
                  >
                    Inspect Trace →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPred(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-5 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className={
                  (selectedPred.severity?.toString().toUpperCase() === 'CRITICAL' || selectedPred.severity?.toString().toUpperCase() === 'HIGH')
                    ? 'text-rose-400'
                    : 'text-amber-400'
                } />
                <h3 className="text-lg font-bold text-slate-100">
                  {selectedPred.title || selectedPred.predictedIssue || 'System Degradation'}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  (selectedPred.severity?.toString().toUpperCase() === 'CRITICAL' || selectedPred.severity?.toString().toUpperCase() === 'HIGH')
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {selectedPred.severity?.toString().toUpperCase()} Risk
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedPred.confidence}% Confidence
                </span>
                {selectedPred.componentId && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    Component: {selectedPred.componentId}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-3 mb-4 text-xs text-cyan-200">
              Diagnostic investigation from prediction telemetry. This environment does not retrieve distributed traces (no trace collector is configured).
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Suspected failure</h4>
              <p className="text-sm text-slate-200">
                {selectedPred.description || selectedPred.cause || 'Resource saturation trend detected.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-cyan-400" /> Impact Window
                </div>
                <div className="text-base font-mono font-bold text-slate-100">
                  {selectedPred.timeToImpact || selectedPred.estimatedTime || selectedPred.eta || '15-20 min'}
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Activity size={12} className="text-emerald-400" /> Prediction Type
                </div>
                <div className="text-base font-mono font-bold text-slate-100 capitalize">
                  {selectedPred.predictionType || 'degradation'}
                </div>
              </div>
            </div>

            {selectedPred.trendData && selectedPred.trendData.length > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 mb-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                  <BarChart2 size={14} className="text-cyan-400" /> Metric Trajectory
                </h4>
                <div className="flex items-end gap-2 h-20">
                  {selectedPred.trendData.map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          val > 85 ? 'bg-rose-500' : val > 70 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ height: `${(val / 100) * 64}px` }}
                      />
                      <span className={`text-[10px] font-mono ${val > 75 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {val}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 mt-2 text-right">← Oldest interval → Latest</div>
              </div>
            )}

            {selectedPred.impact && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                <h4 className="text-xs font-semibold text-amber-400 uppercase mb-1">Predicted Impact</h4>
                <p className="text-sm text-slate-200">{selectedPred.impact}</p>
              </div>
            )}

            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 mb-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <Search size={12} className="text-cyan-400" /> Recommended investigation
              </h4>
              <ol className="space-y-2">
                {investigationSteps(selectedPred).map((step, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-2">
                    <span className="text-cyan-400 font-mono">{i + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 font-mono text-xs text-slate-400 flex flex-wrap gap-x-6 gap-y-1">
              <span><span className="text-slate-600">prediction_id:</span> <span className="text-cyan-300">{selectedPred.id}</span></span>
              <span><span className="text-slate-600">status:</span> <span className="text-emerald-400">{selectedPred.status || 'active'}</span></span>
              <span><span className="text-slate-600">source:</span> <span className="text-slate-300">Digital Twin Intelligence Engine</span></span>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setSelectedPred(null)}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
