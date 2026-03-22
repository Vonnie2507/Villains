'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { SettingsLayout } from '@/components/layouts/SettingsLayout'
import { FormPanel, FormRow } from '@/components/blocks/FormPanel'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'
import { Building, User, Bell, Palette, Shield } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'
import type { ThemeMode } from '@/hooks/useTheme'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

const TABS = [
  { id: 'company', label: 'Company', icon: <Building className="w-4 h-4" /> },
  { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
]

/* ─── Studio settings keys ─── */
const STUDIO_KEYS = ['studio_name', 'studio_phone', 'studio_email', 'studio_instagram', 'studio_address'] as const
type StudioKey = typeof STUDIO_KEYS[number]

const STUDIO_LABELS: Record<StudioKey, string> = {
  studio_name: 'Studio Name',
  studio_phone: 'Phone',
  studio_email: 'Email',
  studio_instagram: 'Instagram',
  studio_address: 'Address',
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const { toast } = useToast()
  const { user, profile, refreshProfile } = useAuth()
  const { mode, setMode } = useTheme()

  /* ─── Company state ─── */
  const [studio, setStudio] = useState<Record<StudioKey, string>>({
    studio_name: '',
    studio_phone: '',
    studio_email: '',
    studio_instagram: '',
    studio_address: '',
  })
  const [companyLoading, setCompanyLoading] = useState(false)
  const [companySaving, setCompanySaving] = useState(false)

  /* ─── Profile state ─── */
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  /* ─── Notifications state (UI only for now) ─── */
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)

  /* ─── Security state ─── */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [securitySaving, setSecuritySaving] = useState(false)

  /* ═══════════════════════════════════════════
     COMPANY — load from app_settings
     ═══════════════════════════════════════════ */
  const loadCompanySettings = useCallback(async () => {
    setCompanyLoading(true)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('category', 'studio')
        .in('key', [...STUDIO_KEYS])

      if (error) throw error

      if (data) {
        const mapped = { ...studio }
        data.forEach((row: { key: string; value: string }) => {
          if (STUDIO_KEYS.includes(row.key as StudioKey)) {
            mapped[row.key as StudioKey] = row.value ?? ''
          }
        })
        setStudio(mapped)
      }
    } catch (err) {
      console.error('Failed to load studio settings:', err)
    } finally {
      setCompanyLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadCompanySettings()
  }, [loadCompanySettings])

  const saveCompanySettings = async () => {
    setCompanySaving(true)
    try {
      // Upsert each key individually
      for (const key of STUDIO_KEYS) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { category: 'studio', key, value: studio[key], label: STUDIO_LABELS[key] },
            { onConflict: 'category,key' }
          )
        if (error) throw error
      }
      toast.success('Studio settings saved')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      toast.error(message)
    } finally {
      setCompanySaving(false)
    }
  }

  /* ═══════════════════════════════════════════
     PROFILE — load from profiles table
     ═══════════════════════════════════════════ */
  const loadProfile = useCallback(async () => {
    if (!user) return
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, display_name, phone, bio')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setFullName(data.full_name ?? '')
        setDisplayName(data.display_name ?? '')
        setPhone(data.phone ?? '')
        setBio(data.bio ?? '')
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setProfileLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) loadProfile()
  }, [user, loadProfile])

  const saveProfile = async () => {
    if (!user) return
    setProfileSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          display_name: displayName,
          phone,
          bio,
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      toast.success('Profile updated')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      toast.error(message)
    } finally {
      setProfileSaving(false)
    }
  }

  /* ═══════════════════════════════════════════
     SECURITY — password change
     ═══════════════════════════════════════════ */
  const changePassword = async () => {
    if (!newPassword) {
      toast.error('Please enter a new password')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSecuritySaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password'
      toast.error(message)
    } finally {
      setSecuritySaving(false)
    }
  }

  /* ═══════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════ */
  const updateStudioField = (key: StudioKey, value: string) => {
    setStudio(prev => ({ ...prev, [key]: value }))
  }

  return (
    <DashboardLayout activePath="/settings">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <SettingsLayout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        {/* ─── Company ─── */}
        {activeTab === 'company' && (
          <FormPanel
            title="Studio Information"
            description="Update your studio details. This appears on quotes and invoices."
            actions={
              <>
                <Button variant="outline" onClick={loadCompanySettings} disabled={companySaving}>
                  Cancel
                </Button>
                <Button onClick={saveCompanySettings} loading={companySaving}>
                  Save Changes
                </Button>
              </>
            }
          >
            {companyLoading ? (
              <p className="text-sm text-text-secondary">Loading...</p>
            ) : (
              <>
                <FormRow label="Studio Name" description="Your registered business name">
                  <Input
                    placeholder="e.g. Villains Tattoo"
                    value={studio.studio_name}
                    onChange={e => updateStudioField('studio_name', e.target.value)}
                  />
                </FormRow>
                <FormRow label="Phone">
                  <Input
                    type="tel"
                    placeholder="e.g. 08 1234 5678"
                    value={studio.studio_phone}
                    onChange={e => updateStudioField('studio_phone', e.target.value)}
                  />
                </FormRow>
                <FormRow label="Email">
                  <Input
                    type="email"
                    placeholder="e.g. info@villains.com.au"
                    value={studio.studio_email}
                    onChange={e => updateStudioField('studio_email', e.target.value)}
                  />
                </FormRow>
                <FormRow label="Instagram">
                  <Input
                    placeholder="e.g. @villainstattoo"
                    value={studio.studio_instagram}
                    onChange={e => updateStudioField('studio_instagram', e.target.value)}
                  />
                </FormRow>
                <FormRow label="Address">
                  <Textarea
                    placeholder="Street address, suburb, state, postcode"
                    value={studio.studio_address}
                    onChange={e => updateStudioField('studio_address', e.target.value)}
                  />
                </FormRow>
              </>
            )}
          </FormPanel>
        )}

        {/* ─── Profile ─── */}
        {activeTab === 'profile' && (
          <FormPanel
            title="My Profile"
            actions={
              <>
                <Button variant="outline" onClick={loadProfile} disabled={profileSaving}>
                  Cancel
                </Button>
                <Button onClick={saveProfile} loading={profileSaving}>
                  Save
                </Button>
              </>
            }
          >
            {profileLoading ? (
              <p className="text-sm text-text-secondary">Loading...</p>
            ) : (
              <>
                <FormRow label="Email">
                  <Input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    hint="Email is managed through authentication and cannot be changed here"
                  />
                </FormRow>
                <FormRow label="Full Name">
                  <Input
                    placeholder="Your full name"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                  />
                </FormRow>
                <FormRow label="Display Name" description="How your name appears to others">
                  <Input
                    placeholder="e.g. Vonnie"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </FormRow>
                <FormRow label="Phone">
                  <Input
                    type="tel"
                    placeholder="e.g. 0412 345 678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </FormRow>
                <FormRow label="Bio">
                  <Textarea
                    placeholder="A short bio about yourself"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                </FormRow>
                <FormRow label="Role">
                  <Input
                    value={profile?.role ?? ''}
                    disabled
                    hint="Role is managed by an admin"
                  />
                </FormRow>
              </>
            )}
          </FormPanel>
        )}

        {/* ─── Notifications (UI only) ─── */}
        {activeTab === 'notifications' && (
          <FormPanel
            title="Notification Preferences"
            description="These preferences are stored locally for now."
            actions={<Button disabled>Save Preferences</Button>}
          >
            <Toggle
              checked={emailNotifs}
              onChange={setEmailNotifs}
              label="Email notifications"
              description="Receive email updates for new bookings and messages"
            />
            <Toggle
              checked={smsNotifs}
              onChange={setSmsNotifs}
              label="SMS notifications"
              description="Receive text messages for urgent updates"
            />
          </FormPanel>
        )}

        {/* ─── Appearance ─── */}
        {activeTab === 'appearance' && (
          <FormPanel title="Appearance" description="Customise how the app looks">
            <FormRow label="Theme" description="Choose light or dark mode. Changes apply instantly.">
              <Select
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                  { value: 'system', label: 'System' },
                ]}
                value={mode}
                onChange={e => setMode(e.target.value as ThemeMode)}
              />
            </FormRow>
          </FormPanel>
        )}

        {/* ─── Security ─── */}
        {activeTab === 'security' && (
          <FormPanel
            title="Security"
            actions={
              <Button onClick={changePassword} loading={securitySaving}>
                Update Password
              </Button>
            }
          >
            <FormRow label="Current Password">
              <Input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </FormRow>
            <FormRow label="New Password">
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </FormRow>
            <FormRow label="Confirm Password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </FormRow>
          </FormPanel>
        )}
      </SettingsLayout>
    </DashboardLayout>
  )
}
