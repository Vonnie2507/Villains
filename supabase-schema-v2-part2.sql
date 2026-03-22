-- ============================================================
-- VILLAINS STUDIO HUB — V2 Schema Part 2: RLS Policies
-- ============================================================
-- Run AFTER Part 1.
-- ============================================================

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: get current user's artist_profile id
CREATE OR REPLACE FUNCTION public.get_artist_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.artist_profiles WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── PROFILES ──
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── ARTIST PROFILES ──
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artist_profiles_select" ON public.artist_profiles FOR SELECT USING (true);
CREATE POLICY "artist_profiles_update_own" ON public.artist_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "artist_profiles_admin" ON public.artist_profiles FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── STAFF RECORDS ──
ALTER TABLE public.staff_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_select_own" ON public.staff_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "staff_admin" ON public.staff_records FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── SCHEDULE DAYS ──
ALTER TABLE public.schedule_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_own" ON public.schedule_days FOR ALL USING (artist_id = public.get_artist_profile_id());
CREATE POLICY "sched_admin_read" ON public.schedule_days FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── SESSIONS (NO MONEY — artist private) ──
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON public.sessions FOR ALL USING (artist_id = public.get_artist_profile_id());
-- Admin can see session metadata (date, count, envelope status) but NOT client_reference in practice (enforced in UI)
CREATE POLICY "sessions_admin_read" ON public.sessions FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── WEEKLY SUBMISSIONS ──
ALTER TABLE public.weekly_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_own" ON public.weekly_submissions FOR ALL USING (artist_id = public.get_artist_profile_id());
CREATE POLICY "submissions_admin_read" ON public.weekly_submissions FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── LEAVE REQUESTS ──
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_own" ON public.leave_requests FOR ALL USING (artist_id = public.get_artist_profile_id());
CREATE POLICY "leave_admin" ON public.leave_requests FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── CLIENT PROFILES (CRITICAL PRIVACY) ──
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
-- Artists see only their own clients (full access)
CREATE POLICY "clients_artist_own" ON public.client_profiles FOR ALL USING (artist_id = public.get_artist_profile_id());
-- Admin can see limited fields (display_name, status, stage, source, priority, handoff) but NOT phone/email/instagram (enforced in UI)
CREATE POLICY "clients_admin_read" ON public.client_profiles FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "clients_admin_update" ON public.client_profiles FOR UPDATE USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "clients_admin_insert" ON public.client_profiles FOR INSERT WITH CHECK (public.get_user_role() IN ('super_admin', 'admin'));

-- ── CLIENT MEDIA (artist only) ──
ALTER TABLE public.client_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_own" ON public.client_media FOR ALL USING (
  EXISTS (SELECT 1 FROM public.client_profiles WHERE client_profiles.id = client_media.client_profile_id AND client_profiles.artist_id = public.get_artist_profile_id())
);

-- ── COMMUNICATION THREADS ──
ALTER TABLE public.communication_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threads_artist_own" ON public.communication_threads FOR ALL USING (artist_id = public.get_artist_profile_id());
-- Admin can see thread metadata (channel, last_message_at) but NOT message bodies (enforced in UI)
CREATE POLICY "threads_admin_read" ON public.communication_threads FOR SELECT USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── COMMUNICATION MESSAGES (artist only — admin cannot see bodies) ──
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_artist_own" ON public.communication_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.communication_threads WHERE communication_threads.id = communication_messages.thread_id AND communication_threads.artist_id = public.get_artist_profile_id())
);
-- Admin can see message count per thread but NOT bodies (admin reads threads table only, not messages)

-- ── INCIDENTS ──
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidents_admin" ON public.incidents FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "incidents_artist_own" ON public.incidents FOR ALL USING (artist_id = public.get_artist_profile_id());

-- ── TASKS (admin only) ──
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_admin" ON public.tasks FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── PRODUCTS (admin only) ──
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_admin" ON public.products FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY "products_read" ON public.products FOR SELECT USING (true);

-- ── PURCHASE ORDERS (admin only) ──
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "po_admin" ON public.purchase_orders FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pol_admin" ON public.purchase_order_lines FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── TRANSACTIONS (admin only) ──
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_admin" ON public.transactions FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── TILL BALANCES (admin only) ──
ALTER TABLE public.till_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "till_admin" ON public.till_balances FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── STAFF PURCHASES (admin can see all, staff see own) ──
ALTER TABLE public.staff_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_own" ON public.staff_purchases FOR SELECT USING (staff_id = auth.uid());
CREATE POLICY "sp_admin" ON public.staff_purchases FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── SHOP SALES (admin only) ──
ALTER TABLE public.shop_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_admin" ON public.shop_sales FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

ALTER TABLE public.shop_sale_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_lines_admin" ON public.shop_sale_lines FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── MESSAGES (internal chat) ──
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_own" ON public.messages FOR ALL USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- ── APP SETTINGS ──
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin" ON public.app_settings FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));

-- ── NOTIFICATION LOG ──
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_admin" ON public.notification_log FOR ALL USING (public.get_user_role() IN ('super_admin', 'admin'));
