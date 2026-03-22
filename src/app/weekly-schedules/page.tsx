'use client'

import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { ArtistWeeklyView } from './ArtistWeeklyView'
import { AdminWeeklyView } from './AdminWeeklyView'

export default function WeeklySchedulesPage() {
  const { isArtist } = useAuth()

  return (
    <DashboardLayout activePath="/weekly-schedules">
      {isArtist ? <ArtistWeeklyView /> : <AdminWeeklyView />}
    </DashboardLayout>
  )
}
