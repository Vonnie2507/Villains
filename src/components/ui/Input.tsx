'use client'

import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

export function Input({ label, error, hint, icon, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full rounded border bg-surface px-3 py-2 text-sm text-text-primary',
            'placeholder:text-text-tertiary',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
            icon && 'pl-10',
            error ? 'border-status-error' : 'border-border',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-status-error">{error}</p>}
      {hint && !error && <p className="text-sm text-text-tertiary">{hint}</p>}
    </div>
  )
}
