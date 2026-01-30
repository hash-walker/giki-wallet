package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"runtime/debug"

	std_errors "errors"

	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

func ErrorHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				requestID := GetRequestID(r.Context())

				log.Printf("PANIC RECOVERED: requestID=%s, path=%s, method=%s, error=%v\n%s",
					requestID, r.URL.Path, r.Method, err, string(debug.Stack()))

				appErr := errors.ErrInternal
				common.ResponseWithError(w, appErr.StatusCode, appErr.Message, requestID)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

func HandleError(w http.ResponseWriter, err error, requestID string) {
	if err == nil {
		return
	}

	LogAppError(err, requestID)

	var appErr *errors.AppError
	if std_errors.As(err, &appErr) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(appErr.StatusCode)

		response := common.APIResponse{
			Success: false,
			Error: map[string]interface{}{
				"code":    appErr.Code,
				"message": appErr.Message,
				"details": appErr.Details,
			},
			Meta: common.ResponseMeta{
				RequestID: requestID,
			},
		}

		_ = json.NewEncoder(w).Encode(response)
		return
	}

	appErr = errors.ErrInternal
	response := common.APIResponse{
		Success: false,
		Error: map[string]string{
			"code":    appErr.Code,
			"message": appErr.Message,
		},
		Meta: common.ResponseMeta{
			RequestID: requestID,
		},
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.StatusCode)
	_ = json.NewEncoder(w).Encode(response)
}

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
