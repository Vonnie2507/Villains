'use client'

import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ArtistPaymentsView } from './ArtistPaymentsView'
import { AdminPaymentsView } from './AdminPaymentsView'

export default function PaymentsPage() {
  const { isArtist } = useAuth()

  return (
    <DashboardLayout activePath="/payments">
      {isArtist ? <ArtistPaymentsView /> : <AdminPaymentsView />}
    </DashboardLayout>
  )
}
