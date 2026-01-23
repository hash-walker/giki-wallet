package middleware

import (
	"log"
	"net/http"
	"runtime/debug"

	std_errors "errors"

	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

// ErrorHandler is a middleware that recovers from panics and provides consistent error handling

func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				requestID := GetRequestID(r.Context())

				// Log panic with stack trace
				log.Printf("PANIC RECOVERED: requestID=%s, path=%s, method=%s, error=%v\n%s",
					requestID, r.URL.Path, r.Method, err, string(debug.Stack()))

				appErr := errors.ErrInternal
				common.ResponseWithError(w, appErr.StatusCode, appErr.Message)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// HandleError is a helper to handle errors consistently across handlers
func HandleError(w http.ResponseWriter, err error, requestID string) {
	if err == nil {
		return
	}

	LogAppError(err, requestID)

	var appErr *errors.AppError
	if std_errors.As(err, &appErr) {
		// Send user-facing error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(appErr.StatusCode)

		response := map[string]any{
			"code":    appErr.Code,
			"message": appErr.Message,
		}
		if len(appErr.Details) > 0 {
			response["details"] = appErr.Details
		}

		common.ResponseWithJSON(w, appErr.StatusCode, response)
		return
	}

	appErr = errors.ErrInternal
	common.ResponseWithError(w, appErr.StatusCode, appErr.Message)
}

// LogAppError logs the error details consistently with request context

func LogAppError(err error, requestID string) {
	if err == nil {
		return
	}

	var appErr *errors.AppError
	if std_errors.As(err, &appErr) {

		if appErr.Err != nil {

			log.Printf("ERROR: requestID=%s, code=%s, message=%s, internal=%v",
				requestID, appErr.Code, appErr.Message, appErr.Err)

		} else {

			log.Printf("ERROR: requestID=%s, code=%s, message=%s",
				requestID, appErr.Code, appErr.Message)

		}
		return
	}

	log.Printf("UNKNOWN ERROR: requestID=%s, error=%v", requestID, err)
}
