-- name: CreateRefreshToken :one

INSERT INTO giki_wallet.refresh_tokens(token_hash, expires_at, user_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUserByTokenHash :one

SELECT user_id, type, expires_at
FROM giki_wallet.access_tokens
WHERE token_hash = $1;

-- name: GetRefreshTokenByHash :one
SELECT * FROM giki_wallet.refresh_tokens
WHERE token_hash = $1 LIMIT 1;

-- name: ReplaceRefreshToken :exec
UPDATE giki_wallet.refresh_tokens
SET revoked_at = NOW(), replaced_by_token = $2, updated_at = NOW()
WHERE token_hash = $1;

-- name: RevokeAllRefreshTokensForUser :exec
UPDATE giki_wallet.refresh_tokens
SET revoked_at = NOW(), updated_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL;

-- name: CreateAccessToken :one
INSERT INTO giki_wallet.access_tokens(token_hash, user_id, type, expires_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: DeleteAccessToken :exec
DELETE FROM giki_wallet.access_tokens
WHERE token_hash = $1;

