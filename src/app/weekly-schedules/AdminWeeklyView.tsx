'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import {
  getWeekStart,
  getWeekDates,
  getFormattedDay,
  formatWeekRange,
  shiftWeek,
  isCurrentWeek,
} from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ArtistProfile, WeeklySubmission, Session, ScheduleDay, ScheduleDayStatus } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  CheckCircle2,
  XCircle,
  Bell,
  ClipboardCheck,
  AlertCircle,
  Mail,
  Check,
  X,
  Clock,
} from 'lucide-react'

interface ArtistRow {
  artistProfile: ArtistProfile
  submission: WeeklySubmission | null
  sessions: Session[]
  scheduleDays: ScheduleDay[]
}

export function AdminWeeklyView() {
  const { toast } = useToast()

  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [artistRows, setArtistRows] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null)

  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[6]

  const loadData = useCallback(async () => {
    setLoading(true)

    const [artistsRes, submissionsRes, sessionsRes, daysRes] = await Promise.all([
      supabase.from('artist_profiles').select('*, profile:profiles!artist_profiles_user_id_fkey(*)').order('display_name'),
      supabase.from('weekly_submissions').select('*').eq('week_start_date', weekStart),
      supabase.from('sessions').select('*').gte('date', weekDates[0]).lte('date', weekEnd).order('date').order('created_at'),
      supabase.from('schedule_days').select('*').gte('date', weekDates[0]).lte('date', weekEnd),
    ])

    const artists = (artistsRes.data || []) as ArtistProfile[]
    const submissions = (submissionsRes.data || []) as WeeklySubmission[]
    const sessions = (sessionsRes.data || []) as Session[]
    const days = (daysRes.data || []) as ScheduleDay[]

    const subMap = new Map(submissions.map(s => [s.artist_id, s]))

    const rows: ArtistRow[] = artists.map(ap => ({
      artistProfile: ap,
      submission: subMap.get(ap.id) ?? null,
      sessions: sessions.filter(s => s.artist_id === ap.id),
      scheduleDays: days.filter(d => d.artist_id === ap.id),
    }))

    setArtistRows(rows)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  useEffect(() => { loadData() }, [loadData])

  // ── Reception: mark envelope received / not received ──
  async function setEnvelopeStatus(sessionId: string, received: boolean) {
    // Update envelope_submitted to reflect reception's action
    // received = true means reception confirms they got it
    // received = false means reception says they didn't get it
    try {
      const { error } = await supabase.from('sessions')
        .update({
          envelope_submitted: received,
          // If the DB has envelope_status column, this will work; if not, it'll be ignored
          envelope_status: received ? 'received' : 'not_received',
        })
        .eq('id', sessionId)
      if (error) throw error

      // Update local state
      setArtistRows(prev => prev.map(row => ({
        ...row,
        sessions: row.sessions.map(s =>
          s.id === sessionId ? { ...s, envelope_submitted: received, envelope_status: received ? 'received' as const : 'not_received' as const } : s
        ),
      })))

      toast.success(received ? 'Envelope marked as received' : 'Envelope marked as not received')
    } catch {
      toast.error('Failed to update envelope status')
    }
  }

  // Stats
  const totalArtists = artistRows.length
  const submittedCount = artistRows.filter(r => r.submission?.submitted_at).length
  const notSubmittedCount = totalArtists - submittedCount
  const totalSessions = artistRows.reduce((sum, r) => sum + r.sessions.length, 0)
  const envelopesReceived = artistRows.reduce((sum, r) => sum + r.sessions.filter(s => s.envelope_submitted).length, 0)
  const envelopesPending = totalSessions - envelopesReceived

  function getDisplayName(row: ArtistRow): string {
    return row.artistProfile.display_name ?? row.artistProfile.profile?.display_name ?? row.artistProfile.profile?.full_name ?? 'Unknown'
  }

  return (
    <div>
      <PageHeader
        title="Weekly Schedules"
        description="Review submissions and manage envelopes"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Weekly Schedules' },
        ]}
      />

      {/* Week selector */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setWeekStart(shiftWeek(weekStart, -1))} />
        <span className="text-sm font-medium text-text-primary min-w-[200px] text-center">{formatWeekRange(weekStart)}</span>
        <Button variant="outline" size="sm" icon={<ChevronRight className="w-4 h-4" />} onClick={() => setWeekStart(shiftWeek(weekStart, 1))} />
        {!isCurrentWeek(weekStart) && (
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(getWeekStart())}>This Week</Button>
        )}
      </div>

      {/* Stats */}
      <StatGrid className="mb-6">
        <StatCard title="Artists" value={totalArtists} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Submitted" value={submittedCount} icon={<ClipboardCheck className="w-5 h-5" />} />
        <StatCard title="Not Submitted" value={notSubmittedCount} icon={<AlertCircle className="w-5 h-5" />} />
        <StatCard title="Envelopes Pending" value={envelopesPending} icon={<Mail className="w-5 h-5" />} />
      </StatGrid>

      {/* Artist list */}
      {loading ? (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">Loading...</p>
        </Card>
      ) : artistRows.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">No artists found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {artistRows.map(row => {
            const sub = row.submission
            const hasSubmitted = !!sub?.submitted_at
            const isExpanded = expandedArtist === row.artistProfile.id
            const artistSessions = row.sessions
            const envelopesDone = artistSessions.filter(s => s.envelope_submitted).length

            return (
              <Card key={row.artistProfile.id}>
                {/* Artist header — tap to expand */}
                <button
                  className="w-full flex items-center justify-between text-left"
                  onClick={() => setExpandedArtist(isExpanded ? null : row.artistProfile.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-tertiary flex items-center justify-center text-xs font-bold text-text-primary shrink-0">
                      {getDisplayName(row).split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{getDisplayName(row)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {hasSubmitted ? (
                          <Badge variant="success" dot>Submitted</Badge>
                        ) : (
                          <Badge variant="warning" dot>Not Submitted</Badge>
                        )}
                        {artistSessions.length > 0 && (
                          <span className="text-[10px] text-text-tertiary">
                            {artistSessions.length} client{artistSessions.length !== 1 ? 's' : ''} · {envelopesDone}/{artistSessions.length} envelopes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded: schedule + sessions with envelope controls */}
                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4 space-y-4">
                    {/* Schedule overview */}
                    <div className="grid grid-cols-7 gap-1">
                      {weekDates.map(date => {
                        const dayEntry = row.scheduleDays.find(d => d.date === date)
                        const daySessions = artistSessions.filter(s => s.date === date)
                        const sc = dayEntry ? SCHEDULE_DAY_COLOURS[dayEntry.status as ScheduleDayStatus] : null
                        const todayStr = new Date().toISOString().split('T')[0]

                        return (
                          <div key={date} className={`flex flex-col items-center py-2 rounded-lg text-center ${date === todayStr ? 'bg-brand-50 ring-1 ring-brand-500/20' : 'bg-surface-tertiary'}`}>
                            <span className="text-[9px] font-bold uppercase text-text-tertiary">
                              {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
                            </span>
                            <span className="text-xs font-bold text-text-primary">{new Date(date + 'T00:00:00').getDate()}</span>
                            {sc ? (
                              <span className={`mt-1 px-1 py-0.5 rounded text-[8px] font-bold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                            ) : (
                              <span className="mt-1 text-[8px] text-text-tertiary">—</span>
                            )}
                            {daySessions.length > 0 && (
                              <span className="text-[9px] text-text-tertiary mt-0.5">{daySessions.length}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Sessions with envelope management */}
                    {artistSessions.length === 0 ? (
                      <p className="text-xs text-text-tertiary text-center py-2">No clients this week</p>
                    ) : (
                      <div>
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                          Clients & Envelopes
                        </p>
                        {weekDates.map(date => {
                          const daySessions = artistSessions.filter(s => s.date === date)
                          if (daySessions.length === 0) return null

                          return (
                            <div key={date} className="mb-3">
                              <p className="text-[10px] font-semibold text-text-secondary mb-1">
                                {getFormattedDay(date)}
                              </p>
                              {daySessions.map(session => (
                                <div key={session.id} className="flex items-center justify-between py-2 px-3 -mx-3 rounded-lg hover:bg-surface-tertiary transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Envelope status icon */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      session.envelope_submitted
                                        ? 'bg-status-success-50 text-status-success'
                                        : 'bg-surface-tertiary text-text-tertiary'
                                    }`}>
                                      {session.envelope_submitted ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-text-primary truncate">
                                        {session.client_reference || 'Client'}
                                      </p>
                                      <p className="text-[10px] text-text-tertiary">
                                        {session.envelope_submitted ? (
                                          <span className="text-status-success font-semibold">Envelope received</span>
                                        ) : (
                                          <span className="text-status-warning font-semibold">Pending</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Reception envelope actions */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => setEnvelopeStatus(session.id, true)}
                                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all min-h-[36px] ${
                                        session.envelope_submitted
                                          ? 'bg-status-success-50 text-status-success ring-1 ring-status-success/20'
                                          : 'bg-surface-tertiary text-text-secondary hover:bg-status-success-50 hover:text-status-success'
                                      }`}
                                      title="Mark envelope received"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Received</span>
                                    </button>
                                    <button
                                      onClick={() => setEnvelopeStatus(session.id, false)}
                                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all min-h-[36px] ${
                                        !session.envelope_submitted
                                          ? 'bg-status-error-50 text-status-error ring-1 ring-status-error/20'
                                          : 'bg-surface-tertiary text-text-secondary hover:bg-status-error-50 hover:text-status-error'
                                      }`}
                                      title="Mark envelope not received"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Not Received</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
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
