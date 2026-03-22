'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import {
  getWeekStart, getWeekDates, getFormattedDay, formatWeekRange,
  shiftWeek, isCurrentWeek, toDateString, getDayName,
} from '@/lib/dates'
import {
  SCHEDULE_DAY_STATUS_OPTIONS, SCHEDULE_DAY_COLOURS,
  SESSION_TYPE_OPTIONS, LEAVE_TYPE_OPTIONS,
} from '@/types'
import type {
  ScheduleDay, ScheduleDayStatus, Session, SessionType, LeaveType,
} from '@/types'
import {
  ChevronLeft, ChevronRight, Plus, Plane, Calendar,
  Clock, User, Mail, MailOpen, Eye,
} from 'lucide-react'

/* ── View modes ── */
type ViewMode = 'day' | 'week' | 'month'

/* ── Helpers ── */
function getMonthDates(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1)
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (string | null)[][] = []
  let week: (string | null)[] = Array(startDay).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d)
    week.push(toDateString(dt))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function formatTime(t: string | null): string {
  if (!t) return ''
  // Handle HH:MM or HH:MM:SS
  return t.slice(0, 5)
}

export function ArtistScheduleView() {
  const { user } = useAuth()
  const { toast } = useToast()

  /* ── State ── */
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()))
  const [monthYear, setMonthYear] = useState<{ year: number; month: number }>({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  })

  const [scheduleDays, setScheduleDays] = useState<Map<string, ScheduleDay>>(new Map())
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  // Session form
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [sessionForm, setSessionForm] = useState({
    date: '',
    start_time: '',
    end_time: '',
    client_reference: '',
    session_type: 'new_piece' as SessionType,
    envelope_submitted: false,
    notes: '',
  })
  const [savingSession, setSavingSession] = useState(false)

  // Leave form
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    start_date: '',
    end_date: '',
    type: 'holiday' as LeaveType,
    notes: '',
  })
  const [savingLeave, setSavingLeave] = useState(false)

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const today = useMemo(() => toDateString(new Date()), [])

  /* ── Fetch artist_profile_id ── */
  useEffect(() => {
    async function fetchArtistProfile() {
      if (!user) return
      setProfileLoading(true)
      const { data } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      setArtistProfileId(data?.id ?? null)
      setProfileLoading(false)
    }
    fetchArtistProfile()
  }, [user])

  /* ── Fetch function (called by useEffect and handlers) ── */
  async function loadData() {
    if (!artistProfileId) return
    setLoading(true)

    let startDate: string
    let endDate: string

    const wd = getWeekDates(weekStart)
    if (viewMode === 'week') {
      startDate = wd[0]
      endDate = wd[6]
    } else if (viewMode === 'day') {
      startDate = selectedDate
      endDate = selectedDate
    } else {
      const first = new Date(monthYear.year, monthYear.month, 1)
      const last = new Date(monthYear.year, monthYear.month + 1, 0)
      startDate = toDateString(first)
      endDate = toDateString(last)
    }

    const [daysRes, sessionsRes] = await Promise.all([
      supabase
        .from('schedule_days')
        .select('*')
        .eq('artist_id', artistProfileId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date'),
      supabase
        .from('sessions')
        .select('*')
        .eq('artist_id', artistProfileId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('start_time'),
    ])

    const dayMap = new Map<string, ScheduleDay>()
    if (daysRes.data) {
      for (const d of daysRes.data as ScheduleDay[]) {
        dayMap.set(d.date, d)
      }
    }
    setScheduleDays(dayMap)
    setSessions((sessionsRes.data as Session[]) || [])
    setLoading(false)
  }

  /* ── Auto-load on dependency changes ── */
  useEffect(() => {
    if (!artistProfileId) return
    let cancelled = false

    async function fetchData() {
      setLoading(true)

      let startDate: string
      let endDate: string

      const wd = getWeekDates(weekStart)
      if (viewMode === 'week') {
        startDate = wd[0]
        endDate = wd[6]
      } else if (viewMode === 'day') {
        startDate = selectedDate
        endDate = selectedDate
      } else {
        const first = new Date(monthYear.year, monthYear.month, 1)
        const last = new Date(monthYear.year, monthYear.month + 1, 0)
        startDate = toDateString(first)
        endDate = toDateString(last)
      }

      const [daysRes, sessionsRes] = await Promise.all([
        supabase
          .from('schedule_days')
          .select('*')
          .eq('artist_id', artistProfileId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date'),
        supabase
          .from('sessions')
          .select('*')
          .eq('artist_id', artistProfileId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('start_time'),
      ])

      if (cancelled) return

      const dayMap = new Map<string, ScheduleDay>()
      if (daysRes.data) {
        for (const d of daysRes.data as ScheduleDay[]) {
          dayMap.set(d.date, d)
        }
      }
      setScheduleDays(dayMap)
      setSessions((sessionsRes.data as Session[]) || [])
      setLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [artistProfileId, viewMode, weekStart, selectedDate, monthYear.year, monthYear.month])

  /* ── Status upsert ── */
  async function handleStatusChange(date: string, status: ScheduleDayStatus) {
    if (!artistProfileId) return
    const existing = scheduleDays.get(date)

    const payload = {
      artist_id: artistProfileId,
      date,
      status,
      number_of_clients: existing?.number_of_clients ?? 0,
      notes: existing?.notes ?? null,
    }

    const { error } = existing
      ? await supabase.from('schedule_days').update({ status }).eq('id', existing.id)
      : await supabase.from('schedule_days').insert(payload)

    if (error) {
      toast.error('Failed to update status')
      return
    }

    toast.success(`${getDayName(date)} set to ${SCHEDULE_DAY_COLOURS[status].label}`)
    await loadData()
  }

  /* ── Session CRUD ── */
  function openAddSession(date: string) {
    setEditingSession(null)
    setSessionForm({
      date,
      start_time: '',
      end_time: '',
      client_reference: '',
      session_type: 'new_piece',
      envelope_submitted: false,
      notes: '',
    })
    setShowSessionModal(true)
  }

  function openEditSession(session: Session) {
    setEditingSession(session)
    setSessionForm({
      date: session.date,
      start_time: session.start_time ? formatTime(session.start_time) : '',
      end_time: session.end_time ? formatTime(session.end_time) : '',
      client_reference: session.client_reference || '',
      session_type: session.session_type || 'new_piece',
      envelope_submitted: session.envelope_submitted,
      notes: session.notes || '',
    })
    setShowSessionModal(true)
  }

  async function handleSessionSave() {
    if (!artistProfileId) return
    setSavingSession(true)

    const payload = {
      artist_id: artistProfileId,
      date: sessionForm.date,
      start_time: sessionForm.start_time || null,
      end_time: sessionForm.end_time || null,
      client_reference: sessionForm.client_reference || null,
      session_type: sessionForm.session_type,
      envelope_submitted: sessionForm.envelope_submitted,
      notes: sessionForm.notes || null,
    }

    const { error } = editingSession
      ? await supabase.from('sessions').update(payload).eq('id', editingSession.id)
      : await supabase.from('sessions').insert(payload)

    if (error) {
      toast.error('Failed to save session')
    } else {
      toast.success(editingSession ? 'Session updated' : 'Session added')
      setShowSessionModal(false)
      await loadData()
    }
    setSavingSession(false)
  }

  async function handleSessionDelete(id: string) {
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete session')
    } else {
      toast.success('Session deleted')
      await loadData()
    }
  }

  /* ── Leave request ── */
  async function handleLeaveSubmit() {
    if (!artistProfileId || !leaveForm.start_date || !leaveForm.end_date) return
    setSavingLeave(true)

    const { error } = await supabase.from('leave_requests').insert({
      artist_id: artistProfileId,
      type: leaveForm.type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      notes: leaveForm.notes || null,
    })

    if (error) {
      toast.error('Failed to submit leave request')
    } else {
      toast.success('Leave request submitted')
      setShowLeaveModal(false)
      setLeaveForm({ start_date: '', end_date: '', type: 'holiday', notes: '' })
    }
    setSavingLeave(false)
  }

  /* ── Helpers for rendering ── */
  function sessionsForDate(date: string): Session[] {
    return sessions.filter(s => s.date === date)
  }

  function sessionTypeLabel(t: SessionType | null): string {
    return SESSION_TYPE_OPTIONS.find(o => o.value === t)?.label || 'Session'
  }

  const statusBadgeVariant = (status: ScheduleDayStatus): 'default' | 'brand' | 'info' | 'warning' | 'success' => {
    switch (status) {
      case 'off': return 'default'
      case 'in_booked': return 'brand'
      case 'in_touchups': return 'info'
      case 'in_walkins': return 'warning'
      case 'in_custom': return 'success'
    }
  }

  /* ── Loading states ── */
  if (profileLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!artistProfileId) {
    return (
      <div>
        <PageHeader title="My Schedule" />
        <Card>
          <p className="text-center text-text-secondary py-8">
            No artist profile found. Please contact an admin.
          </p>
        </Card>
      </div>
    )
  }

  /* ── Quick status buttons ── */
  function StatusButtons({ date }: { date: string }) {
    const current = scheduleDays.get(date)?.status
    const statuses: ScheduleDayStatus[] = ['off', 'in_booked', 'in_touchups', 'in_walkins', 'in_custom']
    return (
      <div className="flex flex-wrap gap-1.5">
        {statuses.map(s => {
          const sc = SCHEDULE_DAY_COLOURS[s]
          const isActive = current === s
          return (
            <button
              key={s}
              onClick={() => handleStatusChange(date, s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                isActive
                  ? `${sc.bg} ${sc.text} border-current ring-2 ring-offset-1 ring-current/20`
                  : 'border-border text-text-tertiary hover:border-text-secondary hover:text-text-secondary'
              }`}
            >
              {sc.label}
            </button>
          )
        })}
      </div>
    )
  }

  /* ── Session list component ── */
  function SessionList({ date }: { date: string }) {
    const daySessions = sessionsForDate(date)
    if (daySessions.length === 0) {
      return <p className="text-xs text-text-tertiary mt-2">No sessions</p>
    }
    return (
      <div className="mt-2 space-y-1.5">
        {daySessions.map(s => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-surface-tertiary/50 text-xs cursor-pointer hover:bg-surface-tertiary"
            onClick={() => openEditSession(s)}
          >
            <div className="flex items-center gap-2 min-w-0">
              {s.client_reference && (
                <span className="flex items-center gap-1 text-text-primary font-medium truncate">
                  <User className="w-3 h-3 shrink-0" />
                  {s.client_reference}
                </span>
              )}
              <Badge variant="default" className="text-[10px] shrink-0">
                {sessionTypeLabel(s.session_type)}
              </Badge>
              {(s.start_time || s.end_time) && (
                <span className="flex items-center gap-0.5 text-text-tertiary shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatTime(s.start_time)}
                  {s.end_time ? ` - ${formatTime(s.end_time)}` : ''}
                </span>
              )}
            </div>
            {s.envelope_submitted ? (
              <Mail className="w-3.5 h-3.5 text-status-success shrink-0" />
            ) : (
              <MailOpen className="w-3.5 h-3.5 text-status-warning shrink-0" />
            )}
          </div>
        ))}
      </div>
    )
  }

  /* ═══════════════ VIEWS ═══════════════ */

  /* ── DAY VIEW ── */
  function DayView() {
    const dayData = scheduleDays.get(selectedDate)
    const daySessions = sessionsForDate(selectedDate)

    return (
      <div className="space-y-4">
        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(selectedDate + 'T00:00:00')
            d.setDate(d.getDate() - 1)
            setSelectedDate(toDateString(d))
          }}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">{getFormattedDay(selectedDate)}</p>
            {selectedDate === today && <Badge variant="brand" className="mt-1">Today</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(selectedDate + 'T00:00:00')
            d.setDate(d.getDate() + 1)
            setSelectedDate(toDateString(d))
          }}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Status + quick buttons */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Day Status</h3>
            {dayData && (
              <Badge variant={statusBadgeVariant(dayData.status)} dot>
                {SCHEDULE_DAY_COLOURS[dayData.status].label}
              </Badge>
            )}
          </div>
          <StatusButtons date={selectedDate} />
          {dayData?.notes && (
            <p className="text-xs text-text-secondary mt-2">Notes: {dayData.notes}</p>
          )}
        </Card>

        {/* Sessions */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Sessions ({daySessions.length})
            </h3>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => openAddSession(selectedDate)}>
              Add Session
            </Button>
          </div>

          {daySessions.length === 0 ? (
            <p className="text-sm text-text-tertiary py-4 text-center">No sessions for this day</p>
          ) : (
            <div className="space-y-2">
              {daySessions.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-surface-tertiary/30 cursor-pointer"
                  onClick={() => openEditSession(s)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {s.client_reference && (
                          <span className="text-sm font-medium text-text-primary truncate">
                            {s.client_reference}
                          </span>
                        )}
                        <Badge variant="default">
                          {sessionTypeLabel(s.session_type)}
                        </Badge>
                      </div>
                      {(s.start_time || s.end_time) && (
                        <p className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(s.start_time)}
                          {s.end_time ? ` - ${formatTime(s.end_time)}` : ''}
                        </p>
                      )}
                      {s.notes && (
                        <p className="text-xs text-text-tertiary mt-0.5 truncate">{s.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.envelope_submitted ? (
                      <Badge variant="success" dot>Envelope</Badge>
                    ) : (
                      <Badge variant="warning" dot>No Envelope</Badge>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleSessionDelete(s.id) }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    )
  }

  /* ── WEEK VIEW ── */
  function WeekView() {
    return (
      <div>
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

        {/* Day cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekDates.map(date => {
            const dayData = scheduleDays.get(date)
            const daySessions = sessionsForDate(date)
            const isToday = date === today

            return (
              <Card
                key={date}
                className={`cursor-pointer hover:ring-2 hover:ring-brand-200 transition-all ${
                  isToday ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                <div
                  onClick={() => { setSelectedDate(date); setViewMode('day') }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-semibold ${isToday ? 'text-brand-500' : 'text-text-primary'}`}>
                      {getFormattedDay(date)}
                    </p>
                  </div>

                  {dayData ? (
                    <Badge variant={statusBadgeVariant(dayData.status)} dot className="mb-2">
                      {SCHEDULE_DAY_COLOURS[dayData.status].label}
                    </Badge>
                  ) : (
                    <Badge variant="default" className="mb-2">Not set</Badge>
                  )}

                  <p className="text-xs text-text-secondary">
                    {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                  </p>

                  {dayData?.notes && (
                    <p className="text-xs text-text-tertiary mt-1 truncate">{dayData.notes}</p>
                  )}
                </div>

                {/* Quick status buttons - compact for week view */}
                <div className="mt-2 pt-2 border-t border-border">
                  <StatusButtons date={date} />
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  /* ── MONTH VIEW ── */
  function MonthView() {
    const weeks = getMonthDates(monthYear.year, monthYear.month)
    const monthLabel = new Date(monthYear.year, monthYear.month).toLocaleDateString('en-AU', {
      month: 'long', year: 'numeric',
    })
    const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
      <div>
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(monthYear.year, monthYear.month - 1)
            setMonthYear({ year: d.getFullYear(), month: d.getMonth() })
          }}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <p className="text-lg font-semibold text-text-primary">{monthLabel}</p>
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(monthYear.year, monthYear.month + 1)
            setMonthYear({ year: d.getFullYear(), month: d.getMonth() })
          }}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <Card padding={false}>
          <div className="grid grid-cols-7">
            {dayHeaders.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-text-secondary py-2 border-b border-border">
                {d}
              </div>
            ))}
            {weeks.flat().map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border bg-surface-tertiary/20" />
              }
              const dayData = scheduleDays.get(date)
              const daySessions = sessionsForDate(date)
              const isToday = date === today
              const dayNum = new Date(date + 'T00:00:00').getDate()

              return (
                <div
                  key={date}
                  className={`min-h-[80px] p-2 border-b border-r border-border cursor-pointer hover:bg-surface-tertiary/30 transition-colors ${
                    isToday ? 'bg-brand-50/30' : ''
                  }`}
                  onClick={() => { setSelectedDate(date); setViewMode('day') }}
                >
                  <p className={`text-xs font-medium ${isToday ? 'text-brand-500' : 'text-text-primary'}`}>
                    {dayNum}
                  </p>
                  {dayData && (
                    <div className="mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${SCHEDULE_DAY_COLOURS[dayData.status].bg}`} />
                      <span className={`text-[10px] ml-1 ${SCHEDULE_DAY_COLOURS[dayData.status].text}`}>
                        {SCHEDULE_DAY_COLOURS[dayData.status].label}
                      </span>
                    </div>
                  )}
                  {daySessions.length > 0 && (
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  /* ═══════════════ MAIN RENDER ═══════════════ */
  return (
    <div>
      <PageHeader
        title="My Schedule"
        description="Manage your daily status and sessions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Plane className="w-4 h-4" />} onClick={() => setShowLeaveModal(true)}>
              Request Leave
            </Button>
          </div>
        }
      />

      {/* View mode tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 bg-surface-tertiary rounded-lg w-fit">
        {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {viewMode === 'day' && <DayView />}
          {viewMode === 'week' && <WeekView />}
          {viewMode === 'month' && <MonthView />}
        </>
      )}

      {/* ── Session Modal ── */}
      <Modal
        open={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title={editingSession ? 'Edit Session' : 'Add Session'}
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={sessionForm.date}
            onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={sessionForm.start_time}
              onChange={e => setSessionForm(f => ({ ...f, start_time: e.target.value }))}
            />
            <Input
              label="End Time"
              type="time"
              value={sessionForm.end_time}
              onChange={e => setSessionForm(f => ({ ...f, end_time: e.target.value }))}
            />
          </div>
          <Input
            label="Client Reference"
            value={sessionForm.client_reference}
            onChange={e => setSessionForm(f => ({ ...f, client_reference: e.target.value }))}
            placeholder="Client name or reference"
          />
          <Select
            label="Session Type"
            options={SESSION_TYPE_OPTIONS}
            value={sessionForm.session_type}
            onChange={e => setSessionForm(f => ({ ...f, session_type: e.target.value as SessionType }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="envelope_submitted"
              checked={sessionForm.envelope_submitted}
              onChange={e => setSessionForm(f => ({ ...f, envelope_submitted: e.target.checked }))}
              className="rounded border-border text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="envelope_submitted" className="text-sm text-text-primary">
              Envelope submitted
            </label>
          </div>
          <Input
            label="Notes"
            value={sessionForm.notes}
            onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSessionModal(false)}>Cancel</Button>
            <Button loading={savingSession} onClick={handleSessionSave}>
              {editingSession ? 'Update' : 'Add'} Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Leave Modal ── */}
      <Modal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Request Leave"
      >
        <div className="space-y-4">
          <Input
            label="Start Date"
            type="date"
            value={leaveForm.start_date}
            onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={leaveForm.end_date}
            onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))}
            required
          />
          <Select
            label="Leave Type"
            options={LEAVE_TYPE_OPTIONS}
            value={leaveForm.type}
            onChange={e => setLeaveForm(f => ({ ...f, type: e.target.value as LeaveType }))}
          />
          <Input
            label="Notes (optional)"
            value={leaveForm.notes}
            onChange={e => setLeaveForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Holiday, personal, etc."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
            <Button loading={savingLeave} onClick={handleLeaveSubmit}>Submit Request</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
