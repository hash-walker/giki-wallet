-- name: CreateRefreshToken :one

INSERT INTO giki_wallet.refresh_tokens(token_hash, expires_at, user_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUserByTokenHash :one

SELECT user_id, type, expires_at
FROM giki_wallet.access_tokens
WHERE token_hash = $1;

-- name: CreateAccessToken :one
