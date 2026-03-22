'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/blocks/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ScheduleDay, ScheduleDayStatus, Session, ArtistProfile } from '@/types'
import { ChevronLeft, ChevronRight, Calendar, AlertCircle, MailOpen } from 'lucide-react'

// ── Date helpers ──

function mondayOfWeek(d: Date = new Date()): string {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return date.toISOString().split('T')[0]
}

function weekDates(startISO: string): string[] {
  const start = new Date(startISO + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function shiftWeek(startISO: string, weeks: number): string {
  const d = new Date(startISO + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function formatWeekLabel(startISO: string): string {
  const s = new Date(startISO + 'T00:00:00')
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-AU', opts)
  return `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function shortDay(dateISO: string): string {
  return new Date(dateISO + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })
}

function dayNum(dateISO: string): number {
  return new Date(dateISO + 'T00:00:00').getDate()
}

// ── Loading states ──

type LoadState = 'loading' | 'loaded' | 'error'

// ── Page ──

export default function SchedulePage() {
  const { isAdmin, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <DashboardLayout activePath="/schedule">
        <LoadingSpinner />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activePath="/schedule">
      {isAdmin ? <AdminCalendar /> : <ArtistCalendar />}
    </DashboardLayout>
  )
}

// ── Admin view ──

function AdminCalendar() {
  const [weekStart, setWeekStart] = useState(mondayOfWeek)
  const [artists, setArtists] = useState<ArtistProfile[]>([])
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const abortRef = useRef(0)

  const dates = weekDates(weekStart)
  const todayISO = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const token = ++abortRef.current
    setState('loading')

    async function load() {
      try {
        const [a, d, s] = await Promise.all([
          supabase.from('artist_profiles').select('*').order('display_name'),
          supabase.from('schedule_days').select('*').gte('date', dates[0]).lte('date', dates[6]),
          supabase.from('sessions').select('*').gte('date', dates[0]).lte('date', dates[6]),
        ])

        // Stale request — a newer one replaced us
        if (token !== abortRef.current) return

        if (a.error) throw new Error(`Artists: ${a.error.message}`)
        if (d.error) throw new Error(`Schedule: ${d.error.message}`)
        if (s.error) throw new Error(`Sessions: ${s.error.message}`)

        setArtists((a.data ?? []) as ArtistProfile[])
        setDays((d.data ?? []) as ScheduleDay[])
        setSessions((s.data ?? []) as Session[])
        setState('loaded')
      } catch (err) {
        if (token !== abortRef.current) return
        console.error('Calendar load error:', err)
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load calendar')
        setState('error')
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  function dayFor(artistId: string, date: string) {
    return days.find(d => d.artist_id === artistId && d.date === date)
  }

  function sessionsFor(artistId: string, date: string) {
    return sessions.filter(s => s.artist_id === artistId && s.date === date)
  }

  function badgeVariant(status: ScheduleDayStatus) {
    if (status === 'off') return 'default' as const
    if (status === 'in_booked') return 'brand' as const
    return 'info' as const
  }

  return (
    <div>
      <PageHeader title="Studio Calendar" description="All artists' schedules at a glance" />
      <WeekNav weekStart={weekStart} onPrev={() => setWeekStart(shiftWeek(weekStart, -1))} onNext={() => setWeekStart(shiftWeek(weekStart, 1))} />

      {state === 'loading' && <LoadingSpinner />}

      {state === 'error' && (
        <ErrorBanner message={errorMsg} onRetry={() => setWeekStart(weekStart)} />
      )}

      {state === 'loaded' && artists.length === 0 && (
        <Card>
          <EmptyState icon={<Calendar className="w-12 h-12" />} title="No artists found" description="Add artists to start using the studio calendar." />
        </Card>
      )}

      {state === 'loaded' && artists.length > 0 && (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider w-44">Artist</th>
                  {dates.map(date => (
                    <th key={date} className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider ${date === todayISO ? 'text-brand-500' : 'text-text-secondary'}`}>
                      {shortDay(date)}<br />
                      <span className="text-text-tertiary font-normal">{dayNum(date)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {artists.map(artist => (
                  <tr key={artist.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">{artist.display_name || 'Artist'}</p>
                      {artist.seat_name_or_number && <p className="text-xs text-text-tertiary">Seat {artist.seat_name_or_number}</p>}
                    </td>
                    {dates.map(date => {
                      const day = dayFor(artist.id, date)
                      const sess = sessionsFor(artist.id, date)
                      const sc = day ? SCHEDULE_DAY_COLOURS[day.status as ScheduleDayStatus] : null
                      const missingEnvelope = sess.some(s => !s.envelope_submitted)

                      return (
                        <td key={date} className={`text-center px-2 py-3 ${date === todayISO ? 'bg-brand-50/20' : ''}`}>
                          {sc ? (
                            <Badge variant={badgeVariant(day!.status as ScheduleDayStatus)}>{sc.label}</Badge>
                          ) : (
                            <span className="text-xs text-text-tertiary">&mdash;</span>
                          )}
                          {sess.length > 0 && (
                            <p className="text-[10px] text-text-tertiary mt-0.5">{sess.length} sess</p>
                          )}
                          {missingEnvelope && sess.length > 0 && (
                            <MailOpen className="w-3 h-3 text-status-warning mx-auto mt-0.5" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Artist view ──

function ArtistCalendar() {
  const { user } = useAuth()
  const [artistId, setArtistId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(mondayOfWeek)
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const abortRef = useRef(0)

  const dates = weekDates(weekStart)
  const todayISO = new Date().toISOString().split('T')[0]

  // Step 1: resolve artist profile
  useEffect(() => {
    if (!user) {
      setState('error')
      setErrorMsg('Not signed in')
      return
    }

    async function resolve() {
      try {
        const { data, error } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('user_id', user!.id)
          .single()

        if (error || !data) {
          setArtistId(null)
          setState('loaded') // loaded but no profile — show empty state
          return
        }
        setArtistId(data.id)
      } catch {
        setState('error')
        setErrorMsg('Could not load artist profile')
      }
    }

    resolve()
  }, [user])

  // Step 2: load schedule data once we have artistId
  useEffect(() => {
    if (!artistId) return

    const token = ++abortRef.current
    setState('loading')

    async function load() {
      try {
        const [d, s] = await Promise.all([
          supabase.from('schedule_days').select('*').eq('artist_id', artistId).gte('date', dates[0]).lte('date', dates[6]),
          supabase.from('sessions').select('*').eq('artist_id', artistId).gte('date', dates[0]).lte('date', dates[6]).order('start_time'),
        ])

        if (token !== abortRef.current) return

        if (d.error) throw new Error(`Schedule: ${d.error.message}`)
        if (s.error) throw new Error(`Sessions: ${s.error.message}`)

        setDays((d.data ?? []) as ScheduleDay[])
        setSessions((s.data ?? []) as Session[])
        setState('loaded')
      } catch (err) {
        if (token !== abortRef.current) return
        console.error('Artist calendar error:', err)
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load schedule')
        setState('error')
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, weekStart])

  // No artist profile
  if (state === 'loaded' && !artistId) {
    return (
      <div>
        <PageHeader title="My Schedule" />
        <Card>
          <EmptyState icon={<Calendar className="w-12 h-12" />} title="No artist profile found" description="Contact an admin to set up your artist profile." />
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="My Schedule" description="Your status and sessions for each day" />
      <WeekNav weekStart={weekStart} onPrev={() => setWeekStart(shiftWeek(weekStart, -1))} onNext={() => setWeekStart(shiftWeek(weekStart, 1))} />

      {state === 'loading' && <LoadingSpinner />}

      {state === 'error' && (
        <ErrorBanner message={errorMsg} onRetry={() => setWeekStart(weekStart)} />
      )}

      {state === 'loaded' && (
        <div className="space-y-3">
          {dates.map(date => {
            const day = days.find(d => d.date === date)
            const daySessions = sessions.filter(s => s.date === date)
            const isToday = date === todayISO
            const sc = day ? SCHEDULE_DAY_COLOURS[day.status as ScheduleDayStatus] : null

            return (
              <Card key={date} className={isToday ? 'ring-1 ring-brand-500' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${isToday ? 'text-brand-500' : 'text-text-primary'}`}>
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {sc && <Badge variant={day!.status === 'off' ? 'default' : 'brand'}>{sc.label}</Badge>}
                  </div>
                  <span className="text-xs text-text-tertiary">{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}</span>
                </div>
                {daySessions.length > 0 && (
                  <div className="space-y-1">
                    {daySessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-tertiary text-xs">
                        <span className="text-text-primary font-medium">{s.client_reference || 'Client'}</span>
                        <span className="text-text-tertiary">{s.session_type?.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Shared components ──

function WeekNav({ weekStart, onPrev, onNext }: { weekStart: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <Button variant="ghost" size="sm" onClick={onPrev}>
        <ChevronLeft className="w-4 h-4" /> Prev
      </Button>
      <p className="text-sm font-semibold text-text-primary">{formatWeekLabel(weekStart)}</p>
      <Button variant="ghost" size="sm" onClick={onNext}>
        Next <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-status-error/30">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-status-error shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">Something went wrong</p>
          <p className="text-xs text-text-secondary mt-0.5">{message}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    </Card>
  )
}
