'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function ClientsPage() {
  return (
    <DashboardLayout activePath="/clients">
      <PageHeader title="My Clients & Leads" description="Manage your client relationships and bookings" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
