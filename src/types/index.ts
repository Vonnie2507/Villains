/*
  ============================================================
  VILLAINS STUDIO HUB — V2 Type Definitions
  ============================================================
  Matches V2 Supabase schema exactly.
  RULE: NO money types on Session, ScheduleDay, or WeeklySubmission.
  ============================================================
*/

/* ── UTILITY TYPES ── */

export interface SelectOption {
  value: string
  label: string
}

export interface DataHookResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/* ── USER ROLES ── */

export type UserRole = 'super_admin' | 'admin' | 'artist'

/* ── 1. PROFILES ── */

export interface Profile {
  id: string
  email: string
  full_name: string
  display_name: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/* ── 2. ARTIST PROFILE ── */

export interface ArtistProfile {
  id: string
  user_id: string
  display_name: string | null
  seat_name_or_number: string | null
  specialties: string[]
  instagram_handle: string | null
  default_working_days: Record<string, boolean>
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  profile?: Profile
}

/* ── 3. STAFF RECORD ── */

export interface StaffRecord {
  id: string
  user_id: string
  date_of_birth: string | null
  phone: string | null
  address: string | null
  next_of_kin_name: string | null
  next_of_kin_phone: string | null
  start_date: string | null
  id_document_url: string | null
  contract_url: string | null
  file_attachments: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

/* ── 4. SCHEDULE DAY ── */

export type ScheduleDayStatus = 'off' | 'in_booked' | 'in_touchups' | 'in_walkins' | 'in_custom'

export const SCHEDULE_DAY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'in_booked', label: 'Booked' },
  { value: 'in_touchups', label: 'Touch-ups' },
  { value: 'in_walkins', label: 'Walk-ins' },
  { value: 'in_custom', label: 'Custom' },
]

export const SCHEDULE_DAY_COLOURS: Record<ScheduleDayStatus, { bg: string; text: string; label: string }> = {
  off:          { bg: 'bg-neutral-200', text: 'text-neutral-500', label: 'Off' },
  in_booked:    { bg: 'bg-brand-50', text: 'text-brand-500', label: 'Booked' },
  in_touchups:  { bg: 'bg-status-info-50', text: 'text-status-info-700', label: 'Touch-ups' },
  in_walkins:   { bg: 'bg-status-warning-50', text: 'text-status-warning-700', label: 'Walk-ins' },
  in_custom:    { bg: 'bg-accent-100', text: 'text-accent-500', label: 'Custom' },
}

export interface ScheduleDay {
  id: string
  artist_id: string
  date: string
  status: ScheduleDayStatus
  number_of_clients: number
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  artist_profile?: ArtistProfile
}

/* ── 5. SESSION (NO MONEY) ── */

export type SessionType = 'new_piece' | 'touchup' | 'continuation' | 'flash' | 'other'

export const SESSION_TYPE_OPTIONS: SelectOption[] = [
  { value: 'new_piece', label: 'New Piece' },
  { value: 'touchup', label: 'Touch-up' },
  { value: 'continuation', label: 'Continuation' },
  { value: 'flash', label: 'Flash' },
  { value: 'other', label: 'Other' },
]

export interface Session {
  id: string
  artist_id: string
  date: string
  start_time: string | null
  end_time: string | null
  client_reference: string | null
  session_type: SessionType | null
  envelope_submitted: boolean
  envelope_photo: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
// NOTE: NO price, amount, revenue, total, deposit, or any money field.

/* ── 6. WEEKLY SCHEDULE SUBMISSION (NO MONEY) ── */

export interface WeeklySubmission {
  id: string
  artist_id: string
  week_start_date: string
  week_end_date: string
  submitted_at: string | null
  total_sessions_count: number
  confirmation_envelopes_submitted: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  artist_profile?: ArtistProfile
}
// NOTE: NO price, revenue, total, amount, or any money field.

/* ── 7. LEAVE REQUEST ── */

export type LeaveType = 'holiday' | 'sick' | 'unpaid' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export const LEAVE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'holiday', label: 'Holiday' },
  { value: 'sick', label: 'Sick' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' },
]

export interface LeaveRequest {
  id: string
  artist_id: string
  type: LeaveType
  start_date: string
  end_date: string
  status: LeaveStatus
  notes: string | null
  created_at: string
  artist_profile?: ArtistProfile
}

/* ── 8. CLIENT PROFILE (CRM) ── */

export type ClientStatus = 'lead' | 'active_client' | 'past_client'
export type ClientStage = 'new_enquiry' | 'waiting_for_reply' | 'chatting' | 'waiting_for_artist' | 'artist_sent_booking_link' | 'booked_with_artist'
export type ClientSource = 'instagram_dm' | 'facebook_message' | 'email' | 'web_form' | 'phone_call' | 'walk_in' | 'other'
export type ClientPriority = 'low' | 'normal' | 'high'
export type HandoffStatus = 'not_assigned' | 'assigned_to_artist' | 'booked_with_artist'

export const CLIENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'active_client', label: 'Active Client' },
  { value: 'past_client', label: 'Past Client' },
]

export const CLIENT_STAGE_OPTIONS: SelectOption[] = [
  { value: 'new_enquiry', label: 'New Enquiry' },
  { value: 'waiting_for_reply', label: 'Waiting for Reply' },
  { value: 'chatting', label: 'Chatting' },
  { value: 'waiting_for_artist', label: 'Waiting for Artist' },
  { value: 'artist_sent_booking_link', label: 'Booking Link Sent' },
  { value: 'booked_with_artist', label: 'Booked with Artist' },
]

export const CLIENT_STAGE_COLOURS: Record<ClientStage, { bg: string; text: string }> = {
  new_enquiry:              { bg: 'bg-brand-50', text: 'text-brand-500' },
  waiting_for_reply:        { bg: 'bg-status-warning-50', text: 'text-status-warning-700' },
  chatting:                 { bg: 'bg-status-info-50', text: 'text-status-info-700' },
  waiting_for_artist:       { bg: 'bg-accent-100', text: 'text-accent-500' },
  artist_sent_booking_link: { bg: 'bg-secondary-200', text: 'text-secondary-900' },
  booked_with_artist:       { bg: 'bg-status-success-50', text: 'text-status-success-700' },
}

export const CLIENT_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'instagram_dm', label: 'Instagram DM' },
  { value: 'facebook_message', label: 'Facebook' },
  { value: 'email', label: 'Email' },
  { value: 'web_form', label: 'Web Form' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'other', label: 'Other' },
]

export const CLIENT_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
]

export interface ClientProfile {
  id: string
  artist_id: string
  display_name: string
  phone: string | null
  email: string | null
  instagram_handle: string | null
  notes: string | null
  status: ClientStatus
  stage: ClientStage
  source: ClientSource | null
  priority: ClientPriority
  current_artist_owner_id: string | null
  handoff_status: HandoffStatus
  last_contacted_at: string | null
  last_customer_reply_at: string | null
  tags: string[]
  created_at: string
  updated_at: string
  // Joined
  artist_profile?: ArtistProfile
  current_artist_owner?: ArtistProfile
}

/* ── 9. CLIENT MEDIA ── */

export interface ClientMedia {
  id: string
  client_profile_id: string
  file_url: string
  caption: string | null
  created_at: string
}

/* ── 10. COMMUNICATION THREAD ── */

export type ChannelType = 'instagram' | 'sms' | 'email' | 'facebook' | 'internal_note' | 'other'

export const CHANNEL_OPTIONS: SelectOption[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'internal_note', label: 'Internal Note' },
  { value: 'other', label: 'Other' },
]

export interface CommunicationThread {
  id: string
  client_profile_id: string
  artist_id: string
  channel: ChannelType | null
  external_identifier: string | null
  last_message_at: string | null
  is_read: boolean
  created_at: string
  // Joined
  client_profile?: ClientProfile
}

/* ── 11. COMMUNICATION MESSAGE ── */

export type MessageDirection = 'inbound' | 'outbound'

export interface CommunicationMessage {
  id: string
  thread_id: string
  direction: MessageDirection | null
  sent_at: string
  body: string | null
  attachment: string | null
  created_at: string
}

/* ── 12. INCIDENT REPORT ── */

export type IncidentType = 'client_fainted' | 'medical' | 'behaviour' | 'other'

export const INCIDENT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'client_fainted', label: 'Client Fainted' },
  { value: 'medical', label: 'Medical' },
  { value: 'behaviour', label: 'Behaviour' },
  { value: 'other', label: 'Other' },
]

export interface Incident {
  id: string
  artist_id: string | null
  session_id: string | null
  incident_type: IncidentType | null
  description: string
  follow_up_notes: string | null
  created_at: string
  updated_at: string
  artist_profile?: ArtistProfile
}

/* ── 13. TASK ── */

export type TaskType = 'general' | 'enquiry_followup' | 'stock_reorder' | 'cleaning' | 'admin'
export type TaskPriority = 'low' | 'normal' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export const TASK_TYPE_OPTIONS: SelectOption[] = [
  { value: 'general', label: 'General' },
  { value: 'enquiry_followup', label: 'Enquiry Follow-up' },
  { value: 'stock_reorder', label: 'Stock Reorder' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'admin', label: 'Admin' },
]

export const TASK_STATUS_OPTIONS: SelectOption[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
]

export const TASK_RECURRENCE_OPTIONS: SelectOption[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export interface Task {
  id: string
  title: string
  description: string | null
  type: TaskType
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  assigned_to_staff_id: string | null
  created_by_staff_id: string | null
  related_enquiry_id: string | null
  related_product_id: string | null
  location_area: string | null
  recurrence: TaskRecurrence
  created_at: string
  updated_at: string
  // Joined
  assigned_to?: Profile
  created_by?: Profile
}

/* ── 14. PRODUCT (MONEY ALLOWED) ── */

export interface Product {
  id: string
  sku: string | null
  name: string
  description: string | null
  price: number | null
  cost_price: number | null
  barcode: string | null
  stock_on_hand: number
  min_stock_level: number
  regular_stock_level: number
  category: string | null
  supplier_code: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/* ── 15. PURCHASE ORDER (MONEY ALLOWED) ── */

export type POStatus = 'draft' | 'sent' | 'received' | 'partial'

export interface PurchaseOrder {
  id: string
  supplier_name: string
  order_date: string | null
  expected_date: string | null
  status: POStatus
  total_amount: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrderLine {
  id: string
  purchase_order_id: string
  product_id: string | null
  qty_ordered: number
  qty_received: number
  unit_cost: number | null
  created_at: string
  product?: Product
}

/* ── 17. TRANSACTION (MONEY ALLOWED) ── */

export type TransactionCategory = 'shop' | 'cleaning' | 'tattoo_supplies' | 'equipment' | 'merch' | 'drinks' | 'other'
export type PaymentMethod = 'cash' | 'eftpos' | 'online' | 'afterpay'
export type TransactionStatus = 'pending' | 'approved' | 'reimbursed'

export const TRANSACTION_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'shop', label: 'Shop' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'tattoo_supplies', label: 'Tattoo Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'merch', label: 'Merch' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'other', label: 'Other' },
]

export const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'eftpos', label: 'EFTPOS' },
  { value: 'online', label: 'Online' },
  { value: 'afterpay', label: 'Afterpay' },
]

export interface Transaction {
  id: string
  date: string
  category: TransactionCategory | null
  description: string | null
  amount: number
  uploaded_by: string | null
  payment_method: PaymentMethod | null
  receipt_url: string | null
  status: TransactionStatus
  created_at: string
  updated_at: string
  uploaded_by_profile?: Profile
}

/* ── 18. TILL BALANCE ── */

export interface TillBalance {
  id: string
  date: string
  start_float: number | null
  end_count: number | null
  variance: number | null
  notes: string | null
  staff_id: string | null
  photo_url: string | null
  created_at: string
  staff?: Profile
}

/* ── 19. STAFF PURCHASE (MONEY ALLOWED) ── */

export interface StaffPurchase {
  id: string
  staff_id: string
  item: string
  quantity: number
  price: number | null
  date: string
  is_paid: boolean
  created_at: string
  staff?: Profile
}

/* ── 20. SHOP SALE (MONEY ALLOWED) ── */

export interface ShopSale {
  id: string
  sale_number: string | null
  sold_by: string | null
  total: number
  payment_method: string | null
  notes: string | null
  created_at: string
}

export interface ShopSaleLine {
  id: string
  sale_id: string
  product_id: string | null
  qty: number
  unit_price: number
  line_total: number
  product?: Product
}

/* ── 21. MESSAGES ── */

export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  body: string
  is_read: boolean
  read_at: string | null
  created_at: string
  from_user?: Profile
  to_user?: Profile
}

/* ── DAYS OF WEEK ── */

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export type DayOfWeek = typeof DAYS_OF_WEEK[number]
