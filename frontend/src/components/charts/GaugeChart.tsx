import React, { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export interface GaugeChartProps {
  value: number;
  maxValue?: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function GaugeChart({
  value,
  maxValue = 100,
  label,
  size = 'md',
  color
}: GaugeChartProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const height = size === 'sm' ? 120 : size === 'md' ? 200 : 280;
  
  const getColor = (val: number) => {
    if (color) return color;
    if (val >= 80) return '#10b981'; // emerald
    if (val >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const chartColor = getColor(value);
  
  const data = [
    { name: 'value', value: animatedValue },
    { name: 'empty', value: maxValue - animatedValue }
  ];

  const innerRadius = size === 'sm' ? '60%' : size === 'md' ? '70%' : '75%';
  const outerRadius = size === 'sm' ? '80%' : size === 'md' ? '90%' : '95%';

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={180}
            endAngle={0}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={chartColor} className="transition-all duration-1000 ease-out" />
            <Cell fill="#1e293b" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
        <div className="text-3xl font-bold text-slate-100">{value}</div>
        <div className="text-sm text-slate-400 font-medium">{label}</div>
      </div>
    </div>
  );
}
