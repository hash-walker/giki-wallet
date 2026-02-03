package user

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/audit"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
)

type Handler struct {
	service *Service
	audit   *audit.Service
}

func NewHandler(service *Service, audit *audit.Service) *Handler {
	return &Handler{
		service: service,
		audit:   audit,
	}
}

func (h *Handler) HandlerRegister(w http.ResponseWriter, r *http.Request) {

	requestID := middleware.GetRequestID(r.Context())

	var params RegisterRequest

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

	user, err := h.service.CreateUser(r.Context(), params)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusCreated, user, requestID)
}

func (h *Handler) HandlerListUsers(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	pageStr := r.URL.Query().Get("page")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSizeStr := r.URL.Query().Get("page_size")
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 20
	}

	search := r.URL.Query().Get("search")
	userType := r.URL.Query().Get("user_type")
	// Convert "EMPLOYEE" -> "EMPLOYEE", "active"/"inactive" -> "" (handled by filter_status)
	// Actually user_type filter might expect "STUDENT" or "EMPLOYEE"

	filterStatus := r.URL.Query().Get("filter_status")

	users, err := h.service.ListUsers(r.Context(), page, pageSize, search, userType, filterStatus)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, users, requestID)
}

func (h *Handler) HandlerUpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidUUID, err), requestID)
		return
	}

	var params struct {
		IsActive bool `json:"is_active"`
	}

	if err = json.NewDecoder(r.Body).Decode(&params); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	user, err := h.service.UpdateUserStatus(r.Context(), userID, params.IsActive)

	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, user, requestID)
}

func (h *Handler) HandlerApproveEmployee(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidUUID, err), requestID)
		return
	}

	user, err := h.service.ApproveEmployee(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, user, requestID)
}

func (h *Handler) HandlerRejectEmployee(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidUUID, err), requestID)
		return
	}

	err = h.service.RejectEmployee(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, nil, requestID)
}

func (h *Handler) HandlerAdminCreateUser(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	var params RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	if params.Email == "" || params.Name == "" || params.UserType == "" {
		middleware.HandleError(w, commonerrors.ErrMissingField.WithDetails("fields", "email, name, user_type"), requestID)
		return
	}

	user, err := h.service.AdminCreateUser(r.Context(), params)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	h.logAdminAction(r.Context(), r, audit.ActionAdminCreateUser, &user.ID, map[string]any{"email": user.Email, "role": user.UserType})

	common.ResponseWithJSON(w, http.StatusCreated, user, requestID)
}

func (h *Handler) HandlerUpdateUser(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidUUID, err), requestID)
		return
	}

	var params RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	user, err := h.service.UpdateUser(r.Context(), userID, params)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	h.logAdminAction(r.Context(), r, audit.ActionAdminUpdateUser, &user.ID, map[string]any{"changes": "profile_update"})

	common.ResponseWithJSON(w, http.StatusOK, user, requestID)
}

func (h *Handler) HandlerDeleteUser(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	userIDStr := chi.URLParam(r, "user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidUUID, err), requestID)
		return
	}

	err = h.service.DeleteUser(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	h.logAdminAction(r.Context(), r, audit.ActionAdminDeleteUser, &userID, nil)

	common.ResponseWithJSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"}, requestID)
}

// logAdminAction is a helper to centralize audit logging
func (h *Handler) logAdminAction(ctx context.Context, r *http.Request, action string, targetID *uuid.UUID, details map[string]interface{}) {
	ip := common.GetClientIP(r)
	userAgent := r.UserAgent()
	actorID, _ := auth.GetUserIDFromContext(ctx)

	_ = h.audit.LogSecurityEvent(ctx, audit.Event{
		ActorID:   &actorID,
		Action:    action,
		TargetID:  targetID,
		IPAddress: ip,
		UserAgent: userAgent,
		Status:    audit.StatusSuccess,
		Details:   details,
	})
}
