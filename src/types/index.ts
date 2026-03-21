/*
  ============================================================
  VILLAINS TATTOO STUDIO — Type definitions
  ============================================================
*/

/* ── UTILITY TYPES ── Reusable across all projects ── */

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

export interface CrudHookResult<T, CreateInput, UpdateInput> extends DataHookResult<T> {
  create: (input: CreateInput) => Promise<T | null>
  update: (id: string, input: UpdateInput) => Promise<T | null>
  remove: (id: string) => Promise<boolean>
}

/* ── USER ROLES ── */

export type UserRole = 'super_admin' | 'admin' | 'artist'

/* ── PROFILES ── */

export interface Profile {
  id: string
  email: string
  full_name: string
  display_name: string | null
  phone: string | null
  role: UserRole
  avatar_url: string | null
  bio: string | null
  specialties: string[]
  instagram_handle: string | null
  is_active: boolean
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

export interface ArtistDetails {
  id: string
  profile_id: string
  date_of_birth: string | null
  address: string | null
  emergency_name: string | null
  emergency_phone: string | null
  emergency_relation: string | null
  next_of_kin_name: string | null
  next_of_kin_phone: string | null
  id_document_url: string | null
  contract_url: string | null
  start_date: string | null
  chair_number: number | null
  commission_pct: number
  notes: string | null
  created_at: string
  updated_at: string
}

/* ── SCHEDULE ── */

export type ScheduleStatus =
  | 'on'
  | 'off'
  | 'client'
  | 'touch_up'
  | 'in_studio'
  | 'customs'
  | 'leaving_early'

export const SCHEDULE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
  { value: 'client', label: 'Client' },
  { value: 'touch_up', label: 'Touch Up' },
  { value: 'in_studio', label: 'In Studio (Walk-ins)' },
  { value: 'customs', label: 'Customs' },
  { value: 'leaving_early', label: 'Leaving Early' },
]

export const SCHEDULE_STATUS_COLOURS: Record<ScheduleStatus, { bg: string; text: string; label: string }> = {
  on:            { bg: 'bg-status-success-50', text: 'text-status-success-700', label: 'On' },
  off:           { bg: 'bg-neutral-200', text: 'text-neutral-500', label: 'Off' },
  client:        { bg: 'bg-brand-50', text: 'text-brand-500', label: 'Client' },
  touch_up:      { bg: 'bg-status-info-50', text: 'text-status-info-700', label: 'Touch Up' },
  in_studio:     { bg: 'bg-status-warning-50', text: 'text-status-warning-700', label: 'Walk-ins' },
  customs:       { bg: 'bg-secondary-200', text: 'text-secondary-900', label: 'Customs' },
  leaving_early: { bg: 'bg-accent-100', text: 'text-accent-500', label: 'Leaving Early' },
}

export interface ScheduleEntry {
  id: string
  artist_id: string
  date: string
  status: ScheduleStatus
  notes: string | null
  submitted_at: string | null
  week_start: string
  created_at: string
  updated_at: string
  // Joined fields
  artist?: Profile
}

/* ── LEAVE REQUESTS ── */

export type LeaveStatus = 'pending' | 'approved' | 'declined'

export interface LeaveRequest {
  id: string
  artist_id: string
  start_date: string
  end_date: string
  reason: string | null
  status: LeaveStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  artist?: Profile
}

/* ── ENQUIRY PIPELINE (Admin Side) ── */

export type EnquiryStage =
  | 'new_enquiry'
  | 'waiting_for_reply'
  | 'chatting'
  | 'waiting_for_artist'
  | 'artist_sent_booking_link'
  | 'booked_with_artist'

export const ENQUIRY_STAGE_OPTIONS: SelectOption[] = [
  { value: 'new_enquiry', label: 'New Enquiry' },
  { value: 'waiting_for_reply', label: 'Waiting for Reply' },
  { value: 'chatting', label: 'Chatting' },
  { value: 'waiting_for_artist', label: 'Waiting for Artist' },
  { value: 'artist_sent_booking_link', label: 'Sent to Artist' },
  { value: 'booked_with_artist', label: 'Booked with Artist' },
]

export const ENQUIRY_STAGE_COLOURS: Record<EnquiryStage, { bg: string; text: string }> = {
  new_enquiry:              { bg: 'bg-brand-50', text: 'text-brand-500' },
  waiting_for_reply:        { bg: 'bg-status-warning-50', text: 'text-status-warning-700' },
  chatting:                 { bg: 'bg-status-info-50', text: 'text-status-info-700' },
  waiting_for_artist:       { bg: 'bg-accent-100', text: 'text-accent-500' },
  artist_sent_booking_link: { bg: 'bg-secondary-200', text: 'text-secondary-900' },
  booked_with_artist:       { bg: 'bg-status-success-50', text: 'text-status-success-700' },
}

export type EnquirySource = 'instagram' | 'phone' | 'email' | 'walk_in' | 'website' | 'referral'

export const ENQUIRY_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
]

export interface Enquiry {
  id: string
  reference_code: string
  source: EnquirySource | null
  first_name: string | null
  stage: EnquiryStage
  style_requested: string | null
  placement: string | null
  size_estimate: string | null
  reference_images: string[]
  assigned_artist_id: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  // Joined
  assigned_artist?: Profile
}

/* ── ARTIST CLIENTS (Private to Artist) ── */

export interface ArtistClient {
  id: string
  artist_id: string
  enquiry_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  instagram: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientIdea {
  id: string
  artist_client_id: string
  title: string | null
  description: string | null
  image_urls: string[]
  created_at: string
  updated_at: string
}

/* ── BOOKINGS ── */

export type BookingType = 'tattoo' | 'consultation' | 'touch_up'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface Booking {
  id: string
  artist_id: string
  artist_client_id: string | null
  date: string
  start_time: string
  end_time: string | null
  duration_hours: number | null
  type: BookingType
  status: BookingStatus
  deposit_paid: boolean
  deposit_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  artist_client?: ArtistClient
}

/* ── PAYMENT ENVELOPES ── */

export interface PaymentEnvelope {
  id: string
  artist_id: string
  date: string
  client_count: number
  total_collected: number
  commission_pct: number
  amount_owed: number       // generated
  amount_paid: number
  is_settled: boolean       // generated
  admin_notes: string | null
  artist_notes: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  // Joined
  artist?: Profile
}

/* ── MESSAGES (Internal) ── */

export interface Message {
  id: string
  from_user_id: string
  to_user_id: string
  body: string
  is_read: boolean
  read_at: string | null
  created_at: string
  // Joined
  from_user?: Profile
  to_user?: Profile
}

/* ── INCIDENTS ── */

export type IncidentType = 'fainting' | 'allergic_reaction' | 'equipment' | 'other'
export type IncidentSeverity = 'low' | 'medium' | 'high'
export type IncidentStatus = 'open' | 'in_progress' | 'resolved'

export interface Incident {
  id: string
  reported_by: string
  artist_id: string | null
  booking_id: string | null
  type: IncidentType
  description: string
  severity: IncidentSeverity
  snap_form_url: string | null
  status: IncidentStatus
  resolved_at: string | null
  created_at: string
  updated_at: string
  // Joined
  artist?: Profile
}

/* ── STAT DATA ── */

export interface StatData {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
}

/* ── DAYS OF WEEK ── */

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export type DayOfWeek = typeof DAYS_OF_WEEK[number]
