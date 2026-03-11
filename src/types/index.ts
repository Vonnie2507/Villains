/*
  ============================================================
  SHARED TYPES — Define your data shapes here
  ============================================================

  This file contains:
  1. Reusable utility types (every project uses these)
  2. Demo data types (replace with your project-specific types)

  Update the demo types when you set up a new client's database.
  Keep the utility types as-is — they work across all projects.
  ============================================================
*/

/* ── UTILITY TYPES ── Reusable across all projects ── */

/** Standard select option shape — used by Select components and useLookup */
export interface SelectOption {
  value: string
  label: string
}

/** Standard hook return shape for data operations */
export interface DataHookResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/** Standard hook return shape with CRUD operations */
export interface CrudHookResult<T, CreateInput, UpdateInput> extends DataHookResult<T> {
  create: (input: CreateInput) => Promise<T | null>
  update: (id: string, input: UpdateInput) => Promise<T | null>
  remove: (id: string) => Promise<boolean>
}

/* ── PROJECT-SPECIFIC TYPES ── Replace these per project ── */

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  type: 'Customer' | 'Supplier' | 'Subcontractor'
  address?: string
  source?: string
  notes?: string
  created_at: string
}

export interface Job {
  id: string
  number: string
  client: string
  contact_id: string
  description: string
  status: 'Quoted' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled'
  value: number
  address?: string
  assigned_to?: string
  start_date?: string
  end_date?: string
  notes?: string
  created_at: string
}

export interface Quote {
  id: string
  number: string
  contact_id: string
  client: string
  description: string
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired'
  value: number
  valid_until?: string
  created_at: string
}

export interface InventoryItem {
  id: string
  sku: string
  name: string
  stock: number
  min_stock: number
  location: string
  unit_cost: number
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
}

export interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  status: 'Active' | 'Inactive'
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  colour?: string
  job_id?: string
  assigned_to?: string
}

export interface ActivityItem {
  id: string
  title: string
  description?: string
  timestamp: string
  type?: string
}

export interface StatData {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
}
