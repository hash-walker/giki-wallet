-- +goose Up
DROP INDEX IF EXISTS giki_wallet.idx_ledger_balance;

-- +goose Down
CREATE INDEX IF NOT EXISTS idx_ledger_balance ON giki_wallet.ledger(balance_after);