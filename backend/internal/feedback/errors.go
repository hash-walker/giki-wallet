package feedback

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

var (
	// Feedback Creation Errors
	ErrFeedbackCreationFailed = errors.New("FEEDBACK_CREATION_FAILED", http.StatusInternalServerError, "Failed to submit feedback")
	ErrInvalidRating          = errors.New("INVALID_RATING", http.StatusBadRequest, "Rating must be between 1 and 5")
)
