import React from 'react';
import { cn } from '@/lib/utils';
import { Severity } from '@/lib/types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className
}) => {
  const getSeverityStyles = (severity: Severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'info':
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider",
      getSeverityStyles(severity),
      className
    )}>
      {severity}
    </span>
  );
};
