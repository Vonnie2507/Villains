'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
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
import type { Session, WeeklySubmission } from '@/types'
import { SESSION_TYPE_OPTIONS } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Mail,
  MailX,
  CalendarDays,
} from 'lucide-react'

export function ArtistWeeklyView() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [sessions, setSessions] = useState<Session[]>([])
  const [submission, setSubmission] = useState<WeeklySubmission | null>(null)
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [envelopeConfirmed, setEnvelopeConfirmed] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[6]

  // Look up artist_profile.id from user_id
  const loadArtistProfile = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (data) {
      setArtistProfileId(data.id)
    }
  }, [user])

  useEffect(() => {
    loadArtistProfile()
  }, [loadArtistProfile])

  // Load sessions and submission for the week
  const loadWeekData = useCallback(async () => {
    if (!artistProfileId) return
    setLoading(true)

    const [sessionsRes, submissionRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('*')
        .eq('artist_id', artistProfileId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date')
        .order('start_time'),
      supabase
        .from('weekly_submissions')
        .select('*')
        .eq('artist_id', artistProfileId)
        .eq('week_start_date', weekStart)
        .single(),
    ])

    setSessions((sessionsRes.data as Session[]) ?? [])
    setSubmission((submissionRes.data as WeeklySubmission) ?? null)
    if (submissionRes.data) {
      setEnvelopeConfirmed(submissionRes.data.confirmation_envelopes_submitted)
    } else {
      setEnvelopeConfirmed(false)
    }
    setLoading(false)
  }, [artistProfileId, weekStart, weekEnd])

  useEffect(() => {
    loadWeekData()
  }, [loadWeekData])

  // Stats
  const totalSessions = sessions.length
  const envelopeSubmitted = sessions.filter((s) => s.envelope_submitted).length
  const envelopeNotSubmitted = totalSessions - envelopeSubmitted

  // Group sessions by date
  const sessionsByDate = new Map<string, Session[]>()
  for (const s of sessions) {
    const existing = sessionsByDate.get(s.date) ?? []
    existing.push(s)
    sessionsByDate.set(s.date, existing)
  }

  // Get session type label
  function getSessionTypeLabel(type: string | null): string {
    if (!type) return '—'
    const opt = SESSION_TYPE_OPTIONS.find((o) => o.value === type)
    return opt?.label ?? type
  }

  // Format time like "10:00" from "10:00:00"
  function formatTime(time: string | null): string {
    if (!time) return '—'
    return time.slice(0, 5)
  }

  // Submit / update weekly submission
  async function handleSubmit() {
    if (!artistProfileId) return
    setSubmitting(true)

    const payload = {
      artist_id: artistProfileId,
      week_start_date: weekStart,
      week_end_date: weekEnd,
      submitted_at: new Date().toISOString(),
      total_sessions_count: totalSessions,
      confirmation_envelopes_submitted: envelopeConfirmed,
      notes: null,
    }

    let error
    if (submission?.id) {
      // Update existing
      const res = await supabase
        .from('weekly_submissions')
        .update(payload)
        .eq('id', submission.id)
      error = res.error
    } else {
      // Insert new
      const res = await supabase
        .from('weekly_submissions')
        .insert(payload)
      error = res.error
    }

    if (error) {
      toast.error('Failed to submit: ' + error.message)
    } else {
      toast.success('Weekly schedule submitted successfully.')
      await loadWeekData()
    }
    setSubmitting(false)
  }

  const isAlreadySubmitted = !!submission?.submitted_at

  return (
    <div>
      <PageHeader
        title="Weekly Schedule Submission"
        description="Review your sessions for this week and confirm you've submitted all envelopes."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Weekly Schedules' },
        ]}
        actions={
          isAlreadySubmitted ? (
            <Badge variant="success" dot>
              Submitted
            </Badge>
          ) : undefined
        }
      />

      {/* Week selector */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          icon={<ChevronLeft className="w-4 h-4" />}
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
        />
        <span className="text-sm font-medium text-text-primary min-w-[200px] text-center">
          {formatWeekRange(weekStart)}
        </span>
        <Button
          variant="outline"
          size="sm"
          icon={<ChevronRight className="w-4 h-4" />}
          onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
        />
        {!isCurrentWeek(weekStart) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(getWeekStart())}
          >
            This Week
          </Button>
        )}
      </div>

      {/* Stats */}
      <StatGrid className="mb-6">
        <StatCard
          title="Total Sessions"
          value={totalSessions}
          icon={<CalendarDays className="w-5 h-5" />}
        />
        <StatCard
          title="Envelopes Submitted"
          value={envelopeSubmitted}
          icon={<Mail className="w-5 h-5" />}
        />
        <StatCard
          title="Envelopes Outstanding"
          value={envelopeNotSubmitted}
          icon={<MailX className="w-5 h-5" />}
        />
      </StatGrid>

      {/* Session list grouped by date */}
      {loading ? (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">
            Loading sessions...
          </p>
        </Card>
      ) : totalSessions === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">
            No sessions recorded for this week.
          </p>
        </Card>
      ) : (
        <div className="space-y-4 mb-6">
          {weekDates.map((date) => {
            const daySessions = sessionsByDate.get(date)
            if (!daySessions || daySessions.length === 0) return null
            return (
              <Card key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-brand-500" />
                  <h3 className="text-sm font-semibold text-text-primary">
                    {getFormattedDay(date)}
                  </h3>
                  <Badge variant="default">
                    {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 pr-4 font-medium text-text-secondary">Client</th>
                        <th className="pb-2 pr-4 font-medium text-text-secondary">Type</th>
                        <th className="pb-2 pr-4 font-medium text-text-secondary">Time</th>
                        <th className="pb-2 font-medium text-text-secondary">Envelope</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daySessions.map((session) => (
                        <tr key={session.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 text-text-primary">
                            {session.client_reference || '—'}
                          </td>
                          <td className="py-2 pr-4 text-text-secondary">
                            {getSessionTypeLabel(session.session_type)}
                          </td>
                          <td className="py-2 pr-4 text-text-secondary">
                            {session.start_time || session.end_time
                              ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}`
                              : '—'}
                          </td>
                          <td className="py-2">
                            {session.envelope_submitted ? (
                              <CheckCircle2 className="w-5 h-5 text-status-success" />
                            ) : (
                              <XCircle className="w-5 h-5 text-status-error" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation and submit */}
      <Card className="mt-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={envelopeConfirmed}
            onChange={(e) => setEnvelopeConfirmed(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-border text-brand-600 focus:ring-brand-500"
            disabled={isAlreadySubmitted}
          />
          <span className="text-sm text-text-primary">
            I confirm I have submitted all envelopes for this week
          </span>
        </label>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={isAlreadySubmitted}
            icon={<ClipboardCheck className="w-4 h-4" />}
          >
            {isAlreadySubmitted ? 'Already Submitted' : 'Submit Weekly Schedule'}
          </Button>
          {isAlreadySubmitted && (
            <span className="text-xs text-text-tertiary">
              Submitted {new Date(submission!.submitted_at!).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
