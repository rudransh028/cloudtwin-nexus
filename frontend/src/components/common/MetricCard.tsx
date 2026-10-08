import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Status } from '@/lib/types';
import { StatusIndicator } from './StatusIndicator';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: Status;
  sparklineData?: number[];
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status,
  sparklineData,
  className
}) => {
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length === 0) return null;
    
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    const color = trend?.isPositive === false ? '#ef4444' : '#10b981';

    return (
      <svg width={width} height={height} className="ml-auto overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className={cn(
      "relative overflow-hidden bg-[#0c1222] border border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-700",
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="p-2 bg-slate-800/50 rounded-lg">
          <Icon className="h-5 w-5 text-brand-400" />
        </div>
      </div>
      
      <div className="flex items-baseline mb-2">
        <span className="text-3xl font-bold text-slate-100">{value}</span>
        {status && (
          <StatusIndicator status={status} className="ml-3" />
        )}
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          {trend && (
            <div className={cn(
              "flex items-center font-medium",
              trend.isPositive ? "text-emerald-400" : "text-red-400"
            )}>
              {trend.isPositive ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {trend.value}%
            </div>
          )}
          {subtitle && (
            <span className="text-slate-500">{subtitle}</span>
          )}
        </div>
        
        {renderSparkline()}
      </div>
    </div>
  );
};
