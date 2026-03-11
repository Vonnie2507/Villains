import { cn } from '@/lib/utils'

interface TimelineItem {
  id: string
  title: string
  description?: string
  timestamp: string
  icon?: React.ReactNode
  iconBg?: string
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, i) => (
        <div key={item.id} className="flex gap-3">
          {/* Line + dot */}
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              item.iconBg || 'bg-brand-100 text-brand-600'
            )}>
              {item.icon || <div className="w-2 h-2 rounded-full bg-brand-500" />}
            </div>
            {i < items.length - 1 && <div className="w-px flex-1 bg-border min-h-[24px]" />}
          </div>

          {/* Content */}
          <div className="pb-6">
            <p className="text-sm font-medium text-text-primary">{item.title}</p>
            {item.description && <p className="text-sm text-text-secondary mt-0.5">{item.description}</p>}
            <p className="text-xs text-text-tertiary mt-1">{item.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
