import React from 'react';
import { 
  Activity, 
  MemoryStick, 
  ArrowUpDown, 
  Timer, 
  AlertCircle, 
  CheckCircle, 
  Wallet, 
  Shield 
} from 'lucide-react';
import { 
  mockDashboard, 
  mockCpuHistory, 
  mockMemoryHistory, 
  mockRequestRateHistory, 
  mockLatencyHistory, 
  mockErrorRateHistory, 
  mockPredictions 
} from '@/data/mockData';
import { HealthScore } from '@/components/dashboard/HealthScore';
import { InfrastructureSummary } from '@/components/dashboard/InfrastructureSummary';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { MetricCard } from '@/components/common/MetricCard';
import { AreaChart } from '@/components/charts/AreaChart';
import { LineChart } from '@/components/charts/LineChart';
import RenderServicesCard from '@/components/dashboard/RenderServicesCard';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Cloud Overview</h1>
        <p className="text-sm text-slate-400">Live Render service inventory alongside digital-twin analytics</p>
      </div>

      <RenderServicesCard />

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
        The Render service inventory above is live API data. The CPU, memory, traffic, latency, cost, SLA, security, charts, and prediction cards below still use demo/simulated project data unless separately connected to a telemetry source.
      </div>

      {/* Row 1 - Health Score & Primary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <HealthScore />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            title="CPU Usage"
            value={`${mockDashboard.cpuAvg}%`}
            subtitle="Cluster aggregate"
            icon={Activity}
            trend={{ value: 4.2, isPositive: false }}
            sparklineData={mockCpuHistory.slice(-15).map(p => p.value)}
          />
          <MetricCard
            title="Memory Usage"
            value={`${mockDashboard.memoryAvg}%`}
            subtitle="Working set bytes"
            icon={MemoryStick}
            trend={{ value: 1.8, isPositive: false }}
            sparklineData={mockMemoryHistory.slice(-15).map(p => p.value)}
          />
          <MetricCard
            title="Request Rate"
            value={`${(mockDashboard.requestRate / 1000).toFixed(1)}k/min`}
            subtitle="Total HTTP inbound"
            icon={ArrowUpDown}
            trend={{ value: 8.5, isPositive: true }}
            sparklineData={mockRequestRateHistory.slice(-15).map(p => p.value)}
          />
          <MetricCard
            title="Average Latency"
            value={`${mockDashboard.avgLatency}ms`}
            subtitle="p95 cross-service"
            icon={Timer}
            trend={{ value: 5.1, isPositive: true }}
            sparklineData={mockLatencyHistory.slice(-15).map(p => p.value)}
          />
        </div>
      </div>

      {/* Row 2 - Secondary Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Error Rate"
          value={`${mockDashboard.errorRate}%`}
          subtitle="5xx HTTP errors"
          icon={AlertCircle}
          status="healthy"
          sparklineData={mockErrorRateHistory.slice(-15).map(p => p.value)}
        />
        <MetricCard
          title="Availability SLA"
          value={`${mockDashboard.sla}%`}
          subtitle="Trailing 30-day window"
          icon={CheckCircle}
          status="healthy"
        />
        <MetricCard
          title="Estimated Spend"
          value={`₹${mockDashboard.estimatedCost.toLocaleString('en-IN')}/mo`}
          subtitle="AWS compute & data tier"
          icon={Wallet}
        />
        <MetricCard
          title="Security Score"
          value={`${mockDashboard.securityScore}/100`}
          subtitle="2 open critical findings"
          icon={Shield}
          status="warning"
        />
      </div>

      {/* Row 3 - Request Rate & Latency Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Traffic Ingestion Rate</h3>
            <p className="text-sm text-slate-400">24-hour HTTP request volume (req/min)</p>
          </div>
          <AreaChart
            data={mockRequestRateHistory}
            color="#06b6d4"
            height={280}
            name="Requests/min"
            gradientId="reqRateGrad"
          />
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Latency Profile</h3>
            <p className="text-sm text-slate-400">P50 vs P95 vs P99 service round-trip times</p>
          </div>
          <LineChart
            data={mockLatencyHistory.map((item) => ({
              time: item.time,
              p50: Math.round(item.value * 0.7),
              p95: Math.round(item.value),
              p99: Math.round(item.value * 1.5)
            }))}
            lines={[
              { dataKey: 'p50', color: '#10b981', name: 'P50 (Median)' },
              { dataKey: 'p95', color: '#06b6d4', name: 'P95 Latency' },
              { dataKey: 'p99', color: '#f59e0b', name: 'P99 Latency' }
            ]}
            height={280}
          />
        </div>
      </div>

      {/* Row 4 - Alerts and Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px]">
          <AlertsList />
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 shadow-lg h-[400px] flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Failure Predictions</h3>
            <p className="text-sm text-slate-400">Trend extrapolation & early degradation alerts</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {mockPredictions.map((pred) => {
              const sev = (pred.severity || 'HIGH').toString().toUpperCase();
              return (
                <div key={pred.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-200">
                      {pred.title || pred.predictedIssue || 'System Degradation'}
                    </h4>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      sev === 'HIGH' || sev === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      sev === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    }`}>
                      {sev} Risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{pred.description || pred.cause || 'Anomalous trend detected'}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                      {pred.confidence}% Confidence
                    </span>
                    <span className="text-slate-500">
                      ETA: {pred.timeToImpact || pred.estimatedTime || pred.eta || '15-20 min'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 5 - Full Width Infrastructure Summary */}
      <div>
        <InfrastructureSummary />
      </div>
    </div>
  );
}
