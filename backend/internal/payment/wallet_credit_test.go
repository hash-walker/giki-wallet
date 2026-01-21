//go:build integration

package payment

import (
	"context"
	"net/url"
	"testing"

	"github.com/google/uuid"
	payment "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/hash-walker/giki-wallet/internal/payment/testutils"
	wallet_db "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
)

// =============================================================================
// WALLET CREDIT TESTS - MWALLET FLOW
// =============================================================================

// TestDebug_WalletCredit_NoCleanup - Debug test that leaves data in DB for inspection
func TestDebug_WalletCredit_NoCleanup(t *testing.T) {
	// NO CLEANUP - Data will persist for inspection
	// Run: go test -tags=integration -run TestDebug_WalletCredit_NoCleanup

	ctx := createIntegrationTestContext()

	// Test MWallet SUCCESS - should credit wallet
	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	idempotencyKey := uuid.New()
	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000, // 1000 PKR
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("MWallet payment failed: %v", err)
	}
	t.Logf("MWallet Payment: TxnRefNo=%s, Status=%s", result.TxnRefNo, result.Status)

	// Test Card SUCCESS - should credit wallet
	mockGateway.SetCardCallbackScenario(testutils.ScenarioSuccess)

	cardIdempotencyKey := uuid.New()
	cardResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         2000, // 2000 PKR
		Method:         PaymentMethodCard,
		IdempotencyKey: cardIdempotencyKey,
	})
	if err != nil {
		t.Fatalf("Card initiate failed: %v", err)
	}
	t.Logf("Card Transaction Created: TxnRefNo=%s, Status=%s", cardResult.TxnRefNo, cardResult.Status)

	// Simulate card callback
	callbackData := mockGateway.GenerateCardCallbackFormData(cardResult.TxnRefNo, "000")

	// Log audit first
	auditID, err := testService.LogCardCallbackAudit(ctx, callbackData)
	if err != nil {
		t.Fatalf("Failed to log audit: %v", err)
	}
	t.Logf("Audit Log Created: ID=%s", auditID)

	// Complete card payment
	tx, _ := testDBPool.Begin(ctx)
	cardComplete, err := testService.CompleteCardPayment(ctx, tx, callbackData, auditID)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("Card callback failed: %v", err)
	}
	tx.Commit(ctx)
	t.Logf("Card Payment Completed: TxnRefNo=%s, Status=%s", cardComplete.TxnRefNo, cardComplete.Status)

	// Print summary
	t.Log("========================================")
	t.Log("DATA LEFT IN DATABASE FOR INSPECTION:")
	t.Logf("  Test User ID: %s", testUserID)
	t.Logf("  MWallet TxnRefNo: %s (Amount: 1000)", result.TxnRefNo)
	t.Logf("  Card TxnRefNo: %s (Amount: 2000)", cardResult.TxnRefNo)
	t.Log("========================================")
	t.Log("Run these SQL queries to inspect:")
	t.Log("  SELECT * FROM giki_wallet.gateway_transactions;")
	t.Log("  SELECT * FROM giki_wallet.wallets;")
	t.Log("  SELECT * FROM giki_wallet.ledger;")
	t.Log("  SELECT * FROM giki_wallet.payment_audit_log;")
	t.Log("========================================")
}

func TestWalletCredit_MWallet_Success_CreditsWallet(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	// Set mock gateway to return success
	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Initiate payment - should credit wallet on success
	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	if result.Status != PaymentStatusSuccess {
		t.Fatalf("Expected status SUCCESS, got %s", result.Status)
	}

	// Verify wallet was credited
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected exactly 1 ledger entry, got %d", len(entries))
	}

	if len(entries) > 0 && entries[0].Amount != 500 {
		t.Errorf("Ledger amount mismatch: expected 500, got %d", entries[0].Amount)
	}
}

func TestWalletCredit_MWallet_Pending_DoesNotCreditWallet(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	// Set mock gateway to return pending
	mockGateway.SetScenario(testutils.ScenarioPending)
	mockGateway.SetInquiryScenario(testutils.ScenarioPending)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	if result.Status != PaymentStatusPending {
		t.Fatalf("Expected status PENDING, got %s", result.Status)
	}

	// Verify wallet was NOT credited
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 0 {
		t.Errorf("Expected no ledger entries for pending payment, got %d", len(entries))
	}
}

func TestWalletCredit_MWallet_Failed_DoesNotCreditWallet(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	// Set mock gateway to return failed
	mockGateway.SetScenario(testutils.ScenarioFailed)
	mockGateway.SetInquiryScenario(testutils.ScenarioFailed)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	if result.Status != PaymentStatusFailed {
		t.Fatalf("Expected status FAILED, got %s", result.Status)
	}

	// Verify wallet was NOT credited
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 0 {
		t.Errorf("Expected no ledger entries for failed payment, got %d", len(entries))
	}
}

// =============================================================================
// WALLET CREDIT TESTS - CARD FLOW
// =============================================================================

func TestWalletCredit_Card_Success_CreditsWallet(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	mockGateway.SetCardCallbackScenario(testutils.ScenarioSuccess)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create transaction
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Simulate success callback
	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "000")

	tx, _ := testDBPool.Begin(ctx)
	result, err := testService.CompleteCardPayment(ctx, tx, callbackData, uuid.Nil)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("CompleteCardPayment failed: %v", err)
	}
	tx.Commit(ctx)

	if result.Status != PaymentStatusSuccess {
		t.Errorf("Expected status SUCCESS, got %s", result.Status)
	}

	// Verify wallet was credited
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, initResult.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected exactly 1 ledger entry, got %d", len(entries))
	}

	if len(entries) > 0 && entries[0].Amount != 1000 {
		t.Errorf("Ledger amount mismatch: expected 1000, got %d", entries[0].Amount)
	}
}

func TestWalletCredit_Card_Failed_DoesNotCreditWallet(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	mockGateway.SetCardCallbackScenario(testutils.ScenarioFailed)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create transaction
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Simulate failed callback
	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "101")

	tx, _ := testDBPool.Begin(ctx)
	result, err := testService.CompleteCardPayment(ctx, tx, callbackData, uuid.Nil)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("CompleteCardPayment failed: %v", err)
	}
	tx.Commit(ctx)

	if result.Status != PaymentStatusFailed {
		t.Errorf("Expected status FAILED, got %s", result.Status)
	}

	// Verify wallet was NOT credited
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, initResult.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 0 {
		t.Errorf("Expected no ledger entries for failed payment, got %d", len(entries))
	}
}

// =============================================================================
// DOUBLE CREDIT PREVENTION TESTS
// =============================================================================

func TestDoubleCredit_MWallet_SameIdempotencyKey_OnlyCreditsOnce(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// First request
	result1, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("First request failed: %v", err)
	}

	// Second request with SAME idempotency key
	result2, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("Second request failed: %v", err)
	}

	// Both should return same transaction
	if result1.TxnRefNo != result2.TxnRefNo {
		t.Errorf("Different TxnRefNo returned for same idempotency key")
	}

	// Verify wallet was credited ONLY ONCE
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, result1.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected exactly 1 ledger entry (no double credit), got %d", len(entries))
	}
}

func TestDoubleCredit_Card_DuplicateCallback_OnlyCreditsOnce(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	mockGateway.SetCardCallbackScenario(testutils.ScenarioSuccess)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create transaction
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "000")

	// First callback
	tx1, _ := testDBPool.Begin(ctx)
	_, err = testService.CompleteCardPayment(ctx, tx1, callbackData, uuid.Nil)
	if err != nil {
		tx1.Rollback(ctx)
		t.Fatalf("First CompleteCardPayment failed: %v", err)
	}
	tx1.Commit(ctx)

	// Second callback (duplicate) - should fail on ledger unique constraint
	tx2, _ := testDBPool.Begin(ctx)
	_, err = testService.CompleteCardPayment(ctx, tx2, callbackData, uuid.Nil)
	// This might succeed (idempotent) or fail (constraint), either is acceptable
	// The key is that wallet should only be credited once
	if err != nil {
		tx2.Rollback(ctx)
		t.Logf("Second callback returned error (expected due to idempotency): %v", err)
	} else {
		tx2.Commit(ctx)
	}

	// Verify wallet was credited ONLY ONCE
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, initResult.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected exactly 1 ledger entry (no double credit from duplicate callback), got %d", len(entries))
	}
}

func TestDoubleCredit_MWallet_PendingThenSuccess_OnlyCreditsOnce(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// First request - PENDING
	mockGateway.SetScenario(testutils.ScenarioPending)
	mockGateway.SetInquiryScenario(testutils.ScenarioPending)

	result1, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("First request failed: %v", err)
	}

	if result1.Status != PaymentStatusPending {
		t.Fatalf("Expected first request to be PENDING, got %s", result1.Status)
	}

	// Verify no credit yet
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, result1.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("Expected no ledger entries while pending, got %d", len(entries))
	}

	// Second request with same idempotency key - now SUCCESS
	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	result2, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("Second request failed: %v", err)
	}

	if result2.Status != PaymentStatusSuccess {
		t.Fatalf("Expected second request to be SUCCESS, got %s", result2.Status)
	}

	// Verify wallet was credited exactly once
	entries, err = walletQ.GetLedgerEntriesByReference(ctx, result1.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected exactly 1 ledger entry, got %d", len(entries))
	}

	// Third request (same idempotency key, already SUCCESS)
	result3, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("Third request failed: %v", err)
	}

	if result3.Status != PaymentStatusSuccess {
		t.Errorf("Third request should return SUCCESS, got %s", result3.Status)
	}

	// Verify still only ONE ledger entry
	entries, err = walletQ.GetLedgerEntriesByReference(ctx, result1.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected exactly 1 ledger entry after third request, got %d", len(entries))
	}
}

// =============================================================================
// AUDIT LOGGING TESTS - CARD FLOW
// =============================================================================

func TestAudit_CardCallback_AuditLoggedBeforeProcessing(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestAudit(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestAudit(t)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create transaction
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "000")

	// Log audit (like the handler does BEFORE processing)
	auditID, err := testService.LogCardCallbackAudit(ctx, callbackData)
	if err != nil {
		t.Fatalf("LogCardCallbackAudit failed: %v", err)
	}

	if auditID == uuid.Nil {
		t.Error("Audit ID should not be nil")
	}

	// Verify audit log exists
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
			if audit.Processed.Bool {
				t.Error("Audit should be unprocessed initially")
			}
			break
		}
	}

	if !found {
		t.Error("Audit log not found in unprocessed audits")
	}
}

func TestAudit_CardCallback_MarkProcessedOnSuccess(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestAudit(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestAudit(t)
	defer cleanupTestWallet(t)

	mockGateway.SetCardCallbackScenario(testutils.ScenarioSuccess)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create transaction
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "000")

	// Log audit first
	auditID, err := testService.LogCardCallbackAudit(ctx, callbackData)
	if err != nil {
		t.Fatalf("LogCardCallbackAudit failed: %v", err)
	}

	// Process callback
	tx, _ := testDBPool.Begin(ctx)
	_, err = testService.CompleteCardPayment(ctx, tx, callbackData, auditID)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("CompleteCardPayment failed: %v", err)
	}
	tx.Commit(ctx)

	// Verify audit is marked as processed
	paymentQ := payment.New(testDBPool)
	audits, err := paymentQ.GetUnprocessedAudits(ctx, payment.GetUnprocessedAuditsParams{
		EventType: payment.GikiWalletAuditEventTypeCARDCALLBACK,
		Limit:     100,
	})
	if err != nil {
		t.Fatalf("Failed to get unprocessed audits: %v", err)
	}

	for _, audit := range audits {
		if audit.ID == auditID {
			t.Error("Audit should be marked as processed and not appear in unprocessed list")
		}
	}
}

func TestAudit_CardCallback_MarkFailedOnError(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestAudit(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestAudit(t)

	ctx := createIntegrationTestContext()

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

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

func TestWalletCredit_LedgerIdempotency_PreventsDuplicateViaConstraint(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	ctx := createIntegrationTestContext()

	// Create a wallet for the test user
	walletQ := wallet_db.New(testDBPool)
	w, err := walletQ.CreateWallet(ctx, testUserID)
	if err != nil {
		t.Fatalf("Failed to create wallet: %v", err)
	}

	txnRefNo := "TEST_TXN_" + uuid.New().String()[:8]

	// First ledger entry
	_, err = walletQ.CreateLedgerEntry(ctx, wallet_db.CreateLedgerEntryParams{
		WalletID:        w.ID,
		Amount:          500,
		TransactionType: wallet_db.GikiWalletTransactionCategoryTypeJAZZCASHDEPOSIT,
		ReferenceID:     txnRefNo,
	})
	if err != nil {
		t.Fatalf("First ledger entry failed: %v", err)
	}

	// Second ledger entry with same reference - should fail due to unique constraint
	_, err = walletQ.CreateLedgerEntry(ctx, wallet_db.CreateLedgerEntryParams{
		WalletID:        w.ID,
		Amount:          500,
		TransactionType: wallet_db.GikiWalletTransactionCategoryTypeJAZZCASHDEPOSIT,
		ReferenceID:     txnRefNo,
	})

	if err == nil {
		t.Error("Expected unique constraint violation for duplicate ledger entry")
	}

	// Verify only one entry exists
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, txnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected exactly 1 ledger entry after duplicate attempt, got %d", len(entries))
	}
}

func TestWalletCredit_TransactionRollback_NoPartialCredit(t *testing.T) {
	cleanupTestTransactions(t)
	cleanupTestWallet(t)
	defer cleanupTestTransactions(t)
	defer cleanupTestWallet(t)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create a card payment first
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	mockGateway.SetCardCallbackScenario(testutils.ScenarioSuccess)
	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "000")

	// Start transaction, process callback, but DON'T commit
	tx, _ := testDBPool.Begin(ctx)
	_, err = testService.CompleteCardPayment(ctx, tx, callbackData, uuid.Nil)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("CompleteCardPayment failed: %v", err)
	}

	// Rollback instead of commit
	tx.Rollback(ctx)

	// Verify gateway transaction status is NOT updated
	paymentQ := payment.New(testDBPool)
	gatewayTxn, err := paymentQ.GetTransactionByTxnRefNo(ctx, initResult.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get transaction: %v", err)
	}

	if gatewayTxn.Status != payment.CurrentStatusPENDING {
		t.Errorf("Transaction status should still be PENDING after rollback, got %s", gatewayTxn.Status)
	}

	// Verify wallet was NOT credited
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, initResult.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 0 {
		t.Errorf("Expected no ledger entries after rollback, got %d", len(entries))
	}
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

func cleanupTestWallet(t *testing.T) {
	ctx := context.Background()
	// Delete ledger entries for test user's wallet
	_, err := testDBPool.Exec(ctx, `
		DELETE FROM giki_wallet.ledger 
		WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)
	`, testUserID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup ledger: %v", err)
	}

	// Delete wallet
	_, err = testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup wallet: %v", err)
	}
}

func cleanupTestAudit(t *testing.T) {
	ctx := context.Background()
	_, err := testDBPool.Exec(ctx, "DELETE FROM giki_wallet.payment_audit_log WHERE user_id = $1 OR user_id IS NULL", testUserID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup audit logs: %v", err)
	}
}
