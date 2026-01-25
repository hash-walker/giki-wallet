-- name: CreateJob :one
INSERT INTO giki_wallet.jobs (job_type, payload, run_at)
VALUES ($1, $2, $3)
RETURNING id;

-- name: FetchNextJob :one
UPDATE giki_wallet.jobs
SET status = 'PROCESSING', updated_at = NOW()
WHERE id = (
    SELECT id
    FROM giki_wallet.jobs
    WHERE status = 'PENDING' AND run_at <= NOW()
    ORDER BY run_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
RETURNING *;

-- name: CompleteJob :exec
UPDATE giki_wallet.jobs
SET status = 'COMPLETED', updated_at = NOW()
WHERE id = $1;

-- name: FailJob :exec
UPDATE giki_wallet.jobs
SET status = 'FAILED',
    last_error = $2,
    retry_count = retry_count + 1,
    run_at = CASE
        WHEN retry_count < max_retries THEN NOW() + INTERVAL '1 minute' -- Retry logic
        ELSE run_at
    END,
    updated_at = NOW()
WHERE id = $1;
