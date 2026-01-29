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
	DepartureTime   time.Time         `json:"departure_time"`
	BookingOpensAt  time.Time         `json:"booking_opens_at"`
	BookingClosesAt time.Time         `json:"booking_closes_at"`
	TotalCapacity   int               `json:"total_capacity"`
	BasePrice       float64           `json:"base_price"`
	BusType         string            `json:"bus_type"`
	Direction       string            `json:"direction"`
	Stops           []TripStopRequest `json:"stops"`
}

type TripStopRequest struct {
	StopID uuid.UUID `json:"stop_id"`
}

type CreateTripResponse struct {
	TripID uuid.UUID `json:"trip_id"`
}

type TripResponse struct {
	TripID        uuid.UUID `json:"trip_id"`
	RouteName     string    `json:"route_name"`
	DepartureTime time.Time `json:"departure_time"`

	BookingStatus string `json:"booking_status"`

	OpensAt        time.Time `json:"opens_at"`
	AvailableSeats int       `json:"available_seats"`
	Price          float64   `json:"price"`
	BusType        string    `json:"bus_type"`
	Direction      string    `json:"direction"`

	Stops []TripStopItem `json:"stops"`
}

type WeeklyTripSummary struct {
	Scheduled int              `json:"scheduled"`
	Opened    int              `json:"opened"`
	Pending   int              `json:"pending"`
	Trips     []TripSummaryRow `json:"trips"`
}

type TripSummaryRow struct {
	TripID         uuid.UUID `json:"trip_id"`
	RouteName      string    `json:"route_name"`
	DepartureTime  time.Time `json:"departure_time"`
	AvailableSeats int       `json:"available_seats"`
	TotalCapacity  int       `json:"total_capacity"`
	BookingStatus  string    `json:"booking_status"`
	BusType        string    `json:"bus_type"`
}

type TripStopItem struct {
	StopID   uuid.UUID `json:"stop_id"`
	StopName string    `json:"stop_name"`
	Sequence int32     `json:"sequence"`
}

// --- Requests ---

// Legacy single hold (kept for backward compatibility)
type HoldTicketRequest struct {
	TripID        uuid.UUID `json:"trip_id"`
	PickupStopID  uuid.UUID `json:"pickup_stop_id"`
	DropoffStopID uuid.UUID `json:"dropoff_stop_id"`
}

// Batch hold request (new flow)
type HoldSeatsRequest struct {
	TripID        uuid.UUID `json:"trip_id"`
	Count         int       `json:"count"` // Number of seats to hold
	PickupStopID  uuid.UUID `json:"pickup_stop_id"`
	DropoffStopID uuid.UUID `json:"dropoff_stop_id"`
}

// Batch confirm request
type ConfirmBatchRequest struct {
	Confirmations []ConfirmItem `json:"confirmations"`
}

// Individual confirmation item with passenger details
type ConfirmItem struct {
	HoldID            uuid.UUID `json:"hold_id"`
	PassengerName     string    `json:"passenger_name"`
	PassengerRelation string    `json:"passenger_relation"` // SELF, SPOUSE, CHILD
}

// --- Responses ---

type HoldTicketResponse struct {
	HoldID    uuid.UUID `json:"hold_id"` // Frontend stores this to Confirm later
	ExpiresAt time.Time `json:"expires_at"`
}

// Batch hold response
type HoldSeatsResponse struct {
	Holds []HoldTicketResponse `json:"holds"`
}

type BookTicketResponse struct {
	TicketID uuid.UUID `json:"ticket_id"`
	Status   string    `json:"status"`
}

// Batch confirm response
type ConfirmBatchResponse struct {
	Tickets []BookTicketResponse `json:"tickets"`
}

type QuotaResponse struct {
	Outbound QuotaUsage `json:"outbound"`
	Inbound  QuotaUsage `json:"inbound"`
}

type QuotaUsage struct {
	Limit     int `json:"limit"`
	Used      int `json:"used"`
	Remaining int `json:"remaining"`
}

type ActiveHoldResponse struct {
	ID        uuid.UUID `json:"id"`
	TripID    uuid.UUID `json:"trip_id"`
	ExpiresAt time.Time `json:"expires_at"`
	Direction string    `json:"direction"`
	RouteName string    `json:"route_name"`
}

type MyTicketResponse struct {
	ID                uuid.UUID `json:"id"`
	TicketCode        string    `json:"ticket_number"`
	SerialNo          int       `json:"serial_no"`
	RouteName         string    `json:"route_name"`
	Direction         string    `json:"direction"`
	PickupLocation    string    `json:"pickup_location"`
	DropoffLocation   string    `json:"dropoff_location"`
	Date              string    `json:"date"`
	Time              string    `json:"time"`
	Status            string    `json:"status"`
	BusType           string    `json:"bus_type"`
	PassengerName     string    `json:"passenger_name"`
	PassengerRelation string    `json:"passenger_relation"`
	IsSelf            bool      `json:"is_self"`
	Price             float64   `json:"price"`
	CanCancel         bool      `json:"can_cancel"`
}

func mapDBRouteTemplateToRouteTemplate(rows []transport_db.GetRouteStopsDetailsRow, weeklyScheduleRows []transport_db.GikiTransportRouteWeeklySchedule) *RouteTemplateResponse {
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

func MapDBTripsToTrips(rows []transport_db.GetUpcomingTripsByRouteRow) []TripResponse {

	tripMap := make(map[uuid.UUID]*TripResponse)
	var orderedIDs []uuid.UUID

	for _, row := range rows {
		if _, exists := tripMap[row.TripID]; !exists {

			apiStatus := "OPEN" // Default to Auto-Pilot
			now := time.Now()

			physicalStatus := common.TextToString(row.Status)

			if physicalStatus == "CANCELLED" {
				apiStatus = "CANCELLED"
			} else if row.BookingStatus == "LOCKED" || row.BookingStatus == "CLOSED" {
				apiStatus = "CLOSED"
			} else {
				if row.AvailableSeats <= 0 {
					apiStatus = "FULL"
				} else if now.Before(row.BookingOpensAt) {
					apiStatus = "SCHEDULED"
				} else if now.After(row.BookingClosesAt) {
					apiStatus = "CLOSED"
				} else {
					apiStatus = "OPEN"
				}
			}

			trip := &TripResponse{
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
	result := make([]TripResponse, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		result = append(result, *tripMap[id])
	}

	return result
}

func MapDBAllTripsToTrips(rows []transport_db.GetAllUpcomingTripsRow) []TripResponse {

	tripMap := make(map[uuid.UUID]*TripResponse)
	var orderedIDs []uuid.UUID

	for _, row := range rows {
		if _, exists := tripMap[row.TripID]; !exists {

			apiStatus := "OPEN" // Default to Auto-Pilot
			now := time.Now()

			physicalStatus := common.TextToString(row.Status)

			if physicalStatus == "CANCELLED" {
				apiStatus = "CANCELLED"
			} else if row.BookingStatus == "LOCKED" || row.BookingStatus == "CLOSED" {
				apiStatus = "CLOSED"
			} else {
				if row.AvailableSeats <= 0 {
					apiStatus = "FULL"
				} else if now.Before(row.BookingOpensAt) {
					apiStatus = "SCHEDULED"
				} else if now.After(row.BookingClosesAt) {
					apiStatus = "CLOSED"
				} else {
					apiStatus = "OPEN"
				}
			}

			trip := &TripResponse{
				TripID:         row.TripID,
				RouteName:      row.RouteName,
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
	result := make([]TripResponse, 0, len(orderedIDs))
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

func MapDBTicketsToTickets(rows []transport_db.GetUserTicketsByIDRow) []MyTicketResponse {

	var tickets []MyTicketResponse

	for _, row := range rows {

		canCancel := row.Status == "CONFIRMED" && time.Now().Before(row.BookingClosesAt)

		tickets = append(tickets, MyTicketResponse{
			ID:                row.ID,
			TicketCode:        row.TicketCode,
			SerialNo:          int(row.SerialNo),
			RouteName:         row.Name,
			Direction:         row.Direction,
			PickupLocation:    row.Address,
			DropoffLocation:   row.Address_2,
			Date:              row.DepartureTime.Format("2006-01-02"),
			Time:              row.DepartureTime.Format("3:04 PM"),
			Status:            row.Status,
			BusType:           row.BusType, // Hardcoded for now
			PassengerName:     row.PassengerName,
			PassengerRelation: row.PassengerRelation,
			IsSelf:            row.PassengerRelation == "SELF",
			Price:             common.NumericToFloat64(row.BasePrice),
			CanCancel:         canCancel,
		})

	}

	return tickets
}

func MapDBAdminTripsToTrips(rows []transport_db.AdminGetAllTripsRow) []TripResponse {

	tripMap := make(map[uuid.UUID]*TripResponse)
	var orderedIDs []uuid.UUID

	for _, row := range rows {
		if _, exists := tripMap[row.TripID]; !exists {

			apiStatus := "OPEN" // Default to Auto-Pilot
			now := time.Now()

			physicalStatus := common.TextToString(row.Status)

			if physicalStatus == "CANCELLED" {
				apiStatus = "CANCELLED"
			} else if row.BookingStatus == "LOCKED" || row.BookingStatus == "CLOSED" {
				apiStatus = "CLOSED"
			} else {
				if row.AvailableSeats <= 0 {
					apiStatus = "FULL"
				} else if now.Before(row.BookingOpensAt) {
					apiStatus = "SCHEDULED"
				} else if now.After(row.BookingClosesAt) {
					apiStatus = "CLOSED"
				} else {
					apiStatus = "OPEN"
				}
			}

			trip := &TripResponse{
				TripID:         row.TripID,
				RouteName:      row.RouteName,
				DepartureTime:  row.DepartureTime,
				BookingStatus:  apiStatus,
				OpensAt:        row.BookingOpensAt,
				AvailableSeats: int(row.AvailableSeats),
				Price:          common.NumericToFloat64(row.BasePrice),
				BusType:        row.BusType,
				Direction:      row.Direction,
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
	result := make([]TripResponse, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		result = append(result, *tripMap[id])
	}

	return result
}
