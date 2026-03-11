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
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error:   'bg-red-50 text-red-700 border-red-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
  brand:   'bg-brand-50 text-brand-700 border-brand-200',
}

const dotColours: Record<BadgeVariant, string> = {
  default: 'bg-text-tertiary',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
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
