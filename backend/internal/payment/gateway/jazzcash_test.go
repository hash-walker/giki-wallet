package gateway

import (
	"testing"
)

func TestJazzcashSecureHash(t *testing.T) {
	client := &JazzCashClient{
		integritySalt: "test_salt_123",
	}

	tests := []struct {
		name      string
		fields    JazzCashFields
		wantError bool
	}{
		{
			name: "basic MWallet fields",
			fields: JazzCashFields{
				"pp_Version":        "2.0",
				"pp_TxnType":        "MWALLET",
				"pp_MerchantID":      "TEST_MERCHANT",
				"pp_Password":       "TEST_PASSWORD",
				"pp_Amount":         "50000",
				"pp_TxnRefNo":       "TEST_TXN_123",
				"pp_BillReference":  "TEST_BILL",
				"pp_Description":    "Test payment",
				"pp_MobileNumber":   "03123456789",
				"pp_CNIC":           "123456",
				"pp_TxnDateTime":    "20240101120000",
			},
			wantError: false,
		},
		{
			name: "fields with empty values excluded",
			fields: JazzCashFields{
				"pp_Version":       "2.0",
				"pp_TxnType":       "MWALLET",
				"pp_MerchantID":    "TEST_MERCHANT",
				"pp_Amount":        "50000",
				"pp_EmptyField":    "", // Should be excluded
				"pp_SecureHash":    "EXISTING_HASH", // Should be excluded
				"non_pp_field":     "should_be_excluded",
			},
			wantError: false,
		},
		{
			name:      "empty fields",
			fields:    JazzCashFields{},
			wantError: false, // Empty fields should still produce a hash
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash1, err := client.JazzcashSecureHash(tt.fields)
			if (err != nil) != tt.wantError {
				t.Errorf("JazzcashSecureHash() error = %v, wantError %v", err, tt.wantError)
				return
			}
			if !tt.wantError && hash1 == "" {
				t.Errorf("JazzcashSecureHash() returned empty hash")
			}

			// Test idempotency - same input should produce same hash
			hash2, err := client.JazzcashSecureHash(tt.fields)
			if err != nil {
				t.Errorf("JazzcashSecureHash() second call error = %v", err)
				return
			}
			if hash1 != hash2 {
				t.Errorf("JazzcashSecureHash() not idempotent: first = %v, second = %v", hash1, hash2)
			}

			// Hash should be uppercase hex
			if len(hash1) != 64 {
				t.Errorf("JazzcashSecureHash() hash length = %d, want 64 (SHA256 hex)", len(hash1))
			}
		})
	}
}

func TestJazzcashSecureHash_FieldOrdering(t *testing.T) {
	client := &JazzCashClient{
		integritySalt: "test_salt_123",
	}

	// Same fields in different order should produce same hash
	fields1 := JazzCashFields{
		"pp_Amount":      "50000",
		"pp_MerchantID":  "TEST_MERCHANT",
		"pp_TxnRefNo":    "TEST_TXN",
		"pp_BillReference": "TEST_BILL",
	}

	fields2 := JazzCashFields{
		"pp_BillReference": "TEST_BILL",
		"pp_TxnRefNo":    "TEST_TXN",
		"pp_MerchantID":  "TEST_MERCHANT",
		"pp_Amount":      "50000",
	}

	hash1, err := client.JazzcashSecureHash(fields1)
	if err != nil {
		t.Fatalf("JazzcashSecureHash() error = %v", err)
	}

	hash2, err := client.JazzcashSecureHash(fields2)
	if err != nil {
		t.Fatalf("JazzcashSecureHash() error = %v", err)
	}

	if hash1 != hash2 {
		t.Errorf("JazzcashSecureHash() different hashes for same fields in different order: hash1 = %v, hash2 = %v", hash1, hash2)
	}
}

func TestJazzcashSecureHash_ExcludesSecureHash(t *testing.T) {
	client := &JazzCashClient{
		integritySalt: "test_salt_123",
	}

	fieldsWithoutHash := JazzCashFields{
		"pp_Amount":     "50000",
		"pp_MerchantID": "TEST_MERCHANT",
		"pp_TxnRefNo":   "TEST_TXN",
	}

	fieldsWithHash := JazzCashFields{
		"pp_Amount":     "50000",
		"pp_MerchantID": "TEST_MERCHANT",
		"pp_TxnRefNo":   "TEST_TXN",
		"pp_SecureHash": "SOME_HASH_VALUE",
	}

	hash1, err := client.JazzcashSecureHash(fieldsWithoutHash)
	if err != nil {
		t.Fatalf("JazzcashSecureHash() error = %v", err)
	}

	hash2, err := client.JazzcashSecureHash(fieldsWithHash)
	if err != nil {
		t.Fatalf("JazzcashSecureHash() error = %v", err)
	}

	// Hashes should be the same because pp_SecureHash is excluded
	if hash1 != hash2 {
		t.Errorf("JazzcashSecureHash() should exclude pp_SecureHash: hash1 = %v, hash2 = %v", hash1, hash2)
	}
}

func TestVerifyResponseHash(t *testing.T) {
	client := &JazzCashClient{
		integritySalt: "test_salt_123",
	}

	// Create a valid response with correct hash
	response := map[string]any{
		"pp_ResponseCode": "000",
		"pp_TxnRefNo":     "TEST_TXN",
		"pp_Amount":       "50000",
	}

	// Compute hash for response (excluding pp_SecureHash)
	fields := make(JazzCashFields)
	for k, v := range response {
		fields[k] = toString(v)
	}
	expectedHash, err := client.JazzcashSecureHash(fields)
	if err != nil {
		t.Fatalf("JazzcashSecureHash() error = %v", err)
	}

	// Add hash to response
	response["pp_SecureHash"] = expectedHash

	// Verify valid hash
	err = client.verifyResponseHash(response)
	if err != nil {
		t.Errorf("verifyResponseHash() with valid hash error = %v", err)
	}
}

func TestVerifyResponseHash_InvalidHash(t *testing.T) {
	client := &JazzCashClient{
		integritySalt: "test_salt_123",
	}

	response := map[string]any{
		"pp_ResponseCode": "000",
		"pp_TxnRefNo":     "TEST_TXN",
		"pp_Amount":       "50000",
		"pp_SecureHash":   "INVALID_HASH_VALUE",
	}

	err := client.verifyResponseHash(response)
	if err == nil {
		t.Errorf("verifyResponseHash() with invalid hash should return error")
	}
}

func TestVerifyResponseHash_MissingHash(t *testing.T) {
	client := &JazzCashClient{
		integritySalt: "test_salt_123",
	}

	response := map[string]any{
		"pp_ResponseCode": "000",
		"pp_TxnRefNo":     "TEST_TXN",
		"pp_Amount":       "50000",
		// Missing pp_SecureHash
	}

	err := client.verifyResponseHash(response)
	if err == nil {
		t.Errorf("verifyResponseHash() with missing hash should return error")
	}
}

func TestVerifyResponseHash_EmptyResponse(t *testing.T) {
	client := &JazzCashClient{
		integritySalt: "test_salt_123",
	}

	response := map[string]any{}

	err := client.verifyResponseHash(response)
	if err == nil {
		t.Errorf("verifyResponseHash() with empty response should return error")
	}
}

// Helper function to convert any to string
func toString(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
