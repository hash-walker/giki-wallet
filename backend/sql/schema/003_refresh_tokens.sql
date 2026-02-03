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

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON giki_wallet.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON giki_wallet.refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON giki_wallet.refresh_tokens(revoked_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires ON giki_wallet.refresh_tokens(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_cleanup ON giki_wallet.refresh_tokens(revoked_at, expires_at) WHERE revoked_at IS NULL;

-- +goose down

DROP TABLE giki_wallet.refresh_tokens;