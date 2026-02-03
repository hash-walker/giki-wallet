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

-- =============================================================================
-- AUDIT LOG QUERIES
-- =============================================================================

-- name: CreateAuditLog :one
INSERT INTO giki_wallet.payment_audit_log (
    event_type, raw_payload, txn_ref_no, gateway_ref, user_id
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: MarkAuditProcessed :exec
UPDATE giki_wallet.payment_audit_log
SET processed = TRUE, processed_at = NOW()
WHERE id = $1;

-- name: MarkAuditFailed :exec
UPDATE giki_wallet.payment_audit_log
SET process_error = $2, retry_count = retry_count + 1
WHERE id = $1;

-- name: GetUnprocessedAudits :many
SELECT * FROM giki_wallet.payment_audit_log
WHERE processed = FALSE AND event_type = $1
ORDER BY received_at
LIMIT $2;

-- name: GetGatewayTransactions :many
SELECT 
    gt.txn_ref_no,
    gt.user_id,
    u.name as user_name,
    u.email as user_email,
    gt.amount,
    gt.status,
    gt.payment_method,
    gt.created_at,
    gt.updated_at,
    gt.bill_ref_id,
    COUNT(*) OVER() as total_count,
    SUM(gt.amount) OVER() as total_amount
FROM giki_wallet.gateway_transactions gt
JOIN giki_wallet.users u ON gt.user_id = u.id
WHERE 
    (COALESCE(sqlc.narg('status')::text, '') = '' OR gt.status::text = sqlc.narg('status')::text)
    AND (
        COALESCE(sqlc.narg('payment_method')::text, '') = '' OR 
        gt.payment_method = sqlc.narg('payment_method')
    )
    AND gt.created_at >= sqlc.arg('start_date')
    AND gt.created_at <= sqlc.arg('end_date')
    AND (
        sqlc.arg('search')::text = '' OR
        gt.txn_ref_no ILIKE '%' || sqlc.arg('search')::text || '%' OR
        gt.bill_ref_id ILIKE '%' || sqlc.arg('search')::text || '%' OR
        u.name ILIKE '%' || sqlc.arg('search')::text || '%' OR
        u.email ILIKE '%' || sqlc.arg('search')::text || '%'
    )
ORDER BY gt.created_at DESC
LIMIT sqlc.arg('limit') OFFSET sqlc.arg('offset');

-- name: ForceUpdateGatewayTransactionStatus :one
UPDATE giki_wallet.gateway_transactions
SET status = $1
WHERE txn_ref_no = $2
RETURNING *;

-- name: GetGatewayTransactionsForExport :many
SELECT 
    gt.txn_ref_no,
    gt.user_id,
    u.name as user_name,
    u.email as user_email,
    gt.amount,
    gt.status,
    gt.payment_method,
    gt.created_at,
    gt.updated_at,
    gt.bill_ref_id
FROM giki_wallet.gateway_transactions gt
JOIN giki_wallet.users u ON gt.user_id = u.id
WHERE 
    (COALESCE(sqlc.narg('status')::text, '') = '' OR gt.status::text = sqlc.narg('status')::text)
    AND (
        COALESCE(sqlc.narg('payment_method')::text, '') = '' OR 
        gt.payment_method = sqlc.narg('payment_method')
    )
    AND gt.created_at >= sqlc.arg('start_date')
    AND gt.created_at <= sqlc.arg('end_date')
    AND (
        sqlc.arg('search')::text = '' OR
        gt.txn_ref_no ILIKE '%' || sqlc.arg('search')::text || '%' OR
        gt.bill_ref_id ILIKE '%' || sqlc.arg('search')::text || '%' OR
        u.name ILIKE '%' || sqlc.arg('search')::text || '%' OR
        u.email ILIKE '%' || sqlc.arg('search')::text || '%'
    )
ORDER BY gt.created_at DESC;

-- name: GetAuditLogsByTxn :many
SELECT * FROM giki_wallet.payment_audit_log
WHERE txn_ref_no = $1
ORDER BY received_at DESC;