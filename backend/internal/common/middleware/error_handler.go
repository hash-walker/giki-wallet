package middleware

import (
	"log"
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

// ErrorHandler is a middleware that recovers from panics and handles errors
func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("PANIC: %v, Path: %s, Method: %s", err, r.URL.Path, r.Method)

				appErr := errors.ErrInternal
				common.ResponseWithError(w, appErr.StatusCode, appErr.Message)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// HandleError is a helper to handle errors consistently
func HandleError(w http.ResponseWriter, err error, requestID string) {
	if err == nil {
		return
	}

	// Check if it's an AppError
	if appErr, ok := err.(*errors.AppError); ok {
		// Log internal error details
		if appErr.Err != nil {
			log.Printf("ERROR: code=%s, message=%s, internal=%v, requestID=%s",
				appErr.Code, appErr.Message, appErr.Err, requestID)
		} else {
			log.Printf("ERROR: code=%s, message=%s, requestID=%s",
				appErr.Code, appErr.Message, requestID)
		}

		// Send user-facing error
		common.ResponseWithError(w, appErr.StatusCode, appErr.Message)
		return
	}

	// Unknown error - log and return generic message
	log.Printf("UNKNOWN ERROR: %v, requestID=%s", err, requestID)
	common.ResponseWithError(w, http.StatusInternalServerError, "An unexpected error occurred")
}
