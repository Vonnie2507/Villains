-- ============================================================
-- VILLAINS STUDIO HUB — V2 DROP (run this first to clean slate)
-- ============================================================
-- WARNING: This drops all existing tables. Only run if you want
-- to start fresh with the V2 schema.
-- ============================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_artist_details_updated_at ON public.artist_details;
DROP TRIGGER IF EXISTS update_schedule_entries_updated_at ON public.schedule_entries;
DROP TRIGGER IF EXISTS update_enquiries_updated_at ON public.enquiries;
DROP TRIGGER IF EXISTS update_artist_clients_updated_at ON public.artist_clients;
DROP TRIGGER IF EXISTS update_client_ideas_updated_at ON public.client_ideas;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS update_payment_envelopes_updated_at ON public.payment_envelopes;
DROP TRIGGER IF EXISTS update_incidents_updated_at ON public.incidents;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_enquiry_ref ON public.enquiries;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.generate_enquiry_ref() CASCADE;

-- Drop tables (reverse dependency order)
DROP TABLE IF EXISTS public.notification_log CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.artist_conversations CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.payment_envelopes CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.client_ideas CASCADE;
DROP TABLE IF EXISTS public.artist_clients CASCADE;
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.schedule_entries CASCADE;
DROP TABLE IF EXISTS public.artist_details CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
