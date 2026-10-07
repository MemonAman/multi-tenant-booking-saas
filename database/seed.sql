-- =============================================================================
-- Multi-Tenant Appointment & Booking SaaS — Seed Demo Data
-- Creates 2 distinct tenant businesses for testing cross-tenant isolation
-- =============================================================================

-- Clean existing data (Optional / Development reset)
TRUNCATE public.businesses CASCADE;

-- Insert Business 1: Demo Barber Shop
INSERT INTO public.businesses (id, owner_user_id, name, slug, timezone, phone, email, status)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Demo Barber Shop',
    'demo-barber',
    'America/New_York',
    '+1 555-0199',
    'owner@demobarber.com',
    'active'
);

-- Insert Business 2: Elite Hair & Beauty Salon
INSERT INTO public.businesses (id, owner_user_id, name, slug, timezone, phone, email, status)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'Elite Hair & Beauty Salon',
    'elite-salon',
    'America/Los_Angeles',
    '+1 555-0288',
    'contact@elitesalon.com',
    'active'
);

-- Services for Business 1 (Demo Barber Shop)
INSERT INTO public.services (id, business_id, name, description, duration_minutes, price, active) VALUES
('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Classic Haircut', 'Precision haircut including shampoo and styling', 30, 3500, true),
('11111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Beard Trim & Shape', 'Beard detail with hot towel treatment', 20, 2500, true),
('11111111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'The Deluxe Combo', 'Classic Haircut + Beard Trim + Facial massage', 60, 5500, true);

-- Services for Business 2 (Elite Salon)
INSERT INTO public.services (id, business_id, name, description, duration_minutes, price, active) VALUES
('22222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Women Signature Cut', 'Full wash, layered haircut, blowdry styling', 60, 7500, true),
('22222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Full Hair Coloring', 'Single process color and gloss treatment', 90, 12000, true);

-- Providers for Business 1
INSERT INTO public.providers (id, business_id, name, active) VALUES
('11111111-7777-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alex Barber', true),
('11111111-7777-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Jordan Stylist', true);

-- Business Operating Hours (Mon-Fri 09:00 - 18:00 for Demo Barber)
INSERT INTO public.business_hours (business_id, day_of_week, start_time, end_time, enabled) VALUES
('11111111-1111-1111-1111-111111111111', 1, '09:00', '18:00', true),
('11111111-1111-1111-1111-111111111111', 2, '09:00', '18:00', true),
('11111111-1111-1111-1111-111111111111', 3, '09:00', '18:00', true),
('11111111-1111-1111-1111-111111111111', 4, '09:00', '18:00', true),
('11111111-1111-1111-1111-111111111111', 5, '09:00', '18:00', true),
('11111111-1111-1111-1111-111111111111', 6, '10:00', '16:00', true);

-- Client CRM Record for Business 1
INSERT INTO public.clients (id, business_id, name, email, phone, notes) VALUES
('11111111-9999-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'John Doe', 'john.doe@example.com', '+1 555-0101', 'Prefers low fade. Regular customer.');

-- Subscriptions Baseline
INSERT INTO public.subscriptions (business_id, plan, status) VALUES
('11111111-1111-1111-1111-111111111111', 'monthly_pro', 'active'),
('22222222-2222-2222-2222-222222222222', 'monthly_pro', 'active');
