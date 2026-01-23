package user

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

var (
	// User Validation Errors
	ErrEmailRestricted = errors.New("EMAIL_RESTRICTED", http.StatusForbidden, "Only @giki.edu.pk email addresses are allowed")
	ErrInvalidEmail    = errors.New("INVALID_EMAIL", http.StatusBadRequest, "Invalid email format")
	ErrInvalidUserType = errors.New("INVALID_USER_TYPE", http.StatusBadRequest, "Invalid user type")

	// User Creation Errors
	ErrUserCreationFailed    = errors.New("USER_CREATION_FAILED", http.StatusInternalServerError, "Failed to create user")
	ErrProfileCreationFailed = errors.New("PROFILE_CREATION_FAILED", http.StatusInternalServerError, "Failed to create user profile")

	// Student/Employee Errors
	ErrMissingRegID = errors.New("MISSING_REG_ID", http.StatusBadRequest, "Registration number required for students")
)
