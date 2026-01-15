package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hash-walker/giki-wallet/internal/user/user_db"
)

type CustomClaims struct {
	UserType string `json:"user_type"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

type TokenPairs struct {
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	ExpiresAt    time.Duration `json:"expires_at"`
}

type LoginResult struct {
	User   user_db.GikiWalletUser
	Tokens TokenPairs
}
