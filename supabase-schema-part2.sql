-- ============================================================
-- VILLAINS TATTOO STUDIO — Part 2: RLS Policies
-- ============================================================
-- Run this AFTER Part 1 has completed successfully
-- ============================================================

-- Helper function (needs profiles table to exist first)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── PROFILES ──
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── ARTIST DETAILS ──
ALTER TABLE public.artist_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artist_details_select_own" ON public.artist_details FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "artist_details_select_admin" ON public.artist_details FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "artist_details_insert_admin" ON public.artist_details FOR INSERT WITH CHECK (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "artist_details_update_admin" ON public.artist_details FOR UPDATE USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── SCHEDULE ENTRIES ──
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_select_own" ON public.schedule_entries FOR SELECT USING (artist_id = auth.uid());
CREATE POLICY "schedule_insert_own" ON public.schedule_entries FOR INSERT WITH CHECK (artist_id = auth.uid());
CREATE POLICY "schedule_update_own" ON public.schedule_entries FOR UPDATE USING (artist_id = auth.uid());
CREATE POLICY "schedule_select_admin" ON public.schedule_entries FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── LEAVE REQUESTS ──
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_select_own" ON public.leave_requests FOR SELECT USING (artist_id = auth.uid());
CREATE POLICY "leave_insert_own" ON public.leave_requests FOR INSERT WITH CHECK (artist_id = auth.uid());
CREATE POLICY "leave_select_admin" ON public.leave_requests FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "leave_update_admin" ON public.leave_requests FOR UPDATE USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── ENQUIRIES ──
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enquiries_admin" ON public.enquiries FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "enquiries_artist_read" ON public.enquiries FOR SELECT USING (assigned_artist_id = auth.uid());

-- ── ARTIST CLIENTS (CRITICAL: artist only, admin gets NOTHING) ──
ALTER TABLE public.artist_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artist_clients_own" ON public.artist_clients FOR ALL USING (artist_id = auth.uid());

-- ── CLIENT IDEAS ──
ALTER TABLE public.client_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_ideas_own" ON public.client_ideas FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.artist_clients
    WHERE artist_clients.id = client_ideas.artist_client_id
    AND artist_clients.artist_id = auth.uid()
  )
);

-- ── BOOKINGS ──
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_own" ON public.bookings FOR ALL USING (artist_id = auth.uid());
CREATE POLICY "bookings_admin_read" ON public.bookings FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── PAYMENT ENVELOPES ──
ALTER TABLE public.payment_envelopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "envelopes_select_own" ON public.payment_envelopes FOR SELECT USING (artist_id = auth.uid());
CREATE POLICY "envelopes_insert_own" ON public.payment_envelopes FOR INSERT WITH CHECK (artist_id = auth.uid());
CREATE POLICY "envelopes_admin_read" ON public.payment_envelopes FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "envelopes_admin_update" ON public.payment_envelopes FOR UPDATE USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── MESSAGES ──
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_own" ON public.messages FOR ALL USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- ── INCIDENTS ──
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents_admin" ON public.incidents FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "incidents_artist_read" ON public.incidents FOR SELECT USING (artist_id = auth.uid());

-- ── ARTIST CONVERSATIONS ──
ALTER TABLE public.artist_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_own" ON public.artist_conversations FOR ALL USING (artist_id = auth.uid());

-- ── APP SETTINGS ──
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_write" ON public.app_settings FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── NOTIFICATION LOG ──
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_admin" ON public.notification_log FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));
