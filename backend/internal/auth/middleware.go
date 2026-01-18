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
			common.ResponseWithError(w, http.StatusNonAuthoritativeInfo, err.Error())
			return
		}

		// validate token
		tokenSecret := os.Getenv("TOKEN_SECRET")
		userID, err := ValidateJWT(token, tokenSecret)
		if err != nil {
			return
		}

		context.WithValue(r.Context(), userIDKey, userID)

		next.ServeHTTP(w, r)
	})
}

func GetBearerToken(authHeader string) (string, error) {

	if authHeader == "" {
		return "", fmt.Errorf("error getting the authorization header")
	}

	authorizationSplit := strings.Split(authHeader, " ")

	return authorizationSplit[1], nil
}

func ValidateJWT(tokenString, tokenSecret string) (uuid.UUID, error) {

	parsedClaims := &jwt.RegisteredClaims{}

	token, err := jwt.ParseWithClaims(tokenString, parsedClaims, func(token *jwt.Token) (interface{}, error) {
		return []byte(tokenSecret), nil
	})

	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid token: %w", err)
	}

	claims := token.Claims.(*CustomClaims)

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
