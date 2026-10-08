import React, { useState } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  Play, 
  ShieldCheck, 
  Activity, 
  RotateCcw, 
  Flame, 
  Server,
  ArrowRight
} from 'lucide-react';
import { mockComponents } from '@/data/mockData';

export default function ChaosLabPage() {
  const [selectedExperiment, setSelectedExperiment] = useState<string>('kill-db');
  const [running, setRunning] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<{
    stage: 'idle' | 'injected' | 'cascading' | 'recovered';
    affectedCount: number;
    slaDrop: number;
    recoveryTime: string;
    log: string[];
  }>({
    stage: 'idle',
    affectedCount: 0,
    slaDrop: 0,
    recoveryTime: '0s',
    log: []
  });

  const experiments = [
    {
      id: 'kill-db',
      title: 'Kill Database Primary',
      category: 'Data Tier Failure',
      desc: 'Simulates instantaneous crash of PostgreSQL Primary without automated failover.',
      severity: 'Critical',
      icon: Flame,
      defaultAffected: 8,
      defaultSla: 18.2
    },
    {
      id: 'kill-pod',
      title: 'Terminate API Pods (33% fleet)',
      category: 'Pod Eviction',
      desc: 'Injects SIGKILL on 2 out of 6 active API pods to test HPA autoscaler responsiveness.',
      severity: 'Medium',
      icon: Server,
      defaultAffected: 3,
      defaultSla: 2.1
    },
    {
      id: 'kill-node',
      title: 'Worker Node Hard Power-off',
      category: 'Compute Host Loss',
      desc: 'Simulates AWS EC2 hypervisor fault draining 5 scheduled pods simultaneously.',
      severity: 'High',
      icon: AlertTriangle,
      defaultAffected: 6,
      defaultSla: 7.4
    },
    {
      id: 'network-latency',
      title: 'Inject 500ms Synthetic Latency',
      category: 'Network Congestion',
      desc: 'Simulates cross-AZ transit degradation on Redis cache query socket connections.',
      severity: 'Medium',
      icon: Activity,
      defaultAffected: 4,
      defaultSla: 4.8
    }
  ];

  const handleRunExperiment = () => {
    const exp = experiments.find(e => e.id === selectedExperiment) || experiments[0];
    setRunning(true);
    setExecutionResult({
      stage: 'injected',
      affectedCount: exp.defaultAffected,
      slaDrop: exp.defaultSla,
      recoveryTime: 'Calculating...',
      log: [
        `[00:00] [SAFE_SIM] Cloned Digital Twin snapshot to sandbox namespace.`,
        `[00:01] [FAULT_INJECT] Executed scenario: "${exp.title}".`,
        `[00:02] [SYSTEM_REACTION] Connection timeouts detected. Health check probes failing.`,
        `[00:03] [CASCADE] Downstream services entered degraded circuit-breaker state.`,
      ]
    });

    setTimeout(() => {
      setExecutionResult(prev => ({
        ...prev,
        stage: 'cascading',
        log: [
          ...prev.log,
          `[00:05] [OBSERVABILITY] Availability SLA dropped by ${exp.defaultSla}%.`,
          `[00:07] [FAILOVER_TEST] Triggering container self-healing & pod reschedule.`,
        ]
      }));
    }, 1500);

    setTimeout(() => {
      setRunning(false);
      setExecutionResult(prev => ({
        ...prev,
        stage: 'recovered',
        recoveryTime: '42 seconds',
        log: [
          ...prev.log,
          `[00:12] [RECOVERY] System stabilized. 100% of affected endpoints restored.`,
          `[00:15] [REPORT_GENERATED] Resilience score logged to Twin intelligence audit.`,
        ]
      }));
    }, 3200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Zap className="text-rose-500" />
          Chaos Engineering & Resilience Lab
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Simulate destructive infrastructure failures safely inside the Digital Twin without touching production cloud services.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
        <ShieldCheck size={20} className="text-cyan-400 shrink-0" />
        <p className="text-xs text-slate-300">
          <span className="font-semibold text-cyan-300">Zero Production Blast Radius: </span>
          All chaos experiments execute exclusively on the mathematical Digital Twin model. Your live AWS/Kubernetes instances remain untouched.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Experiment Selector */}
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700/60 shadow-lg space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Chaos Experiment Catalog</h2>

          <div className="space-y-2.5">
            {experiments.map(exp => {
              const isSelected = selectedExperiment === exp.id;
              const Icon = exp.icon;

              return (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExperiment(exp.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/20'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className={isSelected ? 'text-rose-400' : 'text-slate-400'} />
                      <span className="text-sm font-semibold text-slate-200">{exp.title}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      exp.severity === 'Critical' 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {exp.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{exp.desc}</p>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleRunExperiment}
            disabled={running}
            className="w-full mt-4 bg-rose-600 hover:bg-rose-500 text-white font-medium py-2.5 rounded-lg text-xs transition-colors shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
          >
            <Play size={14} className={running ? 'animate-spin' : ''} />
            {running ? 'Simulating Fault Cascade...' : 'Inject Chaos in Digital Twin'}
          </button>
        </div>

        {/* Experiment Results & Execution Timeline */}
        <div className="lg:col-span-2 bg-slate-800/60 rounded-xl p-6 border border-slate-700/60 shadow-lg space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-700/50">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Resilience Simulation Output</h3>
              <p className="text-xs text-slate-400">Step-by-step cascade propagation & recovery timeline</p>
            </div>
            {executionResult.stage !== 'idle' && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                executionResult.stage === 'recovered'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
              }`}>
                State: {executionResult.stage}
              </span>
            )}
          </div>

          {executionResult.stage === 'idle' ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl">
              <AlertTriangle size={36} className="text-slate-600 mb-2" />
              <div className="text-sm font-medium text-slate-400">Ready for Fault Injection</div>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a failure experiment from the catalog to observe cascading effects, SLA degradation, and automatic recovery boundaries.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Impact Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Degraded Services</span>
                  <span className="text-xl font-mono font-bold text-rose-400">{executionResult.affectedCount} Services</span>
                </div>
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Max SLA Degradation</span>
                  <span className="text-xl font-mono font-bold text-amber-400">-{executionResult.slaDrop}%</span>
                </div>
                <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Mean Time to Recovery</span>
                  <span className="text-xl font-mono font-bold text-emerald-400">{executionResult.recoveryTime}</span>
                </div>
              </div>

              {/* Execution Log */}
              <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 font-mono text-xs text-slate-300 space-y-2 max-h-56 overflow-y-auto">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 border-b border-slate-900 pb-1">
                  Chaos Engine Execution Trace
                </div>
                {executionResult.log.map((line, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-500">&gt;</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
