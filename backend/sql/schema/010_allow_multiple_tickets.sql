-- +goose up
ALTER TABLE giki_transport.tickets DROP CONSTRAINT IF EXISTS tickets_trip_id_user_id_key;

-- +goose down
ALTER TABLE giki_transport.tickets ADD CONSTRAINT tickets_trip_id_user_id_key UNIQUE(trip_id, user_id);
