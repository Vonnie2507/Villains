'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { getWeekStart, getWeekDates, formatWeekRange, shiftWeek, isCurrentWeek } from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS, SCHEDULE_DAY_STATUS_OPTIONS, ENVELOPE_STATUS_LABELS } from '@/types'
import type { ScheduleDay, ScheduleDayStatus, Session, ArtistProfile, EnvelopeStatus, WeeklySubmission } from '@/types'
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Mail,
  ClipboardCheck, AlertCircle, Trash2, CalendarDays, ArrowDownWideNarrow, Clock
} from 'lucide-react'

export default function SchedulePage() {
  const { isAdmin, loading: authLoading } = useAuth()

  return (
    <DashboardLayout activePath="/schedule">
      {authLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isAdmin ? (
        <AdminCalendar />
      ) : (
        <ArtistCalendar />
      )}
    </DashboardLayout>
  )
}

/* ══════════════════════════════════════════════════════════
   ADMIN CALENDAR — read-only overview of all artists
   Three views:
     1. Week        — default grid (artists × days)
     2. Busiest     — same grid sorted by most bookings
     3. Day         — single-day view with hourly time slots
   ══════════════════════════════════════════════════════════ */

type AdminView = 'week' | 'busiest' | 'day'

const HOUR_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM',
]

// Convert "HH:MM:SS" or "HH:MM" to hour index (0 = 8am, 1 = 9am, etc.)
function timeToSlot(time: string | null): number | null {
  if (!time) return null
  const hour = parseInt(time.split(':')[0], 10)
  if (hour < 8 || hour > 19) return null
  return hour - 8
}

function AdminCalendar() {
  const [view, setView] = useState<AdminView>('week')
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [artists, setArtists] = useState<ArtistProfile[]>([])
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loaded, setLoaded] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const startDate = weekDates[0]
    const endDate = weekDates[6]

    setLoaded(false)
    Promise.all([
      supabase.from('artist_profiles').select('*').order('display_name'),
      supabase.from('schedule_days').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('sessions').select('*').gte('date', startDate).lte('date', endDate),
    ]).then(([a, d, s]) => {
      setArtists((a.data || []) as ArtistProfile[])
      setDays((d.data || []) as ScheduleDay[])
      setSessions((s.data || []) as Session[])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  function getDayForArtist(artistId: string, date: string) {
    return days.find(d => d.artist_id === artistId && d.date === date)
  }
  function getSessionsForArtist(artistId: string, date: string) {
    return sessions.filter(s => s.artist_id === artistId && s.date === date)
  }
  function getWeekSessionCount(artistId: string) {
    return sessions.filter(s => s.artist_id === artistId).length
  }

  // For busiest view — sort artists by total sessions this week (descending)
  const sortedArtists = view === 'busiest'
    ? [...artists].sort((a, b) => getWeekSessionCount(b.id) - getWeekSessionCount(a.id))
    : artists

  // For day view — only show artists who are working that day
  const dayArtists = artists.filter(a => {
    const day = getDayForArtist(a.id, selectedDate)
    return day && day.status !== 'off'
  })

  // When switching to day view, default selectedDate to today if it's in the current week
  function switchToDay(date?: string) {
    setView('day')
    if (date) setSelectedDate(date)
    else if (weekDates.includes(todayStr)) setSelectedDate(todayStr)
    else setSelectedDate(weekDates[0])
  }

  return (
    <div>
      <PageHeader title="Studio Calendar" description="All artists' schedules at a glance" />

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={view === 'week' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('week')}
          icon={<CalendarDays className="w-4 h-4" />}
        >
          Week
        </Button>
        <Button
          variant={view === 'busiest' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setView('busiest')}
          icon={<ArrowDownWideNarrow className="w-4 h-4" />}
        >
          Busiest
        </Button>
        <Button
          variant={view === 'day' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => switchToDay()}
          icon={<Clock className="w-4 h-4" />}
        >
          Day
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        <p className="text-sm font-semibold text-text-primary">{formatWeekRange(weekStart)}</p>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day selector — only shown in day view */}
      {view === 'day' && (
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {weekDates.map(date => {
            const isSelected = date === selectedDate
            const isToday = date === todayStr
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all min-w-[52px] ${
                  isSelected
                    ? 'bg-brand-600 text-text-inverse'
                    : isToday
                      ? 'bg-brand-50 text-brand-500 hover:bg-brand-100'
                      : 'bg-surface-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="text-[9px] uppercase">{new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}</span>
                <span className="text-sm">{new Date(date + 'T00:00:00').getDate()}</span>
              </button>
            )
          })}
        </div>
      )}

      {!loaded ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : artists.length === 0 ? (
        <Card><p className="text-center text-text-secondary py-8">No artists found</p></Card>
      ) : view === 'day' ? (
        /* ── DAY VIEW — time slots × artists ── */
        <DayView
          artists={dayArtists}
          allArtists={artists}
          sessions={sessions}
          days={days}
          selectedDate={selectedDate}
        />
      ) : (
        /* ── WEEK / BUSIEST VIEW — artists × days grid ── */
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider w-44">
                    Artist
                    {view === 'busiest' && <span className="text-brand-500 ml-1">(by bookings)</span>}
                  </th>
                  {view === 'busiest' && (
                    <th className="text-center px-2 py-3 text-xs font-semibold text-brand-500 uppercase tracking-wider w-20">Total</th>
                  )}
                  {weekDates.map(date => (
                    <th key={date} className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider ${date === todayStr ? 'text-brand-500' : 'text-text-secondary'}`}>
                      <button onClick={() => switchToDay(date)} className="hover:text-brand-500 transition-colors">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}<br/>
                        <span className="text-text-tertiary font-normal">{new Date(date + 'T00:00:00').getDate()}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedArtists.map(artist => {
                  const weekTotal = getWeekSessionCount(artist.id)
                  return (
                    <tr key={artist.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{artist.display_name || 'Artist'}</p>
                        {artist.seat_name_or_number && <p className="text-xs text-text-tertiary">Seat {artist.seat_name_or_number}</p>}
                      </td>
                      {view === 'busiest' && (
                        <td className="text-center px-2 py-3">
                          <span className={`text-sm font-bold ${weekTotal > 0 ? 'text-brand-500' : 'text-text-tertiary'}`}>{weekTotal}</span>
                        </td>
                      )}
                      {weekDates.map(date => {
                        const day = getDayForArtist(artist.id, date)
                        const sess = getSessionsForArtist(artist.id, date)
                        const sc = day ? SCHEDULE_DAY_COLOURS[day.status as ScheduleDayStatus] : null

                        return (
                          <td key={date} className={`text-center px-2 py-3 ${date === todayStr ? 'bg-brand-50/20' : ''}`}>
                            {sc ? (
                              <Badge variant={day!.status === 'off' || (day!.status as string) === 'cancelled' ? 'default' : day!.status === 'in_booked' ? 'success' : 'brand'}>
                                {sc.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-text-tertiary">&mdash;</span>
                            )}
                            {sess.length > 0 && (
                              <p className="text-[10px] text-text-tertiary mt-0.5">{sess.length} client{sess.length !== 1 ? 's' : ''}</p>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ── Day View Component — hourly time grid ── */

function DayView({
  artists,
  allArtists,
  sessions,
  days,
  selectedDate,
}: {
  artists: ArtistProfile[]
  allArtists: ArtistProfile[]
  sessions: Session[]
  days: ScheduleDay[]
  selectedDate: string
}) {
  const daySessions = sessions.filter(s => s.date === selectedDate)
  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // Artists not working today
  const offArtists = allArtists.filter(a => {
    const day = days.find(d => d.artist_id === a.id && d.date === selectedDate)
    return !day || day.status === 'off'
  })

  function getSessionAtSlot(artistId: string, slotIndex: number) {
    return daySessions.find(s => {
      if (s.artist_id !== artistId) return false
      const slot = timeToSlot(s.start_time)
      if (slot !== null) return slot === slotIndex
      // If no start_time, don't place in time grid
      return false
    })
  }

  // Sessions without a start_time (unscheduled but on this day)
  function getUnscheduledSessions(artistId: string) {
    return daySessions.filter(s => s.artist_id === artistId && !s.start_time)
  }

  if (artists.length === 0) {
    return (
      <div>
        <p className="text-center text-sm text-text-secondary mb-4">{dateLabel}</p>
        <Card>
          <p className="text-center text-text-secondary py-8">No artists are working on this day</p>
        </Card>
        {offArtists.length > 0 && (
          <p className="text-xs text-text-tertiary text-center mt-3">
            {offArtists.length} artist{offArtists.length !== 1 ? 's' : ''} off: {offArtists.map(a => a.display_name || 'Artist').join(', ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="text-center text-sm font-medium text-text-primary mb-4">{dateLabel}</p>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider w-24 sticky left-0 bg-surface z-10">Time</th>
                {artists.map(artist => {
                  const day = days.find(d => d.artist_id === artist.id && d.date === selectedDate)
                  const sc = day ? SCHEDULE_DAY_COLOURS[day.status as ScheduleDayStatus] : null
                  const artistSessions = daySessions.filter(s => s.artist_id === artist.id)
                  return (
                    <th key={artist.id} className="text-center px-3 py-3 min-w-[140px]">
                      <p className="text-xs font-semibold text-text-primary">{artist.display_name || 'Artist'}</p>
                      {artist.seat_name_or_number && <p className="text-[10px] text-text-tertiary">Seat {artist.seat_name_or_number}</p>}
                      {sc && (
                        <Badge variant={day!.status === 'in_booked' ? 'success' : 'brand'} className="mt-1">
                          {sc.label}
                        </Badge>
                      )}
                      <p className="text-[10px] text-text-tertiary mt-0.5">{artistSessions.length} client{artistSessions.length !== 1 ? 's' : ''}</p>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {HOUR_SLOTS.map((label, slotIndex) => (
                <tr key={slotIndex} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 text-xs font-medium text-text-tertiary whitespace-nowrap sticky left-0 bg-surface z-10">{label}</td>
                  {artists.map(artist => {
                    const session = getSessionAtSlot(artist.id, slotIndex)
                    return (
                      <td key={artist.id} className="px-2 py-2 text-center">
                        {session ? (
                          <div className="px-2 py-1.5 rounded-lg bg-brand-50 border border-brand-500/20">
                            <p className="text-xs font-medium text-brand-500 truncate">{session.client_reference || 'Client'}</p>
                            {session.session_type && (
                              <p className="text-[10px] text-text-tertiary">{session.session_type.replace('_', ' ')}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-tertiary/30">&mdash;</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Unscheduled sessions row */}
              {artists.some(a => getUnscheduledSessions(a.id).length > 0) && (
                <tr className="border-t-2 border-border">
                  <td className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase sticky left-0 bg-surface z-10">Unscheduled</td>
                  {artists.map(artist => {
                    const unsched = getUnscheduledSessions(artist.id)
                    return (
                      <td key={artist.id} className="px-2 py-2">
                        {unsched.length > 0 ? (
                          <div className="space-y-1">
                            {unsched.map(s => (
                              <div key={s.id} className="px-2 py-1 rounded-lg bg-surface-tertiary text-xs">
                                <p className="font-medium text-text-primary truncate">{s.client_reference || 'Client'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-tertiary/30">&mdash;</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {offArtists.length > 0 && (
        <p className="text-xs text-text-tertiary text-center mt-3">
          Off today: {offArtists.map(a => a.display_name || 'Artist').join(', ')}
        </p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   ARTIST CALENDAR — interactive schedule builder
   This replaces TimeTree.

   Flow:
   1. Artists plan their week — tap each day, set status,
      add clients. This is tentative / draft.
   2. On Sunday they hit "Submit My Week" to lock it in.
      If they forget, a banner reminds them.
   3. Each client row has an envelope tick — artist marks
      "envelope submitted", reception handles received/not.
   ══════════════════════════════════════════════════════════ */

function ArtistCalendar() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [artistId, setArtistId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [submission, setSubmission] = useState<WeeklySubmission | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [addingClientFor, setAddingClientFor] = useState<string | null>(null)
  const [newClientName, setNewClientName] = useState('')
  const [saving, setSaving] = useState(false)
  const [submittingWeek, setSubmittingWeek] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const todayStr = new Date().toISOString().split('T')[0]
  const weekEnd = weekDates[6]

  // Check if this is the upcoming week (next week, which they'd be planning)
  const currentWeekStart = getWeekStart()
  const isSunday = new Date().getDay() === 0

  // Load artist profile
  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const { data } = await supabase.from('artist_profiles').select('id').eq('user_id', user!.id).single()
        if (data) setArtistId(data.id); else setLoaded(true)
      } catch { setLoaded(true) }
    }
    load()
  }, [user])

  // Load week data
  const loadWeek = useCallback(async () => {
    if (!artistId) return
    setLoaded(false)

    const [dRes, sRes, subRes] = await Promise.all([
      supabase.from('schedule_days').select('*').eq('artist_id', artistId).gte('date', weekDates[0]).lte('date', weekEnd),
      supabase.from('sessions').select('*').eq('artist_id', artistId).gte('date', weekDates[0]).lte('date', weekEnd).order('created_at'),
      supabase.from('weekly_submissions').select('*').eq('artist_id', artistId).eq('week_start_date', weekStart).maybeSingle(),
    ])

    setDays((dRes.data || []) as ScheduleDay[])
    setSessions((sRes.data || []) as Session[])
    setSubmission((subRes.data as WeeklySubmission) ?? null)
    setLoaded(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, weekStart])

  useEffect(() => { loadWeek() }, [loadWeek])

  // ── Set day status ──
  async function setDayStatus(date: string, status: ScheduleDayStatus) {
    if (!artistId) return
    setSaving(true)
    const existing = days.find(d => d.date === date)

    try {
      if (existing) {
        const { error } = await supabase.from('schedule_days').update({ status }).eq('id', existing.id)
        if (error) throw error
        setDays(prev => prev.map(d => d.id === existing.id ? { ...d, status } : d))
      } else {
        const { data, error } = await supabase.from('schedule_days')
          .insert({ artist_id: artistId, date, status, number_of_clients: 0 })
          .select().single()
        if (error) throw error
        setDays(prev => [...prev, data as ScheduleDay])
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  // ── Add a client/session to a day ──
  async function addClient(date: string) {
    if (!artistId || !newClientName.trim()) return
    setSaving(true)

    try {
      const { data, error } = await supabase.from('sessions')
        .insert({
          artist_id: artistId,
          date,
          client_reference: newClientName.trim(),
          session_type: 'new_piece',
          envelope_submitted: false,
        })
        .select().single()
      if (error) throw error
      setSessions(prev => [...prev, data as Session])
      setNewClientName('')
      setAddingClientFor(null)

      // Auto-update client count
      const daySessions = sessions.filter(s => s.date === date).length + 1
      const dayEntry = days.find(d => d.date === date)
      if (dayEntry) {
        await supabase.from('schedule_days').update({ number_of_clients: daySessions }).eq('id', dayEntry.id)
        setDays(prev => prev.map(d => d.id === dayEntry.id ? { ...d, number_of_clients: daySessions } : d))
      }
    } catch {
      toast.error('Failed to add client')
    } finally {
      setSaving(false)
    }
  }

  // ── Remove a session ──
  async function removeSession(sessionId: string, date: string) {
    setSaving(true)
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
      setSessions(prev => prev.filter(s => s.id !== sessionId))

      const remaining = sessions.filter(s => s.date === date && s.id !== sessionId).length
      const dayEntry = days.find(d => d.date === date)
      if (dayEntry) {
        await supabase.from('schedule_days').update({ number_of_clients: remaining }).eq('id', dayEntry.id)
        setDays(prev => prev.map(d => d.id === dayEntry.id ? { ...d, number_of_clients: remaining } : d))
      }
    } catch {
      toast.error('Failed to remove client')
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle envelope submitted (artist side) ──
  async function toggleEnvelope(session: Session) {
    const newSubmitted = !session.envelope_submitted

    try {
      const { error } = await supabase.from('sessions')
        .update({ envelope_submitted: newSubmitted })
        .eq('id', session.id)
      if (error) throw error
      setSessions(prev => prev.map(s =>
        s.id === session.id ? { ...s, envelope_submitted: newSubmitted } : s
      ))
    } catch {
      toast.error('Failed to update envelope status')
    }
  }

  // ── Submit the week ──
  async function submitWeek() {
    if (!artistId) return
    setSubmittingWeek(true)

    const totalSessions = sessions.length
    const allEnvelopes = sessions.every(s => s.envelope_submitted)

    const payload = {
      artist_id: artistId,
      week_start_date: weekStart,
      week_end_date: weekEnd,
      submitted_at: new Date().toISOString(),
      total_sessions_count: totalSessions,
      confirmation_envelopes_submitted: allEnvelopes,
      notes: null,
    }

    try {
      if (submission?.id) {
        const { error } = await supabase.from('weekly_submissions').update(payload).eq('id', submission.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('weekly_submissions').insert(payload)
        if (error) throw error
      }
      toast.success('Week submitted!')
      await loadWeek()
    } catch {
      toast.error('Failed to submit week')
    } finally {
      setSubmittingWeek(false)
    }
  }

  if (!loaded) {
    return (
      <div>
        <PageHeader title="My Schedule" />
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!artistId) {
    return (
      <div>
        <PageHeader title="My Schedule" />
        <Card>
          <div className="flex items-center gap-3 text-status-warning">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">No artist profile found. Contact an admin.</p>
          </div>
        </Card>
      </div>
    )
  }

  const isSubmitted = !!submission?.submitted_at
  const hasUnsubmittedDays = days.length > 0 && !isSubmitted

  return (
    <div>
      <PageHeader
        title="My Schedule"
        description="Plan your week, add clients, then submit"
      />

      {/* ── Submit reminder banner ── */}
      {hasUnsubmittedDays && isCurrentWeek(weekStart) && (
        <div className="mb-4 p-3 rounded-xl bg-status-warning-50 border border-status-warning/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />
            <p className="text-xs font-semibold text-status-warning-700">
              You haven&apos;t submitted this week yet
            </p>
          </div>
          <Button size="sm" onClick={submitWeek} loading={submittingWeek}>
            Submit Now
          </Button>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary">{formatWeekRange(weekStart)}</p>
          {isSubmitted && <Badge variant="success" dot className="mt-1">Submitted</Badge>}
          {!isSubmitted && days.length > 0 && <Badge variant="warning" dot className="mt-1">Draft</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {!isCurrentWeek(weekStart) && (
        <div className="mb-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(getWeekStart())}>
            Back to this week
          </Button>
        </div>
      )}

      {/* ── Day cards ── */}
      <div className="space-y-3">
        {weekDates.map(date => {
          const dayEntry = days.find(d => d.date === date)
          const daySessions = sessions.filter(s => s.date === date)
          const isToday = date === todayStr
          const isExpanded = expandedDay === date
          const sc = dayEntry ? SCHEDULE_DAY_COLOURS[dayEntry.status] : null

          return (
            <Card
              key={date}
              className={`${isToday ? 'ring-2 ring-brand-500/30' : ''} transition-all`}
            >
              {/* Day header — tap to expand */}
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setExpandedDay(isExpanded ? null : date)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-brand-500 text-text-inverse' : 'bg-surface-tertiary text-text-primary'}`}>
                    <span className="text-[9px] font-bold uppercase leading-none">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-bold leading-tight">
                      {new Date(date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {sc ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      ) : (
                        <span className="text-sm text-text-tertiary">Tap to set status</span>
                      )}
                    </div>
                    {daySessions.length > 0 && (
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {daySessions.length} client{daySessions.length !== 1 ? 's' : ''}
                        {daySessions.some(s => !s.envelope_submitted) && (
                          <span className="text-status-warning ml-1">
                            · {daySessions.filter(s => !s.envelope_submitted).length} envelope{daySessions.filter(s => !s.envelope_submitted).length !== 1 ? 's' : ''} pending
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {/* Expanded — status picker + clients */}
              {isExpanded && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {/* Status buttons */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">What are you doing?</p>
                    <div className="flex flex-wrap gap-2">
                      {SCHEDULE_DAY_STATUS_OPTIONS.map(opt => {
                        const isActive = dayEntry?.status === opt.value
                        const colours = SCHEDULE_DAY_COLOURS[opt.value as ScheduleDayStatus]
                        return (
                          <button
                            key={opt.value}
                            disabled={saving}
                            onClick={() => setDayStatus(date, opt.value as ScheduleDayStatus)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                              isActive
                                ? `${colours.bg} ${colours.text} ring-2 ring-brand-500/30`
                                : 'bg-surface-tertiary text-text-secondary hover:text-text-primary active:scale-95'
                            } disabled:opacity-50`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Client list */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Clients</p>
                      <button
                        onClick={() => { setAddingClientFor(addingClientFor === date ? null : date); setNewClientName('') }}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors min-h-[44px] px-2"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Client
                      </button>
                    </div>

                    {daySessions.length === 0 && addingClientFor !== date && (
                      <p className="text-xs text-text-tertiary text-center py-3">No clients yet — tap &quot;Add Client&quot; above</p>
                    )}

                    {daySessions.map(session => (
                      <div key={session.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                        {/* Envelope checkbox */}
                        <button
                          onClick={() => toggleEnvelope(session)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            session.envelope_submitted
                              ? 'bg-status-success-50 text-status-success'
                              : 'bg-surface-tertiary text-text-tertiary hover:text-text-primary'
                          }`}
                          title={session.envelope_submitted ? 'Envelope submitted' : 'Tap to mark envelope submitted'}
                        >
                          {session.envelope_submitted ? <Check className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {session.client_reference || 'Client'}
                          </p>
                          <p className="text-[10px] text-text-tertiary">
                            {session.envelope_submitted ? (
                              <span className="text-status-success font-semibold">Envelope submitted</span>
                            ) : (
                              <span>Envelope pending</span>
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() => removeSession(session.id, date)}
                          className="p-2 text-text-tertiary hover:text-status-error transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {/* Add client inline form */}
                    {addingClientFor === date && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Client name"
                            value={newClientName}
                            onChange={e => setNewClientName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') addClient(date) }}
                            autoFocus
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={!newClientName.trim() || saving}
                          onClick={() => addClient(date)}
                          icon={<Check className="w-4 h-4" />}
                        >
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setAddingClientFor(null); setNewClientName('') }}
                          icon={<X className="w-4 h-4" />}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* ── Submit Week ── */}
      <Card className="mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-text-tertiary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Submit My Week</p>
              <p className="text-xs text-text-tertiary">
                {sessions.length} client{sessions.length !== 1 ? 's' : ''} total
                {sessions.length > 0 && (
                  <> · {sessions.filter(s => s.envelope_submitted).length}/{sessions.length} envelopes</>
                )}
              </p>
            </div>
          </div>

          {isSubmitted ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>Submitted</Badge>
              <Button size="sm" variant="outline" onClick={submitWeek} loading={submittingWeek}>
                Resubmit
              </Button>
            </div>
          ) : (
            <Button onClick={submitWeek} loading={submittingWeek} icon={<ClipboardCheck className="w-4 h-4" />}>
              Submit Week
            </Button>
          )}
        </div>
        {isSubmitted && submission?.submitted_at && (
          <p className="text-[10px] text-text-tertiary mt-2">
            Submitted {new Date(submission.submitted_at).toLocaleDateString('en-AU', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        )}
      </Card>
    </div>
  )
}
