'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface DropdownItem {
  id: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  divider?: boolean
  onClick?: () => void
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  className?: string
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={cn(
          'absolute z-40 mt-2 min-w-[180px] bg-surface border border-border rounded-xl shadow-dropdown py-1.5',
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          {items.map(item =>
            item.divider ? (
              <div key={item.id} className="my-1.5 border-t border-border" />
            ) : (
              <button
                key={item.id}
                onClick={() => { item.onClick?.(); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors rounded-lg mx-1',
                  item.danger
                    ? 'text-status-error hover:bg-status-error-50'
                    : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                )}
                style={{ width: 'calc(100% - 8px)' }}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
