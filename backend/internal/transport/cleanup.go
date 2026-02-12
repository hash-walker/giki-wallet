package transport

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	"github.com/hash-walker/giki-wallet/internal/transport/transport_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CleanupExpiredHolds runs periodically to reclaim seats from expired holds
// It processes each hold in a separate transaction to ensure resilience - one failure won't block others
func CleanupExpiredHolds(dbPool *pgxpool.Pool, q *transport_db.Queries) {
	ctx := context.Background()

	// Get list of expired holds (no transaction yet - just a query)
	expiredHolds, err := q.GetExpiredHolds(ctx)
	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), "cleanup-holds-get-expired")
		return
	}

	if len(expiredHolds) == 0 {
		return // Nothing to do
	}

	// Process each hold in its own transaction
	successCount := 0
	for _, holdRef := range expiredHolds {
		if err := cleanupSingleHold(ctx, dbPool, q, holdRef.ID, holdRef.TripID); err != nil {
			// Log error but continue processing other holds
			middleware.LogAppError(err, fmt.Sprintf("cleanup-hold-failed-id-%s", holdRef.ID.String()))
			continue
		}
		successCount++
	}

	if successCount > 0 {
		fmt.Printf("[Cleanup] Reclaimed %d expired holds\n", successCount)
	}
}

// cleanupSingleHold processes a single expired hold in its own transaction
func cleanupSingleHold(ctx context.Context, dbPool *pgxpool.Pool, q *transport_db.Queries, holdID, tripID uuid.UUID) error {
	tx, err := dbPool.Begin(ctx)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	defer tx.Rollback(ctx)

	qtx := q.WithTx(tx)

	// Lock the hold first (consistent lock order: hold -> trip, same as ConfirmBatch)
	_, err = qtx.GetHoldForUpdate(ctx, holdID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Hold already deleted (race with ConfirmBatch), this is fine
			return nil
		}
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// Then lock the trip
	_, err = qtx.GetTripForUpdate(ctx, tripID)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// Give seat back
	if err := qtx.IncrementTripSeat(ctx, tripID); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// Delete hold record
	if err := qtx.DeleteHold(ctx, holdID); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// Commit this individual transaction
	return tx.Commit(ctx)
}

// StartCleanupWorker starts a background goroutine that runs cleanup periodically
func StartCleanupWorker(dbPool *pgxpool.Pool, interval time.Duration) {
	q := transport_db.New(dbPool)

	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			CleanupExpiredHolds(dbPool, q)
		}
	}()
}
