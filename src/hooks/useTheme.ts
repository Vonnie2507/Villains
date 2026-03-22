import { useState, useCallback, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'villains-theme'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'light'
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemTheme()
  return mode
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getStoredMode()))

  // Apply theme on mount and when mode changes
  useEffect(() => {
    const r = resolveTheme(mode)
    setResolved(r)
    applyTheme(r)
  }, [mode])

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const r = resolveTheme('system')
      setResolved(r)
      applyTheme(r)
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m)
    setModeState(m)
  }, [])

  const toggleTheme = useCallback(() => {
    setMode(resolved === 'light' ? 'dark' : 'light')
  }, [resolved, setMode])

  return { mode, resolved, setMode, toggleTheme }
}
