package auth

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"crypto/rand"

	"github.com/golang-jwt/jwt/v5"
	auth "github.com/hash-walker/giki-wallet/internal/auth/auth_db"
	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/user/user_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrInvalidPassword = errors.New("invalid password")
	ErrUserInactive    = errors.New("user inactive")
	ErrTokenExpired    = errors.New("token expired")
	ErrTokenInvalid    = errors.New("token invalid")
	ErrTokenCreation   = errors.New("error creating secure token")
)

type Service struct {
	userQ  *user_db.Queries
	authQ  *auth.Queries
	dbPool *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool) *Service {
	return &Service{
		authQ:  auth.New(dbPool),
		userQ:  user_db.New(dbPool),
		dbPool: dbPool,
	}
}

func (s *Service) AuthenticateAndIssueTokens(ctx context.Context, tx pgx.Tx, email string, password string) (LoginResult, error) {

	user, err := s.CheckUserAndPassword(ctx, email, password)

	if err != nil {

		switch {
		case errors.Is(err, pgx.ErrNoRows):
			return LoginResult{}, ErrUserNotFound
		case errors.Is(err, ErrInvalidPassword):
			return LoginResult{}, ErrInvalidPassword
		default:
			log.Printf("Error getting user by email: %v", err)
			return LoginResult{}, fmt.Errorf("get user by email: %w", err)
		}

	}

	if !user.IsActive || !user.IsVerified {
		log.Printf("Error user is not active or verified: %v", err)
		return LoginResult{}, ErrUserInactive
	}

	expireTime := time.Duration(3600) * time.Second
	tokenSecret := "Hello"

	tokenPair, err := s.IssueTokenPair(ctx, tx, user, tokenSecret, expireTime)

	if err != nil {
		log.Printf("Cannot generate token: %v", err)
		return LoginResult{}, ErrTokenCreation
	}

	res := LoginResult{
		User:   user,
		Tokens: tokenPair,
	}

	return res, nil
}

func (s *Service) IssueTokenPair(ctx context.Context, tx pgx.Tx, user user_db.GikiWalletUser, tokenSecret string, expiresIn time.Duration) (TokenPairs, error) {

	claims := CustomClaims{
		UserType: user.UserType,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "giki-wallet",
			IssuedAt:  jwt.NewNumericDate(time.Now().UTC()),
			ExpiresAt: jwt.NewNumericDate(time.Now().UTC().Add(expiresIn)),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString([]byte(tokenSecret))

	if err != nil {
		return TokenPairs{}, err
	}

	refreshToken, err := MakeRefreshToken()
	expirationAt := time.Now().Add(60 * 24 * time.Hour)

	authQ := s.authQ.WithTx(tx)

	_, err = authQ.CreateRefreshToken(ctx, auth.CreateRefreshTokenParams{
		TokenHash: refreshToken,
		ExpiresAt: common.TimeToPgTime(expirationAt),
		UserID:    user.ID,
	})

	if err != nil {
		return TokenPairs{}, err
	}

	tokenPairs := TokenPairs{
		AccessToken:  signedToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresIn,
	}

	return tokenPairs, nil
}

func (s *Service) CheckUserAndPassword(ctx context.Context, email string, password string) (user_db.GikiWalletUser, error) {

	user, err := s.userQ.GetUserByEmail(ctx, email)

	if err != nil {
		return user_db.GikiWalletUser{}, err
	}

	passwordHash := user.PasswordHash

	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password))

	if err != nil {
		return user_db.GikiWalletUser{}, ErrInvalidPassword
	}

	return user, nil

}

func MakeRefreshToken() (string, error) {
	key := make([]byte, 32)
	rand.Read(key)
	refreshToken := hex.EncodeToString(key)

	return refreshToken, nil
}
