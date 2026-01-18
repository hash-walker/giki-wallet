package gateway

import "context"

// =============================================================================
// CONSTANTS - Status constants
// =============================================================================

const (
	StatusPending Status = "PENDING"
	StatusSuccess Status = "SUCCESS"
	StatusFailed  Status = "FAILED"
	StatusUnknown Status = "UNKNOWN"
)

// =============================================================================
// TYPES
// =============================================================================

type Status string

type MWalletInitiateRequest struct {
	AmountPaisa       string
	BillRefID         string
	TxnRefNo          string
	Description       string
	MobileNumber      string
	CNICLast6         string
	TxnDateTime       string // YYYYMMDDHHMMSS (PKT)
	TxnExpiryDateTime string // YYYYMMDDHHMMSS (PKT)
}

type MWalletInitiateResponse struct {
	Status       Status
	ResponseCode string
	Message      string
	RRN          string // pp_RetreivalReferenceNo
	Raw          map[string]any
}

type CardInitiateRequest struct {
	AmountPaisa       int64
	BillRefID         string
	TxnRefNo          string
	Description       string
	ReturnURL         string
	TxnDateTime       string
	TxnExpiryDateTime string
}

type CardInitiateResponse struct {
	PostURL string            // JazzCash merchantform URL
	Fields  map[string]string // pp_* form fields inc. pp_SecureHash
}

type InquiryRequest struct {
	TxnRefNo string // Only field the service layer needs to provide
}

type InquiryResponse struct {
	Status              Status
	ResponseCode        string
	PaymentResponseCode string
	Message             string
	RRN                 string
	Raw                 map[string]any
}

// CardCallback Card callback payload (ReturnURL POST) after redirect
type CardCallback struct {
	TxnRefNo        string
	ResponseCode    string
	ResponseMessage string
	RRN             string
	Fields          map[string]string // full pp_* payload
}

// =============================================================================
// Interfaces
// =============================================================================

type Gateway interface {
	SubmitMWallet(ctx context.Context, req MWalletInitiateRequest) (MWalletInitiateResponse, error)
	InitiateCard(ctx context.Context, req CardInitiateRequest) (CardInitiateResponse, error)

	Inquiry(ctx context.Context, req InquiryRequest) (InquiryResponse, error)

	// ParseAndVerifyCardCallback For card ReturnURL/callback validation
	ParseAndVerifyCardCallback(ctx context.Context, form map[string]string) (CardCallback, error)
}
