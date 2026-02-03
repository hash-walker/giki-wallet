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

CREATE INDEX IF NOT EXISTS idx_users_created_at_desc ON giki_wallet.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON giki_wallet.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON giki_wallet.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_active ON giki_wallet.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON giki_wallet.users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON giki_wallet.users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON giki_wallet.users(user_type);
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON giki_wallet.access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires ON giki_wallet.access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_tokens_user_expires ON giki_wallet.access_tokens(user_id, expires_at DESC);

-- +goose down
DROP TABLE giki_wallet.access_tokens;
DROP TABLE giki_wallet.student_profiles;
DROP TABLE giki_wallet.employee_profiles;
DROP TABLE giki_wallet.users;



