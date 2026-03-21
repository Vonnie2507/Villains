'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Calendar, DollarSign, Users, MessageSquare,
  Settings, ChevronLeft, ChevronRight, LogOut, Inbox,
  UserCircle, ClipboardList, AlertTriangle, Palette
} from 'lucide-react'
import type { UserRole } from '@/types'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
}

interface NavGroup {
  title?: string
  items: NavItem[]
}

/** Admin/reception sidebar navigation */
const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard',    href: '/dashboard',  icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'schedule',  label: 'Schedule',     href: '/schedule',   icon: <Calendar className="w-5 h-5" /> },
      { id: 'payments',  label: 'Payments',     href: '/payments',   icon: <DollarSign className="w-5 h-5" /> },
      { id: 'enquiries', label: 'Enquiries',    href: '/enquiries',  icon: <Inbox className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Studio',
    items: [
      { id: 'team',      label: 'Team',         href: '/team',       icon: <Users className="w-5 h-5" /> },
      { id: 'messages',  label: 'Messages',     href: '/messages',   icon: <MessageSquare className="w-5 h-5" /> },
      { id: 'incidents', label: 'Incidents',     href: '/incidents',  icon: <AlertTriangle className="w-5 h-5" /> },
    ]
  },
]

/** Artist-side sidebar navigation */
const ARTIST_NAV: NavGroup[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard',    href: '/dashboard',  icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'schedule',  label: 'My Schedule',  href: '/schedule',   icon: <Calendar className="w-5 h-5" /> },
      { id: 'payments',  label: 'Payments',     href: '/payments',   icon: <DollarSign className="w-5 h-5" /> },
      { id: 'clients',   label: 'My Clients',   href: '/clients',    icon: <Palette className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Communication',
    items: [
      { id: 'bookings',  label: 'Bookings',     href: '/bookings',   icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'messages',  label: 'Messages',     href: '/messages',   icon: <MessageSquare className="w-5 h-5" /> },
    ]
  },
]

function getNavForRole(role: UserRole | null): NavGroup[] {
  if (role === 'artist') return ARTIST_NAV
  return ADMIN_NAV
}

interface SidebarProps {
  activePath?: string
}

export function Sidebar({ activePath = '/dashboard' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, role, signOut } = useAuth()
  const nav = getNavForRole(role)

  const displayName = profile?.display_name || profile?.full_name || 'User'
  const roleLabel = role === 'super_admin' ? 'Owner' : role === 'admin' ? 'Reception' : 'Artist'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-30 transition-all duration-200',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[var(--topbar-height)] border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
          V
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
            Villains Tattoo
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider"
                 style={{ color: 'var(--sidebar-text)' }}>
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = activePath === item.href
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'text-white' : 'hover:text-white'
                    )}
                    style={{
                      color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                      background: isActive ? 'var(--sidebar-active)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.target as HTMLElement).style.background = 'var(--sidebar-hover)' }}
                    onMouseLeave={e => { if (!isActive) (e.target as HTMLElement).style.background = 'transparent' }}
                  >
                    {item.icon}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + User + Logout */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1 shrink-0">
        <a
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: 'var(--sidebar-text)' }}
          onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--sidebar-hover)'}
          onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span>Settings</span>}
        </a>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--sidebar-text)' }}>{roleLabel}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              className="p-1.5 rounded hover:bg-white/10 text-neutral-500 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center text-text-tertiary hover:text-text-primary"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
