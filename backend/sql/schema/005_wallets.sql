-- +goose Up
CREATE SCHEMA IF NOT EXISTS giki_wallet;

CREATE TYPE giki_wallet.wallet_status_type AS ENUM (
    'ACTIVE',
    'FROZEN',
    'SUSPENDED',
    'CLOSED'
);

CREATE TYPE giki_wallet.currency_code_type AS ENUM (
    'G-Bux'
);

CREATE TYPE giki_wallet.transaction_category_type AS ENUM (
    'JAZZCASH_DEPOSIT',
    'TICKET_PURCHASE',
    'REFUND'
);

CREATE TABLE giki_wallet.wallets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id uuid NOT NULL UNIQUE REFERENCES giki_wallet.users(id),

        status giki_wallet.wallet_status_type NOT NULL DEFAULT 'ACTIVE',
        currency giki_wallet.currency_code_type NOT NULL DEFAULT 'G-Bux',

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create the Ledger Table
CREATE TABLE giki_wallet.ledger (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        wallet_id uuid NOT NULL REFERENCES giki_wallet.wallets(id),

        amount BIGINT NOT NULL CHECK (amount <> 0),

        transaction_type giki_wallet.transaction_category_type NOT NULL,

        reference_id VARCHAR(100) NOT NULL,
        description TEXT,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX idx_ledger_wallet_id ON giki_wallet.ledger(wallet_id);

CREATE UNIQUE INDEX idx_ledger_idempotency
    ON giki_wallet.ledger(transaction_type, reference_id);


-- +goose Down

-- Ledger depends on Wallets, so drop Ledger first.
DROP TABLE IF EXISTS giki_wallet.ledger;
DROP TABLE IF EXISTS giki_wallet.wallets;

-- drop the types
DROP TYPE IF EXISTS giki_wallet.wallet_status_type;
DROP TYPE IF EXISTS giki_wallet.currency_code_type;
DROP TYPE IF EXISTS giki_wallet.transaction_category_type;
