'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function ProductsPage() {
  return (
    <DashboardLayout activePath="/products">
      <PageHeader title="Products & Inventory" description="Manage shop products and stock levels" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
