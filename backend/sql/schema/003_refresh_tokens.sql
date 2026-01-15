-- +goose up

CREATE TABLE giki_wallet.refresh_tokens(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP DEFAULT NULL,
    replaced_by_token TEXT DEFAULT NULL,
    device_info VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_id uuid NOT NULL,
    FOREIGN KEY (user_id) REFERENCES giki_wallet.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose down

DROP TABLE giki_wallet.refresh_tokens;