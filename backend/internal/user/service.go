package user

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/user/user_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	hashPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return "", err
	}

	return string(hashPassword), nil
}

type Service struct {
	q      *user_db.Queries
	dbPool *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool) *Service {
	return &Service{
		q:      user_db.New(dbPool),
		dbPool: dbPool,
	}
}

func (s *Service) CreateUser(ctx context.Context, tx pgx.Tx, payload CreateUserParams) (User, error) {

	if !strings.HasSuffix(payload.Email, "@giki.edu.pk") {
		return User{}, errors.New("only GIKI students allows")
	}

	passwordHash, err := HashPassword(payload.Password)

	if err != nil {
		return User{}, err
	}

	qUser := s.q.WithTx(tx)

	user, err := qUser.CreateUser(ctx, user_db.CreateUserParams{
		Name:         payload.Name,
		Email:        payload.Email,
		PhoneNumber:  payload.PhoneNumber,
		PasswordAlgo: "BCRYPT",
		UserType:     payload.UserType,
		PasswordHash: passwordHash,
	})

	if err != nil {
		return User{}, errors.New(fmt.Sprintf("error creating user in database %v", err))
	}

	return mapDBUserToUser(user), nil
}

func (s *Service) CreateStudent(ctx context.Context, tx pgx.Tx, payload CreateStudentParams) (Student, error) {
	qtx := s.q.WithTx(tx)

	batchYear := payload.RegID[0:4]
	num, _ := strconv.Atoi(batchYear)

	studentRow, err := qtx.CreateStudent(ctx, user_db.CreateStudentParams{
		UserID:    payload.UserID,
		RegID:     payload.RegID,
		BatchYear: common.IntToInt4(num),
	})

	if err != nil {
		return Student{}, errors.New("error creating user in database")
	}

	return mapDBStudentToStudent(studentRow), nil
}

func (s *Service) CreateEmployee(ctx context.Context, tx pgx.Tx, payload CreateEmployeeParams) (Employee, error) {
	qtx := s.q.WithTx(tx)

	employeeRow, err := qtx.CreateEmployee(ctx, user_db.CreateEmployeeParams{
		UserID: payload.UserID,
	})

	if err != nil {
		return Employee{}, errors.New("error creating user in database")
	}

	return mapDBEmployeeToEmployee(employeeRow), nil
}
