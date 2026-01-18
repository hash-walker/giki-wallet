-- name: CreateRefreshToken :one

INSERT INTO giki_wallet.refresh_tokens(token_hash, expires_at, user_id)
VALUES ($1, $2, $3)
RETURNING *;