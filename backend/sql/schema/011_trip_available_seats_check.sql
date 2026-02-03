-- +goose up
ALTER TABLE giki_transport.trip
ADD CONSTRAINT check_available_seats_non_negative CHECK (available_seats >= 0);

-- +goose down
ALTER TABLE giki_transport.trip
DROP CONSTRAINT check_available_seats_non_negative;
