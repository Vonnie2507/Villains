'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { DetailPanel } from '@/components/blocks/DetailPanel'
import { Timeline } from '@/components/blocks/Timeline'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Edit, Mail, Phone } from 'lucide-react'

/* ── DEMO DATA — Replace with: const { data } = useContact(id) ── */
const DEMO_CONTACT = {
  name: 'John Smith',
  email: 'john@example.com',
  phone: '0412 345 678',
  address: '42 High Street, Joondalup WA 6027',
  type: 'Customer',
  source: 'Google',
  createdAt: '15 Jan 2026',
  notes: 'Prefers phone calls over email. Has a large property with 3 boundary lines.',
}

const DEMO_JOBS = [
  { id: '1', number: 'JOB-001', description: 'Front boundary fence', status: 'In Progress', value: '$4,200' },
  { id: '2', number: 'JOB-008', description: 'Side gate install', status: 'Completed', value: '$1,800' },
  { id: '3', number: 'JOB-015', description: 'Pool fencing', status: 'Quoted', value: '$8,700' },
]

const DEMO_ACTIVITY = [
  { id: '1', title: 'Quote sent', description: 'Pool fencing — $8,700', timestamp: '2 days ago' },
  { id: '2', title: 'Job completed', description: 'Side gate install', timestamp: '2 weeks ago' },
  { id: '3', title: 'Site visit scheduled', description: 'Front boundary fence measure', timestamp: '1 month ago' },
  { id: '4', title: 'Contact created', description: 'Added via web enquiry', timestamp: '15 Jan 2026' },
]

const jobColumns: Column<typeof DEMO_JOBS[0]>[] = [
  { key: 'number', header: 'Job #' },
  { key: 'description', header: 'Description' },
  { key: 'status', header: 'Status', render: r => <Badge variant={r.status === 'Completed' ? 'success' : r.status === 'In Progress' ? 'info' : 'warning'}>{r.status}</Badge> },
  { key: 'value', header: 'Value' },
]

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'jobs', label: 'Jobs', count: 3 },
  { id: 'activity', label: 'Activity' },
]

export default function ContactDetailPage() {
  return (
    <DashboardLayout activePath="/contacts">
      <PageHeader
        title={DEMO_CONTACT.name}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Contacts', href: '/contacts' },
          { label: DEMO_CONTACT.name },
        ]}
        actions={
          <>
            <Button variant="outline" icon={<Phone className="w-4 h-4" />}>Call</Button>
            <Button variant="outline" icon={<Mail className="w-4 h-4" />}>Email</Button>
            <Button icon={<Edit className="w-4 h-4" />}>Edit</Button>
          </>
        }
      />

      {/* Avatar + quick info */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={DEMO_CONTACT.name} size="xl" />
        <div>
          <p className="text-lg font-semibold text-text-primary">{DEMO_CONTACT.name}</p>
          <p className="text-sm text-text-secondary">{DEMO_CONTACT.email} &middot; {DEMO_CONTACT.phone}</p>
          <Badge variant="brand" className="mt-1">{DEMO_CONTACT.type}</Badge>
        </div>
      </div>

      <Tabs tabs={TABS}>
        {(activeTab) => (
          <>
            {activeTab === 'details' && (
              <DetailPanel
                title="Contact Information"
                fields={[
                  { label: 'Full Name', value: DEMO_CONTACT.name },
                  { label: 'Email', value: DEMO_CONTACT.email },
                  { label: 'Phone', value: DEMO_CONTACT.phone },
                  { label: 'Address', value: DEMO_CONTACT.address },
                  { label: 'Type', value: <Badge variant="brand">{DEMO_CONTACT.type}</Badge> },
                  { label: 'Source', value: DEMO_CONTACT.source },
                  { label: 'Created', value: DEMO_CONTACT.createdAt },
                  { label: 'Notes', value: DEMO_CONTACT.notes },
                ]}
              />
            )}

            {activeTab === 'jobs' && (
              <DataTable columns={jobColumns} data={DEMO_JOBS} />
            )}

            {activeTab === 'activity' && (
              <Card>
                <CardHeader><CardTitle>Activity History</CardTitle></CardHeader>
                <Timeline items={DEMO_ACTIVITY} />
              </Card>
            )}
          </>
        )}
      </Tabs>
    </DashboardLayout>
  )
}
