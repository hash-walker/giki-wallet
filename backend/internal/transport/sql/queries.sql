-- name: GetAllRoutes :many

SELECT id, name FROM giki_transport.routes WHERE is_active = TRUE ORDER BY name ASC;

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

-- name: CreateTrip :one

INSERT INTO giki_transport.trip(route_id, departure_time, booking_opens_at, booking_closes_at, total_capacity, available_seats, base_price, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, 'SCHEDULED')
RETURNING id;

-- name: GetRouteWeeklySchedule :many

SELECT id, day_of_week, departure_time
FROM giki_transport.route_weekly_schedules
WHERE route_id = $1
ORDER BY day_of_week, departure_time;

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
    t.status,          -- e.g. 'SCHEDULED', 'CANCELLED'
    t.booking_status,  -- e.g. 'OPEN', 'CLOSED'

    d.name as driver_name,

    -- Stop Details for this specific trip
    ts.stop_id,
    s.address as stop_name,
    ts.sequence_order

FROM giki_transport.trip t
         JOIN giki_transport.driver d ON t.driver_id = d.id
         JOIN giki_transport.trip_stops ts ON t.id = ts.trip_id
         JOIN giki_transport.stops s ON ts.stop_id = s.id

WHERE t.route_id = $1
  AND t.departure_time > NOW() -- Only future trips
  AND t.status != 'COMPLETED'  -- Hide finished trips

ORDER BY t.departure_time ASC, ts.sequence_order ASC;





