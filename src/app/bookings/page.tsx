'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function BookingsPage() {
  return (
    <DashboardLayout activePath="/bookings">
      <PageHeader title="Bookings" description="Manage studio bookings and appointments." />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon — Phase 1B</p>
      </Card>
    </DashboardLayout>
  )
}
