-- +goose Up

ALTER TABLE giki_wallet.ledger 
DROP CONSTRAINT IF EXISTS ledger_transaction_id_fkey;

ALTER TABLE giki_wallet.ledger
ADD CONSTRAINT ledger_transaction_id_fkey
FOREIGN KEY (transaction_id) 
REFERENCES giki_wallet.transactions(id) 
ON DELETE RESTRICT;

-- +goose Down

ALTER TABLE giki_wallet.ledger 
DROP CONSTRAINT IF EXISTS ledger_transaction_id_fkey;

ALTER TABLE giki_wallet.ledger
ADD CONSTRAINT ledger_transaction_id_fkey
FOREIGN KEY (transaction_id) 
REFERENCES giki_wallet.transactions(id);
