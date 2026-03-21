'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentEnvelope } from '@/types'
import { DollarSign, Plus, Receipt } from 'lucide-react'

export function ArtistPaymentsView() {
  const { user } = useAuth()
  const toast = useToast()
  const [envelopes, setEnvelopes] = useState<PaymentEnvelope[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [commissionPct, setCommissionPct] = useState<number>(30)

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formClientCount, setFormClientCount] = useState('1')
  const [formTotal, setFormTotal] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadEnvelopes = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('payment_envelopes')
      .select('*')
      .eq('artist_id', user.id)
      .order('date', { ascending: false })
      .limit(50)

    setEnvelopes((data as PaymentEnvelope[]) || [])
    setLoading(false)
  }, [user])

  // Load commission rate from artist_details
  useEffect(() => {
    async function loadRate() {
      if (!user) return
      const { data } = await supabase
        .from('artist_details')
        .select('commission_pct')
        .eq('profile_id', user.id)
        .single()
      if (data) setCommissionPct(data.commission_pct)
    }
    loadRate()
  }, [user])

  useEffect(() => {
    loadEnvelopes()
  }, [loadEnvelopes])

  const totalCollected = parseFloat(formTotal) || 0
  const amountOwed = totalCollected * (commissionPct / 100)

  async function handleSubmit() {
    if (!user || !formTotal) return
    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('payment_envelopes')
        .insert({
          artist_id: user.id,
          date: formDate,
          client_count: parseInt(formClientCount) || 1,
          total_collected: totalCollected,
          commission_pct: commissionPct,
          amount_paid: amountOwed,
          artist_notes: formNotes || null,
        })

      if (error) throw error

      toast.success('Payment envelope submitted')
      setShowModal(false)
      setFormTotal('')
      setFormNotes('')
      setFormClientCount('1')
      await loadEnvelopes()
    } catch {
      toast.error('Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats
  const thisMonth = envelopes.filter(e => {
    const d = new Date(e.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalPaidThisMonth = thisMonth.reduce((sum, e) => sum + e.amount_paid, 0)
  const totalClientsThisMonth = thisMonth.reduce((sum, e) => sum + e.client_count, 0)
  const unsettledCount = envelopes.filter(e => !e.is_settled).length

  return (
    <div>
      <PageHeader
        title="My Payments"
        description={`Commission rate: ${commissionPct}%`}
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            Submit Envelope
          </Button>
        }
      />

      <StatGrid className="mb-6">
        <StatCard title="Paid This Month" value={formatCurrency(totalPaidThisMonth)} icon={<DollarSign className="w-5 h-5" />} />
        <StatCard title="Clients This Month" value={totalClientsThisMonth} icon={<Receipt className="w-5 h-5" />} />
        <StatCard title="Unsettled" value={unsettledCount} />
      </StatGrid>

      {/* Envelope history */}
      <Card padding={false}>
        <CardHeader className="px-4 pt-4">
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : envelopes.length === 0 ? (
          <p className="text-center text-text-secondary py-8">No payments submitted yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-text-primary">Date</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-text-primary">Clients</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-text-primary">Collected</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-text-primary">Owed ({commissionPct}%)</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-text-primary">Paid</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-text-primary">Status</th>
                </tr>
              </thead>
              <tbody>
                {envelopes.map(env => (
                  <tr key={env.id} className="border-b border-border last:border-0 hover:bg-surface-tertiary/30">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Submit envelope modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Submit Payment Envelope">
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={formDate}
            onChange={e => setFormDate(e.target.value)}
          />
          <Input
            label="Number of Clients"
            type="number"
            min="1"
            value={formClientCount}
            onChange={e => setFormClientCount(e.target.value)}
          />
          <Input
            label="Total Cash Collected"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            icon={<DollarSign className="w-4 h-4" />}
            value={formTotal}
            onChange={e => setFormTotal(e.target.value)}
          />

          {/* Auto-calculated commission */}
          {totalCollected > 0 && (
            <div className="bg-surface-tertiary rounded-lg px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Commission ({commissionPct}%)</span>
                <span className="font-semibold text-brand-500">{formatCurrency(amountOwed)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">You keep</span>
                <span className="font-semibold text-status-success">{formatCurrency(totalCollected - amountOwed)}</span>
              </div>
            </div>
          )}

          <Input
            label="Notes (optional)"
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            placeholder="e.g. 2 full day sessions"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleSubmit} disabled={!formTotal}>
              Submit Envelope
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
