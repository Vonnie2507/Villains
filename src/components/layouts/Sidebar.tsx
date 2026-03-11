'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Briefcase, FileText, Calendar, Package,
  BarChart3, Settings, ChevronLeft, ChevronRight, LogOut, Bell,
  UserCircle, Menu, UsersRound
} from 'lucide-react'

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

/** Default nav structure — customise per client by changing this array */
const DEFAULT_NAV: NavGroup[] = [
  {
    items: [
      { id: 'dashboard', label: 'Dashboard',  href: '/dashboard',  icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'contacts',  label: 'Contacts',   href: '/contacts',   icon: <Users className="w-5 h-5" /> },
      { id: 'jobs',      label: 'Jobs',        href: '/jobs',       icon: <Briefcase className="w-5 h-5" /> },
      { id: 'quotes',    label: 'Quotes',      href: '/quotes',     icon: <FileText className="w-5 h-5" /> },
      { id: 'calendar',  label: 'Calendar',    href: '/calendar',   icon: <Calendar className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Operations',
    items: [
      { id: 'inventory', label: 'Inventory',   href: '/inventory',  icon: <Package className="w-5 h-5" /> },
      { id: 'team',      label: 'Team',         href: '/team',       icon: <UsersRound className="w-5 h-5" /> },
      { id: 'reports',   label: 'Reports',      href: '/reports',    icon: <BarChart3 className="w-5 h-5" /> },
    ]
  },
]

interface SidebarProps {
  nav?: NavGroup[]
  activePath?: string
  companyName?: string
  companyLogo?: string
  userName?: string
  userRole?: string
}

export function Sidebar({
  nav = DEFAULT_NAV,
  activePath = '/dashboard',
  companyName = 'Company Name',
  companyLogo,
  userName = 'User Name',
  userRole = 'Admin',
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-30 transition-all duration-200',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo / Company */}
      <div className="flex items-center gap-3 px-4 h-[var(--topbar-height)] border-b border-text-inverse/10 shrink-0">
        {companyLogo ? (
          <img src={companyLogo} alt={companyName} className="w-8 h-8 rounded" />
        ) : (
          <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-text-inverse font-bold text-sm">
            {companyName[0]}
          </div>
        )}
        {!collapsed && <span className="text-sm font-semibold text-text-inverse truncate">{companyName}</span>}
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
                      isActive
                        ? 'text-text-inverse'
                        : 'hover:text-text-inverse'
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
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-xs bg-brand-500 text-text-inverse px-1.5 py-0.5 rounded-full">
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

      {/* Bottom: Settings + User */}
      <div className="border-t border-text-inverse/10 px-3 py-3 space-y-1 shrink-0">
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
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-text-inverse text-xs font-bold shrink-0">
            {userName.split(' ').map(n => n[0]).join('')}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-inverse truncate">{userName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--sidebar-text)' }}>{userRole}</p>
            </div>
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
