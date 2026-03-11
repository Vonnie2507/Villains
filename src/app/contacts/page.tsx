'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { SearchFilter } from '@/components/blocks/SearchFilter'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { Pagination } from '@/components/blocks/Pagination'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Plus } from 'lucide-react'
import { useState } from 'react'

/* ── DEMO DATA — Replace with: const { data } = useContacts() ── */
const DEMO_CONTACTS = [
  { id: '1', name: 'John Smith', email: 'john@example.com', phone: '0412 345 678', type: 'Customer', jobs: 3, value: '$14,700' },
  { id: '2', name: 'Sarah Jones', email: 'sarah@jones.com.au', phone: '0423 456 789', type: 'Customer', jobs: 1, value: '$12,800' },
  { id: '3', name: 'Mike Williams', email: 'mike@williams.com', phone: '0434 567 890', type: 'Supplier', jobs: 0, value: '$0' },
  { id: '4', name: 'Lisa Brown', email: 'lisa@brown.com.au', phone: '0445 678 901', type: 'Customer', jobs: 2, value: '$9,600' },
  { id: '5', name: 'David Taylor', email: 'david@taylorbuild.com', phone: '0456 789 012', type: 'Subcontractor', jobs: 5, value: '$28,400' },
  { id: '6', name: 'Emma Wilson', email: 'emma@wilson.com.au', phone: '0467 890 123', type: 'Customer', jobs: 1, value: '$3,200' },
  { id: '7', name: 'Chris Lee', email: 'chris@lee.com', phone: '0478 901 234', type: 'Supplier', jobs: 0, value: '$0' },
  { id: '8', name: 'Jenny Chen', email: 'jenny@chen.com.au', phone: '0489 012 345', type: 'Customer', jobs: 4, value: '$22,100' },
]

const FILTERS = [
  { id: 'type', label: 'Type', options: [
    { value: 'Customer', label: 'Customer' },
    { value: 'Supplier', label: 'Supplier' },
    { value: 'Subcontractor', label: 'Subcontractor' },
  ]},
]

const columns: Column<typeof DEMO_CONTACTS[0]>[] = [
  { key: 'name', header: 'Name', sortable: true, render: row => (
    <div className="flex items-center gap-3">
      <Avatar name={row.name} size="sm" />
      <div>
        <p className="font-medium text-text-primary">{row.name}</p>
        <p className="text-xs text-text-tertiary">{row.email}</p>
      </div>
    </div>
  )},
  { key: 'phone', header: 'Phone', sortable: true },
  { key: 'type', header: 'Type', render: row => {
    const v = row.type === 'Customer' ? 'brand' : row.type === 'Supplier' ? 'info' : 'warning'
    return <Badge variant={v as any}>{row.type}</Badge>
  }},
  { key: 'jobs', header: 'Jobs', sortable: true },
  { key: 'value', header: 'Total Value', sortable: true },
]

export default function ContactsPage() {
  const [page, setPage] = useState(1)

  return (
    <DashboardLayout activePath="/contacts">
      <PageHeader
        title="Contacts"
        description="Manage your customers, suppliers and subcontractors"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Contacts' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />}>Add Contact</Button>}
      />

      <div className="space-y-4">
        <SearchFilter
          placeholder="Search contacts..."
          filters={FILTERS}
        />

        <DataTable
          columns={columns}
          data={DEMO_CONTACTS}
          onRowClick={row => console.log('Navigate to contact', row.id)}
        />

        <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
      </div>
    </DashboardLayout>
  )
}
