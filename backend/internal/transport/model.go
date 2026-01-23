package transport

import (
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/transport/transport_db"
	"github.com/hash-walker/giki-wallet/internal/types"
)

type Route struct {
	RouteID   uuid.UUID `json:"route_id"`
	RouteName string    `json:"route_name"`
}

type RouteTemplateResponse struct {
	RouteID    uuid.UUID       `json:"route_id"`
	RouteName  string          `json:"route_name"`
	Rules      RuleSet         `json:"rules"`
	Stops      []StopItem      `json:"stops"`
	QuickSlots []QuickSlotItem `json:"quick_slots"`
}

type RuleSet struct {
	OpenHoursBefore  int `json:"open_hours_before"`
	CloseHoursBefore int `json:"close_hours_before"`
}

type StopItem struct {
	StopID   uuid.UUID `json:"stop_id"`
	Name     string    `json:"name"`
	Sequence int32     `json:"sequence"`
	IsActive bool      `json:"is_active"`
}

type QuickSlotItem struct {
	SlotID        uuid.UUID       `json:"slot_id"`
	DayOfWeek     string          `json:"day_of_week"`
	DepartureTime types.LocalTime `json:"departure_time"`
}

type CreateTripRequest struct {
	RouteID         uuid.UUID         `json:"route_id"`
	DriverID        uuid.UUID         `json:"driver_id"`
	DepartureTime   time.Time         `json:"departure_time"`
	BookingOpensAt  time.Time         `json:"booking_opens_at"`
	BookingClosesAt time.Time         `json:"booking_closes_at"`
	TotalCapacity   int               `json:"total_capacity"`
	BasePrice       float64           `json:"base_price"`
	Stops           []TripStopRequest `json:"stops"`
}

type TripStopRequest struct {
	StopID uuid.UUID `json:"stop_id"`
}

type CreateTripResponse struct {
	TripID uuid.UUID `json:"trip_id"`
}

type StudentTripResponse struct {
	TripID        uuid.UUID `json:"trip_id"`
	DriverName    string    `json:"driver_name"`
	DepartureTime time.Time `json:"departure_time"`

	BookingStatus string `json:"booking_status"`

	OpensAt        time.Time `json:"opens_at"`
	AvailableSeats int       `json:"available_seats"`
	Price          float64   `json:"price"`

	Stops []TripStopItem `json:"stops"`
}

type TripStopItem struct {
	StopID   uuid.UUID `json:"stop_id"`
	StopName string    `json:"stop_name"`
	Sequence int32     `json:"sequence"`
}

func mapDBRouteTemplateToRouteTemplate(rows []transport_db.GetRouteStopsDetailsRow, weeklyScheduleRows []transport_db.GetRouteWeeklyScheduleRow) *RouteTemplateResponse {
	if len(rows) == 0 {
		return nil
	}

	firstRow := rows[0]

	response := &RouteTemplateResponse{
		RouteID:   firstRow.RouteID,
		RouteName: firstRow.RouteName,
		Rules: RuleSet{
			OpenHoursBefore:  common.Int4ToInt(firstRow.DefaultBookingOpenOffsetHours),
			CloseHoursBefore: common.Int4ToInt(firstRow.DefaultBookingCloseOffsetHours),
		},
		Stops:      make([]StopItem, 0, len(rows)),
		QuickSlots: make([]QuickSlotItem, 0, len(rows)),
	}

	for _, row := range rows {
		stop := StopItem{
			StopID:   row.StopID,
			Name:     row.StopName,
			Sequence: row.DefaultSequenceOrder,
			IsActive: row.IsDefaultActive,
		}
		response.Stops = append(response.Stops, stop)
	}

	for _, row := range weeklyScheduleRows {
		slot := QuickSlotItem{
			SlotID:        row.ID,
			DayOfWeek:     GetDayLabel(row.DayOfWeek),
			DepartureTime: types.LocalTime{Time: row.DepartureTime},
		}

		response.QuickSlots = append(response.QuickSlots, slot)
	}

	return response
}

func mapDBRouteToRoute(row transport_db.GetAllRoutesRow) Route {
	return Route{
		RouteID:   row.ID,
		RouteName: row.Name,
	}
}

func MapDBTripsToStudentTrips(rows []transport_db.GetUpcomingTripsByRouteRow) []StudentTripResponse {

	tripMap := make(map[uuid.UUID]*StudentTripResponse)
	var orderedIDs []uuid.UUID

	for _, row := range rows {
		if _, exists := tripMap[row.TripID]; !exists {

			apiStatus := "OPEN" // Default to Auto-Pilot
			now := time.Now()

			physicalStatus := common.TextToString(row.Status)

			if physicalStatus == "CANCELLED" {
				apiStatus = "CANCELLED"
			} else if row.BookingStatus == "CLOSED" {
				apiStatus = "CLOSED"
			} else {
				if row.AvailableSeats <= 0 {
					apiStatus = "FULL"
				} else if now.Before(row.BookingOpensAt) {
					apiStatus = "LOCKED"
				} else if now.After(row.BookingClosesAt) {
					apiStatus = "CLOSED"
				} else {
					apiStatus = "OPEN"
				}
			}

			trip := &StudentTripResponse{
				TripID:         row.TripID,
				DepartureTime:  row.DepartureTime,
				BookingStatus:  apiStatus,
				OpensAt:        row.BookingOpensAt,
				AvailableSeats: int(row.AvailableSeats),
				Price:          common.NumericToFloat64(row.BasePrice),
				Stops:          make([]TripStopItem, 0),
			}

			tripMap[row.TripID] = trip
			orderedIDs = append(orderedIDs, row.TripID)
		}
		
		tripMap[row.TripID].Stops = append(tripMap[row.TripID].Stops, TripStopItem{
			StopID:   row.StopID,
			StopName: row.StopName,
			Sequence: row.SequenceOrder,
		})
	}

	// Convert Map back to Slice using the ordered ID list
	result := make([]StudentTripResponse, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		result = append(result, *tripMap[id])
	}

	return result
}

func GetDayLabel(dayOfWeek int32) string {
	switch dayOfWeek {
	case 1:
		return "Monday"
	case 2:
		return "Tuesday"
	case 3:
		return "Wednesday"
	case 4:
		return "Thursday"
	case 5:
		return "Friday"
	case 6:
		return "Saturday"
	case 7:
		return "Sunday"
	default:
		return "Unknown Day"
	}
}
