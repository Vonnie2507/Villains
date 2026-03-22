/** Centred card layout for login pages */
interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg sidebar-logo">
            <span className="text-2xl font-bold font-display">V</span>
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase text-text-tertiary font-display sidebar-wordmark">
            VILLAINS STUDIO HUB
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-xl border border-border shadow-card p-8">
          {title && <h1 className="text-xl font-bold text-text-primary text-center font-display">{title}</h1>}
          {subtitle && <p className="text-sm text-text-secondary text-center mt-1">{subtitle}</p>}
          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
