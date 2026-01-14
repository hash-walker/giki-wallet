package user

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {

	type parameters struct {
		Name        string `json:"name"`
		Email       string `json:"email"`
		UserType    string `json:"user_type"`
		RegID       string `json:"reg_id"`
		Password    string `json:"password"`
		PhoneNumber string `json:"phone_number"`
	}

	var params parameters
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		common.ResponseWithJSON(w, http.StatusInternalServerError, common.ErrorResponse{Error: "Something went wrong"})
		return
	}

	tx, err := h.service.dbPool.Begin(r.Context())

	if err != nil {
		fmt.Printf("DATABASE ERROR: %v\n", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}
	defer tx.Rollback(r.Context())

	user, err := h.service.CreateUser(r.Context(), tx, CreateUserParams{
		Name:        params.Name,
		Email:       params.Email,
		UserType:    params.UserType,
		Password:    params.Password,
		PhoneNumber: params.PhoneNumber,
	})

	if err != nil {
		common.ResponseWithJSON(w, http.StatusBadRequest, common.ErrorResponse{Error: err.Error()})
		return
	}

	switch params.UserType {

	case "student":

		if params.RegID == "" {
			common.ResponseWithError(w, http.StatusBadRequest, "Registration number required")
			return
		}

		_, err = h.service.CreateStudent(r.Context(), tx, CreateStudentParams{
			UserID: user.ID,
			RegID:  params.RegID,
		})

	case "employee":
		_, err = h.service.CreateEmployee(r.Context(), tx, CreateEmployeeParams{UserID: user.ID})

	default:
		common.ResponseWithError(w, http.StatusInternalServerError, "Failed to create user profile")
		return
	}

	if err != nil {
		common.ResponseWithError(w, http.StatusInternalServerError, "Failed to create user profile")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		common.ResponseWithError(w, http.StatusInternalServerError, "Commit Failed")
		return
	}

	common.ResponseWithJSON(w, http.StatusCreated, user)
}
