'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import {
  getWeekStart, getWeekDates, getShortDayName, getFormattedDay,
  formatWeekRange, shiftWeek, isCurrentWeek, toDateString,
} from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS, SESSION_TYPE_OPTIONS } from '@/types'
import type {
  ScheduleDay, ScheduleDayStatus, Session, ArtistProfile, SessionType,
} from '@/types'
import {
  ChevronLeft, ChevronRight, AlertCircle, Calendar,
  Users, Clock, Mail, MailOpen, User,
} from 'lucide-react'

/* ── View modes ── */
type ViewMode = 'day' | 'week' | 'month'

/* ── Helpers ── */
function getMonthDates(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (string | null)[][] = []
  let week: (string | null)[] = Array(startDay).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d)
    week.push(toDateString(dt))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function formatTime(t: string | null): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function sessionTypeLabel(t: SessionType | null): string {
  return SESSION_TYPE_OPTIONS.find(o => o.value === t)?.label || 'Session'
}

/* ── Per-artist data ── */
interface ArtistRow {
  artist: ArtistProfile
  scheduleDays: Map<string, ScheduleDay>
  sessions: Session[]
}

export function AdminScheduleView() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()))
  const [monthYear, setMonthYear] = useState<{ year: number; month: number }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })

  const [artistRows, setArtistRows] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)

  // Detail modal
  const [detailModal, setDetailModal] = useState<{
    open: boolean
    artist: ArtistProfile | null
    date: string
    sessions: Session[]
    dayData: ScheduleDay | null
  }>({ open: false, artist: null, date: '', sessions: [], dayData: null })

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const today = useMemo(() => toDateString(new Date()), [])

  /* ── Load data — simple useEffect, no useCallback loop ── */
  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setLoading(true)

      try {
        let startDate: string
        let endDate: string

        const wd = getWeekDates(weekStart)
        if (viewMode === 'week') {
          startDate = wd[0]
          endDate = wd[6]
        } else if (viewMode === 'day') {
          startDate = selectedDate
          endDate = selectedDate
        } else {
          const first = new Date(monthYear.year, monthYear.month, 1)
          const last = new Date(monthYear.year, monthYear.month + 1, 0)
          startDate = toDateString(first)
          endDate = toDateString(last)
        }

        const { data: artists, error: artistError } = await supabase
          .from('artist_profiles')
          .select('*, profile:profiles!artist_profiles_user_id_fkey(*)')
          .order('display_name')

        if (artistError) { console.error('artist_profiles error:', artistError); }
        if (cancelled) return

        const [daysRes, sessionsRes] = await Promise.all([
          supabase
            .from('schedule_days')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date'),
          supabase
            .from('sessions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('start_time'),
        ])

        if (cancelled) return
        if (daysRes.error) console.error('schedule_days error:', daysRes.error)
        if (sessionsRes.error) console.error('sessions error:', sessionsRes.error)

        const allDays = (daysRes.data as ScheduleDay[]) || []
        const allSessions = (sessionsRes.data as Session[]) || []

        const daysByArtist = new Map<string, Map<string, ScheduleDay>>()
        for (const d of allDays) {
          if (!daysByArtist.has(d.artist_id)) daysByArtist.set(d.artist_id, new Map())
          daysByArtist.get(d.artist_id)!.set(d.date, d)
        }

        const sessionsByArtist = new Map<string, Session[]>()
        for (const s of allSessions) {
          if (!sessionsByArtist.has(s.artist_id)) sessionsByArtist.set(s.artist_id, [])
          sessionsByArtist.get(s.artist_id)!.push(s)
        }

        const rows: ArtistRow[] = ((artists as ArtistProfile[]) || []).map(artist => ({
          artist,
          scheduleDays: daysByArtist.get(artist.id) || new Map(),
          sessions: sessionsByArtist.get(artist.id) || [],
        }))

        setArtistRows(rows)
      } catch (err) {
        console.error('Calendar fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [viewMode, weekStart, selectedDate, monthYear.year, monthYear.month])

  /* ── Open detail modal ── */
  function openDetail(artist: ArtistProfile, date: string, dayData: ScheduleDay | null, artistSessions: Session[]) {
    const daySessions = artistSessions.filter(s => s.date === date)
    setDetailModal({ open: true, artist, date, sessions: daySessions, dayData })
  }

  /* ── Stats ── */
  function getStats() {
    let totalSessions = 0
    let missingEnvelopes = 0
    const artistsWorking = new Set<string>()

    for (const row of artistRows) {
      for (const s of row.sessions) {
        totalSessions++
        if (!s.envelope_submitted) missingEnvelopes++
      }
      for (const [, sd] of row.scheduleDays) {
        if (sd.status !== 'off') artistsWorking.add(row.artist.id)
      }
    }
    return { totalSessions, missingEnvelopes, artistsWorking: artistsWorking.size }
  }

  /* ── Badge variant helper ── */
  const statusBadgeVariant = (status: ScheduleDayStatus): 'default' | 'brand' | 'info' | 'warning' | 'success' => {
    switch (status) {
      case 'off': return 'default'
      case 'in_booked': return 'brand'
      case 'in_touchups': return 'info'
      case 'in_walkins': return 'warning'
      case 'in_custom': return 'success'
    }
  }

  function sessionsForArtistDate(row: ArtistRow, date: string): Session[] {
    return row.sessions.filter(s => s.date === date)
  }

  function artistDisplayName(row: ArtistRow): string {
    return row.artist.display_name || row.artist.profile?.full_name || 'Artist'
  }

  function artistInitials(row: ArtistRow): string {
    const name = artistDisplayName(row)
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  /* ═══════════════ WEEK VIEW ═══════════════ */
  function WeekView() {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">{formatWeekRange(weekStart)}</p>
            {isCurrentWeek(weekStart) && <Badge variant="brand" className="mt-1">Current Week</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {artistRows.length === 0 ? (
          <Card>
            <p className="text-center text-text-secondary py-8">No artists found</p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-text-primary w-48 sticky left-0 bg-surface z-10">
                      Artist
                    </th>
                    {weekDates.map(date => (
                      <th
                        key={date}
                        className={`text-center px-2 py-3 text-sm font-semibold min-w-[120px] ${
                          date === today ? 'text-brand-500' : 'text-text-primary'
                        }`}
                      >
                        <div>{getShortDayName(date)}</div>
                        <div className="text-xs text-text-tertiary font-normal">
                          {new Date(date + 'T00:00:00').getDate()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {artistRows.map(row => (
                    <tr key={row.artist.id} className="border-b border-border last:border-0 hover:bg-surface-tertiary/30">
                      <td className="px-4 py-3 sticky left-0 bg-surface z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {artistInitials(row)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-text-primary">{artistDisplayName(row)}</p>
                            {row.artist.seat_name_or_number && (
                              <p className="text-xs text-text-tertiary">Seat {row.artist.seat_name_or_number}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {weekDates.map(date => {
                        const dayData = row.scheduleDays.get(date) || null
                        const daySessions = sessionsForArtistDate(row, date)
                        const hasEnvelopeWarning = daySessions.some(s => !s.envelope_submitted)

                        return (
                          <td
                            key={date}
                            className={`text-center px-2 py-3 cursor-pointer hover:bg-surface-tertiary/50 ${
                              date === today ? 'bg-brand-50/30' : ''
                            }`}
                            onClick={() => openDetail(row.artist, date, dayData, row.sessions)}
                          >
                            {dayData ? (
                              <Badge variant={statusBadgeVariant(dayData.status)} className="text-[10px]">
                                {SCHEDULE_DAY_COLOURS[dayData.status].label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-text-tertiary">--</span>
                            )}

                            {daySessions.length > 0 && (
                              <p className="text-[10px] text-text-secondary mt-1">
                                {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                              </p>
                            )}

                            {hasEnvelopeWarning && daySessions.length > 0 && (
                              <div className="flex justify-center mt-0.5">
                                <AlertCircle className="w-3 h-3 text-status-warning" />
                              </div>
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

  /* ═══════════════ DAY VIEW ═══════════════ */
  function DayView() {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(selectedDate + 'T00:00:00')
            d.setDate(d.getDate() - 1)
            setSelectedDate(toDateString(d))
          }}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">{getFormattedDay(selectedDate)}</p>
            {selectedDate === today && <Badge variant="brand" className="mt-1">Today</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(selectedDate + 'T00:00:00')
            d.setDate(d.getDate() + 1)
            setSelectedDate(toDateString(d))
          }}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {artistRows.map(row => {
            const dayData = row.scheduleDays.get(selectedDate) || null
            const daySessions = sessionsForArtistDate(row, selectedDate)
            const hasEnvelopeWarning = daySessions.some(s => !s.envelope_submitted)

            return (
              <Card key={row.artist.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {artistInitials(row)}
                    </div>
                    <p className="text-sm font-semibold text-text-primary">{artistDisplayName(row)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayData ? (
                      <Badge variant={statusBadgeVariant(dayData.status)} dot>
                        {SCHEDULE_DAY_COLOURS[dayData.status].label}
                      </Badge>
                    ) : (
                      <Badge variant="default">Not set</Badge>
                    )}
                    {hasEnvelopeWarning && daySessions.length > 0 && (
                      <Badge variant="warning" dot>Envelope missing</Badge>
                    )}
                  </div>
                </div>

                {daySessions.length === 0 ? (
                  <p className="text-xs text-text-tertiary">No sessions</p>
                ) : (
                  <div className="space-y-1.5 mt-2">
                    {daySessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-surface-tertiary/50 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {s.client_reference && (
                            <span className="flex items-center gap-1 text-text-primary font-medium truncate">
                              <User className="w-3 h-3 shrink-0" />
                              {s.client_reference}
                            </span>
                          )}
                          <Badge variant="default" className="text-[10px] shrink-0">
                            {sessionTypeLabel(s.session_type)}
                          </Badge>
                          {(s.start_time || s.end_time) && (
                            <span className="flex items-center gap-0.5 text-text-tertiary shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatTime(s.start_time)}
                              {s.end_time ? ` - ${formatTime(s.end_time)}` : ''}
                            </span>
                          )}
                        </div>
                        {s.envelope_submitted ? (
                          <Mail className="w-3.5 h-3.5 text-status-success shrink-0" />
                        ) : (
                          <MailOpen className="w-3.5 h-3.5 text-status-warning shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  /* ═══════════════ MONTH VIEW ═══════════════ */
  function MonthView() {
    const weeks = getMonthDates(monthYear.year, monthYear.month)
    const monthLabel = new Date(monthYear.year, monthYear.month).toLocaleDateString('en-AU', {
      month: 'long', year: 'numeric',
    })
    const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    function dateStats(date: string) {
      let artistsIn = 0
      let totalSessions = 0
      let envelopeWarning = false

      for (const row of artistRows) {
        const dayData = row.scheduleDays.get(date)
        if (dayData && dayData.status !== 'off') artistsIn++
        const daySessions = row.sessions.filter(s => s.date === date)
        totalSessions += daySessions.length
        if (daySessions.some(s => !s.envelope_submitted)) envelopeWarning = true
      }
      return { artistsIn, totalSessions, envelopeWarning }
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(monthYear.year, monthYear.month - 1)
            setMonthYear({ year: d.getFullYear(), month: d.getMonth() })
          }}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <p className="text-lg font-semibold text-text-primary">{monthLabel}</p>
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(monthYear.year, monthYear.month + 1)
            setMonthYear({ year: d.getFullYear(), month: d.getMonth() })
          }}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Card padding={false}>
          <div className="grid grid-cols-7">
            {dayHeaders.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-text-secondary py-2 border-b border-border">
                {d}
              </div>
            ))}
            {weeks.flat().map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border bg-surface-tertiary/20" />
              }
              const { artistsIn, totalSessions, envelopeWarning } = dateStats(date)
              const isToday = date === today
              const dayNum = new Date(date + 'T00:00:00').getDate()

              return (
                <div
                  key={date}
                  className={`min-h-[80px] p-2 border-b border-r border-border cursor-pointer hover:bg-surface-tertiary/30 transition-colors ${
                    isToday ? 'bg-brand-50/30' : ''
                  }`}
                  onClick={() => { setSelectedDate(date); setViewMode('day') }}
                >
                  <p className={`text-xs font-medium ${isToday ? 'text-brand-500' : 'text-text-primary'}`}>
                    {dayNum}
                  </p>
                  {artistsIn > 0 && (
                    <p className="text-[10px] text-text-secondary mt-1">
                      <Users className="w-3 h-3 inline mr-0.5" />{artistsIn} in
                    </p>
                  )}
                  {totalSessions > 0 && (
                    <p className="text-[10px] text-text-tertiary">
                      {totalSessions} session{totalSessions !== 1 ? 's' : ''}
                    </p>
                  )}
                  {envelopeWarning && totalSessions > 0 && (
                    <AlertCircle className="w-3 h-3 text-status-warning mt-0.5" />
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  /* ═══════════════ MAIN RENDER ═══════════════ */
  const stats = !loading ? getStats() : null

  return (
    <div>
      <PageHeader
        title="Master Calendar"
        description="All artists' schedules and sessions at a glance"
      />

      {/* Stats */}
      {stats && (
        <StatGrid className="mb-6">
          <StatCard
            title="Artists Working"
            value={stats.artistsWorking}
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            title="Total Sessions"
            value={stats.totalSessions}
            icon={<Calendar className="w-5 h-5" />}
          />
          <StatCard
            title="Missing Envelopes"
            value={stats.missingEnvelopes}
            icon={stats.missingEnvelopes > 0
              ? <AlertCircle className="w-5 h-5 text-status-warning" />
              : <Mail className="w-5 h-5" />
            }
          />
        </StatGrid>
      )}

      {/* View tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-surface-tertiary rounded-lg w-fit">
        {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {viewMode === 'day' && <DayView />}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'month' && <MonthView />}
        </>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal(d => ({ ...d, open: false }))}
        title={detailModal.artist
          ? `${detailModal.artist.display_name || 'Artist'} - ${getFormattedDay(detailModal.date)}`
          : 'Session Details'
        }
        size="md"
      >
        <div className="space-y-4">
          {detailModal.dayData ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Status:</span>
              <Badge variant={statusBadgeVariant(detailModal.dayData.status)} dot>
                {SCHEDULE_DAY_COLOURS[detailModal.dayData.status].label}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No status set for this day</p>
          )}

          {detailModal.dayData?.notes && (
            <p className="text-sm text-text-secondary">Notes: {detailModal.dayData.notes}</p>
          )}

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">
              Sessions ({detailModal.sessions.length})
            </h4>
            {detailModal.sessions.length === 0 ? (
              <p className="text-sm text-text-tertiary">No sessions</p>
            ) : (
              <div className="space-y-2">
                {detailModal.sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {s.client_reference && (
                          <span className="text-sm font-medium text-text-primary truncate flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {s.client_reference}
                          </span>
                        )}
                        <Badge variant="default">{sessionTypeLabel(s.session_type)}</Badge>
                      </div>
                      {(s.start_time || s.end_time) && (
                        <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(s.start_time)}
                          {s.end_time ? ` - ${formatTime(s.end_time)}` : ''}
                        </p>
                      )}
                      {s.notes && (
                        <p className="text-xs text-text-tertiary mt-0.5">{s.notes}</p>
                      )}
                    </div>
                    {s.envelope_submitted ? (
                      <Badge variant="success" dot>Envelope</Badge>
                    ) : (
                      <Badge variant="warning" dot>No Envelope</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setDetailModal(d => ({ ...d, open: false }))}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
