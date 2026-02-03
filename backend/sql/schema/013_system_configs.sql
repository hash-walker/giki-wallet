-- +goose up
CREATE TABLE giki_wallet.system_configs (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- +goose down
DROP TABLE giki_wallet.system_configs;
