import { cn } from '@/lib/utils'

interface FormPanelProps {
  title?: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/** A card-style form container with title, fields area, and action bar */
export function FormPanel({ title, description, children, actions, className }: FormPanelProps) {
  return (
    <div className={cn('bg-surface rounded-lg border border-border shadow-card', className)}>
      {/* Header */}
      {(title || description) && (
        <div className="px-6 py-4 border-b border-border">
          {title && <h3 className="text-base font-semibold text-text-primary">{title}</h3>}
          {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
        </div>
      )}

      {/* Fields */}
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-secondary rounded-b-lg">
          {actions}
        </div>
      )}
    </div>
  )
}

/** Two-column form row — label on left, field on right (desktop) */
export function FormRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
      </div>
      <div className="md:col-span-2">
        {children}
      </div>
    </div>
  )
}
