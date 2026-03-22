'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getInitials } from '@/lib/utils'
import { Dropdown } from '@/components/ui/Dropdown'

interface TopbarProps {
  onMenuClick?: () => void
  notifications?: number
}

export function Topbar({ onMenuClick, notifications = 0 }: TopbarProps) {
  const { profile, signOut } = useAuth()
  const initials = profile ? getInitials(profile.display_name || profile.full_name) : 'U'

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

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-text-tertiary text-xs w-56 cursor-pointer transition" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Search className="w-3.5 h-3.5" />
          <span style={{ letterSpacing: '0.05em' }}>Search</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
            /
          </kbd>
        </div>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded hover:bg-surface-tertiary text-text-secondary">
          <Bell className="w-5 h-5" />
          {notifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-status-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </button>

        <Dropdown
          trigger={
            <button className="p-2 rounded hover:bg-surface-tertiary text-text-secondary">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#C6A667', color: '#0B0B0B' }}>
                {initials}
              </div>
            </button>
          }
          items={[
            { id: 'profile', label: 'My Profile', onClick: () => window.location.href = '/settings' },
            { id: 'settings', label: 'Settings', onClick: () => window.location.href = '/settings' },
            { id: 'div', label: '', divider: true },
            { id: 'logout', label: 'Sign out', danger: true, onClick: signOut },
          ]}
        />
      </div>
    </header>
  )
}
