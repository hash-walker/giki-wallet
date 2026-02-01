package transport

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"math/rand"
	"strconv"
	"strings"
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
// 1. TRIP MANAGEMENT (The New Logic)
// =============================================================================

func (s *Service) GetWeeklyTrips(ctx context.Context, startDate, endDate time.Time) ([]TripResponse, error) {

	rows, err := s.q.GetTripsForWeekWithStops(ctx, transport_db.GetTripsForWeekWithStopsParams{
		DepartureTime:   startDate,
		DepartureTime_2: endDate,
	})
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return mapDbTripsForWeekToResponse(rows), nil
}

func (s *Service) GetDeletedTripsHistory(ctx context.Context, page, pageSize int) (*TripHistoryWithPagination, error) {

	offset := (page - 1) * pageSize

	rows, err := s.q.GetDeletedTripsHistory(ctx, transport_db.GetDeletedTripsHistoryParams{
		Limit:  int32(pageSize),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	var totalCount int64 = 0
	if len(rows) > 0 {
		totalCount = rows[0].TotalCount
	}

	data := mapDbDeletedTripsToResponse(rows)

	return &TripHistoryWithPagination{
		Data:       data,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (s *Service) CreateTrip(ctx context.Context, req CreateTripRequest) (uuid.UUID, error) {

	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrTripCreationFailed, err)
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	basePrice := common.AmountToLowestUnit(req.BasePrice)

	tripID, err := qtx.CreateTrip(ctx, transport_db.CreateTripParams{
		RouteID:                 req.RouteID,
		DepartureTime:           req.DepartureTime,
		BookingOpenOffsetHours:  req.BookingOpenOffsetHours,
		BookingCloseOffsetHours: req.BookingCloseOffsetHours,
		TotalCapacity:           int32(req.TotalCapacity),
		AvailableSeats:          int32(req.TotalCapacity),
		BasePrice:               basePrice,
		BusType:                 req.BusType,
		Direction:               req.Direction,
	})
	if err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrTripCreationFailed, err)
	}

	for i, stop := range req.Stops {
		err := qtx.CreateTripStop(ctx, transport_db.CreateTripStopParams{
			TripID:        tripID,
			StopID:        stop.StopID,
			SequenceOrder: int32(i + 1), // 1-based index
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

func (s *Service) DeleteTrip(ctx context.Context, tripID uuid.UUID) error {
	err := s.q.SoftDeleteTrip(ctx, tripID)
	if err != nil {
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	return nil
}

// =============================================================================
// 2. ROUTE INFO
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

	return mapDBRouteTemplateToRouteTemplate(routeTemplateRows, weeklyScheduleRows), nil
}

// =============================================================================
// 3. BOOKING & HOLD LOGIC
// =============================================================================

func (s *Service) HoldSeats(ctx context.Context, userID uuid.UUID, userRole string, req HoldSeatsRequest) (*HoldSeatsResponse, error) {

	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	if _, lockErr := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", userID.String()); lockErr != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, lockErr)
	}

	trip, err := qtx.GetTrip(ctx, req.TripID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTripNotFound
		}
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	rule, err := qtx.GetQuotaRule(ctx, transport_db.GetQuotaRuleParams{
		UserRole:  userRole,
		Direction: trip.Direction,
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNoQuotaPolicy
		}
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	usage, err := qtx.GetWeeklyTicketCountByDirection(ctx, transport_db.GetWeeklyTicketCountByDirectionParams{
		UserID:    userID,
		Direction: trip.Direction,
	})

	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	if (usage + int64(req.Count)) > int64(rule.WeeklyLimit) {
		return nil, ErrQuotaExceeded
	}

	var holds []HoldTicketResponse
	expiry := time.Now().Add(5 * time.Minute)

	for i := 0; i < req.Count; i++ {

		_, err := qtx.DecreaseTripSeat(ctx, req.TripID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrTripFull
			}
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

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

func (s *Service) ConfirmBatch(ctx context.Context, userID uuid.UUID, userRole string, items []ConfirmItem) (*ConfirmBatchResponse, error) {
	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	var userWalletID, revenueWalletID uuid.UUID
	if userRole == "STUDENT" {
		userWallet, err := s.wallet.GetOrCreateWallet(ctx, tx, userID)
		if err != nil {
			return nil, err
		}
		userWalletID = userWallet.ID

		revWallet, err := s.wallet.GetSystemWalletByName(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)
		if err != nil {
			return nil, err
		}
		revenueWalletID = revWallet
	}

	var tickets []BookTicketResponse

	for _, item := range items {

		hold, err := qtx.GetHold(ctx, item.HoldID)
		if err != nil {
			return nil, ErrHoldExpired
		}

		if time.Now().After(hold.ExpiresAt) {
			return nil, ErrHoldExpired
		}

		price, err := qtx.GetTripPrice(ctx, hold.TripID)

		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		var ticketID uuid.UUID
		for i := 0; i < 5; i++ {
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
		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}

		_ = qtx.DeleteHold(ctx, item.HoldID)

		if userRole == "STUDENT" && price > 0 {
			err = s.wallet.ExecuteTransaction(
				ctx,
				tx,
				userWalletID,
				revenueWalletID,
				int64(price),
				"TRANSPORT_BOOKING",
				ticketID.String(),
				fmt.Sprintf("Ticket for %s", item.PassengerName),
			)
			if err != nil {
				return nil, err
			}
		}

		tickets = append(tickets, BookTicketResponse{
			TicketID: ticketID,
			Status:   "CONFIRMED",
		})
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	return &ConfirmBatchResponse{Tickets: tickets}, nil
}

func (s *Service) GetUserQuota(ctx context.Context, userID uuid.UUID, userRole string) (*QuotaResponse, error) {

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
			return ErrCancellationClosed
		}
		return commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// 2. Refund logic (Students only)
	if userRole == "STUDENT" {
		refundAmount := ticket.BasePrice

		if refundAmount > 0 {
			userWallet, err := s.wallet.GetOrCreateWallet(ctx, tx, ticket.UserID)
			if err != nil {
				return commonerrors.Wrap(commonerrors.ErrDatabase, err)
			}

			revenueWalletID, err := s.wallet.GetSystemWalletByName(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)

			if err != nil {
				return commonerrors.Wrap(commonerrors.ErrDatabase, err)
			}

			err = s.wallet.ExecuteTransaction(ctx, tx, revenueWalletID, userWallet.ID, int64(refundAmount), "REFUND", ticketID.String(), "Trip cancellation refund")
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

func (s *Service) GetUserTickets(ctx context.Context, userID uuid.UUID) ([]MyTicketResponse, error) {
	rows, err := s.q.GetUserTicketsByID(ctx, userID)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	return mapDBTicketsToResponse(rows), nil
}

func GenerateRandomCode() string {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%04d", rng.Intn(10000))
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. REVENUE & TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════

func (s *Service) GetRevenueTransactions(ctx context.Context) ([]wallet.TransactionHistoryItem, error) {
	revenueWalletID, err := s.wallet.GetSystemWalletByName(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
	}

	return s.wallet.GetWalletHistory(ctx, revenueWalletID)
}
func (s *Service) ExportTripData(ctx context.Context, startDate, endDate time.Time, routeIDs []uuid.UUID) ([]byte, error) {
	rows, err := s.q.GetTripsForExport(ctx, transport_db.GetTripsForExportParams{
		DepartureTime:   startDate,
		DepartureTime_2: endDate,
		Column3:         routeIDs,
	})
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	// Create ZIP buffer
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)

	// Group rows by TripID
	type TripGroup struct {
		TripID        uuid.UUID
		RouteName     string
		DepartureTime time.Time
		BusType       string
		Tickets       []transport_db.GetTripsForExportRow
		StopCounts    map[string]int
	}

	trips := make(map[uuid.UUID]*TripGroup)
	// Maintain order
	var tripOrder []*TripGroup

	for _, row := range rows {
		tg, exists := trips[row.TripID]
		if !exists {
			tg = &TripGroup{
				TripID:        row.TripID,
				RouteName:     row.RouteName,
				DepartureTime: row.DepartureTime,
				BusType:       row.BusType,
				Tickets:       []transport_db.GetTripsForExportRow{},
				StopCounts:    make(map[string]int),
			}
			trips[row.TripID] = tg
			tripOrder = append(tripOrder, tg)
		}
		tg.Tickets = append(tg.Tickets, row)
		tg.StopCounts[row.PickupStopName]++
	}

	for _, tg := range tripOrder {
		// Create CSV file for this trip
		// Filename: RouteName_Date_Time.csv (Sanitized)
		safeRouteName := strings.ReplaceAll(tg.RouteName, " ", "_")
		safeRouteName = strings.ReplaceAll(safeRouteName, "/", "-")
		filename := fmt.Sprintf("%s_%s.csv", safeRouteName, tg.DepartureTime.Format("20060102_1504"))

		f, err := zipWriter.Create(filename)
		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
		}

		w := csv.NewWriter(f)

		// 1. Header Info
		var stopCountsStr []string
		for stop, count := range tg.StopCounts {
			stopCountsStr = append(stopCountsStr, fmt.Sprintf("%s: %d", stop, count))
		}
		stopCountsDisplay := strings.Join(stopCountsStr, "; ")

		headerInfo := []string{
			"Route: " + tg.RouteName,
			"Bus: " + tg.BusType,
			"Dep: " + tg.DepartureTime.Format("Mon, 02 Jan 15:04"),
			"Stops: " + stopCountsDisplay,
		}
		if err := w.Write(headerInfo); err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
		}

		// 2. Empty Row
		w.Write([]string{})

		// 3. Column Headers
		if err := w.Write([]string{"Serial", "Ticket Code", "Passenger", "Mobile", "Pickup", "Status"}); err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
		}

		// 4. Ticket Data
		for _, ticket := range tg.Tickets {
			record := []string{
				strconv.Itoa(int(ticket.SerialNo)),
				ticket.TicketCode,
				ticket.PassengerName,
				ticket.UserPhoneNumber,
				ticket.PickupStopName,
				ticket.Status,
			}
			if err := w.Write(record); err != nil {
				return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
			}
		}

		w.Flush()
		if err := w.Error(); err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
		}
	}

	if err := zipWriter.Close(); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
	}

	return buf.Bytes(), nil
}
