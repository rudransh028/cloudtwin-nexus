import React from 'react';
import { GaugeChart } from '../charts/GaugeChart';
import { mockDashboard } from '@/data/mockData';

export function HealthScore() {
  const score = mockDashboard.healthScore;
  
  const categories = [
    { name: 'Performance', score: 92, color: 'bg-emerald-500' },
    { name: 'Security', score: 78, color: 'bg-amber-500' },
    { name: 'Reliability', score: 98, color: 'bg-emerald-500' },
    { name: 'Cost', score: 85, color: 'bg-emerald-500' },
    { name: 'Scalability', score: 95, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 flex flex-col h-full shadow-lg shadow-slate-900/20">
      <h3 className="text-lg font-semibold text-slate-100 mb-2">Cloud Health Score</h3>
      <p className="text-sm text-slate-400 mb-4">Overall system health and compliance</p>
      
      <div className="flex-grow flex flex-col justify-center mb-6">
        <GaugeChart value={score} label="Overall Score" size="lg" />
      </div>
      
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.name} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">{cat.name}</span>
              <span className="text-slate-400 font-medium">{cat.score}/100</span>
            </div>
            <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
              <div 
                className={`h-full ${cat.color} rounded-full`} 
                style={{ width: `${cat.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
