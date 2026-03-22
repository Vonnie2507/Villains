'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function InboxPage() {
  return (
    <DashboardLayout activePath="/inbox">
      <PageHeader title="Artist Inbox" description="Unified communications with your clients" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
