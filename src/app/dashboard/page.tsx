'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LiveClock } from '@/components/ui/LiveClock'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toDateString, getWeekStart } from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ScheduleDay, ArtistProfile, ScheduleDayStatus, Session } from '@/types'
import { Calendar, Users, AlertCircle, ClipboardList, Inbox } from 'lucide-react'

/* ── Time slot grid config ── */
const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
]

function formatSlotLabel(slot: string): string {
  const hour = parseInt(slot.split(':')[0])
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

function getOrdinal(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

export default function DashboardPage() {
  const { isArtist } = useAuth()

  return (
    <DashboardLayout activePath="/dashboard">
      {isArtist ? <ArtistDashboard /> : <AdminDashboard />}
    </DashboardLayout>
  )
}

function AdminDashboard() {
  const [todaySchedule, setTodaySchedule] = useState<(ScheduleDay & { artist_profile?: ArtistProfile })[]>([])
  const [todaySessions, setTodaySessions] = useState<(Session & { artist_profile?: ArtistProfile })[]>([])
  const [artistProfiles, setArtistProfiles] = useState<ArtistProfile[]>([])
  const [weekSubmissions, setWeekSubmissions] = useState<{ total: number; submitted: number }>({ total: 0, submitted: 0 })
  const [newEnquiries, setNewEnquiries] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = toDateString(new Date())
  const weekStart = getWeekStart()
  const now = new Date()
  const dayName = now.toLocaleDateString('en-AU', { weekday: 'long' })
  const dayNum = now.getDate()
  const monthName = now.toLocaleDateString('en-AU', { month: 'long' })
  const year = now.getFullYear()

  const loadDashboard = useCallback(async () => {
    setLoading(true)

    const [schedResult, sessResult, artistsResult, enquiriesResult] = await Promise.all([
      supabase
        .from('schedule_days')
        .select('*, artist_profile:artist_profiles(id, display_name, user_id, seat_name_or_number, specialties)')
        .eq('date', today),
      supabase
        .from('sessions')
        .select('*, artist_profile:artist_profiles(id, display_name, user_id, seat_name_or_number)')
        .eq('date', today)
        .order('start_time'),
      supabase
        .from('artist_profiles')
        .select('*')
        .order('display_name'),
      supabase
        .from('client_profiles')
        .select('id')
        .eq('stage', 'new_enquiry'),
    ])

    setTodaySchedule((schedResult.data || []) as (ScheduleDay & { artist_profile?: ArtistProfile })[])
    setTodaySessions((sessResult.data || []) as (Session & { artist_profile?: ArtistProfile })[])
    setArtistProfiles((artistsResult.data || []) as ArtistProfile[])
    setNewEnquiries((enquiriesResult.data || []).length)

    const totalArtists = (artistsResult.data || []).length

    const { data: submissions } = await supabase
      .from('weekly_submissions')
      .select('artist_id')
      .eq('week_start_date', weekStart)
      .not('submitted_at', 'is', null)

    const submittedCount = new Set((submissions || []).map((s: { artist_id: string }) => s.artist_id)).size
    setWeekSubmissions({ total: totalArtists, submitted: submittedCount })

    setLoading(false)
  }, [today, weekStart])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Artists who are in today (have a schedule_day that isn't 'off')
  const artistsInToday = todaySchedule.filter(s => s.status !== 'off')
  const bookedToday = todaySchedule.filter(s => s.status === 'in_booked')

  // Build a map of artist_id -> sessions for the timeline
  const sessionsByArtist = new Map<string, Session[]>()
  for (const s of todaySessions) {
    const aid = s.artist_id
    if (!sessionsByArtist.has(aid)) sessionsByArtist.set(aid, [])
    sessionsByArtist.get(aid)!.push(s)
  }

  // Artists to show in the grid — those who are in today OR have sessions
  const activeArtistIds = new Set<string>()
  for (const s of artistsInToday) activeArtistIds.add(s.artist_id)
  for (const s of todaySessions) activeArtistIds.add(s.artist_id)

  const gridArtists = artistProfiles.filter(a => activeArtistIds.has(a.id))

  // Get schedule status for an artist
  const getArtistStatus = (artistId: string): ScheduleDayStatus | null => {
    const entry = todaySchedule.find(s => s.artist_id === artistId)
    return entry?.status ?? null
  }

  // Check if a session falls within a time slot
  function sessionInSlot(session: Session, slotHour: string): boolean {
    if (!session.start_time) return false
    const sessionStart = parseInt(session.start_time.split(':')[0])
    const sessionEnd = session.end_time ? parseInt(session.end_time.split(':')[0]) : sessionStart + 1
    const slot = parseInt(slotHour.split(':')[0])
    return slot >= sessionStart && slot < sessionEnd
  }

  // Get session for artist at a time slot
  function getSessionAtSlot(artistId: string, slotHour: string): Session | null {
    const artistSessions = sessionsByArtist.get(artistId) || []
    return artistSessions.find(s => sessionInSlot(s, slotHour)) || null
  }

  // Is this the start slot for a session?
  function isSessionStart(session: Session, slotHour: string): boolean {
    if (!session.start_time) return false
    return parseInt(session.start_time.split(':')[0]) === parseInt(slotHour.split(':')[0])
  }

  return (
    <div>
      {/* ── Header: Day name + Date + Clock ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text-primary font-display tracking-tight">
            {dayName}
          </h1>
          <p className="text-lg text-text-secondary mt-1">
            {dayNum}{getOrdinal(dayNum)} {monthName} {year}
          </p>
        </div>
        <div className="text-right">
          <LiveClock />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <StatGrid className="mb-8">
            <Link href="/schedule">
              <StatCard title="In Studio Today" value={`${artistsInToday.length} / ${artistProfiles.length}`} icon={<Users className="w-5 h-5" />} className="cursor-pointer hover:-translate-y-1 transition-transform" />
            </Link>
            <Link href="/schedule">
              <StatCard title="Booked Today" value={bookedToday.length} icon={<Calendar className="w-5 h-5" />} className="cursor-pointer hover:-translate-y-1 transition-transform" />
            </Link>
            <Link href="/weekly-schedules">
              <StatCard title="Weekly Submissions" value={`${weekSubmissions.submitted} / ${weekSubmissions.total}`} icon={<ClipboardList className="w-5 h-5" />} className="cursor-pointer hover:-translate-y-1 transition-transform" />
            </Link>
            <Link href="/enquiries">
              <StatCard title="New Enquiries" value={newEnquiries} icon={<Inbox className="w-5 h-5" />} className="cursor-pointer hover:-translate-y-1 transition-transform" />
            </Link>
          </StatGrid>

          {/* ── Submission warning ── */}
          {weekSubmissions.submitted < weekSubmissions.total && (
            <Card className="mb-6 border-status-warning/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-status-warning shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {weekSubmissions.total - weekSubmissions.submitted} artist{weekSubmissions.total - weekSubmissions.submitted !== 1 ? 's' : ''} haven&apos;t submitted their weekly schedule
                  </p>
                </div>
                <Link href="/weekly-schedules" className="ml-auto">
                  <Badge variant="warning">View</Badge>
                </Link>
              </div>
            </Card>
          )}

          {/* ── Studio Timeline Grid ── */}
          <Card padding={false}>
            <div className="p-6 pb-3">
              <CardTitle>Today&apos;s Studio</CardTitle>
              <p className="text-sm text-text-secondary mt-1">
                {gridArtists.length > 0
                  ? `${gridArtists.length} artist${gridArtists.length !== 1 ? 's' : ''} scheduled`
                  : 'No artists scheduled today'
                }
              </p>
            </div>

            {gridArtists.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-sm text-text-tertiary py-8 text-center">
                  No schedule entries for today yet
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Artist header row */}
                  <div className="flex border-b border-border">
                    <div className="w-20 shrink-0 px-3 py-3 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                      Time
                    </div>
                    {gridArtists.map(artist => {
                      const status = getArtistStatus(artist.id)
                      const sc = status ? SCHEDULE_DAY_COLOURS[status] : null
                      return (
                        <div key={artist.id} className="flex-1 min-w-[120px] px-2 py-3 text-center border-l border-border">
                          <p className="text-xs font-semibold text-text-primary truncate">
                            {artist.display_name || 'Artist'}
                          </p>
                          {artist.seat_name_or_number && (
                            <p className="text-[10px] text-text-tertiary">Seat {artist.seat_name_or_number}</p>
                          )}
                          {sc && (
                            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                              {sc.label}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Time slot rows */}
                  {TIME_SLOTS.map(slot => {
                    const slotHour = parseInt(slot.split(':')[0])
                    const currentHour = now.getHours()
                    const isCurrentSlot = slotHour === currentHour

                    return (
                      <div
                        key={slot}
                        className={`flex border-b border-border last:border-0 ${isCurrentSlot ? 'bg-brand-50/50' : ''}`}
                      >
                        {/* Time label */}
                        <div className={`w-20 shrink-0 px-3 py-4 text-xs font-medium ${isCurrentSlot ? 'text-brand-500' : 'text-text-tertiary'}`}>
                          {formatSlotLabel(slot)}
                          {isCurrentSlot && (
                            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-brand-500 inline-block animate-pulse" />
                          )}
                        </div>

                        {/* Artist cells */}
                        {gridArtists.map(artist => {
                          const session = getSessionAtSlot(artist.id, slot)
                          const isStart = session && isSessionStart(session, slot)

                          return (
                            <div
                              key={artist.id}
                              className="flex-1 min-w-[120px] px-1.5 py-1 border-l border-border"
                            >
                              {session && isStart ? (
                                <div className="bg-brand-50 border border-brand-500/20 rounded-lg px-2.5 py-2 h-full">
                                  <p className="text-xs font-semibold text-text-primary truncate">
                                    {session.client_reference || 'Client'}
                                  </p>
                                  <p className="text-[10px] text-text-secondary mt-0.5">
                                    {session.session_type?.replace('_', ' ')}
                                  </p>
                                  {session.start_time && (
                                    <p className="text-[10px] text-text-tertiary mt-0.5">
                                      {session.start_time.slice(0, 5)}
                                      {session.end_time ? ` - ${session.end_time.slice(0, 5)}` : ''}
                                    </p>
                                  )}
                                  <div className="mt-1">
                                    {session.envelope_submitted ? (
                                      <span className="text-[9px] text-status-success font-medium">Envelope</span>
                                    ) : (
                                      <span className="text-[9px] text-status-warning font-medium">No envelope</span>
                                    )}
                                  </div>
                                </div>
                              ) : session && !isStart ? (
                                <div className="bg-brand-50/50 border border-brand-500/10 rounded-lg h-full" />
                              ) : (
                                <div className="h-full min-h-[48px]" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function ArtistDashboard() {
  const { user, profile } = useAuth()
  const today = toDateString(new Date())
  const now = new Date()
  const dayName = now.toLocaleDateString('en-AU', { weekday: 'long' })
  const dayNum = now.getDate()
  const monthName = now.toLocaleDateString('en-AU', { month: 'long' })
  const year = now.getFullYear()

  const [todayStatus, setTodayStatus] = useState<ScheduleDay | null>(null)
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)

      const { data: ap } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!ap) { setLoading(false); return }

      const [schedResult, sessResult] = await Promise.all([
        supabase.from('schedule_days').select('*').eq('artist_id', ap.id).eq('date', today).maybeSingle(),
        supabase.from('sessions').select('*').eq('artist_id', ap.id).eq('date', today).order('start_time'),
      ])

      setTodayStatus(schedResult.data as ScheduleDay | null)
      setTodaySessions((sessResult.data || []) as Session[])
      setLoading(false)
    }
    load()
  }, [user, today])

  const displayName = profile?.display_name || profile?.full_name || 'Artist'
  const envelopesMissing = todaySessions.filter(s => !s.envelope_submitted).length

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text-primary font-display tracking-tight">
            {dayName}
          </h1>
          <p className="text-lg text-text-secondary mt-1">
            {dayNum}{getOrdinal(dayNum)} {monthName} {year}
          </p>
          <p className="text-sm text-text-tertiary mt-1">Hey, {displayName}</p>
        </div>
        <div className="text-right">
          <LiveClock />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Today's status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Today</CardTitle>
            </CardHeader>
            {todayStatus ? (
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${SCHEDULE_DAY_COLOURS[todayStatus.status].bg} ${SCHEDULE_DAY_COLOURS[todayStatus.status].text}`}>
                  {SCHEDULE_DAY_COLOURS[todayStatus.status].label}
                </span>
                <span className="text-sm text-text-secondary">{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}</span>
                {envelopesMissing > 0 && (
                  <Badge variant="warning" dot>{envelopesMissing} envelope{envelopesMissing !== 1 ? 's' : ''} pending</Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-status-warning">
                <AlertCircle className="w-4 h-4" />
                <span>No schedule set for today — <Link href="/schedule" className="text-brand-500 hover:underline">set it now</Link></span>
              </div>
            )}
          </Card>

          {/* Today's sessions */}
          {todaySessions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Today&apos;s Sessions</CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {todaySessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{session.client_reference || 'No name'}</p>
                      <p className="text-xs text-text-tertiary">
                        {session.session_type?.replace('_', ' ')} {session.start_time && `· ${session.start_time.slice(0, 5)}`}{session.end_time && ` – ${session.end_time.slice(0, 5)}`}
                      </p>
                    </div>
                    {session.envelope_submitted ? (
                      <Badge variant="success">Envelope</Badge>
                    ) : (
                      <Badge variant="warning">No envelope</Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <StatGrid>
            <Link href="/schedule">
              <StatCard title="Sessions Today" value={todaySessions.length} icon={<Calendar className="w-5 h-5" />} className="cursor-pointer hover:-translate-y-1 transition-transform" />
            </Link>
            <Link href="/weekly-schedules">
              <StatCard title="Envelopes Submitted" value={todaySessions.filter(s => s.envelope_submitted).length} icon={<ClipboardList className="w-5 h-5" />} className="cursor-pointer hover:-translate-y-1 transition-transform" />
            </Link>
          </StatGrid>
        </>
      )}
    </div>
  )
}
