import React from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  DollarSign, 
  Activity,
  Layers
} from 'lucide-react';
import { mockDashboard, mockFindings, mockSimulationResults } from '@/data/mockData';

export default function ReportsPage() {
  const handleDownload = (reportName: string) => {
    const reportData = {
      project: 'CloudTwin Nexus',
      report: reportName,
      generatedAt: new Date().toISOString(),
      healthScore: mockDashboard.healthScore,
      sla: mockDashboard.sla,
      monthlySpend: mockDashboard.estimatedCost,
      securityScore: mockDashboard.securityScore,
      keyFindings: mockFindings.slice(0, 4)
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <FileText className="text-cyan-400" />
          Cloud Architecture Health Reports
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Automated multi-pillar architecture assessment, risk register, and printable executive summaries.
        </p>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg text-center">
          <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Overall Health</span>
          <div className="text-4xl font-extrabold text-cyan-400">84/100</div>
          <span className="text-[10px] text-emerald-400 mt-1 block">Good Architectural Posture</span>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg text-center">
          <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Security Posture</span>
          <div className="text-4xl font-extrabold text-amber-400">{mockDashboard.securityScore}/100</div>
          <span className="text-[10px] text-amber-400 mt-1 block">2 High Findings Pending</span>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg text-center">
          <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Reliability SLA</span>
          <div className="text-4xl font-extrabold text-emerald-400">{mockDashboard.sla}%</div>
          <span className="text-[10px] text-slate-400 mt-1 block">99.87% Measured</span>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg text-center">
          <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Cost Efficiency</span>
          <div className="text-4xl font-extrabold text-slate-100">79/100</div>
          <span className="text-[10px] text-cyan-400 mt-1 block">₹2,000/mo Optimizable</span>
        </div>
      </div>

      {/* Reports Catalog */}
      <div className="bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/50">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Available Architecture Reports</h3>
            <p className="text-xs text-slate-400">Generated from Digital Twin continuous telemetry</p>
          </div>
          <button 
            onClick={() => handleDownload('Executive-Cloud-Health-Audit')}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-950/50"
          >
            <Download size={14} /> Download Full Audit Report (JSON)
          </button>
        </div>

        <div className="space-y-3">
          {[
            {
              name: 'Executive Cloud Health & Risk Audit',
              date: 'October 8, 2026',
              type: 'Comprehensive',
              desc: 'Complete overview covering architecture SPOFs, security posture, latency analysis, and simulation forecasts.'
            },
            {
              name: 'SPOF & Reliability Vulnerability Report',
              date: 'October 7, 2026',
              type: 'Reliability',
              desc: 'Deep-dive into database single points of failure, lack of automated failover, and Redis replication gaps.'
            },
            {
              name: 'FinOps Resource Utilization & Waste Audit',
              date: 'October 5, 2026',
              type: 'Cost Optimization',
              desc: 'Identifies underutilized nodes, oversized replica databases, and actionable cloud cost reduction opportunities.'
            },
            {
              name: 'Multi-Cloud Migration Feasibility Study',
              date: 'September 28, 2026',
              type: 'Strategy',
              desc: 'Comparative analysis of running this architecture on AWS vs GCP vs Azure.'
            }
          ].map((report, idx) => (
            <div 
              key={idx}
              className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50 flex flex-wrap items-center justify-between gap-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-cyan-400 shrink-0 mt-0.5">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">{report.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">{report.desc}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {report.date}</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{report.type}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleDownload(report.name)}
                className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download size={14} /> Export
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
