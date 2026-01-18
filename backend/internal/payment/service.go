package payment

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	payment "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrPaymentNotFound = errors.New("payment not found")
)

type Service struct {
	q             *payment.Queries
	dbPool        *pgxpool.Pool
	gatewayClient *gateway.JazzCashClient
	rateLimiter   *RateLimiter
}

type RateLimiter struct {
	tokens chan struct{}
}

func NewRateLimiter(maxConcurrent int) *RateLimiter {
	rl := &RateLimiter{
		tokens: make(chan struct{}, maxConcurrent),
	}
	// Fill once
	for i := 0; i < maxConcurrent; i++ {
		rl.tokens <- struct{}{}
	}
	return rl
}

func (rl *RateLimiter) Acquire(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-rl.tokens:
		return nil
	}
}

func (rl *RateLimiter) Release() {
	select {
	case rl.tokens <- struct{}{}:
	default:
		// Shouldn't happen
	}
}

func NewService(dbPool *pgxpool.Pool, gatewayClient *gateway.JazzCashClient, rateLimiter *RateLimiter) *Service {
	return &Service{
		q:             payment.New(dbPool),
		dbPool:        dbPool,
		gatewayClient: gatewayClient,
		rateLimiter:   rateLimiter,
	}
}

func (s *Service) InitiatePayment(ctx context.Context, tx pgx.Tx, payload TopUpRequest) (*TopUpResult, error) {

	idempotencyKey := payload.IdempotencyKey
	paymentQ := s.q.WithTx(tx)

	_, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1)", idempotencyKey.String())
	if err != nil {
		return &TopUpResult{}, fmt.Errorf("failed to acquire lock: %w", err)
	}

	// Check for existing payment with this idempotency key (idempotency check)
	existingPayment, err := paymentQ.GetByIdempotencyKey(ctx, idempotencyKey)

	if err == nil {
		return s.handleExistingTransaction(ctx, paymentQ, existingPayment)
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		log.Printf("error checking idempotency key: %v", err)
		return &TopUpResult{}, fmt.Errorf("error checking idempotency key: %w", err)
	}

	// No existing payment found, proceed with creating new payment
	billRefNo, err := GenerateBillRefNo()
	if err != nil {
		return &TopUpResult{}, fmt.Errorf("error generating bill reference: %w", err)
	}

	txnRefNo, err := GenerateTxnRefNo()
	if err != nil {
		return &TopUpResult{}, fmt.Errorf("error generating transaction reference: %w", err)
	}

	// Step 1: Get user_id from context (need auth middleware)
	userID, ok := auth.GetUserIDFromContext(ctx)

	if !ok {
		log.Printf("error checking user id: %v", err)
		return &TopUpResult{}, fmt.Errorf("error checking user id: %w", err)
	}

	gatewayTxn, err := paymentQ.CreateGatewayTransaction(ctx, payment.CreateGatewayTransactionParams{
		UserID:         userID,
		IdempotencyKey: payload.IdempotencyKey,
		BillRefID:      billRefNo,
		TxnRefNo:       txnRefNo,
		PaymentMethod:  string(PaymentMethodMWallet),
		Status:         payment.CurrentStatus(PaymentStatusPending),
		Amount:         payload.Amount,
	})

	// Step 2: Switch on payment method
	switch payload.Method {
	case PaymentMethodMWallet:
		return s.initiateMWalletPayment(ctx, gatewayTxn, payload, billRefNo, txnRefNo)

	default:
		return nil, fmt.Errorf("unsupported payment method: %s", payload.Method)
	}
}

func (s *Service) initiateMWalletPayment(
	ctx context.Context,
	gatewayTxn payment.GikiWalletGatewayTransaction,
	payload TopUpRequest,
	billRefNo, txnRefNo string,
) (*TopUpResult, error) {
	// 1. Prepare MWallet request

	txnDateTime := time.Now().Format("20060102150405") // YYYYMMDDHHMMSS
	txnExpiryDateTime := time.Now().Add(24 * time.Hour).Format("20060102150405")

	phoneNumber, err := NormalizePhoneNumber(payload.PhoneNumber)
	cnic, err := NormalizeCNICLast6(payload.CNICLast6)

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

	// 2. Call JazzCash MWallet API
	mwResponse, err := s.gatewayClient.SubmitMWallet(ctx, mwRequest)

	if err != nil {
		return nil, fmt.Errorf("failed to initiate MWallet payment: %w", err)
	}

	// 3. Convert gateway status to payment status
	paymentStatus := gatewayStatusToPaymentStatus(mwResponse.Status)

	// 4. Handle response based on status
	switch paymentStatus {
	case PaymentStatusSuccess:
		return &TopUpResult{
			ID:       gatewayTxn.ID,
			TxnRefNo: txnRefNo,
			Status:   PaymentStatusSuccess,
			Message:  mwResponse.Message,
			Amount:   payload.Amount,
		}, nil

	case PaymentStatusPending, PaymentStatusUnknown:
		return &TopUpResult{
			ID:       gatewayTxn.ID,
			TxnRefNo: txnRefNo,
			Status:   PaymentStatusPending,
			Message:  mwResponse.Message,
			Amount:   payload.Amount,
		}, nil

	default:
		// Transaction failed
		return &TopUpResult{
			ID:       gatewayTxn.ID,
			TxnRefNo: txnRefNo,
			Status:   PaymentStatusFailed,
			Message:  mwResponse.Message,
			Amount:   payload.Amount,
		}, nil
	}
}

func (s *Service) startPollingForTransaction(txRefNo string) {
	conn, err := s.dbPool.Acquire(context.Background())
	if err != nil {
		log.Printf("Failed to establish connection with database: %v", err)
		return
	}
	defer conn.Release()

	paymentQ := payment.New(conn)

	// acquire polling lock
	_, err = paymentQ.UpdatePollingStatus(context.Background(), txRefNo)
	if err != nil {
		log.Printf("Polling already started or transaction not found: %v", err)
		return
	}

	pollCtx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-pollCtx.Done():
			cleanupCtx := context.Background()

			err := paymentQ.UpdateGatewayTransactionStatus(cleanupCtx, payment.UpdateGatewayTransactionStatusParams{
				Status:   payment.CurrentStatus(PaymentStatusFailed),
				TxnRefNo: txRefNo,
			})
			if err != nil {
				log.Printf("Failed to update status on timeout: %v", err)
			}

			if err := paymentQ.ClearPollingStatus(cleanupCtx, txRefNo); err != nil {
				log.Printf("Failed to clear polling status: %v", err)
			}
			return

		case <-ticker.C:
			// Acquire rate limit token
			err := s.rateLimiter.Acquire(pollCtx)
			if err != nil {
				log.Printf("Rate limiter acquire failed: %v", err)
				return
			}

			// Call Inquiry API
			inquiryResult, err := s.gatewayClient.Inquiry(pollCtx, txRefNo)

			// Always release token (explicit release, not defer)
			if err != nil {
				log.Printf("Inquiry API failed (will retry): %v", err)
				s.rateLimiter.Release()
				continue
			}

			status := gatewayStatusToPaymentStatus(inquiryResult.Status)

			switch status {
			case PaymentStatusSuccess:
				err := paymentQ.UpdateGatewayTransactionStatus(pollCtx, payment.UpdateGatewayTransactionStatusParams{
					Status:   payment.CurrentStatus(status),
					TxnRefNo: txRefNo,
				})
				if err != nil {
					log.Printf("Failed to update status to SUCCESS: %v", err)
				}

				if err := paymentQ.ClearPollingStatus(pollCtx, txRefNo); err != nil {
					log.Printf("Failed to clear polling status: %v", err)
				}
				s.rateLimiter.Release()
				return

			case PaymentStatusFailed:
				err := paymentQ.UpdateGatewayTransactionStatus(pollCtx, payment.UpdateGatewayTransactionStatusParams{
					Status:   payment.CurrentStatus(status),
					TxnRefNo: txRefNo,
				})
				if err != nil {
					log.Printf("Failed to update status to FAILED: %v", err)
				}

				if err := paymentQ.ClearPollingStatus(pollCtx, txRefNo); err != nil {
					log.Printf("Failed to clear polling status: %v", err)
				}
				s.rateLimiter.Release()
				return

			default:
				// Still PENDING - continue polling
				s.rateLimiter.Release()
				continue
			}
		}
	}
}

func (s *Service) handleExistingTransaction(ctx context.Context, paymentQ *payment.Queries, existing payment.GikiWalletGatewayTransaction) (*TopUpResult, error) {
	status := existing.Status

	switch status {
	case payment.CurrentStatus(PaymentStatusSuccess):
		return &TopUpResult{
			TxnRefNo: existing.TxnRefNo,
			Status:   PaymentStatusSuccess,
			Message:  "Transaction has already completed",
		}, nil

	case payment.CurrentStatus(PaymentStatusPending), payment.CurrentStatus(PaymentStatusUnknown):
		// Check with JazzCash Inquiry API
		inquiryResult, err := s.gatewayClient.Inquiry(ctx, existing.TxnRefNo)

		if err != nil {
			return nil, fmt.Errorf("failed to check transaction status: %w", err)
		}

		paymentStatus := gatewayStatusToPaymentStatus(inquiryResult.Status)

		switch paymentStatus {
		case PaymentStatusSuccess:
			// Transaction completed
			err := paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
				Status:   payment.CurrentStatus(paymentStatus),
				TxnRefNo: existing.TxnRefNo,
			})

			if err != nil {
				return nil, fmt.Errorf("failed to update transaction status: %w", err)
			}

			return &TopUpResult{
				TxnRefNo: existing.TxnRefNo,
				Status:   paymentStatus,
				Message:  inquiryResult.Message,
			}, nil

		case PaymentStatusFailed:
			// Transaction failed
			err := paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
				Status:   payment.CurrentStatus(paymentStatus),
				TxnRefNo: existing.TxnRefNo,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update transaction status: %w", err)
			}

			return &TopUpResult{
				TxnRefNo: existing.TxnRefNo,
				Status:   paymentStatus,
				Message:  inquiryResult.Message,
			}, nil

		case PaymentStatusPending, PaymentStatusUnknown:
			// Still PENDING or UNKNOWN - check timeout
			timeElapsed := time.Since(existing.CreatedAt)
			if timeElapsed > 120*time.Second {
				// Transaction timeout - mark as failed
				err := paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
					Status:   payment.CurrentStatus(PaymentStatusFailed),
					TxnRefNo: existing.TxnRefNo,
				})
				if err != nil {
					return nil, fmt.Errorf("failed to update transaction status: %w", err)
				}

				return &TopUpResult{
					TxnRefNo: existing.TxnRefNo,
					Status:   PaymentStatusFailed,
					Message:  "Transaction has timed out. Please try again.",
				}, nil
			}

			// Still within 120 seconds - return PENDING status
			return &TopUpResult{
				TxnRefNo: existing.TxnRefNo,
				Status:   PaymentStatusPending,
				Message:  inquiryResult.Message,
			}, nil

		default:
			// Unknown status
			return &TopUpResult{
				TxnRefNo: existing.TxnRefNo,
				Status:   PaymentStatusUnknown,
				Message:  "Unknown transaction status",
			}, nil
		}

	default:
		// FAILED or other status
		return &TopUpResult{
			TxnRefNo: existing.TxnRefNo,
			Status:   PaymentStatusFailed,
			Message:  "Transaction has failed",
		}, nil
	}
}

func GenerateTxnRefNo() (string, error) {
	date := time.Now().Format("20060102")
	randBits, err := RandomBase32(3)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("GIKI"+"TU"+"%s%s", date, randBits), nil
}

func GenerateBillRefNo() (string, error) {
	timestamp := time.Now().Unix()
	randBits, err := RandomBase32(3)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("BILL"+"%d%s", timestamp, randBits), nil
}

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

func NormalizePhoneNumber(phone string) (string, error) {

	// Remove all non-digit characters
	re := regexp.MustCompile(`\D`)
	digits := re.ReplaceAllString(phone, "")

	if len(digits) == 0 {
		return "", fmt.Errorf("phone number contains no digits")
	}

	// Handle different formats
	switch {
	case len(digits) == 11 && strings.HasPrefix(digits, "0"):
		// Already in correct format: 03123456789
		return digits, nil
	case len(digits) == 12 && strings.HasPrefix(digits, "92"):
		// Format: 923123456789 -> 03123456789
		return "0" + digits[2:], nil
	case len(digits) == 13 && strings.HasPrefix(digits, "92"):
		// Format: 9231234567890 (with extra digit, take last 11)
		return "0" + digits[2:12], nil
	case len(digits) == 10:
		// Format: 3123456789 -> 03123456789
		return "0" + digits, nil
	default:
		return "", fmt.Errorf("invalid phone number format: expected 10-13 digits, got %d", len(digits))
	}
}

func NormalizeCNICLast6(cnic string) (string, error) {
	// Remove all non-digit characters
	re := regexp.MustCompile(`\D`)
	digits := re.ReplaceAllString(cnic, "")

	if len(digits) == 0 {
		return "", fmt.Errorf("CNIC contains no digits")
	}

	// If we have full CNIC (13 digits), extract last 6
	if len(digits) >= 6 {
		return digits[len(digits)-6:], nil
	}

	// If less than 6 digits, pad with zeros (shouldn't happen, but handle gracefully)
	if len(digits) < 6 {
		return "", fmt.Errorf("CNIC must have at least 6 digits, got %d", len(digits))
	}

	return digits, nil
}

func AmountToPaisa(amount int64) string {
	paisa := amount * 100
	return strconv.FormatInt(paisa, 10)
}
