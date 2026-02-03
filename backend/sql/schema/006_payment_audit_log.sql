-- +goose Up

CREATE TYPE giki_wallet.audit_event_type AS ENUM (
    'TOPUP_REQUEST',
    'CARD_CALLBACK',
    'MWALLET_CALLBACK',
    'INQUIRY_RESULT'
);

CREATE TABLE giki_wallet.payment_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What happened
    event_type giki_wallet.audit_event_type NOT NULL,

    -- Raw data from external source (immutable truth)
    raw_payload JSONB NOT NULL,

    -- Identifiers for correlation
    txn_ref_no VARCHAR(100),
    gateway_ref VARCHAR(100),
    user_id uuid,

    -- Processing state
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    process_error TEXT,
    retry_count INT DEFAULT 0,

    -- Timestamps
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for worker to find unprocessed entries efficiently
CREATE INDEX idx_audit_unprocessed 
    ON giki_wallet.payment_audit_log(processed, event_type, received_at) 
    WHERE processed = FALSE;

-- Index for debugging/correlation
CREATE INDEX idx_audit_txn_ref ON giki_wallet.payment_audit_log(txn_ref_no);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON giki_wallet.payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_received_at ON giki_wallet.payment_audit_log(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON giki_wallet.payment_audit_log(event_type);

-- +goose Down

DROP TABLE IF EXISTS giki_wallet.payment_audit_log;
DROP TYPE IF EXISTS giki_wallet.audit_event_type;
