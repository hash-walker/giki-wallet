package feedback

import (
	"context"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/feedback/feedback_db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	feedbackQ *feedback_db.Queries
	dbPool    *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool) *Service {
	return &Service{
		feedbackQ: feedback_db.New(dbPool),
		dbPool:    dbPool,
	}
}

type CreateFeedbackRequest struct {
	Rating  int32  `json:"rating"`
	Comment string `json:"comment"`
}

func (s *Service) CreateFeedback(ctx context.Context, userID uuid.UUID, req CreateFeedbackRequest) (feedback_db.GikiWalletFeedback, error) {
	if req.Rating < 1 || req.Rating > 5 {
		return feedback_db.GikiWalletFeedback{}, ErrInvalidRating
	}

	comment := pgtype.Text{String: "", Valid: false}
	if req.Comment != "" {
		comment = pgtype.Text{String: req.Comment, Valid: true}
	}

	feedback, err := s.feedbackQ.CreateFeedback(ctx, feedback_db.CreateFeedbackParams{
		UserID:  userID,
		Rating:  req.Rating,
		Comment: comment,
	})

	if err != nil {
		return feedback_db.GikiWalletFeedback{}, translateDBError(err)
	}

	return feedback, nil
}
