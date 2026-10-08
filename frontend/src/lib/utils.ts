import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toFixed(0)
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(1) + ' GB'
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + ' MB'
  if (bytes >= 1_024) return (bytes / 1_024).toFixed(1) + ' KB'
  return bytes + ' B'
}

export function formatLatency(ms: number): string {
  if (ms >= 1_000) return (ms / 1_000).toFixed(2) + 's'
  return ms.toFixed(0) + 'ms'
}

export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN')}`
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-emerald-400'
    case 'warning': return 'text-amber-400'
    case 'critical': return 'text-red-400'
    case 'failed': return 'text-red-500'
    case 'offline': return 'text-slate-500'
    default: return 'text-slate-400'
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'healthy': return 'bg-emerald-500/10 border-emerald-500/20'
    case 'warning': return 'bg-amber-500/10 border-amber-500/20'
    case 'critical': return 'bg-red-500/10 border-red-500/20'
    case 'failed': return 'bg-red-500/20 border-red-500/30'
    case 'offline': return 'bg-slate-500/10 border-slate-500/20'
    default: return 'bg-slate-500/10 border-slate-500/20'
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ef4444'
    case 'high': return '#f97316'
    case 'medium': return '#f59e0b'
    case 'low': return '#3b82f6'
    case 'info': return '#64748b'
    default: return '#64748b'
  }
}

export function generateSparklineData(base: number, variance: number, points = 20): number[] {
  const data: number[] = []
  let current = base
  for (let i = 0; i < points; i++) {
    current = current + (Math.random() - 0.5) * variance
    current = Math.max(0, current)
    data.push(Math.round(current * 10) / 10)
  }
  return data
}
