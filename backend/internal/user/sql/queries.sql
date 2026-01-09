-- name: CreateUser :one

INSERT INTO giki_wallet.users(name, email, auth_provider, password_hash, password_algo, is_active, is_verified, user_type)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: CreateStudent :one

INSERT INTO giki_wallet.student_profiles(user_id, reg_id, batch_year)
VALUES ($1, $2, $3)
RETURNING *;

-- name: CreateEmployee :one

INSERT INTO giki_wallet.employee_profiles(user_id, employee_id)
Values ($1, $2)
RETURNING *;
