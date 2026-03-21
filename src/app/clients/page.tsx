'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function ClientsPage() {
  return (
    <DashboardLayout activePath="/clients">
      <PageHeader title="My Clients" description="View and manage your client list." />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon — Phase 1B</p>
      </Card>
    </DashboardLayout>
  )
}
