interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

/** Centred card layout for login/signup pages */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center">
            <span className="text-text-inverse text-xl font-bold">E</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-xl border border-border shadow-card p-8">
          {title && <h1 className="text-xl font-bold text-text-primary text-center">{title}</h1>}
          {subtitle && <p className="text-sm text-text-secondary text-center mt-1">{subtitle}</p>}
          <div className="mt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
