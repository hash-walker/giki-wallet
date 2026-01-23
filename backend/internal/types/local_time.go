package types

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

type LocalTime struct {
	pgtype.Time
}

func (t LocalTime) MarshalJSON() ([]byte, error) {
	if !t.Valid {
		return []byte("null"), nil
	}

	// Convert microseconds to Go time to use Format()
	// We use an arbitrary date because we only care about the time
	seconds := t.Microseconds / 1000000
	goTime := time.Unix(seconds, 0).UTC()

	// Format as "HH:MM:SS"
	return json.Marshal(goTime.Format("15:04:05"))
}

// Converts "14:00" string into database microseconds automatically
func (t *LocalTime) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}

	// Parse the string "14:00" or "14:00:00"
	parsedTime, err := time.Parse("15:04:05", s)
	if err != nil {
		// Try parsing without seconds if that failed
		parsedTime, err = time.Parse("15:04", s)
		if err != nil {
			return err
		}
	}

	// Calculate microseconds for Postgres
	microseconds := int64(parsedTime.Hour())*3600*1000000 +
		int64(parsedTime.Minute())*60*1000000 +
		int64(parsedTime.Second())*1000000

	t.Time = pgtype.Time{
		Microseconds: microseconds,
		Valid:        true,
	}
	return nil
}

// This tells sqlc/pgx to treat this type exactly like pgtype.Time
func (t LocalTime) Value() (driver.Value, error) {
	return t.Time.Value()
}

func (t *LocalTime) Scan(src interface{}) error {
	return t.Time.Scan(src)
}
