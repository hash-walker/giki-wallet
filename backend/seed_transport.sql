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

INSERT INTO giki_transport.trip (
    route_id,
    driver_id,
    departure_time,

    booking_open_offset_hours,   -- Hours BEFORE departure to open
    booking_close_offset_hours,  -- Hours BEFORE departure to close

    total_capacity,
    available_seats,
    base_price,
    direction,
    bus_type,

    status -- We let the DB calculate this, but for seed data we can force it or let the default logic run.
    -- Since we are bypassing the 'CreateTrip' function here, we must manually set valid statuses
    -- OR trust the timestamps match the status we write.
)
VALUES
    -- ==============================================================================
    -- SCENARIO 1: THE "LIVE" TRIP (Status: OPEN)
    -- Logic: Departs in 2 Days. Opens 5 Days before.
    -- Result: We are in the middle of the window.
    -- ==============================================================================
    (
        (SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad' LIMIT 1),
        (SELECT id FROM giki_transport.driver LIMIT 1),
        NOW() + INTERVAL '2 days',  -- Departs day after tomorrow
        120,                        -- Opens 5 days before (120h)
        2,                          -- Closes 2 hours before
        50, 48,                     -- 2 seats already taken
        800.00,
        'OUTBOUND',
        'EMPLOYEE',
        'OPEN'
    ),

    -- ==============================================================================
    -- SCENARIO 2: THE "COMING SOON" TRIP (Status: SCHEDULED)
    -- Logic: Departs in 7 Days. Opens 2 Days before.
    -- Result: It is too early to book.
    -- ==============================================================================
    (
        (SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Peshawar' LIMIT 1),
        (SELECT id FROM giki_transport.driver OFFSET 1 LIMIT 1),
        NOW() + INTERVAL '7 days',  -- Departs next week
        48,                         -- Opens only 48h before
        2,
        30, 30,
        700.00,
        'OUTBOUND',
        'STUDENT',
        'SCHEDULED'
    ),

    -- ==============================================================================
    -- SCENARIO 3: THE "MISSED IT" TRIP (Status: CLOSED)
    -- Logic: Departs in 1 Hour. Closed 2 Hours before.
    -- Result: The booking window closed 1 hour ago.
    -- ==============================================================================
    (
        (SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Abbottabad' LIMIT 1),
        (SELECT id FROM giki_transport.driver LIMIT 1),
        NOW() + INTERVAL '1 hour',  -- Bus is about to leave
        120,
        2,                          -- Closed 2 hours before departure (so closed 1 hour ago)
        30, 5,
        600.00,
        'OUTBOUND',
        'EMPLOYEE',
        'CLOSED'
    ),

    -- ==============================================================================
    -- SCENARIO 4: THE "SOLD OUT" TRIP (Status: OPEN but 0 seats)
    -- Logic: Window is Open, but seats are 0.
    -- Frontend should show "Sold Out" or "Waitlist".
    -- ==============================================================================
    (
        (SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad' LIMIT 1),
        (SELECT id FROM giki_transport.driver LIMIT 1),
        NOW() + INTERVAL '3 days',
        120,
        2,
        50, 0,                      -- 0 SEATS LEFT!
        800.00,
        'OUTBOUND',
        'EMPLOYEE',
        'OPEN' -- Technically status is open, but logic will flag it as full
    ),

    -- ==============================================================================
    -- SCENARIO 5: THE "RETURN" TRIP (Inbound)
    -- ==============================================================================
    (
        (SELECT id FROM giki_transport.routes WHERE name = 'GIKI to Islamabad' LIMIT 1),
        (SELECT id FROM giki_transport.driver LIMIT 1),
        NOW() + INTERVAL '4 days' + INTERVAL '5 hours', -- Sunday Evening
        120,
        2,
        50, 50,
        850.00,
        'INBOUND',
        'STUDENT',
        'OPEN'
    );