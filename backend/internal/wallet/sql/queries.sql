-- name: CreateWallet :one

INSERT INTO giki_wallet.wallets (user_id, name, type, status)
VALUES ($1, COALESCE(NULLIF($2, ''), 'Personal Wallet'), $3, $4)
RETURNING *;

-- name: GetWallet :one
SELECT * FROM giki_wallet.wallets
WHERE user_id = $1;

-- name: GetWalletForUpdate :one

SELECT * FROM giki_wallet.wallets
WHERE id = $1
    FOR NO KEY UPDATE;

-- name: CreateTransactionHeader :one
INSERT INTO giki_wallet.transactions(type, reference_id, description)
VALUES ($1, $2, $3)
RETURNING id, created_at;

-- name: CreateLedgerEntry :one

INSERT INTO giki_wallet.ledger (wallet_id, amount, transaction_id, balance_after, row_hash)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetWalletBalanceSnapshot :one
SELECT balance_after
FROM giki_wallet.ledger
WHERE wallet_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: GetLedgerEntriesByReference :many
SELECT
    l.id, l.amount, l.balance_after, l.created_at,
    t.type, t.reference_id, t.description
FROM giki_wallet.ledger l
         JOIN giki_wallet.transactions t ON l.transaction_id = t.id
WHERE t.reference_id = $1;

-- name: GetSystemWalletByName :one
SELECT * FROM giki_wallet.wallets
WHERE name = $1
  AND type = $2
LIMIT 1;

-- name: GetLedgerEntriesByWallet :many
SELECT
    l.id, l.amount, l.balance_after, l.created_at,
    t.type, t.reference_id, t.description
FROM giki_wallet.ledger l
         JOIN giki_wallet.transactions t ON l.transaction_id = t.id
WHERE l.wallet_id = $1
ORDER BY l.created_at DESC;
