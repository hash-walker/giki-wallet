package transport

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/transport/transport_db"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q      *transport_db.Queries
	wallet *wallet.Service
	dbPool *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool, walletService *wallet.Service) *Service {
	return &Service{
		q:      transport_db.New(dbPool),
		wallet: walletService,
		dbPool: dbPool,
	}
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

// HoldSeats locks N seats atomically with quota checking
func (s *Service) HoldSeats(ctx context.Context, userID uuid.UUID, userRole string, req HoldSeatsRequest) (*HoldSeatsResponse, error) {

	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	// 1. Get trip details
	trip, err := qtx.GetTrip(ctx, req.TripID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTripNotFound
		}
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// 2. Check quota
	rule, err := qtx.GetQuotaRule(ctx, transport_db.GetQuotaRuleParams{
		UserRole:  userRole,
		Direction: trip.Direction,
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, commonerrors.New("NO_POLICY", 500, "No quota policy found for user role")
		}
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// 3. Get current usage
	usage, err := qtx.GetWeeklyTicketCountByDirection(ctx, transport_db.GetWeeklyTicketCountByDirectionParams{
		UserID:    userID,
		Direction: trip.Direction,
	})

	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// 4. Validate quota
	if (usage + int64(req.Count)) > int64(rule.WeeklyLimit) {
		return nil, commonerrors.New("QUOTA_EXCEEDED", 403, "Weekly booking quota exceeded")
	}

	// 5. Loop and lock seats
	var holds []HoldTicketResponse
	expiry := time.Now().Add(5 * time.Minute)

	for i := 0; i < req.Count; i++ {
		// Atomic decrement
		_, err := qtx.DecreaseTripSeat(ctx, req.TripID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrTripFull
			}
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		// Create blank hold
		hold, err := qtx.CreateBlankHold(ctx, transport_db.CreateBlankHoldParams{
			TripID:        req.TripID,
			UserID:        userID,
			PickupStopID:  req.PickupStopID,
			DropoffStopID: req.DropoffStopID,
			ExpiresAt:     expiry,
		})

		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		holds = append(holds, HoldTicketResponse{
			HoldID:    hold.ID,
			ExpiresAt: expiry,
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return &HoldSeatsResponse{Holds: holds}, nil
}

func (s *Service) GetUserQuota(ctx context.Context, userID uuid.UUID, userRole string) (*QuotaResponse, error) {
	// Directions to check
	directions := []string{"OUTBOUND", "INBOUND"}
	resp := &QuotaResponse{}

	for _, dir := range directions {
		// 1. Get rule
		rule, err := s.q.GetQuotaRule(ctx, transport_db.GetQuotaRuleParams{
			UserRole:  userRole,
			Direction: dir,
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				continue // Skip if no policy for this direction
			}
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		// 2. Get usage
		usage, err := s.q.GetWeeklyTicketCountByDirection(ctx, transport_db.GetWeeklyTicketCountByDirectionParams{
			UserID:    userID,
			Direction: dir,
		})
		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		quotaUsage := QuotaUsage{
			Limit:     int(rule.WeeklyLimit),
			Used:      int(usage),
			Remaining: int(rule.WeeklyLimit) - int(usage),
		}

		if dir == "OUTBOUND" {
			resp.Outbound = quotaUsage
		} else {
			resp.Inbound = quotaUsage
		}
	}

	return resp, nil
}

func (s *Service) GetActiveHolds(ctx context.Context, userID uuid.UUID) ([]ActiveHoldResponse, error) {
	rows, err := s.q.GetActiveHoldsByUserID(ctx, userID)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	resp := make([]ActiveHoldResponse, 0, len(rows))
	for _, row := range rows {
		resp = append(resp, ActiveHoldResponse{
			ID:        row.ID,
			TripID:    row.TripID,
			ExpiresAt: row.ExpiresAt,
			Direction: row.Direction,
			RouteName: row.RouteName,
		})
	}

	return resp, nil
}

func (s *Service) ReleaseAllHolds(ctx context.Context, userID uuid.UUID) error {
	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	tripIDs, err := qtx.DeleteAllActiveHoldsByUserID(ctx, userID)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	for _, tripID := range tripIDs {
		if err := qtx.IncrementTripSeat(ctx, tripID); err != nil {
			return commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}
	}

	return tx.Commit(ctx)
}

// ConfirmBatch finalizes multiple holds with passenger details and wallet deduction
func (s *Service) ConfirmBatch(ctx context.Context, userID uuid.UUID, userRole string, items []ConfirmItem) (*ConfirmBatchResponse, error) {

	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	var tickets []BookTicketResponse
	var totalPrice float64

	for _, item := range items {
		// 1. Get hold
		hold, err := qtx.GetHold(ctx, item.HoldID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrHoldExpired
			}
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		// 2. Check expiry
		if time.Now().After(hold.ExpiresAt) {
			return nil, ErrHoldExpired
		}

		// 3. Validate passenger name
		if item.PassengerName == "" {
			return nil, commonerrors.New("INVALID_PASSENGER_NAME", 400, "Passenger name is required")
		}

		// 4. Get trip price
		basePrice, err := qtx.GetTripPrice(ctx, hold.TripID)
		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		price := common.NumericToFloat64(basePrice)
		totalPrice += price

		maxRetries := 5
		var ticketID uuid.UUID
		for i := 0; i < maxRetries; i++ {
			code := GenerateRandomCode()

			ticketID, err = qtx.ConfirmBookingWithDetails(ctx, transport_db.ConfirmBookingWithDetailsParams{
				TripID:            hold.TripID,
				UserID:            userID,
				TicketCode:        code,
				PickupStopID:      hold.PickupStopID,
				DropoffStopID:     hold.DropoffStopID,
				PassengerName:     item.PassengerName,
				PassengerRelation: item.PassengerRelation,
			})

			if err == nil {
				break
			}

		}

		// 5. Create ticket with passenger details

		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		// 6. Delete hold
		if err := qtx.DeleteHold(ctx, item.HoldID); err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		tickets = append(tickets, BookTicketResponse{
			TicketID: ticketID,
			Status:   "CONFIRMED",
		})
	}

	// 7. Wallet deduction (Students only)
	if userRole == "STUDENT" && totalPrice > 0 {
		userWallet, err := s.wallet.GetOrCreateWallet(ctx, tx, userID)
		if err != nil {
			return nil, err
		}

		revenueWalletID, err := s.wallet.GetSystemWalletByName(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)
		if err != nil {
			return nil, err
		}

		priceToPaisa := common.AmountToLowestUnit(totalPrice)

		err = s.wallet.ExecuteTransaction(ctx, tx, userWallet.ID, revenueWalletID, priceToPaisa, "TRANSPORT_BOOKING", userID.String(), "Transport ticket purchase")
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return &ConfirmBatchResponse{Tickets: tickets}, nil
}

// CancelTicket handles cancellation with role-based refund logic
func (s *Service) CancelTicketWithRole(ctx context.Context, ticketID uuid.UUID, userRole string) error {
	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	// 1. Get ticket (enforces time limit via SQL)
	ticket, err := qtx.GetTicketForCancellation(ctx, ticketID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return commonerrors.New("CANCELLATION_CLOSED", 403, "Cancellation window closed or ticket not found")
		}
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// 2. Refund logic (Students only)
	if userRole == "STUDENT" {
		refundAmount := int64(common.NumericToFloat64(ticket.BasePrice))

		if refundAmount > 0 {
			userWallet, err := s.wallet.GetOrCreateWallet(ctx, tx, ticket.UserID)
			if err != nil {
				return commonerrors.Wrap(commonerrors.ErrDatabase, err)
			}

			revenueWalletID, err := s.wallet.GetSystemWalletByName(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)

			if err != nil {
				return commonerrors.Wrap(commonerrors.ErrDatabase, err)
			}

			err = s.wallet.ExecuteTransaction(ctx, tx, revenueWalletID, userWallet.ID, refundAmount, "REFUND", ticketID.String(), "Trip cancellation refund")
			if err != nil {
				return ErrRefundFailed
			}
		}
	}
	// Employees: No wallet operation needed (they paid 0)

	// 3. Mark cancelled
	if err := qtx.SetTicketCancelled(ctx, ticketID); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// 4. Return seat
	if err := qtx.IncrementTripSeat(ctx, ticket.TripID); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return nil
}

// =============================================================================
// LEGACY METHODS (Kept for backward compatibility)
// =============================================================================

// HoldTicket - Legacy single hold (wraps HoldSeats with count=1)
func (s *Service) HoldTicket(ctx context.Context, userID uuid.UUID, userRole string, req HoldTicketRequest) (*HoldTicketResponse, error) {
	batchReq := HoldSeatsRequest{
		TripID:        req.TripID,
		Count:         1,
		PickupStopID:  req.PickupStopID,
		DropoffStopID: req.DropoffStopID,
	}

	resp, err := s.HoldSeats(ctx, userID, userRole, batchReq)
	if err != nil {
		return nil, err
	}

	if len(resp.Holds) == 0 {
		return nil, commonerrors.New("HOLD_FAILED", 500, "Failed to create hold")
	}

	return &resp.Holds[0], nil
}

// CancelTicket - Legacy method (wraps CancelTicketWithRole)
func (s *Service) CancelTicket(ctx context.Context, ticketID uuid.UUID, userRole string) error {
	return s.CancelTicketWithRole(ctx, ticketID, userRole)
}

// ReleaseHold manually releases a hold and returns the seat
func (s *Service) ReleaseHold(ctx context.Context, holdID uuid.UUID) error {
	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	hold, err := qtx.GetHold(ctx, holdID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // Already released
		}
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// Return the seat
	if err := qtx.IncrementTripSeat(ctx, hold.TripID); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// Delete the hold
	if err := qtx.DeleteHold(ctx, holdID); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return nil
}

func (s *Service) GetMyTickets(ctx context.Context, userID uuid.UUID) ([]MyTicketResponse, error) {

	rows, err := s.q.GetUserTicketsByID(ctx, userID)

	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	res := MapDBTicketsToTickets(rows)

	return res, nil
}

// =============================================================================
// ROUTE & TRIP MANAGEMENT
// =============================================================================

func (s *Service) RoutesList(ctx context.Context) ([]Route, error) {
	rows, err := s.q.GetAllRoutes(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	routes := make([]Route, len(rows))
	for i, row := range rows {
		routes[i] = mapDBRouteToRoute(row)
	}

	return routes, nil
}

func (s *Service) GetRouteTemplate(ctx context.Context, routeID uuid.UUID) (*RouteTemplateResponse, error) {

	routeTemplateRows, err := s.q.GetRouteStopsDetails(ctx, routeID)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	if len(routeTemplateRows) == 0 {
		return nil, ErrRouteNotFound
	}

	weeklyScheduleRows, err := s.q.GetRouteWeeklySchedule(ctx, routeID)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	response := mapDBRouteTemplateToRouteTemplate(routeTemplateRows, weeklyScheduleRows)

	return response, nil
}

func (s *Service) CreateTrip(ctx context.Context, req CreateTripRequest) (uuid.UUID, error) {

	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrTripCreationFailed, err)
	}

	defer tx.Rollback(ctx)

	qtx := s.q.WithTx(tx)

	arg := transport_db.CreateTripParams{
		RouteID:         req.RouteID,
		DepartureTime:   req.DepartureTime,
		BookingOpensAt:  req.BookingOpensAt,
		BookingClosesAt: req.BookingClosesAt,
		TotalCapacity:   int32(req.TotalCapacity),
		AvailableSeats:  int32(req.TotalCapacity),
		BasePrice:       common.Float64ToNumeric(req.BasePrice),
	}

	tripID, err := qtx.CreateTrip(ctx, arg)
	if err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrTripCreationFailed, err)
	}

	for i, stop := range req.Stops {
		err := qtx.CreateTripStop(ctx, transport_db.CreateTripStopParams{
			TripID:        tripID,
			StopID:        stop.StopID,
			SequenceOrder: int32(i + 1), // Force 1, 2, 3 sequence based on array order
		})

		if err != nil {
			return uuid.Nil, commonerrors.Wrap(ErrTripCreationFailed, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrTripCreationFailed, err)
	}

	return tripID, nil
}

func (s *Service) GetUpcomingTrips(ctx context.Context, routeID uuid.UUID) ([]TripResponse, error) {

	rows, err := s.q.GetUpcomingTripsByRoute(ctx, routeID)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return MapDBTripsToTrips(rows), nil
}

func (s *Service) GetAllUpcomingTrips(ctx context.Context) ([]TripResponse, error) {
	rows, err := s.q.GetAllUpcomingTrips(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return MapDBAllTripsToTrips(rows), nil
}

func (s *Service) GetWeeklyTripSummary(ctx context.Context) (*WeeklyTripSummary, error) {
	rows, err := s.q.GetWeeklyTrips(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	summary := &WeeklyTripSummary{
		Trips: make([]TripSummaryRow, 0, len(rows)),
	}
	now := time.Now()

	for _, row := range rows {
		summary.Scheduled++

		// Logic consistent with MapDBTripsToTrips
		apiStatus := "OPEN"
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

		if apiStatus == "LOCKED" {
			summary.Locked++
		} else if apiStatus == "OPEN" {
			summary.Opened++
		}

		summary.Trips = append(summary.Trips, TripSummaryRow{
			TripID:         row.ID,
			RouteName:      row.RouteName,
			DepartureTime:  row.DepartureTime,
			AvailableSeats: int(row.AvailableSeats),
			TotalCapacity:  int(row.TotalCapacity),
			BookingStatus:  apiStatus,
		})
	}

	return summary, nil
}

func GenerateRandomCode() string {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%04d", rng.Intn(10000)) // 0000 to 9999
}
