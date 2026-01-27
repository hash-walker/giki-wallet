-- Standardized Seed Data for GIKI Transport Module

-- Clear existing data to avoid conflicts
DELETE FROM giki_transport.trip_stops;
DELETE FROM giki_transport.trip;
DELETE FROM giki_transport.route_master_stops;
DELETE FROM giki_transport.routes;
DELETE FROM giki_transport.stops;
DELETE FROM giki_transport.driver;
DELETE FROM giki_transport.quota_rules;

-- 1. POPULATE ALL STOPS
-- ...
INSERT INTO giki_transport.stops (address) VALUES
('GIKI Main Campus'),
('Islamabad'),
('Rawalpindi'),
('Peshawar'),
('Abbottabad'),
('G-9/4 Peshawar Morh'),
('Road Master Terminal'),
('Daewoo Terminal (EME Collage)'),
('Burhan Interchange'),
('Bagh-e Naran'),
('Ali CNG Ring Road'),
('Charssadda Interchange'),
('Rashkai Interchange'),
('GO/ Total Fuel Station'),
('Havailyan Interchange'),
('Chichian/Haripur Interchange'),
('Hattar/Haripur Interchange'),
('Shah Maqsood Interchange');

-- 2. POPULATE ROUTES
-- Outbound
INSERT INTO giki_transport.routes (name, origin_stop_id, destination_stop_id)
VALUES
    ('GIKI to Islamabad', (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), (SELECT id FROM giki_transport.stops WHERE address = 'Islamabad')),
    ('GIKI to Rawalpindi', (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), (SELECT id FROM giki_transport.stops WHERE address = 'Rawalpindi')),
    ('GIKI to Peshawar', (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), (SELECT id FROM giki_transport.stops WHERE address = 'Peshawar')),
    ('GIKI to Abbottabad', (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), (SELECT id FROM giki_transport.stops WHERE address = 'Abbottabad'));

-- Inbound
INSERT INTO giki_transport.routes (name, origin_stop_id, destination_stop_id)
VALUES
    ('Islamabad to GIKI', (SELECT id FROM giki_transport.stops WHERE address = 'Islamabad'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus')),
    ('Rawalpindi to GIKI', (SELECT id FROM giki_transport.stops WHERE address = 'Rawalpindi'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus')),
    ('Peshawar to GIKI', (SELECT id FROM giki_transport.stops WHERE address = 'Peshawar'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus')),
    ('Abbottabad to GIKI', (SELECT id FROM giki_transport.stops WHERE address = 'Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'));

-- 3. POPULATE MASTER STOPS
-- GIKI to Islamabad
INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order)
VALUES
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), 0),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Burhan Interchange'), 1),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Road Master Terminal'), 2),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad'), (SELECT id FROM giki_transport.stops WHERE address = 'G-9/4 Peshawar Morh'), 3),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Islamabad'), 4);

-- Islamabad to GIKI
INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order)
VALUES
    ((SELECT id FROM giki_transport.routes WHERE name = 'Islamabad to GIKI'), (SELECT id FROM giki_transport.stops WHERE address = 'Islamabad'), 0),
    ((SELECT id FROM giki_transport.routes WHERE name = 'Islamabad to GIKI'), (SELECT id FROM giki_transport.stops WHERE address = 'G-9/4 Peshawar Morh'), 1),
    ((SELECT id FROM giki_transport.routes WHERE name = 'Islamabad to GIKI'), (SELECT id FROM giki_transport.stops WHERE address = 'Road Master Terminal'), 2),
    ((SELECT id FROM giki_transport.routes WHERE name = 'Islamabad to GIKI'), (SELECT id FROM giki_transport.stops WHERE address = 'Burhan Interchange'), 3),
    ((SELECT id FROM giki_transport.routes WHERE name = 'Islamabad to GIKI'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), 4);

-- GIKI to Rawalpindi
INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order)
VALUES
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Rawalpindi'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), 0),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Rawalpindi'), (SELECT id FROM giki_transport.stops WHERE address = 'Burhan Interchange'), 1),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Rawalpindi'), (SELECT id FROM giki_transport.stops WHERE address = 'Daewoo Terminal (EME Collage)'), 2),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Rawalpindi'), (SELECT id FROM giki_transport.stops WHERE address = 'Rawalpindi'), 3);

-- GIKI to Peshawar
INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order)
VALUES
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Peshawar'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), 0),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Peshawar'), (SELECT id FROM giki_transport.stops WHERE address = 'Rashkai Interchange'), 1),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Peshawar'), (SELECT id FROM giki_transport.stops WHERE address = 'Charssadda Interchange'), 2),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Peshawar'), (SELECT id FROM giki_transport.stops WHERE address = 'Ali CNG Ring Road'), 3),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Peshawar'), (SELECT id FROM giki_transport.stops WHERE address = 'Bagh-e Naran'), 4),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Peshawar'), (SELECT id FROM giki_transport.stops WHERE address = 'Peshawar'), 5);

-- GIKI to Abbottabad
INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order)
VALUES
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'GIKI Main Campus'), 0),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Shah Maqsood Interchange'), 1),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Hattar/Haripur Interchange'), 2),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Chichian/Haripur Interchange'), 3),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Havailyan Interchange'), 4),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'GO/ Total Fuel Station'), 5),
    ((SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad'), (SELECT id FROM giki_transport.stops WHERE address = 'Abbottabad'), 6);

-- 4. POPULATE DRIVER
INSERT INTO giki_transport.driver (name, phone_number, license_number, is_active) VALUES
('Imran Khan', '03001234567', 'LIC-101', true),
('Asif Ali', '03007654321', 'LIC-102', true);

-- 5. POPULATE QUOTA RULES
INSERT INTO giki_transport.quota_rules (user_role, direction, weekly_limit, allow_dependent_booking)
VALUES 
    ('STUDENT',  'OUTBOUND', 1, FALSE),
    ('STUDENT',  'INBOUND',  1, FALSE),
    ('EMPLOYEE', 'OUTBOUND', 3, TRUE),
    ('EMPLOYEE', 'INBOUND',  3, TRUE)
ON CONFLICT DO NOTHING;

select * from giki_transport.quota_rules;

-- 6. POPULATE SAMPLE TRIPS
-- ...
-- Outbound: GIKI to Islamabad (Scheduled for tomorrow 9 AM)
INSERT INTO giki_transport.trip (route_id, driver_id, departure_time, booking_opens_at, booking_closes_at, direction, total_capacity, available_seats, base_price, status, booking_status)
VALUES
(
    (SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad'),
    (SELECT id FROM giki_transport.driver WHERE name = 'Imran Khan'),
    CURRENT_DATE + 1 + TIME '09:00:00',
    CURRENT_DATE - 1,
    CURRENT_DATE + 1 + TIME '08:00:00',
    'OUTBOUND', 30, 30, 800, 'SCHEDULED', 'OPEN'
);

-- Inbound: Islamabad to GIKI (Scheduled for tomorrow 5 PM)
INSERT INTO giki_transport.trip (route_id, driver_id, departure_time, booking_opens_at, booking_closes_at, direction, total_capacity, available_seats, base_price, status, booking_status)
VALUES
(
    (SELECT id FROM giki_transport.routes WHERE name = 'Islamabad to GIKI'),
    (SELECT id FROM giki_transport.driver WHERE name = 'Imran Khan'),
    CURRENT_DATE + 1 + TIME '17:00:00',
    CURRENT_DATE - 1,
    CURRENT_DATE + 1 + TIME '16:00:00',
    'INBOUND', 30, 30, 800, 'SCHEDULED', 'OPEN'
);

-- Trip Stops for Sample Trips
-- Trip 1 (Outbound)
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order)
SELECT 
    (SELECT id FROM giki_transport.trip WHERE direction = 'OUTBOUND' LIMIT 1),
    rms.stop_id,
    rms.default_sequence_order
FROM giki_transport.route_master_stops rms
JOIN giki_transport.routes r ON rms.route_id = r.id
WHERE r.name = 'GIKI to Islamabad';

-- Trip 2 (Inbound)
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order)
SELECT 
    (SELECT id FROM giki_transport.trip WHERE direction = 'INBOUND' LIMIT 1),
    rms.stop_id,
    rms.default_sequence_order
FROM giki_transport.route_master_stops rms
JOIN giki_transport.routes r ON rms.route_id = r.id
WHERE r.name = 'Islamabad to GIKI';
