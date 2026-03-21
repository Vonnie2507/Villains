'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function IncidentsPage() {
  return (
    <DashboardLayout activePath="/incidents">
      <PageHeader title="Incidents" description="Track and manage studio incidents." />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon — Phase 1B</p>
      </Card>
    </DashboardLayout>
  )
}
