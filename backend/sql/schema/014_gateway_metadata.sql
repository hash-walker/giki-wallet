-- +goose up
ALTER TABLE giki_wallet.gateway_transactions ADD COLUMN gateway_message TEXT;
ALTER TABLE giki_wallet.gateway_transactions ADD COLUMN gateway_status_code TEXT;

-- +goose down
ALTER TABLE giki_wallet.gateway_transactions DROP COLUMN gateway_message;
ALTER TABLE giki_wallet.gateway_transactions DROP COLUMN gateway_status_code;
