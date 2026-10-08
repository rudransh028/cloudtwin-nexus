import React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export interface AreaChartProps {
  data: { time: string; value: number }[];
  color: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showAxis?: boolean;
  gradientId?: string;
  name?: string;
}

export function AreaChart({
  data,
  color,
  height = 300,
  showGrid = true,
  showTooltip = true,
  showAxis = true,
  gradientId = 'colorGradient',
  name = 'Value'
}: AreaChartProps) {
  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          )}
          {showAxis && (
            <>
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
            </>
          )}
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                color: '#f8fafc',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 6, fill: color, stroke: '#1e293b', strokeWidth: 2 }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
