'use client'

import { cn } from '@/lib/utils'

interface SettingsTab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface SettingsLayoutProps {
  tabs: SettingsTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  children: React.ReactNode
}

/** Settings page with left nav + content area */
export function SettingsLayout({ tabs, activeTab, onTabChange, children }: SettingsLayoutProps) {
  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <nav className="w-56 shrink-0 space-y-0.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors',
              activeTab === tab.id
                ? 'bg-brand-50 text-brand-700'
                : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
