-- name: GetConfig :one
SELECT * FROM giki_wallet.system_configs
WHERE key = $1;

-- name: ListConfigs :many
SELECT * FROM giki_wallet.system_configs
ORDER BY key ASC;

-- name: UpdateConfig :one
UPDATE giki_wallet.system_configs
SET value = $2, updated_at = NOW()
WHERE key = $1
RETURNING *;

-- name: UpsertConfig :one
INSERT INTO giki_wallet.system_configs (key, value, description)
VALUES ($1, $2, $3)
ON CONFLICT (key) DO UPDATE
SET value = $2, updated_at = NOW()
RETURNING *;
