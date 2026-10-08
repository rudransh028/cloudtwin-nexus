import React from 'react';
import { Cloud, Check, X } from 'lucide-react';

export default function MultiCloudPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
          <Cloud className="text-blue-400" />
          Multi-Cloud Intelligence
        </h1>
        <p className="text-slate-400 text-sm mt-1">Compare your architecture's performance and cost across providers.</p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900/80 text-slate-300 border-b border-slate-700">
            <tr>
              <th className="p-4 font-medium w-1/4">Metric</th>
              <th className="p-4 font-medium text-center border-l border-slate-700/50">AWS (Current)</th>
              <th className="p-4 font-medium text-center border-l border-slate-700/50">GCP (Estimated)</th>
              <th className="p-4 font-medium text-center border-l border-slate-700/50">Azure (Estimated)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-slate-400 text-sm">
            <tr>
              <td className="p-4 font-medium text-slate-300">Monthly Cost</td>
              <td className="p-4 text-center border-l border-slate-700/50 font-medium text-slate-200">$12,450</td>
              <td className="p-4 text-center border-l border-slate-700/50 text-emerald-400">$10,800</td>
              <td className="p-4 text-center border-l border-slate-700/50 text-red-400">$13,200</td>
            </tr>
            <tr>
              <td className="p-4 font-medium text-slate-300">Avg Global Latency</td>
              <td className="p-4 text-center border-l border-slate-700/50 font-medium text-slate-200">45ms</td>
              <td className="p-4 text-center border-l border-slate-700/50">48ms</td>
              <td className="p-4 text-center border-l border-slate-700/50 text-emerald-400">42ms</td>
            </tr>
            <tr>
              <td className="p-4 font-medium text-slate-300">Managed DB SLA</td>
              <td className="p-4 text-center border-l border-slate-700/50">99.95%</td>
              <td className="p-4 text-center border-l border-slate-700/50">99.99%</td>
              <td className="p-4 text-center border-l border-slate-700/50">99.99%</td>
            </tr>
            <tr>
              <td className="p-4 font-medium text-slate-300">Kubernetes Engine</td>
              <td className="p-4 text-center border-l border-slate-700/50 flex justify-center"><Check size={18} className="text-emerald-500" /></td>
              <td className="p-4 text-center border-l border-slate-700/50 flex justify-center"><Check size={18} className="text-emerald-500" /></td>
              <td className="p-4 text-center border-l border-slate-700/50 flex justify-center"><Check size={18} className="text-emerald-500" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-center mt-6">
        <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-6 py-2 rounded-lg transition-colors shadow-sm">
          Generate Migration Plan
        </button>
      </div>
    </div>
  );
}
