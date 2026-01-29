-- =============================================
-- 1. ROUTE & TRIP MANAGEMENT (Admin/System)
-- =============================================

-- name: GetAllRoutes :many
SELECT id, name FROM giki_transport.routes
WHERE is_active = TRUE
ORDER BY name ASC;

-- name: GetRouteStopsDetails :many
SELECT
    -- route details
    r.id as route_id, r.name as route_name,
    r.default_booking_open_offset_hours,
    r.default_booking_close_offset_hours,
    -- stops details
    s.id as stop_id, s.address as stop_name,
    -- route specific stops sequence
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
    route_id, departure_time, booking_opens_at, booking_closes_at,
    total_capacity, available_seats, base_price, direction, bus_type, status
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SCHEDULED')
RETURNING id;

-- name: CreateTripStop :exec
INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order)
VALUES ($1, $2, $3);

-- name: GetUpcomingTripsByRoute :many
SELECT
    t.id as trip_id,
    t.departure_time,
    t.booking_opens_at,
    t.booking_closes_at,
    t.total_capacity,
    t.available_seats,
    t.base_price,
    t.status,
    t.booking_status,
    t.direction,
    t.bus_type,

    -- Stop Details
    ts.stop_id,
    s.address as stop_name,
    ts.sequence_order
FROM giki_transport.trip t
         JOIN giki_transport.trip_stops ts ON t.id = ts.trip_id
         JOIN giki_transport.stops s ON ts.stop_id = s.id
WHERE t.route_id = $1
  AND t.departure_time > NOW()
  AND t.status != 'COMPLETED'
ORDER BY t.departure_time ASC, ts.sequence_order ASC;

-- name: GetAllUpcomingTrips :many
SELECT
    t.id as trip_id,
    t.departure_time,
    t.booking_opens_at,
    t.booking_closes_at,
    t.total_capacity,
    t.available_seats,
    t.base_price,
    t.status,
    t.booking_status,
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
WHERE t.departure_time > NOW()
  AND t.status != 'COMPLETED'
ORDER BY t.departure_time ASC, ts.sequence_order ASC;

-- name: AdminGetAllTrips :many
SELECT
    t.id as trip_id,
    t.departure_time,
    t.booking_opens_at,
    t.booking_closes_at,
    t.total_capacity,
    t.available_seats,
    t.base_price,
    t.status,
    t.booking_status,
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
ORDER BY t.departure_time DESC, ts.sequence_order ASC;

-- name: GetWeeklyTrips :many
SELECT
    t.id,
    t.departure_time,
    t.bus_type,
    t.booking_opens_at,
    t.booking_closes_at,
    t.total_capacity,
    t.available_seats,
    t.status,
    t.booking_status,
    t.bus_type,
    r.name as route_name
FROM giki_transport.trip t
JOIN giki_transport.routes r ON t.route_id = r.id
WHERE t.departure_time >= NOW()
  AND t.departure_time <= NOW() + INTERVAL '7 days'
  AND t.status != 'COMPLETED'
ORDER BY t.departure_time ASC;

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
         AND t.booking_time > NOW() - INTERVAL '7 days'
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
-- Atomic lock. Returns new count to verify success.
UPDATE giki_transport.trip
SET available_seats = available_seats - 1
WHERE id = $1 AND available_seats > 0
RETURNING available_seats;

-- name: CreateBlankHold :one
-- Creates a hold WITHOUT name (Step 1: Lock)
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
-- Moves Hold -> Ticket AND inserts the Passenger Names (Step 2: Fill & Pay)
INSERT INTO giki_transport.tickets (
    trip_id, user_id, serial_no, ticket_code, pickup_stop_id, dropoff_stop_id,
    status, passenger_name, passenger_relation
)
VALUES ($1, $2, COALESCE((SELECT MAX(serial_no) FROM giki_transport.tickets WHERE trip_id = $1), 0) + 1, $3, $4, $5, 'CONFIRMED', $6, $7)
RETURNING id;


-- =============================================
-- 5. CANCELLATION & REAPER (Cleanup)
-- =============================================

-- name: IncrementTripSeat :exec
-- Used when Hold expires or Ticket is Cancelled.
UPDATE giki_transport.trip
SET available_seats = available_seats + 1
WHERE id = $1 AND available_seats < total_capacity;

-- name: GetExpiredHolds :many
-- Uses SKIP LOCKED to allow multiple workers.
SELECT id, trip_id FROM giki_transport.trip_holds
WHERE expires_at < NOW()
FOR UPDATE SKIP LOCKED LIMIT 50;

-- name: GetTicketForCancellation :one
-- Retrieves ticket ONLY IF:
-- 1. It is currently CONFIRMED
-- 2. The cancellation window is still OPEN (NOW < booking_closes_at)
SELECT
    t.id,
    t.trip_id,
    t.user_id,
    t.status,
    tr.base_price
FROM giki_transport.tickets t
         JOIN giki_transport.trip tr ON t.trip_id = tr.id
WHERE t.id = sqlc.arg(ticket_id)
  AND t.status = 'CONFIRMED'
  AND NOW() < tr.booking_closes_at;

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
    t.id, t.status, t.passenger_name, t.passenger_relation, t.serial_no, t.ticket_code,
    tr.id, tr.departure_time, tr.bus_type, tr.base_price, tr.bus_type, tr.direction, tr.booking_closes_at,
    r.name,
    sp.address,
    sd.address
FROM giki_transport.tickets t
         JOIN giki_transport.trip tr ON t.trip_id = tr.id
         JOIN giki_transport.routes r ON tr.route_id = r.id
         JOIN giki_transport.stops sp ON t.pickup_stop_id = sp.id
         JOIN giki_transport.stops sd ON t.dropoff_stop_id = sd.id
WHERE t.user_id = $1
ORDER BY tr.departure_time DESC;
