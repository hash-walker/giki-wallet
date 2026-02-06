-- +goose up
ALTER TABLE giki_transport.tickets ALTER COLUMN ticket_code TYPE VARCHAR(10);

-- +goose down
ALTER TABLE giki_transport.tickets ALTER COLUMN ticket_code TYPE CHAR(4);
