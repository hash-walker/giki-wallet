package testutils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"

	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
)

// MockGatewayServer represents a mock JazzCash gateway server for testing
type MockGatewayServer struct {
	server            *httptest.Server
	integritySalt     string
	mwResponseCode    string // Response code for MWallet requests
	inquiryResponseCode string // Response code for Inquiry requests
	mu                sync.RWMutex // Protect response codes
}

// Scenario represents different test scenarios
type Scenario string

const (
	ScenarioSuccess Scenario = "success"
	ScenarioPending Scenario = "pending"
	ScenarioFailed  Scenario = "failed"
)

// NewMockGatewayServer creates a new mock gateway server
func NewMockGatewayServer(integritySalt string) *MockGatewayServer {
	mock := &MockGatewayServer{
		integritySalt:      integritySalt,
		mwResponseCode:      "000", // Default: SUCCESS
		inquiryResponseCode: "000", // Default: SUCCESS
	}

	mux := http.NewServeMux()
	// Handle MWallet on both endpoints (since SubmitMWallet currently uses statusInquiryURL)
	mux.HandleFunc("/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction", mock.handleMWallet)
	mux.HandleFunc("/ApplicationAPI/API/PaymentInquiry/Inquire", mock.handleInquiryOrMWallet)

	mock.server = httptest.NewServer(mux)
	return mock
}

// SetMWalletScenario sets the response scenario for MWallet requests
func (m *MockGatewayServer) SetMWalletScenario(scenario Scenario) {
	m.mu.Lock()
	defer m.mu.Unlock()
	switch scenario {
	case ScenarioSuccess:
		m.mwResponseCode = "000"
	case ScenarioPending:
		m.mwResponseCode = "157"
	case ScenarioFailed:
		m.mwResponseCode = "101"
	}
}

// SetInquiryScenario sets the response scenario for Inquiry requests
func (m *MockGatewayServer) SetInquiryScenario(scenario Scenario) {
	m.mu.Lock()
	defer m.mu.Unlock()
	switch scenario {
	case ScenarioSuccess:
		m.inquiryResponseCode = "121" // Inquiry success code
	case ScenarioPending:
		m.inquiryResponseCode = "157"
	case ScenarioFailed:
		m.inquiryResponseCode = "101"
	}
}

// URL returns the base URL of the mock server
func (m *MockGatewayServer) URL() string {
	return m.server.URL
}

// Close shuts down the mock server
func (m *MockGatewayServer) Close() {
	m.server.Close()
}

// CreateTestJazzCashClient creates a JazzCashClient configured to use the mock server
func (m *MockGatewayServer) CreateTestJazzCashClient() *gateway.JazzCashClient {
	baseURL := m.server.URL
	return gateway.NewJazzCashClient(
		"TEST_MERCHANT_ID",
		"TEST_PASSWORD",
		m.integritySalt,
		"TEST_MPIN",
		"http://localhost:8080/callback",
		baseURL,
		baseURL+"/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction",
		baseURL+"/ApplicationAPI/API/CardPayment",
		baseURL+"/ApplicationAPI/API/PaymentInquiry/Inquire",
	)
}

// handleMWallet handles MWallet payment requests
func (m *MockGatewayServer) handleMWallet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var requestData map[string]any
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	m.handleMWalletRequest(w, requestData)
}

// handleInquiryOrMWallet handles both Inquiry and MWallet requests (routes based on request content)
func (m *MockGatewayServer) handleInquiryOrMWallet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Peek at request body to determine if it's MWallet or Inquiry
	var requestData map[string]any
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	// Check if it's an MWallet request (has pp_TxnType = "MWALLET" or has pp_MobileNumber)
	if txnType, ok := requestData["pp_TxnType"].(string); ok && txnType == "MWALLET" {
		m.handleMWalletRequest(w, requestData)
		return
	}
	if _, ok := requestData["pp_MobileNumber"]; ok {
		m.handleMWalletRequest(w, requestData)
		return
	}

	// Otherwise, it's an Inquiry request
	m.handleInquiryRequest(w, requestData)
}

// handleMWalletRequest handles MWallet request with already-decoded JSON
func (m *MockGatewayServer) handleMWalletRequest(w http.ResponseWriter, requestData map[string]any) {
	m.mu.RLock()
	responseCode := m.mwResponseCode
	m.mu.RUnlock()

	response := map[string]any{
		"pp_TxnType":              "MWALLET",
		"pp_Version":              "2.0",
		"pp_ResponseCode":         responseCode,
		"pp_ResponseMessage":      m.getResponseMessage(responseCode),
		"pp_RetreivalReferenceNo": "TEST_RRN_" + fmt.Sprintf("%d", len(requestData)),
		"pp_TxnRefNo":             getString(requestData, "pp_TxnRefNo"),
		"pp_BillReference":        getString(requestData, "pp_BillReference"),
		"pp_Amount":               getString(requestData, "pp_Amount"),
		"pp_MobileNumber":         getString(requestData, "pp_MobileNumber"),
		"pp_CNIC":                 getString(requestData, "pp_CNIC"),
		"pp_TxnDateTime":          getString(requestData, "pp_TxnDateTime"),
		"pp_TxnCurrency":          "PKR",
		"pp_Language":             "EN",
		"pp_MerchantID":           getString(requestData, "pp_MerchantID"),
	}

	secureHash := m.computeSecureHash(response)
	response["pp_SecureHash"] = secureHash

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleInquiryRequest handles Inquiry request with already-decoded JSON
func (m *MockGatewayServer) handleInquiryRequest(w http.ResponseWriter, requestData map[string]any) {
	m.mu.RLock()
	inquiryCode := m.inquiryResponseCode
	m.mu.RUnlock()

	response := map[string]any{
		"pp_ResponseCode":         "000",
		"pp_ResponseMessage":      "The requested operation has been performed successfully.",
		"pp_PaymentResponseCode":  inquiryCode,
		"pp_PaymentResponseMessage": m.getResponseMessage(inquiryCode),
		"pp_Status":               m.getStatus(inquiryCode),
		"pp_RetreivalReferenceNo": "TEST_RRN_" + fmt.Sprintf("%d", len(requestData)),
		"pp_TxnRefNo":             getString(requestData, "pp_TxnRefNo"),
		"pp_MerchantID":           getString(requestData, "pp_MerchantID"),
	}

	secureHash := m.computeSecureHash(response)
	response["pp_SecureHash"] = secureHash

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// handleInquiry handles Inquiry requests (kept for backward compatibility)
func (m *MockGatewayServer) handleInquiry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var requestData map[string]any
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON: %v", err), http.StatusBadRequest)
		return
	}

	m.handleInquiryRequest(w, requestData)
}

// computeSecureHash computes the secure hash using the same algorithm as JazzCash
func (m *MockGatewayServer) computeSecureHash(data map[string]any) string {
	ppFields := make(map[string]string)

	// Extract pp_* fields (excluding pp_SecureHash)
	for k, v := range data {
		if strings.HasPrefix(k, "pp_") && k != "pp_SecureHash" {
			if strVal := fmt.Sprintf("%v", v); strVal != "" {
				ppFields[k] = strVal
			}
		}
	}

	// Sort keys alphabetically
	keys := make([]string, 0, len(ppFields))
	for k := range ppFields {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Concatenate values with &
	var message strings.Builder
	for i, k := range keys {
		if i > 0 {
			message.WriteString("&")
		}
		message.WriteString(ppFields[k])
	}

	// Prepend integrity salt
	saltedMessage := m.integritySalt + "&" + message.String()

	// Compute HMAC-SHA256
	mac := hmac.New(sha256.New, []byte(m.integritySalt))
	mac.Write([]byte(saltedMessage))
	hash := mac.Sum(nil)

	// Return uppercase hex
	return strings.ToUpper(hex.EncodeToString(hash))
}

// getResponseMessage returns a user-friendly message for the response code
func (m *MockGatewayServer) getResponseMessage(code string) string {
	switch code {
	case "000", "121":
		return "Transaction completed successfully"
	case "157":
		return "Transaction is pending. Please wait for confirmation"
	case "101":
		return "Transaction failed"
	default:
		return "Transaction status: " + code
	}
}

// getStatus returns the status string for the response code
func (m *MockGatewayServer) getStatus(code string) string {
	switch code {
	case "000", "121":
		return "Completed"
	case "157":
		return "Pending"
	case "101":
		return "Failed"
	default:
		return "Unknown"
	}
}

// getString safely extracts a string value from map
func getString(m map[string]any, key string) string {
	if val, ok := m[key]; ok {
		return fmt.Sprintf("%v", val)
	}
	return ""
}
