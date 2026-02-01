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

// =============================================================================
// MIDDLEWARES
// =============================================================================

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := middleware.GetRequestID(r.Context())

		userID, userRole, err := validateRequest(r)
		if err != nil {
			middleware.HandleError(w, err, requestID)
			return
		}

		// Success: Set Context
		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, userRoleKey, userRole)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireLogin(redirectOnFail string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			userID, userRole, err := validateRequest(r)

			if err != nil {
				http.Redirect(w, r, redirectOnFail, http.StatusFound)
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			ctx = context.WithValue(ctx, userRoleKey, userRole)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := middleware.GetRequestID(r.Context())

			userRole, ok := GetUserRoleFromContext(r.Context())
			if !ok {
				middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
				return
			}

			if userRole == RoleSuperAdmin {
				next.ServeHTTP(w, r)
				return
			}

			if slices.Contains(allowedRoles, userRole) {
				next.ServeHTTP(w, r)
				return
			}

			middleware.HandleError(w, commonerrors.ErrForbidden, requestID)
		})
	}
}

// =============================================================================
// HELPERS (Logic Extraction)
// =============================================================================

func validateRequest(r *http.Request) (uuid.UUID, string, error) {

	tokenString, err := getTokenFromRequest(r)
	if err != nil {
		return uuid.Nil, "", err
	}

	tokenSecret := os.Getenv("TOKEN_SECRET")
	claims, err := ValidateJWT(tokenString, tokenSecret)
	if err != nil {
		return uuid.Nil, "", err
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, "", commonerrors.Wrap(ErrInvalidToken, err)
	}

	return userID, claims.UserType, nil
}

func getTokenFromRequest(r *http.Request) (string, error) {

	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		split := strings.Split(authHeader, " ")
		if len(split) == 2 && split[0] == "Bearer" {
			return split[1], nil
		}
	}

	cookie, err := r.Cookie("token")
	if err == nil && cookie.Value != "" {
		return cookie.Value, nil
	}

	return "", ErrMissingAuthHeader
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

func GetBearerToken(authHeader string) (string, error) {
	if authHeader == "" {
		return "", ErrMissingAuthHeader
	}
	authorizationSplit := strings.Split(authHeader, " ")
	if len(authorizationSplit) != 2 || authorizationSplit[0] != "Bearer" {
		return "", ErrMalformedAuthHeader
	}
	return authorizationSplit[1], nil
}

func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(userIDKey).(uuid.UUID)
	return userID, ok
}

func GetUserRoleFromContext(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(userRoleKey).(string)
	return role, ok
}
