-- =============================================
-- 1. ROUTE & TRIP MANAGEMENT (Admin/System)
-- =============================================

-- name: GetAllRoutes :many
SELECT id, name FROM giki_transport.routes
WHERE is_active = TRUE
ORDER BY name ASC;

-- name: GetRouteStopsDetails :many
SELECT

    r.id as route_id, r.name as route_name,
    r.default_booking_open_offset_hours,
    r.default_booking_close_offset_hours,

    s.id as stop_id, s.address as stop_name,

    rms.default_sequence_order,
    rms.is_default_active

FROM giki_transport.routes as r
JOIN giki_transport.route_master_stops as rms ON r.id = rms.route_id
JOIN giki_transport.stops as s ON rms.stop_id = s.id
WHERE r.id = $1
ORDER BY rms.default_sequence_order ASC;

-- name: GetRouteWeeklySchedule :many

SELECT id, route_id, day_of_week, departure_time, created_at
FROM giki_transport.route_weekly_schedules
WHERE route_id = $1
ORDER BY day_of_week ASC, departure_time ASC;

-- name: CreateTrip :one
INSERT INTO giki_transport.trip(
    route_id,
    departure_time,
    booking_open_offset_hours,
    booking_close_offset_hours,
    total_capacity,
    available_seats,
    base_price,
    direction,
    bus_type,
    status
)
VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           CASE
               -- If creation happens AFTER the closing window (e.g. last minute admin entry)
               WHEN NOW() >= ($2::TIMESTAMPTZ - ($4::INTEGER * INTERVAL '1 hour')) THEN 'CLOSED'

               -- If creation happens BEFORE the window opens
               -- (Departure - Open Offset)
               WHEN NOW() < ($2::TIMESTAMPTZ - ($3::INTEGER * INTERVAL '1 hour')) THEN 'SCHEDULED'

               -- Logic 3: Otherwise, it is currently active
               ELSE 'OPEN'
               END
       )
RETURNING id;

-- name: CreateTripStop :exec
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order)
VALUES ($1, $2, $3);

-- name: GetWeeklyTripsWithStops :many
SELECT
    t.id as trip_id,
    r.id as route_id,
    r.name as route_name,
    t.direction,
    t.bus_type,

    t.departure_time,

    -- Calculated Offsets
    (t.departure_time - (t.booking_open_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_opens_at,
    (t.departure_time - (t.booking_close_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_closes_at,

    t.status,
    t.available_seats,
    t.total_capacity,
    t.base_price,

    (
        SELECT COALESCE(JSON_AGG(
                                JSON_BUILD_OBJECT(
                                        'stop_id', s.id,
                                        'stop_name', s.address,
                                        'sequence', ts.sequence_order
                                ) ORDER BY ts.sequence_order ASC
                        ), '[]')::text
        FROM giki_transport.trip_stops ts
                 JOIN giki_transport.stops s ON ts.stop_id = s.id
        WHERE ts.trip_id = t.id
    ) as stops_json

FROM giki_transport.trip t
         JOIN giki_transport.routes r ON t.route_id = r.id
WHERE
    t.departure_time > NOW()
  AND t.departure_time < (NOW() + INTERVAL '7 days')
  AND t.status != 'DELETED'

ORDER BY t.departure_time ASC;

-- name: GetTripsForWeekWithStops :many
-- Admin query: Get trips for a specific week (filtered by date range)
-- Excludes DELETED trips, includes OPEN, SCHEDULED, CLOSED, FULL
SELECT
    t.id as trip_id,
    r.id as route_id,
    r.name as route_name,
    t.direction,
    t.bus_type,
    t.departure_time,
    (t.departure_time - (t.booking_open_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_opens_at,
    (t.departure_time - (t.booking_close_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_closes_at,
    t.status,
    t.available_seats,
    t.total_capacity,
    t.base_price,
    (
        SELECT COALESCE(JSON_AGG(
            JSON_BUILD_OBJECT(
                'stop_id', s.id,
                'stop_name', s.address,
                'sequence', ts.sequence_order
            ) ORDER BY ts.sequence_order ASC
        ), '[]')::text
        FROM giki_transport.trip_stops ts
        JOIN giki_transport.stops s ON ts.stop_id = s.id
        WHERE ts.trip_id = t.id
    ) as stops_json
FROM giki_transport.trip t
JOIN giki_transport.routes r ON t.route_id = r.id
WHERE
    t.departure_time >= $1
    AND t.departure_time < $2
    AND t.status NOT IN ('DELETED')
ORDER BY t.departure_time ASC;

-- name: GetDeletedTripsHistory :many
SELECT
    t.id as trip_id,
    r.id as route_id,
    r.name as route_name,
    t.direction,
    t.bus_type,
    t.departure_time,
    (t.departure_time - (t.booking_open_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_opens_at,
    (t.departure_time - (t.booking_close_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_closes_at,
    t.status,
    t.available_seats,
    t.total_capacity,
    t.base_price,
    t.updated_at as deleted_at,
    (
        SELECT COALESCE(JSON_AGG(
            JSON_BUILD_OBJECT(
                'stop_id', s.id,
                'stop_name', s.address,
                'sequence', ts.sequence_order
            ) ORDER BY ts.sequence_order ASC
        ), '[]')::text
        FROM giki_transport.trip_stops ts
        JOIN giki_transport.stops s ON ts.stop_id = s.id
        WHERE ts.trip_id = t.id
    ) as stops_json,
    COUNT(*) OVER() as total_count
FROM giki_transport.trip t
JOIN giki_transport.routes r ON t.route_id = r.id
WHERE t.status = 'DELETED'
ORDER BY t.updated_at DESC
LIMIT $1 OFFSET $2;


-- name: AdminGetAllTrips :many
SELECT
    t.id as trip_id,
    t.departure_time,
    t.booking_open_offset_hours,
    t.booking_close_offset_hours,
    t.total_capacity,
    t.available_seats,
    t.base_price,
    t.status,
    t.direction,
    t.bus_type,

    -- Route Details
    r.name as route_name,

    -- Stop Details
    ts.stop_id,
    s.address as stop_name,
    ts.sequence_order
FROM giki_transport.trip t
         JOIN giki_transport.routes r ON t.route_id = r.id
         JOIN giki_transport.trip_stops ts ON t.id = ts.trip_id
         JOIN giki_transport.stops s ON ts.stop_id = s.id
WHERE t.status != 'DELETED'
ORDER BY t.departure_time DESC, ts.sequence_order ASC;

-- name: UpdateTrip :exec
UPDATE giki_transport.trip
SET
    departure_time = $2,
    booking_open_offset_hours = $3,
    booking_close_offset_hours = $4,
    total_capacity = $5,
    -- Adjust available seats by the difference in capacity (if any), ensuring it doesn't go below 0
    available_seats = GREATEST(0, available_seats + ($5 - total_capacity)),
    base_price = $6,
    bus_type = $7,
    status = CASE
        -- Re-evaluate status logic based on new times
        WHEN NOW() >= ($2::TIMESTAMPTZ - ($4::INTEGER * INTERVAL '1 hour')) THEN 'CLOSED'
        WHEN NOW() < ($2::TIMESTAMPTZ - ($3::INTEGER * INTERVAL '1 hour')) THEN 'SCHEDULED'
        ELSE 'OPEN'
    END
WHERE id = $1;

-- name: SoftDeleteTrip :exec
UPDATE giki_transport.trip
SET status = 'DELETED', updated_at = NOW()
WHERE id = $1;


-- name: GetTrip :one
SELECT * FROM giki_transport.trip WHERE id = $1;

-- name: GetTripPrice :one
SELECT base_price FROM giki_transport.trip WHERE id = $1;


-- =============================================
-- 2. QUOTA & RULES (Smart Logic)
-- =============================================

-- name: GetQuotaRule :one
SELECT weekly_limit, allow_dependent_booking
FROM giki_transport.quota_rules
WHERE user_role = $1 AND direction = $2;



-- name: GetWeeklyTicketCountByDirection :one
-- Counts CONFIRMED tickets + ACTIVE HOLDS for the last 7 days for a specific direction.
SELECT COUNT(*) FROM (
       -- Part 1: Confirmed Tickets
       SELECT t.id
       FROM giki_transport.tickets t
                JOIN giki_transport.trip tr ON t.trip_id = tr.id
       WHERE t.user_id = sqlc.arg(user_id)
         AND t.status = 'CONFIRMED'
         AND tr.departure_time > NOW() - INTERVAL '7 days'
         AND tr.direction = sqlc.arg(direction)

       UNION ALL

       -- Part 2: Active Holds
       SELECT h.id
       FROM giki_transport.trip_holds h
                JOIN giki_transport.trip tr ON h.trip_id = tr.id
       WHERE h.user_id = sqlc.arg(user_id)
         AND tr.direction = sqlc.arg(direction)
) as total_count;


-- =============================================
-- 3. HOLD SYSTEM (Locking Seats)
-- =============================================

-- name: DecreaseTripSeat :one

UPDATE giki_transport.trip
SET available_seats = available_seats - 1
WHERE id = $1 AND available_seats > 0
RETURNING available_seats;

-- name: CreateBlankHold :one

INSERT INTO giki_transport.trip_holds (
    trip_id, user_id, pickup_stop_id, dropoff_stop_id, expires_at
) VALUES ($1, $2, $3, $4, $5)
RETURNING id, expires_at;

-- name: GetHold :one
SELECT * FROM giki_transport.trip_holds WHERE id = $1;

-- name: DeleteHold :exec
DELETE FROM giki_transport.trip_holds WHERE id = $1;


-- =============================================
-- 4. TICKET CONFIRMATION (Finalizing)
-- =============================================

-- name: ConfirmBookingWithDetails :one

INSERT INTO giki_transport.tickets (
    trip_id, user_id, serial_no, ticket_code, pickup_stop_id, dropoff_stop_id,
    status, passenger_name, passenger_relation
)
VALUES ($1, $2, COALESCE((SELECT MAX(serial_no) FROM giki_transport.tickets WHERE trip_id = $1), 0) + 1, $3, $4, $5, 'CONFIRMED', $6, $7)
RETURNING id, serial_no;


-- =============================================
-- 5. CANCELLATION & REAPER (Cleanup)
-- =============================================

-- name: IncrementTripSeat :exec

UPDATE giki_transport.trip
SET available_seats = available_seats + 1
WHERE id = $1 AND available_seats < total_capacity;

-- name: GetExpiredHolds :many

SELECT id, trip_id FROM giki_transport.trip_holds
WHERE expires_at < NOW()
FOR UPDATE SKIP LOCKED LIMIT 50;

-- name: GetRouteDetailsForTrip :one
SELECT r.name as route_name, tr.direction
FROM giki_transport.trip tr
JOIN giki_transport.routes r ON tr.route_id = r.id
WHERE tr.id = $1;

-- name: GetTicketForCancellation :one
SELECT
    t.id, t.trip_id, t.user_id, t.status, tr.base_price
FROM giki_transport.tickets t
         JOIN giki_transport.trip tr ON t.trip_id = tr.id
WHERE t.id = $1
  AND t.status = 'CONFIRMED'
  -- LOGIC: Allow cancel ONLY IF Current Time < (Departure - Close Offset)
  AND NOW() < (tr.departure_time - (tr.booking_close_offset_hours * INTERVAL '1 hour'));

-- name: SetTicketCancelled :exec
UPDATE giki_transport.tickets
SET status = 'CANCELLED'
WHERE id = $1 AND status = 'CONFIRMED';

-- name: GetActiveHoldsByUserID :many
SELECT h.id, h.trip_id, h.expires_at, tr.direction, r.name as route_name
FROM giki_transport.trip_holds h
JOIN giki_transport.trip tr ON h.trip_id = tr.id
JOIN giki_transport.routes r ON tr.route_id = r.id
WHERE h.user_id = $1 AND h.expires_at > NOW();

-- name: DeleteAllActiveHoldsByUserID :many
DELETE FROM giki_transport.trip_holds
WHERE user_id = $1 AND expires_at > NOW()
RETURNING trip_id;


-- name: GetUserTicketsByID :many
SELECT
    t.id AS ticket_id,
    t.status AS ticket_status,
    t.passenger_name,
    t.passenger_relation,
    t.serial_no,
    t.ticket_code,
    t.booking_time,

    tr.id AS trip_id,
    tr.departure_time,
    tr.bus_type,
    tr.base_price,
    tr.direction,

    r.name AS route_name,

    (CASE
        WHEN tr.direction = 'INBOUND' THEN sp.address
        ELSE sd.address
    END)::text AS relevant_location,

    sp.address AS pickup_location,
    sd.address AS dropoff_location,

    (
        t.status = 'CONFIRMED' AND
        tr.status != 'CANCELLED' AND
        NOW() < (tr.departure_time - (tr.booking_close_offset_hours * INTERVAL '1 hour'))
        )::BOOLEAN AS is_cancellable

FROM giki_transport.tickets t
JOIN giki_transport.trip tr ON t.trip_id = tr.id
JOIN giki_transport.routes r ON tr.route_id = r.id
JOIN giki_transport.stops sp ON t.pickup_stop_id = sp.id
JOIN giki_transport.stops sd ON t.dropoff_stop_id = sd.id
WHERE t.user_id = $1
AND tr.departure_time > (NOW() - INTERVAL '3 hours')
ORDER BY tr.departure_time DESC;

-- name: GetUpcomingTripsForWeek :many
SELECT
    t.id as trip_id,
    r.name as route_name,
    t.direction,
    t.bus_type,

    t.departure_time,

    (t.departure_time - (t.booking_open_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_opens_at,
    (t.departure_time - (t.booking_close_offset_hours * INTERVAL '1 hour'))::TIMESTAMPTZ as booking_closes_at,

    t.status,
    t.available_seats,
    t.total_capacity


FROM giki_transport.trip t
         JOIN giki_transport.routes r ON t.route_id = r.id
WHERE

    t.departure_time > NOW()
  AND t.departure_time < (NOW() + INTERVAL '7 days')

ORDER BY t.departure_time ASC;

-- name: GetTripsForExport :many
SELECT
    r.name as route_name,
    t.departure_time,
    t.bus_type,
    s.address as pickup_stop_name,
    t.id as trip_id,
    ti.serial_no,
    ti.ticket_code,
    ti.passenger_name,
    ti.status,
    s.id as stop_id,
    u.phone_number as user_phone_number
FROM giki_transport.trip t
JOIN giki_transport.routes r ON t.route_id = r.id
JOIN giki_transport.tickets ti ON t.id = ti.trip_id
JOIN giki_transport.stops s ON ti.pickup_stop_id = s.id
JOIN giki_wallet.users u ON ti.user_id = u.id
WHERE t.departure_time >= $1
  AND t.departure_time <= $2
  AND r.is_active = TRUE
  AND t.status != 'DELETED'
  AND t.status != 'SCHEDULED'
  AND (
      COALESCE(cardinality($3::uuid[]), 0) = 0
      OR t.route_id = ANY($3::uuid[])
  )
ORDER BY r.name, t.departure_time, ti.serial_no;
-- name: GetTicketsForAdmin :many
-- Admin query: Get confirmed tickets for a specific week and specific trip filters
SELECT
    t.id as ticket_id,
    t.serial_no,
    t.ticket_code,
    t.passenger_name,
    t.passenger_relation,
    t.status as ticket_status,
    t.booking_time,
    u.name as user_name,
    u.email as user_email,
    tr.id as trip_id,
    tr.departure_time,
    tr.bus_type,
    tr.direction,
    r.name as route_name,
    s_pickup.address as pickup_location,
    s_dropoff.address as dropoff_location,
    tr.base_price as price,
    COUNT(*) OVER() as total_count
FROM giki_transport.tickets t
JOIN giki_transport.trip tr ON t.trip_id = tr.id
JOIN giki_transport.routes r ON tr.route_id = r.id
JOIN giki_wallet.users u ON t.user_id = u.id
JOIN giki_transport.stops s_pickup ON t.pickup_stop_id = s_pickup.id
JOIN giki_transport.stops s_dropoff ON t.dropoff_stop_id = s_dropoff.id
WHERE 
    tr.departure_time >= sqlc.arg('start_date')
    AND tr.departure_time < sqlc.arg('end_date')
    AND (sqlc.arg('bus_type')::text = '' OR tr.bus_type = sqlc.arg('bus_type')::text) -- bus_type filter
    AND t.status = 'CONFIRMED'
ORDER BY tr.departure_time ASC, t.serial_no ASC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: GetTicketHistoryForAdmin :many
-- Admin query: Get tickets with status other than CONFIRMED (CANCELLED, etc.)
SELECT
    t.id as ticket_id,
    t.serial_no,
    t.ticket_code,
    t.passenger_name,
    t.passenger_relation,
    t.status as ticket_status,
    t.booking_time,
    t.updated_at as status_updated_at,
    u.name as user_name,
    u.email as user_email,
    tr.id as trip_id,
    tr.departure_time,
    tr.bus_type,
    tr.direction,
    r.name as route_name,
    s_pickup.address as pickup_location,
    s_dropoff.address as dropoff_location,
    COUNT(*) OVER() as total_count
FROM giki_transport.tickets t
JOIN giki_transport.trip tr ON t.trip_id = tr.id
JOIN giki_transport.routes r ON tr.route_id = r.id
JOIN giki_wallet.users u ON t.user_id = u.id
JOIN giki_transport.stops s_pickup ON t.pickup_stop_id = s_pickup.id
JOIN giki_transport.stops s_dropoff ON t.dropoff_stop_id = s_dropoff.id
WHERE 
    t.status != 'CONFIRMED'
ORDER BY t.updated_at DESC
LIMIT $1 OFFSET $2;


-- name: GetUserEmailAndName :one
SELECT name, email FROM giki_wallet.users WHERE id = $1;
