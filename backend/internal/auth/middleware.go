package auth

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
)

type contextKey string

const userIDKey contextKey = "user_id"

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := middleware.GetRequestID(r.Context())
		authHeader := r.Header.Get("Authorization")

		// Get bearer token
		token, err := GetBearerToken(authHeader)
		if err != nil {
			middleware.HandleError(w, err, requestID)
			return
		}

		// Validate token
		tokenSecret := os.Getenv("TOKEN_SECRET")
		userID, err := ValidateJWT(token, tokenSecret)
		if err != nil {
			middleware.HandleError(w, err, requestID)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
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

func ValidateJWT(tokenString, tokenSecret string) (uuid.UUID, error) {

	parsedClaims := &CustomClaims{}

	token, err := jwt.ParseWithClaims(tokenString, parsedClaims, func(token *jwt.Token) (interface{}, error) {
		return []byte(tokenSecret), nil
	})

	if err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrInvalidToken, err)
	}

	claims, _ := token.Claims.(*CustomClaims)

	userID, err := uuid.Parse(claims.Subject)

	if err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrInvalidToken, fmt.Errorf("invalid user ID in token: %v", err))
	}

	return userID, nil

}

func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(userIDKey).(uuid.UUID)
	return userID, ok
}

// SetUserIDInContext sets a user ID in context (for testing purposes)
func SetUserIDInContext(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}
