'use client'

import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'w-full rounded border bg-surface px-3 py-2 text-sm text-text-primary min-h-[80px]',
          'placeholder:text-text-tertiary',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          error ? 'border-status-error' : 'border-border',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-status-error">{error}</p>}
    </div>
  )
}
