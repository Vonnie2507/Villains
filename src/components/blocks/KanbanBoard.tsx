'use client'

import { cn } from '@/lib/utils'

interface KanbanCard {
  id: string
  title: string
  subtitle?: string
  badge?: React.ReactNode
  avatar?: React.ReactNode
}

interface KanbanColumn {
  id: string
  title: string
  count?: number
  colour?: string
  cards: KanbanCard[]
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onCardClick?: (card: KanbanCard) => void
  className?: string
}

export function KanbanBoard({ columns, onCardClick, className }: KanbanBoardProps) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {columns.map(col => (
        <div key={col.id} className="flex-shrink-0 w-72">
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3 px-1">
            {col.colour && <div className="w-2 h-2 rounded-full" style={{ background: col.colour }} />}
            <h3 className="text-sm font-semibold text-text-primary">{col.title}</h3>
            {col.count !== undefined && (
              <span className="text-xs text-text-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded-full">
                {col.count}
              </span>
            )}
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {col.cards.map(card => (
              <div
                key={card.id}
                onClick={() => onCardClick?.(card)}
                className={cn(
                  'bg-surface rounded-lg border border-border p-3 shadow-card',
                  onCardClick && 'cursor-pointer hover:shadow-dropdown transition-shadow'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{card.title}</p>
                    {card.subtitle && <p className="text-xs text-text-secondary mt-0.5">{card.subtitle}</p>}
                  </div>
                  {card.avatar}
                </div>
                {card.badge && <div className="mt-2">{card.badge}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
