-- +goose up
CREATE TABLE giki_wallet.feedback (
    id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES giki_wallet.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_user_id ON giki_wallet.feedback(user_id);
CREATE INDEX idx_feedback_created_at ON giki_wallet.feedback(created_at DESC);

-- +goose down
DROP TABLE giki_wallet.feedback;
