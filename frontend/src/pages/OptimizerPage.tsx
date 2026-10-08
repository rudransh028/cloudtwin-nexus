import React, { useState } from 'react';
import { Cpu, CheckCircle2, XCircle, AlertTriangle, ArrowRight, Sliders } from 'lucide-react';
import { mockArchitectures } from '@/data/mockData';

export default function OptimizerPage() {
  const [targetUsers, setTargetUsers] = useState(50000);
  const [maxLatency, setMaxLatency] = useState(100);
  const [minSla, setMinSla] = useState(99.9);
  const [monthlyBudget, setMonthlyBudget] = useState(20000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="text-cyan-400" />
          Architecture Optimizer
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Multi-objective architecture constraint solver. Evaluates topology trade-offs against performance and budget.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Constraints Form */}
        <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg space-y-5">
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Sliders size={18} className="text-cyan-400" /> Target Requirements
          </h2>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
              <span>Expected Concurrent Users</span>
              <span className="font-mono text-cyan-400">{targetUsers.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="1000" 
              max="200000" 
              step="5000"
              value={targetUsers} 
              onChange={e => setTargetUsers(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
              <span>Max Acceptable Latency (p95)</span>
              <span className="font-mono text-cyan-400">{maxLatency}ms</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="300" 
              value={maxLatency} 
              onChange={e => setMaxLatency(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
              <span>Target Availability SLA</span>
              <span className="font-mono text-cyan-400">{minSla}%</span>
            </div>
            <input 
              type="range" 
              min="95" 
              max="99.99" 
              step="0.05"
              value={minSla} 
              onChange={e => setMinSla(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
              <span>Monthly Budget Cap</span>
              <span className="font-mono text-cyan-400">₹{monthlyBudget.toLocaleString('en-IN')}</span>
            </div>
            <input 
              type="range" 
              min="5000" 
              max="50000" 
              step="1000"
              value={monthlyBudget} 
              onChange={e => setMonthlyBudget(Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2.5 rounded-lg text-xs transition-colors shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2">
            Re-Evaluate Topologies <ArrowRight size={14} />
          </button>
        </div>

        {/* Candidate Architectures */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-semibold text-slate-100">Evaluated Candidate Architectures</h2>
          
          <div className="space-y-4">
            {mockArchitectures.map(arch => {
              const cost = arch.cost ?? arch.costMonthly ?? 15000;
              const latency = arch.latency ?? arch.avgLatencyMs ?? 95;
              const sla = arch.sla ?? arch.estimatedSla ?? 99.8;
              
              let verdict: 'PASS' | 'OVER_BUDGET' | 'FAIL' = 'PASS';
              if (cost > monthlyBudget) {
                verdict = 'OVER_BUDGET';
              } else if (latency > maxLatency || sla < minSla) {
                verdict = 'FAIL';
              }

              const isRecommended = verdict === 'PASS';

              return (
                <div 
                  key={arch.id} 
                  className={`bg-slate-800/60 rounded-xl p-5 border shadow-lg transition-all ${
                    isRecommended 
                      ? 'border-emerald-500/50 bg-emerald-950/10' 
                      : verdict === 'OVER_BUDGET'
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-700/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-100">{arch.name}</h3>
                        {arch.type === 'current' && (
                          <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                            Current Baseline
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{arch.description || 'Configured candidate architecture topology'}</p>
                    </div>

                    <div>
                      {verdict === 'PASS' && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> RECOMMENDED
                        </span>
                      )}
                      {verdict === 'OVER_BUDGET' && (
                        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <AlertTriangle size={14} /> OVER BUDGET
                        </span>
                      )}
                      {verdict === 'FAIL' && (
                        <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                          <XCircle size={14} /> SLA / LATENCY FAIL
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-900/60 rounded-lg p-3 text-center border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Est. Cost</span>
                      <span className="text-sm font-mono font-bold text-slate-100">₹{cost.toLocaleString('en-IN')}/mo</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Latency (p95)</span>
                      <span className="text-sm font-mono font-bold text-slate-100">{latency}ms</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Availability SLA</span>
                      <span className="text-sm font-mono font-bold text-slate-100">{sla}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
