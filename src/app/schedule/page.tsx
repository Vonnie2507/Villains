'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ScheduleDay, ScheduleDayStatus, Session, ArtistProfile } from '@/types'
import { ChevronLeft, ChevronRight, MailOpen } from 'lucide-react'

function getWeekStartDate(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function getWeekDatesFromStart(start: string): string[] {
  const dates: string[] = []
  const s = new Date(start + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    const d = new Date(s)
    d.setDate(s.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function shiftWeekBy(start: string, weeks: number): string {
  const d = new Date(start + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

function formatWeek(start: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  return `${s.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

function shortDay(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })
}

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

function AdminCalendar() {
  const [weekStart, setWeekStart] = useState(getWeekStartDate())
  const [artists, setArtists] = useState<ArtistProfile[]>([])
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loaded, setLoaded] = useState(false)

  const weekDates = getWeekDatesFromStart(weekStart)
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const startDate = weekDates[0]
    const endDate = weekDates[6]

    Promise.all([
      supabase.from('artist_profiles').select('*').order('display_name'),
      supabase.from('schedule_days').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('sessions').select('*').gte('date', startDate).lte('date', endDate),
    ]).then(([a, d, s]) => {
      setArtists((a.data || []) as ArtistProfile[])
      setDays((d.data || []) as ScheduleDay[])
      setSessions((s.data || []) as Session[])
      setLoaded(true)
    }).catch(err => {
      console.error('Calendar load error:', err)
      setLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  function getDayForArtist(artistId: string, date: string): ScheduleDay | undefined {
    return days.find(d => d.artist_id === artistId && d.date === date)
  }

  function getSessionsForArtist(artistId: string, date: string): Session[] {
    return sessions.filter(s => s.artist_id === artistId && s.date === date)
  }

  return (
    <div>
      <PageHeader title="Studio Calendar" description="All artists' schedules at a glance" />

      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeekBy(weekStart, -1))}>
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        <p className="text-sm font-semibold text-text-primary">{formatWeek(weekStart)}</p>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeekBy(weekStart, 1))}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {!loaded ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : artists.length === 0 ? (
        <Card><p className="text-center text-text-secondary py-8">No artists found</p></Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider w-44">Artist</th>
                  {weekDates.map(date => (
                    <th key={date} className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wider ${date === todayStr ? 'text-brand-500' : 'text-text-secondary'}`}>
                      {shortDay(date)}<br/>
                      <span className="text-text-tertiary font-normal">{new Date(date + 'T00:00:00').getDate()}</span>
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
                    {weekDates.map(date => {
                      const day = getDayForArtist(artist.id, date)
                      const sess = getSessionsForArtist(artist.id, date)
                      const sc = day ? SCHEDULE_DAY_COLOURS[day.status as ScheduleDayStatus] : null
                      const missingEnvelope = sess.some(s => !s.envelope_submitted)

                      return (
                        <td key={date} className={`text-center px-2 py-3 ${date === todayStr ? 'bg-brand-50/20' : ''}`}>
                          {sc ? (
                            <Badge variant={day!.status === 'off' ? 'default' : day!.status === 'in_booked' ? 'brand' : 'info'}>
                              {sc.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
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

function ArtistCalendar() {
  const { user } = useAuth()
  const [artistId, setArtistId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(getWeekStartDate())
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loaded, setLoaded] = useState(false)

  const weekDates = getWeekDatesFromStart(weekStart)
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!user) return

    async function getProfile() {
      try {
        const { data } = await supabase.from('artist_profiles').select('id').eq('user_id', user!.id).single()
        if (data) { setArtistId(data.id) } else { setLoaded(true) }
      } catch { setLoaded(true) }
    }
    getProfile()
  }, [user])

  useEffect(() => {
    if (!artistId) return

    const startDate = weekDates[0]
    const endDate = weekDates[6]

    Promise.all([
      supabase.from('schedule_days').select('*').eq('artist_id', artistId).gte('date', startDate).lte('date', endDate),
      supabase.from('sessions').select('*').eq('artist_id', artistId).gte('date', startDate).lte('date', endDate).order('start_time'),
    ]).then(([d, s]) => {
      setDays((d.data || []) as ScheduleDay[])
      setSessions((s.data || []) as Session[])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, weekStart])

  if (!loaded) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!artistId) {
    return <div><PageHeader title="My Schedule" /><Card><p className="text-center text-text-secondary py-8">No artist profile found. Contact an admin.</p></Card></div>
  }

  return (
    <div>
      <PageHeader title="My Schedule" description="Set your status and sessions for each day" />

      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => { setLoaded(false); setWeekStart(shiftWeekBy(weekStart, -1)) }}>
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        <p className="text-sm font-semibold text-text-primary">{formatWeek(weekStart)}</p>
        <Button variant="ghost" size="sm" onClick={() => { setLoaded(false); setWeekStart(shiftWeekBy(weekStart, 1)) }}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {weekDates.map(date => {
          const day = days.find(d => d.date === date)
          const daySessions = sessions.filter(s => s.date === date)
          const isToday = date === todayStr
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
    </div>
  )
}
