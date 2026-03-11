'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { Badge } from '@/components/ui/Badge'
import { DollarSign, TrendingUp, Receipt, Percent } from 'lucide-react'

/* ── DEMO DATA — Replace with hooks ── */
const DEMO_REVENUE = [
  { id: '1', month: 'January', revenue: '$28,400', jobs: 8, avgJob: '$3,550', margin: '42%' },
  { id: '2', month: 'February', revenue: '$35,200', jobs: 11, avgJob: '$3,200', margin: '45%' },
  { id: '3', month: 'March (MTD)', revenue: '$48,250', jobs: 14, avgJob: '$3,446', margin: '44%' },
]

const DEMO_TOP_CLIENTS = [
  { id: '1', client: 'David Taylor', jobs: 5, revenue: '$28,400', lastJob: '4 Mar 2026' },
  { id: '2', client: 'Jenny Chen', jobs: 4, revenue: '$22,100', lastJob: '2 Mar 2026' },
  { id: '3', client: 'John Smith', jobs: 3, revenue: '$14,700', lastJob: '8 Mar 2026' },
]

const revenueColumns: Column<typeof DEMO_REVENUE[0]>[] = [
  { key: 'month', header: 'Month' },
  { key: 'revenue', header: 'Revenue', sortable: true },
  { key: 'jobs', header: 'Jobs' },
  { key: 'avgJob', header: 'Avg Job Value' },
  { key: 'margin', header: 'Margin', render: r => <Badge variant="success">{r.margin}</Badge> },
]

const clientColumns: Column<typeof DEMO_TOP_CLIENTS[0]>[] = [
  { key: 'client', header: 'Client', sortable: true },
  { key: 'jobs', header: 'Jobs', sortable: true },
  { key: 'revenue', header: 'Revenue', sortable: true },
  { key: 'lastJob', header: 'Last Job' },
]

export default function ReportsPage() {
  return (
    <DashboardLayout activePath="/reports">
      <PageHeader
        title="Reports"
        description="Financial overview and business intelligence"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]}
      />

      <StatGrid className="mb-6">
        <StatCard title="Revenue (YTD)" value="$111,850" change={18.5} changeLabel="vs last year" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard title="Total Jobs (YTD)" value="33" change={22.0} changeLabel="vs last year" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="Avg Job Value" value="$3,389" change={5.1} icon={<Receipt className="w-5 h-5" />} />
        <StatCard title="Avg Margin" value="43.7%" change={2.3} icon={<Percent className="w-5 h-5" />} />
      </StatGrid>

      <div className="space-y-6">
        {/* Revenue chart placeholder */}
        <Card>
          <CardHeader><CardTitle>Revenue by Month</CardTitle></CardHeader>
          {/* HOOK POINT: Replace this with a chart component connected to your data */}
          <div className="h-64 flex items-center justify-center bg-surface-secondary rounded-lg border border-dashed border-border text-text-tertiary text-sm">
            Chart goes here — connect a chart library (Recharts, Chart.js, etc.)
          </div>
        </Card>

        <DataTable columns={revenueColumns} data={DEMO_REVENUE} />

        <Card padding={false}>
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-text-primary">Top Clients</h3>
          </div>
          <DataTable columns={clientColumns} data={DEMO_TOP_CLIENTS} />
        </Card>
      </div>
    </DashboardLayout>
  )
}
