'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function FinancePage() {
  return (
    <DashboardLayout activePath="/finance">
      <PageHeader title="Finance & Transactions" description="Studio spend tracking, till balancing, and receipts" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
