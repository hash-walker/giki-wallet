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

-- name: AutoOpenTrips :exec
-- Moves SCHEDULED -> OPEN
-- Trigger: Current Time >= (Departure - Open Offset)
UPDATE giki_transport.trip
SET status = 'OPEN', updated_at = NOW()
WHERE status = 'SCHEDULED'
  AND NOW() >= (departure_time - (booking_open_offset_hours * INTERVAL '1 hour'));

-- name: AutoCloseTrips :exec
-- Moves OPEN -> CLOSED
-- Trigger: Current Time >= (Departure - Close Offset) OR Seats are 0
UPDATE giki_transport.trip
SET status = 'CLOSED', updated_at = NOW()
WHERE status = 'OPEN'
  AND (
    NOW() >= (departure_time - (booking_close_offset_hours * INTERVAL '1 hour'))
        OR available_seats <= 0
);
-- name: GetJobStats :one
SELECT
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
    COUNT(*) FILTER (WHERE status = 'PROCESSING') as processing_count,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count,
    COUNT(*) FILTER (WHERE status = 'COMPLETED' AND updated_at > NOW() - INTERVAL '1 hour') as completed_last_hour
FROM giki_wallet.jobs;

-- name: PruneCompletedJobs :exec
DELETE FROM giki_wallet.jobs
WHERE status = 'COMPLETED' AND updated_at < NOW() - INTERVAL '7 days';

-- name: PruneExpiredTokens :exec
DELETE FROM giki_wallet.access_tokens
WHERE expires_at < NOW() - INTERVAL '24 hours';
