-- ============================================================
-- VILLAINS STUDIO HUB — V2 Schema Part 1: Tables
-- ============================================================
-- Matches Base44 data model exactly.
-- RULE: NO money fields on Session, ScheduleDay, or WeeklySubmission.
-- Money ONLY allowed on: Product, PurchaseOrder, Transaction, StaffPurchase, ShopSale.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES
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
  is_active       BOOLEAN DEFAULT true,
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
-- 2. ARTIST PROFILE (1:1 with profiles where role=artist)
-- ============================================================
CREATE TABLE public.artist_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name          TEXT,
  seat_name_or_number   TEXT,
  specialties           TEXT[] DEFAULT '{}',
  instagram_handle      TEXT,
  default_working_days  JSONB DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false,"sun":false}',
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. STAFF RECORD (HR / onboarding)
-- ============================================================
CREATE TABLE public.staff_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth     DATE,
  phone             TEXT,
  address           TEXT,
  next_of_kin_name  TEXT,
  next_of_kin_phone TEXT,
  start_date        DATE,
  id_document_url   TEXT,
  contract_url      TEXT,
  file_attachments  TEXT[] DEFAULT '{}',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. SCHEDULE DAY (artist status per day)
-- ============================================================
CREATE TABLE public.schedule_days (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'off' CHECK (status IN (
                      'off', 'in_booked', 'in_touchups', 'in_walkins', 'in_custom'
                    )),
  number_of_clients INT DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(artist_id, date)
);

-- ============================================================
-- 5. SESSION (individual appointment — NO MONEY FIELDS)
-- ============================================================
CREATE TABLE public.sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id           UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  start_time          TIME,
  end_time            TIME,
  client_reference    TEXT,
  session_type        TEXT CHECK (session_type IN ('new_piece', 'touchup', 'continuation', 'flash', 'other')),
  envelope_submitted  BOOLEAN DEFAULT false,
  envelope_photo      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
-- NOTE: NO price, amount, revenue, total, deposit, or any money field.

-- ============================================================
-- 6. WEEKLY SCHEDULE SUBMISSION (replaces TimesheetWeek — NO MONEY)
-- ============================================================
CREATE TABLE public.weekly_submissions (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                       UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  week_start_date                 DATE NOT NULL,
  week_end_date                   DATE NOT NULL,
  submitted_at                    TIMESTAMPTZ,
  total_sessions_count            INT DEFAULT 0,
  confirmation_envelopes_submitted BOOLEAN DEFAULT false,
  notes                           TEXT,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(artist_id, week_start_date)
);
-- NOTE: NO price, revenue, total, amount, or any money field.

-- ============================================================
-- 7. LEAVE REQUESTS
-- ============================================================
CREATE TABLE public.leave_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('holiday', 'sick', 'unpaid', 'other')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. CLIENT PROFILE (CRM — artist-owned, privacy-controlled)
-- ============================================================
CREATE TABLE public.client_profiles (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                 UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  display_name              TEXT NOT NULL,
  phone                     TEXT,
  email                     TEXT,
  instagram_handle          TEXT,
  notes                     TEXT,
  status                    TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'active_client', 'past_client')),
  stage                     TEXT DEFAULT 'new_enquiry' CHECK (stage IN (
                              'new_enquiry', 'waiting_for_reply', 'chatting',
                              'waiting_for_artist', 'artist_sent_booking_link', 'booked_with_artist'
                            )),
  source                    TEXT CHECK (source IN ('instagram_dm', 'facebook_message', 'email', 'web_form', 'phone_call', 'walk_in', 'other')),
  priority                  TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  current_artist_owner_id   UUID REFERENCES public.artist_profiles(id) ON DELETE SET NULL,
  handoff_status            TEXT DEFAULT 'not_assigned' CHECK (handoff_status IN ('not_assigned', 'assigned_to_artist', 'booked_with_artist')),
  last_contacted_at         TIMESTAMPTZ,
  last_customer_reply_at    TIMESTAMPTZ,
  tags                      TEXT[] DEFAULT '{}',
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. CLIENT MEDIA (reference photos, sketches, healed pics)
-- ============================================================
CREATE TABLE public.client_media (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  file_url          TEXT NOT NULL,
  caption           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. COMMUNICATION THREAD
-- ============================================================
CREATE TABLE public.communication_threads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id   UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  artist_id           UUID NOT NULL REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  channel             TEXT CHECK (channel IN ('instagram', 'sms', 'email', 'facebook', 'internal_note', 'other')),
  external_identifier TEXT,
  last_message_at     TIMESTAMPTZ,
  is_read             BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. COMMUNICATION MESSAGE
-- ============================================================
CREATE TABLE public.communication_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  direction   TEXT CHECK (direction IN ('inbound', 'outbound')),
  sent_at     TIMESTAMPTZ DEFAULT now(),
  body        TEXT,
  attachment  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. INCIDENT REPORT
-- ============================================================
CREATE TABLE public.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id       UUID REFERENCES public.artist_profiles(id),
  session_id      UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  incident_type   TEXT CHECK (incident_type IN ('client_fainted', 'medical', 'behaviour', 'other')),
  description     TEXT NOT NULL,
  follow_up_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. TASK (admin tasks & cleaning roster)
-- ============================================================
CREATE TABLE public.tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT,
  type                  TEXT DEFAULT 'general' CHECK (type IN ('general', 'enquiry_followup', 'stock_reorder', 'cleaning', 'admin')),
  priority              TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status                TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  due_date              TIMESTAMPTZ,
  assigned_to_staff_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_staff_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  related_enquiry_id    UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  related_product_id    UUID,
  location_area         TEXT,
  recurrence            TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 14. PRODUCT (inventory — MONEY ALLOWED HERE)
-- ============================================================
CREATE TABLE public.products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                 TEXT,
  name                TEXT NOT NULL,
  description         TEXT,
  price               NUMERIC(10,2),
  cost_price          NUMERIC(10,2),
  barcode             TEXT,
  stock_on_hand       INT DEFAULT 0,
  min_stock_level     INT DEFAULT 0,
  regular_stock_level INT DEFAULT 0,
  category            TEXT,
  supplier_code       TEXT,
  image_url           TEXT,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 15. PURCHASE ORDER (MONEY ALLOWED)
-- ============================================================
CREATE TABLE public.purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name   TEXT NOT NULL,
  order_date      DATE,
  expected_date   DATE,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'partial')),
  total_amount    NUMERIC(10,2),
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 16. PURCHASE ORDER LINE (MONEY ALLOWED)
-- ============================================================
CREATE TABLE public.purchase_order_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES public.products(id) ON DELETE SET NULL,
  qty_ordered       INT NOT NULL DEFAULT 0,
  qty_received      INT DEFAULT 0,
  unit_cost         NUMERIC(10,2),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 17. TRANSACTION (studio spend — MONEY ALLOWED)
-- ============================================================
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  category        TEXT CHECK (category IN ('shop', 'cleaning', 'tattoo_supplies', 'equipment', 'merch', 'drinks', 'other')),
  description     TEXT,
  amount          NUMERIC(10,2) NOT NULL,
  uploaded_by     UUID REFERENCES public.profiles(id),
  payment_method  TEXT CHECK (payment_method IN ('cash', 'eftpos', 'online', 'afterpay')),
  receipt_url     TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'reimbursed')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 18. TILL BALANCE (daily float/close-out)
-- ============================================================
CREATE TABLE public.till_balances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE NOT NULL,
  start_float     NUMERIC(10,2),
  end_count       NUMERIC(10,2),
  variance        NUMERIC(10,2) GENERATED ALWAYS AS (end_count - start_float) STORED,
  notes           TEXT,
  staff_id        UUID REFERENCES public.profiles(id),
  photo_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date)
);

-- ============================================================
-- 19. STAFF PURCHASE (tinnies, drinks etc. — MONEY ALLOWED)
-- ============================================================
CREATE TABLE public.staff_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item        TEXT NOT NULL,
  quantity    INT DEFAULT 1,
  price       NUMERIC(10,2),
  date        DATE NOT NULL,
  is_paid     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 20. SHOP SALE (POS — MONEY ALLOWED)
-- ============================================================
CREATE TABLE public.shop_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number     TEXT,
  sold_by         UUID REFERENCES public.profiles(id),
  total           NUMERIC(10,2) NOT NULL,
  payment_method  TEXT CHECK (payment_method IN ('cash', 'card', 'eftpos')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.shop_sale_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID NOT NULL REFERENCES public.shop_sales(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES public.products(id),
  qty         INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  line_total  NUMERIC(10,2) GENERATED ALWAYS AS (qty * unit_price) STORED
);

-- ============================================================
-- 21. MESSAGES (internal admin ↔ artist chat)
-- ============================================================
CREATE TABLE public.messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  is_read       BOOLEAN DEFAULT false,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 22. APP SETTINGS
-- ============================================================
CREATE TABLE public.app_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT,
  label       TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  UNIQUE(category, key)
);

-- ============================================================
-- 23. NOTIFICATION LOG
-- ============================================================
CREATE TABLE public.notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID REFERENCES public.profiles(id),
  type          TEXT CHECK (type IN ('sms', 'push', 'email')),
  subject       TEXT,
  body          TEXT,
  status        TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_artist_profiles BEFORE UPDATE ON public.artist_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_staff_records BEFORE UPDATE ON public.staff_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_schedule_days BEFORE UPDATE ON public.schedule_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sessions BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_weekly_submissions BEFORE UPDATE ON public.weekly_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_client_profiles BEFORE UPDATE ON public.client_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_incidents BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_purchase_orders BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_transactions BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED: Default app settings
-- ============================================================
INSERT INTO public.app_settings (category, key, value, label, sort_order) VALUES
  ('studio', 'studio_name', 'Villains Studio Hub', 'Studio Name', 1),
  ('studio', 'studio_phone', '', 'Studio Phone', 2),
  ('studio', 'studio_email', '', 'Studio Email', 3),
  ('studio', 'studio_instagram', '', 'Instagram Handle', 4),
  ('studio', 'studio_address', '', 'Studio Address', 5),
  ('schedule', 'reminder_day', 'sunday', 'Reminder Day', 1),
  ('schedule', 'reminder_time', '19:00', 'Reminder Time (24h)', 2)
ON CONFLICT (category, key) DO NOTHING;
