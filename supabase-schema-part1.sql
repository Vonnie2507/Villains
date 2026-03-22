-- ============================================================
-- VILLAINS TATTOO STUDIO — Part 1: Tables + Triggers
-- ============================================================
-- Run this FIRST, then run Part 2 (RLS policies)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  display_name    TEXT,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'artist' CHECK (role IN ('super_admin', 'admin', 'artist')),
  avatar_url      TEXT,
  bio             TEXT,
  specialties     TEXT[] DEFAULT '{}',
  instagram_handle TEXT,
  is_active       BOOLEAN DEFAULT true,
  onboarded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'artist')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ARTIST DETAILS (HR / onboarding)
-- ============================================================
CREATE TABLE public.artist_details (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth       DATE,
  address             TEXT,
  emergency_name      TEXT,
  emergency_phone     TEXT,
  emergency_relation  TEXT,
  next_of_kin_name    TEXT,
  next_of_kin_phone   TEXT,
  id_document_url     TEXT,
  contract_url        TEXT,
  start_date          DATE,
  chair_number        INT,
  commission_pct      NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. SCHEDULE ENTRIES
-- ============================================================
CREATE TABLE public.schedule_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('on', 'off', 'client', 'touch_up', 'in_studio', 'customs', 'leaving_early')),
  notes           TEXT,
  submitted_at    TIMESTAMPTZ,
  week_start      DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(artist_id, date)
);

-- ============================================================
-- 4. LEAVE REQUESTS
-- ============================================================
CREATE TABLE public.leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by     UUID REFERENCES public.profiles(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. ENQUIRIES (Admin-facing pipeline)
-- ============================================================
CREATE TABLE public.enquiries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code      TEXT NOT NULL UNIQUE,
  source              TEXT CHECK (source IN ('instagram', 'phone', 'email', 'walk_in', 'website', 'referral')),
  first_name          TEXT,
  stage               TEXT NOT NULL DEFAULT 'new_enquiry' CHECK (stage IN (
                        'new_enquiry', 'waiting_for_reply', 'chatting',
                        'waiting_for_artist', 'artist_sent_booking_link', 'booked_with_artist'
                      )),
  style_requested     TEXT,
  placement           TEXT,
  size_estimate       TEXT,
  reference_images    TEXT[] DEFAULT '{}',
  assigned_artist_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_notes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

-- Auto-generate reference code
CREATE OR REPLACE FUNCTION public.generate_enquiry_ref()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_code FROM 5) AS INT)), 0) + 1
  INTO next_num
  FROM public.enquiries;
  NEW.reference_code := 'VTS-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_enquiry_ref
  BEFORE INSERT ON public.enquiries
  FOR EACH ROW
  WHEN (NEW.reference_code IS NULL OR NEW.reference_code = '')
  EXECUTE FUNCTION public.generate_enquiry_ref();

-- ============================================================
-- 6. ARTIST CLIENTS (Private to each artist)
-- ============================================================
CREATE TABLE public.artist_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enquiry_id      UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  instagram       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- 7. CLIENT IDEAS (mood board per client)
-- ============================================================
CREATE TABLE public.client_ideas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_client_id    UUID NOT NULL REFERENCES public.artist_clients(id) ON DELETE CASCADE,
  title               TEXT,
  description         TEXT,
  image_urls          TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. BOOKINGS
-- ============================================================
CREATE TABLE public.bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_client_id    UUID REFERENCES public.artist_clients(id) ON DELETE SET NULL,
  date                DATE NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME,
  duration_hours      NUMERIC(4,2),
  type                TEXT CHECK (type IN ('tattoo', 'consultation', 'touch_up')),
  status              TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  deposit_paid        BOOLEAN DEFAULT false,
  deposit_amount      NUMERIC(10,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. PAYMENT ENVELOPES
-- ============================================================
CREATE TABLE public.payment_envelopes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  client_count    INT NOT NULL DEFAULT 1,
  total_collected NUMERIC(10,2) NOT NULL,
  commission_pct  NUMERIC(5,2) NOT NULL,
  amount_owed     NUMERIC(10,2) GENERATED ALWAYS AS (total_collected * commission_pct / 100) STORED,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_settled      BOOLEAN GENERATED ALWAYS AS (amount_paid >= total_collected * commission_pct / 100) STORED,
  admin_notes     TEXT,
  artist_notes    TEXT,
  verified_by     UUID REFERENCES public.profiles(id),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. MESSAGES (Internal admin ↔ artist chat)
-- ============================================================
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. INCIDENTS
-- ============================================================
CREATE TABLE public.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by     UUID REFERENCES public.profiles(id),
  artist_id       UUID REFERENCES public.profiles(id),
  booking_id      UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type            TEXT CHECK (type IN ('fainting', 'allergic_reaction', 'equipment', 'other')),
  description     TEXT NOT NULL,
  severity        TEXT CHECK (severity IN ('low', 'medium', 'high')),
  snap_form_url   TEXT,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. ARTIST CONVERSATIONS (Multi-channel inbox, private)
-- ============================================================
CREATE TABLE public.artist_conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_client_id    UUID REFERENCES public.artist_clients(id) ON DELETE SET NULL,
  channel             TEXT CHECK (channel IN ('instagram', 'sms', 'email', 'phone', 'other')),
  direction           TEXT CHECK (direction IN ('inbound', 'outbound')),
  summary             TEXT,
  message_body        TEXT,
  external_ref        TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. APP SETTINGS
-- ============================================================
CREATE TABLE public.app_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT NOT NULL,
  key             TEXT NOT NULL,
  value           TEXT,
  label           TEXT,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  UNIQUE(category, key)
);

-- ============================================================
-- 14. NOTIFICATION LOG
-- ============================================================
CREATE TABLE public.notification_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id    UUID REFERENCES public.profiles(id),
  type            TEXT CHECK (type IN ('sms', 'push', 'email')),
  subject         TEXT,
  body            TEXT,
  status          TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update timestamp)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_artist_details_updated_at BEFORE UPDATE ON public.artist_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON public.schedule_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_enquiries_updated_at BEFORE UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_artist_clients_updated_at BEFORE UPDATE ON public.artist_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_client_ideas_updated_at BEFORE UPDATE ON public.client_ideas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payment_envelopes_updated_at BEFORE UPDATE ON public.payment_envelopes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED: Insert default app settings
-- ============================================================
INSERT INTO public.app_settings (category, key, value, label, sort_order) VALUES
  ('studio', 'studio_name', 'Villains Tattoo Studio', 'Studio Name', 1),
  ('studio', 'studio_phone', '', 'Studio Phone', 2),
  ('studio', 'studio_email', '', 'Studio Email', 3),
  ('studio', 'studio_instagram', '', 'Instagram Handle', 4),
  ('studio', 'studio_address', '', 'Studio Address', 5),
  ('schedule', 'reminder_day', 'sunday', 'Reminder Day', 1),
  ('schedule', 'reminder_time', '20:00', 'Reminder Time', 2),
  ('payments', 'default_commission_pct', '30', 'Default Commission %', 1)
ON CONFLICT (category, key) DO NOTHING;
