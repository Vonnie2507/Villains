'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { getWeekStart, getWeekDates, getFormattedDay, formatWeekRange, shiftWeek, isCurrentWeek } from '@/lib/dates'
import { SCHEDULE_STATUS_OPTIONS, SCHEDULE_STATUS_COLOURS } from '@/types'
import type { ScheduleStatus, ScheduleEntry } from '@/types'
import { ChevronLeft, ChevronRight, Send, Calendar, Plane } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface DayEntry {
  date: string
  status: ScheduleStatus
  notes: string
  existing_id: string | null
}

export function ArtistScheduleView() {
  const { user } = useAuth()
  const toast = useToast()
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [entries, setEntries] = useState<DayEntry[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveStart, setLeaveStart] = useState('')
  const [leaveEnd, setLeaveEnd] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [submittingLeave, setSubmittingLeave] = useState(false)

  const weekDates = getWeekDates(weekStart)

  const loadSchedule = useCallback(async () => {
    if (!user) return

    const { data } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('artist_id', user.id)
      .eq('week_start', weekStart)
      .order('date')

    const existingMap = new Map<string, ScheduleEntry>()
    if (data) {
      for (const entry of data as ScheduleEntry[]) {
        existingMap.set(entry.date, entry)
      }
    }

    const newEntries: DayEntry[] = weekDates.map(date => {
      const existing = existingMap.get(date)
      return {
        date,
        status: existing?.status ?? 'off',
        notes: existing?.notes ?? '',
        existing_id: existing?.id ?? null,
      }
    })

    setEntries(newEntries)
    setIsSubmitted(data ? data.some((e: ScheduleEntry) => e.submitted_at !== null) : false)
  }, [user, weekStart, weekDates])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  function updateEntry(index: number, field: 'status' | 'notes', value: string) {
    setEntries(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)

    try {
      const upserts = entries.map(entry => ({
        ...(entry.existing_id ? { id: entry.existing_id } : {}),
        artist_id: user.id,
        date: entry.date,
        status: entry.status,
        notes: entry.notes || null,
        week_start: weekStart,
        submitted_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('schedule_entries')
        .upsert(upserts, { onConflict: 'artist_id,date' })

      if (error) throw error

      toast.success('Schedule submitted for ' + formatWeekRange(weekStart))
      setIsSubmitted(true)
      await loadSchedule()
    } catch (err) {
      toast.error('Failed to submit schedule')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLeaveSubmit() {
    if (!user || !leaveStart || !leaveEnd) return
    setSubmittingLeave(true)

    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          artist_id: user.id,
          start_date: leaveStart,
          end_date: leaveEnd,
          reason: leaveReason || null,
        })

      if (error) throw error

      toast.success('Leave request submitted')
      setShowLeaveModal(false)
      setLeaveStart('')
      setLeaveEnd('')
      setLeaveReason('')
    } catch {
      toast.error('Failed to submit leave request')
    } finally {
      setSubmittingLeave(false)
    }
  }

  const statusColour = (status: ScheduleStatus) => SCHEDULE_STATUS_COLOURS[status]

  return (
    <div>
      <PageHeader
        title="My Schedule"
        description="Submit your weekly availability — due every Sunday night"
        actions={
          <Button variant="outline" icon={<Plane className="w-4 h-4" />} onClick={() => setShowLeaveModal(true)}>
            Request Leave
          </Button>
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
          {isSubmitted && (
            <Badge variant="success" dot className="mt-1 ml-2">Submitted</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Schedule grid */}
      <div className="space-y-3">
        {entries.map((entry, i) => {
          const sc = statusColour(entry.status)
          return (
            <Card key={entry.date} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Day label */}
              <div className="w-36 shrink-0">
                <p className="text-sm font-semibold text-text-primary">{getFormattedDay(entry.date)}</p>
              </div>

              {/* Status select */}
              <div className="flex-1 max-w-xs">
                <Select
                  options={SCHEDULE_STATUS_OPTIONS}
                  value={entry.status}
                  onChange={e => updateEntry(i, 'status', e.target.value)}
                />
              </div>

              {/* Status badge */}
              <div className="w-28">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
              </div>

              {/* Notes */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={entry.notes}
                  onChange={e => updateEntry(i, 'notes', e.target.value)}
                  className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Submit button */}
      <div className="mt-6 flex justify-end">
        <Button
          size="lg"
          loading={submitting}
          onClick={handleSubmit}
          icon={<Send className="w-4 h-4" />}
        >
          {isSubmitted ? 'Update Schedule' : 'Submit Schedule'}
        </Button>
      </div>

      {/* Leave request modal */}
      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Request Leave">
        <div className="space-y-4">
          <Input
            label="Start Date"
            type="date"
            value={leaveStart}
            onChange={e => setLeaveStart(e.target.value)}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={leaveEnd}
            onChange={e => setLeaveEnd(e.target.value)}
            required
          />
          <Input
            label="Reason (optional)"
            value={leaveReason}
            onChange={e => setLeaveReason(e.target.value)}
            placeholder="Holiday, personal, etc."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
            <Button loading={submittingLeave} onClick={handleLeaveSubmit}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
