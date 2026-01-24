package transport

import (
	"context"
	"time"

	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	"github.com/hash-walker/giki-wallet/internal/transport/transport_db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CleanupExpiredHolds runs periodically to reclaim seats from expired holds
func CleanupExpiredHolds(dbPool *pgxpool.Pool, q *transport_db.Queries) {
	ctx := context.Background()

	tx, err := dbPool.Begin(ctx)

	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), "cleanup-holds-begin-tx")
		return
	}

	defer tx.Rollback(ctx)

	// 2. Create a Transaction-Aware Query Object
	qtx := q.WithTx(tx)

	// 3. Get Expired Holds with FOR UPDATE SKIP LOCKED
	expiredHolds, err := qtx.GetExpiredHolds(ctx)
	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), "cleanup-holds-get-expired")
		return
	}

	if len(expiredHolds) == 0 {
		return // Nothing to do
	}

	// 4. Process the Batch

	for _, hold := range expiredHolds {
		// A. Give Seat Back
		if err := qtx.IncrementTripSeat(ctx, hold.TripID); err != nil {
			middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), "cleanup-holds-increment-seat")
			return
		}

		// B. Delete Hold Record
		if err := qtx.DeleteHold(ctx, hold.ID); err != nil {
			middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), "cleanup-holds-delete")
			return
		}
	}

	// 5. Commit the Transaction
	if err := tx.Commit(ctx); err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, err), "cleanup-holds-commit")
	}
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
