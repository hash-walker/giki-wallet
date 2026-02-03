-- +goose up

CREATE TYPE current_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN');


CREATE TABLE giki_wallet.gateway_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    FOREIGN KEY (user_id) REFERENCES giki_wallet.users(id) ON DELETE CASCADE,

    -- Core identifiers
    idempotency_key uuid NOT NULL UNIQUE ,
    bill_ref_id VARCHAR(50) NOT NULL,
    txn_ref_no VARCHAR(50) NOT NULL UNIQUE,
    payment_method VARCHAR(50) NOT NULL,

    -- Gateway response
    gateway_rrn VARCHAR(50),
    status current_status NOT NULL DEFAULT 'PENDING',

    -- Transaction details
    amount BIGINT NOT NULL,
    raw_response JSONB,

    -- Polling bool
    is_polling BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gateway_txn_user_id ON giki_wallet.gateway_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gateway_txn_status ON giki_wallet.gateway_transactions(status);
CREATE INDEX IF NOT EXISTS idx_gateway_txn_created ON giki_wallet.gateway_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_txn_polling ON giki_wallet.gateway_transactions(is_polling, status);
CREATE INDEX IF NOT EXISTS idx_gateway_txn_user_status_created ON giki_wallet.gateway_transactions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_txn_bill_ref ON giki_wallet.gateway_transactions(bill_ref_id);

-- +goose down

DROP TABLE giki_wallet.gateway_transactions;
DROP TYPE current_status;