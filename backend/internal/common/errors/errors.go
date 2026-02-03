package errors

import (
	std_errors "errors"
	"fmt"
	"net/http"
)

// ============================================================================
// GLOBAL/HTTP ERRORS (Used across all domains)
// ============================================================================

var (
	// Request/Validation (400)
	ErrInvalidInput = New("INVALID_INPUT", http.StatusBadRequest, "Invalid input data")
	ErrInvalidJSON  = New("INVALID_JSON", http.StatusBadRequest, "Invalid JSON format")
	ErrInvalidUUID  = New("INVALID_UUID", http.StatusBadRequest, "Invalid UUID format")
	ErrMissingField = New("MISSING_FIELD", http.StatusBadRequest, "Required field is missing")

	// Authentication (401)
	ErrUnauthorized = New("UNAUTHORIZED", http.StatusUnauthorized, "Authentication required")
	ErrInvalidToken = New("INVALID_TOKEN", http.StatusUnauthorized, "Invalid or expired token")

	// Authorization (403)
	ErrForbidden = New("FORBIDDEN", http.StatusForbidden, "Access denied")

	// Not Found (404)
	ErrNotFound = New("NOT_FOUND", http.StatusNotFound, "Resource not found")

	// Conflict (409)
	ErrConflict = New("CONFLICT", http.StatusConflict, "Resource conflict")

	// Timeout (408)
	ErrTimeout = New("TIMEOUT", http.StatusRequestTimeout, "Request timeout")

	// Rate Limit (429)
	ErrRateLimitExceeded = New("RATE_LIMIT_EXCEEDED", http.StatusTooManyRequests, "Rate limit exceeded")

	// Internal (500)
	ErrInternal          = New("INTERNAL_ERROR", http.StatusInternalServerError, "An unexpected error occurred")
	ErrDatabase          = New("DATABASE_ERROR", http.StatusInternalServerError, "Database operation failed")
	ErrTransactionBegin  = New("TRANSACTION_BEGIN", http.StatusInternalServerError, "Failed to begin transaction")
	ErrTransactionCommit = New("TRANSACTION_COMMIT", http.StatusInternalServerError, "Failed to commit transaction")

	// External Services (502)
	ErrExternalService = New("EXTERNAL_SERVICE", http.StatusBadGateway, "External service unavailable")

	// Domain Specific (User)
	ErrEmailTaken = New("EMAIL_TAKEN", http.StatusConflict, "Email address is already in use")
)

// AppError defines a standard error for the application
type AppError struct {
	Code       string                 `json:"code"`              // Machine-readable error code
	Message    string                 `json:"message"`           // User-facing message
	StatusCode int                    `json:"-"`                 // HTTP Status Code
	Err        error                  `json:"-"`                 // Internal error (for logging)
	Details    map[string]interface{} `json:"details,omitempty"` // Additional context
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// WithDetails adds contextual details to the error
func (e *AppError) WithDetails(key string, value interface{}) *AppError {
	if e.Details == nil {
		e.Details = make(map[string]interface{})
	}
	e.Details[key] = value
	return e
}

// New creates a new AppError
func New(code string, statusCode int, message string) *AppError {
	return &AppError{
		Code:       code,
		StatusCode: statusCode,
		Message:    message,
		Details:    make(map[string]interface{}),
	}
}

// Wrap wraps an existing error with AppError
func Wrap(appErr *AppError, err error) *AppError {
	return &AppError{
		Code:       appErr.Code,
		StatusCode: appErr.StatusCode,
		Message:    appErr.Message,
		Err:        err,
		Details:    appErr.Details,
	}
}

// Map transforms a generic error into an AppError (defaulting to 500)
func Map(err error) *AppError {
	var appErr *AppError
	if std_errors.As(err, &appErr) {
		return appErr
	}
	return Wrap(ErrInternal, err)
}

// =============================================================================
// BACKWARD COMPATIBILITY - Deprecated errors for migration period
// =============================================================================

var (
	// These will be removed after migration to domain-specific error files
	ErrInvalidCredentials   = New("INVALID_CREDENTIALS", http.StatusUnauthorized, "Invalid email or password")
	ErrUserNotFound         = New("USER_NOT_FOUND", http.StatusNotFound, "User not found")
	ErrUserInactive         = New("USER_INACTIVE", http.StatusForbidden, "User account is inactive or not verified")
	ErrEmailRestricted      = New("EMAIL_RESTRICTED", http.StatusForbidden, "Only @giki.edu.pk email addresses are allowed")
	ErrInvalidPaymentMethod = New("INVALID_PAYMENT_METHOD", http.StatusBadRequest, "Unsupported payment method")
	ErrInvalidPhoneNumber   = New("INVALID_PHONE", http.StatusBadRequest, "Invalid phone number format")
	ErrInvalidCNIC          = New("INVALID_CNIC", http.StatusBadRequest, "Invalid CNIC format")
	ErrBalanceInsufficient  = New("INSUFFICIENT_BALANCE", http.StatusBadRequest, "Insufficient wallet balance")
	ErrTransactionDuplicate = New("DUPLICATE_TRANSACTION", http.StatusConflict, "Duplicate transaction detected")
	ErrGatewayUnavailable   = New("GATEWAY_UNAVAILABLE", http.StatusBadGateway, "Payment gateway is currently unavailable")
	ErrInternalServer       = ErrInternal // Alias for backward compatibility
	ErrMissingRequestBody   = New("MISSING_REQUEST_BODY", http.StatusBadRequest, "Request body is required")
	ErrUnprocessableEntity  = New("UNPROCESSABLE_ENTITY", http.StatusUnprocessableEntity, "The provided input data is invalid")
)

// Deprecated: Use ErrBalanceInsufficient instead (typo fix)
var ErrBalanaceInsufficient = ErrBalanceInsufficient
