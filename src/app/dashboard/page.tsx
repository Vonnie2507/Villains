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
import { toDateString, getWeekStart, getWeekDates } from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ScheduleDay, ArtistProfile, ScheduleDayStatus, Session } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'
import { CLIENT_SOURCE_OPTIONS } from '@/types'
import { Calendar, Users, AlertCircle, ClipboardList, Inbox, Plus, UserPlus } from 'lucide-react'

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
  const { toast } = useToast()
  const [todaySchedule, setTodaySchedule] = useState<(ScheduleDay & { artist_profile?: ArtistProfile })[]>([])
  const [todaySessions, setTodaySessions] = useState<(Session & { artist_profile?: ArtistProfile })[]>([])
  const [artistProfiles, setArtistProfiles] = useState<ArtistProfile[]>([])
  const [weekSubmissions, setWeekSubmissions] = useState<{ total: number; submitted: number }>({ total: 0, submitted: 0 })
  const [newEnquiries, setNewEnquiries] = useState(0)
  const [loading, setLoading] = useState(true)

  // Quick enquiry modal
  const [showEnquiryModal, setShowEnquiryModal] = useState(false)
  const [enquiryForm, setEnquiryForm] = useState({ display_name: '', source: 'walk_in', notes: '' })
  const [enquirySaving, setEnquirySaving] = useState(false)

  async function handleQuickEnquiry(isWalkIn: boolean) {
    if (isWalkIn) {
      setEnquiryForm({ display_name: '', source: 'walk_in', notes: '' })
    } else {
      setEnquiryForm({ display_name: '', source: 'instagram_dm', notes: '' })
    }
    setShowEnquiryModal(true)
  }

  async function submitEnquiry() {
    if (!enquiryForm.display_name.trim()) {
      toast.error('Name is required')
      return
    }
    setEnquirySaving(true)
    try {
      const { error } = await supabase
        .from('client_profiles')
        .insert({
          artist_id: artistProfiles[0]?.id || null,
          display_name: enquiryForm.display_name,
          source: enquiryForm.source,
          notes: enquiryForm.notes || null,
          status: 'lead',
          stage: 'new_enquiry',
          priority: 'normal',
          handoff_status: 'not_assigned',
        })
      if (error) throw error
      toast.success('Enquiry added')
      setShowEnquiryModal(false)
      setNewEnquiries(prev => prev + 1)
    } catch {
      toast.error('Failed to add enquiry')
    } finally {
      setEnquirySaving(false)
    }
  }

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
      {/* ── Header: Day name + Date + Clock + Quick Actions ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text-primary font-display tracking-tight">
            {dayName}
          </h1>
          <p className="text-lg text-text-secondary mt-1">
            {dayNum}{getOrdinal(dayNum)} {monthName} {year}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <LiveClock />
          <div className="flex gap-2">
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => handleQuickEnquiry(false)}>
              New Enquiry
            </Button>
            <Button size="sm" variant="outline" icon={<UserPlus className="w-4 h-4" />} onClick={() => handleQuickEnquiry(true)}>
              Walk-in
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Enquiry Modal */}
      <Modal open={showEnquiryModal} onClose={() => setShowEnquiryModal(false)} title="Quick Add Enquiry">
        <div className="space-y-4">
          <Input
            label="Name"
            value={enquiryForm.display_name}
            onChange={e => setEnquiryForm(f => ({ ...f, display_name: e.target.value }))}
            placeholder="Client name or reference"
            required
          />
          <Select
            label="Source"
            options={CLIENT_SOURCE_OPTIONS}
            value={enquiryForm.source}
            onChange={e => setEnquiryForm(f => ({ ...f, source: e.target.value }))}
          />
          <Input
            label="Notes (optional)"
            value={enquiryForm.notes}
            onChange={e => setEnquiryForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Style interest, placement, etc."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEnquiryModal(false)}>Cancel</Button>
            <Button loading={enquirySaving} onClick={submitEnquiry}>Add Enquiry</Button>
          </div>
        </div>
      </Modal>

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
  const { toast } = useToast()
  const today = toDateString(new Date())
  const weekStart = getWeekStart()
  const now = new Date()
  const dayName = now.toLocaleDateString('en-AU', { weekday: 'long' })
  const dayNum = now.getDate()
  const monthName = now.toLocaleDateString('en-AU', { month: 'long' })
  const year = now.getFullYear()

  const [artistProfileId, setArtistProfileId] = useState<string | null>(null)
  const [todayStatus, setTodayStatus] = useState<ScheduleDay | null>(null)
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [weekDays, setWeekDays] = useState<ScheduleDay[]>([])
  const [weekSessions, setWeekSessions] = useState<Session[]>([])
  const [weeklySubmission, setWeeklySubmission] = useState<{ submitted_at: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const weekDates = getWeekDates(weekStart)

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Look up artist_profiles row
    const { data: ap } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!ap) { setLoading(false); return }
    setArtistProfileId(ap.id)

    const weekEnd = weekDates[6]

    const [schedTodayResult, sessResult, weekSchedResult, weekSessResult, subResult] = await Promise.all([
      supabase.from('schedule_days').select('*').eq('artist_id', ap.id).eq('date', today).maybeSingle(),
      supabase.from('sessions').select('*').eq('artist_id', ap.id).eq('date', today).order('start_time'),
      supabase.from('schedule_days').select('*').eq('artist_id', ap.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('sessions').select('id, date').eq('artist_id', ap.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('weekly_submissions').select('submitted_at').eq('artist_id', ap.id).eq('week_start_date', weekStart).maybeSingle(),
    ])

    setTodayStatus(schedTodayResult.data as ScheduleDay | null)
    setTodaySessions((sessResult.data || []) as Session[])
    setWeekDays((weekSchedResult.data || []) as ScheduleDay[])
    setWeekSessions((weekSessResult.data || []) as Session[])
    setWeeklySubmission(subResult.data as { submitted_at: string | null } | null)
    setLoading(false)
  }, [user, today, weekStart, weekDates])

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, today, weekStart])

  // Quick-change today's status
  async function setDayStatus(newStatus: ScheduleDayStatus) {
    if (!artistProfileId) return
    setStatusUpdating(true)
    try {
      if (todayStatus) {
        // Update existing
        const { error } = await supabase
          .from('schedule_days')
          .update({ status: newStatus })
          .eq('id', todayStatus.id)
        if (error) throw error
        setTodayStatus({ ...todayStatus, status: newStatus })
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('schedule_days')
          .insert({ artist_id: artistProfileId, date: today, status: newStatus, number_of_clients: 0 })
          .select()
          .single()
        if (error) throw error
        setTodayStatus(data as ScheduleDay)
      }
      toast.success(`Status set to ${SCHEDULE_DAY_COLOURS[newStatus].label}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  const displayName = profile?.display_name || profile?.full_name || 'Artist'

  // Week helpers
  const weekDayMap = new Map(weekDays.map(d => [d.date, d]))
  const weekSessionCounts = new Map<string, number>()
  for (const s of weekSessions) {
    weekSessionCounts.set(s.date, (weekSessionCounts.get(s.date) || 0) + 1)
  }

  const STATUS_BUTTONS: { status: ScheduleDayStatus; label: string }[] = [
    { status: 'off', label: 'Off' },
    { status: 'in_booked', label: 'Booked' },
    { status: 'in_touchups', label: 'Touch-ups' },
    { status: 'in_walkins', label: 'Walk-ins' },
    { status: 'in_custom', label: 'Custom' },
  ]

  return (
    <div>
      {/* ── 1. Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-text-primary font-display tracking-tight">
            Hey, {displayName}
          </h1>
          <p className="text-lg text-text-secondary mt-1">
            {dayName} &middot; {dayNum}{getOrdinal(dayNum)} {monthName} {year}
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
      ) : !artistProfileId ? (
        <Card>
          <div className="flex items-center gap-3 text-status-warning">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">No artist profile found for your account. Ask an admin to set one up.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ── 2. Today's Status ── */}
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Status</CardTitle>
              <Link href="/schedule">
                <Button size="sm" icon={<Plus className="w-4 h-4" />}>Add Session</Button>
              </Link>
            </CardHeader>

            {todayStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${SCHEDULE_DAY_COLOURS[todayStatus.status].bg} ${SCHEDULE_DAY_COLOURS[todayStatus.status].text}`}>
                    {SCHEDULE_DAY_COLOURS[todayStatus.status].label}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''} today
                  </span>
                </div>

                {/* Quick-change buttons */}
                <div className="flex flex-wrap gap-2">
                  {STATUS_BUTTONS.map(btn => (
                    <button
                      key={btn.status}
                      disabled={statusUpdating || todayStatus.status === btn.status}
                      onClick={() => setDayStatus(btn.status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        todayStatus.status === btn.status
                          ? `${SCHEDULE_DAY_COLOURS[btn.status].bg} ${SCHEDULE_DAY_COLOURS[btn.status].text} ring-2 ring-brand-500/30`
                          : 'bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-border-secondary'
                      } disabled:opacity-50`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-status-warning">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">No status set for today — pick one below</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_BUTTONS.map(btn => (
                    <button
                      key={btn.status}
                      disabled={statusUpdating}
                      onClick={() => setDayStatus(btn.status)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-tertiary text-text-secondary hover:text-text-primary hover:bg-border-secondary transition-all disabled:opacity-50"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* ── 3. Today's Sessions ── */}
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Sessions</CardTitle>
              {todaySessions.length > 0 && (
                <Badge variant="brand">{todaySessions.length}</Badge>
              )}
            </CardHeader>

            {todaySessions.length === 0 ? (
              <p className="text-sm text-text-tertiary py-4 text-center">No sessions booked for today</p>
            ) : (
              <div className="space-y-1">
                {todaySessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-surface-tertiary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{session.client_reference || 'No name'}</p>
                        <p className="text-xs text-text-tertiary">
                          {session.session_type?.replace('_', ' ')}
                          {session.start_time && ` · ${session.start_time.slice(0, 5)}`}
                          {session.end_time && ` – ${session.end_time.slice(0, 5)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.envelope_submitted ? (
                        <span className="w-6 h-6 rounded-full bg-status-success-50 flex items-center justify-center" title="Envelope submitted">
                          <Inbox className="w-3.5 h-3.5 text-status-success" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-status-warning-50 flex items-center justify-center" title="Envelope not submitted">
                          <Inbox className="w-3.5 h-3.5 text-status-warning" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── 4. This Week Overview ── */}
          <Card>
            <CardHeader>
              <CardTitle>This Week</CardTitle>
              <Link href="/schedule" className="text-xs font-semibold text-brand-500 hover:underline">
                My Schedule &rarr;
              </Link>
            </CardHeader>

            <div className="grid grid-cols-7 gap-2">
              {weekDates.map(dateStr => {
                const d = new Date(dateStr + 'T00:00:00')
                const shortDay = d.toLocaleDateString('en-AU', { weekday: 'short' })
                const dayOfMonth = d.getDate()
                const isToday = dateStr === today
                const schedEntry = weekDayMap.get(dateStr)
                const sessCount = weekSessionCounts.get(dateStr) || 0
                const sc = schedEntry ? SCHEDULE_DAY_COLOURS[schedEntry.status] : null

                return (
                  <div
                    key={dateStr}
                    className={`flex flex-col items-center py-3 rounded-xl transition-colors ${
                      isToday ? 'bg-brand-50 ring-2 ring-brand-500/20' : 'bg-surface-tertiary'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-brand-500' : 'text-text-tertiary'}`}>
                      {shortDay}
                    </span>
                    <span className={`text-sm font-bold mt-0.5 ${isToday ? 'text-brand-500' : 'text-text-primary'}`}>
                      {dayOfMonth}
                    </span>
                    {sc ? (
                      <span className={`mt-1.5 w-2 h-2 rounded-full ${sc.bg.replace('bg-', 'bg-')}`} title={sc.label} />
                    ) : (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-neutral-200" title="No status" />
                    )}
                    {sessCount > 0 && (
                      <span className="text-[10px] font-semibold text-text-secondary mt-1">{sessCount} sess</span>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* ── 5. Quick Actions ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/weekly-schedules">
              <Card className="hover:-translate-y-1 transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-50 text-brand-500">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Submit Weekly Schedule</p>
                    <p className="text-xs text-text-tertiary">Lock in your week</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link href="/schedule">
              <Card className="hover:-translate-y-1 transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-50 text-brand-500">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Request Leave</p>
                    <p className="text-xs text-text-tertiary">Holiday, sick, or unpaid</p>
                  </div>
                </div>
              </Card>
            </Link>
            <Link href="/clients">
              <Card className="hover:-translate-y-1 transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-50 text-brand-500">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">My Clients</p>
                    <p className="text-xs text-text-tertiary">View your client list</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* ── 6. Weekly Submission Status ── */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-text-tertiary" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Weekly Schedule Submission</p>
                  <p className="text-xs text-text-tertiary">Week of {weekStart}</p>
                </div>
              </div>
              {weeklySubmission?.submitted_at ? (
                <Badge variant="success" dot>Submitted</Badge>
              ) : (
                <Link href="/weekly-schedules">
                  <Badge variant="warning" dot>Not Submitted</Badge>
                </Link>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
