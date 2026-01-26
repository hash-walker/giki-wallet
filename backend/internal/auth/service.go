package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"time"

	"crypto/rand"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	auth "github.com/hash-walker/giki-wallet/internal/auth/auth_db"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/user/user_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
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

func (s *Service) Login(ctx context.Context, req LoginParams) (*LoginResult, error) {

	tx, err := s.dbPool.Begin(ctx)

	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrTransactionBegin, err)
	}
	defer tx.Rollback(ctx)

	res, err := s.authenticateAndIssueTokens(ctx, tx, req.Email, req.Password)

	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrTransactionCommit, err)
	}

	return res, nil

}

func (s *Service) GetUserByID(ctx context.Context, userID uuid.UUID) (user_db.GikiWalletUser, error) {
	u, err := s.userQ.GetUserByID(ctx, userID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user_db.GikiWalletUser{}, ErrUserNotFound
		}
		return user_db.GikiWalletUser{}, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return u, nil
}

func (s *Service) VerifyEmailAndIssueTokens(ctx context.Context, token string) (*LoginResult, error) {
	tokenHash := sha256Hex(token)

	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrTransactionBegin, err)
	}
	defer tx.Rollback(ctx)

	var userID uuid.UUID
	var tokenType string
	var expiresAt time.Time

	if tokenType != "EMAIL_VERIFICATION" {
		return nil, ErrInvalidVerificationToken
	}

	if time.Now().UTC().After(expiresAt.UTC()) {
		return nil, ErrVerificationTokenExpired
	}

	u, err := s.userQ.UpdateUserVerification(ctx, userID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	if _, err := tx.Exec(ctx, ``, tokenHash); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	expireTime := time.Duration(3600) * time.Second
	tokenPair, err := s.issueTokenPair(ctx, tx, u, expireTime)
	if err != nil {
		return nil, commonerrors.Wrap(ErrTokenCreation, err)
	}

	res := LoginResult{
		User:   u,
		Tokens: tokenPair,
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrTransactionCommit, err)
	}

	return &res, nil
}

func (s *Service) authenticateAndIssueTokens(ctx context.Context, tx pgx.Tx, email string, password string) (*LoginResult, error) {

	user, err := s.checkUserAndPassword(ctx, tx, email, password)

	if err != nil {
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			return nil, commonerrors.Wrap(ErrUserNotFound, err)
		case errors.Is(err, ErrInvalidPassword):
			return nil, err
		default:
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}
	}

	if !user.IsActive {
		// Employees generally require manual approval.
		if user.UserType == "employee" {
			return nil, commonerrors.Wrap(ErrUserPendingApproval, fmt.Errorf("user pending approval: active=%v, verified=%v", user.IsActive, user.IsVerified))
		}
		return nil, commonerrors.Wrap(ErrUserInactive, fmt.Errorf("user inactive: active=%v, verified=%v", user.IsActive, user.IsVerified))
	}

	if !user.IsVerified {
		return nil, commonerrors.Wrap(ErrUserNotVerified, fmt.Errorf("user not verified: active=%v, verified=%v", user.IsActive, user.IsVerified))
	}

	expireTime := time.Duration(3600) * time.Second

	tokenPair, err := s.issueTokenPair(ctx, tx, user, expireTime)

	if err != nil {
		return nil, commonerrors.Wrap(ErrTokenCreation, err)
	}

	res := LoginResult{
		User:   user,
		Tokens: tokenPair,
	}

	return &res, nil
}

func (s *Service) issueTokenPair(ctx context.Context, tx pgx.Tx, user user_db.GikiWalletUser, expiresIn time.Duration) (TokenPairs, error) {

	tokenSecret := os.Getenv("TOKEN_SECRET")

	if tokenSecret == "" {
		return TokenPairs{}, commonerrors.Wrap(commonerrors.ErrInternal, fmt.Errorf("TOKEN_SECRET environment variable not set"))
	}

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
		return TokenPairs{}, commonerrors.Wrap(ErrTokenCreation, err)
	}

	refreshToken, err := MakeRefreshToken()
	expirationAt := time.Now().Add(60 * 24 * time.Hour)

	if err != nil {
		return TokenPairs{}, commonerrors.Wrap(commonerrors.ErrInternal, err)
	}

	authQ := s.authQ.WithTx(tx)

	_, err = authQ.CreateRefreshToken(ctx, auth.CreateRefreshTokenParams{
		TokenHash: refreshToken,
		ExpiresAt: common.TimeToPgTime(expirationAt),
		UserID:    user.ID,
	})

	if err != nil {
		return TokenPairs{}, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	tokenPairs := TokenPairs{
		AccessToken:  signedToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresIn,
	}

	return tokenPairs, nil
}

func (s *Service) checkUserAndPassword(ctx context.Context, tx pgx.Tx, email string, password string) (user_db.GikiWalletUser, error) {

	userQ := s.userQ.WithTx(tx)

	user, err := userQ.GetUserByEmail(ctx, email)

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
	_, err := rand.Read(key)

	if err != nil {
		return "", commonerrors.Wrap(commonerrors.ErrInternal, err)
	}
	refreshToken := hex.EncodeToString(key)

	return refreshToken, nil
}

func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}
