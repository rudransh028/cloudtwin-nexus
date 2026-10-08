import React from 'react';
import { DollarSign, TrendingDown, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
import { mockCostBreakdown, mockCostOptimizations } from '@/data/mockData';

export default function CostPage() {
  const totalCost = mockCostBreakdown.reduce((sum, item) => sum + (item.cost || item.amount || 0), 0);

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
            {mockCostBreakdown.map((item, idx) => {
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
            ₹2,000/mo Total Potential Savings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockCostOptimizations.map((opt) => {
            const savings = opt.savings ?? opt.estimatedSavings ?? 0;
            const desc = opt.description || opt.reason || 'Underutilized capacity detected';

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
                  <button className="mt-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    Simulate <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
