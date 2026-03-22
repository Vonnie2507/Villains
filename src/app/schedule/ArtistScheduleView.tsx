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
import { ChevronLeft, ChevronRight, Plus, Plane, Clock, User, Mail, MailOpen } from 'lucide-react'

export function ArtistScheduleView() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [artistProfileId, setArtistProfileId] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [scheduleDays, setScheduleDays] = useState<Map<string, ScheduleDay>>(new Map())
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  // Session form
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [sessionForm, setSessionForm] = useState({
    date: '', start_time: '', end_time: '', client_reference: '',
    session_type: 'new_piece' as SessionType, envelope_submitted: false, notes: '',
  })
  const [savingSession, setSavingSession] = useState(false)

  // Leave form
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', type: 'holiday' as LeaveType, notes: '' })
  const [savingLeave, setSavingLeave] = useState(false)

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const today = useMemo(() => toDateString(new Date()), [])

  // Fetch artist profile
  useEffect(() => {
    async function fetchArtistProfile() {
      if (!user) return
      setProfileLoading(true)
      const { data } = await supabase.from('artist_profiles').select('id').eq('user_id', user.id).single()
      setArtistProfileId(data?.id ?? null)
      setProfileLoading(false)
    }
    fetchArtistProfile()
  }, [user])

  // Load schedule data
  useEffect(() => {
    if (!artistProfileId) return

    async function load() {
      setLoading(true)
      const startDate = weekDates[0]
      const endDate = weekDates[6]

      const [daysRes, sessRes] = await Promise.all([
        supabase.from('schedule_days').select('*').eq('artist_id', artistProfileId).gte('date', startDate).lte('date', endDate).order('date'),
        supabase.from('sessions').select('*').eq('artist_id', artistProfileId).gte('date', startDate).lte('date', endDate).order('start_time'),
      ])

      const dayMap = new Map<string, ScheduleDay>()
      for (const d of (daysRes.data || []) as ScheduleDay[]) dayMap.set(d.date, d)
      setScheduleDays(dayMap)
      setSessions((sessRes.data || []) as Session[])
      setLoading(false)
    }

    load()
  }, [artistProfileId, weekDates])

  // Status change
  async function handleStatusChange(date: string, status: ScheduleDayStatus) {
    if (!artistProfileId) return
    const existing = scheduleDays.get(date)

    const { error } = existing
      ? await supabase.from('schedule_days').update({ status }).eq('id', existing.id)
      : await supabase.from('schedule_days').insert({ artist_id: artistProfileId, date, status, number_of_clients: 0 })

    if (error) { toast.error('Failed to update status'); return }
    toast.success(`${getDayName(date)} set to ${SCHEDULE_DAY_COLOURS[status].label}`)

    // Refresh
    const startDate = weekDates[0]
    const endDate = weekDates[6]
    const { data } = await supabase.from('schedule_days').select('*').eq('artist_id', artistProfileId).gte('date', startDate).lte('date', endDate)
    const dayMap = new Map<string, ScheduleDay>()
    for (const d of (data || []) as ScheduleDay[]) dayMap.set(d.date, d)
    setScheduleDays(dayMap)
  }

  // Session CRUD
  function openAddSession(date: string) {
    setEditingSession(null)
    setSessionForm({ date, start_time: '', end_time: '', client_reference: '', session_type: 'new_piece', envelope_submitted: false, notes: '' })
    setShowSessionModal(true)
  }

  async function handleSessionSave() {
    if (!artistProfileId) return
    setSavingSession(true)

    const payload = {
      artist_id: artistProfileId, date: sessionForm.date,
      start_time: sessionForm.start_time || null, end_time: sessionForm.end_time || null,
      client_reference: sessionForm.client_reference || null, session_type: sessionForm.session_type,
      envelope_submitted: sessionForm.envelope_submitted, notes: sessionForm.notes || null,
    }

    const { error } = editingSession
      ? await supabase.from('sessions').update(payload).eq('id', editingSession.id)
      : await supabase.from('sessions').insert(payload)

    if (error) { toast.error('Failed to save session') } else {
      toast.success(editingSession ? 'Session updated' : 'Session added')
      setShowSessionModal(false)
      // Refresh sessions
      const { data } = await supabase.from('sessions').select('*').eq('artist_id', artistProfileId).gte('date', weekDates[0]).lte('date', weekDates[6]).order('start_time')
      setSessions((data || []) as Session[])
    }
    setSavingSession(false)
  }

  async function handleSessionDelete(id: string) {
    await supabase.from('sessions').delete().eq('id', id)
    toast.success('Session deleted')
    if (!artistProfileId) return
    const { data } = await supabase.from('sessions').select('*').eq('artist_id', artistProfileId).gte('date', weekDates[0]).lte('date', weekDates[6]).order('start_time')
    setSessions((data || []) as Session[])
  }

  // Leave
  async function handleLeaveSubmit() {
    if (!artistProfileId || !leaveForm.start_date || !leaveForm.end_date) return
    setSavingLeave(true)
    const { error } = await supabase.from('leave_requests').insert({ artist_id: artistProfileId, type: leaveForm.type, start_date: leaveForm.start_date, end_date: leaveForm.end_date, notes: leaveForm.notes || null })
    if (error) { toast.error('Failed to submit leave') } else { toast.success('Leave request submitted'); setShowLeaveModal(false) }
    setSavingLeave(false)
  }

  function sessionsForDate(date: string) { return sessions.filter(s => s.date === date) }

  if (profileLoading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!artistProfileId) {
    return <div><PageHeader title="My Schedule" /><Card><p className="text-center text-text-secondary py-8">No artist profile found. Please contact an admin.</p></Card></div>
  }

  return (
    <div>
      <PageHeader title="My Schedule" description="Set your status and add sessions for each day"
        actions={<Button variant="outline" icon={<Plane className="w-4 h-4" />} onClick={() => setShowLeaveModal(true)}>Request Leave</Button>}
      />

      {/* Week nav */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}><ChevronLeft className="w-4 h-4" /> Previous</Button>
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary">{formatWeekRange(weekStart)}</p>
          {isCurrentWeek(weekStart) && <Badge variant="brand" className="mt-1">Current Week</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>Next <ChevronRight className="w-4 h-4" /></Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {weekDates.map(date => {
            const dayData = scheduleDays.get(date)
            const daySessions = sessionsForDate(date)
            const isToday = date === today

            return (
              <Card key={date} className={isToday ? 'ring-1 ring-brand-500' : ''}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-semibold ${isToday ? 'text-brand-500' : 'text-text-primary'}`}>
                      {getFormattedDay(date)}
                    </p>
                    {dayData && (
                      <Badge variant={dayData.status === 'off' ? 'default' : dayData.status === 'in_booked' ? 'brand' : 'info'} dot>
                        {SCHEDULE_DAY_COLOURS[dayData.status].label}
                      </Badge>
                    )}
                    <span className="text-xs text-text-tertiary">{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => openAddSession(date)}>
                    Add
                  </Button>
                </div>

                {/* Quick status buttons */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(['off', 'in_booked', 'in_touchups', 'in_walkins', 'in_custom'] as ScheduleDayStatus[]).map(s => {
                    const sc = SCHEDULE_DAY_COLOURS[s]
                    const isActive = dayData?.status === s
                    return (
                      <button key={s} onClick={() => handleStatusChange(date, s)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          isActive ? `${sc.bg} ${sc.text} border-current` : 'border-border text-text-tertiary hover:text-text-secondary'
                        }`}
                      >{sc.label}</button>
                    )
                  })}
                </div>

                {/* Sessions */}
                {daySessions.length > 0 && (
                  <div className="space-y-1.5">
                    {daySessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-tertiary text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {s.client_reference && <span className="flex items-center gap-1 font-medium text-text-primary"><User className="w-3 h-3" />{s.client_reference}</span>}
                          <span className="text-text-tertiary">{SESSION_TYPE_OPTIONS.find(o => o.value === s.session_type)?.label}</span>
                          {s.start_time && <span className="flex items-center gap-0.5 text-text-tertiary"><Clock className="w-3 h-3" />{s.start_time.slice(0,5)}{s.end_time ? ` - ${s.end_time.slice(0,5)}` : ''}</span>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.envelope_submitted ? <Mail className="w-3.5 h-3.5 text-status-success" /> : <MailOpen className="w-3.5 h-3.5 text-status-warning" />}
                          <button onClick={() => handleSessionDelete(s.id)} className="text-status-error text-[10px] hover:underline">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Session Modal */}
      <Modal open={showSessionModal} onClose={() => setShowSessionModal(false)} title={editingSession ? 'Edit Session' : 'Add Session'}>
        <div className="space-y-4">
          <Input label="Date" type="date" value={sessionForm.date} onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={sessionForm.start_time} onChange={e => setSessionForm(f => ({ ...f, start_time: e.target.value }))} />
            <Input label="End Time" type="time" value={sessionForm.end_time} onChange={e => setSessionForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>
          <Input label="Client Reference" value={sessionForm.client_reference} onChange={e => setSessionForm(f => ({ ...f, client_reference: e.target.value }))} placeholder="Name or reference" />
          <Select label="Session Type" options={SESSION_TYPE_OPTIONS} value={sessionForm.session_type} onChange={e => setSessionForm(f => ({ ...f, session_type: e.target.value as SessionType }))} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="envelope" checked={sessionForm.envelope_submitted} onChange={e => setSessionForm(f => ({ ...f, envelope_submitted: e.target.checked }))} className="rounded" />
            <label htmlFor="envelope" className="text-sm text-text-primary">Envelope submitted</label>
          </div>
          <Input label="Notes" value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSessionModal(false)}>Cancel</Button>
            <Button loading={savingSession} onClick={handleSessionSave}>{editingSession ? 'Update' : 'Add'} Session</Button>
          </div>
        </div>
      </Modal>

      {/* Leave Modal */}
      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Request Leave">
        <div className="space-y-4">
          <Input label="Start Date" type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} />
          <Input label="End Date" type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} />
          <Select label="Type" options={LEAVE_TYPE_OPTIONS} value={leaveForm.type} onChange={e => setLeaveForm(f => ({ ...f, type: e.target.value as LeaveType }))} />
          <Input label="Notes" value={leaveForm.notes} onChange={e => setLeaveForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
            <Button loading={savingLeave} onClick={handleLeaveSubmit}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
