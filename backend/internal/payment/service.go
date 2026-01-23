package payment

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/auth"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/config"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	payment "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hash-walker/giki-wallet/internal/middleware"
)

// =============================================================================
// TYPES
// =============================================================================

// Service handles payment business logic
type Service struct {
	q             *payment.Queries
	walletS       *wallet.Service
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
func NewService(dbPool *pgxpool.Pool, gatewayClient *gateway.JazzCashClient, walletS *wallet.Service, rateLimiter *RateLimiter) *Service {
	return &Service{
		q:             payment.New(dbPool),
		dbPool:        dbPool,
		walletS:       walletS,
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

func (s *Service) InitiatePayment(ctx context.Context, payload TopUpRequest) (*TopUpResult, error) {
	idempotencyKey := payload.IdempotencyKey

	userID, ok := auth.GetUserIDFromContext(ctx)
	if !ok {
		return nil, ErrUserIDNotFound
	}

	// ══════════════════════════════════════════════════════════════════════════=
	// check for existing transaction (uses unique constraint)
	// ═══════════════════════════════════════════════════════════════════════════

	existingPayment, err := s.q.GetByIdempotencyKey(ctx, idempotencyKey)
	if err == nil {
		return s.handleExistingTransaction(ctx, existingPayment)
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return nil, commonerrors.Wrap(ErrDatabaseQuery, err)
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// check for existing pending transaction for this user
	// ═══════════════════════════════════════════════════════════════════════════
	transaction, err := s.q.GetPendingTransaction(ctx, userID)
	if err == nil {
		response, err := s.checkTransactionStatus(ctx, transaction)

		if err != nil {
			// Continue to create new transaction on error
		} else if response.Status != PaymentStatusFailed {
			return response, nil
		}

		// If status is FAILED, continue to create a new transaction
	} else if !errors.Is(err, pgx.ErrNoRows) {
		// Log removed, handled by caller if needed or ignored as implementation detail specific logic
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// create new transaction record
	// ═══════════════════════════════════════════════════════════════════════════

	billRefNo, err := GenerateBillRefNo()
	if err != nil {
		return nil, commonerrors.Wrap(ErrInternal, err)
	}

	txnRefNo, err := GenerateTxnRefNo()
	if err != nil {
		return nil, commonerrors.Wrap(ErrInternal, err)
	}

	gatewayTxn, err := s.q.CreateGatewayTransaction(ctx, payment.CreateGatewayTransactionParams{
		UserID:         userID,
		IdempotencyKey: payload.IdempotencyKey,
		BillRefID:      billRefNo,
		TxnRefNo:       txnRefNo,
		PaymentMethod:  string(payload.Method),
		Status:         payment.CurrentStatus(PaymentStatusPending),
		Amount:         payload.Amount,
	})

	if err != nil {

		check := CheckUniqueConstraintViolation(err)

		if check {
			existing, fetchErr := s.q.GetByIdempotencyKey(ctx, idempotencyKey)
			if fetchErr != nil {
				return nil, commonerrors.Wrap(ErrDatabaseQuery, fetchErr)
			}
			return s.handleExistingTransaction(ctx, existing)
		}

		return nil, commonerrors.Wrap(ErrTransactionCreation, err)

	}

	baseURL := config.LoadConfig().Jazzcash.BaseURL

	// ═══════════════════════════════════════════════════════════════════════════
	// route to payment method handler
	// ═══════════════════════════════════════════════════════════════════════════

	switch payload.Method {
	case PaymentMethodMWallet:
		return s.initiateMWalletPayment(ctx, gatewayTxn, payload, billRefNo, txnRefNo)
	case PaymentMethodCard:
		return &TopUpResult{
			ID:             gatewayTxn.ID,
			TxnRefNo:       txnRefNo,
			Status:         PaymentStatus(gatewayTxn.Status),
			PaymentMethod:  PaymentMethodCard,
			PaymentPageURL: fmt.Sprintf("%s/payment/page/%s", baseURL, txnRefNo),
		}, nil
	default:
		return nil, commonerrors.Wrap(ErrInvalidPaymentMethod, fmt.Errorf("method: %s", payload.Method))
	}
}

// =============================================================================
// AUDIT LOG METHODS
// =============================================================================

// LogCardCallbackAudit logs the raw callback data before processing
func (s *Service) LogCardCallbackAudit(ctx context.Context, formData url.Values) (uuid.UUID, error) {

	rawPayload, err := json.Marshal(formData)
	if err != nil {
		return uuid.Nil, commonerrors.Wrap(commonerrors.ErrInvalidJSON, err)
	}

	gatewayRef := formData.Get("pp_BillReference")
	txnRefNo := formData.Get("pp_TxnRefNo")

	auditLog, err := s.q.CreateAuditLog(ctx, payment.CreateAuditLogParams{
		EventType:  payment.GikiWalletAuditEventTypeCARDCALLBACK,
		RawPayload: rawPayload,
		TxnRefNo:   pgtype.Text{String: txnRefNo, Valid: txnRefNo != ""},
		GatewayRef: pgtype.Text{String: gatewayRef, Valid: gatewayRef != ""},
		UserID:     pgtype.UUID{},
	})

	if err != nil {
		return uuid.Nil, commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to create audit log: %w", err))
	}

	return auditLog.ID, nil
}

func (s *Service) MarkAuditFailed(ctx context.Context, auditID uuid.UUID, errorMsg string) {

	err := s.q.MarkAuditFailed(ctx, payment.MarkAuditFailedParams{
		ID:           auditID,
		ProcessError: pgtype.Text{String: errorMsg, Valid: true},
	})
	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to mark audit as failed: %w", err)), "audit-background")
	}

}

func (s *Service) MarkAuditProcessed(ctx context.Context, auditID uuid.UUID) {
	err := s.q.MarkAuditProcessed(ctx, auditID)
	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to mark audit as processed: %w", err)), "audit-background")
	}
}

func (s *Service) CompleteCardPayment(ctx context.Context, tx pgx.Tx, rForm url.Values, auditID uuid.UUID) (*TopUpResult, error) {

	callback, err := s.gatewayClient.ParseAndVerifyCardCallback(ctx, rForm)
	if err != nil {
		return nil, commonerrors.Wrap(ErrGatewayUnavailable, err)
	}

	paymentQ := s.q.WithTx(tx)

	gatewayTxn, err := paymentQ.GetTransactionByTxnRefNo(ctx, callback.TxnRefNo)

	if err != nil {
		return nil, commonerrors.Wrap(ErrDatabaseQuery, err)
	}

	paymentStatus := GatewayStatusToPaymentStatus(callback.Status)

	err = paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
		Status:   payment.CurrentStatus(paymentStatus),
		TxnRefNo: callback.TxnRefNo,
	})

	if err != nil {
		return nil, commonerrors.Wrap(ErrTransactionUpdate, err)
	}

	if paymentStatus == PaymentStatusSuccess {
		err = s.creditWalletFromPayment(ctx, tx, gatewayTxn.UserID, gatewayTxn.Amount, gatewayTxn.TxnRefNo)
		if err != nil {
			return nil, err
		}
	}

	err = paymentQ.MarkAuditProcessed(ctx, auditID)
	if err != nil {
		// Don't fail the whole operation for this
	}

	return MapCardCallbackToTopUpResult(gatewayTxn, callback), nil
}

// =============================================================================
// PRIVATE SERVICE METHODS - Payment Initiation
// =============================================================================

func (s *Service) initiateMWalletPayment(
	ctx context.Context,
	gatewayTxn payment.GikiWalletGatewayTransaction,
	payload TopUpRequest,
	billRefNo, txnRefNo string,
) (*TopUpResult, error) {

	phoneNumber, err := NormalizePhoneNumber(payload.PhoneNumber)
	if err != nil {
		return nil, commonerrors.Wrap(ErrInvalidPhoneNumber, err)
	}

	cnic, err := NormalizeCNICLast6(payload.CNICLast6)
	if err != nil {
		return nil, commonerrors.Wrap(ErrInvalidCNIC, err)
	}

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

	mwResponse, err := s.gatewayClient.SubmitMWallet(ctx, mwRequest)
	if err != nil {
		return nil, commonerrors.Wrap(ErrGatewayUnavailable, err)
	}

	return MapMWalletToTopUpResult(gatewayTxn, mwResponse), nil
}

func (s *Service) initiateCardPayment(
	ctx context.Context,
	txnRefNo string,
) (string, error) {

	txn, err := s.q.GetTransactionByTxnRefNo(ctx, txnRefNo)
	if err != nil {
		return "", commonerrors.Wrap(ErrDatabaseQuery, err)
	}

	if txn.Status != "PENDING" {
		return "", fmt.Errorf("transaction is not pending")
	}

	// Build request
	txnDateTime := time.Now().Format("20060102150405")
	txnExpiryDateTime := time.Now().Add(24 * time.Hour).Format("20060102150405")
	returnURL := config.LoadConfig().Jazzcash.CardCallbackURL

	cardRequest := gateway.CardInitiateRequest{
		AmountPaisa:       AmountToPaisa(txn.Amount),
		BillRefID:         txn.BillRefID,
		TxnRefNo:          txn.TxnRefNo,
		Description:       "GIKI Wallet Top Up",
		ReturnURL:         returnURL,
		TxnDateTime:       txnDateTime,
		TxnExpiryDateTime: txnExpiryDateTime,
	}

	cardInitiateResponse, err := s.gatewayClient.InitiateCard(ctx, cardRequest)

	if err != nil {
		return "", commonerrors.Wrap(ErrGatewayUnavailable, err)
	}

	html := s.buildAutoSubmitForm(cardInitiateResponse.Fields, cardInitiateResponse.PostURL)

	return html, nil
}

func (s *Service) creditWalletFromPayment(ctx context.Context, tx pgx.Tx, userID uuid.UUID, amount int64, paymentTxnRefNo string) error {

	// get user's wallet
	userWallet, err := s.walletS.GetOrCreateWallet(ctx, tx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user wallet: %w", err)
	}

	// get system liability wallet (where top-up money comes from)
	systemLiabilityWalletID, err := s.walletS.GetSystemWalletByName(ctx, wallet.GikiWallet, wallet.SystemWalletLiability)
	if err != nil {
		return fmt.Errorf("failed to get system liability wallet: %w", err)
	}

	// prepare transaction details
	txnType := "JAZZCASH_DEPOSIT"
	description := fmt.Sprintf("Wallet top-up via payment %s", paymentTxnRefNo)

	err = s.walletS.ExecuteTransaction(
		ctx, tx,
		systemLiabilityWalletID,
		userWallet.ID,
		amount,
		txnType,
		paymentTxnRefNo,
		description,
	)

	if err != nil {

		if errors.Is(err, wallet.ErrDuplicateLedgerEntry) {
			// wallet already credited for transaction (idempotent)
			return nil
		}

		return commonerrors.Wrap(commonerrors.ErrTransactionBegin, fmt.Errorf("wallet credit failed: %w", err))
	}
	return nil
}

// =============================================================================
// PRIVATE SERVICE METHODS - Transaction Status
// =============================================================================

// handleExistingTransaction checks and returns status of an existing transaction
func (s *Service) handleExistingTransaction(
	ctx context.Context,
	existing payment.GikiWalletGatewayTransaction,
) (*TopUpResult, error) {
	switch existing.Status {
	case payment.CurrentStatus(PaymentStatusSuccess):
		return &TopUpResult{
			ID:            existing.ID,
			TxnRefNo:      existing.TxnRefNo,
			Status:        PaymentStatusSuccess,
			Message:       "Transaction has already completed",
			PaymentMethod: PaymentMethod(existing.PaymentMethod),
			Amount:        existing.Amount,
		}, nil

	case payment.CurrentStatus(PaymentStatusPending),
		payment.CurrentStatus(PaymentStatusUnknown),
		payment.CurrentStatus(PaymentStatusFailed):
		// For all non-success statuses, check the REAL status at JazzCash
		return s.checkTransactionStatus(ctx, existing)

	default:
		return &TopUpResult{
			ID:            existing.ID,
			TxnRefNo:      existing.TxnRefNo,
			Status:        PaymentStatusFailed,
			Message:       "Transaction has failed. Please create a new payment.",
			PaymentMethod: PaymentMethod(existing.PaymentMethod),
			Amount:        existing.Amount,
		}, nil
	}
}

// checkTransactionStatus queries gateway for current status
func (s *Service) checkTransactionStatus(
	ctx context.Context,
	existing payment.GikiWalletGatewayTransaction,
) (*TopUpResult, error) {
	// External API call - no transaction held
	inquiryResult, err := s.gatewayClient.Inquiry(ctx, existing.TxnRefNo)

	if err != nil {
		return nil, commonerrors.Wrap(ErrGatewayUnavailable, err)
	}

	paymentStatus := GatewayStatusToPaymentStatus(inquiryResult.Status)

	switch paymentStatus {
	case PaymentStatusSuccess:

		tx, err := s.dbPool.Begin(ctx)
		if err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
		}
		defer tx.Rollback(ctx) // Will rollback if commit doesn't happen

		paymentQ := s.q.WithTx(tx)

		// Update status in DB
		err = paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(paymentStatus),
			TxnRefNo: existing.TxnRefNo,
		})
		if err != nil {
			return nil, commonerrors.Wrap(ErrTransactionUpdate, err)
		}

		// Credit wallet (must succeed or transaction rolls back)
		err = s.creditWalletFromPayment(ctx, tx, existing.UserID, existing.Amount, existing.TxnRefNo)
		if err != nil {
			return nil, err // Transaction will rollback via defer
		}

		// Commit transaction (status update + wallet credit)
		if err := tx.Commit(ctx); err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrTransactionCommit, err)
		}

		return MapInquiryToTopUpResult(existing, inquiryResult), nil

	case PaymentStatusFailed:
		// Update DB status to FAILED
		err = s.q.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(PaymentStatusFailed),
			TxnRefNo: existing.TxnRefNo,
		})
		if err != nil {
			return nil, commonerrors.Wrap(ErrTransactionUpdate, err)
		}

		return MapInquiryToTopUpResult(existing, inquiryResult), nil

	case PaymentStatusPending, PaymentStatusUnknown:
		// Check timeout
		if time.Since(existing.CreatedAt) > 120*time.Second {
			err := s.q.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
				Status:   payment.CurrentStatus(PaymentStatusFailed),
				TxnRefNo: existing.TxnRefNo,
			})
			if err != nil {
				return nil, commonerrors.Wrap(ErrTransactionUpdate, err)
			}

			result := MapInquiryToTopUpResult(existing, inquiryResult)
			result.Status = PaymentStatusFailed
			result.Message = "Transaction has timed out. Please try again."
			return result, nil
		}

		return MapInquiryToTopUpResult(existing, inquiryResult), nil

	default:
		return MapInquiryToTopUpResult(existing, inquiryResult), nil
	}
}

// =============================================================================
// PRIVATE SERVICE METHODS - Background Polling
// =============================================================================

// startPollingForTransaction polls gateway for transaction status updates
func (s *Service) startPollingForTransaction(txRefNo string) {
	conn, err := s.dbPool.Acquire(context.Background())
	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to acquire db connection for polling: %w", err)), "polling-"+txRefNo)
		return
	}
	defer conn.Release()

	paymentQ := payment.New(conn)

	// Acquire polling lock
	_, err = paymentQ.UpdatePollingStatus(context.Background(), txRefNo)
	if err != nil {
		// polling already started or transaction not found
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("polling already started or transaction not found: %w", err)), "polling-"+txRefNo)
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
			if done := s.pollTransactionOnce(pollCtx, txRefNo); done {
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
		middleware.LogAppError(commonerrors.Wrap(ErrTransactionUpdate, fmt.Errorf("failed to update status on timeout: %w", err)), "polling-"+txRefNo)
	}

	if err := paymentQ.ClearPollingStatus(cleanupCtx, txRefNo); err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to clear polling status: %w", err)), "polling-"+txRefNo)
	}
}

// pollTransactionOnce performs a single polling iteration, returns true if polling should stop
func (s *Service) pollTransactionOnce(ctx context.Context, txRefNo string) bool {
	// Acquire rate limit token
	if err := s.rateLimiter.Acquire(ctx); err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrInternal, fmt.Errorf("rate limiter acquire failed: %w", err)), "polling-"+txRefNo)
		return true
	}

	// Call inquiry API
	inquiryResult, err := s.gatewayClient.Inquiry(ctx, txRefNo)
	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrExternalService, fmt.Errorf("inquiry API failed (will retry): %w", err)), "polling-"+txRefNo)
		s.rateLimiter.Release()
		return false
	}

	status := GatewayStatusToPaymentStatus(inquiryResult.Status)

	switch status {
	case PaymentStatusSuccess:

		tx, err := s.dbPool.Begin(ctx)
		if err != nil {
			middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to begin transaction for polling: %w", err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later
		}
		defer func(tx pgx.Tx, ctx context.Context) {
			err := tx.Rollback(ctx)
			if err != nil {
				middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrTransactionBegin, fmt.Errorf("failed to rollback transaction for polling: %w", err)), "polling-"+txRefNo)
				s.rateLimiter.Release()
				return
			}
		}(tx, ctx) // Will rollback if commit doesn't happen

		paymentQ := s.q.WithTx(tx)

		// Update status
		err = paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(status),
			TxnRefNo: txRefNo,
		})
		if err != nil {
			middleware.LogAppError(commonerrors.Wrap(ErrTransactionUpdate, fmt.Errorf("failed to update status to %s: %w", status, err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later
		}

		// Get transaction to get userID and amount for wallet credit
		gatewayTxn, err := paymentQ.GetTransactionByTxnRefNo(ctx, txRefNo)
		if err != nil {
			middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to get transaction for wallet credit: %w", err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later
		}

		// Credit wallet (must succeed or transaction rolls back)
		err = s.creditWalletFromPayment(ctx, tx, gatewayTxn.UserID, gatewayTxn.Amount, gatewayTxn.TxnRefNo)
		if err != nil {
			middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrInternal, fmt.Errorf("failed to credit wallet during polling: %w", err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later - transaction will rollback via defer
		}

		// Clear polling status
		if err := paymentQ.ClearPollingStatus(ctx, txRefNo); err != nil {
			middleware.LogAppError(commonerrors.Wrap(ErrDatabaseQuery, fmt.Errorf("failed to clear polling status: %w", err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later
		}

		// Commit transaction (status update + wallet credit + clear polling)
		if err := tx.Commit(ctx); err != nil {
			middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrDatabase, fmt.Errorf("failed to commit polling transaction: %w", err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later
		}

		s.rateLimiter.Release()
		return true

	case PaymentStatusFailed:

		tx, err := s.dbPool.Begin(ctx)
		defer tx.Rollback(ctx)

		paymentQ := s.q.WithTx(tx)

		err = paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(status),
			TxnRefNo: txRefNo,
		})

		if err != nil {
			middleware.LogAppError(commonerrors.Wrap(ErrTransactionUpdate, fmt.Errorf("failed to update status to FAILED: %w", err)), "polling-"+txRefNo)
		}

		// Clear polling status
		if err := paymentQ.ClearPollingStatus(ctx, txRefNo); err != nil {
			middleware.LogAppError(commonerrors.Wrap(ErrDatabaseQuery, fmt.Errorf("failed to clear polling status: %w", err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later
		}

		// Commit transaction (status update + wallet credit + clear polling)
		if err := tx.Commit(ctx); err != nil {
			middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrTransactionCommit, fmt.Errorf("failed to commit polling transaction: %w", err)), "polling-"+txRefNo)
			s.rateLimiter.Release()
			return false // Retry later
		}

		s.rateLimiter.Release()
		return true

	default:
		s.rateLimiter.Release()
		return false
	}
}

// =============================================================================
// HELPERS - Form Builder
// =============================================================================

func (s *Service) buildAutoSubmitForm(fields gateway.JazzCashFields, jazzcashPostURL string) string {
	html := fmt.Sprintf(`
        <html>
        <body onload="document.getElementById('payForm').submit()">
            <p>Redirecting to payment gateway...</p>
            <form id="payForm" method="POST" action="%s">
                <input type="hidden" name="pp_Amount" value="%s">
                <input type="hidden" name="pp_BillRefrence" value="%s">
                <input type="hidden" name="pp_Description" value="%s">
                <input type="hidden" name="pp_Language" value="EN">
                <input type="hidden" name="pp_TxnRefNo" value="%s">
                <input type="hidden" name="pp_MerchantID" value="%s">
                <input type="hidden" name="pp_Password" value="%s">
                <input type="hidden" name="pp_ReturnURL" value="%s">
                <input type="hidden" name="pp_TxnCurrency" value="PKR">
                <input type="hidden" name="pp_TxnDateTime" value="%s">
                <input type="hidden" name="pp_TxnExpiryDateTime" value="%s">
                <input type="hidden" name="pp_TxnRefNo" value="%s">
                <input type="hidden" name="pp_TxnType" value="MPAY">
                <input type="hidden" name="pp_Version" value="1.1">
                <input type="hidden" name="pp_SecureHash" value="%s">
                
            </form>
        </body>
        </html>
    `, jazzcashPostURL, fields[gateway.FieldAmount], fields[gateway.FieldBillReference], fields[gateway.FieldDescription],
		fields[gateway.FieldTxnRefNo], fields[gateway.FieldMerchantID], fields[gateway.FieldPassword], fields[gateway.FieldReturnURL],
		fields[gateway.FieldTxnDateTime], fields[gateway.FieldTxnExpiryDateTime], fields[gateway.FieldTxnRefNo], fields[gateway.FieldSecureHash],
	)

	return html
}

// =============================================================================
// HELPERS - Reference Number Generation
// =============================================================================

func GenerateTxnRefNo() (string, error) {
	timestamp := time.Now().Format("20060102150405")
	randBits, err := RandomBase32(4)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("T%s%s", timestamp, randBits), nil
}

func GenerateBillRefNo() (string, error) {
	timestamp := time.Now().Format("20060102150405")
	randBits, err := RandomBase32(4)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("B%s%s", timestamp, randBits), nil
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

// =============================================================================
// HELPERS - Input Normalization
// =============================================================================

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

// =============================================================================
// HELPERS - Checking Unique Constraint
// =============================================================================

func CheckUniqueConstraintViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return true
	}
	return false
}
