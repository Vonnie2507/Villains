'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { getWeekStart, getWeekDates, getShortDayName, formatWeekRange, shiftWeek, isCurrentWeek, toDateString } from '@/lib/dates'
import { SCHEDULE_STATUS_COLOURS } from '@/types'
import type { ScheduleStatus, ScheduleEntry, Profile } from '@/types'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

interface ArtistRow {
  artist: Profile
  entries: Map<string, ScheduleEntry>
  hasSubmitted: boolean
}

export function AdminScheduleView() {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = getWeekDates(weekStart)

  const loadData = useCallback(async () => {
    setLoading(true)

    // Fetch all active artists
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'artist')
      .eq('is_active', true)
      .order('full_name')

    // Fetch all schedule entries for the week
    const { data: entries } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('week_start', weekStart)

    const entryMap = new Map<string, Map<string, ScheduleEntry>>()
    if (entries) {
      for (const entry of entries as ScheduleEntry[]) {
        if (!entryMap.has(entry.artist_id)) {
          entryMap.set(entry.artist_id, new Map())
        }
        entryMap.get(entry.artist_id)!.set(entry.date, entry)
      }
    }

    const rows: ArtistRow[] = (profiles as Profile[] || []).map(artist => {
      const artistEntries = entryMap.get(artist.id) || new Map()
      const hasSubmitted = Array.from(artistEntries.values()).some(e => e.submitted_at !== null)
      return { artist, entries: artistEntries, hasSubmitted }
    })

    setArtists(rows)
    setLoading(false)
  }, [weekStart])

  useEffect(() => {
    loadData()
  }, [loadData])

  const today = toDateString(new Date())
  const notSubmittedCount = artists.filter(a => !a.hasSubmitted).length

  return (
    <div>
      <PageHeader
        title="Master Calendar"
        description="All artists' schedules at a glance"
        actions={
          notSubmittedCount > 0 ? (
            <Badge variant="warning" dot>
              {notSubmittedCount} not submitted
            </Badge>
          ) : (
            <Badge variant="success" dot>All submitted</Badge>
          )
        }
      />

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary">{formatWeekRange(weekStart)}</p>
          {isCurrentWeek(weekStart) && (
            <Badge variant="brand" className="mt-1">Current Week</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : artists.length === 0 ? (
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
                    <th
                      key={date}
                      className={`text-center px-2 py-3 text-sm font-semibold ${date === today ? 'text-brand-500' : 'text-text-primary'}`}
                    >
                      <div>{getShortDayName(date)}</div>
                      <div className="text-xs text-text-tertiary font-normal">
                        {new Date(date + 'T00:00:00').getDate()}
                      </div>
                    </th>
                  ))}
                  <th className="text-center px-4 py-3 text-sm font-semibold text-text-primary w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {artists.map(row => (
                  <tr key={row.artist.id} className="border-b border-border last:border-0 hover:bg-surface-tertiary/30">
                    {/* Artist name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {row.artist.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{row.artist.display_name || row.artist.full_name}</p>
                          {row.artist.specialties && row.artist.specialties.length > 0 && (
                            <p className="text-xs text-text-tertiary">{row.artist.specialties[0]}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {weekDates.map(date => {
                      const entry = row.entries.get(date)
                      const status = entry?.status || null
                      const sc = status ? SCHEDULE_STATUS_COLOURS[status] : null

                      return (
                        <td key={date} className={`text-center px-2 py-3 ${date === today ? 'bg-brand-50/30' : ''}`}>
                          {sc ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${sc.bg} ${sc.text}`}>
                              {sc.label}
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </td>
                      )
                    })}

                    {/* Submitted status */}
                    <td className="text-center px-4 py-3">
                      {row.hasSubmitted ? (
                        <Badge variant="success" className="text-xs">Done</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-status-warning">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
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
