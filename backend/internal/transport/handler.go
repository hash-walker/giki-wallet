package transport

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
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
