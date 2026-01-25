package transport

import (
	"encoding/json"
	"net/http"

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

func (h *Handler) HoldSeats(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	userRole, ok := r.Context().Value("user_type").(string)
	if !ok {
		userRole = "STUDENT" // Default fallback
	}

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

	common.ResponseWithJSON(w, http.StatusCreated, resp)
}

func (h *Handler) ConfirmBatch(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userID, ok := auth.GetUserIDFromContext(r.Context())
	if !ok {
		middleware.HandleError(w, commonerrors.ErrUnauthorized, requestID)
		return
	}

	userRole, ok := r.Context().Value("user_type").(string)
	if !ok {
		userRole = "STUDENT" // Default fallback
	}

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

	common.ResponseWithJSON(w, http.StatusOK, resp)
}

func (h *Handler) CancelTicket(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	userRole, ok := r.Context().Value("user_type").(string)
	if !ok {
		userRole = "STUDENT" // Default fallback
	}

	ticketIDParam := chi.URLParam(r, "ticket_id")
	ticketID, err := uuid.Parse(ticketIDParam)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, err).WithDetails("ticketID", ticketIDParam), requestID)
		return
	}

	if err := h.service.CancelTicket(r.Context(), ticketID, userRole); err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, map[string]string{"status": "CANCELLED"})
}

func (h *Handler) ReleaseHold(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	holdIDParam := chi.URLParam(r, "hold_id")
	holdID, err := uuid.Parse(holdIDParam)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(commonerrors.ErrInvalidInput, err).WithDetails("holdID", holdIDParam), requestID)
		return
	}

	// We don't really care if it fails (e.g. already expired), just return OK
	_ = h.service.ReleaseHold(r.Context(), holdID)

	common.ResponseWithJSON(w, http.StatusOK, map[string]string{"status": "RELEASED"})
}

func (h *Handler) ListRoutes(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	routes, err := h.service.RoutesList(r.Context())

	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, routes)
}

func (h *Handler) GetRouteTemplate(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	routeIDParam := chi.URLParam(r, "route_id")

	routeID, err := uuid.Parse(routeIDParam)
	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(ErrInvalidRouteID, err).WithDetails("routeID", routeIDParam), requestID)
		return
	}

	routeTemplate, err := h.service.GetRouteTemplate(r.Context(), routeID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, routeTemplate)
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

	response := CreateTripResponse{TripID: tripID}
	common.ResponseWithJSON(w, http.StatusCreated, response)
}

func (h *Handler) GetUpcomingTrips(w http.ResponseWriter, r *http.Request) {
	requestID := middleware.GetRequestID(r.Context())
	routeIDParam := chi.URLParam(r, "route_id")
	routeID, err := uuid.Parse(routeIDParam)

	if err != nil {
		middleware.HandleError(w, commonerrors.Wrap(ErrInvalidRouteID, err).WithDetails("routeID", routeIDParam), requestID)
		return
	}

	trips, err := h.service.GetUpcomingTrips(r.Context(), routeID)
	if err != nil {
		middleware.HandleError(w, err, requestID)
		return
	}

	common.ResponseWithJSON(w, http.StatusOK, trips)
}
