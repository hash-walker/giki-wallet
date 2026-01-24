-- +goose up

CREATE TABLE giki_transport.stops(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        address VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE giki_transport.routes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,

        origin_stop_id uuid REFERENCES giki_transport.stops(id) NOT NULL,
        destination_stop_id uuid REFERENCES giki_transport.stops(id) NOT NULL,

        is_active BOOLEAN DEFAULT TRUE,

        default_booking_open_offset_hours INT DEFAULT 48,
        default_booking_close_offset_hours INT DEFAULT 5,

        CONSTRAINT unique_route_path UNIQUE(origin_stop_id, destination_stop_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE giki_transport.route_master_stops(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    route_id uuid REFERENCES giki_transport.routes(id) ON DELETE CASCADE NOT NULL,
    stop_id uuid REFERENCES giki_transport.stops(id) NOT NULL,

    default_sequence_order INT NOT NULL,

    UNIQUE(route_id, stop_id),
    UNIQUE(route_id, default_sequence_order),

    is_default_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE giki_transport.driver (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    license_number VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE giki_transport.trip (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id uuid REFERENCES giki_transport.routes(id) NOT NULL,
    driver_id uuid REFERENCES giki_transport.driver(id),

    departure_time TIMESTAMPTZ NOT NULL,

    booking_opens_at TIMESTAMPTZ NOT NULL,
    booking_closes_at TIMESTAMPTZ NOT NULL,

    direction VARCHAR(10) NOT NULL DEFAULT 'OUTBOUND', -- 'OUTBOUND' or 'INBOUND'
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    total_capacity INT NOT NULL,
    available_seats INT NOT NULL,

    status VARCHAR(20) DEFAULT 'SCHEDULED',
    booking_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE giki_transport.quota_rules (
    user_role VARCHAR(50) NOT NULL,      -- 'STUDENT', 'EMPLOYEE'
    direction VARCHAR(10) NOT NULL,      -- 'OUTBOUND', 'INBOUND'

    weekly_limit INT NOT NULL DEFAULT 1,
    allow_dependent_booking BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (user_role, direction)
);

CREATE TABLE giki_transport.route_weekly_schedules (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     route_id uuid REFERENCES giki_transport.routes(id) NOT NULL,

    -- 1 = Monday, 7 = Sunday
     day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),

     departure_time TIME NOT NULL,

     created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE giki_transport.trip_stops (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

     trip_id uuid REFERENCES giki_transport.trip(id) ON DELETE CASCADE NOT NULL,
     stop_id uuid REFERENCES giki_transport.stops(id) NOT NULL,

    -- We copy this from route_master_stops so the history is preserved
    -- even if the main route changes later.
     sequence_order INT NOT NULL,

     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

     UNIQUE(trip_id, stop_id),
     UNIQUE(trip_id, sequence_order)
);

CREATE TABLE giki_transport.tickets (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     trip_id uuid REFERENCES giki_transport.trip(id) NOT NULL,
     user_id uuid NOT NULL REFERENCES giki_wallet.users(id),

     pickup_stop_id uuid REFERENCES giki_transport.stops(id) NOT NULL,
     dropoff_stop_id uuid REFERENCES giki_transport.stops(id) NOT NULL,

     passenger_name VARCHAR(100) NOT NULL,
     passenger_relation VARCHAR(20) NOT NULL,

     status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
     booking_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
     UNIQUE(trip_id, user_id)
);

CREATE TABLE giki_transport.trip_holds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id uuid REFERENCES giki_transport.trip(id) NOT NULL,
        user_id uuid NOT NULL REFERENCES giki_wallet.users(id),

        pickup_stop_id uuid NOT NULL,
        dropoff_stop_id uuid NOT NULL,

        passenger_name VARCHAR(100),
        passenger_relation VARCHAR(20),

        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        UNIQUE(trip_id, user_id)
);



-- +goose down
DROP TABLE IF EXISTS giki_transport.trip_holds;
DROP TABLE IF EXISTS giki_transport.tickets;
DROP TABLE IF EXISTS giki_transport.trip_stops;
DROP TABLE IF EXISTS giki_transport.trip;
DROP TABLE IF EXISTS giki_transport.driver;
DROP TABLE IF EXISTS giki_transport.route_master_stops;
DROP TABLE IF EXISTS giki_transport.route_weekly_schedules;
DROP TABLE IF EXISTS giki_transport.routes;
DROP TABLE IF EXISTS giki_transport.stops;


