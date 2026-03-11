'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'

interface TopbarProps {
  onMenuClick?: () => void
  notifications?: number
}

export function Topbar({ onMenuClick, notifications = 0 }: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 border-b"
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--topbar-bg)',
        borderColor: 'var(--topbar-border)',
      }}
    >
      {/* Left: mobile menu + search */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded hover:bg-surface-tertiary text-text-secondary"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-secondary text-text-tertiary text-sm w-64 cursor-pointer hover:bg-surface-tertiary">
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-xs bg-surface border border-border px-1.5 py-0.5 rounded">
            /
          </kbd>
        </div>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded hover:bg-surface-tertiary text-text-secondary">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-status-error text-text-inverse text-[10px] font-bold rounded-full flex items-center justify-center">
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </button>

        <Dropdown
          trigger={
            <button className="p-2 rounded hover:bg-surface-tertiary text-text-secondary">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                U
              </div>
            </button>
          }
          items={[
            { id: 'profile', label: 'My Profile', onClick: () => {} },
            { id: 'settings', label: 'Settings', onClick: () => {} },
            { id: 'div', label: '', divider: true },
            { id: 'logout', label: 'Log out', danger: true, onClick: () => {} },
          ]}
        />
      </div>
    </header>
  )
}
