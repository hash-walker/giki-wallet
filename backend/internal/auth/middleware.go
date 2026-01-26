package auth

import (
	"context"
	"net/http"
	"os"
	"slices"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
)

type contextKey string

const (
	userIDKey   contextKey = "user_id"
	userRoleKey contextKey = "user_role"
)

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := middleware.GetRequestID(r.Context())

		authHeader := r.Header.Get("Authorization")
		token, err := GetBearerToken(authHeader)
		if err != nil {
			middleware.HandleError(w, err, requestID)
			return
		}

		// Validate token
		tokenSecret := os.Getenv("TOKEN_SECRET")
		claims, err := ValidateJWT(token, tokenSecret)
		if err != nil {
			middleware.HandleError(w, err, requestID)
			return
		}

		userID, err := uuid.Parse(claims.Subject)
		if err != nil {
			middleware.HandleError(w, commonerrors.Wrap(ErrInvalidToken, err), requestID)
			return
		}

		// Set UserID and UserRole in context
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, userRoleKey, claims.UserType)

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}

// RequireRole creates middleware that ensures the user has one of the allowed roles
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := middleware.GetRequestID(r.Context())

			userRole, ok := GetUserRoleFromContext(r.Context())
			if !ok {
				middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
				return
			}

			// Check if user has one of the allowed roles
			// Super Admin is always allowed (fail-safe)
			if userRole == RoleSuperAdmin {
				next.ServeHTTP(w, r)
				return
			}

			if slices.Contains(allowedRoles, userRole) {
				next.ServeHTTP(w, r)
				return
			}

			// If we get here, user does not have permission
			middleware.HandleError(w, commonerrors.ErrForbidden, requestID)
		})
	}
}

func GetBearerToken(authHeader string) (string, error) {

	if authHeader == "" {
		return "", ErrMissingAuthHeader
	}

	authorizationSplit := strings.Split(authHeader, " ")

	if len(authorizationSplit) != 2 {
		return "", ErrMalformedAuthHeader
	}

	if authorizationSplit[0] != "Bearer" {
		return "", ErrMalformedAuthHeader
	}

	return authorizationSplit[1], nil
}

func ValidateJWT(tokenString, tokenSecret string) (*CustomClaims, error) {

	parsedClaims := &CustomClaims{}

	token, err := jwt.ParseWithClaims(tokenString, parsedClaims, func(token *jwt.Token) (interface{}, error) {
		return []byte(tokenSecret), nil
	})

	if err != nil {
		return nil, commonerrors.Wrap(ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(userIDKey).(uuid.UUID)
	return userID, ok
}

func GetUserRoleFromContext(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(userRoleKey).(string)
	return role, ok
}

// SetUserInContext sets user ID and Role in context (for testing)
func SetUserInContext(ctx context.Context, userID uuid.UUID, role string) context.Context {
	ctx = context.WithValue(ctx, userIDKey, userID)
	return context.WithValue(ctx, userRoleKey, role)
}
