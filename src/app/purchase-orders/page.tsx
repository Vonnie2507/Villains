'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function PurchaseOrdersPage() {
  return (
    <DashboardLayout activePath="/purchase-orders">
      <PageHeader title="Purchase Orders" description="Manage supplier orders" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
