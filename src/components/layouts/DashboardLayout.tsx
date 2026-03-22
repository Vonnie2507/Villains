'use client'

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

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar activePath={activePath} />

      <div className="lg:ml-[var(--sidebar-width)]">
        <Topbar />
        <main className="p-[var(--page-padding)]">
          {children}
        </main>
      </div>
    </div>
  )
}
