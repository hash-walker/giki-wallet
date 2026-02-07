package feedback

import (
	"errors"

	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/jackc/pgx/v5/pgconn"
)

// translateDBError converts PostgreSQL errors to user-friendly error messages
func translateDBError(err error) error {
	// Check if it's a PostgreSQL error
	var pgErr *pgconn.PgError
	ok := errors.As(err, &pgErr)

	if !ok {
		return ErrFeedbackCreationFailed
	}

	// Add specific constraints handling here if needed in the future
	// For now, feedback table doesn't have unique constraints that user can trigger easily (except primary key which is auto)

	// Default to generic error
	return commonerrors.Wrap(ErrFeedbackCreationFailed, err)
}
