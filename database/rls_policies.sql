-- =============================================================================
-- Multi-Tenant Appointment & Booking SaaS — Row-Level Security (RLS) Policies
-- Enforces database-level tenant isolation using Supabase auth.uid()
-- =============================================================================

-- Enable Row-Level Security on all tenant-owned tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get business IDs associated with authenticated user
CREATE OR REPLACE FUNCTION public.get_user_business_ids()
RETURNS SETOF UUID AS $$
  SELECT business_id 
  FROM public.business_members 
  WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- 1. Businesses Table Policies
-- -----------------------------------------------------------------------------
-- Public can view active business profiles by slug
CREATE POLICY "Public businesses view active" ON public.businesses
  FOR SELECT USING (status = 'active');

-- Authenticated business members can select/update their business
CREATE POLICY "Tenant owner view business" ON public.businesses
  FOR ALL USING (id IN (SELECT public.get_user_business_ids()));

-- -----------------------------------------------------------------------------
-- 2. Business Members Table Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Tenant member view membership" ON public.business_members
  FOR ALL USING (user_id = auth.uid() OR business_id IN (SELECT public.get_user_business_ids()));

-- -----------------------------------------------------------------------------
-- 3. Services Table Policies
-- -----------------------------------------------------------------------------
-- Public can view active services
CREATE POLICY "Public services view active" ON public.services
  FOR SELECT USING (active = true);

-- Tenant admins can manage services
CREATE POLICY "Tenant admin manage services" ON public.services
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

-- -----------------------------------------------------------------------------
-- 4. Providers & Provider Services Table Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Public providers view active" ON public.providers
  FOR SELECT USING (active = true);

CREATE POLICY "Tenant admin manage providers" ON public.providers
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

CREATE POLICY "Public provider services view" ON public.provider_services
  FOR SELECT USING (true);

CREATE POLICY "Tenant admin manage provider services" ON public.provider_services
  FOR ALL USING (
    provider_id IN (SELECT id FROM public.providers WHERE business_id IN (SELECT public.get_user_business_ids()))
  );

-- -----------------------------------------------------------------------------
-- 5. Hours & Blocked Periods Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Public business hours view" ON public.business_hours FOR SELECT USING (true);
CREATE POLICY "Tenant admin manage business hours" ON public.business_hours
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

CREATE POLICY "Public provider hours view" ON public.provider_hours FOR SELECT USING (true);
CREATE POLICY "Tenant admin manage provider hours" ON public.provider_hours
  FOR ALL USING (
    provider_id IN (SELECT id FROM public.providers WHERE business_id IN (SELECT public.get_user_business_ids()))
  );

CREATE POLICY "Public blocked periods view" ON public.blocked_periods FOR SELECT USING (true);
CREATE POLICY "Tenant admin manage blocked periods" ON public.blocked_periods
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

-- -----------------------------------------------------------------------------
-- 6. Clients CRM Policies
-- -----------------------------------------------------------------------------
-- Public can insert new client during booking
CREATE POLICY "Public client insert" ON public.clients
  FOR INSERT WITH CHECK (true);

-- Tenant admins can view and update CRM records (Public cannot select private notes)
CREATE POLICY "Tenant admin manage clients" ON public.clients
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

-- -----------------------------------------------------------------------------
-- 7. Bookings Table Policies
-- -----------------------------------------------------------------------------
-- Public can create booking
CREATE POLICY "Public create booking" ON public.bookings
  FOR INSERT WITH CHECK (true);

-- Tenant admins can view, modify, cancel bookings
CREATE POLICY "Tenant admin manage bookings" ON public.bookings
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

-- -----------------------------------------------------------------------------
-- 8. Audit Events, Reminders & Subscriptions Policies (Tenant Private)
-- -----------------------------------------------------------------------------
CREATE POLICY "Tenant admin manage booking events" ON public.booking_events
  FOR ALL USING (
    booking_id IN (SELECT id FROM public.bookings WHERE business_id IN (SELECT public.get_user_business_ids()))
  );

CREATE POLICY "Tenant admin manage reminders" ON public.reminders
  FOR ALL USING (
    booking_id IN (SELECT id FROM public.bookings WHERE business_id IN (SELECT public.get_user_business_ids()))
  );

CREATE POLICY "Tenant admin view subscription" ON public.subscriptions
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));

CREATE POLICY "Tenant admin view notification logs" ON public.notification_logs
  FOR ALL USING (business_id IN (SELECT public.get_user_business_ids()));
