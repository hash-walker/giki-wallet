package user

import (
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	userdb "github.com/hash-walker/giki-wallet/internal/user/user_db"
	"github.com/jackc/pgx/v5/pgtype"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	UserType     string    `json:"user_type"`
	AccessToken  string    `json:"access_token,omitempty"`
	RefreshToken string    `json:"refresh_token,omitempty"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
}

func mapDBUserToUser(u userdb.GikiWalletUser) User {
	return User{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		CreatedAt: u.CreatedAt,
	}
}

type Student struct {
	UserID        uuid.UUID   `json:"user_id"`
	RegID         string      `json:"reg_id"`
	DegreeProgram pgtype.Text `json:"degree_program"`
	BatchYear     pgtype.Int4 `json:"batch_year"`
}

type AuthPayload struct {
	AccessToken  string
	RefreshToken string
	ExpiresAt    time.Duration
}

// Mapper: DB -> Domain
func mapDBStudentToStudent(s userdb.GikiWalletStudentProfile) Student {
	return Student{
		UserID:        s.UserID,
		RegID:         s.RegID,
		DegreeProgram: s.DegreeProgram,
		BatchYear:     s.BatchYear,
	}
}

type Employee struct {
	UserID       uuid.UUID `json:"user_id"`
	EmployeeCode string    `json:"employee_code"`
	Designation  string    `json:"designation"`
	Department   string    `json:"department"`
}

func mapDBEmployeeToEmployee(e userdb.GikiWalletEmployeeProfile) Employee {
	return Employee{
		UserID:       e.UserID,
		EmployeeCode: e.EmployeeID,
		Designation:  common.TextToString(e.Designation),
		Department:   common.TextToString(e.Department),
	}
}

func DatabaseUserToUser(dbUser userdb.GikiWalletUser, payload interface{}) User {

	user := User{
		ID:       dbUser.ID,
		Email:    dbUser.Email,
		UserType: dbUser.UserType,
	}

	if auth, ok := payload.(AuthPayload); ok {
		user.AccessToken = auth.AccessToken
		user.RefreshToken = auth.RefreshToken
	}

	return user
}
