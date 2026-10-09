import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, Lightbulb, ArrowRight, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { apiService, mapCostRecommendationToInfraChange } from '@/services/apiService';
import { SimulationResult, CostOptimization, CostBreakdown } from '@/lib/types';
import { mockCostBreakdown, mockCostOptimizations } from '@/data/mockData';

export default function CostPage() {
  const [breakdown, setBreakdown] = useState<CostBreakdown[]>(mockCostBreakdown);
  const [optimizations, setOptimizations] = useState<CostOptimization[]>(mockCostOptimizations);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simOpt, setSimOpt] = useState<CostOptimization | null>(null);
  const [mappedChange, setMappedChange] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cost, opts] = await Promise.all([
        apiService.getCostBreakdown(),
        apiService.getCostOptimizations()
      ]);
      if (!cancelled) {
        setBreakdown(cost);
        setOptimizations(opts);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalCost = breakdown.reduce((sum, item) => sum + (item.cost || item.amount || 0), 0);
  const totalSavings = optimizations.reduce((sum, opt) => sum + (opt.savings ?? opt.estimatedSavings ?? 0), 0);
  const modalOpen = Boolean(simOpt && (simulating || simResult || simError));

  const handleSimulate = async (opt: CostOptimization) => {
    const infraChange = mapCostRecommendationToInfraChange(opt);
    setSimulating(opt.id);
    setSimResult(null);
    setSimError(null);
    setSimOpt(opt);
    setMappedChange(infraChange);
    try {
      const result = await apiService.runSimulation({
        name: `Cost Simulation: ${opt.title}`,
        trafficMultiplier: 1,
        injectedFailures: [],
        infraChanges: [infraChange],
      });
      setSimResult(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Simulation failed. The backend may be unavailable.';
      setSimError(message);
      console.error('[CostPage] simulate error:', e);
    } finally {
      setSimulating(null);
    }
  };

  const closeModal = () => {
    if (simulating) return;
    setSimResult(null);
    setSimOpt(null);
    setSimError(null);
    setMappedChange(null);
  };

  const avgCpuAfter = simResult?.components && simResult.components.length > 0
    ? Math.round(simResult.components.reduce((sum, c) => sum + c.cpuAfter, 0) / simResult.components.length)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <DollarSign className="text-emerald-400" />
          FinOps & Cost Intelligence
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Architectural spend analysis, idle resource detection, and workload optimization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg flex flex-col justify-center">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Monthly Spend</h3>
          <div className="text-4xl font-extrabold text-slate-100 mb-2">₹{totalCost.toLocaleString('en-IN')}</div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full w-fit">
            <TrendingDown size={14} /> 4.2% reduction vs baseline
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Spend attributed across 8 microservices, 3 managed databases, and multi-AZ load balancers.
          </p>
        </div>

        <div className="md:col-span-2 bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg">
          <h3 className="text-base font-semibold text-slate-200 mb-4">Spend Attribution by Layer</h3>
          <div className="space-y-4">
            {breakdown.map((item, idx) => {
              const name = item.category || item.service || `Resource ${idx + 1}`;
              const amount = item.cost || item.amount || 0;
              const pct = item.percentage ?? Math.round((amount / (totalCost || 1)) * 100);

              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-slate-300">{name}</span>
                    <span className="text-slate-400 font-mono">₹{amount.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-400" /> Architectural Optimization Opportunities
            </h3>
            <p className="text-xs text-slate-400 mt-1">Identified through Digital Twin resource utilization analysis</p>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            ₹{totalSavings.toLocaleString('en-IN')}/mo Total Potential Savings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {optimizations.map((opt) => {
            const savings = opt.savings ?? opt.estimatedSavings ?? 0;
            const desc = opt.description || opt.reason || 'Underutilized capacity detected';
            const isRunning = simulating === opt.id;

            return (
              <div key={opt.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center hover:border-slate-600 transition-colors">
                <div className="pr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-200">{opt.title}</h4>
                    {opt.effort && (
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {opt.effort} effort
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-emerald-400">₹{savings.toLocaleString('en-IN')}/mo</div>
                  <button
                    onClick={() => handleSimulate(opt)}
                    disabled={simulating !== null}
                    className="mt-2 text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    {isRunning ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                    {isRunning ? 'Running...' : 'Simulate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && simOpt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              disabled={Boolean(simulating)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors disabled:opacity-40"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-slate-100 mb-1 pr-6">Simulation Result</h3>
            <p className="text-xs text-slate-400 mb-2">
              Scenario: <span className="text-cyan-300 font-medium">{simOpt.title}</span>
            </p>
            {mappedChange && (
              <p className="text-[11px] text-slate-500 mb-4">
                Modeled twin action: <span className="font-mono text-cyan-300">{mappedChange}</span>
              </p>
            )}

            {simulating ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="animate-spin mb-3 text-cyan-400" />
                <p className="text-sm">Running Digital Twin cost simulation…</p>
              </div>
            ) : simError ? (
              <div className="flex items-start gap-3 bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
                <XCircle size={18} className="shrink-0 mt-0.5" />
                <span>{simError}</span>
              </div>
            ) : simResult && (
              <div className="space-y-4">
                <div className="text-[11px] text-cyan-200 bg-cyan-950/40 border border-cyan-800/60 rounded-lg px-3 py-2">
                  Simulated Digital Twin result — live cloud resources were not changed.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Health</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="capitalize text-slate-300">{simResult.overallHealthBefore || 'healthy'}</span>
                      <span className="text-slate-600">→</span>
                      <span className={`capitalize font-semibold ${simResult.overallHealthAfter === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {simResult.overallHealthAfter || 'healthy'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Monthly Cost</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-300">₹{simResult.costBefore?.toLocaleString()}</span>
                      <span className="text-slate-600">→</span>
                      <span className={`font-semibold ${(simResult.costAfter ?? 0) < (simResult.costBefore ?? 0) ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ₹{simResult.costAfter?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Latency</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-300">{simResult.latencyBefore}ms</span>
                      <span className="text-slate-600">→</span>
                      <span className={`font-semibold ${(simResult.latencyAfter ?? 0) > (simResult.latencyBefore ?? 0) ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {simResult.latencyAfter}ms
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">SLA</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-300">{simResult.slaBefore}%</span>
                      <span className="text-slate-600">→</span>
                      <span className={`font-semibold ${(simResult.slaAfter ?? 0) >= (simResult.slaBefore ?? 0) ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {simResult.slaAfter}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Bottleneck</div>
                    <div className="text-sm text-slate-200">{simResult.bottleneck || 'None'}</div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Avg CPU after</div>
                    <div className="text-sm text-slate-200">{avgCpuAfter !== null ? `${avgCpuAfter}%` : 'n/a'}</div>
                  </div>
                </div>

                {simResult.insights && simResult.insights.length > 0 && (
                  <ul className="space-y-1.5">
                    {simResult.insights.map((insight, i) => (
                      <li key={i} className="text-xs text-slate-400 bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800">
                        {insight}
                      </li>
                    ))}
                  </ul>
                )}

                {simResult.recommendations && simResult.recommendations.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Recommendations
                    </div>
                    <ul className="space-y-1.5">
                      {simResult.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-slate-300 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 flex gap-2">
                          <span className="text-cyan-400">•</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
