'use client'

import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  width?: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No results found',
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  return (
    <div className={cn('bg-surface rounded-lg border border-border shadow-card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider',
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />
                        : <ChevronsUpDown className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-text-tertiary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={row[keyField] || i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-surface-secondary transition-colors'
                  )}
                >
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-text-primary">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
