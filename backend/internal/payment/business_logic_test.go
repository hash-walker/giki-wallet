//go:build integration

package payment

import (
	"context"
	"net/url"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	payment "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/hash-walker/giki-wallet/internal/payment/testutils"
	wallet_db "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
)

// Helper to check wallet ID for a ledger entry
func getLedgerEntryWalletID(ctx context.Context, entryID uuid.UUID) (uuid.UUID, error) {
	var walletID uuid.UUID
	err := testDBPool.QueryRow(ctx, "SELECT wallet_id FROM giki_wallet.ledger WHERE id = $1", entryID).Scan(&walletID)
	return walletID, err
}

// =============================================================================
// BUSINESS LOGIC TESTS - Payment to Wallet Flow
// =============================================================================

func TestBusinessLogic_PaymentToWalletFlow_Complete(t *testing.T) {
	cleanupTestTransactions(t)
	// Reuse existing helper from wallet_credit_test.go if available, or just implement inline cleanup
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)

	defer cleanupTestTransactions(t)
	defer func() {
		ctx := context.Background()
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	}()

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	ctx = createIntegrationTestContext()

	idempotencyKey := uuid.New()

	// 1. Initiate payment
	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// 2. Verify payment status is SUCCESS
	if result.Status != PaymentStatusSuccess {
		t.Errorf("Payment status: got %s, want SUCCESS", result.Status)
	}

	// 3. Verify wallet was credited
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	// Should be 2 entries (double-entry accounting)
	if len(entries) != 2 {
		t.Errorf("Expected 2 ledger entries, got %d", len(entries))
	}

	// Find credit entry for user
	var creditEntry wallet_db.GetLedgerEntriesByReferenceRow
	for _, e := range entries {
		if e.Amount > 0 {
			creditEntry = e
			break
		}
	}

	if creditEntry.Amount != 100000 {
		t.Errorf("Ledger credit amount: got %d, want 100000", creditEntry.Amount)
	}

	// 4. Verify wallet balance
	// Need to get user wallet ID first
	userWallet, _ := walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(testUserID, true))
	balance, err := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if err != nil {
		t.Fatalf("GetWalletBalanceSnapshot failed: %v", err)
	}

	if balance != 100000 {
		t.Errorf("Wallet balance: got %d, want 100000", balance)
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Idempotency
// =============================================================================

func TestBusinessLogic_IdempotencyKey_PreventsDuplicatePayments(t *testing.T) {
	cleanupTestTransactions(t)
	// cleanup
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	ctx = createIntegrationTestContext()
	idempotencyKey := uuid.New()

	request := TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	}

	// First request
	result1, err := testService.InitiatePayment(ctx, request)
	if err != nil {
		t.Fatalf("First request failed: %v", err)
	}

	// Second request with same idempotency key
	result2, err := testService.InitiatePayment(ctx, request)
	if err != nil {
		t.Fatalf("Second request failed: %v", err)
	}

	// Should return same transaction
	if result1.TxnRefNo != result2.TxnRefNo {
		t.Errorf("Different transactions returned: %s vs %s", result1.TxnRefNo, result2.TxnRefNo)
	}

	// Verify wallet balance (should be 500, not 1000)
	walletQ := wallet_db.New(testDBPool)
	userWallet, _ := walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(testUserID, true))
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)

	if balance != 50000 {
		t.Errorf("Wallet balance should be 50000 (not double-credited), got %d", balance)
	}

	// Verify only 2 ledger entries exist (from single transaction)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, result1.TxnRefNo)
	if len(entries) != 2 {
		t.Errorf("Expected 2 ledger entries, got %d", len(entries))
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Failed Payment Handling
// =============================================================================

func TestBusinessLogic_FailedPayment_NoWalletCredit(t *testing.T) {
	cleanupTestTransactions(t)
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioFailed)
	mockGateway.SetInquiryScenario(testutils.ScenarioFailed)

	ctx = createIntegrationTestContext()

	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: uuid.New(),
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Payment should be FAILED
	if result.Status != PaymentStatusFailed {
		t.Errorf("Payment status: got %s, want FAILED", result.Status)
	}

	// Wallet should NOT be credited
	// Note: wallet might not create if payment fails, so check entries first
	walletQ := wallet_db.New(testDBPool)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, result.TxnRefNo)

	if len(entries) != 0 {
		t.Errorf("No ledger entries should exist for failed payment, got %d", len(entries))
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Status Transitions
// =============================================================================

func TestBusinessLogic_PendingToSuccess_SingleCredit(t *testing.T) {
	cleanupTestTransactions(t)
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	defer cleanupTestTransactions(t)

	ctx = createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// First request - PENDING
	mockGateway.SetScenario(testutils.ScenarioPending)
	mockGateway.SetInquiryScenario(testutils.ScenarioPending)

	result1, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("First request failed: %v", err)
	}

	if result1.Status != PaymentStatusPending {
		t.Errorf("First status: got %s, want PENDING", result1.Status)
	}

	// Wallet needs to exist to check balance
	walletQ := wallet_db.New(testDBPool)

	// Create wallet manually if needed
	userWallet, err := walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(testUserID, true))
	if err == nil {
		// If wallet exists, check balance is 0
		balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
		if balance != 0 {
			t.Errorf("Wallet should not be credited while pending, balance: %d", balance)
		}
	}

	// Second request - SUCCESS (payment confirmed)
	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	result2, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("Second request failed: %v", err)
	}

	if result2.Status != PaymentStatusSuccess {
		t.Errorf("Second status: got %s, want SUCCESS", result2.Status)
	}

	// Wallet should now be credited
	userWallet, _ = walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(testUserID, true)) // Should exist now
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance != 50000 {
		t.Errorf("Wallet balance after success: got %d, want 50000", balance)
	}

	// Third request - should still return SUCCESS without double-crediting
	result3, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("Third request failed: %v", err)
	}

	if result3.Status != PaymentStatusSuccess {
		t.Errorf("Third status: got %s, want SUCCESS", result3.Status)
	}

	// Balance should still be 500 (not double-credited)
	balance, _ = walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance != 50000 {
		t.Errorf("Wallet should not be double-credited, balance: %d", balance)
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Transaction Timeout
// =============================================================================

func TestBusinessLogic_TransactionTimeout_Handling(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	// Set scenario to pending so start logic leaves it as pending
	mockGateway.SetScenario(testutils.ScenarioPending)
	mockGateway.SetInquiryScenario(testutils.ScenarioPending)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// 1. Create a pending transaction
	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// 2. Manually backdate the transaction to simulate timeout (> 120s)
	_, err = testDBPool.Exec(ctx, `
		UPDATE giki_wallet.gateway_transactions 
		SET created_at = NOW() - INTERVAL '3 minutes'
		WHERE txn_ref_no = $1
	`, result.TxnRefNo)

	if err != nil {
		t.Fatalf("Failed to update transaction timestamp: %v", err)
	}

	// 3. Call checkTransactionStatus explicitly to trigger the timeout logic
	// (InitiatePayment re-checks status for existing transactions)
	result2, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey, // Use same idempotency key
	})

	if err != nil {
		t.Logf("Status check after timeout: %v", err)
	}

	if result2 == nil {
		t.Fatal("Expected result from timeout check, got nil")
	}

	if result2.Status != PaymentStatusFailed {
		t.Errorf("Transaction status after timeout: got %s, want FAILED", result2.Status)
	}

	if !contains(result2.Message, "timed out") {
		t.Errorf("Expected timeout message, got: %s", result2.Message)
	}
}

func TestBusinessLogic_Idempotency_PayloadMismatch(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// 1. First request
	_, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("First request failed: %v", err)
	}

	// 2. Second request with SAME key but DIFFERENT amount
	// Should return the original transaction (ignoring the new amount) OR error depending on design.
	// Current implementation: GetByIdempotencyKey -> handleExisting. It ignores the new payload.
	// This test documents that behavior.
	result2, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         9999.0, // Different amount
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("Second request failed: %v", err)
	}

	if result2.Amount != 500.0 {
		t.Errorf("Idempotency violation? Returned amount %f, expected original 500.0", result2.Amount)
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Audit Log Consistency
// =============================================================================

func TestBusinessLogic_AuditLog_Consistency(t *testing.T) {
	cleanupTestTransactions(t)
	// cleanup audit
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.payment_audit_log WHERE user_id = $1", common.GoogleUUIDtoPgUUID(testUserID, true))
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	defer cleanupTestTransactions(t)

	mockGateway.SetCardCallbackScenario(testutils.ScenarioSuccess)

	ctx = createIntegrationTestContext()

	// Create card payment
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000.0,
		Method:         PaymentMethodCard,
		IdempotencyKey: uuid.New(),
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Generate callback
	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "000")

	// Log audit
	auditID, err := testService.LogCardCallbackAudit(ctx, callbackData)
	if err != nil {
		t.Fatalf("LogCardCallbackAudit failed: %v", err)
	}

	// Process callback
	tx, _ := testDBPool.Begin(ctx)
	result, err := testService.CompleteCardPayment(ctx, tx, callbackData, auditID)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("CompleteCardPayment failed: %v", err)
	}
	tx.Commit(ctx)

	// Verify payment succeeded
	if result.Status != PaymentStatusSuccess {
		t.Errorf("Payment status: got %s, want SUCCESS", result.Status)
	}

	// Verify wallet was credited
	walletQ := wallet_db.New(testDBPool)
	userWallet, _ := walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(testUserID, true))
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance != 100000 {
		t.Errorf("Wallet balance: got %d, want 100000", balance)
	}

	// Verify audit log was marked as processed
	// (audit should not appear in unprocessed list)
	paymentQ := payment.New(testDBPool)
	audits, _ := paymentQ.GetUnprocessedAudits(ctx, payment.GetUnprocessedAuditsParams{
		EventType: payment.GikiWalletAuditEventTypeCARDCALLBACK,
		Limit:     100,
	})

	for _, audit := range audits {
		if audit.ID == auditID {
			t.Error("Audit should be marked as processed")
		}
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Concurrent Payments
// =============================================================================

func TestBusinessLogic_ConcurrentPayments_NoDoubleCredit(t *testing.T) {
	cleanupTestTransactions(t)
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	ctx = createIntegrationTestContext()
	idempotencyKey := uuid.New()

	var wg sync.WaitGroup
	results := make(chan *TopUpResult, 5)
	errors := make(chan error, 5)

	// Try to process same payment concurrently
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			result, err := testService.InitiatePayment(ctx, TopUpRequest{
				Amount:         1000.0,
				PhoneNumber:    "03001234567",
				CNICLast6:      "123456",
				Method:         PaymentMethodMWallet,
				IdempotencyKey: idempotencyKey,
			})

			if err != nil {
				errors <- err
			} else {
				results <- result
			}
		}()
	}

	wg.Wait()
	close(results)
	close(errors)

	// Check for errors
	for err := range errors {
		t.Logf("Concurrent payment error: %v", err)
	}

	// All should return same transaction
	var firstTxnRef string
	count := 0
	for result := range results {
		if count == 0 {
			firstTxnRef = result.TxnRefNo
		} else if result.TxnRefNo != firstTxnRef {
			t.Errorf("Different transactions returned: %s vs %s", firstTxnRef, result.TxnRefNo)
		}
		count++
	}

	// Wallet should only be credited once (1000)
	walletQ := wallet_db.New(testDBPool)

	// Create wallet if needed/check
	userWallet, err := walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(testUserID, true))
	if err == nil {
		balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
		if balance != 100000 {
			t.Errorf("Wallet should be credited once, balance: %d", balance)
		}
	} else {
		t.Error("Wallet should exist after successful payment")
	}

	// Verify only 2 ledger entries (from single transaction)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, firstTxnRef)
	if len(entries) != 2 {
		t.Errorf("Expected 2 ledger entries, got %d", len(entries))
	}
}

func TestBusinessLogic_Audit_MarkFailedOnError(t *testing.T) {
	cleanupTestTransactions(t)
	// cleanup audit
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.payment_audit_log WHERE user_id = $1", common.GoogleUUIDtoPgUUID(testUserID, true))
	defer cleanupTestTransactions(t)

	ctx = createIntegrationTestContext()

	// Create a callback with invalid data (no matching transaction)
	callbackData := url.Values{}
	callbackData.Set("pp_TxnRefNo", "INVALID_TXN_REF")
	callbackData.Set("pp_ResponseCode", "000")
	callbackData.Set("pp_ResponseMessage", "Success")

	// Log audit first
	auditID, err := testService.LogCardCallbackAudit(ctx, callbackData)
	if err != nil {
		t.Fatalf("LogCardCallbackAudit failed: %v", err)
	}

	// Mark as failed (simulating what handler would do)
	testService.MarkAuditFailed(ctx, auditID, "Transaction not found")

	// Verify audit has error recorded
	paymentQ := payment.New(testDBPool)
	audits, err := paymentQ.GetUnprocessedAudits(ctx, payment.GetUnprocessedAuditsParams{
		EventType: payment.GikiWalletAuditEventTypeCARDCALLBACK,
		Limit:     100,
	})
	if err != nil {
		t.Fatalf("Failed to get unprocessed audits: %v", err)
	}

	found := false
	for _, audit := range audits {
		if audit.ID == auditID {
			found = true
			if !audit.ProcessError.Valid || audit.ProcessError.String == "" {
				t.Error("Audit should have process_error set")
			}
			if audit.RetryCount.Int32 != 1 {
				t.Errorf("Retry count should be 1, got %d", audit.RetryCount.Int32)
			}
			break
		}
	}

	if !found {
		t.Error("Failed audit should still appear in unprocessed list for retry")
	}
}
