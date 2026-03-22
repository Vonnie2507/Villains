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
import { FileUpload } from '@/components/blocks/FileUpload'
import { Building, User, Bell, Palette, Shield, CreditCard } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import type { ThemeMode } from '@/hooks/useTheme'

const TABS = [
  { id: 'company', label: 'Company', icon: <Building className="w-4 h-4" /> },
  { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)
  const { mode, setMode } = useTheme()

  return (
    <DashboardLayout activePath="/settings">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      <SettingsLayout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'company' && (
          <FormPanel
            title="Company Information"
            description="Update your company details. This appears on quotes and invoices."
            actions={
              <>
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </>
            }
          >
            <FormRow label="Company Name" description="Your registered business name">
              <Input placeholder="e.g. ProBuild PVC Fencing" />
            </FormRow>
            <FormRow label="ABN">
              <Input placeholder="e.g. 12 345 678 901" />
            </FormRow>
            <FormRow label="Phone">
              <Input type="tel" placeholder="e.g. 08 1234 5678" />
            </FormRow>
            <FormRow label="Email">
              <Input type="email" placeholder="e.g. info@company.com.au" />
            </FormRow>
            <FormRow label="Address">
              <Textarea placeholder="Street address, suburb, state, postcode" />
            </FormRow>
            <FormRow label="Logo" description="Appears on quotes, invoices and the portal">
              <FileUpload accept="image/*" />
            </FormRow>
            <FormRow label="Timezone">
              <Select options={[
                { value: 'Australia/Perth', label: 'Perth (AWST)' },
                { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
                { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
              ]} />
            </FormRow>
          </FormPanel>
        )}

        {activeTab === 'profile' && (
          <FormPanel
            title="My Profile"
            actions={<><Button variant="outline">Cancel</Button><Button>Save</Button></>}
          >
            <FormRow label="Full Name">
              <Input placeholder="Your name" />
            </FormRow>
            <FormRow label="Email">
              <Input type="email" placeholder="your@email.com" />
            </FormRow>
            <FormRow label="Role">
              <Select options={[
                { value: 'admin', label: 'Admin' },
                { value: 'manager', label: 'Manager' },
                { value: 'staff', label: 'Staff' },
              ]} />
            </FormRow>
          </FormPanel>
        )}

        {activeTab === 'notifications' && (
          <FormPanel
            title="Notification Preferences"
            actions={<Button>Save Preferences</Button>}
          >
            <Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Email notifications" description="Receive email updates for new jobs, quotes and messages" />
            <Toggle checked={smsNotifs} onChange={setSmsNotifs} label="SMS notifications" description="Receive text messages for urgent updates" />
          </FormPanel>
        )}

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

        {activeTab === 'security' && (
          <FormPanel title="Security" actions={<Button>Update Password</Button>}>
            <FormRow label="Current Password"><Input type="password" /></FormRow>
            <FormRow label="New Password"><Input type="password" /></FormRow>
            <FormRow label="Confirm Password"><Input type="password" /></FormRow>
          </FormPanel>
        )}

        {activeTab === 'billing' && (
          <FormPanel title="Billing" description="Manage your subscription and payment method">
            <div className="p-8 text-center text-text-tertiary text-sm">
              Connect to Stripe or your payment provider here
            </div>
          </FormPanel>
        )}
      </SettingsLayout>
    </DashboardLayout>
  )
}
