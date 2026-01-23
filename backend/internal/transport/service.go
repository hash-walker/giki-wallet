package transport

import (
	"context"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/transport/transport_db"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q      *transport_db.Queries
	dbPool *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool) *Service {
	return &Service{
		q:      transport_db.New(dbPool),
		dbPool: dbPool,
	}
}

func (s *Service) RoutesList(ctx context.Context) ([]Route, error) {

	rows, err := s.q.GetAllRoutes(ctx)
	if err != nil {
		return nil, commonerrors.ErrDatabase
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
		return nil, commonerrors.ErrDatabase
	}

	weeklyScheduleRows, err := s.q.GetRouteWeeklySchedule(ctx, routeID)

	if err != nil {
		return nil, commonerrors.ErrDatabase
	}

	response := mapDBRouteTemplateToRouteTemplate(routeTemplateRows, weeklyScheduleRows)

	return response, nil
}

func (s *Service) CreateTrip(ctx context.Context, req CreateTripRequest) (uuid.UUID, error) {

	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return uuid.Nil, commonerrors.ErrDatabase
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
		return uuid.Nil, commonerrors.ErrDatabase
	}

	for i, stop := range req.Stops {
		err := qtx.CreateTripStop(ctx, transport_db.CreateTripStopParams{
			TripID:        tripID,
			StopID:        stop.StopID,
			SequenceOrder: int32(i + 1), // Force 1, 2, 3 sequence based on array order
		})

		if err != nil {
			return uuid.Nil, commonerrors.ErrDatabase
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, commonerrors.ErrDatabase
	}

	return tripID, nil
}

func (s *Service) GetUpcomingTrips(ctx context.Context, routeID uuid.UUID) ([]StudentTripResponse, error) {

	rows, err := s.q.GetUpcomingTripsByRoute(ctx, routeID)

	if err != nil {
		return nil, commonerrors.ErrDatabase
	}

	return MapDBTripsToStudentTrips(rows), nil
}
