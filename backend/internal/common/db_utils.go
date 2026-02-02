package common

import (
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func StringToText(s string) pgtype.Text {
	return pgtype.Text{
		String: s,
		Valid:  s != "",
	}
}

func IntToInt4(n int) pgtype.Int4 {
	return pgtype.Int4{
		Int32: int32(n),
		Valid: n != 0,
	}
}

func GoogleUUIDtoPgUUID(id uuid.UUID, valid bool) pgtype.UUID {
	return pgtype.UUID{
		Bytes: id,
		Valid: valid,
	}
}

func TextToString(text pgtype.Text) string {
	return text.String
}

func TextToStringPointer(text pgtype.Text) *string {
	if !text.Valid {
		return nil
	}
	return &text.String
}

func Int4ToInt(n pgtype.Int4) int {
	return int(n.Int32)
}

func Int32ToInt(n pgtype.Uint32) int {
	return int(n.Uint32)
}

func TimeToPgTime(goTime time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: goTime, Valid: !goTime.IsZero()}
}

func Float64ToNumeric(f float64) pgtype.Numeric {
	var num pgtype.Numeric

	val := strconv.FormatFloat(f, 'f', -1, 64)

	num.Scan(val)

	return num
}

func NumericToFloat64(n pgtype.Numeric) float64 {
	f, _ := n.Float64Value()
	return f.Float64
}
