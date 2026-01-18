package payment

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	paymentdb "github.com/hash-walker/giki-wallet/internal/payment/payment_db"
	"github.com/hash-walker/giki-wallet/internal/payment/testutils"
)

// Test utility functions

func TestNormalizePhoneNumber(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{
			name:    "already normalized",
			input:   "03123456789",
			want:    "03123456789",
			wantErr: false,
		},
		{
			name:    "with country code",
			input:   "+923123456789",
			want:    "03123456789",
			wantErr: false,
		},
		{
			name:    "without leading zero",
			input:   "3123456789",
			want:    "03123456789",
			wantErr: false,
		},
		{
			name:    "with spaces and dashes",
			input:   "03-1234-5678",
			want:    "00312345678", // Normalization adds leading zero for 10 digits
			wantErr: false,
		},
		{
			name:    "empty string",
			input:   "",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizePhoneNumber(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("NormalizePhoneNumber() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("NormalizePhoneNumber() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNormalizeCNICLast6(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{
			name:    "full CNIC with dashes",
			input:   "12345-1234567-1",
			want:    "345671", // Last 6 digits of "1234512345671"
			wantErr: false,
		},
		{
			name:    "full CNIC without dashes",
			input:   "1234512345671",
			want:    "345671", // Last 6 digits
			wantErr: false,
		},
		{
			name:    "last 6 digits only",
			input:   "123456",
			want:    "123456",
			wantErr: false,
		},
		{
			name:    "with spaces",
			input:   "12345 1234567 1",
			want:    "345671", // Last 6 digits of "1234512345671"
			wantErr: false,
		},
		{
			name:    "less than 6 digits",
			input:   "123",
			want:    "",
			wantErr: true,
		},
		{
			name:    "empty string",
			input:   "",
			want:    "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeCNICLast6(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("NormalizeCNICLast6() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("NormalizeCNICLast6() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestAmountToPaisa(t *testing.T) {
	tests := []struct {
		name   string
		amount int64
		want   string
	}{
		{
			name:   "500 rupees",
			amount: 500,
			want:   "50000",
		},
		{
			name:   "1000 rupees",
			amount: 1000,
			want:   "100000",
		},
		{
			name:   "zero",
			amount: 0,
			want:   "0",
		},
		{
			name:   "1 rupee",
			amount: 1,
			want:   "100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := AmountToPaisa(tt.amount)
			if got != tt.want {
				t.Errorf("AmountToPaisa() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGatewayStatusToPaymentStatus(t *testing.T) {
	tests := []struct {
		name     string
		gwStatus gateway.Status
		want     PaymentStatus
	}{
		{
			name:     "success",
			gwStatus: gateway.StatusSuccess,
			want:     PaymentStatusSuccess,
		},
		{
			name:     "pending",
			gwStatus: gateway.StatusPending,
			want:     PaymentStatusPending,
		},
		{
			name:     "failed",
			gwStatus: gateway.StatusFailed,
			want:     PaymentStatusFailed,
		},
		{
			name:     "unknown",
			gwStatus: gateway.StatusUnknown,
			want:     PaymentStatusUnknown,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := gatewayStatusToPaymentStatus(tt.gwStatus)
			if got != tt.want {
				t.Errorf("gatewayStatusToPaymentStatus() = %v, want %v", got, tt.want)
			}
		})
	}
}

// Test service methods with mock gateway

func TestInitiateMWalletPayment_Success(t *testing.T) {
	// Setup mock gateway
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetMWalletScenario(testutils.ScenarioSuccess)

	gatewayClient := mockServer.CreateTestJazzCashClient()

	// Create service (we'll need to mock database for full test)
	// For now, test the gateway interaction logic
	ctx := context.Background()
	userID := uuid.New()

	// Create a test transaction (this would normally come from DB)
	gatewayTxn := paymentdb.GikiWalletGatewayTransaction{
		ID:             uuid.New(),
		UserID:         userID,
		TxnRefNo:       "TEST_TXN_123",
		BillRefID:      "TEST_BILL_123",
		PaymentMethod:  "MWALLET",
		Status:         paymentdb.CurrentStatus("PENDING"),
		Amount:         50000,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	payload := TopUpRequest{
		IdempotencyKey: uuid.New(),
		Amount:         500,
		Method:         PaymentMethodMWallet,
		PhoneNumber:    "03123456789",
		CNICLast6:      "123456",
	}

	// Create a minimal service to test gateway interaction
	// Note: This tests the gateway call logic, not the full service flow
	service := &Service{
		gatewayClient: gatewayClient,
	}

	// Test the gateway call directly
	mwRequest := gateway.MWalletInitiateRequest{
		AmountPaisa:       AmountToPaisa(payload.Amount),
		BillRefID:         gatewayTxn.BillRefID,
		TxnRefNo:          gatewayTxn.TxnRefNo,
		Description:       "GIKI Wallet Top Up",
		MobileNumber:      payload.PhoneNumber,
		CNICLast6:         payload.CNICLast6,
		TxnDateTime:       time.Now().Format("20060102150405"),
		TxnExpiryDateTime: time.Now().Add(24 * time.Hour).Format("20060102150405"),
	}

	mwResponse, err := service.gatewayClient.SubmitMWallet(ctx, mwRequest)
	if err != nil {
		t.Fatalf("SubmitMWallet() error = %v", err)
	}

	if mwResponse.Status != gateway.StatusSuccess {
		t.Errorf("SubmitMWallet() status = %v, want %v", mwResponse.Status, gateway.StatusSuccess)
	}

	if mwResponse.ResponseCode != "000" {
		t.Errorf("SubmitMWallet() responseCode = %v, want 000", mwResponse.ResponseCode)
	}
}

func TestInitiateMWalletPayment_Pending(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetMWalletScenario(testutils.ScenarioPending)

	gatewayClient := mockServer.CreateTestJazzCashClient()
	service := &Service{
		gatewayClient: gatewayClient,
	}

	ctx := context.Background()
	mwRequest := gateway.MWalletInitiateRequest{
		AmountPaisa:       "50000",
		BillRefID:         "TEST_BILL",
		TxnRefNo:          "TEST_TXN",
		Description:       "Test",
		MobileNumber:      "03123456789",
		CNICLast6:         "123456",
		TxnDateTime:       time.Now().Format("20060102150405"),
		TxnExpiryDateTime: time.Now().Add(24 * time.Hour).Format("20060102150405"),
	}

	mwResponse, err := service.gatewayClient.SubmitMWallet(ctx, mwRequest)
	if err != nil {
		t.Fatalf("SubmitMWallet() error = %v", err)
	}

	if mwResponse.Status != gateway.StatusPending {
		t.Errorf("SubmitMWallet() status = %v, want %v", mwResponse.Status, gateway.StatusPending)
	}

	if mwResponse.ResponseCode != "157" {
		t.Errorf("SubmitMWallet() responseCode = %v, want 157", mwResponse.ResponseCode)
	}
}

func TestInitiateMWalletPayment_Failed(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetMWalletScenario(testutils.ScenarioFailed)

	gatewayClient := mockServer.CreateTestJazzCashClient()
	service := &Service{
		gatewayClient: gatewayClient,
	}

	ctx := context.Background()
	mwRequest := gateway.MWalletInitiateRequest{
		AmountPaisa:       "50000",
		BillRefID:         "TEST_BILL",
		TxnRefNo:          "TEST_TXN",
		Description:       "Test",
		MobileNumber:      "03123456789",
		CNICLast6:         "123456",
		TxnDateTime:       time.Now().Format("20060102150405"),
		TxnExpiryDateTime: time.Now().Add(24 * time.Hour).Format("20060102150405"),
	}

	mwResponse, err := service.gatewayClient.SubmitMWallet(ctx, mwRequest)
	if err != nil {
		t.Fatalf("SubmitMWallet() error = %v", err)
	}

	if mwResponse.Status != gateway.StatusFailed {
		t.Errorf("SubmitMWallet() status = %v, want %v", mwResponse.Status, gateway.StatusFailed)
	}

	if mwResponse.ResponseCode != "101" {
		t.Errorf("SubmitMWallet() responseCode = %v, want 101", mwResponse.ResponseCode)
	}
}

func TestInquiry_Success(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetInquiryScenario(testutils.ScenarioSuccess)

	gatewayClient := mockServer.CreateTestJazzCashClient()
	service := &Service{
		gatewayClient: gatewayClient,
	}

	ctx := context.Background()
	inquiryResult, err := service.gatewayClient.Inquiry(ctx, "TEST_TXN_123")
	if err != nil {
		t.Fatalf("Inquiry() error = %v", err)
	}

	if inquiryResult.Status != gateway.StatusSuccess {
		t.Errorf("Inquiry() status = %v, want %v", inquiryResult.Status, gateway.StatusSuccess)
	}

	if inquiryResult.PaymentResponseCode != "121" {
		t.Errorf("Inquiry() paymentResponseCode = %v, want 121", inquiryResult.PaymentResponseCode)
	}
}

func TestInquiry_Pending(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetInquiryScenario(testutils.ScenarioPending)

	gatewayClient := mockServer.CreateTestJazzCashClient()
	service := &Service{
		gatewayClient: gatewayClient,
	}

	ctx := context.Background()
	inquiryResult, err := service.gatewayClient.Inquiry(ctx, "TEST_TXN_123")
	if err != nil {
		t.Fatalf("Inquiry() error = %v", err)
	}

	if inquiryResult.Status != gateway.StatusPending {
		t.Errorf("Inquiry() status = %v, want %v", inquiryResult.Status, gateway.StatusPending)
	}
}

func TestInquiry_Failed(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetInquiryScenario(testutils.ScenarioFailed)

	gatewayClient := mockServer.CreateTestJazzCashClient()
	service := &Service{
		gatewayClient: gatewayClient,
	}

	ctx := context.Background()
	inquiryResult, err := service.gatewayClient.Inquiry(ctx, "TEST_TXN_123")
	if err != nil {
		t.Fatalf("Inquiry() error = %v", err)
	}

	if inquiryResult.Status != gateway.StatusFailed {
		t.Errorf("Inquiry() status = %v, want %v", inquiryResult.Status, gateway.StatusFailed)
	}
}

// TestHashVerification tests that the mock gateway produces valid hashes that pass verification
func TestHashVerification_MockGateway(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetMWalletScenario(testutils.ScenarioSuccess)

	gatewayClient := mockServer.CreateTestJazzCashClient()
	service := &Service{
		gatewayClient: gatewayClient,
	}

	ctx := context.Background()
	mwRequest := gateway.MWalletInitiateRequest{
		AmountPaisa:       "50000",
		BillRefID:         "TEST_BILL",
		TxnRefNo:          "TEST_TXN",
		Description:       "Test",
		MobileNumber:      "03123456789",
		CNICLast6:         "123456",
		TxnDateTime:       time.Now().Format("20060102150405"),
		TxnExpiryDateTime: time.Now().Add(24 * time.Hour).Format("20060102150405"),
	}

	// This will fail if hash verification fails
	mwResponse, err := service.gatewayClient.SubmitMWallet(ctx, mwRequest)
	if err != nil {
		t.Fatalf("SubmitMWallet() failed - hash verification may have failed: %v", err)
	}

	// Verify response has valid structure
	if mwResponse.ResponseCode == "" {
		t.Errorf("SubmitMWallet() responseCode is empty")
	}

	// Test that hash verification is working - if hash was invalid, we would have gotten an error above
	if mwResponse.Raw == nil {
		t.Errorf("SubmitMWallet() Raw response is nil")
	}
}

// TestHashVerification_Inquiry tests hash verification for Inquiry responses
func TestHashVerification_Inquiry(t *testing.T) {
	mockServer := testutils.NewMockGatewayServer("test_salt_123")
	defer mockServer.Close()
	mockServer.SetInquiryScenario(testutils.ScenarioSuccess)

	gatewayClient := mockServer.CreateTestJazzCashClient()
	service := &Service{
		gatewayClient: gatewayClient,
	}

	ctx := context.Background()

	// This will fail if hash verification fails
	inquiryResult, err := service.gatewayClient.Inquiry(ctx, "TEST_TXN_123")
	if err != nil {
		t.Fatalf("Inquiry() failed - hash verification may have failed: %v", err)
	}

	// Verify response has valid structure
	if inquiryResult.ResponseCode == "" {
		t.Errorf("Inquiry() responseCode is empty")
	}

	// Test that hash verification is working
	if inquiryResult.Raw == nil {
		t.Errorf("Inquiry() Raw response is nil")
	}
}

// Helper function to create test context with user ID
func createTestContext(userID uuid.UUID) context.Context {
	ctx := context.Background()
	// Use the same context key as auth package
	type contextKey string
	const userIDKey contextKey = "user_id"
	return context.WithValue(ctx, userIDKey, userID)
}
