'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardLayoutProps {
  children: React.ReactNode
  activePath?: string
}

/** Main app shell — sidebar + topbar + content area */
export function DashboardLayout({ children, activePath }: DashboardLayoutProps) {
  const { loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar activePath={activePath} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 h-full w-[var(--sidebar-width)] max-w-[85vw]">
            <Sidebar activePath={activePath} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:ml-[var(--sidebar-width)]">
        <Topbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="p-[var(--page-padding)] pb-[calc(var(--page-padding)+env(safe-area-inset-bottom))]">
          {children}
        </main>
      </div>
    </div>
  )
}
