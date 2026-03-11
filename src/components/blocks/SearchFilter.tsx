'use client'

import { cn } from '@/lib/utils'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

interface FilterOption {
  id: string
  label: string
  options: { value: string; label: string }[]
}

interface SearchFilterProps {
  placeholder?: string
  filters?: FilterOption[]
  onSearch?: (query: string) => void
  onFilter?: (filters: Record<string, string>) => void
  actions?: React.ReactNode
  className?: string
}

export function SearchFilter({
  placeholder = 'Search...',
  filters = [],
  onSearch,
  onFilter,
  actions,
  className,
}: SearchFilterProps) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})

  const handleSearch = (value: string) => {
    setQuery(value)
    onSearch?.(value)
  }

  const handleFilter = (filterId: string, value: string) => {
    const updated = { ...activeFilters, [filterId]: value }
    if (!value) delete updated[filterId]
    setActiveFilters(updated)
    onFilter?.(updated)
  }

  const activeCount = Object.keys(activeFilters).length

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder={placeholder}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded border border-border bg-surface text-sm text-text-primary',
              'placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500'
            )}
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded border text-sm font-medium transition-colors',
              showFilters || activeCount > 0
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : 'border-border text-text-secondary hover:bg-surface-tertiary'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeCount > 0 && (
              <span className="bg-brand-600 text-text-inverse text-xs px-1.5 py-0.5 rounded-full">{activeCount}</span>
            )}
          </button>
        )}

        {/* Extra actions (e.g. Add New button) */}
        {actions}
      </div>

      {/* Filter row */}
      {showFilters && filters.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {filters.map(filter => (
            <select
              key={filter.id}
              value={activeFilters[filter.id] || ''}
              onChange={e => handleFilter(filter.id, e.target.value)}
              className="px-3 py-1.5 rounded border border-border bg-surface text-sm text-text-primary"
            >
              <option value="">{filter.label}</option>
              {filter.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}
          {activeCount > 0 && (
            <button
              onClick={() => { setActiveFilters({}); onFilter?.({}) }}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
