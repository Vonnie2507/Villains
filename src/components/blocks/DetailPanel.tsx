import { cn } from '@/lib/utils'

interface DetailField {
  label: string
  value: React.ReactNode
}

interface DetailPanelProps {
  title?: string
  fields: DetailField[]
  columns?: 1 | 2 | 3
  className?: string
}

/** Read-only detail view — shows label:value pairs in a grid */
export function DetailPanel({ title, fields, columns = 2, className }: DetailPanelProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <div className={cn('bg-surface rounded-lg border border-border shadow-card', className)}>
      {title && (
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        </div>
      )}
      <div className={cn('grid gap-4 px-6 py-5', gridCols[columns])}>
        {fields.map((field, i) => (
          <div key={i}>
            <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{field.label}</dt>
            <dd className="mt-1 text-sm text-text-primary">{field.value || '—'}</dd>
          </div>
        ))}
      </div>
    </div>
  )
}
