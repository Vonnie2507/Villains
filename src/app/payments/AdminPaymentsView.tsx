'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentEnvelope, Profile } from '@/types'
import { DollarSign, CheckCircle, Users, AlertCircle } from 'lucide-react'

export function AdminPaymentsView() {
  const { user } = useAuth()
  const toast = useToast()
  const [envelopes, setEnvelopes] = useState<PaymentEnvelope[]>([])
  const [artists, setArtists] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [filterArtist, setFilterArtist] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)

    const [envResult, artistResult] = await Promise.all([
      supabase
        .from('payment_envelopes')
        .select('*, artist:profiles!payment_envelopes_artist_id_fkey(id, full_name, display_name)')
        .order('date', { ascending: false })
        .limit(100),
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'artist')
        .eq('is_active', true)
        .order('full_name'),
    ])

    setEnvelopes((envResult.data as PaymentEnvelope[]) || [])
    setArtists((artistResult.data as Profile[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleVerify(envelopeId: string) {
    if (!user) return
    const { error } = await supabase
      .from('payment_envelopes')
      .update({ verified_by: user.id, verified_at: new Date().toISOString() })
      .eq('id', envelopeId)

    if (error) {
      toast.error('Failed to verify')
    } else {
      toast.success('Payment verified')
      await loadData()
    }
  }

  const filtered = filterArtist
    ? envelopes.filter(e => e.artist_id === filterArtist)
    : envelopes

  // Stats
  const totalOwed = envelopes.reduce((sum, e) => sum + e.amount_owed, 0)
  const totalPaid = envelopes.reduce((sum, e) => sum + e.amount_paid, 0)
  const unverifiedCount = envelopes.filter(e => !e.verified_at).length
  const unsettledCount = envelopes.filter(e => !e.is_settled).length

  const artistOptions = artists.map(a => ({
    value: a.id,
    label: a.display_name || a.full_name,
  }))

  return (
    <div>
      <PageHeader
        title="Payment Tracking"
        description="View and verify artist payment envelopes"
      />

      <StatGrid className="mb-6">
        <StatCard title="Total Owed" value={formatCurrency(totalOwed)} icon={<DollarSign className="w-5 h-5" />} />
        <StatCard title="Total Paid" value={formatCurrency(totalPaid)} icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard title="Unverified" value={unverifiedCount} icon={<AlertCircle className="w-5 h-5" />} />
        <StatCard title="Unsettled" value={unsettledCount} icon={<Users className="w-5 h-5" />} />
      </StatGrid>

      {/* Filter */}
      <div className="mb-4 max-w-xs">
        <Select
          label="Filter by Artist"
          options={artistOptions}
          placeholder="All artists"
          value={filterArtist}
          onChange={e => setFilterArtist(e.target.value)}
        />
      </div>

      <Card padding={false}>
        <CardHeader className="px-4 pt-4">
          <CardTitle>All Envelopes</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-text-secondary py-8">No payment envelopes found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-primary">Artist</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-primary">Date</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-text-primary">Clients</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-text-primary">Collected</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-text-primary">Owed</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-text-primary">Paid</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-text-primary">Status</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-text-primary">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(env => {
                  const artistName = (env as { artist?: Profile }).artist?.display_name
                    || (env as { artist?: Profile }).artist?.full_name
                    || 'Unknown'

                  return (
                    <tr key={env.id} className="border-b border-border last:border-0 hover:bg-surface-tertiary/30">
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{artistName}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{formatDate(env.date)}</td>
                      <td className="text-center px-4 py-3 text-sm text-text-primary">{env.client_count}</td>
                      <td className="text-right px-4 py-3 text-sm text-text-primary">{formatCurrency(env.total_collected)}</td>
                      <td className="text-right px-4 py-3 text-sm text-text-primary">{formatCurrency(env.amount_owed)}</td>
                      <td className="text-right px-4 py-3 text-sm text-text-primary">{formatCurrency(env.amount_paid)}</td>
                      <td className="text-center px-4 py-3">
                        {env.is_settled ? (
                          <Badge variant="success">Settled</Badge>
                        ) : env.verified_at ? (
                          <Badge variant="info">Verified</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td className="text-center px-4 py-3">
                        {!env.verified_at && (
                          <Button size="sm" variant="outline" onClick={() => handleVerify(env.id)}>
                            Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
