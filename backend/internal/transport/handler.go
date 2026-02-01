package transport

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/auth"
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

// =============================================================================
// TRIP & ROUTE ENDPOINTS
// =============================================================================

// HandleWeeklyTrips returns the "Dashboard" view: All trips for the week
func (h *Handler) HandleWeeklyTrips(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	trips, err := h.service.GetWeeklyTrips(r.Context())
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, trips, requestID)
}

func (h *Handler) CreateTrip(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	var req CreateTripRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	tripID, err := h.service.CreateTrip(r.Context(), req)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusCreated, CreateTripResponse{TripID: tripID}, requestID)
}

func (h *Handler) ListRoutes(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	routes, err := h.service.RoutesList(r.Context())
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, routes, requestID)
}

func (h *Handler) GetRouteTemplate(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	routeIDParam := chi.URLParam(r, "route_id")
	routeID, err := uuid.Parse(routeIDParam)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(ErrInvalidRouteID, err), requestID)
		return
	}

	template, err := h.service.GetRouteTemplate(r.Context(), routeID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, template, requestID)
}

func (h *Handler) DeleteTrip(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	tripIDParam := chi.URLParam(r, "trip_id")
	tripID, err := uuid.Parse(tripIDParam)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, err), requestID)
		return
	}

	err = h.service.DeleteTrip(r.Context(), tripID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"}, requestID)
}

func (h *Handler) AdminGetRevenueTransactions(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	txns, err := h.service.GetRevenueTransactions(r.Context())
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, txns, requestID)
}

// =============================================================================
// BOOKING & QUOTA ENDPOINTS
// =============================================================================

func (h *Handler) HoldSeats(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	userRole := getUserRoleForTransport(r)

	var req HoldSeatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	resp, err := h.service.HoldSeats(r.Context(), userID, userRole, req)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusCreated, resp, requestID)
}

func (h *Handler) ConfirmBatch(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	userRole := getUserRoleForTransport(r)

	var req ConfirmBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err), requestID)
		return
	}

	resp, err := h.service.ConfirmBatch(r.Context(), userID, userRole, req.Confirmations)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, resp, requestID)
}

func (h *Handler) GetQuota(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	userRole := getUserRoleForTransport(r)

	resp, err := h.service.GetUserQuota(r.Context(), userID, userRole)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, resp, requestID)
}

func (h *Handler) GetActiveHolds(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	resp, err := h.service.GetActiveHolds(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, resp, requestID)
}

func (h *Handler) ReleaseAllActiveHolds(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	err := h.service.ReleaseAllHolds(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, map[string]string{"status": "RELEASED"}, requestID)
}

func (h *Handler) CancelTicket(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())

	ticketIDParam := chi.URLParam(r, "ticket_id")
	ticketID, err := uuid.Parse(ticketIDParam)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, err), requestID)
		return
	}

	userRole := getUserRoleForTransport(r)

	if err := h.service.CancelTicketWithRole(r.Context(), ticketID, userRole); err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, map[string]string{"status": "CANCELLED"}, requestID)
}

func (h *Handler) GetUserTickets(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	tickets, err := h.service.GetUserTickets(r.Context(), userID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, tickets, requestID)
}

// =============================================================================
// HELPER
// =============================================================================

func getUserRoleForTransport(r *http.Request) string {
	role, ok := auth.GetUserRoleFromContext(r.Context())
	if !ok || strings.TrimSpace(role) == "" {
		return "STUDENT"
	}
	switch strings.ToLower(role) {
	case "student":
		return "STUDENT"
	case "employee":
		return "EMPLOYEE"
	default:
		return strings.ToUpper(role)
	}
}
