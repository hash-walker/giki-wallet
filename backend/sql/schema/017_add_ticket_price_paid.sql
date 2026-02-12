-- +goose up
ALTER TABLE giki_transport.tickets ADD COLUMN price_paid INT NOT NULL DEFAULT 0;

-- +goose down
ALTER TABLE giki_transport.tickets DROP COLUMN price_paid;
