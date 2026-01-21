-- name: CreateWallet :one

INSERT INTO giki_wallet.wallets (user_id)
VALUES ($1)
RETURNING *;

-- name: GetWallet :one
SELECT * FROM giki_wallet.wallets
WHERE user_id = $1;

-- name: CreateLedgerEntry :one

INSERT INTO giki_wallet.ledger (wallet_id, amount, transaction_type, reference_id)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetLedgerEntriesByReference :many

SELECT * FROM giki_wallet.ledger
WHERE reference_id = $1;

-- name: GetWalletBalance :one

SELECT COALESCE(SUM(amount), 0)::bigint as balance
FROM giki_wallet.ledger
WHERE wallet_id = $1;
