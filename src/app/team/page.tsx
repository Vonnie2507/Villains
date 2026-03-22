'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import type { Profile, ArtistProfile, StaffRecord } from '@/types'
import { Palette, Mail, Phone, MapPin } from 'lucide-react'

export default function TeamPage() {
  const [staff, setStaff] = useState<(Profile & { artist_profiles?: ArtistProfile[]; staff_records?: StaffRecord[] })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*, artist_profiles(*), staff_records(*)')
        .eq('is_active', true)
        .order('full_name')

      setStaff((data || []) as (Profile & { artist_profiles?: ArtistProfile[]; staff_records?: StaffRecord[] })[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <DashboardLayout activePath="/team">
      <PageHeader
        title="Staff Management"
        description="Manage staff profiles and onboarding"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Staff' }]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staff.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-8">No staff found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(member => {
            const artistProfile = member.artist_profiles?.[0]
            const staffRecord = member.staff_records?.[0]
            const isArtist = member.role === 'artist'

            return (
              <Card key={member.id}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">
                      {artistProfile?.display_name || member.display_name || member.full_name}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant={isArtist ? 'brand' : 'info'}>
                        {member.role === 'super_admin' ? 'Owner' : member.role === 'admin' ? 'Reception' : 'Artist'}
                      </Badge>
                      {artistProfile?.seat_name_or_number && (
                        <Badge variant="default">Seat {artistProfile.seat_name_or_number}</Badge>
                      )}
                    </div>
                    {isArtist && artistProfile?.specialties && artistProfile.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {artistProfile.specialties.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-surface-tertiary text-text-secondary">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {artistProfile?.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Palette className="w-4 h-4 text-text-tertiary" />
                      @{artistProfile.instagram_handle}
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Mail className="w-4 h-4 text-text-tertiary" />
                      {member.email}
                    </div>
                  )}
                  {(member.phone || staffRecord?.phone) && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Phone className="w-4 h-4 text-text-tertiary" />
                      {staffRecord?.phone || member.phone}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-text-tertiary">
                    {staffRecord ? 'HR record on file' : 'No HR record'}
                  </p>
                  <Badge variant={staffRecord ? 'success' : 'warning'}>
                    {staffRecord ? 'Onboarded' : 'Pending'}
                  </Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
