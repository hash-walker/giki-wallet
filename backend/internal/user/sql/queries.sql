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

-- name: UpdateUnverifiedUser :one
UPDATE giki_wallet.users
SET
    email = $2,
    password_hash = $3,
    updated_at = NOW()
WHERE id = $1 AND is_verified = FALSE
RETURNING *;

-- name: DeleteAllTokensForUser :exec
DELETE FROM giki_wallet.access_tokens
WHERE user_id = $1;

