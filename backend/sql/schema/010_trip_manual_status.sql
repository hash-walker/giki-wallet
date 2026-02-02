-- +goose up
ALTER TABLE giki_transport.trip ADD COLUMN manual_status TEXT DEFAULT NULL;

-- +goose down
ALTER TABLE giki_transport.trip DROP COLUMN manual_status;
