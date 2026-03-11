'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  children: (activeTab: string) => React.ReactNode
  className?: string
}

export function Tabs({ tabs, defaultTab, onChange, children, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id)

  const handleChange = (tabId: string) => {
    setActive(tabId)
    onChange?.(tabId)
  }

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-border mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors',
              active === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                active === tab.id ? 'bg-brand-100 text-brand-700' : 'bg-surface-tertiary text-text-tertiary'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  )
}
