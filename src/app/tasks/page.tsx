'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function TasksPage() {
  return (
    <DashboardLayout activePath="/tasks">
      <PageHeader title="Tasks & Roster" description="Manage studio tasks and cleaning roster" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
