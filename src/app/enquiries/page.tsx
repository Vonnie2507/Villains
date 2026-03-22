'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'

export default function EnquiriesPage() {
  return (
    <DashboardLayout activePath="/enquiries">
      <PageHeader
        title="Enquiries & Handoffs"
        description="Villains manages incoming enquiries and passes them to artists. Artists own the client relationship and bookings."
      />
      <div className="mb-4 px-4 py-3 rounded-lg bg-status-warning-50 border border-status-warning/20">
        <p className="text-sm text-status-warning-700">
          Contact details belong to the artist. Villains only manages enquiries and hand-offs. Only artists can see full client contact info.
        </p>
      </div>
      <Card>
        <p className="text-center text-text-secondary py-8">Coming soon</p>
      </Card>
    </DashboardLayout>
  )
}
