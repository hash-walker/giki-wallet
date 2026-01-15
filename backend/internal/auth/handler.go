package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common"
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

	type parameters struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var params parameters

	if r.Body == nil {
		common.ResponseWithError(w, http.StatusBadRequest, "Request body is required")
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		common.ResponseWithError(w, http.StatusBadRequest, fmt.Sprintf("Invalid JSON: %v", err))
		return
	}

	if params.Email == "" || params.Password == "" {
		common.ResponseWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// start a transaction

	tx, err := h.service.dbPool.Begin(r.Context())

	if err != nil {
		fmt.Printf("DATABASE ERROR: %v\n", err)
		common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	defer tx.Rollback(r.Context())

	res, err := h.service.AuthenticateAndIssueTokens(r.Context(), tx, params.Email, params.Password)

	if err != nil {
		switch {
		case errors.Is(err, ErrUserNotFound):
			common.ResponseWithError(w, http.StatusUnauthorized, "User not found")
			return
		case errors.Is(err, ErrInvalidPassword):
			common.ResponseWithError(w, http.StatusUnauthorized, "Invalid email or password")
			return
		case errors.Is(err, ErrUserInactive):
			common.ResponseWithError(w, http.StatusForbidden, "Account is inactive")
			return
		default:
			// Database or other internal errors
			common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
			return
		}
	}

	// commit transaction
	err = tx.Commit(r.Context())

	if err != nil {
		common.ResponseWithError(w, http.StatusInternalServerError, "Internal Server Error")
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
