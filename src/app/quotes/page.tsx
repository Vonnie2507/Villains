'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { SearchFilter } from '@/components/blocks/SearchFilter'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, FileText, DollarSign, CheckCircle, Clock } from 'lucide-react'

/* ── DEMO DATA — Replace with hooks ── */
const DEMO_QUOTES = [
  { id: '1', number: 'Q-042', client: 'John Smith', description: 'Pool fencing', status: 'Sent', value: '$8,700', date: '7 Mar 2026', expires: '21 Mar 2026' },
  { id: '2', number: 'Q-041', client: 'Jenny Chen', description: 'Front fence + gate', status: 'Accepted', value: '$6,200', date: '5 Mar 2026', expires: '19 Mar 2026' },
  { id: '3', number: 'Q-040', client: 'David Taylor', description: 'Boundary fence 40m', status: 'Draft', value: '$12,400', date: '4 Mar 2026', expires: '—' },
  { id: '4', number: 'Q-039', client: 'Lisa Brown', description: 'Gate replacement', status: 'Declined', value: '$2,100', date: '1 Mar 2026', expires: '15 Mar 2026' },
  { id: '5', number: 'Q-038', client: 'Emma Wilson', description: 'Side fence', status: 'Accepted', value: '$3,200', date: '28 Feb 2026', expires: '14 Mar 2026' },
]

const columns: Column<typeof DEMO_QUOTES[0]>[] = [
  { key: 'number', header: 'Quote #', sortable: true },
  { key: 'client', header: 'Client', sortable: true },
  { key: 'description', header: 'Description' },
  { key: 'status', header: 'Status', render: r => {
    const v = { Sent: 'info', Accepted: 'success', Draft: 'default', Declined: 'error' }[r.status] || 'default'
    return <Badge variant={v as any} dot>{r.status}</Badge>
  }},
  { key: 'value', header: 'Value', sortable: true },
  { key: 'date', header: 'Date', sortable: true },
  { key: 'expires', header: 'Expires' },
]

export default function QuotesPage() {
  return (
    <DashboardLayout activePath="/quotes">
      <PageHeader
        title="Quotes"
        description="Create, send and track quotes"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Quotes' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />}>New Quote</Button>}
      />

      <StatGrid className="mb-6">
        <StatCard title="Total Quoted" value="$32,600" icon={<FileText className="w-5 h-5" />} />
        <StatCard title="Accepted" value="$9,400" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard title="Pending" value="$8,700" icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Win Rate" value="68%" change={5.2} changeLabel="vs last month" icon={<DollarSign className="w-5 h-5" />} />
      </StatGrid>

      <SearchFilter placeholder="Search quotes..." />

      <div className="mt-4">
        <DataTable columns={columns} data={DEMO_QUOTES} onRowClick={r => console.log('Open quote', r.id)} />
      </div>
    </DashboardLayout>
  )
}
