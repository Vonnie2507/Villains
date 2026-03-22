'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import type { Profile, ArtistProfile, StaffRecord } from '@/types'
import { Palette, Mail, Phone, UserPlus, Eye, UserX, Pencil, Instagram } from 'lucide-react'

type StaffMember = Profile & { artist_profiles?: ArtistProfile[]; staff_records?: StaffRecord[] }

import { createClient } from '@supabase/supabase-js'

// Separate client for invite — prevents logging out current user
function createInviteClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export default function TeamPage() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteRole, setInviteRole] = useState<'artist' | 'admin'>('artist')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    display_name: '',
    seat: '',
    instagram: '',
    password: '',
  })

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    display_name: '',
    phone: '',
    artist_display_name: '',
    seat: '',
    instagram: '',
    specialties: '',
    artist_notes: '',
    dob: '',
    address: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    start_date: '',
    staff_notes: '',
    staff_phone: '',
  })

  const loadStaff = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*, artist_profiles(*), staff_records(*)')
      .order('full_name')

    setStaff((data || []) as StaffMember[])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  // ── Invite handler ──
  async function handleInvite() {
    if (!inviteForm.email || !inviteForm.full_name) {
      toast.error('Email and Full Name are required')
      return
    }
    if (!inviteForm.password || inviteForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setInviteLoading(true)

    try {
      // Use a separate client so we don't log out the current admin
      const inviteClient = createInviteClient()

      // 1. Create the auth user
      const { data: signUpData, error: signUpError } = await inviteClient.auth.signUp({
        email: inviteForm.email,
        password: inviteForm.password,
        options: {
          data: {
            full_name: inviteForm.full_name,
            role: inviteRole,
          },
        },
      })

      if (signUpError) {
        toast.error(`Failed: ${signUpError.message}`)
        setInviteLoading(false)
        return
      }

      const newUserId = signUpData.user?.id
      if (!newUserId) {
        toast.error('User created but no ID returned')
        setInviteLoading(false)
        return
      }

      // 2. Wait for the trigger to create the profile row
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Update the profile with correct role
      await supabase
        .from('profiles')
        .update({
          full_name: inviteForm.full_name,
          display_name: inviteForm.display_name || null,
          role: inviteRole,
          is_active: true,
        })
        .eq('id', newUserId)

      // 3. If artist, create artist_profiles row
      if (inviteRole === 'artist') {
        await supabase
          .from('artist_profiles')
          .insert({
            user_id: newUserId,
            display_name: inviteForm.display_name || inviteForm.full_name,
            seat_name_or_number: inviteForm.seat || null,
            instagram_handle: inviteForm.instagram || null,
            specialties: [],
            default_working_days: {},
          })
      }

      // Sign out the invite client session (cleanup)
      await inviteClient.auth.signOut()

      // Success
      toast.success(
        `${inviteRole === 'artist' ? 'Artist' : 'Staff'} created! They can log in with: ${inviteForm.email}`
      )
      toast.info(`Tell ${inviteForm.full_name} to sign in with: ${inviteForm.email}`)

      // Reset and close
      setInviteForm({ email: '', full_name: '', display_name: '', seat: '', instagram: '', password: '' })
      setInviteOpen(false)
      await loadStaff()
    } catch (err) {
      toast.error('Unexpected error creating user')
      console.error(err)
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Open detail modal ──
  function openDetail(member: StaffMember) {
    setSelectedMember(member)
    setDetailOpen(true)
  }

  // ── Open edit modal ──
  function openEdit(member: StaffMember) {
    const ap = member.artist_profiles?.[0]
    const sr = member.staff_records?.[0]

    setEditForm({
      full_name: member.full_name || '',
      display_name: member.display_name || '',
      phone: member.phone || '',
      artist_display_name: ap?.display_name || '',
      seat: ap?.seat_name_or_number || '',
      instagram: ap?.instagram_handle || '',
      specialties: ap?.specialties?.join(', ') || '',
      artist_notes: ap?.notes || '',
      dob: sr?.date_of_birth || '',
      address: sr?.address || '',
      next_of_kin_name: sr?.next_of_kin_name || '',
      next_of_kin_phone: sr?.next_of_kin_phone || '',
      start_date: sr?.start_date || '',
      staff_notes: sr?.notes || '',
      staff_phone: sr?.phone || '',
    })
    setSelectedMember(member)
    setDetailOpen(false)
    setEditOpen(true)
  }

  // ── Save edits ──
  async function handleSaveEdit() {
    if (!selectedMember) return
    setEditLoading(true)

    try {
      // Update profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          display_name: editForm.display_name || null,
          phone: editForm.phone || null,
        })
        .eq('id', selectedMember.id)

      if (profileErr) {
        toast.error(`Profile update failed: ${profileErr.message}`)
        setEditLoading(false)
        return
      }

      // Update artist_profiles if they have one
      const ap = selectedMember.artist_profiles?.[0]
      if (ap) {
        const specialtiesArray = editForm.specialties
          ? editForm.specialties.split(',').map(s => s.trim()).filter(Boolean)
          : []

        await supabase
          .from('artist_profiles')
          .update({
            display_name: editForm.artist_display_name || null,
            seat_name_or_number: editForm.seat || null,
            instagram_handle: editForm.instagram || null,
            specialties: specialtiesArray,
            notes: editForm.artist_notes || null,
          })
          .eq('id', ap.id)
      }

      // Upsert staff_records
      const sr = selectedMember.staff_records?.[0]
      const staffData = {
        user_id: selectedMember.id,
        date_of_birth: editForm.dob || null,
        phone: editForm.staff_phone || null,
        address: editForm.address || null,
        next_of_kin_name: editForm.next_of_kin_name || null,
        next_of_kin_phone: editForm.next_of_kin_phone || null,
        start_date: editForm.start_date || null,
        notes: editForm.staff_notes || null,
      }

      if (sr) {
        await supabase.from('staff_records').update(staffData).eq('id', sr.id)
      } else {
        await supabase.from('staff_records').insert(staffData)
      }

      toast.success('Staff record updated')
      setEditOpen(false)
      await loadStaff()
    } catch (err) {
      toast.error('Failed to save changes')
      console.error(err)
    } finally {
      setEditLoading(false)
    }
  }

  // ── Deactivate ──
  async function handleDeactivate(member: StaffMember) {
    const confirmed = window.confirm(`Deactivate ${member.full_name}? They will no longer appear in active staff.`)
    if (!confirmed) return

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', member.id)

    if (error) {
      toast.error(`Failed to deactivate: ${error.message}`)
    } else {
      toast.success(`${member.full_name} has been deactivated`)
      setDetailOpen(false)
      await loadStaff()
    }
  }

  // ── Reactivate ──
  async function handleReactivate(member: StaffMember) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', member.id)

    if (error) {
      toast.error(`Failed to reactivate: ${error.message}`)
    } else {
      toast.success(`${member.full_name} has been reactivated`)
      setDetailOpen(false)
      await loadStaff()
    }
  }

  // ── Invite modal opener helpers ──
  function openInviteArtist() {
    setInviteRole('artist')
    setInviteForm({ email: '', full_name: '', display_name: '', seat: '', instagram: '', password: '' })
    setInviteOpen(true)
  }

  function openInviteReception() {
    setInviteRole('admin')
    setInviteForm({ email: '', full_name: '', display_name: '', seat: '', instagram: '', password: '' })
    setInviteOpen(true)
  }

  const activeStaff = staff.filter(m => m.is_active)
  const inactiveStaff = staff.filter(m => !m.is_active)

  return (
    <DashboardLayout activePath="/team">
      <PageHeader
        title="Staff Management"
        description="Manage staff profiles and onboarding"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Staff' }]}
        actions={
          isAdmin ? (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={openInviteArtist}
              >
                Invite Artist
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={openInviteReception}
              >
                Add Reception Staff
              </Button>
            </>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeStaff.length === 0 && inactiveStaff.length === 0 ? (
        <Card>
          <p className="text-center text-text-secondary py-8">No staff found</p>
        </Card>
      ) : (
        <>
          {/* Active Staff */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStaff.map(member => (
              <StaffCard key={member.id} member={member} onClick={() => openDetail(member)} />
            ))}
          </div>

          {/* Inactive Staff */}
          {inactiveStaff.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-text-tertiary uppercase tracking-wider mb-4">
                Inactive Staff ({inactiveStaff.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inactiveStaff.map(member => (
                  <StaffCard key={member.id} member={member} onClick={() => openDetail(member)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Invite Modal ── */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={inviteRole === 'artist' ? 'Invite New Artist' : 'Add Reception Staff'}
        description={
          inviteRole === 'artist'
            ? 'Create an account for a new tattoo artist'
            : 'Create an account for reception / admin staff'
        }
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="artist@example.com"
            value={inviteForm.email}
            onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
            hint="They will sign in with this email"
          />
          <Input
            label="Full Name"
            placeholder="Jane Smith"
            value={inviteForm.full_name}
            onChange={(e) => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
          />
          <Input
            label="Display Name"
            placeholder="What they go by in the studio (optional)"
            value={inviteForm.display_name}
            onChange={(e) => setInviteForm(f => ({ ...f, display_name: e.target.value }))}
          />
          {inviteRole === 'artist' && (
            <>
              <Input
                label="Seat Number"
                placeholder="e.g. Seat 3 (optional)"
                value={inviteForm.seat}
                onChange={(e) => setInviteForm(f => ({ ...f, seat: e.target.value }))}
              />
              <Input
                label="Instagram Handle"
                placeholder="e.g. inkmaster (no @ sign)"
                value={inviteForm.instagram}
                onChange={(e) => setInviteForm(f => ({ ...f, instagram: e.target.value }))}
                icon={<Instagram className="w-4 h-4" />}
              />
            </>
          )}

          <Input
            label="Password"
            type="password"
            placeholder="Set a password for them (min 6 characters)"
            value={inviteForm.password}
            onChange={(e) => setInviteForm(f => ({ ...f, password: e.target.value }))}
            hint="Give this to the artist so they can log in"
          />

          <div className="p-3 rounded-xl bg-surface-tertiary border border-border text-xs text-text-secondary">
            The {inviteRole === 'artist' ? 'artist' : 'staff member'} will log in with their email and this password.
            They can change it later in Settings.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={inviteLoading}
              onClick={handleInvite}
            >
              {inviteRole === 'artist' ? 'Create Artist Account' : 'Create Staff Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedMember?.full_name || 'Staff Details'}
        size="lg"
      >
        {selectedMember && (
          <DetailView
            member={selectedMember}
            isAdmin={isAdmin}
            onEdit={() => openEdit(selectedMember)}
            onDeactivate={() => handleDeactivate(selectedMember)}
            onReactivate={() => handleReactivate(selectedMember)}
          />
        )}
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit — ${selectedMember?.full_name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Profile Section */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
              />
              <Input
                label="Display Name"
                value={editForm.display_name}
                onChange={(e) => setEditForm(f => ({ ...f, display_name: e.target.value }))}
              />
              <Input
                label="Phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Artist Section (only if artist) */}
          {selectedMember?.artist_profiles?.[0] && (
            <div>
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Artist Profile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Artist Display Name"
                  value={editForm.artist_display_name}
                  onChange={(e) => setEditForm(f => ({ ...f, artist_display_name: e.target.value }))}
                />
                <Input
                  label="Seat"
                  value={editForm.seat}
                  onChange={(e) => setEditForm(f => ({ ...f, seat: e.target.value }))}
                />
                <Input
                  label="Instagram"
                  value={editForm.instagram}
                  onChange={(e) => setEditForm(f => ({ ...f, instagram: e.target.value }))}
                  icon={<Instagram className="w-4 h-4" />}
                />
                <Input
                  label="Specialties"
                  value={editForm.specialties}
                  placeholder="e.g. Realism, Traditional, Colour"
                  hint="Comma-separated"
                  onChange={(e) => setEditForm(f => ({ ...f, specialties: e.target.value }))}
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Artist Notes"
                  value={editForm.artist_notes}
                  onChange={(e) => setEditForm(f => ({ ...f, artist_notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* HR / Staff Record Section */}
          <div>
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">HR Record</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date of Birth"
                type="date"
                value={editForm.dob}
                onChange={(e) => setEditForm(f => ({ ...f, dob: e.target.value }))}
              />
              <Input
                label="Start Date"
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm(f => ({ ...f, start_date: e.target.value }))}
              />
              <Input
                label="HR Phone"
                value={editForm.staff_phone}
                onChange={(e) => setEditForm(f => ({ ...f, staff_phone: e.target.value }))}
              />
              <Input
                label="Next of Kin Name"
                value={editForm.next_of_kin_name}
                onChange={(e) => setEditForm(f => ({ ...f, next_of_kin_name: e.target.value }))}
              />
              <Input
                label="Next of Kin Phone"
                value={editForm.next_of_kin_phone}
                onChange={(e) => setEditForm(f => ({ ...f, next_of_kin_phone: e.target.value }))}
              />
            </div>
            <div className="mt-4 space-y-4">
              <Input
                label="Address"
                value={editForm.address}
                onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
              />
              <Textarea
                label="HR Notes"
                value={editForm.staff_notes}
                onChange={(e) => setEditForm(f => ({ ...f, staff_notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={editLoading} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

/* ── Staff Card Component ── */
function StaffCard({ member, onClick }: { member: StaffMember; onClick: () => void }) {
  const artistProfile = member.artist_profiles?.[0]
  const staffRecord = member.staff_records?.[0]
  const isArtist = member.role === 'artist'

  return (
    <Card className="cursor-pointer hover:border-brand-500/30 transition-colors" onClick={onClick}>
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
            {!member.is_active && (
              <Badge variant="error">Inactive</Badge>
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
}

/* ── Detail View Component ── */
function DetailView({
  member,
  isAdmin,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  member: StaffMember
  isAdmin: boolean
  onEdit: () => void
  onDeactivate: () => void
  onReactivate: () => void
}) {
  const ap = member.artist_profiles?.[0]
  const sr = member.staff_records?.[0]
  const isArtist = member.role === 'artist'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <p className="text-lg font-semibold text-text-primary">{member.full_name}</p>
          <div className="flex gap-1.5 mt-1">
            <Badge variant={isArtist ? 'brand' : 'info'}>
              {member.role === 'super_admin' ? 'Owner' : member.role === 'admin' ? 'Reception' : 'Artist'}
            </Badge>
            <Badge variant={member.is_active ? 'success' : 'error'} dot>
              {member.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div>
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Profile</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <DetailRow label="Email" value={member.email} />
          <DetailRow label="Display Name" value={member.display_name} />
          <DetailRow label="Phone" value={member.phone} />
        </div>
      </div>

      {/* Artist Info */}
      {ap && (
        <div>
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Artist Profile</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <DetailRow label="Artist Name" value={ap.display_name} />
            <DetailRow label="Seat" value={ap.seat_name_or_number} />
            <DetailRow label="Instagram" value={ap.instagram_handle ? `@${ap.instagram_handle}` : null} />
            <DetailRow label="Specialties" value={ap.specialties?.join(', ') || null} />
            {ap.notes && <DetailRow label="Notes" value={ap.notes} />}
          </div>
        </div>
      )}

      {/* HR Info */}
      <div>
        <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">HR Record</h3>
        {sr ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <DetailRow label="Date of Birth" value={sr.date_of_birth} />
            <DetailRow label="Start Date" value={sr.start_date} />
            <DetailRow label="Phone (HR)" value={sr.phone} />
            <DetailRow label="Address" value={sr.address} />
            <DetailRow label="Next of Kin" value={sr.next_of_kin_name} />
            <DetailRow label="Kin Phone" value={sr.next_of_kin_phone} />
            {sr.notes && <DetailRow label="Notes" value={sr.notes} />}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">No HR record on file yet</p>
        )}
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          {member.is_active ? (
            <Button variant="danger" size="sm" icon={<UserX className="w-4 h-4" />} onClick={onDeactivate}>
              Deactivate
            </Button>
          ) : (
            <Button variant="secondary" size="sm" icon={<Eye className="w-4 h-4" />} onClick={onReactivate}>
              Reactivate
            </Button>
          )}
          <Button variant="primary" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={onEdit}>
            Edit Details
          </Button>
        </div>
      )}
    </div>
  )
}

/* ── Detail Row helper ── */
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-text-tertiary">{label}:</span>{' '}
      <span className="text-text-primary">{value || '—'}</span>
    </div>
  )
}
