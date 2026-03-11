import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SelectOption } from '@/types'

interface LookupResult {
  options: SelectOption[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const cache = new Map<string, SelectOption[]>()

/**
 * Fetches lookup/reference data from a table and returns it as SelectOption[].
 * Results are cached in memory to reduce repeat queries.
 *
 * @param table - The Supabase table name
 * @param valueColumn - Column to use as the option value (default: 'value')
 * @param labelColumn - Column to use as the option label (default: 'label')
 * @param filter - Optional: { column, value } to filter by category
 */
export function useLookup(
  table: string,
  valueColumn = 'value',
  labelColumn = 'label',
  filter?: { column: string; value: string }
): LookupResult {
  const cacheKey = `${table}:${valueColumn}:${labelColumn}:${filter?.column ?? ''}:${filter?.value ?? ''}`
  const [options, setOptions] = useState<SelectOption[]>(cache.get(cacheKey) ?? [])
  const [loading, setLoading] = useState(!cache.has(cacheKey))
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from(table)
        .select(`${valueColumn}, ${labelColumn}`)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (filter) {
        query = query.eq(filter.column, filter.value)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        setError('Failed to load options. Please try again.')
        return
      }

      const mapped: SelectOption[] = (data ?? []).map((row) => ({
        value: String(row[valueColumn as keyof typeof row]),
        label: String(row[labelColumn as keyof typeof row]),
      }))

      cache.set(cacheKey, mapped)
      setOptions(mapped)
    } catch {
      setError('Failed to load options. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [table, valueColumn, labelColumn, filter?.column, filter?.value, cacheKey])

  useEffect(() => {
    if (!cache.has(cacheKey)) {
      fetch()
    }
  }, [cacheKey, fetch])

  return { options, loading, error, refetch: fetch }
}
