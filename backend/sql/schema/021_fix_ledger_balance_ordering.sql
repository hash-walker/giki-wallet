-- +goose Up
-- +goose NO TRANSACTION

ALTER TABLE giki_wallet.ledger
    ALTER COLUMN created_at SET DEFAULT clock_timestamp();
