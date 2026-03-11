'use client'

import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface DashboardLayoutProps {
  children: React.ReactNode
  activePath?: string
}

/** Main app shell — sidebar + topbar + content area */
export function DashboardLayout({ children, activePath }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <Sidebar activePath={activePath} />

      <div className="lg:ml-[var(--sidebar-width)] transition-all duration-200">
        <Topbar />
        <main className="p-[var(--page-padding)]">
          {children}
        </main>
      </div>
    </div>
  )
}
