-- +goose up

CREATE TABLE giki_wallet.users(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'Local',
    external_id VARCHAR(255),
    password_hash VARCHAR(500) NOT NULL,
    password_algo VARCHAR(20) NOT NULL DEFAULT 'BCRYPT',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    user_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE giki_wallet.student_profiles(
    user_id uuid PRIMARY KEY REFERENCES giki_wallet.users(id) ON DELETE CASCADE ,
    reg_id VARCHAR(20) NOT NULL UNIQUE,
    degree_program VARCHAR(50),
    batch_year int
);

CREATE TABLE giki_wallet.employee_profiles(
    user_id uuid PRIMARY KEY REFERENCES giki_wallet.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    designation VARCHAR(100),
    department VARCHAR(100)
);

CREATE TABLE giki_wallet.admins(
    user_id uuid PRIMARY KEY REFERENCES giki_wallet.employee_profiles(user_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'moderator',
    permissions text[]
);

-- +goose down
DROP TABLE giki_wallet.admins;
DROP TABLE giki_wallet.student_profiles;
DROP TABLE giki_wallet.employee_profiles;
DROP TABLE giki_wallet.users;



