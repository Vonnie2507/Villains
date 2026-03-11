'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  type: ToastType
  message: string
  description?: string
  onClose?: () => void
  className?: string
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-status-success" />,
  error:   <AlertCircle className="w-5 h-5 text-status-error" />,
  warning: <AlertTriangle className="w-5 h-5 text-status-warning" />,
  info:    <Info className="w-5 h-5 text-status-info" />,
}

const borders: Record<ToastType, string> = {
  success: 'border-l-status-success',
  error:   'border-l-status-error',
  warning: 'border-l-status-warning',
  info:    'border-l-status-info',
}

export function Toast({ type, message, description, onClose, className }: ToastProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 bg-surface border border-border border-l-4 rounded-lg shadow-dropdown',
      borders[type],
      className
    )}>
      {icons[type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{message}</p>
        {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-0.5 text-text-tertiary hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
