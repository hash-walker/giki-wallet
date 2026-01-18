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

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose down

DROP TABLE giki_wallet.gateway_transactions;