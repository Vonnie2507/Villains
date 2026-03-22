'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import type {
  Transaction, TransactionCategory, TransactionStatus, PaymentMethod,
  TillBalance, StaffPurchase, Profile,
} from '@/types'
import {
  TRANSACTION_CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS,
} from '@/types'
import {
  DollarSign, Wallet, CreditCard, ShoppingBag, Plus, Check, X,
  ArrowUpDown, Beer, Calculator,
} from 'lucide-react'

/* ── Helpers ── */

type Tab = 'transactions' | 'till' | 'purchases'

const STATUS_BADGE_MAP: Record<TransactionStatus, 'warning' | 'success' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  reimbursed: 'info',
}

const TRANSACTION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'reimbursed', label: 'Reimbursed' },
]

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function FinancePage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<Tab>('transactions')

  /* ── Transactions state ── */
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [txModalOpen, setTxModalOpen] = useState(false)
  const [txSaving, setTxSaving] = useState(false)
  const [txFilterCategory, setTxFilterCategory] = useState('')
  const [txFilterStatus, setTxFilterStatus] = useState('')
  const [txFilterFrom, setTxFilterFrom] = useState('')
  const [txFilterTo, setTxFilterTo] = useState('')
  const [txSort, setTxSort] = useState<{ col: string; asc: boolean }>({ col: 'date', asc: false })

  /* ── Till state ── */
  const [tillBalances, setTillBalances] = useState<TillBalance[]>([])
  const [tillLoading, setTillLoading] = useState(true)
  const [tillModalOpen, setTillModalOpen] = useState(false)
  const [tillSaving, setTillSaving] = useState(false)

  /* ── Staff purchases state ── */
  const [purchases, setPurchases] = useState<StaffPurchase[]>([])
  const [purchaseLoading, setPurchaseLoading] = useState(true)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [purchaseSaving, setPurchaseSaving] = useState(false)

  /* ── Profiles for dropdowns ── */
  const [profiles, setProfiles] = useState<Profile[]>([])

  /* ══════════════════════════════════════════════════════
     DATA FETCHING
     ══════════════════════════════════════════════════════ */

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name')
    if (data) setProfiles(data as Profile[])
  }, [])

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, uploaded_by_profile:profiles!transactions_uploaded_by_fkey(*)')
      .order('date', { ascending: false })
    if (error) {
      toast.error('Failed to load transactions')
    } else {
      setTransactions((data ?? []) as Transaction[])
    }
    setTxLoading(false)
  }, [toast])

  const fetchTillBalances = useCallback(async () => {
    setTillLoading(true)
    const { data, error } = await supabase
      .from('till_balances')
      .select('*, staff:profiles!till_balances_staff_id_fkey(*)')
      .order('date', { ascending: false })
    if (error) {
      toast.error('Failed to load till balances')
    } else {
      setTillBalances((data ?? []) as TillBalance[])
    }
    setTillLoading(false)
  }, [toast])

  const fetchPurchases = useCallback(async () => {
    setPurchaseLoading(true)
    const { data, error } = await supabase
      .from('staff_purchases')
      .select('*, staff:profiles!staff_purchases_staff_id_fkey(*)')
      .order('date', { ascending: false })
    if (error) {
      toast.error('Failed to load staff purchases')
    } else {
      setPurchases((data ?? []) as StaffPurchase[])
    }
    setPurchaseLoading(false)
  }, [toast])

  useEffect(() => {
    fetchProfiles()
    fetchTransactions()
    fetchTillBalances()
    fetchPurchases()
  }, [fetchProfiles, fetchTransactions, fetchTillBalances, fetchPurchases])

  /* ══════════════════════════════════════════════════════
     TRANSACTION FORM
     ══════════════════════════════════════════════════════ */

  const [txForm, setTxForm] = useState({
    date: todayStr(),
    category: '' as string,
    description: '',
    amount: '',
    payment_method: '' as string,
    status: 'pending' as string,
  })

  const resetTxForm = () => setTxForm({
    date: todayStr(), category: '', description: '', amount: '', payment_method: '', status: 'pending',
  })

  const handleAddTransaction = async () => {
    if (!txForm.amount || !txForm.description) {
      toast.error('Amount and description are required')
      return
    }
    setTxSaving(true)
    const { error } = await supabase.from('transactions').insert({
      date: txForm.date,
      category: txForm.category || null,
      description: txForm.description,
      amount: parseFloat(txForm.amount),
      payment_method: txForm.payment_method || null,
      status: txForm.status,
      uploaded_by: user?.id ?? null,
    })
    if (error) {
      toast.error('Failed to add transaction')
    } else {
      toast.success('Transaction added')
      setTxModalOpen(false)
      resetTxForm()
      fetchTransactions()
    }
    setTxSaving(false)
  }

  /* ── Filtered + sorted transactions ── */
  const filteredTransactions = useMemo(() => {
    let list = [...transactions]
    if (txFilterCategory) list = list.filter(t => t.category === txFilterCategory)
    if (txFilterStatus) list = list.filter(t => t.status === txFilterStatus)
    if (txFilterFrom) list = list.filter(t => t.date >= txFilterFrom)
    if (txFilterTo) list = list.filter(t => t.date <= txFilterTo)

    list.sort((a, b) => {
      let cmp = 0
      if (txSort.col === 'date') cmp = a.date.localeCompare(b.date)
      else if (txSort.col === 'amount') cmp = a.amount - b.amount
      else if (txSort.col === 'category') cmp = (a.category ?? '').localeCompare(b.category ?? '')
      else if (txSort.col === 'status') cmp = a.status.localeCompare(b.status)
      return txSort.asc ? cmp : -cmp
    })
    return list
  }, [transactions, txFilterCategory, txFilterStatus, txFilterFrom, txFilterTo, txSort])

  /* ── Transaction stats ── */
  const monthStart = startOfMonth()
  const thisMonthTx = transactions.filter(t => t.date >= monthStart)
  const totalSpendMonth = thisMonthTx.reduce((s, t) => s + t.amount, 0)

  const spendByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    thisMonthTx.forEach(t => {
      const cat = t.category ?? 'other'
      map[cat] = (map[cat] ?? 0) + t.amount
    })
    return map
  }, [thisMonthTx])

  const topCategory = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1])[0]

  const toggleTxSort = (col: string) => {
    setTxSort(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: true })
  }

  /* ══════════════════════════════════════════════════════
     TILL BALANCE FORM
     ══════════════════════════════════════════════════════ */

  const [tillForm, setTillForm] = useState({
    date: todayStr(),
    start_float: '',
    end_count: '',
    notes: '',
    staff_id: '',
  })

  const resetTillForm = () => setTillForm({
    date: todayStr(), start_float: '', end_count: '', notes: '', staff_id: '',
  })

  const tillVariance = useMemo(() => {
    const sf = parseFloat(tillForm.start_float)
    const ec = parseFloat(tillForm.end_count)
    if (isNaN(sf) || isNaN(ec)) return null
    return ec - sf
  }, [tillForm.start_float, tillForm.end_count])

  const handleAddTill = async () => {
    if (!tillForm.start_float || !tillForm.end_count) {
      toast.error('Start float and end count are required')
      return
    }
    setTillSaving(true)
    const sf = parseFloat(tillForm.start_float)
    const ec = parseFloat(tillForm.end_count)
    const { error } = await supabase.from('till_balances').insert({
      date: tillForm.date,
      start_float: sf,
      end_count: ec,
      variance: ec - sf,
      notes: tillForm.notes || null,
      staff_id: tillForm.staff_id || null,
    })
    if (error) {
      toast.error('Failed to add till close-out')
    } else {
      toast.success('Till close-out recorded')
      setTillModalOpen(false)
      resetTillForm()
      fetchTillBalances()
    }
    setTillSaving(false)
  }

  /* ══════════════════════════════════════════════════════
     STAFF PURCHASE FORM
     ══════════════════════════════════════════════════════ */

  const [purchaseForm, setPurchaseForm] = useState({
    staff_id: '',
    item: '',
    quantity: '1',
    price: '',
    date: todayStr(),
  })

  const resetPurchaseForm = () => setPurchaseForm({
    staff_id: '', item: '', quantity: '1', price: '', date: todayStr(),
  })

  const handleAddPurchase = async () => {
    if (!purchaseForm.staff_id || !purchaseForm.item) {
      toast.error('Staff member and item are required')
      return
    }
    setPurchaseSaving(true)
    const { error } = await supabase.from('staff_purchases').insert({
      staff_id: purchaseForm.staff_id,
      item: purchaseForm.item,
      quantity: parseInt(purchaseForm.quantity) || 1,
      price: purchaseForm.price ? parseFloat(purchaseForm.price) : null,
      date: purchaseForm.date,
      is_paid: false,
    })
    if (error) {
      toast.error('Failed to add purchase')
    } else {
      toast.success('Purchase recorded')
      setPurchaseModalOpen(false)
      resetPurchaseForm()
      fetchPurchases()
    }
    setPurchaseSaving(false)
  }

  const togglePaid = async (purchase: StaffPurchase) => {
    const { error } = await supabase
      .from('staff_purchases')
      .update({ is_paid: !purchase.is_paid })
      .eq('id', purchase.id)
    if (error) {
      toast.error('Failed to update')
    } else {
      toast.success(purchase.is_paid ? 'Marked as unpaid' : 'Marked as paid')
      fetchPurchases()
    }
  }

  /* ── Purchase monthly totals ── */
  const purchaseMonthlyTotals = useMemo(() => {
    const map: Record<string, number> = {}
    purchases.forEach(p => {
      const key = p.staff?.full_name ?? p.staff_id
      const total = (p.price ?? 0) * p.quantity
      map[key] = (map[key] ?? 0) + total
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [purchases])

  const unpaidTotal = purchases.filter(p => !p.is_paid).reduce((s, p) => s + (p.price ?? 0) * p.quantity, 0)

  /* ── Profile options for select ── */
  const profileOptions = profiles.map(p => ({ value: p.id, label: p.full_name }))

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */

  const tabs: { key: Tab; label: string }[] = [
    { key: 'transactions', label: 'Transactions' },
    { key: 'till', label: 'Till Balancing' },
    { key: 'purchases', label: 'Staff Purchases' },
  ]

  return (
    <DashboardLayout activePath="/finance">
      <PageHeader
        title="Finance & Transactions"
        description="Studio spend tracking, till balancing, and staff purchases"
      />

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
           TAB 1: TRANSACTIONS
           ════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <StatGrid>
            <StatCard
              title="Total Spend (This Month)"
              value={formatCurrency(totalSpendMonth)}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <StatCard
              title="Transactions (This Month)"
              value={thisMonthTx.length}
              icon={<CreditCard className="w-5 h-5" />}
            />
            <StatCard
              title="Top Category"
              value={topCategory ? topCategory[0].replace('_', ' ') : 'N/A'}
              icon={<ShoppingBag className="w-5 h-5" />}
            />
            <StatCard
              title="Top Category Spend"
              value={topCategory ? formatCurrency(topCategory[1]) : formatCurrency(0)}
              icon={<Wallet className="w-5 h-5" />}
            />
          </StatGrid>

          {/* Filters + Add */}
          <Card>
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="w-40">
                <Select
                  label="Category"
                  options={TRANSACTION_CATEGORY_OPTIONS}
                  placeholder="All"
                  value={txFilterCategory}
                  onChange={e => setTxFilterCategory(e.target.value)}
                />
              </div>
              <div className="w-36">
                <Select
                  label="Status"
                  options={TRANSACTION_STATUS_OPTIONS}
                  placeholder="All"
                  value={txFilterStatus}
                  onChange={e => setTxFilterStatus(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label="From"
                  type="date"
                  value={txFilterFrom}
                  onChange={e => setTxFilterFrom(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Input
                  label="To"
                  type="date"
                  value={txFilterTo}
                  onChange={e => setTxFilterTo(e.target.value)}
                />
              </div>
              <div className="ml-auto">
                <Button icon={<Plus className="w-4 h-4" />} onClick={() => setTxModalOpen(true)}>
                  Add Transaction
                </Button>
              </div>
            </div>

            {/* Table */}
            {txLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No transactions found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {[
                        { key: 'date', label: 'Date' },
                        { key: 'category', label: 'Category' },
                        { key: 'description', label: 'Description' },
                        { key: 'amount', label: 'Amount' },
                        { key: 'status', label: 'Status' },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="px-3 py-2.5 font-medium text-text-secondary cursor-pointer hover:text-text-primary select-none"
                          onClick={() => toggleTxSort(col.key)}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Payment</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Uploaded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-surface-secondary/50">
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="px-3 py-2.5 capitalize whitespace-nowrap">
                          {tx.category?.replace('_', ' ') ?? '-'}
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px] truncate">{tx.description ?? '-'}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{formatCurrency(tx.amount)}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={STATUS_BADGE_MAP[tx.status]}>{tx.status}</Badge>
                        </td>
                        <td className="px-3 py-2.5 capitalize whitespace-nowrap">
                          {tx.payment_method?.replace('_', ' ') ?? '-'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {tx.uploaded_by_profile?.full_name ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Add Transaction Modal */}
          <Modal open={txModalOpen} onClose={() => { setTxModalOpen(false); resetTxForm() }} title="Add Transaction">
            <div className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={txForm.date}
                onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
              />
              <Input
                label="Description"
                placeholder="What was purchased?"
                value={txForm.description}
                onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
              />
              <Input
                label="Amount ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={txForm.amount}
                onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
              />
              <Select
                label="Category"
                options={TRANSACTION_CATEGORY_OPTIONS}
                placeholder="Select category"
                value={txForm.category}
                onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}
              />
              <Select
                label="Payment Method"
                options={PAYMENT_METHOD_OPTIONS}
                placeholder="Select method"
                value={txForm.payment_method}
                onChange={e => setTxForm(f => ({ ...f, payment_method: e.target.value }))}
              />
              <Select
                label="Status"
                options={TRANSACTION_STATUS_OPTIONS}
                value={txForm.status}
                onChange={e => setTxForm(f => ({ ...f, status: e.target.value }))}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setTxModalOpen(false); resetTxForm() }}>Cancel</Button>
                <Button loading={txSaving} onClick={handleAddTransaction}>Save Transaction</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ════════════════════════════════════════════════
           TAB 2: TILL BALANCING
           ════════════════════════════════════════════════ */}
      {activeTab === 'till' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setTillModalOpen(true)}>
              Add Close-out
            </Button>
          </div>

          {tillLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tillBalances.length === 0 ? (
            <Card>
              <p className="text-center text-text-secondary py-8">No till close-outs recorded yet</p>
            </Card>
          ) : (
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-text-secondary">Date</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Staff</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Start Float</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">End Count</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Variance</th>
                      <th className="px-4 py-3 font-medium text-text-secondary">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tillBalances.map(tb => {
                      const v = tb.variance ?? 0
                      const varianceColour = v === 0
                        ? 'text-text-primary'
                        : v > 0
                          ? 'text-status-success'
                          : 'text-status-error'
                      return (
                        <tr key={tb.id} className="border-b border-border/50 hover:bg-surface-secondary/50">
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(tb.date)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{tb.staff?.full_name ?? '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {tb.start_float != null ? formatCurrency(tb.start_float) : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {tb.end_count != null ? formatCurrency(tb.end_count) : '-'}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap font-semibold ${varianceColour}`}>
                            {tb.variance != null ? (v >= 0 ? '+' : '') + formatCurrency(v) : '-'}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-text-secondary">
                            {tb.notes ?? '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Add Till Close-out Modal */}
          <Modal open={tillModalOpen} onClose={() => { setTillModalOpen(false); resetTillForm() }} title="Add Till Close-out">
            <div className="space-y-4">
              <Input
                label="Date"
                type="date"
                value={tillForm.date}
                onChange={e => setTillForm(f => ({ ...f, date: e.target.value }))}
              />
              <Select
                label="Staff Member"
                options={profileOptions}
                placeholder="Select staff"
                value={tillForm.staff_id}
                onChange={e => setTillForm(f => ({ ...f, staff_id: e.target.value }))}
              />
              <Input
                label="Start Float ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={tillForm.start_float}
                onChange={e => setTillForm(f => ({ ...f, start_float: e.target.value }))}
              />
              <Input
                label="End Count ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={tillForm.end_count}
                onChange={e => setTillForm(f => ({ ...f, end_count: e.target.value }))}
              />
              {tillVariance !== null && (
                <div className={`rounded-lg border p-3 text-center font-semibold text-lg ${
                  tillVariance === 0
                    ? 'border-border bg-surface-tertiary text-text-primary'
                    : tillVariance > 0
                      ? 'border-status-success/30 bg-status-success-50 text-status-success'
                      : 'border-status-error/30 bg-status-error-50 text-status-error'
                }`}>
                  Variance: {tillVariance >= 0 ? '+' : ''}{formatCurrency(tillVariance)}
                </div>
              )}
              <Textarea
                label="Notes"
                placeholder="Any notes about the close-out..."
                value={tillForm.notes}
                onChange={e => setTillForm(f => ({ ...f, notes: e.target.value }))}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setTillModalOpen(false); resetTillForm() }}>Cancel</Button>
                <Button loading={tillSaving} onClick={handleAddTill}>Save Close-out</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* ════════════════════════════════════════════════
           TAB 3: STAFF PURCHASES
           ════════════════════════════════════════════════ */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          {/* Stats */}
          <StatGrid className="lg:grid-cols-3">
            <StatCard
              title="Total Purchases"
              value={purchases.length}
              icon={<Beer className="w-5 h-5" />}
            />
            <StatCard
              title="Unpaid Total"
              value={formatCurrency(unpaidTotal)}
              icon={<Calculator className="w-5 h-5" />}
            />
            <StatCard
              title="Staff with Tabs"
              value={purchaseMonthlyTotals.length}
              icon={<Wallet className="w-5 h-5" />}
            />
          </StatGrid>

          {/* Monthly totals by staff */}
          {purchaseMonthlyTotals.length > 0 && (
            <Card>
              <h3 className="text-base font-semibold text-text-primary mb-3">Totals by Staff</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {purchaseMonthlyTotals.map(([name, total]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium text-text-primary">{name}</span>
                    <span className="text-sm font-semibold text-text-primary">{formatCurrency(total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Table + Add */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary">All Purchases</h3>
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => setPurchaseModalOpen(true)}>
                Add Purchase
              </Button>
            </div>

            {purchaseLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : purchases.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No staff purchases recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Date</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Staff</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Item</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Qty</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Price</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Total</th>
                      <th className="px-3 py-2.5 font-medium text-text-secondary">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-surface-secondary/50">
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(p.date)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{p.staff?.full_name ?? '-'}</td>
                        <td className="px-3 py-2.5">{p.item}</td>
                        <td className="px-3 py-2.5">{p.quantity}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {p.price != null ? formatCurrency(p.price) : '-'}
                        </td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                          {p.price != null ? formatCurrency(p.price * p.quantity) : '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => togglePaid(p)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              p.is_paid
                                ? 'bg-status-success-50 text-status-success-700 border-status-success/20 hover:bg-status-success-50/70'
                                : 'bg-status-error-50 text-status-error-700 border-status-error/20 hover:bg-status-error-50/70'
                            }`}
                          >
                            {p.is_paid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {p.is_paid ? 'Paid' : 'Unpaid'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Add Purchase Modal */}
          <Modal open={purchaseModalOpen} onClose={() => { setPurchaseModalOpen(false); resetPurchaseForm() }} title="Add Staff Purchase">
            <div className="space-y-4">
              <Select
                label="Staff Member"
                options={profileOptions}
                placeholder="Select staff"
                value={purchaseForm.staff_id}
                onChange={e => setPurchaseForm(f => ({ ...f, staff_id: e.target.value }))}
              />
              <Input
                label="Item"
                placeholder="e.g. Tinnie, Coffee, Snack"
                value={purchaseForm.item}
                onChange={e => setPurchaseForm(f => ({ ...f, item: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantity"
                  type="number"
                  min="1"
                  value={purchaseForm.quantity}
                  onChange={e => setPurchaseForm(f => ({ ...f, quantity: e.target.value }))}
                />
                <Input
                  label="Price ($)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={purchaseForm.price}
                  onChange={e => setPurchaseForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <Input
                label="Date"
                type="date"
                value={purchaseForm.date}
                onChange={e => setPurchaseForm(f => ({ ...f, date: e.target.value }))}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setPurchaseModalOpen(false); resetPurchaseForm() }}>Cancel</Button>
                <Button loading={purchaseSaving} onClick={handleAddPurchase}>Save Purchase</Button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </DashboardLayout>
  )
}
