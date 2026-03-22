'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toDateString, getWeekStart, getFormattedDay } from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ScheduleDay, ArtistProfile, ScheduleDayStatus, Session } from '@/types'
import { Calendar, Users, AlertCircle, TrendingUp, ClipboardList, Inbox } from 'lucide-react'

export default function DashboardPage() {
  const { isArtist } = useAuth()

  return (
    <DashboardLayout activePath="/dashboard">
      {isArtist ? <ArtistDashboard /> : <AdminDashboard />}
    </DashboardLayout>
  )
}

function AdminDashboard() {
  const [todayEntries, setTodayEntries] = useState<(ScheduleDay & { artist_profile?: ArtistProfile })[]>([])
  const [weekSubmissions, setWeekSubmissions] = useState<{ total: number; submitted: number }>({ total: 0, submitted: 0 })
  const [artistCount, setArtistCount] = useState(0)
  const [newEnquiries, setNewEnquiries] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = toDateString(new Date())
  const weekStart = getWeekStart()

  const loadDashboard = useCallback(async () => {
    setLoading(true)

    const [todayResult, artistsResult, enquiriesResult] = await Promise.all([
      supabase
        .from('schedule_days')
        .select('*, artist_profile:artist_profiles(id, display_name, user_id, specialties)')
        .eq('date', today),
      supabase
        .from('artist_profiles')
        .select('id'),
      supabase
        .from('client_profiles')
        .select('id')
        .eq('stage', 'new_enquiry'),
    ])

    setTodayEntries((todayResult.data || []) as (ScheduleDay & { artist_profile?: ArtistProfile })[])
    const totalArtists = (artistsResult.data || []).length
    setArtistCount(totalArtists)
    setNewEnquiries((enquiriesResult.data || []).length)

    // Check weekly submissions
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

  const inStudioToday = todayEntries.filter(e => e.status !== 'off')
  const withClients = todayEntries.filter(e => e.status === 'in_booked')

  return (
    <div>
      <PageHeader title="Dashboard" description={`Today is ${getFormattedDay(today)}`} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <StatGrid className="mb-6">
            <StatCard title="In Studio Today" value={`${inStudioToday.length} / ${artistCount}`} icon={<Users className="w-5 h-5" />} />
            <StatCard title="Booked Today" value={withClients.length} icon={<Calendar className="w-5 h-5" />} />
            <StatCard
              title="Weekly Submissions"
              value={`${weekSubmissions.submitted} / ${weekSubmissions.total}`}
              icon={<ClipboardList className="w-5 h-5" />}
            />
            <StatCard title="New Enquiries" value={newEnquiries} icon={<Inbox className="w-5 h-5" />} />
          </StatGrid>

          {/* Today's Studio Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Today&apos;s Studio</CardTitle>
            </CardHeader>
            {todayEntries.length === 0 ? (
              <p className="text-sm text-text-secondary">No schedule entries for today yet</p>
            ) : (
              <div className="space-y-2">
                {todayEntries.map(entry => {
                  const sc = SCHEDULE_DAY_COLOURS[entry.status as ScheduleDayStatus]
                  const name = entry.artist_profile?.display_name || 'Unknown'
                  return (
                    <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                          {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-text-primary">{name}</span>
                          {entry.number_of_clients > 0 && (
                            <span className="text-xs text-text-tertiary ml-2">{entry.number_of_clients} session{entry.number_of_clients !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Submission warning */}
          {weekSubmissions.submitted < weekSubmissions.total && (
            <Card className="border-status-warning/30 bg-status-warning-50/30">
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
        </>
      )}
    </div>
  )
}

function ArtistDashboard() {
  const { user, profile } = useAuth()
  const today = toDateString(new Date())
  const [todayStatus, setTodayStatus] = useState<ScheduleDay | null>(null)
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)

      // Get artist profile id
      const { data: ap } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!ap) { setLoading(false); return }
      setArtistProfileId(ap.id)

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
      <PageHeader title={`Hey, ${displayName}`} description={getFormattedDay(today)} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
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
                        {session.session_type?.replace('_', ' ')} {session.start_time && `· ${session.start_time}`}{session.end_time && ` – ${session.end_time}`}
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
            <StatCard title="Sessions Today" value={todaySessions.length} icon={<Calendar className="w-5 h-5" />} />
            <StatCard title="Envelopes Submitted" value={todaySessions.filter(s => s.envelope_submitted).length} icon={<TrendingUp className="w-5 h-5" />} />
          </StatGrid>
        </>
      )}
    </div>
  )
}
