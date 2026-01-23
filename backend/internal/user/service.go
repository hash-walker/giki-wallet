package user

import (
	"context"
	"strconv"
	"strings"

	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/user/user_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	userQ  *user_db.Queries
	dbPool *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool) *Service {
	return &Service{
		userQ:  user_db.New(dbPool),
		dbPool: dbPool,
	}
}

func (s *Service) CreateUser(ctx context.Context, tx pgx.Tx, payload CreateUserParams) (User, error) {

	if !strings.HasSuffix(payload.Email, "@giki.edu.pk") {
		return User{}, ErrEmailRestricted
	}

	passwordHash, err := HashPassword(payload.Password)
	if err != nil {
		return User{}, commonerrors.Wrap(ErrUserCreationFailed, err)
	}

	userQ := s.userQ.WithTx(tx)

	user, err := userQ.CreateUser(ctx, user_db.CreateUserParams{
		Name:         payload.Name,
		Email:        payload.Email,
		PhoneNumber:  payload.PhoneNumber,
		PasswordAlgo: "BCRYPT",
		UserType:     payload.UserType,
		PasswordHash: passwordHash,
	})

	if err != nil {
		return User{}, commonerrors.Wrap(ErrUserCreationFailed, err)
	}

	return mapDBUserToUser(user), nil
}

func (s *Service) CreateStudent(ctx context.Context, tx pgx.Tx, payload CreateStudentParams) (Student, error) {
	userQ := s.userQ.WithTx(tx)

	batchYear := payload.RegID[0:4]
	num, _ := strconv.Atoi(batchYear)

	studentRow, err := userQ.CreateStudent(ctx, user_db.CreateStudentParams{
		UserID:    payload.UserID,
		RegID:     payload.RegID,
		BatchYear: common.IntToInt4(num),
	})

	if err != nil {
		return Student{}, commonerrors.Wrap(ErrProfileCreationFailed, err)
	}

	return mapDBStudentToStudent(studentRow), nil
}

func (s *Service) CreateEmployee(ctx context.Context, tx pgx.Tx, payload CreateEmployeeParams) (Employee, error) {
	userQ := s.userQ.WithTx(tx)

	employeeRow, err := userQ.CreateEmployee(ctx, user_db.CreateEmployeeParams{
		UserID: payload.UserID,
	})

	if err != nil {
		return Employee{}, commonerrors.Wrap(ErrProfileCreationFailed, err)
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
