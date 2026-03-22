'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import {
  Inbox, Clock, UserCheck, Send, Plus, Search, X, ChevronRight, AlertTriangle,
} from 'lucide-react'
import type {
  ClientProfile, ClientStage, ClientSource, ClientPriority, HandoffStatus,
  ArtistProfile,
} from '@/types'
import {
  CLIENT_STAGE_OPTIONS, CLIENT_STAGE_COLOURS, CLIENT_SOURCE_OPTIONS,
  CLIENT_PRIORITY_OPTIONS,
} from '@/types'

/* ── HELPERS ── */

const STAGE_BADGE_VARIANT: Record<ClientStage, 'brand' | 'warning' | 'info' | 'default' | 'success'> = {
  new_enquiry: 'brand',
  waiting_for_reply: 'warning',
  chatting: 'info',
  waiting_for_artist: 'default',
  artist_sent_booking_link: 'info',
  booked_with_artist: 'success',
}

const SOURCE_LABELS: Record<ClientSource, string> = {
  instagram_dm: 'Instagram',
  facebook_message: 'Facebook',
  email: 'Email',
  web_form: 'Web Form',
  phone_call: 'Phone',
  walk_in: 'Walk-in',
  other: 'Other',
}

const PRIORITY_VARIANT: Record<ClientPriority, 'default' | 'warning' | 'error'> = {
  low: 'default',
  normal: 'warning',
  high: 'error',
}

function hoursAgo(dateStr: string | null): number {
  if (!dateStr) return Infinity
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
}

function stageLabel(stage: ClientStage): string {
  return CLIENT_STAGE_OPTIONS.find(o => o.value === stage)?.label ?? stage
}

/* ── MAIN PAGE ── */

export default function EnquiriesPage() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  /* ── DATA STATE ── */
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [artists, setArtists] = useState<ArtistProfile[]>([])
  const [loading, setLoading] = useState(true)

  /* ── FILTER STATE ── */
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterArtist, setFilterArtist] = useState('')

  /* ── MODAL STATE ── */
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null)

  /* ── CREATE FORM STATE ── */
  const [newName, setNewName] = useState('')
  const [newSource, setNewSource] = useState<string>('')
  const [newPriority, setNewPriority] = useState<string>('normal')
  const [newNotes, setNewNotes] = useState('')
  const [newTags, setNewTags] = useState('')
  const [creating, setCreating] = useState(false)

  /* ── ASSIGN FORM STATE ── */
  const [assignArtistId, setAssignArtistId] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigning, setAssigning] = useState(false)

  /* ── FETCH DATA ── */

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*, artist_profile:artist_id(id, user_id, display_name), current_artist_owner:current_artist_owner_id(id, user_id, display_name)')
      .in('status', ['lead', 'active_client'])
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load enquiries')
      console.error(error)
    } else {
      setClients((data ?? []) as ClientProfile[])
    }
  }, [toast])

  const fetchArtists = useCallback(async () => {
    const { data, error } = await supabase
      .from('artist_profiles')
      .select('id, user_id, display_name')
      .order('display_name')

    if (error) console.error(error)
    else setArtists((data ?? []) as ArtistProfile[])
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchClients(), fetchArtists()])
      setLoading(false)
    }
    init()
  }, [fetchClients, fetchArtists])

  /* ── FILTERED + STATS ── */

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (searchTerm && !c.display_name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (filterStage && c.stage !== filterStage) return false
      if (filterSource && c.source !== filterSource) return false
      if (filterPriority && c.priority !== filterPriority) return false
      if (filterArtist && c.current_artist_owner_id !== filterArtist) return false
      return true
    })
  }, [clients, searchTerm, filterStage, filterSource, filterPriority, filterArtist])

  const stats = useMemo(() => ({
    total: clients.length,
    newEnquiry: clients.filter(c => c.stage === 'new_enquiry').length,
    waitingReply: clients.filter(c => c.stage === 'waiting_for_reply').length,
    waitingArtist: clients.filter(c => c.stage === 'waiting_for_artist').length,
    sentToArtist: clients.filter(c => c.stage === 'artist_sent_booking_link' || c.stage === 'booked_with_artist').length,
  }), [clients])

  /* ── SLA BORDER ── */

  function slaBorder(c: ClientProfile): string {
    if ((c.stage === 'new_enquiry' || c.stage === 'waiting_for_reply') && hoursAgo(c.created_at) > 24) {
      return 'border-l-4 border-l-status-error'
    }
    if (c.stage === 'waiting_for_artist' && hoursAgo(c.last_contacted_at) > 24) {
      return 'border-l-4 border-l-status-warning'
    }
    return ''
  }

  /* ── CREATE ENQUIRY ── */

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error('Display name is required')
      return
    }
    setCreating(true)
    const payload: Record<string, unknown> = {
      display_name: newName.trim(),
      status: 'lead' as const,
      stage: 'new_enquiry' as const,
      priority: newPriority || 'normal',
      handoff_status: 'not_assigned' as const,
      tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }
    if (newSource) payload.source = newSource
    if (newNotes.trim()) payload.notes = newNotes.trim()

    const { error } = await supabase.from('client_profiles').insert(payload)
    setCreating(false)

    if (error) {
      toast.error('Failed to create enquiry')
      console.error(error)
    } else {
      toast.success('Enquiry created')
      setCreateOpen(false)
      resetCreateForm()
      await fetchClients()
    }
  }

  function resetCreateForm() {
    setNewName('')
    setNewSource('')
    setNewPriority('normal')
    setNewNotes('')
    setNewTags('')
  }

  /* ── ASSIGN TO ARTIST ── */

  function openAssign(client: ClientProfile) {
    setSelectedClient(client)
    setAssignArtistId(client.current_artist_owner_id ?? '')
    setAssignNote('')
    setAssignOpen(true)
  }

  async function handleAssign() {
    if (!selectedClient || !assignArtistId) {
      toast.error('Select an artist')
      return
    }
    setAssigning(true)
    const update: Record<string, unknown> = {
      current_artist_owner_id: assignArtistId,
      handoff_status: 'assigned_to_artist' as HandoffStatus,
      stage: 'waiting_for_artist' as ClientStage,
      last_contacted_at: new Date().toISOString(),
    }
    if (assignNote.trim()) {
      update.notes = selectedClient.notes
        ? `${selectedClient.notes}\n---\nHandoff note: ${assignNote.trim()}`
        : `Handoff note: ${assignNote.trim()}`
    }

    const { error } = await supabase
      .from('client_profiles')
      .update(update)
      .eq('id', selectedClient.id)

    setAssigning(false)
    if (error) {
      toast.error('Failed to assign artist')
      console.error(error)
    } else {
      toast.success(`Assigned to artist`)
      setAssignOpen(false)
      await fetchClients()
    }
  }

  /* ── DETAIL VIEW ── */

  function openDetail(client: ClientProfile) {
    setSelectedClient(client)
    setDetailOpen(true)
  }

  /* ── ARTIST NAME HELPER ── */

  function artistName(id: string | null): string {
    if (!id) return 'Unassigned'
    const a = artists.find(a => a.id === id)
    return a?.display_name ?? 'Unknown'
  }

  /* ── ARTIST OPTIONS FOR DROPDOWNS ── */

  const artistOptions = artists.map(a => ({
    value: a.id,
    label: a.display_name ?? 'Unnamed Artist',
  }))

  /* ── RENDER ── */

  return (
    <DashboardLayout activePath="/enquiries">
      <PageHeader
        title="Enquiries & Handoffs"
        description="Manage incoming enquiries and pass them to artists."
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            New Enquiry
          </Button>
        }
      />

      {/* ── PRIVACY BANNER ── */}
      <div className="mb-6 px-4 py-3 rounded-lg bg-status-warning-50 border border-status-warning/20 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-status-warning-700 shrink-0 mt-0.5" />
        <p className="text-sm text-status-warning-700">
          Contact details belong to the artist. Villains only manages enquiries and hand-offs. Only artists can see full client contact info.
        </p>
      </div>

      {/* ── STAT CARDS ── */}
      <StatGrid className="mb-6">
        <StatCard title="Total Enquiries" value={stats.total} icon={<Inbox className="w-5 h-5" />} />
        <StatCard title="New Enquiries" value={stats.newEnquiry} icon={<Plus className="w-5 h-5" />} />
        <StatCard title="Waiting for Reply" value={stats.waitingReply} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Waiting for Artist" value={stats.waitingArtist} icon={<UserCheck className="w-5 h-5" />} />
        <StatCard title="Sent to Artist" value={stats.sentToArtist} icon={<Send className="w-5 h-5" />} />
      </StatGrid>

      {/* ── FILTERS ── */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
          <Select
            options={CLIENT_STAGE_OPTIONS}
            placeholder="All Stages"
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
          />
          <Select
            options={CLIENT_SOURCE_OPTIONS}
            placeholder="All Sources"
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
          />
          <Select
            options={CLIENT_PRIORITY_OPTIONS}
            placeholder="All Priorities"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
          />
          <Select
            options={artistOptions}
            placeholder="All Artists"
            value={filterArtist}
            onChange={e => setFilterArtist(e.target.value)}
          />
        </div>
        {(searchTerm || filterStage || filterSource || filterPriority || filterArtist) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-text-secondary">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => { setSearchTerm(''); setFilterStage(''); setFilterSource(''); setFilterPriority(''); setFilterArtist('') }}
              className="text-sm text-brand-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </Card>

      {/* ── TABLE ── */}
      <Card padding={false}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No enquiries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-tertiary/50">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Assigned Artist</th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">Last Contact</th>
                  <th className="text-right px-4 py-3 font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => (
                  <tr
                    key={client.id}
                    className={`border-b border-border hover:bg-surface-tertiary/30 cursor-pointer transition-colors ${slaBorder(client)}`}
                    onClick={() => openDetail(client)}
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {client.display_name}
                    </td>
                    <td className="px-4 py-3">
                      {client.source ? (
                        <Badge variant="info">{SOURCE_LABELS[client.source]}</Badge>
                      ) : (
                        <span className="text-text-tertiary">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_VARIANT[client.priority]} dot>
                        {client.priority.charAt(0).toUpperCase() + client.priority.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STAGE_BADGE_VARIANT[client.stage]}>
                        {stageLabel(client.stage)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {artistName(client.current_artist_owner_id)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {client.last_contacted_at ? formatDateTime(client.last_contacted_at) : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssign(client)}
                        >
                          Assign
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<ChevronRight className="w-4 h-4" />}
                          onClick={() => openDetail(client)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── CREATE ENQUIRY MODAL ── */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm() }} title="New Enquiry" description="Create a new client enquiry to track and hand off.">
        <div className="space-y-4">
          <Input
            label="Display Name"
            placeholder="e.g. Sarah M"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            required
          />
          <Select
            label="Source"
            options={CLIENT_SOURCE_OPTIONS}
            placeholder="Select source..."
            value={newSource}
            onChange={e => setNewSource(e.target.value)}
          />
          <Select
            label="Priority"
            options={CLIENT_PRIORITY_OPTIONS}
            value={newPriority}
            onChange={e => setNewPriority(e.target.value)}
          />
          <Textarea
            label="Notes"
            placeholder="What are they after? Style, placement, size..."
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
          />
          <Input
            label="Tags"
            placeholder="Comma-separated, e.g. sleeve, colour, large"
            value={newTags}
            onChange={e => setNewTags(e.target.value)}
            hint="Separate tags with commas"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Create Enquiry
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── ASSIGN ARTIST MODAL ── */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign to Artist" description={selectedClient ? `Hand off "${selectedClient.display_name}" to an artist.` : ''}>
        <div className="space-y-4">
          <Select
            label="Artist"
            options={artistOptions}
            placeholder="Select artist..."
            value={assignArtistId}
            onChange={e => setAssignArtistId(e.target.value)}
          />
          <Textarea
            label="Handoff Note (optional)"
            placeholder="Any context for the artist..."
            value={assignNote}
            onChange={e => setAssignNote(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} loading={assigning}>
              Assign Artist
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── DETAIL PANEL MODAL ── */}
      <Modal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedClient(null) }}
        title={selectedClient?.display_name ?? 'Enquiry Details'}
        size="lg"
      >
        {selectedClient && (
          <div className="space-y-6">
            {/* Status row */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={STAGE_BADGE_VARIANT[selectedClient.stage]}>
                {stageLabel(selectedClient.stage)}
              </Badge>
              <Badge variant={PRIORITY_VARIANT[selectedClient.priority]} dot>
                {selectedClient.priority.charAt(0).toUpperCase() + selectedClient.priority.slice(1)} Priority
              </Badge>
              {selectedClient.source && (
                <Badge variant="info">{SOURCE_LABELS[selectedClient.source]}</Badge>
              )}
              <Badge variant={selectedClient.handoff_status === 'not_assigned' ? 'warning' : selectedClient.handoff_status === 'assigned_to_artist' ? 'info' : 'success'}>
                {selectedClient.handoff_status === 'not_assigned' ? 'Not Assigned' : selectedClient.handoff_status === 'assigned_to_artist' ? 'Assigned to Artist' : 'Booked with Artist'}
              </Badge>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Assigned Artist</p>
                <p className="text-sm text-text-primary">{artistName(selectedClient.current_artist_owner_id)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Created</p>
                <p className="text-sm text-text-primary">{formatDateTime(selectedClient.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Last Contacted</p>
                <p className="text-sm text-text-primary">{selectedClient.last_contacted_at ? formatDateTime(selectedClient.last_contacted_at) : '--'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-1">Last Customer Reply</p>
                <p className="text-sm text-text-primary">{selectedClient.last_customer_reply_at ? formatDateTime(selectedClient.last_customer_reply_at) : '--'}</p>
              </div>
            </div>

            {/* Contact info — admin only, hidden once booked */}
            {isAdmin && selectedClient.stage !== 'booked_with_artist' && (
              <div className="p-4 rounded-lg bg-surface-tertiary border border-border">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">Contact Details (Admin Only)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-text-tertiary">Phone: </span>
                    <span className="text-text-primary">{selectedClient.phone || '--'}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Email: </span>
                    <span className="text-text-primary">{selectedClient.email || '--'}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary">Instagram: </span>
                    <span className="text-text-primary">{selectedClient.instagram_handle ? `@${selectedClient.instagram_handle}` : '--'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SLA warning */}
            {((selectedClient.stage === 'new_enquiry' || selectedClient.stage === 'waiting_for_reply') && hoursAgo(selectedClient.created_at) > 24) && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-status-error-50 border border-status-error/20">
                <AlertTriangle className="w-4 h-4 text-status-error-700 shrink-0" />
                <p className="text-sm text-status-error-700">
                  This enquiry is over 24 hours old and still in the {stageLabel(selectedClient.stage).toLowerCase()} stage. Follow up ASAP.
                </p>
              </div>
            )}
            {(selectedClient.stage === 'waiting_for_artist' && hoursAgo(selectedClient.last_contacted_at) > 24) && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-status-warning-50 border border-status-warning/20">
                <AlertTriangle className="w-4 h-4 text-status-warning-700 shrink-0" />
                <p className="text-sm text-status-warning-700">
                  Assigned artist has not responded in over 24 hours. Check in with them.
                </p>
              </div>
            )}

            {/* Notes */}
            {selectedClient.notes && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">Notes</p>
                <div className="text-sm text-text-primary whitespace-pre-wrap p-3 rounded-lg bg-surface-tertiary border border-border">
                  {selectedClient.notes}
                </div>
              </div>
            )}

            {/* Tags */}
            {selectedClient.tags && selectedClient.tags.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClient.tags.map(tag => (
                    <Badge key={tag} variant="brand">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => { setDetailOpen(false); setSelectedClient(null) }}>
                Close
              </Button>
              <Button onClick={() => { setDetailOpen(false); openAssign(selectedClient) }}>
                Assign to Artist
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
