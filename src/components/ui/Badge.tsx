import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface-tertiary text-text-secondary',
  success: 'bg-status-success-50 text-status-success-700 border-status-success/20',
  warning: 'bg-status-warning-50 text-status-warning-700 border-status-warning/20',
  error:   'bg-status-error-50 text-status-error-700 border-status-error/20',
  info:    'bg-status-info-50 text-status-info-700 border-status-info/20',
  brand:   'bg-brand-50 text-brand-700 border-brand-200',
}

const dotColours: Record<BadgeVariant, string> = {
  default: 'bg-text-tertiary',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error:   'bg-status-error',
  info:    'bg-status-info',
  brand:   'bg-brand-500',
}

export function Badge({ children, variant = 'default', dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColours[variant])} />}
      {children}
    </span>
  )
}
