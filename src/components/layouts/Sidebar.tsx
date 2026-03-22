'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Calendar, ClipboardList, Inbox, Users, MessageSquare,
  Settings, ChevronLeft, ChevronRight, LogOut, Palette, AlertTriangle,
  Package, ShoppingCart, FileText, DollarSign, CheckSquare
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

const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { id: 'dashboard',   label: 'Dashboard',             href: '/dashboard',           icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'enquiries',   label: 'Enquiries & Handoffs',  href: '/enquiries',           icon: <Inbox className="w-5 h-5" /> },
      { id: 'studio-inbox',label: 'Studio Inbox',           href: '/studio-inbox',        icon: <MessageSquare className="w-5 h-5" /> },
      { id: 'schedule',    label: 'Studio Calendar',        href: '/schedule',            icon: <Calendar className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Studio',
    items: [
      { id: 'team',        label: 'Staff Management',       href: '/team',                icon: <Users className="w-5 h-5" /> },
      { id: 'submissions', label: 'Weekly Schedules',        href: '/weekly-schedules',    icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'tasks',       label: 'Tasks & Roster',          href: '/tasks',               icon: <CheckSquare className="w-5 h-5" /> },
      { id: 'incidents',   label: 'Incidents',               href: '/incidents',           icon: <AlertTriangle className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Finance & Inventory',
    items: [
      { id: 'finance',     label: 'Finance & Transactions',  href: '/finance',             icon: <DollarSign className="w-5 h-5" /> },
      { id: 'products',    label: 'Products & Inventory',    href: '/products',            icon: <Package className="w-5 h-5" /> },
      { id: 'pos',         label: 'POS / Shop',              href: '/pos',                 icon: <ShoppingCart className="w-5 h-5" /> },
      { id: 'orders',      label: 'Purchase Orders',         href: '/purchase-orders',     icon: <FileText className="w-5 h-5" /> },
    ]
  },
]

const ARTIST_NAV: NavGroup[] = [
  {
    items: [
      { id: 'dashboard',   label: 'Artist Dashboard',       href: '/dashboard',           icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'schedule',    label: 'My Schedule',             href: '/schedule',            icon: <Calendar className="w-5 h-5" /> },
      { id: 'submissions', label: 'Weekly Submission',       href: '/weekly-schedules',    icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'clients',     label: 'My Clients',              href: '/clients',             icon: <Palette className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Communication',
    items: [
      { id: 'inbox',       label: 'Artist Inbox',            href: '/inbox',               icon: <Inbox className="w-5 h-5" /> },
      { id: 'messages',    label: 'Messages',                href: '/messages',            icon: <MessageSquare className="w-5 h-5" /> },
    ]
  },
]

function getNavForRole(role: UserRole | null): NavGroup[] {
  if (role === 'artist') return ARTIST_NAV
  return ADMIN_NAV
}

export function Sidebar({ activePath = '/dashboard' }: { activePath?: string }) {
  const [collapsed, setCollapsed] = useState(false)
  const { profile, role, signOut } = useAuth()
  const nav = getNavForRole(role)

  const displayName = profile?.display_name || profile?.full_name || 'User'
  const roleLabel = role === 'super_admin' ? 'Owner' : role === 'admin' ? 'Reception' : 'Artist'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-30 transition-all duration-200 sidebar-shell',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[var(--topbar-height)] sidebar-divider shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm sidebar-logo">
          V
        </div>
        {!collapsed && (
          <span className="text-[11px] font-semibold truncate sidebar-wordmark font-display">
            VILLAINS
          </span>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {nav.map((group, gi) => (
          <div key={gi}>
            {group.title && !collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase sidebar-group-title">
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
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                      isActive ? 'sidebar-active' : 'sidebar-inactive'
                    )}
                  >
                    {item.icon}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full sidebar-badge">
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

      {/* Bottom */}
      <div className="px-3 py-3 space-y-1 shrink-0 sidebar-divider-top">
        <a
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium sidebar-inactive transition-all duration-150"
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span>Settings</span>}
        </a>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 sidebar-logo">
            {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-text-primary">{displayName}</p>
              <p className="text-[11px] truncate text-text-tertiary">{roleLabel}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary transition-colors duration-150"
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
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center bg-surface-tertiary border border-border text-text-tertiary hover:text-text-primary transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
