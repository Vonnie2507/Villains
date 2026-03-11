'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Mail, Phone } from 'lucide-react'

/* ── DEMO DATA — Replace with hooks ── */
const DEMO_TEAM = [
  { id: '1', name: 'David Rees', role: 'Production Manager', email: 'david@company.com', phone: '0412 111 222', status: 'Active', jobs: 3 },
  { id: '2', name: 'Craig Walker', role: 'Operations Manager', email: 'craig@company.com', phone: '0412 333 444', status: 'Active', jobs: 2 },
  { id: '3', name: 'Dave Turner', role: 'Sales Manager', email: 'dave@company.com', phone: '0412 555 666', status: 'Active', jobs: 0 },
  { id: '4', name: 'Aira Superable', role: 'Bookkeeper', email: 'aira@company.com', phone: '—', status: 'Active', jobs: 0 },
]

export default function TeamPage() {
  return (
    <DashboardLayout activePath="/team">
      <PageHeader
        title="Team"
        description="Manage staff and their roles"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Team' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />}>Add Team Member</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEMO_TEAM.map(member => (
          <Card key={member.id}>
            <div className="flex items-start gap-4">
              <Avatar name={member.name} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary">{member.name}</p>
                <p className="text-sm text-text-secondary">{member.role}</p>
                <Badge variant="success" className="mt-2">{member.status}</Badge>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail className="w-4 h-4 text-text-tertiary" />
                {member.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Phone className="w-4 h-4 text-text-tertiary" />
                {member.phone}
              </div>
            </div>

            {member.jobs > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-tertiary">{member.jobs} active job{member.jobs > 1 ? 's' : ''}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
