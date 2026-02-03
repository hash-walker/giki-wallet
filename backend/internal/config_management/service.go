package config_management

import (
	"context"
	"strconv"

	config "github.com/hash-walker/giki-wallet/internal/config_management/config_db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	MaxTopUpAmountPaisaKey = "MAX_TOPUP_AMOUNT_PAISA"
)

type Service struct {
	q *config.Queries
}

func NewService(dbPool *pgxpool.Pool) *Service {
	s := &Service{
		q: config.New(dbPool),
	}
	return s
}

// Initialize seeds default values if they don't exist
func (s *Service) Initialize(ctx context.Context) error {
	_, err := s.q.UpsertConfig(ctx, config.UpsertConfigParams{
		Key:   MaxTopUpAmountPaisaKey,
		Value: "80000",
		Description: pgtype.Text{
			String: "Maximum allowed wallet balance (in Paisas)",
			Valid:  true,
		},
	})
	return err
}

func (s *Service) GetMaxTopUpAmount(ctx context.Context) (int64, error) {
	cfg, err := s.q.GetConfig(ctx, MaxTopUpAmountPaisaKey)
	if err != nil {
		return 80000, nil // Fallback to 800 PKR
	}

	val, err := strconv.ParseInt(cfg.Value, 10, 64)
	if err != nil {
		return 80000, nil
	}

	return val, nil
}

func (s *Service) ListConfigs(ctx context.Context) ([]config.GikiWalletSystemConfig, error) {
	return s.q.ListConfigs(ctx)
}

func (s *Service) UpdateConfig(ctx context.Context, key, value string) error {
	_, err := s.q.UpdateConfig(ctx, config.UpdateConfigParams{
		Key:   key,
		Value: value,
	})
	return err
}
