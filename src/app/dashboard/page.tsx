'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Timeline } from '@/components/blocks/Timeline'
import { DollarSign, Briefcase, Users, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react'

/*
  ================================================================
  DEMO DATA — Replace with hooks when connecting to Supabase
  e.g. const { data: stats } = useStats()
  ================================================================
*/
const DEMO_STATS = {
  revenue: '$48,250',
  revenueChange: 12.5,
  activeJobs: 18,
  jobsChange: 8.3,
  contacts: 142,
  contactsChange: 4.1,
  quoteRate: '68%',
  quoteChange: -2.4,
}

const DEMO_RECENT_JOBS = [
  { id: '1', number: 'JOB-001', client: 'Smith Residence', status: 'In Progress', value: '$4,200', date: '8 Mar 2026' },
  { id: '2', number: 'JOB-002', client: 'Jones Commercial', status: 'Quoted', value: '$12,800', date: '7 Mar 2026' },
  { id: '3', number: 'JOB-003', client: 'Williams Property', status: 'Completed', value: '$6,500', date: '6 Mar 2026' },
  { id: '4', number: 'JOB-004', client: 'Brown Landscaping', status: 'In Progress', value: '$3,100', date: '5 Mar 2026' },
  { id: '5', number: 'JOB-005', client: 'Taylor Build', status: 'Scheduled', value: '$8,900', date: '4 Mar 2026' },
]

const DEMO_ACTIVITY = [
  { id: '1', title: 'New quote sent to Smith Residence', description: 'Quote #Q-042 for $4,200', timestamp: '2 hours ago' },
  { id: '2', title: 'Job JOB-003 marked as completed', description: 'Williams Property — all bundles dispatched', timestamp: '5 hours ago' },
  { id: '3', title: 'New contact added', description: 'Sarah Chen — referred by Taylor Build', timestamp: 'Yesterday' },
  { id: '4', title: 'Payment received', description: '$6,500 from Williams Property', timestamp: 'Yesterday' },
]

/* ================================================================ */

const statusBadge = (status: string) => {
  const variant = {
    'In Progress': 'info' as const,
    'Quoted': 'warning' as const,
    'Completed': 'success' as const,
    'Scheduled': 'brand' as const,
  }[status] || 'default' as const
  return <Badge variant={variant} dot>{status}</Badge>
}

const jobColumns: Column<typeof DEMO_RECENT_JOBS[0]>[] = [
  { key: 'number', header: 'Job #', sortable: true },
  { key: 'client', header: 'Client', sortable: true },
  { key: 'status', header: 'Status', render: row => statusBadge(row.status) },
  { key: 'value', header: 'Value', sortable: true },
  { key: 'date', header: 'Date', sortable: true },
]

export default function DashboardPage() {
  return (
    <DashboardLayout activePath="/dashboard">
      <PageHeader
        title="Dashboard"
        description="Overview of your business"
      />

      {/* Stats row */}
      <StatGrid>
        <StatCard
          title="Revenue (MTD)"
          value={DEMO_STATS.revenue}
          change={DEMO_STATS.revenueChange}
          changeLabel="vs last month"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Active Jobs"
          value={DEMO_STATS.activeJobs}
          change={DEMO_STATS.jobsChange}
          changeLabel="vs last month"
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          title="Total Contacts"
          value={DEMO_STATS.contacts}
          change={DEMO_STATS.contactsChange}
          changeLabel="vs last month"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Quote Win Rate"
          value={DEMO_STATS.quoteRate}
          change={DEMO_STATS.quoteChange}
          changeLabel="vs last month"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </StatGrid>

      {/* Two-column: Recent Jobs + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--section-gap)] mt-[var(--section-gap)]">
        {/* Recent Jobs — 2/3 width */}
        <div className="lg:col-span-2">
          <DataTable
            columns={jobColumns}
            data={DEMO_RECENT_JOBS}
            onRowClick={(row) => console.log('Navigate to', row.id)}
          />
        </div>

        {/* Activity — 1/3 width */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <Timeline items={DEMO_ACTIVITY} />
        </Card>
      </div>
    </DashboardLayout>
  )
}
