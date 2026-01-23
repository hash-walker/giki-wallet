package auth

import (
	"encoding/json"
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	"github.com/hash-walker/giki-wallet/internal/user"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	type parameters struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var params parameters

	if r.Body == nil {
		middleware.HandleError(w, commonerrors.ErrMissingRequestBody, requestID)
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	if params.Email == "" || params.Password == "" {
		middleware.HandleError(w, commonerrors.ErrMissingField.WithDetails("fields", "email, password"), requestID)
		return
	}

	// Start a transaction
	tx, err := h.service.dbPool.Begin(r.Context())
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrTransactionBegin, err), requestID)
		return
	}
	defer tx.Rollback(r.Context())

	res, err := h.service.AuthenticateAndIssueTokens(r.Context(), tx, params.Email, params.Password)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	// Commit transaction
	err = tx.Commit(r.Context())
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrTransactionCommit, err), requestID)
		return
	}

	// Convert TokenPairs to AuthPayload for DatabaseUserToUser
	authPayload := user.AuthPayload{
		AccessToken:  res.Tokens.AccessToken,
		RefreshToken: res.Tokens.RefreshToken,
		ExpiresAt:    res.Tokens.ExpiresAt,
	}

	responseUser := user.DatabaseUserToUser(res.User, authPayload)
	common.ResponseWithJSON(w, http.StatusOK, responseUser)
}
