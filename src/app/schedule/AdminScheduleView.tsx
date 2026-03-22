'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import {
  getWeekStart, getWeekDates, getShortDayName,
  formatWeekRange, shiftWeek, isCurrentWeek, toDateString,
} from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS } from '@/types'
import type { ScheduleDay, ScheduleDayStatus, Session, ArtistProfile } from '@/types'
import { ChevronLeft, ChevronRight, AlertCircle, MailOpen } from 'lucide-react'

interface ArtistRow {
  artist: ArtistProfile
  days: Map<string, ScheduleDay>
  sessions: Session[]
}

export function AdminScheduleView() {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [rows, setRows] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const today = useMemo(() => toDateString(new Date()), [])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const startDate = weekDates[0]
        const endDate = weekDates[6]

        const [artistsRes, daysRes, sessionsRes] = await Promise.all([
          supabase.from('artist_profiles').select('*').order('display_name'),
          supabase.from('schedule_days').select('*').gte('date', startDate).lte('date', endDate),
          supabase.from('sessions').select('*').gte('date', startDate).lte('date', endDate),
        ])

        if (!active) return

        const artists = (artistsRes.data || []) as ArtistProfile[]
        const allDays = (daysRes.data || []) as ScheduleDay[]
        const allSessions = (sessionsRes.data || []) as Session[]

        const dayMap = new Map<string, Map<string, ScheduleDay>>()
        for (const d of allDays) {
          if (!dayMap.has(d.artist_id)) dayMap.set(d.artist_id, new Map())
          dayMap.get(d.artist_id)!.set(d.date, d)
        }

        const sessMap = new Map<string, Session[]>()
        for (const s of allSessions) {
          if (!sessMap.has(s.artist_id)) sessMap.set(s.artist_id, [])
          sessMap.get(s.artist_id)!.push(s)
        }

        const result: ArtistRow[] = artists.map(a => ({
          artist: a,
          days: dayMap.get(a.id) || new Map(),
          sessions: sessMap.get(a.id) || [],
        }))

        setRows(result)
      } catch (err) {
        console.error('Calendar load error:', err)
        setError('Failed to load calendar')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [weekDates])

  return (
    <div>
      <PageHeader title="Studio Calendar" description="All artists' schedules at a glance" />

      {/* Week navigation */}
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

      {error && (
        <Card className="mb-4">
          <p className="text-sm text-status-error">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-8">No active artists found</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-primary w-48">Artist</th>
                  {weekDates.map(date => (
                    <th key={date} className={`text-center px-2 py-3 text-sm font-semibold ${date === today ? 'text-brand-500' : 'text-text-primary'}`}>
                      <div>{getShortDayName(date)}</div>
                      <div className="text-xs text-text-tertiary font-normal">{new Date(date + 'T00:00:00').getDate()}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.artist.id} className="border-b border-border last:border-0 hover:bg-surface-tertiary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-text-inverse text-xs font-bold shrink-0">
                          {(row.artist.display_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{row.artist.display_name || 'Artist'}</p>
                          {row.artist.seat_name_or_number && (
                            <p className="text-xs text-text-tertiary">Seat {row.artist.seat_name_or_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDates.map(date => {
                      const dayData = row.days.get(date)
                      const daySessions = row.sessions.filter(s => s.date === date)
                      const status = dayData?.status as ScheduleDayStatus | undefined
                      const sc = status ? SCHEDULE_DAY_COLOURS[status] : null
                      const envelopeMissing = daySessions.some(s => !s.envelope_submitted)

                      return (
                        <td key={date} className={`text-center px-2 py-3 ${date === today ? 'bg-brand-50/30' : ''}`}>
                          {sc ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                          {daySessions.length > 0 && (
                            <p className="text-[10px] text-text-tertiary mt-0.5">{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}</p>
                          )}
                          {envelopeMissing && daySessions.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-status-warning mt-0.5">
                              <MailOpen className="w-3 h-3" />
                            </span>
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
