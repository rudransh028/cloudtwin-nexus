import React from 'react';
import { cn } from '@/lib/utils';
import { Status } from '@/lib/types';

interface StatusIndicatorProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  label,
  pulse = false,
  className
}) => {
  const getStatusColor = (s: Status) => {
    switch (s) {
      case 'healthy':
      case 'active':
      case 'success':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'warning':
      case 'degraded':
        return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'critical':
      case 'error':
      case 'failed':
        return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      case 'offline':
      case 'inactive':
        return 'bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]';
      default:
        return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
    }
  };

  const sizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  };

  const shouldPulse = pulse || status === 'critical' || status === 'error' || status === 'failed';

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative flex h-full items-center justify-center">
        {shouldPulse && (
          <div className={cn(
            "absolute rounded-full opacity-75 animate-ping",
            getStatusColor(status),
            sizeClasses[size]
          )} />
        )}
        <div className={cn(
          "rounded-full z-10",
          getStatusColor(status),
          sizeClasses[size]
        )} />
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-300">
          {label}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;
