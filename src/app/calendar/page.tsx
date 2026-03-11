'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { CalendarView } from '@/components/blocks/CalendarView'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

/* ── DEMO DATA — Replace with: const { data } = useSchedule() ── */
const DEMO_EVENTS = [
  { id: '1', title: 'Smith — Fence install', date: '2026-03-10', colour: '#3b82f6', time: '7:30' },
  { id: '2', title: 'Jones — Side fence', date: '2026-03-10', colour: '#8b5cf6', time: '8:00' },
  { id: '3', title: 'Taylor — Measure', date: '2026-03-12', colour: '#f59e0b', time: '10:00' },
  { id: '4', title: 'Brown — Gate install', date: '2026-03-15', colour: '#22c55e', time: '7:30' },
  { id: '5', title: 'Chen — Front fence', date: '2026-03-18', colour: '#3b82f6', time: '7:30' },
  { id: '6', title: 'Wilson — Quote visit', date: '2026-03-20', colour: '#f59e0b', time: '14:00' },
  { id: '7', title: 'Smith — Fence Day 2', date: '2026-03-11', colour: '#3b82f6', time: '7:30' },
  { id: '8', title: 'Smith — Fence Day 3', date: '2026-03-12', colour: '#3b82f6', time: '7:30' },
]

export default function CalendarPage() {
  return (
    <DashboardLayout activePath="/calendar">
      <PageHeader
        title="Calendar"
        description="Schedule and manage jobs, site visits and deadlines"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Calendar' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />}>Add Event</Button>}
      />

      <CalendarView
        events={DEMO_EVENTS}
        onDateClick={date => console.log('Date clicked', date)}
        onEventClick={evt => console.log('Event clicked', evt)}
      />
    </DashboardLayout>
  )
}
