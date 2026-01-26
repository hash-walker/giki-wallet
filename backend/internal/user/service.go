package user

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"

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
	token, _ := generateBase64Token(64)
	var user user_db.GikiWalletUser

	err = common.WithTransaction(ctx, s.dbPool, func(tx pgx.Tx) error {
		userQ := s.userQ.WithTx(tx)

		var createErr error
		user, createErr = userQ.CreateUser(ctx, user_db.CreateUserParams{
			Name:         req.Name,
			Email:        req.Email,
			PhoneNumber:  req.PhoneNumber,
			PasswordAlgo: "BCRYPT",
			UserType:     req.UserType,
			PasswordHash: passwordHash,
		})

		if createErr != nil {
			// IMPORTANT: once a statement fails (e.g. unique constraint), the SQL transaction is aborted
			// and we MUST return immediately (any further queries will fail with "current transaction is aborted").
			return translateDBError(createErr)
		}

		return s.createRoleProfile(ctx, tx, user.ID, req)
	})

	if err != nil {
		return User{}, err
	}

	_ = s.enqueueAccountCreationJob(ctx, token, req)

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

	token := os.Getenv("TOKEN_SECRET")
	mac := hmac.New(sha256.New, []byte(token))
	mac.Write(b)
	hash := mac.Sum(nil)

	return strings.ToUpper(hex.EncodeToString(hash)), nil
}

func (s *Service) enqueueAccountCreationJob(ctx context.Context, token string, req RegisterRequest) error {
	var err error

	switch req.UserType {
	case "student":
		err = s.jobs.Enqueue(ctx, "SEND_STUDENT_VERIFY_EMAIL", StudentVerifyPayload{
			Email: req.Email,
			Name:  req.Name,
			Link:  fmt.Sprintf("https://giktransport.giki.edu.pk/verify?token=%s", token),
		})

	case "employee":
		err = s.jobs.Enqueue(ctx, "SEND_EMPLOYEE_WAIT_EMAIL", EmployeeWaitPayload{
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
