'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function PosPage() {
  return (
    <DashboardLayout activePath="/pos">
      <PageHeader title="POS / Shop" description="Point of sale for shop items" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
