package user

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/user/user_db"
	"github.com/hash-walker/giki-wallet/internal/worker"
	"github.com/hash-walker/giki-wallet/internal/worker/worker_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	userQ   *user_db.Queries
	workerQ *worker_db.Queries
	jobs    *worker.JobWorker
	dbPool  *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool, jobs *worker.JobWorker) *Service {
	return &Service{
		userQ:   user_db.New(dbPool),
		workerQ: worker_db.New(dbPool),
		jobs:    jobs,
		dbPool:  dbPool,
	}
}

func (s *Service) CreateUser(ctx context.Context, req RegisterRequest) (User, error) {

	req.UserType = strings.ToLower(req.UserType)
	if err := s.validateRegistration(req); err != nil {
		return User{}, err
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return User{}, commonerrors.Wrap(commonerrors.ErrInternal, err)
	}

	var user user_db.GikiWalletUser
	var verificationToken string

	err = common.WithTransaction(ctx, s.dbPool, func(tx pgx.Tx) error {
		userQ := s.userQ.WithTx(tx)

		isActive := false
		isVerified := false
		// Students can become active immediately, but must verify email first.
		if req.UserType == "student" {
			isActive = true
		}

		var createErr error
		user, createErr = userQ.CreateUser(ctx, user_db.CreateUserParams{
			Name:         req.Name,
			Email:        req.Email,
			PhoneNumber:  req.PhoneNumber,
			AuthProvider: "Local",
			PasswordAlgo: "BCRYPT",
			UserType:     req.UserType,
			PasswordHash: passwordHash,
			IsActive:     isActive,
			IsVerified:   isVerified,
		})

		if createErr != nil {
			// IMPORTANT: once a statement fails (e.g. unique constraint), the SQL transaction is aborted
			// and we MUST return immediately (any further queries will fail with "current transaction is aborted").
			return translateDBError(createErr)
		}

		if err := s.createRoleProfile(ctx, tx, user.ID, req); err != nil {
			return err
		}

		// Create email verification token for students.
		if req.UserType == "student" {
			tok, err := generateBase64Token(64)
			if err != nil {
				return commonerrors.Wrap(commonerrors.ErrInternal, err)
			}
			verificationToken = tok

			tokenHash := sha256Hex(verificationToken)
			expiresAt := time.Now().UTC().Add(24 * time.Hour)

			err = userQ.CreateAccessToken(ctx, user_db.CreateAccessTokenParams{
				TokenHash: tokenHash,
				UserID:    user.ID,
				Type:      "EMAIL_VERIFICATION",
				ExpiresAt: expiresAt,
			})

			if err != nil {
				return commonerrors.Wrap(commonerrors.ErrDatabase, err)
			}
		}

		return nil
	})

	if err != nil {
		return User{}, err
	}

	// Enqueue any out-of-band messaging (email).
	// For students, we include verification token link.
	_ = s.enqueueAccountCreationJob(ctx, verificationToken, req)

	return mapDBUserToUser(user), nil
}

func (s *Service) CreateStudent(ctx context.Context, tx pgx.Tx, payload CreateStudentParams) (Student, error) {
	userQ := s.userQ.WithTx(tx)

	// Validate RegID format (should be at least 4 characters for batch year)
	if len(payload.RegID) < 4 {
		return Student{}, ErrInvalidRegID.WithDetails("format", "Registration ID must be at least 4 characters (e.g., 2024-CS-001)")
	}

	batchYear := payload.RegID[0:4]
	num, err := strconv.Atoi(batchYear)

	if err != nil {
		return Student{}, ErrInvalidRegID.WithDetails("format", "Registration ID must start with a 4-digit year (e.g., 2024-CS-001)")
	}

	studentRow, err := userQ.CreateStudent(ctx, user_db.CreateStudentParams{
		UserID:    payload.UserID,
		RegID:     payload.RegID,
		BatchYear: common.IntToInt4(num),
	})

	if err != nil {
		return Student{}, translateDBError(err)
	}

	return mapDBStudentToStudent(studentRow), nil
}

func (s *Service) CreateEmployee(ctx context.Context, tx pgx.Tx, payload CreateEmployeeParams) (Employee, error) {
	userQ := s.userQ.WithTx(tx)

	employeeRow, err := userQ.CreateEmployee(ctx, payload.UserID)

	if err != nil {
		return Employee{}, translateDBError(err)
	}

	return mapDBEmployeeToEmployee(employeeRow), nil
}

func HashPassword(password string) (string, error) {
	hashPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return "", err
	}

	return string(hashPassword), nil
}

func generateBase64Token(n int) (string, error) {
	b := make([]byte, n)

	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return "", err
	}

	token := base64.URLEncoding.EncodeToString(b)

	return token, nil
}

func sha256Hex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func (s *Service) enqueueAccountCreationJob(ctx context.Context, token string, req RegisterRequest) error {
	var err error

	switch req.UserType {
	case "student":
		verifyBase := os.Getenv("FRONTEND_VERIFY_URL")
		if verifyBase == "" {
			// Local default (nginx serves HTTPS on 8443).
			verifyBase = "https://localhost:8443/verify"
		}
		if token == "" {
			return commonerrors.Wrap(commonerrors.ErrInternal, errors.New("missing verification token"))
		}

		err = s.jobs.Enqueue(ctx, "SEND_STUDENT_VERIFY_EMAIL", worker.StudentVerifyPayload{
			Email: req.Email,
			Name:  req.Name,
			Link:  fmt.Sprintf("%s?token=%s", verifyBase, token),
		})

	case "employee":
		err = s.jobs.Enqueue(ctx, "SEND_EMPLOYEE_WAIT_EMAIL", worker.EmployeeWaitPayload{
			Email: req.Email,
			Name:  req.Name,
		})

	default:
		return commonerrors.New("UNSUPPORTED_USER_TYPE", http.StatusBadRequest, fmt.Sprintf("unsupported user type: %s", req.UserType))
	}

	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrInternal, fmt.Errorf("failed to enqueue %s job: %w", req.UserType, err))
	}

	return nil
}

func (s *Service) validateRegistration(req RegisterRequest) error {
	if req.UserType == "" {
		return ErrInvalidUserType
	}

	isGikiEmail := strings.HasSuffix(req.Email, "@giki.edu.pk")
	if !isGikiEmail && req.UserType != "employee" {
		return ErrEmailRestricted
	}

	if req.UserType == "student" && req.RegID == "" {
		return ErrMissingRegID
	}

	return nil
}

func (s *Service) createRoleProfile(ctx context.Context, tx pgx.Tx, userID uuid.UUID, req RegisterRequest) error {
	switch req.UserType {
	case "student":
		_, err := s.CreateStudent(ctx, tx, CreateStudentParams{
			UserID: userID,
			RegID:  req.RegID,
		})
		return err

	case "employee":
		_, err := s.CreateEmployee(ctx, tx, CreateEmployeeParams{
			UserID: userID,
		})
		return err

	default:
		return ErrInvalidUserType.WithDetails("userType", req.UserType)
	}
}

func (s *Service) ListUsers(ctx context.Context, page, pageSize int) (*UsersListWithPagination, error) {
	offset := (page - 1) * pageSize

	rows, err := s.userQ.ListUsers(ctx, user_db.ListUsersParams{
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, translateDBError(err)
	}

	var totalCount int64 = 0
	if len(rows) > 0 {
		totalCount = rows[0].TotalCount
	}

	users := make([]AdminUser, len(rows))
	for i, row := range rows {
		users[i] = mapDBAdminUserToAdminUser(row)
	}

	return &UsersListWithPagination{
		Data:       users,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (s *Service) UpdateUserStatus(ctx context.Context, userID uuid.UUID, isActive bool) (AdminUser, error) {
	row, err := s.userQ.UpdateUserStatus(ctx, user_db.UpdateUserStatusParams{
		ID:       userID,
		IsActive: isActive,
	})

	if err != nil {
		return AdminUser{}, translateDBError(err)
	}

	return mapDBUpdateUserStatusToAdminUser(row), nil
}
