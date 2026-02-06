-- +goose up
ALTER TABLE giki_transport.tickets ADD COLUMN price_paid INT NOT NULL DEFAULT 0;

UPDATE giki_transport.tickets t
SET price_paid = tr.base_price
FROM giki_transport.trip tr
WHERE t.trip_id = tr.id;

-- +goose down
ALTER TABLE giki_transport.tickets DROP COLUMN price_paid;
