package payment

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hash-walker/giki-wallet/internal/payment/testutils"
)

// TestHandleServiceError_ValidationErrors removed as the method (handleServiceError) no longer exists.
// Error handling is now delegated directly to middleware.HandleError which is coverd by its own tests.

// =============================================================================
// TOP UP HANDLER TESTS (without DB - just request parsing)
// =============================================================================

func TestTopUp_InvalidJSON(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()

	gatewayClient := mockServer.CreateTestJazzCashClient()
	rateLimiter := NewRateLimiter(5)
	service := &Service{
		gatewayClient: gatewayClient,
		rateLimiter:   rateLimiter,
		// Note: dbPool is nil, so any DB operation would panic
		// This tests that invalid JSON is caught before DB operations
	}
	handler := NewHandler(service, nil) // nil wallet service - not used in these tests

	req := httptest.NewRequest(http.MethodPost, "/payment/topup", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.TopUp(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("TopUp() with invalid JSON status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

func TestTopUp_EmptyBody(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()

	gatewayClient := mockServer.CreateTestJazzCashClient()
	rateLimiter := NewRateLimiter(5)
	service := &Service{
		gatewayClient: gatewayClient,
		rateLimiter:   rateLimiter,
	}
	handler := NewHandler(service, nil) // nil wallet service - not used in these tests

	req := httptest.NewRequest(http.MethodPost, "/payment/topup", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.TopUp(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("TopUp() with empty body status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// =============================================================================
// CARD PAYMENT PAGE HANDLER TESTS
// =============================================================================

// NOTE: TestCardPaymentPage requires a database connection to work properly.
// The handler calls initiateCardPayment which queries the database.
// For full integration tests, use a test database or mock the queries.
// These tests are skipped in unit test mode.

// =============================================================================
// CARD CALLBACK HANDLER TESTS
// =============================================================================

// NOTE: TestCardCallback_* tests require a database connection.
// The handler calls service.dbPool.Begin() which needs a real connection.
// For full integration tests, use a test database.
// These tests are designed for integration test environment.

// =============================================================================
// REQUEST/RESPONSE MODEL TESTS
// =============================================================================

func TestTopUpRequest_JSON(t *testing.T) {
	jsonStr := `{
		"idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
		"amount": 1000,
		"method": "MWALLET",
		"phone_number": "03123456789",
		"cnic_last6": "123456"
	}`

	var req TopUpRequest
	err := json.Unmarshal([]byte(jsonStr), &req)
	if err != nil {
		t.Fatalf("TopUpRequest JSON unmarshal error: %v", err)
	}

	if req.Amount != 1000.0 {
		t.Errorf("TopUpRequest.Amount = %f, want 1000.0", req.Amount)
	}

	if req.Method != PaymentMethodMWallet {
		t.Errorf("TopUpRequest.Method = %v, want %v", req.Method, PaymentMethodMWallet)
	}

	if req.PhoneNumber != "03123456789" {
		t.Errorf("TopUpRequest.PhoneNumber = %v, want 03123456789", req.PhoneNumber)
	}
}

func TestTopUpRequest_CardJSON(t *testing.T) {
	jsonStr := `{
		"idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
		"amount": 2000,
		"method": "CARD"
	}`

	var req TopUpRequest
	err := json.Unmarshal([]byte(jsonStr), &req)
	if err != nil {
		t.Fatalf("TopUpRequest JSON unmarshal error: %v", err)
	}

	if req.Amount != 2000.0 {
		t.Errorf("TopUpRequest.Amount = %f, want 2000.0", req.Amount)
	}

	if req.Method != PaymentMethodCard {
		t.Errorf("TopUpRequest.Method = %v, want %v", req.Method, PaymentMethodCard)
	}

	// Card payments don't require phone/cnic
	if req.PhoneNumber != "" {
		t.Errorf("TopUpRequest.PhoneNumber should be empty for card, got %v", req.PhoneNumber)
	}
}

func TestTopUpResult_JSON(t *testing.T) {
	result := TopUpResult{
		TxnRefNo:       "GIKITU20240119ABC",
		Status:         PaymentStatusPending,
		Message:        "Transaction pending",
		PaymentMethod:  PaymentMethodCard,
		PaymentPageURL: "https://example.com/payment/page/GIKITU20240119ABC",
		Amount:         1000,
	}

	jsonBytes, err := json.Marshal(result)
	if err != nil {
		t.Fatalf("TopUpResult JSON marshal error: %v", err)
	}

	jsonStr := string(jsonBytes)

	// Check required fields are present
	if !strings.Contains(jsonStr, "txn_ref_no") {
		t.Errorf("TopUpResult JSON should contain txn_ref_no")
	}

	if !strings.Contains(jsonStr, "PENDING") {
		t.Errorf("TopUpResult JSON should contain status PENDING")
	}

	if !strings.Contains(jsonStr, "redirect") {
		t.Errorf("TopUpResult JSON should contain redirect (payment page URL)")
	}
}

// =============================================================================
// PAYMENT STATUS TESTS
// =============================================================================

func TestPaymentStatus_Values(t *testing.T) {
	statuses := []PaymentStatus{
		PaymentStatusPending,
		PaymentStatusSuccess,
		PaymentStatusFailed,
		PaymentStatusUnknown,
	}

	for _, status := range statuses {
		if status == "" {
			t.Errorf("PaymentStatus should not be empty string")
		}
	}

	// Check distinct values
	if PaymentStatusPending == PaymentStatusSuccess {
		t.Errorf("PaymentStatusPending and PaymentStatusSuccess should be different")
	}
}

func TestPaymentMethod_Values(t *testing.T) {
	if PaymentMethodMWallet != "MWALLET" {
		t.Errorf("PaymentMethodMWallet = %v, want MWALLET", PaymentMethodMWallet)
	}

	if PaymentMethodCard != "CARD" {
		t.Errorf("PaymentMethodCard = %v, want CARD", PaymentMethodCard)
	}
}
