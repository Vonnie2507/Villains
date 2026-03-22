'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import {
  Plus, CheckCircle2, Clock, AlertTriangle, Ban, SprayCan, Repeat,
} from 'lucide-react'
import type {
  Task, TaskType, TaskPriority, TaskStatus, TaskRecurrence, Profile,
} from '@/types'
import {
  TASK_TYPE_OPTIONS, TASK_STATUS_OPTIONS, TASK_RECURRENCE_OPTIONS,
} from '@/types'

/* ── Constants ────────────────────────────────────────────────── */

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
]

const TAB_KEYS = ['my-tasks', 'all-tasks', 'cleaning-roster'] as const
type TabKey = typeof TAB_KEYS[number]

const TAB_LABELS: Record<TabKey, string> = {
  'my-tasks': 'My Tasks',
  'all-tasks': 'All Tasks',
  'cleaning-roster': 'Cleaning Roster',
}

/* ── Badge helpers ────────────────────────────────────────────── */

function typeBadgeVariant(t: TaskType) {
  switch (t) {
    case 'cleaning': return 'info'
    case 'enquiry_followup': return 'brand'
    case 'stock_reorder': return 'warning'
    case 'admin': return 'default'
    default: return 'default'
  }
}

function priorityBadgeVariant(p: TaskPriority) {
  switch (p) {
    case 'high': return 'error'
    case 'normal': return 'warning'
    default: return 'default'
  }
}

function statusIcon(s: TaskStatus) {
  switch (s) {
    case 'todo': return <Clock className="w-4 h-4 text-text-tertiary" />
    case 'in_progress': return <AlertTriangle className="w-4 h-4 text-status-warning" />
    case 'done': return <CheckCircle2 className="w-4 h-4 text-status-success" />
    case 'blocked': return <Ban className="w-4 h-4 text-status-error" />
  }
}

function recurrenceBadgeVariant(r: TaskRecurrence) {
  switch (r) {
    case 'daily': return 'error'
    case 'weekly': return 'info'
    case 'monthly': return 'brand'
    default: return 'default'
  }
}

function typeLabel(t: TaskType) {
  return TASK_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t
}

function statusLabel(s: TaskStatus) {
  return TASK_STATUS_OPTIONS.find(o => o.value === s)?.label ?? s
}

function recurrenceLabel(r: TaskRecurrence) {
  return TASK_RECURRENCE_OPTIONS.find(o => o.value === r)?.label ?? r
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

/* ── Empty form state ─────────────────────────────────────────── */

interface TaskForm {
  title: string
  description: string
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  due_date: string
  assigned_to_staff_id: string
  location_area: string
  recurrence: TaskRecurrence
}

const BLANK_FORM: TaskForm = {
  title: '',
  description: '',
  type: 'general',
  priority: 'normal',
  status: 'todo',
  due_date: '',
  assigned_to_staff_id: '',
  location_area: '',
  recurrence: 'none',
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function TasksPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  /* ── State ──────────────────────────────────────────────────── */
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('my-tasks')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<TaskForm>(BLANK_FORM)
  const [saving, setSaving] = useState(false)

  // Filters (All Tasks tab)
  const [filterType, setFilterType] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false)

  /* ── Fetch helpers ──────────────────────────────────────────── */

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assigned_to:profiles!tasks_assigned_to_staff_id_fkey(*), created_by:profiles!tasks_created_by_staff_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load tasks')
      console.error(error)
    } else {
      setTasks((data ?? []) as Task[])
    }
  }, [toast])

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name')

    if (error) {
      console.error(error)
    } else {
      setProfiles((data ?? []) as Profile[])
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchProfiles()])
      setLoading(false)
    }
    init()
  }, [fetchTasks, fetchProfiles])

  /* ── Profile lookup ─────────────────────────────────────────── */

  const profileName = useCallback((id: string | null) => {
    if (!id) return 'Unassigned'
    const p = profiles.find(pr => pr.id === id)
    return p ? (p.display_name || p.full_name) : 'Unknown'
  }, [profiles])

  const profileOptions = useMemo(() =>
    profiles.map(p => ({ value: p.id, label: p.display_name || p.full_name })),
    [profiles]
  )

  /* ── Create / update ────────────────────────────────────────── */

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      assigned_to_staff_id: form.assigned_to_staff_id || null,
      created_by_staff_id: user?.id ?? null,
      location_area: form.location_area.trim() || null,
      recurrence: form.recurrence,
    }

    const { error } = await supabase.from('tasks').insert(payload)
    setSaving(false)

    if (error) {
      toast.error('Failed to create task')
      console.error(error)
    } else {
      toast.success('Task created')
      setModalOpen(false)
      setForm(BLANK_FORM)
      await fetchTasks()
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated')
      await fetchTasks()
    }
  }

  async function handleMarkDone(taskId: string) {
    await handleStatusChange(taskId, 'done')
  }

  /* ── Filtered / grouped data ────────────────────────────────── */

  const myTasks = useMemo(() =>
    tasks.filter(t => t.assigned_to_staff_id === user?.id),
    [tasks, user]
  )

  const allTasksFiltered = useMemo(() => {
    let result = [...tasks]
    if (filterType) result = result.filter(t => t.type === filterType)
    if (filterAssigned) result = result.filter(t => t.assigned_to_staff_id === filterAssigned)
    if (filterStatus) result = result.filter(t => t.status === filterStatus)
    if (filterOverdueOnly) result = result.filter(t => t.status !== 'done' && isOverdue(t.due_date))
    return result
  }, [tasks, filterType, filterAssigned, filterStatus, filterOverdueOnly])

  const cleaningTasks = useMemo(() =>
    tasks.filter(t => t.type === 'cleaning'),
    [tasks]
  )

  function groupByStatus(list: Task[]): Record<TaskStatus, Task[]> {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [], blocked: [] }
    list.forEach(t => groups[t.status].push(t))
    return groups
  }

  function groupByRecurrence(list: Task[]): Record<TaskRecurrence, Task[]> {
    const groups: Record<TaskRecurrence, Task[]> = { none: [], daily: [], weekly: [], monthly: [] }
    list.forEach(t => groups[t.recurrence].push(t))
    return groups
  }

  /* ── Open modal helpers ─────────────────────────────────────── */

  function openNewTask() {
    setForm(BLANK_FORM)
    setModalOpen(true)
  }

  function openCleaningTask() {
    setForm({ ...BLANK_FORM, type: 'cleaning', recurrence: 'weekly' })
    setModalOpen(true)
  }

  /* ── Task card component ────────────────────────────────────── */

  function TaskCard({ task, showAssigned = false }: { task: Task; showAssigned?: boolean }) {
    const overdue = task.status !== 'done' && isOverdue(task.due_date)

    return (
      <div className={`flex items-start gap-3 p-4 rounded-lg border ${overdue ? 'border-status-error bg-status-error-50/30' : 'border-border bg-surface'}`}>
        <div className="pt-0.5">{statusIcon(task.status)}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-text-primary">{task.title}</span>
            <Badge variant={typeBadgeVariant(task.type)}>{typeLabel(task.type)}</Badge>
            <Badge variant={priorityBadgeVariant(task.priority)}>{task.priority}</Badge>
            {overdue && <Badge variant="error" dot>Overdue</Badge>}
          </div>

          {task.description && (
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary flex-wrap">
            {task.due_date && (
              <span className={overdue ? 'text-status-error font-medium' : ''}>
                Due {formatDate(task.due_date)}
              </span>
            )}
            {showAssigned && (
              <span>Assigned: {profileName(task.assigned_to_staff_id)}</span>
            )}
            {task.location_area && <span>Area: {task.location_area}</span>}
            {task.recurrence !== 'none' && (
              <Badge variant={recurrenceBadgeVariant(task.recurrence)}>
                <Repeat className="w-3 h-3" />
                {recurrenceLabel(task.recurrence)}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Select
            options={TASK_STATUS_OPTIONS}
            value={task.status}
            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
            className="!py-1 !text-xs w-[120px]"
          />
          {task.status !== 'done' && (
            <Button size="sm" variant="ghost" onClick={() => handleMarkDone(task.id)} title="Mark done">
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  /* ── Status group section ───────────────────────────────────── */

  function StatusGroup({ status, tasks: groupTasks, showAssigned = false }: { status: TaskStatus; tasks: Task[]; showAssigned?: boolean }) {
    if (groupTasks.length === 0) return null
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
          {statusIcon(status)} {statusLabel(status)} ({groupTasks.length})
        </h3>
        <div className="space-y-2">
          {groupTasks.map(t => <TaskCard key={t.id} task={t} showAssigned={showAssigned} />)}
        </div>
      </div>
    )
  }

  /* ── Render tabs ────────────────────────────────────────────── */

  function renderMyTasks() {
    const grouped = groupByStatus(myTasks)
    const hasAny = myTasks.length > 0

    return (
      <div className="space-y-6">
        {!hasAny && (
          <Card>
            <p className="text-center text-text-secondary py-8">No tasks assigned to you yet.</p>
          </Card>
        )}
        <StatusGroup status="todo" tasks={grouped.todo} />
        <StatusGroup status="in_progress" tasks={grouped.in_progress} />
        <StatusGroup status="blocked" tasks={grouped.blocked} />
        <StatusGroup status="done" tasks={grouped.done} />
      </div>
    )
  }

  function renderAllTasks() {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="w-40">
              <Select
                label="Type"
                options={TASK_TYPE_OPTIONS}
                placeholder="All types"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                label="Assigned To"
                options={profileOptions}
                placeholder="Anyone"
                value={filterAssigned}
                onChange={(e) => setFilterAssigned(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                label="Status"
                options={TASK_STATUS_OPTIONS}
                placeholder="All"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-primary pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterOverdueOnly}
                onChange={(e) => setFilterOverdueOnly(e.target.checked)}
                className="rounded border-border"
              />
              Overdue only
            </label>
          </div>
        </Card>

        {/* Task list */}
        {allTasksFiltered.length === 0 ? (
          <Card>
            <p className="text-center text-text-secondary py-8">No tasks match your filters.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {allTasksFiltered.map(t => <TaskCard key={t.id} task={t} showAssigned />)}
          </div>
        )}
      </div>
    )
  }

  function renderCleaningRoster() {
    const grouped = groupByRecurrence(cleaningTasks)
    const hasAny = cleaningTasks.length > 0
    const order: TaskRecurrence[] = ['daily', 'weekly', 'monthly', 'none']

    return (
      <div className="space-y-6">
        {!hasAny && (
          <Card>
            <p className="text-center text-text-secondary py-8">
              No cleaning tasks yet.
            </p>
          </Card>
        )}

        {order.map(rec => {
          const items = grouped[rec]
          if (items.length === 0) return null
          return (
            <div key={rec} className="space-y-2">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                {recurrenceLabel(rec)} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-surface">
                    <SprayCan className="w-4 h-4 text-status-info shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-text-primary">{t.title}</span>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-tertiary flex-wrap">
                        {t.location_area && <span>Area: {t.location_area}</span>}
                        <span>Assigned: {profileName(t.assigned_to_staff_id)}</span>
                      </div>
                    </div>
                    <Badge variant={recurrenceBadgeVariant(t.recurrence)}>
                      {recurrenceLabel(t.recurrence)}
                    </Badge>
                    <Badge variant={statusLabel(t.status) === 'Done' ? 'success' : 'default'}>
                      {statusLabel(t.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  /* ================================================================
     MAIN RENDER
     ================================================================ */

  return (
    <DashboardLayout activePath="/tasks">
      <PageHeader
        title="Tasks & Roster"
        description="Manage studio tasks and cleaning roster"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openCleaningTask} icon={<SprayCan className="w-4 h-4" />}>
              Add Cleaning Task
            </Button>
            <Button onClick={openNewTask} icon={<Plus className="w-4 h-4" />}>
              New Task
            </Button>
          </div>
        }
      />

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {TAB_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'my-tasks' && renderMyTasks()}
          {activeTab === 'all-tasks' && renderAllTasks()}
          {activeTab === 'cleaning-roster' && renderCleaningRoster()}
        </>
      )}

      {/* ── New Task Modal ──────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.type === 'cleaning' ? 'Add Cleaning Task' : 'New Task'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />

          <Textarea
            label="Description"
            placeholder="Optional details..."
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              options={TASK_TYPE_OPTIONS}
              value={form.type}
              onChange={(e) => setForm(f => ({ ...f, type: e.target.value as TaskType }))}
            />
            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              options={TASK_STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
            />
            <Input
              label="Due Date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Assigned To"
              options={profileOptions}
              placeholder="Unassigned"
              value={form.assigned_to_staff_id}
              onChange={(e) => setForm(f => ({ ...f, assigned_to_staff_id: e.target.value }))}
            />
            <Select
              label="Recurrence"
              options={TASK_RECURRENCE_OPTIONS}
              value={form.recurrence}
              onChange={(e) => setForm(f => ({ ...f, recurrence: e.target.value as TaskRecurrence }))}
            />
          </div>

          <Input
            label="Location / Area"
            placeholder="e.g. Front counter, Tattoo room 2, Bathroom..."
            value={form.location_area}
            onChange={(e) => setForm(f => ({ ...f, location_area: e.target.value }))}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
