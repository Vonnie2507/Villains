'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { DetailPanel } from '@/components/blocks/DetailPanel'
import { Timeline } from '@/components/blocks/Timeline'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Edit, FileText, Truck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

/* ── DEMO DATA — Replace with: const { data } = useJob(id) ── */
const DEMO_JOB = {
  number: 'JOB-001',
  client: 'John Smith',
  description: 'Front boundary fence — 25m PVC with gate',
  status: 'In Progress',
  value: 4200,
  address: '42 High Street, Joondalup WA 6027',
  assigned: 'David Rees',
  startDate: '8 Mar 2026',
  estimatedEnd: '10 Mar 2026',
  notes: 'Access via side gate. Dog on property — call before arrival.',
}

const DEMO_MATERIALS = [
  { id: '1', item: 'PVC Panel 1800x2400', qty: 10, unit: '$185', total: '$1,850' },
  { id: '2', item: 'PVC Post 2400mm', qty: 11, unit: '$65', total: '$715' },
  { id: '3', item: 'Post Cap', qty: 11, unit: '$8', total: '$88' },
  { id: '4', item: 'Gate Kit — Single', qty: 1, unit: '$420', total: '$420' },
  { id: '5', item: 'Concrete (20kg)', qty: 22, unit: '$9', total: '$198' },
]

const DEMO_ACTIVITY = [
  { id: '1', title: 'Day 2 started', description: 'Posts set, panels going up today', timestamp: 'Today, 7:30am' },
  { id: '2', title: 'Day 1 completed', description: 'All posts concreted', timestamp: 'Yesterday, 3:45pm' },
  { id: '3', title: 'Materials dispatched', description: '3 bundles dispatched from warehouse', timestamp: '7 Mar, 2:00pm' },
  { id: '4', title: 'Job scheduled', description: 'Assigned to David Rees — 3 day job', timestamp: '5 Mar, 10:15am' },
]

const materialColumns: Column<typeof DEMO_MATERIALS[0]>[] = [
  { key: 'item', header: 'Item' },
  { key: 'qty', header: 'Qty' },
  { key: 'unit', header: 'Unit Price' },
  { key: 'total', header: 'Total' },
]

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'materials', label: 'Materials', count: 5 },
  { id: 'activity', label: 'Activity' },
]

export default function JobDetailPage() {
  return (
    <DashboardLayout activePath="/jobs">
      <PageHeader
        title={`${DEMO_JOB.number} — ${DEMO_JOB.client}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Jobs', href: '/jobs' },
          { label: DEMO_JOB.number },
        ]}
        actions={
          <>
            <Button variant="outline" icon={<FileText className="w-4 h-4" />}>Quote</Button>
            <Button variant="outline" icon={<Truck className="w-4 h-4" />}>Dispatch</Button>
            <Button icon={<Edit className="w-4 h-4" />}>Edit</Button>
          </>
        }
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6">
        <Badge variant="info" dot>{DEMO_JOB.status}</Badge>
        <span className="text-sm text-text-secondary">{DEMO_JOB.description}</span>
        <span className="ml-auto text-lg font-bold text-text-primary">{formatCurrency(DEMO_JOB.value)}</span>
      </div>

      <Tabs tabs={TABS}>
        {(activeTab) => (
          <>
            {activeTab === 'overview' && (
              <DetailPanel
                title="Job Details"
                fields={[
                  { label: 'Job Number', value: DEMO_JOB.number },
                  { label: 'Client', value: DEMO_JOB.client },
                  { label: 'Address', value: DEMO_JOB.address },
                  { label: 'Assigned To', value: DEMO_JOB.assigned },
                  { label: 'Start Date', value: DEMO_JOB.startDate },
                  { label: 'Est. Completion', value: DEMO_JOB.estimatedEnd },
                  { label: 'Value', value: formatCurrency(DEMO_JOB.value) },
                  { label: 'Notes', value: DEMO_JOB.notes },
                ]}
              />
            )}

            {activeTab === 'materials' && (
              <DataTable columns={materialColumns} data={DEMO_MATERIALS} />
            )}

            {activeTab === 'activity' && (
              <Card>
                <CardHeader><CardTitle>Job Activity</CardTitle></CardHeader>
                <Timeline items={DEMO_ACTIVITY} />
              </Card>
            )}
          </>
        )}
      </Tabs>
    </DashboardLayout>
  )
}
