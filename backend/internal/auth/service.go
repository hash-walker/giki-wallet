package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"crypto/rand"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	auth "github.com/hash-walker/giki-wallet/internal/auth/auth_db"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/user/user_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	userQ     *user_db.Queries
	authQ     *auth.Queries
	dbPool    *pgxpool.Pool
	jwtSecret string
}

func NewService(dbPool *pgxpool.Pool, jwtSecret string) *Service {
	return &Service{
		authQ:     auth.New(dbPool),
		userQ:     user_db.New(dbPool),
		dbPool:    dbPool,
		jwtSecret: jwtSecret,
	}
}

func (s *Service) Login(ctx context.Context, req LoginParams) (*LoginResult, error) {

	var res *LoginResult
	var authenticationErr error

	err := common.WithTransaction(ctx, s.dbPool, func(tx pgx.Tx) error {

		res, authenticationErr = s.authenticateAndIssueTokens(ctx, tx, req.Email, req.Password)

		if authenticationErr != nil {
			return authenticationErr
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return res, nil

}

func (s *Service) GetUserByID(ctx context.Context, userID uuid.UUID) (user_db.GikiWalletUser, error) {
	u, err := s.userQ.GetUserAuthByID(ctx, userID)

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

	var res *LoginResult

	err := common.WithTransaction(ctx, s.dbPool, func(tx pgx.Tx) error {
		authQ := s.authQ.WithTx(tx)

		u, err := authQ.GetUserByTokenHash(ctx, tokenHash)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrInvalidVerificationToken
			}
			return commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		if u.Type != "EMAIL_VERIFICATION" {
			return ErrInvalidVerificationToken
		}

		if time.Now().UTC().After(u.ExpiresAt.UTC()) {
			return ErrVerificationTokenExpired
		}

		userQ := s.userQ.WithTx(tx)

		// 4. Mark user as verified
		_, err = userQ.UpdateUserVerification(ctx, u.UserID)
		if err != nil {
			return commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		// 5. Verification successful, issue response
		// Re-fetch full user for token issuance
		user, err := userQ.GetUserAuthByID(ctx, u.UserID)
		if err != nil {
			return commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		expireTime := time.Duration(3600) * time.Second
		tokenPair, err := s.issueTokenPair(ctx, tx, user, expireTime)

		if err != nil {
			return commonerrors.Wrap(ErrTokenCreation, err)
		}

		res = &LoginResult{
			User:   user,
			Tokens: tokenPair,
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return res, nil
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

	userType := strings.ToUpper(user.UserType)

	if !user.IsActive {

		if userType == RoleEmployee {
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

	if s.jwtSecret == "" {
		return TokenPairs{}, commonerrors.Wrap(commonerrors.ErrInternal, fmt.Errorf("JWT secret not configured"))
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

	signedToken, err := token.SignedString([]byte(s.jwtSecret))

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

	user, err := userQ.GetUserAuthByEmail(ctx, email)

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

func (s *Service) RefreshToken(ctx context.Context, refreshToken string) (*TokenPairs, error) {
	var result *TokenPairs

	err := common.WithTransaction(ctx, s.dbPool, func(tx pgx.Tx) error {
		authQ := s.authQ.WithTx(tx)

		rt, err := authQ.GetRefreshTokenByHash(ctx, refreshToken)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrInvalidRefreshToken
			}
			return commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		if rt.RevokedAt.Valid {
			_ = authQ.RevokeAllRefreshTokensForUser(ctx, rt.UserID)
			return ErrInvalidRefreshToken
		}

		if time.Now().After(rt.ExpiresAt.Time) {
			return ErrRefreshTokenExpired
		}

		// 3. Get User
		user, err := s.userQ.WithTx(tx).GetUserAuthByID(ctx, rt.UserID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrUserNotFound
			}
			return commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		expireTime := time.Duration(3600) * time.Second
		tokenPair, err := s.issueTokenPair(ctx, tx, user, expireTime)
		if err != nil {
			return err
		}

		err = authQ.ReplaceRefreshToken(ctx, auth.ReplaceRefreshTokenParams{
			TokenHash: refreshToken,
			ReplacedByToken: pgtype.Text{
				String: tokenPair.RefreshToken,
				Valid:  true,
			},
		})
		if err != nil {
			return commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		result = &tokenPair
		return nil
	})

	if err != nil {
		return nil, err
	}

	return result, nil
}

func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}
