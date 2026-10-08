import React, { useState } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Clock, 
  Database, 
  Cpu, 
  Activity, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { mockComponents } from '@/data/mockData';

export default function PerformancePage() {
  const [selectedSpan, setSelectedSpan] = useState<string>('db');

  const waterfallSpans = [
    { id: 'user-lb', from: 'Users (Browser / Client)', to: 'Global AWS ALB', latency: 15, pct: 15, status: 'healthy', desc: 'DNS lookup and TLS handshake' },
    { id: 'lb-gw', from: 'Global AWS ALB', to: 'API Gateway (Envoy)', latency: 10, pct: 10, status: 'healthy', desc: 'VPC internal routing and SSL termination' },
    { id: 'gw-api', from: 'API Gateway', to: 'API Microservice (Node/Go)', latency: 20, pct: 20, status: 'healthy', desc: 'JWT token validation and rate limit check' },
    { id: 'api-redis', from: 'API Microservice', to: 'Redis Cluster (ElastiCache)', latency: 5, pct: 5, status: 'healthy', desc: 'In-memory hot key cache hit' },
    { id: 'db', from: 'API Microservice', to: 'PostgreSQL Primary (RDS)', latency: 45, pct: 45, status: 'critical', desc: 'Connection pool contention and disk I/O scan' },
    { id: 'worker', from: 'Order Microservice', to: 'Async Worker Queue (RabbitMQ)', latency: 5, pct: 5, status: 'healthy', desc: 'Background job dispatch' },
  ];

  const totalWaterfallLatency = waterfallSpans.reduce((sum, s) => sum + s.latency, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Zap className="text-yellow-400" />
          Performance & Latency Intelligence
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          End-to-end request tracing, hop-by-hop latency decomposition, and bottleneck attribution.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Waterfall Decomposition */}
        <div className="lg:col-span-2 bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
            <div>
              <h3 className="text-base font-semibold text-slate-200">Critical Request Path Waterfall</h3>
              <p className="text-xs text-slate-400">Checkout API transaction: <span className="font-mono text-cyan-300">POST /api/v1/orders/checkout</span></p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Total Transaction Latency</span>
              <span className="text-xl font-mono font-bold text-slate-100">{totalWaterfallLatency}ms</span>
            </div>
          </div>

          <div className="space-y-3">
            {waterfallSpans.map((span) => {
              const isSelected = selectedSpan === span.id;
              const isBottleneck = span.pct >= 40;

              return (
                <div 
                  key={span.id}
                  onClick={() => setSelectedSpan(span.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900/90 border-cyan-500/60 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-2">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-slate-200">{span.from}</span>
                      <ArrowRight size={12} className="text-slate-500" />
                      <span className={isBottleneck ? 'text-amber-400 font-bold' : 'text-slate-300'}>{span.to}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={isBottleneck ? 'text-rose-400 font-bold text-sm' : 'text-slate-300'}>{span.latency}ms</span>
                      <span className="text-[10px] text-slate-500 font-normal">({span.pct}%)</span>
                    </div>
                  </div>

                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full rounded-full ${
                        isBottleneck 
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                          : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                      }`} 
                      style={{ width: `${(span.latency / totalWaterfallLatency) * 100}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
            <span>Client Ingress (0ms)</span>
            <span>Target Response Window (&lt;100ms SLA: MET)</span>
          </div>
        </div>

        {/* Bottleneck Attribution & Diagnosis */}
        <div className="space-y-6">
          <div className="bg-slate-800/60 rounded-xl p-5 border border-amber-500/40 shadow-lg bg-gradient-to-b from-amber-500/10 to-transparent space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={20} />
              <h3 className="text-base font-semibold text-slate-200">Primary Bottleneck</h3>
            </div>
            
            <div className="text-2xl font-bold text-amber-400">PostgreSQL Primary</div>
            <p className="text-xs text-slate-300">
              Database operations account for <span className="font-bold text-amber-300">45% of total request latency</span>. Connection saturation observed during peak traffic.
            </p>

            <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
              <div className="text-slate-400 font-medium">Recommended Mitigations:</div>
              <div className="text-slate-300 flex items-start gap-1.5">
                <span className="text-cyan-400 mt-0.5">•</span> Shift catalog read queries to PostgreSQL Read Replica (saves ~28ms)
              </div>
              <div className="text-slate-300 flex items-start gap-1.5">
                <span className="text-cyan-400 mt-0.5">•</span> Enable Redis cache on user session payloads
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" /> Latency Percentiles
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">P50</span>
                <span className="text-base font-mono font-bold text-emerald-400">42ms</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">P95</span>
                <span className="text-base font-mono font-bold text-cyan-400">95ms</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">P99</span>
                <span className="text-base font-mono font-bold text-amber-400">185ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
