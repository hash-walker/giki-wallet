package common

import (
	"context"

	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionFunc func(pgx.Tx) error

func WithTransaction(ctx context.Context, pool *pgxpool.Pool, fn TransactionFunc) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrTransactionBegin, err)
	}

	defer tx.Rollback(ctx)

	if txErr := fn(tx); txErr != nil {
		return txErr
	}

	if commitErr := tx.Commit(ctx); commitErr != nil {
		return commonerrors.Wrap(commonerrors.ErrTransactionCommit, commitErr)
	}

	return nil
}
