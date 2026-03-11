'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface CalendarEvent {
  id: string
  title: string
  date: string     // YYYY-MM-DD
  colour?: string
  time?: string
}

interface CalendarViewProps {
  events?: CalendarEvent[]
  onDateClick?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  className?: string
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarView({ events = [], onDateClick, onEventClick, className }: CalendarViewProps) {
  const [current, setCurrent] = useState(new Date())
  const year = current.getFullYear()
  const month = current.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday start
  const totalDays = lastDay.getDate()

  const today = new Date().toISOString().split('T')[0]

  const prev = () => setCurrent(new Date(year, month - 1, 1))
  const next = () => setCurrent(new Date(year, month + 1, 1))

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return (
    <div className={cn('bg-surface rounded-lg border border-border shadow-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-text-primary">{MONTHS[month]} {year}</h3>
        <div className="flex items-center gap-1">
          <button onClick={prev} className="p-1.5 rounded hover:bg-surface-tertiary text-text-secondary">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded"
          >
            Today
          </button>
          <button onClick={next} className="p-1.5 rounded hover:bg-surface-tertiary text-text-secondary">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map(d => (
          <div key={d} className="px-2 py-2 text-xs font-semibold text-text-tertiary text-center uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for offset */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border bg-surface-secondary" />
        ))}

        {/* Day cells */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1
          const dateStr = getDateStr(day)
          const dayEvents = events.filter(e => e.date === dateStr)
          const isToday = dateStr === today

          return (
            <div
              key={day}
              onClick={() => onDateClick?.(dateStr)}
              className={cn(
                'min-h-[80px] p-1.5 border-b border-r border-border',
                onDateClick && 'cursor-pointer hover:bg-surface-secondary'
              )}
            >
              <span className={cn(
                'inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full',
                isToday ? 'bg-brand-600 text-text-inverse' : 'text-text-secondary'
              )}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map(evt => (
                  <div
                    key={evt.id}
                    onClick={e => { e.stopPropagation(); onEventClick?.(evt) }}
                    className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer"
                    style={{
                      backgroundColor: (evt.colour || 'var(--brand-500)') + '20',
                      color: evt.colour || 'var(--brand-700)',
                    }}
                  >
                    {evt.time && <span className="font-medium">{evt.time} </span>}
                    {evt.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-text-tertiary px-1.5">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
