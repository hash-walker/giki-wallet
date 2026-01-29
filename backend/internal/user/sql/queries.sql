-- name: CreateUser :one

INSERT INTO giki_wallet.users(name, email, phone_number, auth_provider, password_hash, password_algo, is_active, is_verified, user_type)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: CreateStudent :one

INSERT INTO giki_wallet.student_profiles(user_id, reg_id, batch_year)
VALUES ($1, $2, $3)
RETURNING *;

-- name: CreateEmployee :one

INSERT INTO giki_wallet.employee_profiles(user_id)
Values ($1)
RETURNING *;

-- name: GetUserByEmail :one

SELECT * FROM giki_wallet.users
WHERE giki_wallet.users.email = $1;

-- name: GetUserByRegOrEmail :one
SELECT * FROM giki_wallet.users as u
JOIN giki_wallet.student_profiles as s ON u.id = s.user_id
WHERE u.email = $1 or s.reg_id = $2;

-- name: DeleteAllTokensForUser :exec
DELETE FROM giki_wallet.access_tokens
WHERE user_id = $1;

-- name: GetUserByID :one

SELECT id, name, email, phone_number, auth_provider, external_id, password_hash, password_algo,
       is_active, is_verified, user_type, created_at, updated_at
FROM giki_wallet.users
WHERE id = $1;

-- name: UpdateUserVerification :one
UPDATE giki_wallet.users
SET is_verified = TRUE, is_active = TRUE, updated_at = NOW()
WHERE id = $1
RETURNING id, name, email, phone_number, auth_provider, external_id, password_hash, password_algo,
    is_active, is_verified, user_type, created_at, updated_at;

-- name: CreateAccessToken :exec
INSERT INTO giki_wallet.access_tokens(token_hash, user_id, type, expires_at)
VALUES ($1, $2, $3, $4);

-- name: ListUsers :many
SELECT id, name, email, phone_number, is_active, is_verified, user_type, created_at, updated_at
FROM giki_wallet.users
ORDER BY created_at DESC;

-- name: UpdateUserStatus :one
UPDATE giki_wallet.users
SET is_active = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, name, email, phone_number, is_active, is_verified, user_type, created_at, updated_at;


