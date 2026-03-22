'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function StudioInboxPage() {
  return (
    <DashboardLayout activePath="/studio-inbox">
      <PageHeader title="Studio Inbox" description="Manage incoming enquiries before handoff to artists" />
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
