-- name: CreateGatewayTransaction :one
INSERT INTO giki_wallet.gateway_transactions(user_id, idempotency_key, bill_ref_id, txn_ref_no, payment_method, status, amount)
VALUES ($1, $2,$3,$4, $5, $6, $7)
RETURNING *;

-- name: UpdateGatewayTransactionStatus :exec
UPDATE giki_wallet.gateway_transactions SET status = $1 WHERE txn_ref_no = $2;

-- name: GetByIdempotencyKey :one

SELECT * FROM giki_wallet.gateway_transactions
WHERE idempotency_key = $1;

-- name: GetPendingTransaction :one

SELECT * FROM giki_wallet.gateway_transactions
WHERE user_id = $1
    AND status IN ('PENDING', 'UNKNOWN')
LIMIT 1;

-- name: GetTransactionByTxnRefNo :one

SELECT * from giki_wallet.gateway_transactions
WHERE txn_ref_no = $1;

--- update polling status

-- name: UpdatePollingStatus :one
UPDATE giki_wallet.gateway_transactions
SET is_polling = TRUE
WHERE txn_ref_no = $1 AND is_polling = FALSE
RETURNING *;

-- name: ClearPollingStatus :exec
UPDATE giki_wallet.gateway_transactions
SET is_polling = FALSE
WHERE txn_ref_no = $1;