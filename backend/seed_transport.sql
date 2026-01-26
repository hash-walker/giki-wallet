-- Seed Data for GIKI Transport Module
-- This script populates stops, routes, drivers, and trips for testing.

-- 1. Insert Stops
INSERT INTO giki_transport.stops (id, address) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'GIKI Main Gate'),
('550e8400-e29b-41d4-a716-446655440002', 'Topi Chowk'),
('550e8400-e29b-41d4-a716-446655440003', 'Islamabad Zero Point'),
('550e8400-e29b-41d4-a716-446655440004', 'Rawalpindi Saddar'),
('550e8400-e29b-41d4-a716-446655440005', 'Peshawar Saddar')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Routes
INSERT INTO giki_transport.routes (id, name, origin_stop_id, destination_stop_id, is_active, default_booking_open_offset_hours, default_booking_close_offset_hours) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'GIKI to Islamabad', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', true, 24, 1),
('660e8400-e29b-41d4-a716-446655440002', 'Islamabad to GIKI', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', true, 24, 1),
('660e8400-e29b-41d4-a716-446655440003', 'GIKI to Rawalpindi', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', true, 24, 1),
('660e8400-e29b-41d4-a716-446655440004', 'Rawalpindi to GIKI', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', true, 24, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. Route Master Stops (Sequence)
-- GIKI to Islamabad
INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order, is_default_active) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 1, true),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 2, true),
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 3, true)
ON CONFLICT DO NOTHING;

-- Islamabad to GIKI
INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order, is_default_active) VALUES
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 1, true),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 2, true),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 3, true)
ON CONFLICT DO NOTHING;

-- 4. Drivers
INSERT INTO giki_transport.driver (id, name, phone_number, license_number, is_active) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'Ahmad Khan', '03001112223', 'LIC-001', true),
('770e8400-e29b-41d4-a716-446655440002', 'Saif Ullah', '03004445556', 'LIC-002', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Quota Rules
INSERT INTO giki_transport.quota_rules (user_role, direction, weekly_limit, allow_dependent_booking) VALUES
('STUDENT', 'OUTBOUND', 5, true),
('STUDENT', 'INBOUND', 5, true),
('EMPLOYEE', 'OUTBOUND', 10, true),
('EMPLOYEE', 'INBOUND', 10, true)
ON CONFLICT (user_role, direction) DO UPDATE 
SET weekly_limit = EXCLUDED.weekly_limit, 
    allow_dependent_booking = EXCLUDED.allow_dependent_booking;

-- 6. Sample Trips (Scheduled for tomorrow and onwards)
-- Tomorrow Morning: GIKI to Islamabad
INSERT INTO giki_transport.trip (id, route_id, driver_id, departure_time, booking_opens_at, booking_closes_at, direction, total_capacity, available_seats, base_price, status, booking_status) VALUES
('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', NOW() + INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day 7 hours', 'OUTBOUND', 30, 30, 750, 'SCHEDULED', 'OPEN'),
('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', NOW() + INTERVAL '1 day 17 hours', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day 16 hours', 'INBOUND', 30, 30, 750, 'SCHEDULED', 'OPEN'),
-- Day After Tomorrow
('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', NOW() + INTERVAL '2 days 8 hours', NOW() + INTERVAL '1 day 8 hours', NOW() + INTERVAL '2 days 7 hours', 'OUTBOUND', 30, 30, 750, 'SCHEDULED', 'OPEN'),
('880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', NOW() + INTERVAL '2 days 17 hours', NOW() + INTERVAL '1 day 17 hours', NOW() + INTERVAL '2 days 16 hours', 'INBOUND', 30, 30, 750, 'SCHEDULED', 'OPEN')
ON CONFLICT (id) DO NOTHING;

-- 7. Trip Stops
-- Trip 1 Stops
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order) VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 1),
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 2),
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 3)
ON CONFLICT DO NOTHING;

-- Trip 2 Stops
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order) VALUES
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 1),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 2),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 3)
ON CONFLICT DO NOTHING;

-- Trip 3 Stops
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order) VALUES
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 1),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 2),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 3)
ON CONFLICT DO NOTHING;

-- Trip 4 Stops
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order) VALUES
('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 1),
('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 2),
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 3)
ON CONFLICT DO NOTHING;
