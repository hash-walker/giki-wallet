-- +goose up

CREATE TABLE giki_wallet.jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

      job_type VARCHAR(50) NOT NULL,
    -- 'SEND_VERIFICATION_EMAIL', 'SEND_EMPLOYEE_WAIT_EMAIL'

      payload JSONB NOT NULL,
    -- {"email": "ali@giki.edu.pk", "token": "abc-123"}

      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'

      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- For scheduled emails

      retry_count INT NOT NULL DEFAULT 0,
      max_retries INT NOT NULL DEFAULT 3,
      last_error TEXT,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_fetch ON giki_wallet.jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON giki_wallet.jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON giki_wallet.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_run_at_retry ON giki_wallet.jobs(status, run_at, retry_count);

-- +goose down
DROP TABLE giki_wallet.jobs;