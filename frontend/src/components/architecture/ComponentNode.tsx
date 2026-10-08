import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Server, Database, HardDrive, Wifi, Shield, Box, Users, Container } from 'lucide-react';
import { ComponentType, Status } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ComponentNodeProps {
  data: {
    name: string;
    type: ComponentType;
    status: Status;
    metrics?: {
      cpu?: number;
      memory?: number;
      requestRate?: number;
      latency?: number;
      errorRate?: number;
    };
  };
}

export default function ComponentNode({ data }: ComponentNodeProps) {
  const Icon = () => {
    switch (data.type) {
      case 'service': return <Server size={18} />;
      case 'database': return <Database size={18} />;
      case 'storage': return <HardDrive size={18} />;
      case 'load_balancer': return <Wifi size={18} />;
      case 'gateway': return <Shield size={18} />;
      case 'cache': return <Box size={18} />;
      case 'user': return <Users size={18} />;
      case 'pod': return <Container size={18} />;
      default: return <Server size={18} />;
    }
  };

  const getStatusColor = (s: Status) => {
    switch (s) {
      case 'healthy':
      case 'active':
      case 'success':
        return 'bg-emerald-500';
      case 'warning':
      case 'degraded':
        return 'bg-amber-500';
      case 'critical':
      case 'error':
      case 'failed':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getBorderColor = (s: Status) => {
    switch (s) {
      case 'healthy':
      case 'active':
      case 'success':
        return 'border-emerald-500/50';
      case 'warning':
      case 'degraded':
        return 'border-amber-500/50';
      case 'critical':
      case 'error':
      case 'failed':
        return 'border-rose-500/50';
      default:
        return 'border-slate-700';
    }
  };

  return (
    <div className={cn(
      "relative flex flex-col bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 w-[160px] border shadow-lg transition-all hover:shadow-cyan-500/20 hover:border-cyan-500/50",
      getBorderColor(data.status)
    )}>
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="text-slate-300">
          <Icon />
        </div>
        <div className={cn("w-2 h-2 rounded-full", getStatusColor(data.status))} />
      </div>

      <div className="text-xs font-semibold text-slate-200 truncate mb-2" title={data.name}>
        {data.name}
      </div>

      {data.metrics && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/50 rounded px-1.5 py-1">
          <span>{data.metrics.cpu !== undefined ? `${data.metrics.cpu}% CPU` : '-'}</span>
          <span>{data.metrics.latency !== undefined ? `${data.metrics.latency}ms` : '-'}</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2" />
    </div>
  );
}
