'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useToast, ToastProvider } from '@/contexts/ToastContext'
import { getWeekStart, getWeekDates, formatWeekRange, shiftWeek, isCurrentWeek } from '@/lib/dates'
import { SCHEDULE_DAY_COLOURS, SCHEDULE_DAY_STATUS_OPTIONS } from '@/types'
import type { ArtistProfile, ScheduleDay, ScheduleDayStatus, Session, WeeklySubmission } from '@/types'
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Mail,
  ClipboardCheck, AlertCircle, Trash2, LogOut
} from 'lucide-react'

export default function PortalEntry() {
  const { slug } = useParams<{ slug: string }>()
  const [artist, setArtist] = useState<ArtistProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Check if already authenticated via sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`portal-${slug}`)
    if (stored) setAuthenticated(true)
  }, [slug])

  // Load artist by slug
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('portal_slug', slug)
        .single()

      if (data) {
        setArtist(data as ArtistProfile)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  function handlePinChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError('')

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (value && index === 3) {
      const fullPin = newPin.join('')
      if (fullPin.length === 4) {
        checkPin(fullPin)
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function checkPin(fullPin: string) {
    if (!artist) return
    if (artist.portal_pin === fullPin) {
      sessionStorage.setItem(`portal-${slug}`, 'true')
      setAuthenticated(true)
    } else {
      setError('Wrong PIN')
      setPin(['', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-tertiary flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-text-primary">V</span>
          </div>
          <p className="text-text-secondary text-sm">Portal not found</p>
        </div>
      </div>
    )
  }

  if (authenticated) {
    return (
      <ToastProvider>
        <ArtistPortalInner artist={artist} slug={slug} />
      </ToastProvider>
    )
  }

  const displayName = artist.display_name || 'Artist'

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-500 text-text-inverse flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-bold font-display">V</span>
        </div>

        <h1 className="text-xl font-bold text-text-primary font-display mb-1">
          Hey, {displayName}
        </h1>
        <p className="text-sm text-text-secondary mb-8">Enter your PIN to continue</p>

        <div className="flex justify-center gap-3 mb-4">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handlePinChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className="w-14 h-16 text-center text-2xl font-bold rounded-2xl border-2 border-border bg-surface text-text-primary focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-status-error font-semibold mb-4">{error}</p>
        )}

        <p className="text-xs text-text-tertiary mt-6">Villains Tattoo Studio</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   ARTIST PORTAL — standalone schedule view
   ══════════════════════════════════════════════════════════ */

function ArtistPortalInner({ artist, slug }: { artist: ArtistProfile; slug: string }) {
  const { toast } = useToast()
  const artistId = artist.id
  const displayName = artist.display_name || 'Artist'

  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [days, setDays] = useState<ScheduleDay[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [submission, setSubmission] = useState<WeeklySubmission | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [addingClientFor, setAddingClientFor] = useState<string | null>(null)
  const [newClientName, setNewClientName] = useState('')
  const [saving, setSaving] = useState(false)
  const [submittingWeek, setSubmittingWeek] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const todayStr = new Date().toISOString().split('T')[0]
  const weekEnd = weekDates[6]

  const now = new Date()
  const dayName = now.toLocaleDateString('en-AU', { weekday: 'long' })
  const dayNum = now.getDate()
  const monthName = now.toLocaleDateString('en-AU', { month: 'long' })

  const loadWeek = useCallback(async () => {
    setLoaded(false)
    const [dRes, sRes, subRes] = await Promise.all([
      supabase.from('schedule_days').select('*').eq('artist_id', artistId).gte('date', weekDates[0]).lte('date', weekEnd),
      supabase.from('sessions').select('*').eq('artist_id', artistId).gte('date', weekDates[0]).lte('date', weekEnd).order('created_at'),
      supabase.from('weekly_submissions').select('*').eq('artist_id', artistId).eq('week_start_date', weekStart).maybeSingle(),
    ])
    setDays((dRes.data || []) as ScheduleDay[])
    setSessions((sRes.data || []) as Session[])
    setSubmission((subRes.data as WeeklySubmission) ?? null)
    setLoaded(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId, weekStart])

  useEffect(() => { loadWeek() }, [loadWeek])

  async function setDayStatus(date: string, status: ScheduleDayStatus) {
    setSaving(true)
    const existing = days.find(d => d.date === date)
    try {
      if (existing) {
        const { error } = await supabase.from('schedule_days').update({ status }).eq('id', existing.id)
        if (error) throw error
        setDays(prev => prev.map(d => d.id === existing.id ? { ...d, status } : d))
      } else {
        const { data, error } = await supabase.from('schedule_days')
          .insert({ artist_id: artistId, date, status, number_of_clients: 0 })
          .select().single()
        if (error) throw error
        setDays(prev => [...prev, data as ScheduleDay])
      }
    } catch { toast.error('Failed to update') }
    finally { setSaving(false) }
  }

  async function addClient(date: string) {
    if (!newClientName.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('sessions')
        .insert({ artist_id: artistId, date, client_reference: newClientName.trim(), session_type: 'new_piece', envelope_submitted: false })
        .select().single()
      if (error) throw error
      setSessions(prev => [...prev, data as Session])
      setNewClientName('')
      setAddingClientFor(null)
      const count = sessions.filter(s => s.date === date).length + 1
      const dayEntry = days.find(d => d.date === date)
      if (dayEntry) {
        await supabase.from('schedule_days').update({ number_of_clients: count }).eq('id', dayEntry.id)
        setDays(prev => prev.map(d => d.id === dayEntry.id ? { ...d, number_of_clients: count } : d))
      }
    } catch { toast.error('Failed to add client') }
    finally { setSaving(false) }
  }

  async function removeSession(sessionId: string, date: string) {
    setSaving(true)
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      const remaining = sessions.filter(s => s.date === date && s.id !== sessionId).length
      const dayEntry = days.find(d => d.date === date)
      if (dayEntry) {
        await supabase.from('schedule_days').update({ number_of_clients: remaining }).eq('id', dayEntry.id)
        setDays(prev => prev.map(d => d.id === dayEntry.id ? { ...d, number_of_clients: remaining } : d))
      }
    } catch { toast.error('Failed to remove') }
    finally { setSaving(false) }
  }

  async function toggleEnvelope(session: Session) {
    const newVal = !session.envelope_submitted
    try {
      const { error } = await supabase.from('sessions').update({ envelope_submitted: newVal }).eq('id', session.id)
      if (error) throw error
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, envelope_submitted: newVal } : s))
    } catch { toast.error('Failed to update') }
  }

  async function submitWeek() {
    setSubmittingWeek(true)
    const payload = {
      artist_id: artistId,
      week_start_date: weekStart,
      week_end_date: weekEnd,
      submitted_at: new Date().toISOString(),
      total_sessions_count: sessions.length,
      confirmation_envelopes_submitted: sessions.every(s => s.envelope_submitted),
      notes: null,
    }
    try {
      if (submission?.id) {
        const { error } = await supabase.from('weekly_submissions').update(payload).eq('id', submission.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('weekly_submissions').insert(payload)
        if (error) throw error
      }
      toast.success('Week submitted!')
      await loadWeek()
    } catch { toast.error('Failed to submit') }
    finally { setSubmittingWeek(false) }
  }

  function handleLogout() {
    sessionStorage.removeItem(`portal-${slug}`)
    window.location.reload()
  }

  const isSubmitted = !!submission?.submitted_at
  const hasUnsubmittedDays = days.length > 0 && !isSubmitted

  return (
    <div className="min-h-screen bg-surface-secondary">
      <header className="sticky top-0 z-20 px-4 py-3 border-b border-border" style={{ background: 'var(--topbar-bg)', paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-text-inverse flex items-center justify-center text-xs font-bold">V</div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{displayName}</p>
              <p className="text-[10px] text-text-tertiary">{dayName} · {dayNum} {monthName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg text-text-tertiary hover:text-text-primary transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-w-lg mx-auto">
        {hasUnsubmittedDays && isCurrentWeek(weekStart) && (
          <div className="mb-4 p-3 rounded-xl bg-status-warning-50 border border-status-warning/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-status-warning shrink-0" />
              <p className="text-xs font-semibold text-status-warning-700">Week not submitted yet</p>
            </div>
            <Button size="sm" onClick={submitWeek} loading={submittingWeek}>Submit</Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-text-primary">{formatWeekRange(weekStart)}</p>
            {isSubmitted && <Badge variant="success" dot className="mt-1">Submitted</Badge>}
            {!isSubmitted && days.length > 0 && <Badge variant="warning" dot className="mt-1">Draft</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {!isCurrentWeek(weekStart) && (
          <div className="mb-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(getWeekStart())}>Back to this week</Button>
          </div>
        )}

        {!loaded ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {weekDates.map(date => {
                const dayEntry = days.find(d => d.date === date)
                const daySessions = sessions.filter(s => s.date === date)
                const isToday = date === todayStr
                const isExpanded = expandedDay === date
                const sc = dayEntry ? SCHEDULE_DAY_COLOURS[dayEntry.status] : null

                return (
                  <Card key={date} className={isToday ? 'ring-2 ring-brand-500/30' : ''}>
                    <button className="w-full flex items-center justify-between text-left" onClick={() => setExpandedDay(isExpanded ? null : date)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-brand-500 text-text-inverse' : 'bg-surface-tertiary text-text-primary'}`}>
                          <span className="text-[9px] font-bold uppercase leading-none">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
                          </span>
                          <span className="text-sm font-bold leading-tight">{new Date(date + 'T00:00:00').getDate()}</span>
                        </div>
                        <div>
                          {sc ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                          ) : (
                            <span className="text-sm text-text-tertiary">Tap to set status</span>
                          )}
                          {daySessions.length > 0 && (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              {daySessions.length} client{daySessions.length !== 1 ? 's' : ''}
                              {daySessions.some(s => !s.envelope_submitted) && (
                                <span className="text-status-warning ml-1">
                                  · {daySessions.filter(s => !s.envelope_submitted).length} envelope{daySessions.filter(s => !s.envelope_submitted).length !== 1 ? 's' : ''} pending
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-text-tertiary transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 border-t border-border pt-4">
                        <div>
                          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">What are you doing?</p>
                          <div className="flex flex-wrap gap-2">
                            {SCHEDULE_DAY_STATUS_OPTIONS.map(opt => {
                              const isActive = dayEntry?.status === opt.value
                              const colours = SCHEDULE_DAY_COLOURS[opt.value as ScheduleDayStatus]
                              return (
                                <button
                                  key={opt.value}
                                  disabled={saving}
                                  onClick={() => setDayStatus(date, opt.value as ScheduleDayStatus)}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                                    isActive ? `${colours.bg} ${colours.text} ring-2 ring-brand-500/30` : 'bg-surface-tertiary text-text-secondary active:scale-95'
                                  } disabled:opacity-50`}
                                >
                                  {opt.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">Clients</p>
                            <button
                              onClick={() => { setAddingClientFor(addingClientFor === date ? null : date); setNewClientName('') }}
                              className="flex items-center gap-1 text-xs font-semibold text-brand-500 min-h-[44px] px-2"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Client
                            </button>
                          </div>

                          {daySessions.length === 0 && addingClientFor !== date && (
                            <p className="text-xs text-text-tertiary text-center py-3">No clients yet</p>
                          )}

                          {daySessions.map(session => (
                            <div key={session.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                              <button
                                onClick={() => toggleEnvelope(session)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                  session.envelope_submitted ? 'bg-status-success-50 text-status-success' : 'bg-surface-tertiary text-text-tertiary'
                                }`}
                              >
                                {session.envelope_submitted ? <Check className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">{session.client_reference || 'Client'}</p>
                                <p className="text-[10px] text-text-tertiary">
                                  {session.envelope_submitted ? <span className="text-status-success font-semibold">Envelope submitted</span> : 'Envelope pending'}
                                </p>
                              </div>
                              <button onClick={() => removeSession(session.id, date)} className="p-2 text-text-tertiary hover:text-status-error min-h-[44px] min-w-[44px] flex items-center justify-center">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}

                          {addingClientFor === date && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1">
                                <Input placeholder="Client name" value={newClientName} onChange={e => setNewClientName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addClient(date) }} autoFocus />
                              </div>
                              <Button size="sm" disabled={!newClientName.trim() || saving} onClick={() => addClient(date)} icon={<Check className="w-4 h-4" />}>Add</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setAddingClientFor(null); setNewClientName('') }} icon={<X className="w-4 h-4" />} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            <Card className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-5 h-5 text-text-tertiary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Submit My Week</p>
                    <p className="text-xs text-text-tertiary">
                      {sessions.length} client{sessions.length !== 1 ? 's' : ''}
                      {sessions.length > 0 && <> · {sessions.filter(s => s.envelope_submitted).length}/{sessions.length} envelopes</>}
                    </p>
                  </div>
                </div>
                {isSubmitted ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="success" dot>Submitted</Badge>
                    <Button size="sm" variant="outline" onClick={submitWeek} loading={submittingWeek}>Resubmit</Button>
                  </div>
                ) : (
                  <Button onClick={submitWeek} loading={submittingWeek} icon={<ClipboardCheck className="w-4 h-4" />}>Submit</Button>
                )}
              </div>
              {isSubmitted && submission?.submitted_at && (
                <p className="text-[10px] text-text-tertiary mt-2">
                  Submitted {new Date(submission.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
