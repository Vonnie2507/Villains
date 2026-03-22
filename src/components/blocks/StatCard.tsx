import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, change, changeLabel, icon, className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <div className={cn(
      'bg-surface rounded-2xl border border-border shadow-card p-5',
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1.5 font-display tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-brand-50 text-brand-500">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
          {isPositive
            ? <TrendingUp className="w-3.5 h-3.5 text-status-success" />
            : <TrendingDown className="w-3.5 h-3.5 text-status-error" />
          }
          <span className={cn('text-xs font-semibold', isPositive ? 'text-status-success' : 'text-status-error')}>
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-xs text-text-tertiary">{changeLabel}</span>}
        </div>
      )}
    </div>
  )
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {children}
    </div>
  )
}
