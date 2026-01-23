package transport

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

var (
	// Route Errors
	ErrRouteNotFound  = errors.New("ROUTE_NOT_FOUND", http.StatusNotFound, "Route not found")
	ErrInvalidRouteID = errors.New("INVALID_ROUTE_ID", http.StatusBadRequest, "Invalid route ID format")

	// Trip Errors
	ErrTripNotFound       = errors.New("TRIP_NOT_FOUND", http.StatusNotFound, "Trip not found")
	ErrTripCreationFailed = errors.New("TRIP_CREATION_FAILED", http.StatusInternalServerError, "Failed to create trip")
	ErrNoSeatsAvailable   = errors.New("NO_SEATS_AVAILABLE", http.StatusConflict, "No seats available")
)
