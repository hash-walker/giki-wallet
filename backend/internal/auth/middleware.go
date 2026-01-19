package auth

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
)

type contextKey string

const userIDKey contextKey = "user_id"

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		// get bearer token
		token, err := GetBearerToken(authHeader)

		if err != nil {
			common.ResponseWithError(w, http.StatusUnauthorized, err.Error())
			return
		}

		// validate token
		tokenSecret := os.Getenv("TOKEN_SECRET")
		userID, err := ValidateJWT(token, tokenSecret)
		if err != nil {
			common.ResponseWithError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)

		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}

func GetBearerToken(authHeader string) (string, error) {

	if authHeader == "" {
		return "", fmt.Errorf("error getting the authorization header")
	}

	authorizationSplit := strings.Split(authHeader, " ")

	if len(authorizationSplit) != 2 {
		return "", fmt.Errorf("malformed authorization header")
	}

	if authorizationSplit[0] != "Bearer" {
		return "", fmt.Errorf("authorization scheme must be Bearer")
	}

	return authorizationSplit[1], nil
}

func ValidateJWT(tokenString, tokenSecret string) (uuid.UUID, error) {

	parsedClaims := &CustomClaims{}

	token, err := jwt.ParseWithClaims(tokenString, parsedClaims, func(token *jwt.Token) (interface{}, error) {
		return []byte(tokenSecret), nil
	})

	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, _ := token.Claims.(*CustomClaims)

	userID, err := uuid.Parse(claims.Subject)

	if err != nil {
		return uuid.Nil, err
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
