-- +goose Up
CREATE SCHEMA IF NOT EXISTS giki_wallet;

CREATE TABLE giki_wallet.wallets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        user_id uuid UNIQUE REFERENCES giki_wallet.users(id),

        name VARCHAR(100),
        type VARCHAR(20) DEFAULT 'PERSONAL',

        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
            CHECK (status IN ('ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED')),
        currency VARCHAR(10) NOT NULL DEFAULT 'G-Bux',

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE giki_wallet.transactions (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

       type VARCHAR(50) NOT NULL,
       reference_id VARCHAR(100) NOT NULL,
       description TEXT,

       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraint: You can't have two transactions with same Ref + Type
       UNIQUE(type, reference_id)
);

-- 3. Create the Ledger Table
CREATE TABLE giki_wallet.ledger (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        wallet_id uuid NOT NULL REFERENCES giki_wallet.wallets(id),

        amount BIGINT NOT NULL CHECK (amount <> 0),
        balance_after BIGINT NOT NULL,

        transaction_id uuid NOT NULL REFERENCES giki_wallet.transactions(id),

        row_hash VARCHAR(255) NOT NULL,

        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES

-- A. Speed up "Show me my history" (Filter by Wallet + Sort by Date)
CREATE INDEX idx_ledger_wallet_history
    ON giki_wallet.ledger(wallet_id, created_at DESC);

-- B. Speed up Joins (Foreign Key lookup)
CREATE INDEX idx_ledger_txn_fk
    ON giki_wallet.ledger(transaction_id);

-- C. Speed up Reporting (Find transactions by date)
CREATE INDEX idx_transactions_date
    ON giki_wallet.transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON giki_wallet.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_status ON giki_wallet.wallets(status);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON giki_wallet.wallets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_balance ON giki_wallet.ledger(balance_after);
CREATE INDEX IF NOT EXISTS idx_ledger_amount_balance ON giki_wallet.ledger(amount, balance_after);
CREATE INDEX IF NOT EXISTS idx_transactions_type_created ON giki_wallet.transactions(type, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS giki_wallet.ledger;
DROP TABLE IF EXISTS giki_wallet.transactions;
DROP TABLE IF EXISTS giki_wallet.wallets;

