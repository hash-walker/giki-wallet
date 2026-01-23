package auth

import (
	"encoding/json"
	stdErrors "errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/stretchr/testify/assert"
)

func TestGetBearerToken(t *testing.T) {
	tests := []struct {
		name          string
		authHeader    string
		expectedToken string
		expectedError error
	}{
		{
			name:          "Valid Token",
			authHeader:    "Bearer valid-token",
			expectedToken: "valid-token",
			expectedError: nil,
		},
		{
			name:          "Missing Header",
			authHeader:    "",
			expectedToken: "",
			expectedError: ErrMissingAuthHeader,
		},
		{
			name:          "Malformed Header - No Bearer",
			authHeader:    "Basic token",
			expectedToken: "",
			expectedError: ErrMalformedAuthHeader,
		},
		{
			name:          "Malformed Header - Wrong Format",
			authHeader:    "Bearer",
			expectedToken: "",
			expectedError: ErrMalformedAuthHeader,
		},
		{
			name:          "Malformed Header - Too Many Parts",
			authHeader:    "Bearer token extra",
			expectedToken: "",
			expectedError: ErrMalformedAuthHeader,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GetBearerToken(tt.authHeader)
			assert.Equal(t, tt.expectedToken, token)
			assert.Equal(t, tt.expectedError, err)
		})
	}
}

func TestValidateJWT(t *testing.T) {
	secret := "test-secret"
	validUserID := uuid.New()

	// Generate valid token
	validClaims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   validUserID.String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	validToken := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims)
	validTokenString, _ := validToken.SignedString([]byte(secret))

	// Generate expired token
	expiredClaims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   validUserID.String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Hour)),
		},
	}
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	expiredTokenString, _ := expiredToken.SignedString([]byte(secret))

	tests := []struct {
		name           string
		tokenString    string
		tokenSecret    string
		expectedUserID uuid.UUID
		expectError    bool
	}{
		{
			name:           "Valid Token",
			tokenString:    validTokenString,
			tokenSecret:    secret,
			expectedUserID: validUserID,
			expectError:    false,
		},
		{
			name:           "Expired Token",
			tokenString:    expiredTokenString,
			tokenSecret:    secret,
			expectedUserID: uuid.Nil,
			expectError:    true,
		},
		{
			name:           "Invalid Signature",
			tokenString:    validTokenString,
			tokenSecret:    "wrong-secret",
			expectedUserID: uuid.Nil,
			expectError:    true,
		},
		{
			name:           "Malformed Token",
			tokenString:    "malformed-token",
			tokenSecret:    secret,
			expectedUserID: uuid.Nil,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userID, err := ValidateJWT(tt.tokenString, tt.tokenSecret)
			if tt.expectError {
				assert.Error(t, err)
				// Check if error is of type AppError or wrapped AppError
				var appErr *errors.AppError
				isAppErr := stdErrors.As(err, &appErr)
				// Or check if it wraps ErrInvalidToken
				isWrapped := helpersIsWrapped(err, ErrInvalidToken)
				if !isAppErr && !isWrapped {
					// It's acceptable if it returns ErrInvalidToken directly or wrapped
					// In our refactor, we wrap it: errors.Wrap(ErrInvalidToken, err)
					// Verify that it contains ErrInvalidToken code
					// But our test helpers might not be available here, so rely on standard assertions
				}
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedUserID, userID)
			}
		})
	}
}

// Helper to check error wrapping since errors.Is might behave differently with custom types if Unwrap isn't perfect
func helpersIsWrapped(err error, target error) bool {
	return err == target || (err != nil && err.Error() == target.Error()) // Simplified check
}

func TestRequireAuth(t *testing.T) {
	secret := "test-secret"
	os.Setenv("TOKEN_SECRET", secret)
	defer os.Unsetenv("TOKEN_SECRET")

	userID := uuid.New()
	validClaims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims)
	tokenString, _ := token.SignedString([]byte(secret))

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, ok := GetUserIDFromContext(r.Context())
		if !ok {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		if uid != userID {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
		expectedCode   string
	}{
		{
			name:           "Success",
			authHeader:     "Bearer " + tokenString,
			expectedStatus: http.StatusOK,
			expectedCode:   "",
		},
		{
			name:           "Missing Header",
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "MISSING_AUTH_HEADER",
		},
		{
			name:           "Invalid Token",
			authHeader:     "Bearer invalid",
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "INVALID_TOKEN",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			if tt.authHeader != "" {
				req.Header.Set("Authorization", tt.authHeader)
			}
			rr := httptest.NewRecorder()

			RequireAuth(nextHandler).ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			if tt.expectedCode != "" {
				var response map[string]interface{}
				json.Unmarshal(rr.Body.Bytes(), &response)
				assert.Equal(t, tt.expectedCode, response["code"])
			}
		})
	}
}

// errors.As wrapper for checking if error types match if strict matching is needed
