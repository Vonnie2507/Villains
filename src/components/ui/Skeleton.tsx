import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circle' | 'rect'
}

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-tertiary',
        variant === 'text' && 'h-4 rounded',
        variant === 'circle' && 'rounded-full',
        variant === 'rect' && 'rounded-lg',
        className
      )}
    />
  )
}

/** Pre-built loading state for a card */
export function CardSkeleton() {
  return (
    <div className="bg-surface rounded-lg border border-border p-[var(--card-padding)] space-y-3">
      <Skeleton className="w-1/3 h-5" />
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-2/3 h-4" />
    </div>
  )
}

/** Pre-built loading state for a table row */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="w-full h-4" />
        </td>
      ))}
    </tr>
  )
}
