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

-- name: GetTransactionHeaderByTypeAndRef :one
SELECT * FROM giki_wallet.transactions
WHERE type = $1 AND reference_id = $2;

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
    l.id, l.amount, l.balance_after, l.created_at, COUNT(*) OVER() as total_count,
    t.type, t.reference_id, t.description
FROM giki_wallet.ledger l
         JOIN giki_wallet.transactions t ON l.transaction_id = t.id
WHERE l.wallet_id = $1
ORDER BY l.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetAdminRevenueTransactions :many
SELECT
    l.id,
    l.amount,
    l.created_at,
    l.balance_after,
    t.type,
    t.description,
    t.reference_id,

    u.name as user_name,
    u.email as user_email,
    COUNT(*) OVER() as total_count
FROM giki_wallet.ledger l
JOIN giki_wallet.transactions t ON l.transaction_id = t.id
LEFT JOIN giki_wallet.ledger other_side ON t.id = other_side.transaction_id AND other_side.id != l.id
LEFT JOIN giki_wallet.wallets w ON other_side.wallet_id = w.id
LEFT JOIN giki_wallet.users u ON w.user_id = u.id
WHERE l.wallet_id = $1
  AND l.created_at >= sqlc.arg('start_date')
  AND l.created_at <= sqlc.arg('end_date')
  AND (
      sqlc.arg('search')::text = '' OR
      u.name ILIKE '%' || sqlc.arg('search')::text || '%' OR
      u.email ILIKE '%' || sqlc.arg('search')::text || '%' OR
      t.reference_id ILIKE '%' || sqlc.arg('search')::text || '%'
  )
ORDER BY l.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetWeeklyWalletStats :one
SELECT
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::BIGINT as total_income,
    COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0)::BIGINT as total_refunds,
    COUNT(*) as transaction_count
FROM giki_wallet.ledger
WHERE wallet_id = $1
  AND created_at >= sqlc.arg('start_date')
  AND created_at <= sqlc.arg('end_date');