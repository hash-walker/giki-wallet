package auth

import (
	"encoding/json"
	"net/http"
	"strings"

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

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	var params LoginParams

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

	res, err := h.service.Login(r.Context(), params)

	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	response := ToLoginResponse(*res)
	common.ResponseWithJSON(w, http.StatusOK, response)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	// Stateless logout for Bearer-token auth; client just deletes token.
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userID, ok := GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	u, err := h.service.GetUserByID(r.Context(), userID)

	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, ToLoginResponse(LoginResult{User: u}))
}

func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {

	requestID := middleware.GetRequestID(r.Context())

	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		middleware.HandleError(w, commonerrors.ErrMissingField.WithDetails("fields", "token"), requestID)
		return
	}

	res, err := h.service.VerifyEmailAndIssueTokens(r.Context(), token)

	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, ToLoginResponse(*res))
}
