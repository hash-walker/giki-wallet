package auth

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

var (
	// ErrInvalidCredentials Authentication Errors

	ErrInvalidCredentials  = errors.New("INVALID_CREDENTIALS", http.StatusUnauthorized, "Invalid email or password")
	ErrMissingAuthHeader   = errors.New("MISSING_AUTH_HEADER", http.StatusUnauthorized, "Missing authorization header")
	ErrMalformedAuthHeader = errors.New("MALFORMED_AUTH_HEADER", http.StatusUnauthorized, "Malformed authorization header")

	// ErrUserNotFound User State Errors

	ErrUserNotFound = errors.New("USER_NOT_FOUND", http.StatusNotFound, "User not found")
	ErrUserInactive = errors.New("USER_INACTIVE", http.StatusForbidden, "User account is inactive or not verified")

	// ErrTokenCreation Token Errors

	ErrTokenCreation   = errors.New("TOKEN_CREATION", http.StatusInternalServerError, "Failed to create token")
	ErrInvalidPassword = errors.New("INVALID_PASSWORD", http.StatusUnauthorized, "Invalid password")
	ErrInvalidToken    = errors.New("INVALID_TOKEN", http.StatusUnauthorized, "Invalid or expired token")
)
