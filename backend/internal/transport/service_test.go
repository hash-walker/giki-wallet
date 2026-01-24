package transport

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/transport/transport_db"
)

// =============================================================================
// UNIT TESTS - Model Mappers
// =============================================================================

func TestMapDBRouteToRoute(t *testing.T) {
	routeID := uuid.New()
	row := transport_db.GetAllRoutesRow{
		ID:   routeID,
		Name: "Test Route",
	}

	result := mapDBRouteToRoute(row)

	if result.RouteID != routeID {
		t.Errorf("RouteID mismatch: got %s, want %s", result.RouteID, routeID)
	}

	if result.RouteName != "Test Route" {
		t.Errorf("RouteName mismatch: got %s, want Test Route", result.RouteName)
	}
}

func TestMapDBRouteTemplateToRouteTemplate(t *testing.T) {
	routeID := uuid.New()
	stopID1 := uuid.New()
	stopID2 := uuid.New()

	rows := []transport_db.GetRouteStopsDetailsRow{
		{
			RouteID:                        routeID,
			RouteName:                      "Test Route",
			DefaultBookingOpenOffsetHours:  common.IntToInt4(24),
			DefaultBookingCloseOffsetHours: common.IntToInt4(1),
			StopID:                         stopID1,
			StopName:                       "Stop 1",
			DefaultSequenceOrder:           1,
			IsDefaultActive:                true,
		},
		{
			RouteID:                        routeID,
			RouteName:                      "Test Route",
			DefaultBookingOpenOffsetHours:  common.IntToInt4(24),
			DefaultBookingCloseOffsetHours: common.IntToInt4(1),
			StopID:                         stopID2,
			StopName:                       "Stop 2",
			DefaultSequenceOrder:           2,
			IsDefaultActive:                true,
		},
	}

	weeklySchedule := []transport_db.GikiTransportRouteWeeklySchedule{}

	result := mapDBRouteTemplateToRouteTemplate(rows, weeklySchedule)

	if result == nil {
		t.Fatal("Result should not be nil")
	}

	if result.RouteID != routeID {
		t.Errorf("RouteID mismatch: got %s, want %s", result.RouteID, routeID)
	}

	if result.RouteName != "Test Route" {
		t.Errorf("RouteName mismatch: got %s, want Test Route", result.RouteName)
	}

	if result.Rules.OpenHoursBefore != 24 {
		t.Errorf("OpenHoursBefore mismatch: got %d, want 24", result.Rules.OpenHoursBefore)
	}

	if result.Rules.CloseHoursBefore != 1 {
		t.Errorf("CloseHoursBefore mismatch: got %d, want 1", result.Rules.CloseHoursBefore)
	}

	if len(result.Stops) != 2 {
		t.Errorf("Stops count mismatch: got %d, want 2", len(result.Stops))
	}

	if result.Stops[0].StopID != stopID1 {
		t.Errorf("First stop ID mismatch: got %s, want %s", result.Stops[0].StopID, stopID1)
	}

	if result.Stops[0].Sequence != 1 {
		t.Errorf("First stop sequence mismatch: got %d, want 1", result.Stops[0].Sequence)
	}
}

func TestMapDBRouteTemplateToRouteTemplate_EmptyRows(t *testing.T) {
	rows := []transport_db.GetRouteStopsDetailsRow{}
	weeklySchedule := []transport_db.GikiTransportRouteWeeklySchedule{}

	result := mapDBRouteTemplateToRouteTemplate(rows, weeklySchedule)

	if result != nil {
		t.Error("Result should be nil for empty rows")
	}
}

func TestMapDBTripsToTrips(t *testing.T) {
	tripID := uuid.New()
	stopID1 := uuid.New()
	stopID2 := uuid.New()
	now := time.Now()
	departureTime := now.Add(24 * time.Hour)
	bookingOpensAt := now.Add(-1 * time.Hour)
	bookingClosesAt := now.Add(23 * time.Hour)

	rows := []transport_db.GetUpcomingTripsByRouteRow{
		{
			TripID:          tripID,
			DepartureTime:   departureTime,
			BookingOpensAt:  bookingOpensAt,
			BookingClosesAt: bookingClosesAt,
			TotalCapacity:   10,
			AvailableSeats:  5,
			BasePrice:       common.Float64ToNumeric(500.0),
			Status:          common.StringToText("SCHEDULED"),
			BookingStatus:   "OPEN",
			StopID:          stopID1,
			StopName:        "Stop 1",
			SequenceOrder:   1,
		},
		{
			TripID:          tripID,
			DepartureTime:   departureTime,
			BookingOpensAt:  bookingOpensAt,
			BookingClosesAt: bookingClosesAt,
			TotalCapacity:   10,
			AvailableSeats:  5,
			BasePrice:       common.Float64ToNumeric(500.0),
			Status:          common.StringToText("SCHEDULED"),
			BookingStatus:   "OPEN",
			StopID:          stopID2,
			StopName:        "Stop 2",
			SequenceOrder:   2,
		},
	}

	result := MapDBTripsToTrips(rows)

	if len(result) != 1 {
		t.Fatalf("Expected 1 trip, got %d", len(result))
	}

	trip := result[0]

	if trip.TripID != tripID {
		t.Errorf("TripID mismatch: got %s, want %s", trip.TripID, tripID)
	}

	if trip.BookingStatus != "OPEN" {
		t.Errorf("BookingStatus mismatch: got %s, want OPEN", trip.BookingStatus)
	}

	if trip.AvailableSeats != 5 {
		t.Errorf("AvailableSeats mismatch: got %d, want 5", trip.AvailableSeats)
	}

	if trip.Price != 500.0 {
		t.Errorf("Price mismatch: got %f, want 500.0", trip.Price)
	}

	if len(trip.Stops) != 2 {
		t.Errorf("Stops count mismatch: got %d, want 2", len(trip.Stops))
	}

	if trip.Stops[0].StopID != stopID1 {
		t.Errorf("First stop ID mismatch: got %s, want %s", trip.Stops[0].StopID, stopID1)
	}

	if trip.Stops[1].Sequence != 2 {
		t.Errorf("Second stop sequence mismatch: got %d, want 2", trip.Stops[1].Sequence)
	}
}

func TestMapDBTripsToTrips_BookingStatusLogic(t *testing.T) {
	tests := []struct {
		name              string
		availableSeats    int32
		physicalStatus    string
		bookingStatus     string
		bookingOpensAt    time.Time
		bookingClosesAt   time.Time
		expectedAPIStatus string
	}{
		{
			name:              "Cancelled trip",
			availableSeats:    5,
			physicalStatus:    "CANCELLED",
			bookingStatus:     "OPEN",
			bookingOpensAt:    time.Now().Add(-1 * time.Hour),
			bookingClosesAt:   time.Now().Add(23 * time.Hour),
			expectedAPIStatus: "CANCELLED",
		},
		{
			name:              "Closed booking",
			availableSeats:    5,
			physicalStatus:    "SCHEDULED",
			bookingStatus:     "CLOSED",
			bookingOpensAt:    time.Now().Add(-1 * time.Hour),
			bookingClosesAt:   time.Now().Add(23 * time.Hour),
			expectedAPIStatus: "CLOSED",
		},
		{
			name:              "Full trip",
			availableSeats:    0,
			physicalStatus:    "SCHEDULED",
			bookingStatus:     "OPEN",
			bookingOpensAt:    time.Now().Add(-1 * time.Hour),
			bookingClosesAt:   time.Now().Add(23 * time.Hour),
			expectedAPIStatus: "FULL",
		},
		{
			name:              "Locked (not yet open)",
			availableSeats:    5,
			physicalStatus:    "SCHEDULED",
			bookingStatus:     "OPEN",
			bookingOpensAt:    time.Now().Add(1 * time.Hour),
			bookingClosesAt:   time.Now().Add(25 * time.Hour),
			expectedAPIStatus: "LOCKED",
		},
		{
			name:              "Closed (past closing time)",
			availableSeats:    5,
			physicalStatus:    "SCHEDULED",
			bookingStatus:     "OPEN",
			bookingOpensAt:    time.Now().Add(-25 * time.Hour),
			bookingClosesAt:   time.Now().Add(-1 * time.Hour),
			expectedAPIStatus: "CLOSED",
		},
		{
			name:              "Open",
			availableSeats:    5,
			physicalStatus:    "SCHEDULED",
			bookingStatus:     "OPEN",
			bookingOpensAt:    time.Now().Add(-1 * time.Hour),
			bookingClosesAt:   time.Now().Add(23 * time.Hour),
			expectedAPIStatus: "OPEN",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tripID := uuid.New()
			stopID := uuid.New()

			rows := []transport_db.GetUpcomingTripsByRouteRow{
				{
					TripID:          tripID,
					DepartureTime:   time.Now().Add(24 * time.Hour),
					BookingOpensAt:  tt.bookingOpensAt,
					BookingClosesAt: tt.bookingClosesAt,
					TotalCapacity:   10,
					AvailableSeats:  tt.availableSeats,
					BasePrice:       common.Float64ToNumeric(500.0),
					Status:          common.StringToText(tt.physicalStatus),
					BookingStatus:   tt.bookingStatus,
					StopID:          stopID,
					StopName:        "Stop 1",
					SequenceOrder:   1,
				},
			}

			result := MapDBTripsToTrips(rows)

			if len(result) != 1 {
				t.Fatalf("Expected 1 trip, got %d", len(result))
			}

			if result[0].BookingStatus != tt.expectedAPIStatus {
				t.Errorf("BookingStatus mismatch: got %s, want %s", result[0].BookingStatus, tt.expectedAPIStatus)
			}
		})
	}
}

func TestGetDayLabel(t *testing.T) {
	tests := []struct {
		dayOfWeek int32
		expected  string
	}{
		{1, "Monday"},
		{2, "Tuesday"},
		{3, "Wednesday"},
		{4, "Thursday"},
		{5, "Friday"},
		{6, "Saturday"},
		{7, "Sunday"},
		{0, "Unknown Day"},
		{8, "Unknown Day"},
		{-1, "Unknown Day"},
	}

	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			result := GetDayLabel(tt.dayOfWeek)
			if result != tt.expected {
				t.Errorf("GetDayLabel(%d) = %s, want %s", tt.dayOfWeek, result, tt.expected)
			}
		})
	}
}

// =============================================================================
// UNIT TESTS - Error Handling
// =============================================================================

func TestErrors_AreDefinedCorrectly(t *testing.T) {
	errors := []struct {
		err        *commonerrors.AppError
		name       string
		statusCode int
	}{
		{ErrRouteNotFound, "ROUTE_NOT_FOUND", 404},
		{ErrInvalidRouteID, "INVALID_ROUTE_ID", 400},
		{ErrTripNotFound, "TRIP_NOT_FOUND", 404},
		{ErrTripCreationFailed, "TRIP_CREATION_FAILED", 500},
		{ErrNoSeatsAvailable, "NO_SEATS_AVAILABLE", 409},
		{ErrTripFull, "TRIP_FULL", 409},
		{ErrHoldExpired, "HOLD_EXPIRED", 409},
		{ErrTicketNotFound, "TICKET_NOT_FOUND", 404},
		{ErrRefundFailed, "REFUND_FAILED", 500},
	}

	for _, tt := range errors {
		t.Run(tt.name, func(t *testing.T) {
			if tt.err.Code != tt.name {
				t.Errorf("Error code mismatch: got %s, want %s", tt.err.Code, tt.name)
			}

			if tt.err.StatusCode != tt.statusCode {
				t.Errorf("Status code mismatch: got %d, want %d", tt.err.StatusCode, tt.statusCode)
			}
		})
	}
}
