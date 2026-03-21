'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import type { Profile, ArtistDetails } from '@/types'
import { Palette, Mail, Phone } from 'lucide-react'

export default function TeamPage() {
  const [artists, setArtists] = useState<(Profile & { artist_details?: ArtistDetails[] })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*, artist_details(*)')
        .eq('role', 'artist')
        .eq('is_active', true)
        .order('full_name')

      setArtists((data || []) as (Profile & { artist_details?: ArtistDetails[] })[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <DashboardLayout activePath="/team">
      <PageHeader
        title="Team"
        description="Artists currently in the studio"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Team' }]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : artists.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-8">No artists found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map(artist => {
            const details = artist.artist_details?.[0]
            return (
              <Card key={artist.id}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {artist.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">{artist.display_name || artist.full_name}</p>
                    {artist.specialties && artist.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {artist.specialties.map(s => (
                          <Badge key={s} variant="brand" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                    <Badge variant="success" className="mt-2">Active</Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  {artist.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Palette className="w-4 h-4 text-text-tertiary" />
                      @{artist.instagram_handle}
                    </div>
                  )}
                  {artist.email && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Mail className="w-4 h-4 text-text-tertiary" />
                      {artist.email}
                    </div>
                  )}
                  {artist.phone && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Phone className="w-4 h-4 text-text-tertiary" />
                      {artist.phone}
                    </div>
                  )}
                </div>

                {details && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-text-tertiary">
                      Chair {details.chair_number || '—'} · {details.commission_pct}% commission
                    </p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
