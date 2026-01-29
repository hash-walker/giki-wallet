package payment

import (
	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	paymentdb "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
)

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

// TopUpRequest Frontend → backend
type TopUpRequest struct {
	IdempotencyKey uuid.UUID     `json:"idempotency_key"`
	Amount         float64       `json:"amount"` // in Rupees
	Method         PaymentMethod `json:"method"`
	PhoneNumber    string        `json:"phone_number,omitempty"`
	CNICLast6      string        `json:"cnic_last6,omitempty"`
}

// TopUpResult Backend → frontend
type TopUpResult struct {
	ID            uuid.UUID     `json:"id"`         // gateway_transactions.id
	TxnRefNo      string        `json:"txn_ref_no"` // gateway_transactions.txn_ref_no
	Status        PaymentStatus `json:"status"`
	Message       string        `json:"message,omitempty"`
	PaymentMethod PaymentMethod `json:"paymentMethod"`

	// CARD redirect flow
	PaymentPageURL string `json:"redirect,omitempty"`

	// Useful for UI
	Amount float64 `json:"amount,omitempty"`
}

//type RedirectPayload struct {
//	PostURL   string            `json:"post_url"`             // JazzCash hosted page URL
//	Fields    map[string]string `json:"fields"`               // pp_* fields including pp_SecureHash
//	ReturnURL string            `json:"return_url,omitempty"` // optional: for debugging/UI
//}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

func MapMWalletToTopUpResult(
	existing paymentdb.GikiWalletGatewayTransaction,
	mwResp *gateway.MWalletInitiateResponse,
) *TopUpResult {
	return &TopUpResult{
		ID:            existing.ID,
		TxnRefNo:      existing.TxnRefNo,
		Status:        GatewayStatusToPaymentStatus(mwResp.Status),
		Message:       mwResp.Message,
		PaymentMethod: PaymentMethod(existing.PaymentMethod),
		Amount:        float64(existing.Amount),
	}
}

func MapInquiryToTopUpResult(
	existing paymentdb.GikiWalletGatewayTransaction,
	inquiryResult gateway.InquiryResponse,
) *TopUpResult {
	return &TopUpResult{
		ID:            existing.ID,
		TxnRefNo:      existing.TxnRefNo,
		Status:        GatewayStatusToPaymentStatus(inquiryResult.Status),
		Message:       inquiryResult.Message,
		PaymentMethod: PaymentMethod(existing.PaymentMethod),
		Amount:        float64(existing.Amount),
	}
}

func MapCardCallbackToTopUpResult(
	existing paymentdb.GikiWalletGatewayTransaction,
	callback *gateway.CardCallback,
) *TopUpResult {
	return &TopUpResult{
		ID:            existing.ID,
		TxnRefNo:      existing.TxnRefNo,
		Status:        GatewayStatusToPaymentStatus(callback.Status),
		Message:       callback.Message,
		PaymentMethod: PaymentMethod(existing.PaymentMethod),
		Amount:        float64(existing.Amount),
	}
}

func GatewayStatusToPaymentStatus(gwStatus gateway.Status) PaymentStatus {
	switch gwStatus {
	case gateway.StatusSuccess:
		return PaymentStatusSuccess
	case gateway.StatusFailed:
		return PaymentStatusFailed
	case gateway.StatusPending:
		return PaymentStatusPending
	default:
		return PaymentStatusUnknown
	}
}

// AdminGatewayTransaction represents a transaction for the admin panel
type AdminGatewayTransaction struct {
	TxnRefNo      string        `json:"txn_ref_no"`
	UserID        uuid.UUID     `json:"user_id"`
	UserName      string        `json:"user_name"`
	UserEmail     string        `json:"user_email"`
	Amount        string        `json:"amount"` // BigInt as string to avoid precision loss in JS
	Status        PaymentStatus `json:"status"`
	PaymentMethod PaymentMethod `json:"payment_method"`
	CreatedAt     string        `json:"created_at"`
	UpdatedAt     string        `json:"updated_at"`
	BillRefID     string        `json:"bill_ref_id,omitempty"`
}

type UpdateGatewayStatusRequest struct {
	Status PaymentStatus `json:"status"`
}
