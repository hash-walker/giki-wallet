//go:build integration

package payment

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	payment "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/hash-walker/giki-wallet/internal/payment/testutils"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/jackc/pgx/v5/pgxpool"
)

// =============================================================================
// TEST SETUP
// =============================================================================

var (
	testDBPool  *pgxpool.Pool
	testService *Service
	mockGateway *testutils.MockGatewayServer
	testUserID  uuid.UUID
	testSalt    = "test_integration_salt_123"
)

// TestMain sets up the test environment
func TestMain(m *testing.M) {
	// Get database URL from environment
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		// Default test database URL
		dbURL = "postgres://giki:giki_wallet@localhost:5432/giki_wallet_db?sslmode=disable"
		os.Setenv("DB_URL", dbURL) // Ensure it is set for service config

		// Set dummy JazzCash credentials
		os.Setenv("JAZZCASH_MERCHANT_ID", "test_merchant_id")
		os.Setenv("JAZZCASH_PASSWORD", "test_password")
		os.Setenv("JAZZCASH_INTEGRITY_SALT", "test_salt")
		os.Setenv("JAZZCASH_MERCHANT_MPIN", "test_mpin")
		os.Setenv("JAZZCASH_RETURN_URL", "http://localhost:8080/return")
		os.Setenv("JAZZCASH_BASE_URL", "https://sandbox.jazzcash.com.pk")
		os.Setenv("JAZZCASH_WALLET_PAYMENT_URL", "ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction")
		os.Setenv("JAZZCASH_STATUS_INQUIRY_URL", "ApplicationAPI/API/PaymentInquiry/Inquire")
		os.Setenv("JAZZCASH_CARD_PAYMENT_URL", "CustomerPortal/transactionmanagement/merchantform/")
		os.Setenv("JAZZCASH_WALLET_REFUND_URL", "ApplicationAPI/API/Purchase/domwalletrefundtransaction")
		os.Setenv("JAZZCASH_CARD_REFUND_URL", "ApplicationAPI/API/authorize/Refund")
	}

	// Connect to database
	var err error
	testDBPool, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		fmt.Printf("Failed to connect to database: %v\n", err)
		fmt.Println("Make sure Docker Compose is running: docker compose up -d")
		os.Exit(1)
	}

	// Verify connection
	if err := testDBPool.Ping(context.Background()); err != nil {
		fmt.Printf("Failed to ping database: %v\n", err)
		os.Exit(1)
	}

	// Generate a test user ID
	testUserID = uuid.New()

	// Create test user in database (required for foreign key constraint)
	if err := createTestUser(); err != nil {
		fmt.Printf("Failed to create test user: %v\n", err)
		os.Exit(1)
	}

	// Create mock gateway server
	mockGateway = testutils.NewMockGatewayServer(testSalt)

	// Create test JazzCash client using mock server
	gatewayClient := mockGateway.CreateTestJazzCashClient()

	// Create rate limiter
	rateLimiter := NewRateLimiter(10)

	// Create wallet service
	walletService := wallet.NewService(testDBPool)

	// Create test service
	testService = NewService(testDBPool, gatewayClient, walletService, rateLimiter)

	// Run tests
	code := m.Run()

	// Cleanup
	cleanupTestUser()
	mockGateway.Close()
	testDBPool.Close()

	os.Exit(code)
}

// createTestUser creates a test user in the database for integration tests
func createTestUser() error {
	ctx := context.Background()
	// Use unique phone number and email based on testUserID to avoid conflicts
	phoneNumber := fmt.Sprintf("0399%s", testUserID.String()[:7])
	email := fmt.Sprintf("test_%s@giki.edu.pk", testUserID.String()[:8])
	_, err := testDBPool.Exec(ctx, `
		INSERT INTO giki_wallet.users (id, name, email, phone_number, auth_provider, password_hash, password_algo, is_active, is_verified, user_type)
		VALUES ($1, 'Test User', $2, $3, 'local', 'test_hash', 'bcrypt', true, true, 'student')
		ON CONFLICT (id) DO NOTHING
	`, testUserID, email, phoneNumber)
	return err
}

// cleanupTestUser removes the test user from the database
// Set SKIP_TEST_CLEANUP=1 to keep data for inspection
func cleanupTestUser() {
	if os.Getenv("SKIP_TEST_CLEANUP") == "1" {
		fmt.Printf("\n⚠️  SKIP_TEST_CLEANUP=1: Data left in DB for user %s\n", testUserID)
		return
	}
	ctx := context.Background()
	// First delete ledger entries, then wallets, audit logs, transactions, then user
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.payment_audit_log WHERE user_id = $1", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.gateway_transactions WHERE user_id = $1", testUserID)
	testDBPool.Exec(ctx, "DELETE FROM giki_wallet.users WHERE id = $1", testUserID)
}

// createIntegrationTestContext creates a context with the test user ID
func createIntegrationTestContext() context.Context {
	return auth.SetUserInContext(context.Background(), testUserID, "")
}

// cleanupTestTransactions removes test transactions
func cleanupTestTransactions(t *testing.T) {
	ctx := context.Background()
	_, err := testDBPool.Exec(ctx,
		"DELETE FROM giki_wallet.payment_audit_log WHERE user_id = $1", testUserID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup audit logs: %v", err)
	}
	_, err = testDBPool.Exec(ctx,
		"DELETE FROM giki_wallet.gateway_transactions WHERE user_id = $1", testUserID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup test transactions: %v", err)
	}
}

// =============================================================================
// INTEGRATION TESTS: MWALLET FLOW
// =============================================================================

func TestIntegration_MWalletPayment_Success(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	// Set mock gateway to return success
	mockGateway.SetScenario(testutils.ScenarioSuccess)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Initiate payment (no transaction wrapper - service handles its own DB operations)
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

	// Verify result
	if result.Status != PaymentStatusSuccess {
		t.Errorf("Expected status SUCCESS, got %s", result.Status)
	}
	if result.PaymentMethod != PaymentMethodMWallet {
		t.Errorf("Expected payment method MWALLET, got %s", result.PaymentMethod)
	}
	if result.TxnRefNo == "" {
		t.Error("TxnRefNo should not be empty")
	}

	// Verify transaction in database
	q := payment.New(testDBPool)
	txn, err := q.GetTransactionByTxnRefNo(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get transaction from database: %v", err)
	}
	if txn.Status != payment.CurrentStatusSUCCESS {
		t.Errorf("DB status mismatch: expected SUCCESS, got %s", txn.Status)
	}
	if txn.Amount != 50000 {
		t.Errorf("Amount mismatch: expected 50000, got %d", txn.Amount)
	}
}

func TestIntegration_MWalletPayment_Pending(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	// Set mock gateway to return pending for both MWallet and Inquiry
	mockGateway.SetScenario(testutils.ScenarioPending)
	mockGateway.SetInquiryScenario(testutils.ScenarioPending)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

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

	// Pending status means user needs to confirm on their phone
	if result.Status != PaymentStatusPending {
		t.Errorf("Expected status PENDING, got %s", result.Status)
	}

	// Verify database has PENDING status
	q := payment.New(testDBPool)
	txn, err := q.GetTransactionByTxnRefNo(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get transaction: %v", err)
	}
	if txn.Status != payment.CurrentStatusPENDING {
		t.Errorf("DB status mismatch: expected PENDING, got %s", txn.Status)
	}
}

func TestIntegration_MWalletPayment_Failed(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	// Set mock gateway to return failure for both MWallet and Inquiry
	mockGateway.SetScenario(testutils.ScenarioFailed)
	mockGateway.SetInquiryScenario(testutils.ScenarioFailed)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

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

	if result.Status != PaymentStatusFailed {
		t.Errorf("Expected status FAILED, got %s", result.Status)
	}
}

// =============================================================================
// INTEGRATION TESTS: IDEMPOTENCY
// =============================================================================

func TestIntegration_Idempotency_SameKeyReturnsSameResult(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// First request
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

	// Second request with same idempotency key
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

	// Should return the same transaction
	if result1.ID != result2.ID {
		t.Errorf("Idempotency failed: different IDs returned. First: %s, Second: %s", result1.ID, result2.ID)
	}
	if result1.TxnRefNo != result2.TxnRefNo {
		t.Errorf("Idempotency failed: different TxnRefNo. First: %s, Second: %s", result1.TxnRefNo, result2.TxnRefNo)
	}
}

func TestIntegration_Idempotency_FailedTransactionAllowsRetry(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// First request - FAILED (set both MWallet and Inquiry to failed)
	mockGateway.SetScenario(testutils.ScenarioFailed)
	mockGateway.SetInquiryScenario(testutils.ScenarioFailed)

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

	if result1.Status != PaymentStatusFailed {
		t.Fatalf("First request should have failed, got %s", result1.Status)
	}

	// Second request with same idempotency key should retry the existing transaction
	mockGateway.SetScenario(testutils.ScenarioSuccess)
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess) // Also set inquiry to success for retry

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

	// Should reuse the same transaction record (correct idempotency behavior)
	if result1.ID != result2.ID {
		t.Error("Should have reused the same transaction record for retry")
	}
	// But the TxnRefNo should be the same too
	if result1.TxnRefNo != result2.TxnRefNo {
		t.Error("TxnRefNo should be the same for retry")
	}
	if result2.Status != PaymentStatusSuccess {
		t.Errorf("Retry should have succeeded, got %s", result2.Status)
	}
}

// =============================================================================
// INTEGRATION TESTS: CARD FLOW
// =============================================================================

func TestIntegration_CardPayment_InitiateReturnsPaymentPageURL(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000.0,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Card payment returns a payment page URL
	if result.PaymentPageURL == "" {
		t.Error("PaymentPageURL should not be empty for card payment")
	}
	if result.Status != PaymentStatusPending {
		t.Errorf("Initial card status should be PENDING, got %s", result.Status)
	}
	if result.PaymentMethod != PaymentMethodCard {
		t.Errorf("Expected payment method CARD, got %s", result.PaymentMethod)
	}
}

func TestIntegration_CardPayment_InitiateCardPaymentBuildsHTML(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// First create a transaction via InitiatePayment
	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000.0,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Now call initiateCardPayment which builds the HTML form
	html, err := testService.initiateCardPayment(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("initiateCardPayment failed: %v", err)
	}

	// Verify HTML contains expected elements
	if html == "" {
		t.Error("HTML should not be empty")
	}
	if !contains(html, "<form") {
		t.Error("HTML should contain a form element")
	}
	if !contains(html, "pp_Amount") {
		t.Error("HTML should contain pp_Amount field")
	}
	if !contains(html, "pp_SecureHash") {
		t.Error("HTML should contain pp_SecureHash field")
	}
	if !contains(html, result.TxnRefNo) {
		t.Error("HTML should contain the transaction reference number")
	}
}

func TestIntegration_CardCallback_Success(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	mockGateway.SetCardCallbackScenario(testutils.ScenarioSuccess)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create transaction
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000.0,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Simulate callback from JazzCash
	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "000") // 000 = success

	// CompleteCardPayment still requires a transaction (for atomic status + wallet credit)
	tx, _ := testDBPool.Begin(ctx)
	result, err := testService.CompleteCardPayment(ctx, tx, callbackData, uuid.Nil) // uuid.Nil = no audit ID for test
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("CompleteCardPayment failed: %v", err)
	}
	tx.Commit(ctx)

	if result.Status != PaymentStatusSuccess {
		t.Errorf("Expected status SUCCESS, got %s", result.Status)
	}

	// Verify database
	q := payment.New(testDBPool)
	txn, err := q.GetTransactionByTxnRefNo(ctx, initResult.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to get transaction: %v", err)
	}
	if txn.Status != payment.CurrentStatusSUCCESS {
		t.Errorf("DB status mismatch: expected SUCCESS, got %s", txn.Status)
	}
}

func TestIntegration_CardCallback_Failed(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	mockGateway.SetCardCallbackScenario(testutils.ScenarioFailed)

	ctx := createIntegrationTestContext()
	idempotencyKey := uuid.New()

	// Create transaction
	initResult, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         1000.0,
		Method:         PaymentMethodCard,
		IdempotencyKey: idempotencyKey,
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Simulate failed callback
	callbackData := mockGateway.GenerateCardCallbackFormData(initResult.TxnRefNo, "101") // 101 = failed

	tx, err := testDBPool.Begin(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}
	result, err := testService.CompleteCardPayment(ctx, tx, callbackData, uuid.Nil)
	if err != nil {
		tx.Rollback(ctx)
		t.Fatalf("CompleteCardPayment failed: %v", err)
	}
	tx.Commit(ctx)

	if result.Status != PaymentStatusFailed {
		t.Errorf("Expected status FAILED, got %s", result.Status)
	}
}

// =============================================================================
// INTEGRATION TESTS: VALIDATION
// =============================================================================

func TestIntegration_Validation_InvalidPhoneNumber(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	ctx := createIntegrationTestContext()

	_, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "invalid",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: uuid.New(),
	})

	if err == nil {
		t.Error("Expected error for invalid phone number")
	}
	if !contains(err.Error(), "phone") {
		t.Errorf("Error should mention phone number: %v", err)
	}
}

func TestIntegration_Validation_InvalidCNIC(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	ctx := createIntegrationTestContext()

	_, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "12", // Too short
		Method:         PaymentMethodMWallet,
		IdempotencyKey: uuid.New(),
	})

	if err == nil {
		t.Error("Expected error for invalid CNIC")
	}
	if !contains(err.Error(), "CNIC") {
		t.Errorf("Error should mention CNIC: %v", err)
	}
}

func TestIntegration_Validation_NoUserInContext(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	// Use context WITHOUT user ID
	ctx := context.Background()

	_, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: uuid.New(),
	})

	if err == nil {
		t.Error("Expected error when user ID not in context")
	}
	if err != ErrUserIDNotFound {
		t.Errorf("Expected ErrUserIDNotFound, got: %v", err)
	}
}

// =============================================================================
// INTEGRATION TESTS: DATABASE OPERATIONS
// =============================================================================

func TestIntegration_Database_TransactionPersistence(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioSuccess)
	ctx := createIntegrationTestContext()

	result, err := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         750.0,
		PhoneNumber:    "03009876543",
		CNICLast6:      "654321",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: uuid.New(),
	})
	if err != nil {
		t.Fatalf("InitiatePayment failed: %v", err)
	}

	// Query the database directly to verify all fields
	q := payment.New(testDBPool)
	txn, err := q.GetTransactionByTxnRefNo(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("Failed to retrieve transaction: %v", err)
	}

	// Verify all fields
	if txn.UserID != testUserID {
		t.Errorf("UserID mismatch: expected %s, got %s", testUserID, txn.UserID)
	}
	if txn.Amount != 75000 {
		t.Errorf("Amount mismatch: expected 75000, got %d", txn.Amount)
	}
	if txn.PaymentMethod != string(PaymentMethodMWallet) {
		t.Errorf("PaymentMethod mismatch: expected %s, got %s", PaymentMethodMWallet, txn.PaymentMethod)
	}
	if txn.TxnRefNo == "" {
		t.Error("TxnRefNo should not be empty")
	}
	if txn.BillRefID == "" {
		t.Error("BillRefID should not be empty")
	}
	if txn.CreatedAt.IsZero() {
		t.Error("CreatedAt should be set")
	}
}

func TestIntegration_Database_PollingStatus(t *testing.T) {
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioPending)
	ctx := createIntegrationTestContext()

	result, _ := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: uuid.New(),
	})

	q := payment.New(testDBPool)

	// Test UpdatePollingStatus - first time should succeed
	_, err := q.UpdatePollingStatus(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("First UpdatePollingStatus should succeed: %v", err)
	}

	// Second call should fail (already polling)
	_, err = q.UpdatePollingStatus(ctx, result.TxnRefNo)
	if err == nil {
		t.Error("Second UpdatePollingStatus should fail (already polling)")
	}

	// Clear polling status
	err = q.ClearPollingStatus(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("ClearPollingStatus failed: %v", err)
	}

	// Now UpdatePollingStatus should work again
	_, err = q.UpdatePollingStatus(ctx, result.TxnRefNo)
	if err != nil {
		t.Fatalf("UpdatePollingStatus after clear should succeed: %v", err)
	}
}

// =============================================================================
// INTEGRATION TESTS: INQUIRY
// =============================================================================

func TestIntegration_Inquiry_Success(t *testing.T) {
	// Create a transaction first
	cleanupTestTransactions(t)
	defer cleanupTestTransactions(t)

	mockGateway.SetScenario(testutils.ScenarioPending)
	ctx := createIntegrationTestContext()

	result, _ := testService.InitiatePayment(ctx, TopUpRequest{
		Amount:         500.0,
		PhoneNumber:    "03001234567",
		CNICLast6:      "123456",
		Method:         PaymentMethodMWallet,
		IdempotencyKey: uuid.New(),
	})

	// Set inquiry to return success
	mockGateway.SetInquiryScenario(testutils.ScenarioSuccess)

	// Call inquiry
	inquiryResult, err := testService.gatewayClient.Inquiry(ctx, gateway.InquiryRequest{TxnRefNo: result.TxnRefNo})
	if err != nil {
		t.Fatalf("Inquiry failed: %v", err)
	}

	if inquiryResult.Status != gateway.StatusSuccess {
		t.Errorf("Expected inquiry status SUCCESS, got %s", inquiryResult.Status)
	}
}

// =============================================================================
// BENCHMARKS
// =============================================================================

func BenchmarkIntegration_MWalletPayment(b *testing.B) {
	mockGateway.SetScenario(testutils.ScenarioSuccess)
	ctx := createIntegrationTestContext()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		testService.InitiatePayment(ctx, TopUpRequest{
			Amount:         500.0,
			PhoneNumber:    "03001234567",
			CNICLast6:      "123456",
			Method:         PaymentMethodMWallet,
			IdempotencyKey: uuid.New(),
		})
	}

	// Cleanup
	cleanupBenchmarkTransactions()
}

func cleanupBenchmarkTransactions() {
	testDBPool.Exec(context.Background(),
		"DELETE FROM giki_wallet.gateway_transactions WHERE user_id = $1", testUserID)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// waitForCondition waits for a condition to be true with timeout
func waitForCondition(timeout time.Duration, interval time.Duration, condition func() bool) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return true
		}
		time.Sleep(interval)
	}
	return false
}
