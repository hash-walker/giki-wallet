-- +goose up

CREATE SCHEMA IF NOT EXISTS giki_wallet;

-- +goose down
DROP SCHEMA IF EXISTS giki_wallet;