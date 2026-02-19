-- +goose Up

-- Rename trip offset columns from hours to minutes for precision
ALTER TABLE giki_transport.trip
    RENAME COLUMN booking_open_offset_hours TO booking_open_offset_minutes;

ALTER TABLE giki_transport.trip
    RENAME COLUMN booking_close_offset_hours TO booking_close_offset_minutes;

-- Convert existing hour values to minutes
UPDATE giki_transport.trip
SET booking_open_offset_minutes  = booking_open_offset_minutes  * 60,
    booking_close_offset_minutes = booking_close_offset_minutes * 60;

-- Rename route default offset columns too
ALTER TABLE giki_transport.routes
    RENAME COLUMN default_booking_open_offset_hours  TO default_booking_open_offset_minutes;

ALTER TABLE giki_transport.routes
    RENAME COLUMN default_booking_close_offset_hours TO default_booking_close_offset_minutes;

-- Convert existing route defaults from hours to minutes
UPDATE giki_transport.routes
SET default_booking_open_offset_minutes  = default_booking_open_offset_minutes  * 60,
    default_booking_close_offset_minutes = default_booking_close_offset_minutes * 60;

-- +goose Down

UPDATE giki_transport.trip
SET booking_open_offset_minutes  = booking_open_offset_minutes  / 60,
    booking_close_offset_minutes = booking_close_offset_minutes / 60;

ALTER TABLE giki_transport.trip
    RENAME COLUMN booking_open_offset_minutes  TO booking_open_offset_hours;

ALTER TABLE giki_transport.trip
    RENAME COLUMN booking_close_offset_minutes TO booking_close_offset_hours;

UPDATE giki_transport.routes
SET default_booking_open_offset_minutes  = default_booking_open_offset_minutes  / 60,
    default_booking_close_offset_minutes = default_booking_close_offset_minutes / 60;

ALTER TABLE giki_transport.routes
    RENAME COLUMN default_booking_open_offset_minutes  TO default_booking_open_offset_hours;

ALTER TABLE giki_transport.routes
    RENAME COLUMN default_booking_close_offset_minutes TO default_booking_close_offset_hours;
