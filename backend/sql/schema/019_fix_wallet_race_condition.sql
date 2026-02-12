-- +goose Up

CREATE UNIQUE INDEX idx_system_wallet_unique 
ON giki_wallet.wallets (name, type) 
WHERE type IN ('SYS_REVENUE', 'SYS_LIABILITY');

-- +goose Down
DROP INDEX IF EXISTS giki_wallet.idx_system_wallet_unique;
