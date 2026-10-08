import React, { useState, useEffect } from 'react';
import { Play, TrendingDown, DollarSign, Activity, Users, AlertTriangle } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { SimulationResult, ComponentSimResult } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function SimulationPage() {
  const [trafficMultiplier, setTrafficMultiplier] = useState(1);
  const [injectedFailures, setInjectedFailures] = useState<string[]>([]);
  const [infraChanges, setInfraChanges] = useState<string[]>([]);
  
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failureOptions = ['Kill API', 'Kill Database', 'Kill Redis', 'Kill Node', 'Network Failure', 'Region Failure'];
  const infraOptions = ['Add API Replica', 'Add DB Replica', 'Add Cache', 'Increase CPU', 'Increase Memory'];

  const toggleFailure = (f: string) => {
    setInjectedFailures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const toggleInfra = (m: string) => {
    setInfraChanges(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const handleRunSimulation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiService.runSimulation({
        name: `Simulation - ${trafficMultiplier}x Traffic`,
        trafficMultiplier,
        injectedFailures,
        infraChanges
      });
      setResult(res);
    } catch (e) {
      console.error(e);
      setError('Backend unavailable. Unable to run simulation.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial simulation on load
  useEffect(() => {
    handleRunSimulation();
  }, []);

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">What-If Simulation Lab</h1>
        <p className="text-slate-400 text-sm mt-1">Simulate traffic spikes, component failures, and architecture changes.</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left Panel: Scenario Builder */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-sm">
            <h2 className="text-lg font-medium text-slate-200 mb-4">Scenario Builder</h2>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm text-slate-300 font-medium block mb-3">Traffic Multiplier</label>
                <input 
                  type="range" 
                  min="1" max="100" 
                  value={trafficMultiplier} 
                  onChange={(e) => setTrafficMultiplier(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>1x</span>
                  <span>10x</span>
                  <span>50x</span>
                  <span>100x</span>
                </div>
                <div className="mt-2 text-sm text-cyan-400 font-medium">Current: {trafficMultiplier}x Traffic</div>
              </div>

              <div>
                <label className="text-sm text-slate-300 font-medium block mb-3">Inject Failures</label>
                <div className="grid grid-cols-2 gap-2">
                  {failureOptions.map(f => (
                    <label key={f} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={injectedFailures.includes(f)}
                        onChange={() => toggleFailure(f)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-800" 
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300 font-medium block mb-3">Modify Infrastructure</label>
                <div className="flex flex-wrap gap-2">
                  {infraOptions.map(m => (
                    <button 
                      key={m} 
                      onClick={() => toggleInfra(m)}
                      className={cn(
                        "px-3 py-1.5 border rounded-lg text-xs transition-colors",
                        infraChanges.includes(m) 
                          ? "bg-cyan-900 border-cyan-700 text-cyan-300"
                          : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      + {m}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-900/50"
              >
                <Play size={18} />
                {isLoading ? 'Running...' : 'Run Simulation'}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm flex flex-col gap-2 items-center text-center">
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                  <button onClick={handleRunSimulation} className="text-xs underline hover:text-red-300">Retry</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="w-full lg:w-2/3 space-y-6">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-sm">
            <h2 className="text-lg font-medium text-slate-200 mb-4">
              Simulation Results {result && `- ${result.name}`}
            </h2>
            
            {isLoading && !result ? (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="animate-pulse flex flex-col items-center">
                  <Activity size={32} className="mb-4 text-cyan-500" />
                  <p>Calculating simulation...</p>
                </div>
              </div>
            ) : !result ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                {error ? 'Simulation failed' : 'Run a simulation to see results'}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Activity size={16}/> Health</div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium capitalize", result.overallHealthBefore === 'healthy' ? "text-emerald-400" : "text-amber-400")}>
                        {result.overallHealthBefore || 'healthy'}
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className={cn("font-medium capitalize", result.overallHealthAfter === 'healthy' ? "text-emerald-400" : (result.overallHealthAfter === 'degraded' ? "text-amber-400" : "text-red-400"))}>
                        {result.overallHealthAfter || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><TrendingDown size={16}/> Latency</div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{result.latencyBefore}ms</span>
                      <span className="text-slate-500">→</span>
                      <span className={cn("font-medium flex items-center", (result.latencyAfter || 0) > (result.latencyBefore || 0) ? "text-red-400" : "text-emerald-400")}>
                        {result.latencyAfter}ms
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Users size={16}/> SLA</div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{result.slaBefore}%</span>
                      <span className="text-slate-500">→</span>
                      <span className={cn("font-medium", (result.slaAfter || 0) < (result.slaBefore || 0) ? "text-red-400" : "text-emerald-400")}>
                        {result.slaAfter}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><DollarSign size={16}/> Cost</div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">₹{result.costBefore?.toLocaleString()}</span>
                      <span className="text-slate-500">→</span>
                      <span className={cn("font-medium", (result.costAfter || 0) > (result.costBefore || 0) ? "text-amber-400" : "text-emerald-400")}>
                        ₹{result.costAfter?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Users size={16}/> Users Affected</div>
                    <div className="text-slate-200 font-medium">{result.affectedUsersPercent || 0}% of traffic</div>
                  </div>
                  <div className={cn("bg-slate-900/50 p-4 rounded-lg border border-slate-800 border-l-4", result.bottleneck && result.bottleneck !== "None (System Healthy)" ? "border-l-red-500" : "border-l-emerald-500")}>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <AlertTriangle size={16} className={result.bottleneck && result.bottleneck !== "None (System Healthy)" ? "text-red-500" : "text-emerald-500"}/> 
                      Bottleneck
                    </div>
                    <div className={cn("font-medium", result.bottleneck && result.bottleneck !== "None (System Healthy)" ? "text-red-400" : "text-emerald-400")}>
                      {result.bottleneck || 'None'}
                    </div>
                  </div>
                </div>

                {result.components && result.components.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Component Impact</h3>
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Component</th>
                            <th className="px-4 py-3">Before Status</th>
                            <th className="px-4 py-3">After Status</th>
                            <th className="px-4 py-3">Before Latency</th>
                            <th className="px-4 py-3 rounded-tr-lg">After Latency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.components.map(comp => (
                            <tr key={comp.id} className="border-b border-slate-800">
                              <td className="px-4 py-3 text-slate-300 font-medium">{comp.name}</td>
                              <td className="px-4 py-3 capitalize text-emerald-400">{comp.statusBefore}</td>
                              <td className={cn("px-4 py-3 capitalize", comp.statusAfter === 'critical' ? 'text-red-400' : (comp.statusAfter === 'warning' ? 'text-amber-400' : 'text-emerald-400'))}>
                                {comp.statusAfter}
                              </td>
                              <td className="px-4 py-3">{comp.latencyBefore}ms</td>
                              <td className={cn("px-4 py-3", comp.latencyAfter > comp.latencyBefore ? 'text-red-400' : 'text-emerald-400')}>
                                {comp.latencyAfter}ms
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-start gap-3">
                          <span className="text-cyan-500 mt-0.5">•</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
