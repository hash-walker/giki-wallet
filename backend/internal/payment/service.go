package payment

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/config"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	payment "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// =============================================================================
// SENTINEL ERRORS
// =============================================================================

var (
	// ErrInvalidPaymentMethod Validation errors (400) - show to user
	ErrInvalidPaymentMethod = errors.New("unsupported payment method")
	ErrInvalidPhoneNumber   = errors.New("invalid phone number format")
	ErrInvalidCNIC          = errors.New("invalid CNIC format")

	// ErrGatewayUnavailable Gateway unreachable (502) - generic message
	ErrGatewayUnavailable = errors.New("payment gateway unavailable")

	// ErrInternal Internal errors (500) - generic message, log details
	ErrInternal            = errors.New("internal error")
	ErrUserIDNotFound      = errors.New("user id not found in context")
	ErrFailedToAcquireLock = errors.New("failed to acquire advisory lock")
	ErrTransactionCreation = errors.New("failed to create transaction")
	ErrTransactionUpdate   = errors.New("failed to update transaction status")
	ErrDatabaseQuery       = errors.New("database query failed")
)

// =============================================================================
// TYPES
// =============================================================================

// Service handles payment business logic
type Service struct {
	q             *payment.Queries
	dbPool        *pgxpool.Pool
	gatewayClient *gateway.JazzCashClient
	rateLimiter   *RateLimiter
}

// RateLimiter limits concurrent API calls to external services
type RateLimiter struct {
	tokens chan struct{}
}

// =============================================================================
// CONSTRUCTORS
// =============================================================================

// NewService creates a new payment service
func NewService(dbPool *pgxpool.Pool, gatewayClient *gateway.JazzCashClient, rateLimiter *RateLimiter) *Service {
	return &Service{
		q:             payment.New(dbPool),
		dbPool:        dbPool,
		gatewayClient: gatewayClient,
		rateLimiter:   rateLimiter,
	}
}

// NewRateLimiter creates a new rate limiter with maxConcurrent tokens
func NewRateLimiter(maxConcurrent int) *RateLimiter {
	rl := &RateLimiter{
		tokens: make(chan struct{}, maxConcurrent),
	}
	for i := 0; i < maxConcurrent; i++ {
		rl.tokens <- struct{}{}
	}
	return rl
}

// =============================================================================
// RATE LIMITER METHODS
// =============================================================================

// Acquire blocks until a token is available or context is cancelled
func (rl *RateLimiter) Acquire(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-rl.tokens:
		return nil
	}
}

// Release returns a token to the pool
func (rl *RateLimiter) Release() {
	select {
	case rl.tokens <- struct{}{}:
	default:
		// Channel full - shouldn't happen if Acquire/Release are balanced
	}
}

// =============================================================================
// PUBLIC SERVICE METHODS
// =============================================================================

// InitiatePayment starts a new payment transaction with idempotency support
func (s *Service) InitiatePayment(ctx context.Context, tx pgx.Tx, payload TopUpRequest) (*TopUpResult, error) {
	idempotencyKey := payload.IdempotencyKey
	paymentQ := s.q.WithTx(tx)

	// Acquire advisory lock for idempotency
	_, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", idempotencyKey.String())
	if err != nil {
		log.Printf("failed to acquire advisory lock: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrFailedToAcquireLock, err)
	}

	// Get user_id from context
	userID, ok := auth.GetUserIDFromContext(ctx)
	if !ok {
		log.Printf("user id not found in context")
		return nil, ErrUserIDNotFound
	}

	// Check for existing payment with this idempotency key
	existingPayment, err := paymentQ.GetByIdempotencyKey(ctx, idempotencyKey)
	if err == nil {
		if existingPayment.Status == payment.CurrentStatus(PaymentStatusFailed) {
			// Previous transaction failed - proceed to create new
		} else {
			return s.handleExistingTransaction(ctx, paymentQ, existingPayment)
		}
	} else if !errors.Is(err, pgx.ErrNoRows) {
		log.Printf("error checking idempotency key: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrDatabaseQuery, err)
	}

	transaction, err := paymentQ.GetPendingTransaction(ctx, userID)
	if err != nil {
		return nil, err
	}

	response, err := s.checkTransactionStatus(ctx, paymentQ, transaction)
	if err != nil {
		return nil, err
	}

	if response.Status == PaymentStatusFailed {
	} else {
		return response, nil
	}

	// Generate reference numbers
	billRefNo, err := GenerateBillRefNo()
	if err != nil {
		log.Printf("error generating bill reference: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrInternal, err)
	}

	txnRefNo, err := GenerateTxnRefNo()
	if err != nil {
		log.Printf("error generating transaction reference: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrInternal, err)
	}

	// Create transaction record
	gatewayTxn, err := paymentQ.CreateGatewayTransaction(ctx, payment.CreateGatewayTransactionParams{
		UserID:         userID,
		IdempotencyKey: payload.IdempotencyKey,
		BillRefID:      billRefNo,
		TxnRefNo:       txnRefNo,
		PaymentMethod:  string(payload.Method),
		Status:         payment.CurrentStatus(PaymentStatusPending),
		Amount:         payload.Amount,
	})
	if err != nil {
		log.Printf("failed to create gateway transaction: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrTransactionCreation, err)
	}

	// Route to payment method handler
	switch payload.Method {
	case PaymentMethodMWallet:
		return s.initiateMWalletPayment(ctx, paymentQ, gatewayTxn, payload, billRefNo, txnRefNo)
	case PaymentMethodCard:
		return s.initiateCardPayment(ctx, gatewayTxn, payload, billRefNo, txnRefNo)
	default:
		return nil, fmt.Errorf("%w: %s", ErrInvalidPaymentMethod, payload.Method)
	}
}

// =============================================================================
// PRIVATE SERVICE METHODS - Payment Initiation
// =============================================================================

// initiateMWalletPayment handles JazzCash MWallet payment initiation
func (s *Service) initiateMWalletPayment(
	ctx context.Context,
	paymentQ *payment.Queries,
	gatewayTxn payment.GikiWalletGatewayTransaction,
	payload TopUpRequest,
	billRefNo, txnRefNo string,
) (*TopUpResult, error) {
	// Validate and normalize input
	phoneNumber, err := NormalizePhoneNumber(payload.PhoneNumber)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidPhoneNumber, err)
	}

	cnic, err := NormalizeCNICLast6(payload.CNICLast6)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidCNIC, err)
	}

	// Build request
	txnDateTime := time.Now().Format("20060102150405")
	txnExpiryDateTime := time.Now().Add(24 * time.Hour).Format("20060102150405")

	mwRequest := gateway.MWalletInitiateRequest{
		AmountPaisa:       AmountToPaisa(payload.Amount),
		BillRefID:         billRefNo,
		TxnRefNo:          txnRefNo,
		Description:       "GIKI Wallet Top Up",
		MobileNumber:      phoneNumber,
		CNICLast6:         cnic,
		TxnDateTime:       txnDateTime,
		TxnExpiryDateTime: txnExpiryDateTime,
	}

	// Call gateway
	_, err = s.gatewayClient.SubmitMWallet(ctx, mwRequest)
	if err != nil {
		log.Printf("gateway MWallet initiate failed: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrGatewayUnavailable, err)
	}

	response, err := s.checkTransactionStatus(ctx, paymentQ, gatewayTxn)
	if err != nil {
		return nil, err
	}

	return response, nil

}

func (s *Service) initiateCardPayment(
	ctx context.Context,
	gatewayTxn payment.GikiWalletGatewayTransaction,
	payload TopUpRequest,
	billRefNo, txnRefNo string,
) (*TopUpResult, error) {
	// Build request
	txnDateTime := time.Now().Format("20060102150405")
	txnExpiryDateTime := time.Now().Add(24 * time.Hour).Format("20060102150405")
	returnURL := config.LoadConfig().Jazzcash.CardCallbackURL

	cardRequest := gateway.CardInitiateRequest{
		AmountPaisa:       AmountToPaisa(payload.Amount),
		BillRefID:         billRefNo,
		TxnRefNo:          txnRefNo,
		Description:       "GIKI Wallet Top Up",
		ReturnURL:         returnURL,
		TxnDateTime:       txnDateTime,
		TxnExpiryDateTime: txnExpiryDateTime,
	}

	// initiate card payment
	cardInitiateResponse, err := s.gatewayClient.InitiateCard(ctx, cardRequest)

	if err != nil {
		log.Printf("gateway card initiate failed: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrGatewayUnavailable, err)
	}

	return &TopUpResult{
		ID:            gatewayTxn.ID,
		TxnRefNo:      txnRefNo,
		Status:        PaymentStatus(gatewayTxn.Status),
		PaymentMethod: PaymentMethodCard,
		Redirect: &RedirectPayload{
			PostURL:   cardInitiateResponse.PostURL,
			Fields:    cardInitiateResponse.Fields,
			ReturnURL: returnURL,
		},
	}, nil

}

func (s *Service) CompleteCardPayment(ctx context.Context, tx pgx.Tx, rForm url.Values) (*TopUpResult, error) {
	callback, err := s.gatewayClient.ParseAndVerifyCardCallback(ctx, rForm)

	if err != nil {
		log.Printf("gateway card complete failed: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrGatewayUnavailable, err)
	}

	paymentQ := s.q.WithTx(tx)
	gatewayTxn, err := paymentQ.GetTransactionByTxnRefNo(ctx, callback.TxnRefNo)

	if err != nil {
		log.Printf("cannot get transaction: %v", err)
		return nil, fmt.Errorf("%w: %v", ErrDatabaseQuery, err)
	}

	response, err := s.checkTransactionStatus(ctx, paymentQ, gatewayTxn)

	if err != nil {
		return nil, err
	}

	return response, nil

}

// =============================================================================
// PRIVATE SERVICE METHODS - Transaction Status
// =============================================================================

// handleExistingTransaction checks and returns status of an existing transaction
func (s *Service) handleExistingTransaction(
	ctx context.Context,
	paymentQ *payment.Queries,
	existing payment.GikiWalletGatewayTransaction,
) (*TopUpResult, error) {
	switch existing.Status {
	case payment.CurrentStatus(PaymentStatusSuccess):
		return &TopUpResult{
			TxnRefNo:      existing.TxnRefNo,
			Status:        PaymentStatusSuccess,
			Message:       "Transaction has already completed",
			PaymentMethod: PaymentMethod(existing.PaymentMethod),
			Amount:        existing.Amount,
		}, nil

	case payment.CurrentStatus(PaymentStatusPending), payment.CurrentStatus(PaymentStatusUnknown):
		return s.checkTransactionStatus(ctx, paymentQ, existing)

	default:
		return &TopUpResult{
			TxnRefNo:      existing.TxnRefNo,
			Status:        PaymentStatusFailed,
			Message:       "Transaction has failed",
			PaymentMethod: PaymentMethod(existing.PaymentMethod),
			Amount:        existing.Amount,
		}, nil
	}
}

// checkPendingTransactionStatus queries gateway for current status of pending transaction
func (s *Service) checkTransactionStatus(
	ctx context.Context,
	paymentQ *payment.Queries,
	existing payment.GikiWalletGatewayTransaction,
) (*TopUpResult, error) {
	inquiryResult, err := s.gatewayClient.Inquiry(ctx, existing.TxnRefNo)
	if err != nil {
		log.Printf("inquiry API failed for existing transaction %s: %v", existing.TxnRefNo, err)
		return nil, fmt.Errorf("%w: %v", ErrGatewayUnavailable, err)
	}

	paymentStatus := gatewayStatusToPaymentStatus(inquiryResult.Status)

	switch paymentStatus {
	case PaymentStatusSuccess, PaymentStatusFailed:
		err := paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(paymentStatus),
			TxnRefNo: existing.TxnRefNo,
		})
		if err != nil {
			log.Printf("failed to update transaction status: %v", err)
			return nil, fmt.Errorf("%w: %v", ErrTransactionUpdate, err)
		}

		return &TopUpResult{
			TxnRefNo:      existing.TxnRefNo,
			Status:        paymentStatus,
			Message:       inquiryResult.Message,
			PaymentMethod: PaymentMethod(existing.PaymentMethod),
			Amount:        existing.Amount,
		}, nil

	case PaymentStatusPending, PaymentStatusUnknown:
		// Check timeout
		if time.Since(existing.CreatedAt) > 120*time.Second {
			err := paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
				Status:   payment.CurrentStatus(PaymentStatusFailed),
				TxnRefNo: existing.TxnRefNo,
			})
			if err != nil {
				log.Printf("failed to update transaction status: %v", err)
				return nil, fmt.Errorf("%w: %v", ErrTransactionUpdate, err)
			}

			return &TopUpResult{
				TxnRefNo:      existing.TxnRefNo,
				Status:        PaymentStatusFailed,
				Message:       "Transaction has timed out. Please try again.",
				PaymentMethod: PaymentMethod(existing.PaymentMethod),
				Amount:        existing.Amount,
			}, nil
		}

		return &TopUpResult{
			TxnRefNo:      existing.TxnRefNo,
			Status:        PaymentStatusPending,
			Message:       inquiryResult.Message,
			PaymentMethod: PaymentMethod(existing.PaymentMethod),
			Amount:        existing.Amount,
		}, nil

	default:
		return &TopUpResult{
			TxnRefNo:      existing.TxnRefNo,
			Status:        PaymentStatusUnknown,
			Message:       "Unknown transaction status",
			PaymentMethod: PaymentMethod(existing.PaymentMethod),
			Amount:        existing.Amount,
		}, nil
	}
}

// =============================================================================
// PRIVATE SERVICE METHODS - Background Polling
// =============================================================================

// startPollingForTransaction polls gateway for transaction status updates
func (s *Service) startPollingForTransaction(txRefNo string) {
	conn, err := s.dbPool.Acquire(context.Background())
	if err != nil {
		log.Printf("failed to acquire db connection for polling: %v", err)
		return
	}
	defer conn.Release()

	paymentQ := payment.New(conn)

	// Acquire polling lock
	_, err = paymentQ.UpdatePollingStatus(context.Background(), txRefNo)
	if err != nil {
		log.Printf("polling already started or transaction not found: %v", err)
		return
	}

	pollCtx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-pollCtx.Done():
			s.handlePollingTimeout(paymentQ, txRefNo)
			return

		case <-ticker.C:
			if done := s.pollTransactionOnce(pollCtx, paymentQ, txRefNo); done {
				return
			}
		}
	}
}

// handlePollingTimeout handles timeout during polling
func (s *Service) handlePollingTimeout(paymentQ *payment.Queries, txRefNo string) {
	cleanupCtx := context.Background()

	err := paymentQ.UpdateGatewayTransactionStatus(cleanupCtx, payment.UpdateGatewayTransactionStatusParams{
		Status:   payment.CurrentStatus(PaymentStatusFailed),
		TxnRefNo: txRefNo,
	})
	if err != nil {
		log.Printf("failed to update status on timeout: %v", err)
	}

	if err := paymentQ.ClearPollingStatus(cleanupCtx, txRefNo); err != nil {
		log.Printf("failed to clear polling status: %v", err)
	}
}

// pollTransactionOnce performs a single polling iteration, returns true if polling should stop
func (s *Service) pollTransactionOnce(ctx context.Context, paymentQ *payment.Queries, txRefNo string) bool {
	// Acquire rate limit token
	if err := s.rateLimiter.Acquire(ctx); err != nil {
		log.Printf("rate limiter acquire failed: %v", err)
		return true
	}

	// Call inquiry API
	inquiryResult, err := s.gatewayClient.Inquiry(ctx, txRefNo)
	if err != nil {
		log.Printf("inquiry API failed (will retry): %v", err)
		s.rateLimiter.Release()
		return false
	}

	status := gatewayStatusToPaymentStatus(inquiryResult.Status)

	switch status {
	case PaymentStatusSuccess, PaymentStatusFailed:
		err := paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(status),
			TxnRefNo: txRefNo,
		})
		if err != nil {
			log.Printf("failed to update status to %s: %v", status, err)
		}

		if err := paymentQ.ClearPollingStatus(ctx, txRefNo); err != nil {
			log.Printf("failed to clear polling status: %v", err)
		}
		s.rateLimiter.Release()
		return true

	default:
		s.rateLimiter.Release()
		return false
	}
}

// =============================================================================
// HELPERS - Reference Number Generation
// =============================================================================

// GenerateTxnRefNo generates a unique transaction reference number
func GenerateTxnRefNo() (string, error) {
	date := time.Now().Format("20060102")
	randBits, err := RandomBase32(3)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("GIKITU%s%s", date, randBits), nil
}

// GenerateBillRefNo generates a unique bill reference number
func GenerateBillRefNo() (string, error) {
	timestamp := time.Now().Unix()
	randBits, err := RandomBase32(3)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("BILL%d%s", timestamp, randBits), nil
}

// RandomBase32 generates n random characters from a base32-like alphabet
func RandomBase32(n int) (string, error) {
	const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	b := make([]byte, n)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		b[i] = alphabet[num.Int64()]
	}
	return string(b), nil
}

// =============================================================================
// HELPERS - Status Conversion
// =============================================================================

// gatewayStatusToPaymentStatus converts gateway status to payment status
func gatewayStatusToPaymentStatus(gwStatus gateway.Status) PaymentStatus {
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

// =============================================================================
// HELPERS - Input Normalization
// =============================================================================

// NormalizePhoneNumber converts phone number to standard format (03XXXXXXXXX)
func NormalizePhoneNumber(phone string) (string, error) {
	re := regexp.MustCompile(`\D`)
	digits := re.ReplaceAllString(phone, "")

	if len(digits) == 0 {
		return "", fmt.Errorf("phone number contains no digits")
	}

	switch {
	case len(digits) == 11 && strings.HasPrefix(digits, "0"):
		return digits, nil
	case len(digits) == 12 && strings.HasPrefix(digits, "92"):
		return "0" + digits[2:], nil
	case len(digits) == 13 && strings.HasPrefix(digits, "92"):
		return "0" + digits[2:12], nil
	case len(digits) == 10:
		return "0" + digits, nil
	default:
		return "", fmt.Errorf("invalid phone number format: expected 10-13 digits, got %d", len(digits))
	}
}

// NormalizeCNICLast6 extracts last 6 digits from CNIC
func NormalizeCNICLast6(cnic string) (string, error) {
	re := regexp.MustCompile(`\D`)
	digits := re.ReplaceAllString(cnic, "")

	if len(digits) == 0 {
		return "", fmt.Errorf("CNIC contains no digits")
	}

	if len(digits) >= 6 {
		return digits[len(digits)-6:], nil
	}

	return "", fmt.Errorf("CNIC must have at least 6 digits, got %d", len(digits))
}

// =============================================================================
// HELPERS - Amount Conversion
// =============================================================================

// AmountToPaisa converts rupees to paisa as string
func AmountToPaisa(amount int64) string {
	return strconv.FormatInt(amount*100, 10)
}
