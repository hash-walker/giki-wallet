-- name: CreateFeedback :one
INSERT INTO giki_wallet.feedback (
  user_id, rating, comment
) VALUES (
  $1, $2, $3
)
RETURNING id, user_id, rating, comment, created_at;
