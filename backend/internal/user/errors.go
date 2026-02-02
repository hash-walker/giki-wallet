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

	// Duplicate/Constraint Errors
	ErrDuplicateEmail = errors.New("DUPLICATE_EMAIL", http.StatusConflict, "An account with this email already exists")
	ErrDuplicatePhone = errors.New("DUPLICATE_PHONE", http.StatusConflict, "An account with this phone number already exists")
	ErrDuplicateRegID = errors.New("DUPLICATE_REG_ID", http.StatusConflict, "This registration number is already in use")

	// Student/Employee Errors
	ErrMissingRegID    = errors.New("MISSING_REG_ID", http.StatusBadRequest, "Registration number required for students")
	ErrInvalidRegID    = errors.New("INVALID_REG_ID", http.StatusBadRequest, "Invalid registration ID format")
	ErrNotAnEmployee   = errors.New("NOT_AN_EMPLOYEE", http.StatusBadRequest, "User is not an employee")
	ErrAlreadyVerified = errors.New("ALREADY_VERIFIED", http.StatusBadRequest, "User is already verified")
)
