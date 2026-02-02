package common

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

func AmountToLowestUnit(amount float64) int32 {
	return int32(amount * 100)
}

func LowestUnitToAmount(paisa int32) float64 {
	return float64(paisa) / 100.0
}

func IsUniqueConstraintViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}
