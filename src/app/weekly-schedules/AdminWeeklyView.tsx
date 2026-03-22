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
  formatWeekRange,
  shiftWeek,
  isCurrentWeek,
} from '@/lib/dates'
import type { ArtistProfile, WeeklySubmission } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
  Bell,
  ClipboardCheck,
  AlertCircle,
} from 'lucide-react'

interface ArtistRow {
  artistProfile: ArtistProfile
  submission: WeeklySubmission | null
}

export function AdminWeeklyView() {
  const { toast } = useToast()

  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [artistRows, setArtistRows] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[6]

  const loadData = useCallback(async () => {
    setLoading(true)

    // Load all active artist profiles (with their profile for display_name fallback)
    const { data: artists } = await supabase
      .from('artist_profiles')
      .select('*, profile:profiles!artist_profiles_user_id_fkey(*)')
      .order('display_name')

    if (!artists || artists.length === 0) {
      setArtistRows([])
      setLoading(false)
      return
    }

    // Load all weekly submissions for this week
    const { data: submissions } = await supabase
      .from('weekly_submissions')
      .select('*')
      .eq('week_start_date', weekStart)

    const submissionMap = new Map<string, WeeklySubmission>()
    if (submissions) {
      for (const sub of submissions as WeeklySubmission[]) {
        submissionMap.set(sub.artist_id, sub)
      }
    }

    const rows: ArtistRow[] = (artists as ArtistProfile[]).map((ap) => ({
      artistProfile: ap,
      submission: submissionMap.get(ap.id) ?? null,
    }))

    setArtistRows(rows)
    setLoading(false)
  }, [weekStart])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Stats
  const totalArtists = artistRows.length
  const submittedCount = artistRows.filter((r) => r.submission?.submitted_at).length
  const notSubmittedCount = totalArtists - submittedCount

  function getDisplayName(row: ArtistRow): string {
    return (
      row.artistProfile.display_name ??
      row.artistProfile.profile?.display_name ??
      row.artistProfile.profile?.full_name ??
      'Unknown Artist'
    )
  }

  function handleSendReminders() {
    toast.info('Reminders will be sent to artists who have not yet submitted.')
  }

  return (
    <div>
      <PageHeader
        title="Weekly Schedule Submissions"
        description="Review which artists have submitted their weekly schedule and envelope confirmations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Weekly Schedules' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<Bell className="w-4 h-4" />}
            onClick={handleSendReminders}
          >
            Send Reminders
          </Button>
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
          title="Total Artists"
          value={totalArtists}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Submitted"
          value={submittedCount}
          icon={<ClipboardCheck className="w-5 h-5" />}
        />
        <StatCard
          title="Not Submitted"
          value={notSubmittedCount}
          icon={<AlertCircle className="w-5 h-5" />}
        />
      </StatGrid>

      {/* Artist list */}
      {loading ? (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">
            Loading submissions...
          </p>
        </Card>
      ) : artistRows.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">
            No artists found.
          </p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-text-secondary">Artist</th>
                  <th className="px-4 py-3 font-medium text-text-secondary">Seat</th>
                  <th className="px-4 py-3 font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 font-medium text-text-secondary">Sessions</th>
                  <th className="px-4 py-3 font-medium text-text-secondary">Envelopes Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {artistRows.map((row) => {
                  const sub = row.submission
                  const hasSubmitted = !!sub?.submitted_at
                  return (
                    <tr
                      key={row.artistProfile.id}
                      className="border-b border-border/50 last:border-0 hover:bg-surface-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {getDisplayName(row)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {row.artistProfile.seat_name_or_number ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {hasSubmitted ? (
                          <Badge variant="success" dot>
                            Submitted
                          </Badge>
                        ) : (
                          <Badge variant="warning" dot>
                            Not Submitted
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {hasSubmitted ? sub!.total_sessions_count : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {hasSubmitted ? (
                          sub!.confirmation_envelopes_submitted ? (
                            <CheckCircle2 className="w-5 h-5 text-status-success" />
                          ) : (
                            <XCircle className="w-5 h-5 text-status-error" />
                          )
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>
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
