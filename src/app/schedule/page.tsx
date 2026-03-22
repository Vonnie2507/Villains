'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getWeekStart, getWeekDates, formatWeekRange, shiftWeek } from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ScheduleDay, ScheduleDayStatus, Session, ArtistProfile } from '@/types'
import { ChevronLeft, ChevronRight, CalendarDays, ArrowDownWideNarrow, Clock } from 'lucide-react'

export default function SchedulePage() {
  const { loading: authLoading } = useAuth()

  return (
    <DashboardLayout activePath="/schedule">
      {authLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AdminCalendar />
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

// ── Pastel colour palette for artists (cycles if more than 12) ──
const PASTEL_COLOURS = [
  { bg: 'rgba(186, 230, 253, 0.15)', border: 'rgba(186, 230, 253, 0.30)', text: '#7dd3fc', dot: '#38bdf8' }, // sky
  { bg: 'rgba(196, 181, 253, 0.15)', border: 'rgba(196, 181, 253, 0.30)', text: '#c4b5fd', dot: '#a78bfa' }, // violet
  { bg: 'rgba(253, 186, 210, 0.15)', border: 'rgba(253, 186, 210, 0.30)', text: '#f9a8d4', dot: '#f472b6' }, // pink
  { bg: 'rgba(167, 243, 208, 0.15)', border: 'rgba(167, 243, 208, 0.30)', text: '#6ee7b7', dot: '#34d399' }, // emerald
  { bg: 'rgba(253, 230, 138, 0.15)', border: 'rgba(253, 230, 138, 0.30)', text: '#fcd34d', dot: '#fbbf24' }, // amber
  { bg: 'rgba(253, 164, 175, 0.15)', border: 'rgba(253, 164, 175, 0.30)', text: '#fda4af', dot: '#fb7185' }, // rose
  { bg: 'rgba(165, 180, 252, 0.15)', border: 'rgba(165, 180, 252, 0.30)', text: '#a5b4fc', dot: '#818cf8' }, // indigo
  { bg: 'rgba(134, 239, 172, 0.15)', border: 'rgba(134, 239, 172, 0.30)', text: '#86efac', dot: '#4ade80' }, // green
  { bg: 'rgba(249, 168, 212, 0.15)', border: 'rgba(249, 168, 212, 0.30)', text: '#f9a8d4', dot: '#ec4899' }, // fuchsia
  { bg: 'rgba(147, 197, 253, 0.15)', border: 'rgba(147, 197, 253, 0.30)', text: '#93c5fd', dot: '#60a5fa' }, // blue
  { bg: 'rgba(252, 211, 77, 0.15)',  border: 'rgba(252, 211, 77, 0.30)',  text: '#fcd34d', dot: '#f59e0b' }, // yellow
  { bg: 'rgba(94, 234, 212, 0.15)',  border: 'rgba(94, 234, 212, 0.30)',  text: '#5eead4', dot: '#2dd4bf' }, // teal
]

function getArtistColour(index: number) {
  return PASTEL_COLOURS[index % PASTEL_COLOURS.length]
}

// ── Pastel colours for session types ──
const SESSION_TYPE_PASTELS: Record<string, { bg: string; border: string; text: string }> = {
  new_piece:    { bg: 'rgba(196, 181, 253, 0.18)', border: 'rgba(196, 181, 253, 0.35)', text: '#c4b5fd' },
  touchup:      { bg: 'rgba(167, 243, 208, 0.18)', border: 'rgba(167, 243, 208, 0.35)', text: '#6ee7b7' },
  continuation: { bg: 'rgba(186, 230, 253, 0.18)', border: 'rgba(186, 230, 253, 0.35)', text: '#7dd3fc' },
  flash:        { bg: 'rgba(253, 230, 138, 0.18)', border: 'rgba(253, 230, 138, 0.35)', text: '#fcd34d' },
  other:        { bg: 'rgba(253, 186, 210, 0.18)', border: 'rgba(253, 186, 210, 0.35)', text: '#f9a8d4' },
}

function getSessionPastel(sessionType: string | null) {
  if (!sessionType) return SESSION_TYPE_PASTELS.other
  return SESSION_TYPE_PASTELS[sessionType] || SESSION_TYPE_PASTELS.other
}

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
                {sortedArtists.map((artist, artistIndex) => {
                  const weekTotal = getWeekSessionCount(artist.id)
                  const pastel = getArtistColour(artistIndex)
                  return (
                    <tr key={artist.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pastel.dot }} />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{artist.display_name || 'Artist'}</p>
                            {artist.seat_name_or_number && <p className="text-xs text-text-tertiary">Seat {artist.seat_name_or_number}</p>}
                          </div>
                        </div>
                      </td>
                      {view === 'busiest' && (
                        <td className="text-center px-2 py-3">
                          <span className="text-sm font-bold" style={{ color: weekTotal > 0 ? pastel.text : undefined }}>
                            {weekTotal}
                          </span>
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
                              <div className="flex items-center justify-center gap-1 mt-1">
                                {sess.map((s, i) => (
                                  <span
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: getSessionPastel(s.session_type).text }}
                                    title={s.client_reference || 'Client'}
                                  />
                                ))}
                              </div>
                            )}
                            {sess.length > 0 && (
                              <p className="text-[10px] mt-0.5" style={{ color: pastel.text }}>
                                {sess.length} client{sess.length !== 1 ? 's' : ''}
                              </p>
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

  // Build a stable colour map using the full artist list order
  const artistColourMap = new Map<string, ReturnType<typeof getArtistColour>>()
  allArtists.forEach((a, i) => artistColourMap.set(a.id, getArtistColour(i)))

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
      return false
    })
  }

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

      {/* Session type legend */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {(['new_piece', 'touchup', 'continuation', 'flash', 'other'] as const).map(type => {
          const p = SESSION_TYPE_PASTELS[type]
          const label = type === 'new_piece' ? 'New Piece' : type.charAt(0).toUpperCase() + type.slice(1)
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.text }} />
              <span className="text-[10px] text-text-tertiary">{label}</span>
            </div>
          )
        })}
      </div>

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
                  const pastel = artistColourMap.get(artist.id) || PASTEL_COLOURS[0]
                  return (
                    <th key={artist.id} className="text-center px-3 py-3 min-w-[150px]" style={{ borderBottom: `3px solid ${pastel.dot}` }}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pastel.dot }} />
                        <p className="text-xs font-semibold" style={{ color: pastel.text }}>{artist.display_name || 'Artist'}</p>
                      </div>
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
                    const pastel = artistColourMap.get(artist.id) || PASTEL_COLOURS[0]
                    const sessionPastel = session ? getSessionPastel(session.session_type) : null
                    return (
                      <td key={artist.id} className="px-2 py-1.5">
                        {session ? (
                          <div
                            className="px-3 py-2 rounded-xl text-left"
                            style={{
                              backgroundColor: sessionPastel!.bg,
                              borderLeft: `3px solid ${pastel.dot}`,
                            }}
                          >
                            <p className="text-xs font-semibold truncate" style={{ color: pastel.text }}>
                              {session.client_reference || 'Client'}
                            </p>
                            {session.session_type && (
                              <p className="text-[10px] font-medium" style={{ color: sessionPastel!.text }}>
                                {session.session_type.replace('_', ' ')}
                              </p>
                            )}
                            {session.start_time && session.end_time && (
                              <p className="text-[9px] text-text-tertiary mt-0.5">
                                {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="h-8" />
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
                    const pastel = artistColourMap.get(artist.id) || PASTEL_COLOURS[0]
                    return (
                      <td key={artist.id} className="px-2 py-2">
                        {unsched.length > 0 ? (
                          <div className="space-y-1">
                            {unsched.map(s => {
                              const sp = getSessionPastel(s.session_type)
                              return (
                                <div
                                  key={s.id}
                                  className="px-3 py-1.5 rounded-lg text-xs"
                                  style={{
                                    backgroundColor: sp.bg,
                                    borderLeft: `3px solid ${pastel.dot}`,
                                  }}
                                >
                                  <p className="font-semibold truncate" style={{ color: pastel.text }}>{s.client_reference || 'Client'}</p>
                                  {s.session_type && (
                                    <p className="text-[10px]" style={{ color: sp.text }}>{s.session_type.replace('_', ' ')}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="h-8" />
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
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          <span className="text-[10px] text-text-tertiary uppercase font-semibold tracking-wider">Off today:</span>
          {offArtists.map(a => {
            const pastel = artistColourMap.get(a.id) || PASTEL_COLOURS[0]
            return (
              <span key={a.id} className="inline-flex items-center gap-1 text-xs" style={{ color: pastel.text }}>
                <span className="w-1.5 h-1.5 rounded-full opacity-40" style={{ backgroundColor: pastel.dot }} />
                {a.display_name || 'Artist'}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

