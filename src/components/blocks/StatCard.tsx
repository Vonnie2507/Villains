import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number          // Percentage change e.g. +12.5 or -3.2
  changeLabel?: string     // e.g. "vs last month"
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, change, changeLabel, icon, className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <div className={cn(
      'bg-surface rounded-lg border border-border shadow-card p-[var(--card-padding)]',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-3">
          {isPositive
            ? <TrendingUp className="w-4 h-4 text-status-success" />
            : <TrendingDown className="w-4 h-4 text-status-error" />
          }
          <span className={cn('text-sm font-medium', isPositive ? 'text-status-success' : 'text-status-error')}>
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-sm text-text-tertiary">{changeLabel}</span>}
        </div>
      )}
    </div>
  )
}

/** Grid wrapper for stat cards — responsive 2/3/4 column */
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {children}
    </div>
  )
}
