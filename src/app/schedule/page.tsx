'use client'

import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ArtistScheduleView } from './ArtistScheduleView'
import { AdminScheduleView } from './AdminScheduleView'

export default function SchedulePage() {
  const { isAdmin, isArtist } = useAuth()

  return (
    <DashboardLayout activePath="/schedule">
      {isArtist ? <ArtistScheduleView /> : <AdminScheduleView />}
    </DashboardLayout>
  )
}
