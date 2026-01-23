package user

import (
	"encoding/json"
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
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
	requestID := middleware.GetRequestID(r.Context())

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
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	tx, err := h.service.dbPool.Begin(r.Context())
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrTransactionBegin, err), requestID)
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
		middleware.HandleError(w, err, requestID)
		return
	}

	switch params.UserType {

	case "student":

		if params.RegID == "" {
			middleware.HandleError(w, ErrMissingRegID, requestID)
			return
		}

		_, err = h.service.CreateStudent(r.Context(), tx, CreateStudentParams{
			UserID: user.ID,
			RegID:  params.RegID,
		})

	case "employee":
		_, err = h.service.CreateEmployee(r.Context(), tx, CreateEmployeeParams{UserID: user.ID})

	default:
		middleware.HandleError(w, ErrInvalidUserType.WithDetails("userType", params.UserType), requestID)
		return
	}

	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(ErrProfileCreationFailed, err), requestID)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrTransactionCommit, err), requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusCreated, user)
}
