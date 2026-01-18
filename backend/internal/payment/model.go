package payment

import "github.com/google/uuid"

type PaymentMethod string

const (
	PaymentMethodMWallet PaymentMethod = "MWALLET"
	PaymentMethodCard    PaymentMethod = "CARD"
)

type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "PENDING"
	PaymentStatusSuccess PaymentStatus = "SUCCESS"
	PaymentStatusFailed  PaymentStatus = "FAILED"
	PaymentStatusUnknown PaymentStatus = "UNKNOWN"
)

// Frontend → backend
type TopUpRequest struct {
	IdempotencyKey uuid.UUID     `json:"idempotency_key"`
	Amount         int64         `json:"amount"` // smallest unit (e.g., paisa)
	Method         PaymentMethod `json:"method"` // MWALLET or CARD

	// MWALLET (CNIC) fields
	PhoneNumber string `json:"phone_number,omitempty"`
	CNICLast6   string `json:"cnic_last6,omitempty"`
}

// Backend → frontend
type TopUpResult struct {
	ID       uuid.UUID     `json:"id"`         // gateway_transactions.id
	TxnRefNo string        `json:"txn_ref_no"` // gateway_transactions.txn_ref_no
	Status   PaymentStatus `json:"status"`
	Message  string        `json:"message,omitempty"`

	// CARD redirect flow
	Redirect *RedirectPayload `json:"redirect,omitempty"`

	// Useful for UI
	Amount int64 `json:"amount,omitempty"`
}

type RedirectPayload struct {
	PostURL   string            `json:"post_url"`             // JazzCash hosted page URL
	Fields    map[string]string `json:"fields"`               // pp_* fields including pp_SecureHash
	ReturnURL string            `json:"return_url,omitempty"` // optional: for debugging/UI
}
