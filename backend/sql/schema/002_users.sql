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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_phone UNIQUE (phone_number)
);

CREATE TABLE giki_wallet.student_profiles(
    user_id uuid PRIMARY KEY REFERENCES giki_wallet.users(id) ON DELETE CASCADE ,
    reg_id VARCHAR(20) NOT NULL UNIQUE,
    degree_program VARCHAR(50),
    batch_year int,
    CONSTRAINT uq_users_reg_number UNIQUE (reg_id)
);

CREATE TABLE giki_wallet.employee_profiles(
    user_id uuid PRIMARY KEY REFERENCES giki_wallet.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    designation VARCHAR(100),
    department VARCHAR(100)
);

CREATE TABLE giki_wallet.access_tokens (
    token_hash VARCHAR(64) PRIMARY KEY, -- We store SHA256 of the token for security
    user_id uuid NOT NULL REFERENCES giki_wallet.users(id) ON DELETE CASCADE,

    type VARCHAR(20) NOT NULL,
    -- 'EMAIL_VERIFICATION' (Students)
    -- 'PASSWORD_RESET'     (Everyone)

    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose down
DROP TABLE giki_wallet.access_tokens;
DROP TABLE giki_wallet.student_profiles;
DROP TABLE giki_wallet.employee_profiles;
DROP TABLE giki_wallet.users;



