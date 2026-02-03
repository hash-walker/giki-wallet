package payment

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/config"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	payment "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/jackc/pgx/v5"
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
	gatewayClient gateway.Gateway
	rateLimiter   *RateLimiter
	AppURL        string
}

// RateLimiter limits concurrent API calls to external services
type RateLimiter struct {
	tokens chan struct{}
}

// =============================================================================
// CONSTRUCTORS
// =============================================================================

// NewService creates a new payment service
func NewService(dbPool *pgxpool.Pool, gatewayClient gateway.Gateway, walletS *wallet.Service, rateLimiter *RateLimiter, appURL string) *Service {
	return &Service{
		q:             payment.New(dbPool),
		dbPool:        dbPool,
		walletS:       walletS,
		gatewayClient: gatewayClient,
		rateLimiter:   rateLimiter,
		AppURL:        appURL,
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

	amountPaisa := common.AmountToLowestUnit(payload.Amount)

	if amountPaisa <= 0 {
		return nil, commonerrors.Wrap(commonerrors.ErrInvalidInput, fmt.Errorf("amount must be greater than 0"))
	}

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
		Amount:         int64(amountPaisa),
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
			PaymentPageURL: fmt.Sprintf("/api/payment/page/%s", txnRefNo),
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

	callbackData := make(map[string]string)
	for k := range rForm {
		callbackData[k] = rForm.Get(k)
	}

	callback, err := s.gatewayClient.ParseAndVerifyCardCallback(ctx, callbackData)
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

	switch paymentStatus {
	case PaymentStatusFailed:
		s.MarkAuditFailed(ctx, auditID, fmt.Sprintf("Gateway logic: %s (%s)", callback.Message, callback.ResponseCode))
	case PaymentStatusSuccess:
		err = s.creditWalletFromPayment(ctx, tx, gatewayTxn.UserID, gatewayTxn.Amount, gatewayTxn.TxnRefNo)
		if err != nil {
			return nil, err
		}
		s.MarkAuditProcessed(ctx, auditID)
	}
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
		AmountPaisa:       AmountToPaisa(gatewayTxn.Amount),
		BillRefID:         billRefNo,
		TxnRefNo:          txnRefNo,
		Description:       "GIKI Wallet Top Up",
		MobileNumber:      phoneNumber,
		CNICLast6:         cnic,
		TxnDateTime:       txnDateTime,
		TxnExpiryDateTime: txnExpiryDateTime,
	}

	_, err = s.gatewayClient.SubmitMWallet(ctx, mwRequest)
	if err != nil {
		return nil, commonerrors.Wrap(ErrGatewayUnavailable, err)
	}

	return s.checkTransactionStatus(ctx, gatewayTxn)
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
		Description:       "GIKI-Wallet-TopUp",
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

func (s *Service) GetTransactionStatus(ctx context.Context, txnRefNo string) (*TopUpResult, error) {
	txn, err := s.q.GetTransactionByTxnRefNo(ctx, txnRefNo)
	if err != nil {
		return nil, commonerrors.Wrap(ErrDatabaseQuery, err)
	}

	return s.checkTransactionStatus(ctx, txn)
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

		// Also check for raw database constraint violation (race condition)
		if CheckUniqueConstraintViolation(err) {
			return ErrIdempotentSuccess
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
			Amount:        float64(existing.Amount),
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
			Amount:        float64(existing.Amount) / 100.0,
		}, nil
	}
}

// checkTransactionStatus queries gateway for current status
func (s *Service) checkTransactionStatus(
	ctx context.Context,
	existing payment.GikiWalletGatewayTransaction,
) (*TopUpResult, error) {
	// External API call - no transaction held
	inquiryResult, err := s.gatewayClient.Inquiry(ctx, gateway.InquiryRequest{TxnRefNo: existing.TxnRefNo})

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
		// NOTE: Storing atomic units (Paisas) in DB. Read layer handles conversion.
		err = s.creditWalletFromPayment(ctx, tx, existing.UserID, existing.Amount, existing.TxnRefNo)

		if err != nil {
			if errors.Is(err, ErrIdempotentSuccess) {
				return MapInquiryToTopUpResult(existing, *inquiryResult), nil
			}
			return nil, err
		}

		if err := tx.Commit(ctx); err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrTransactionCommit, err)
		}

		return MapInquiryToTopUpResult(existing, *inquiryResult), nil

	case PaymentStatusFailed:
		// Update DB status to FAILED
		err = s.q.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(PaymentStatusFailed),
			TxnRefNo: existing.TxnRefNo,
		})
		if err != nil {
			return nil, commonerrors.Wrap(ErrTransactionUpdate, err)
		}

		return MapInquiryToTopUpResult(existing, *inquiryResult), nil

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

			result := MapInquiryToTopUpResult(existing, *inquiryResult)
			result.Status = PaymentStatusFailed
			result.Message = "Transaction has timed out. Please try again."
			return result, nil
		}

		return MapInquiryToTopUpResult(existing, *inquiryResult), nil

	default:
		return MapInquiryToTopUpResult(existing, *inquiryResult), nil
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

	ticker := time.NewTicker(2 * time.Second)
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

func (s *Service) pollTransactionOnce(ctx context.Context, txRefNo string) bool {
	// 1. Acquire Rate Limiter
	if err := s.rateLimiter.Acquire(ctx); err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrInternal, fmt.Errorf("rate limiter acquire failed: %w", err)), "polling-"+txRefNo)
		return true
	}
	// Guaranteed release on exit
	defer s.rateLimiter.Release()

	// 2. Inquiry API Call
	inquiryResult, err := s.gatewayClient.Inquiry(ctx, gateway.InquiryRequest{TxnRefNo: txRefNo})
	if err != nil {
		middleware.LogAppError(commonerrors.Wrap(commonerrors.ErrExternalService, fmt.Errorf("inquiry API failed (will retry): %w", err)), "polling-"+txRefNo)
		return false
	}

	status := GatewayStatusToPaymentStatus(inquiryResult.Status)

	// Only proceed to DB if status is terminal (Success/Failed)
	if status != PaymentStatusSuccess && status != PaymentStatusFailed {
		return false
	}

	// 3. Database Transaction Block
	return s.finalizeTransaction(ctx, txRefNo, status)
}

func (s *Service) finalizeTransaction(ctx context.Context, txRefNo string, status PaymentStatus) bool {

	err := common.WithTransaction(ctx, s.dbPool, func(tx pgx.Tx) error {
		paymentQ := s.q.WithTx(tx)

		// Update Status & Clear Polling (Common to both Success and Failure)
		updateErr := paymentQ.UpdateGatewayTransactionStatus(ctx, payment.UpdateGatewayTransactionStatusParams{
			Status:   payment.CurrentStatus(status),
			TxnRefNo: txRefNo,
		})

		if updateErr != nil {
			return updateErr
		}

		if cleaningErr := paymentQ.ClearPollingStatus(ctx, txRefNo); cleaningErr != nil {
			return cleaningErr
		}

		if status == PaymentStatusSuccess {
			gatewayTxn, err := paymentQ.GetTransactionByTxnRefNo(ctx, txRefNo)
			if err != nil {
				return err
			}

			if creditErr := s.creditWalletFromPayment(ctx, tx, gatewayTxn.UserID, gatewayTxn.Amount, gatewayTxn.TxnRefNo); creditErr != nil {
				middleware.LogAppError(creditErr, "polling-credit-"+txRefNo)
				return creditErr
			}
		}

		return nil
	})

	if err != nil {
		middleware.LogAppError(fmt.Errorf("finalize transaction failed for %s: %w", txRefNo, err), "polling-finalizer")
		return false
	}

	return true
}

// =============================================================================
// HELPERS - Form Builder
// =============================================================================

func (s *Service) buildAutoSubmitForm(fields gateway.JazzCashFields, jazzcashPostURL string) string {
	html := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Secure Payment Redirect | GIKI Wallet</title>
			<script src="https://cdn.tailwindcss.com"></script>
			<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
			<style>
				body { font-family: 'Inter', sans-serif; }
			</style>
		</head>
		<body class="bg-gray-50 flex items-center justify-center min-h-screen" onload="document.getElementById('payForm').submit()">
			<div class="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
				<div class="mb-6 flex justify-center">
					<div class="relative">
						<div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
							<svg class="w-8 h-8 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</div>
					</div>
				</div>
				
				<h2 class="text-xl font-bold text-gray-900 mb-2">Securely Redirecting</h2>
				<p class="text-gray-500 text-sm mb-8">Please wait while we transfer you to the JazzCash Payment Gateway...</p>
				
				<div class="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
					<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
					</svg>
					<span>256-bit SSL Encrypted</span>
				</div>

				<form id="payForm" method="POST" action="%s" class="hidden">
					<input type="hidden" name="pp_Amount" value="%s">
					<input type="hidden" name="pp_BillReference" value="%s">
					<input type="hidden" name="pp_Description" value="%s">
					<input type="hidden" name="pp_Language" value="EN">
					<input type="hidden" name="pp_TxnRefNo" value="%s">
					<input type="hidden" name="pp_MerchantID" value="%s">
					<input type="hidden" name="pp_Password" value="%s">
					<input type="hidden" name="pp_ReturnURL" value="%s">
					<input type="hidden" name="pp_TxnCurrency" value="PKR">
					<input type="hidden" name="pp_TxnDateTime" value="%s">
					<input type="hidden" name="pp_TxnExpiryDateTime" value="%s">
					<input type="hidden" name="pp_TxnType" value="%s">
					<input type="hidden" name="pp_Version" value="1.1">
					<input type="hidden" name="pp_SecureHash" value="%s">
				</form>
				
				<noscript>
					<div class="mt-4 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg">
						<p class="mb-2">JavaScript is disabled in your browser.</p>
						<button type="submit" form="payForm" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
							Click here to continue
						</button>
					</div>
				</noscript>
			</div>
		</body>
		</html>
	`, jazzcashPostURL, fields[gateway.FieldAmount], fields[gateway.FieldBillReference], fields[gateway.FieldDescription],
		fields[gateway.FieldTxnRefNo], fields[gateway.FieldMerchantID], fields[gateway.FieldPassword], fields[gateway.FieldReturnURL],
		fields[gateway.FieldTxnDateTime], fields[gateway.FieldTxnExpiryDateTime], fields[gateway.FieldTxnType], fields[gateway.FieldSecureHash],
	)

	return html
}

// =============================================================================
// ADMIN SERVICE METHODS
// =============================================================================

func (s *Service) GetGatewayTransactions(ctx context.Context, params common.GatewayTransactionListParams) ([]payment.GetGatewayTransactionsRow, int64, int64, error) {
	arg := payment.GetGatewayTransactionsParams{
		Status:        pgtype.Text{String: params.Status, Valid: params.Status != ""},
		PaymentMethod: pgtype.Text{String: params.PaymentMethod, Valid: params.PaymentMethod != ""},
		StartDate:     params.StartDate,
		EndDate:       params.EndDate,
		Search:        params.Search,
		Limit:         int32(params.PageSize),
		Offset:        int32((params.Page - 1) * params.PageSize),
	}

	txns, err := s.q.GetGatewayTransactions(ctx, arg)
	if err != nil {
		middleware.LogAppError(fmt.Errorf("GetGatewayTransactions failed: %w; params: %+v", err, params), "payment-get-gateway-transactions")
		return nil, 0, 0, commonerrors.Wrap(ErrDatabaseQuery, err)
	}

	var total int64
	var totalAmount int64
	if len(txns) > 0 {
		total = txns[0].TotalCount
		totalAmount = txns[0].TotalAmount
	}

	return txns, total, totalAmount, nil
}

func (s *Service) VerifyTransaction(ctx context.Context, txnRefNo string) (*AdminGatewayTransaction, error) {
	statusResult, err := s.GetTransactionStatus(ctx, txnRefNo)
	if err != nil {
		return nil, err
	}

	txn, err := s.q.GetTransactionByTxnRefNo(ctx, txnRefNo)
	if err != nil {
		return nil, commonerrors.Wrap(ErrDatabaseQuery, err)
	}

	return &AdminGatewayTransaction{
		TxnRefNo:      txn.TxnRefNo,
		UserID:        txn.UserID,
		Amount:        fmt.Sprintf("%d", txn.Amount),
		Status:        statusResult.Status,
		PaymentMethod: PaymentMethod(txn.PaymentMethod),
		CreatedAt:     txn.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     txn.UpdatedAt.Format(time.RFC3339),
		BillRefID:     txn.BillRefID,
	}, nil
}

func (s *Service) GetLiabilityWalletBalance(ctx context.Context) (float64, error) {
	return s.walletS.GetSystemWalletBalance(ctx, wallet.GikiWallet, wallet.SystemWalletLiability)
}

func (s *Service) GetTransportRevenueWalletBalance(ctx context.Context) (float64, error) {
	return s.walletS.GetSystemWalletBalance(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)
}

func (s *Service) GetTransportRevenuePeriodVolume(ctx context.Context, startDate, endDate time.Time) (float64, error) {
	stats, err := s.walletS.GetWeeklyStats(ctx, startDate, endDate)
	if err != nil {
		return 0, err
	}

	netRevenue := float64(stats.TotalIncome+stats.TotalRefunds) / 100.0
	return netRevenue, nil
}

func (s *Service) ExportGatewayTransactions(ctx context.Context, params common.GatewayTransactionListParams) ([]byte, error) {
	arg := payment.GetGatewayTransactionsForExportParams{
		Status:        pgtype.Text{String: params.Status, Valid: params.Status != ""},
		PaymentMethod: pgtype.Text{String: params.PaymentMethod, Valid: params.PaymentMethod != ""},
		StartDate:     params.StartDate,
		EndDate:       params.EndDate,
		Search:        params.Search,
	}

	rows, err := s.q.GetGatewayTransactionsForExport(ctx, arg)
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}

	buf := new(bytes.Buffer)
	w := csv.NewWriter(buf)

	// Header
	if err := w.Write([]string{
		"Transaction Ref",
		"Bill Ref",
		"User Name",
		"User Email",
		"Amount",
		"Status",
		"Method",
		"Date",
	}); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
	}

	// Rows
	for _, row := range rows {
		amount := float64(row.Amount) / 100.0

		if err := w.Write([]string{
			row.TxnRefNo,
			row.BillRefID,
			row.UserName,
			row.UserEmail,
			fmt.Sprintf("%.2f", amount),
			string(row.Status),
			string(row.PaymentMethod),
			row.CreatedAt.Format(time.RFC3339),
		}); err != nil {
			return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrInternal, err)
	}

	return buf.Bytes(), nil
}

func (s *Service) GetTransactionAuditLogs(ctx context.Context, txnRefNo string) ([]payment.GikiWalletPaymentAuditLog, error) {
	logs, err := s.q.GetAuditLogsByTxn(ctx, pgtype.Text{String: txnRefNo, Valid: true})
	if err != nil {
		return nil, commonerrors.Wrap(commonerrors.ErrDatabase, err)
	}
	return logs, nil
}
