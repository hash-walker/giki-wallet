-- +goose up

CREATE SCHEMA IF NOT EXISTS giki_transport;

-- +goose down

DROP SCHEMA IF EXISTS giki_tansport;
