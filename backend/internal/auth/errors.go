package auth

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

var (
	// ErrInvalidCredentials Authentication Errors

	ErrInvalidCredentials  = errors.New("INVALID_CREDENTIALS", http.StatusUnauthorized, "Invalid email or password")
	ErrMissingAuthHeader   = errors.New("MISSING_AUTH_HEADER", http.StatusUnauthorized, "Please sign in to continue")
	ErrMalformedAuthHeader = errors.New("MALFORMED_AUTH_HEADER", http.StatusUnauthorized, "Authentication error, please sign in again")

	// ErrUserNotFound User State Errors

	ErrUserNotFound        = errors.New("USER_NOT_FOUND", http.StatusNotFound, "User not found")
	ErrUserInactive        = errors.New("USER_INACTIVE", http.StatusForbidden, "User account is inactive")
	ErrUserNotVerified     = errors.New("USER_NOT_VERIFIED", http.StatusForbidden, "Please verify your email before signing in")
	ErrUserPendingApproval = errors.New("USER_PENDING_APPROVAL", http.StatusForbidden, "Your account is pending approval")

	// ErrTokenCreation Token Errors

	ErrTokenCreation   = errors.New("TOKEN_CREATION", http.StatusInternalServerError, "Failed to create token")
	ErrInvalidPassword = errors.New("INVALID_PASSWORD", http.StatusUnauthorized, "Invalid password")
	ErrInvalidToken    = errors.New("INVALID_TOKEN", http.StatusUnauthorized, "Your session has expired, please sign in again")

	// Verification Errors
	ErrInvalidVerificationToken = errors.New("INVALID_VERIFICATION_TOKEN", http.StatusBadRequest, "Invalid verification token")
	ErrVerificationTokenExpired = errors.New("VERIFICATION_TOKEN_EXPIRED", http.StatusBadRequest, "Verification token has expired")

	// Refresh Errors
	ErrInvalidRefreshToken = errors.New("INVALID_REFRESH_TOKEN", http.StatusUnauthorized, "Invalid refresh token, please sign in again")
	ErrRefreshTokenExpired = errors.New("REFRESH_TOKEN_EXPIRED", http.StatusUnauthorized, "Your session has expired, please sign in again")
)
