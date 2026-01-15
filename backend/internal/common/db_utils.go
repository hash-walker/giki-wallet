package common

import (
	"time"

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

func TextToString(text pgtype.Text) string {
	return text.String
}

func Int4ToInt(n pgtype.Int4) int {
	return int(n.Int32)
}

func TimeToPgTime(goTime time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: goTime, Valid: !goTime.IsZero()}
}
