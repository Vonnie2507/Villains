'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { SearchFilter } from '@/components/blocks/SearchFilter'
import { KanbanBoard } from '@/components/blocks/KanbanBoard'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Plus, LayoutGrid, List } from 'lucide-react'

/* ── DEMO DATA — Replace with: const { data } = useJobs() ── */
const DEMO_KANBAN = [
  {
    id: 'quoted', title: 'Quoted', colour: '#f59e0b', count: 4,
    cards: [
      { id: '1', title: 'Pool Fencing — Smith', subtitle: '$8,700', badge: <Badge variant="warning">Awaiting response</Badge> },
      { id: '2', title: 'Front Fence — Chen', subtitle: '$4,200', badge: <Badge variant="warning">Follow up due</Badge> },
    ]
  },
  {
    id: 'scheduled', title: 'Scheduled', colour: '#3b82f6', count: 3,
    cards: [
      { id: '3', title: 'Boundary Fence — Taylor', subtitle: '$6,800 — 15 Mar', avatar: <Avatar name="Craig Walker" size="sm" /> },
      { id: '4', title: 'Gate Install — Brown', subtitle: '$2,100 — 18 Mar', avatar: <Avatar name="David Rees" size="sm" /> },
    ]
  },
  {
    id: 'in_progress', title: 'In Progress', colour: '#8b5cf6', count: 5,
    cards: [
      { id: '5', title: 'Front Boundary — Smith', subtitle: '$4,200 — Day 2 of 3', avatar: <Avatar name="David Rees" size="sm" /> },
      { id: '6', title: 'Side Fence — Jones', subtitle: '$3,400 — Day 1 of 2', avatar: <Avatar name="Craig Walker" size="sm" /> },
    ]
  },
  {
    id: 'completed', title: 'Completed', colour: '#22c55e', count: 12,
    cards: [
      { id: '7', title: 'Side Gate — Williams', subtitle: '$6,500', badge: <Badge variant="success">Paid</Badge> },
      { id: '8', title: 'Rear Fence — Wilson', subtitle: '$3,200', badge: <Badge variant="info">Invoice sent</Badge> },
    ]
  },
]

const DEMO_TABLE = [
  { id: '1', number: 'JOB-001', client: 'John Smith', description: 'Front boundary fence', status: 'In Progress', assigned: 'David Rees', value: '$4,200', date: '8 Mar' },
  { id: '2', number: 'JOB-002', client: 'Sarah Jones', description: 'Side fence replacement', status: 'In Progress', assigned: 'Craig Walker', value: '$3,400', date: '7 Mar' },
  { id: '3', number: 'JOB-003', client: 'Mike Williams', description: 'Side gate install', status: 'Completed', assigned: 'David Rees', value: '$6,500', date: '6 Mar' },
  { id: '4', number: 'JOB-004', client: 'Lisa Brown', description: 'Gate install', status: 'Scheduled', assigned: 'David Rees', value: '$2,100', date: '18 Mar' },
  { id: '5', number: 'JOB-005', client: 'David Taylor', description: 'Boundary fence', status: 'Scheduled', assigned: 'Craig Walker', value: '$6,800', date: '15 Mar' },
]

const tableColumns: Column<typeof DEMO_TABLE[0]>[] = [
  { key: 'number', header: 'Job #', sortable: true },
  { key: 'client', header: 'Client', sortable: true },
  { key: 'description', header: 'Description' },
  { key: 'status', header: 'Status', render: r => {
    const v = { 'In Progress': 'info', 'Completed': 'success', 'Scheduled': 'brand', 'Quoted': 'warning' }[r.status] || 'default'
    return <Badge variant={v as any} dot>{r.status}</Badge>
  }},
  { key: 'assigned', header: 'Assigned', render: r => (
    <div className="flex items-center gap-2"><Avatar name={r.assigned} size="sm" /><span>{r.assigned}</span></div>
  )},
  { key: 'value', header: 'Value', sortable: true },
  { key: 'date', header: 'Date', sortable: true },
]

const TABS = [
  { id: 'board', label: 'Board', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
]

export default function JobsPage() {
  return (
    <DashboardLayout activePath="/jobs">
      <PageHeader
        title="Jobs"
        description="Track all jobs from quote to completion"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Jobs' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />}>New Job</Button>}
      />

      <SearchFilter placeholder="Search jobs..." />

      <div className="mt-4">
        <Tabs tabs={TABS}>
          {(activeTab) => (
            <>
              {activeTab === 'board' && <KanbanBoard columns={DEMO_KANBAN} />}
              {activeTab === 'list' && <DataTable columns={tableColumns} data={DEMO_TABLE} />}
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
