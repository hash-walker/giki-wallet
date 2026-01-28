package payment

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

var (
	// Validation Errors
	ErrInvalidPaymentMethod = errors.New("INVALID_PAYMENT_METHOD", http.StatusBadRequest, "Unsupported payment method")
	ErrInvalidPhoneNumber   = errors.New("INVALID_PHONE", http.StatusBadRequest, "Invalid phone number format")
	ErrInvalidCNIC          = errors.New("INVALID_CNIC", http.StatusBadRequest, "Invalid CNIC format")

	// Transaction Errors
	ErrTransactionNotFound     = errors.New("TRANSACTION_NOT_FOUND", http.StatusNotFound, "Transaction not found")
	ErrDuplicateIdempotency    = errors.New("DUPLICATE_IDEMPOTENCY", http.StatusConflict, "Duplicate transaction detected")
	ErrDuplicateIdempotencyKey = errors.New("DUPLICATE_IDEMPOTENCY_KEY", http.StatusConflict, "Duplicate idempotency key")
	ErrTransactionTimeout      = errors.New("TRANSACTION_TIMEOUT", http.StatusRequestTimeout, "Transaction timed out")
	ErrIdempotentSuccess       = errors.New("IDEMPOTENT_SUCCESS", http.StatusOK, "Transaction Already Succeeded")

	// Gateway Errors
	ErrGatewayUnavailable = errors.New("GATEWAY_UNAVAILABLE", http.StatusBadGateway, "Payment gateway is currently unavailable")

	// Internal Errors
	ErrUserIDNotFound      = errors.New("USER_ID_NOT_FOUND", http.StatusUnauthorized, "User ID not found in context")
	ErrTransactionCreation = errors.New("TRANSACTION_CREATION", http.StatusInternalServerError, "Failed to create transaction")
	ErrTransactionUpdate   = errors.New("TRANSACTION_UPDATE", http.StatusInternalServerError, "Failed to update transaction")
	ErrInternal            = errors.New("PAYMENT_INTERNAL_ERROR", http.StatusInternalServerError, "Payment internal error")
	ErrDatabaseQuery       = errors.New("PAYMENT_DATABASE_QUERY", http.StatusInternalServerError, "Payment database query failed")
)
