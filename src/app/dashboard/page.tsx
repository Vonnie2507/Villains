'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { toDateString, getWeekStart, getFormattedDay } from '@/lib/dates'
import { SCHEDULE_STATUS_COLOURS } from '@/types'
import type { ScheduleEntry, PaymentEnvelope, Profile, ScheduleStatus } from '@/types'
import { Calendar, DollarSign, Users, AlertCircle, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { isArtist } = useAuth()

  return (
    <DashboardLayout activePath="/dashboard">
      {isArtist ? <ArtistDashboard /> : <AdminDashboard />}
    </DashboardLayout>
  )
}

function AdminDashboard() {
  const [todayEntries, setTodayEntries] = useState<(ScheduleEntry & { artist?: Profile })[]>([])
  const [weekSubmissions, setWeekSubmissions] = useState<{ total: number; submitted: number }>({ total: 0, submitted: 0 })
  const [paymentStats, setPaymentStats] = useState({ pending: 0, totalOwed: 0, totalPaid: 0 })
  const [artistCount, setArtistCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = toDateString(new Date())
  const weekStart = getWeekStart()

  const loadDashboard = useCallback(async () => {
    setLoading(true)

    const [todayResult, artistsResult, envelopesResult] = await Promise.all([
      supabase
        .from('schedule_entries')
        .select('*, artist:profiles!schedule_entries_artist_id_fkey(id, full_name, display_name, specialties)')
        .eq('date', today),
      supabase
        .from('profiles')
        .select('id')
        .eq('role', 'artist')
        .eq('is_active', true),
      supabase
        .from('payment_envelopes')
        .select('*')
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    ])

    const entries = (todayResult.data || []) as (ScheduleEntry & { artist?: Profile })[]
    setTodayEntries(entries)

    const totalArtists = (artistsResult.data || []).length
    setArtistCount(totalArtists)

    const { data: weekEntries } = await supabase
      .from('schedule_entries')
      .select('artist_id, submitted_at')
      .eq('week_start', weekStart)
      .not('submitted_at', 'is', null)

    const submittedArtists = new Set((weekEntries || []).map((e: { artist_id: string }) => e.artist_id))
    setWeekSubmissions({ total: totalArtists, submitted: submittedArtists.size })

    const envs = (envelopesResult.data || []) as PaymentEnvelope[]
    setPaymentStats({
      pending: envs.filter(e => !e.verified_at).length,
      totalOwed: envs.reduce((sum, e) => sum + (e.amount_owed || 0), 0),
      totalPaid: envs.reduce((sum, e) => sum + (e.amount_paid || 0), 0),
    })

    setLoading(false)
  }, [today, weekStart])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const inStudioToday = todayEntries.filter(e => e.status !== 'off')
  const withClients = todayEntries.filter(e => e.status === 'client' || e.status === 'touch_up')

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
            <StatCard title="With Clients" value={withClients.length} icon={<Calendar className="w-5 h-5" />} />
            <StatCard
              title="Schedule Compliance"
              value={`${weekSubmissions.submitted} / ${weekSubmissions.total}`}
              icon={weekSubmissions.submitted < weekSubmissions.total ? <AlertCircle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            />
            <StatCard title="Payments (This Month)" value={formatCurrency(paymentStats.totalPaid)} icon={<DollarSign className="w-5 h-5" />} />
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
                  const sc = SCHEDULE_STATUS_COLOURS[entry.status as ScheduleStatus]
                  const name = entry.artist?.display_name || entry.artist?.full_name || 'Unknown'
                  return (
                    <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                          {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-text-primary">{name}</span>
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

          {/* Pending payments alert */}
          {paymentStats.pending > 0 && (
            <Card className="border-status-warning/30 bg-status-warning-50/30">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-status-warning shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {paymentStats.pending} payment{paymentStats.pending !== 1 ? 's' : ''} awaiting verification
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatCurrency(paymentStats.totalOwed - paymentStats.totalPaid)} outstanding
                  </p>
                </div>
                <a href="/payments" className="ml-auto">
                  <Badge variant="warning">View Payments</Badge>
                </a>
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
  const [todayStatus, setTodayStatus] = useState<ScheduleEntry | null>(null)
  const [monthStats, setMonthStats] = useState({ clients: 0, paid: 0, collected: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)

      const [schedResult, envResult] = await Promise.all([
        supabase
          .from('schedule_entries')
          .select('*')
          .eq('artist_id', user.id)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('payment_envelopes')
          .select('*')
          .eq('artist_id', user.id)
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      ])

      setTodayStatus(schedResult.data as ScheduleEntry | null)

      const envs = (envResult.data || []) as PaymentEnvelope[]
      setMonthStats({
        clients: envs.reduce((sum, e) => sum + e.client_count, 0),
        paid: envs.reduce((sum, e) => sum + e.amount_paid, 0),
        collected: envs.reduce((sum, e) => sum + e.total_collected, 0),
      })

      setLoading(false)
    }
    load()
  }, [user, today])

  const displayName = profile?.display_name || profile?.full_name || 'Artist'

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
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${SCHEDULE_STATUS_COLOURS[todayStatus.status].bg} ${SCHEDULE_STATUS_COLOURS[todayStatus.status].text}`}>
                  {SCHEDULE_STATUS_COLOURS[todayStatus.status].label}
                </span>
                {todayStatus.notes && <span className="text-sm text-text-secondary">{todayStatus.notes}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-status-warning">
                <AlertCircle className="w-4 h-4" />
                <span>No schedule submitted for today — <a href="/schedule" className="text-brand-500 hover:underline">submit now</a></span>
              </div>
            )}
          </Card>

          <StatGrid>
            <StatCard title="Clients This Month" value={monthStats.clients} icon={<Users className="w-5 h-5" />} />
            <StatCard title="Total Collected" value={formatCurrency(monthStats.collected)} icon={<DollarSign className="w-5 h-5" />} />
            <StatCard title="Commission Paid" value={formatCurrency(monthStats.paid)} icon={<TrendingUp className="w-5 h-5" />} />
          </StatGrid>
        </>
      )}
    </div>
  )
}
