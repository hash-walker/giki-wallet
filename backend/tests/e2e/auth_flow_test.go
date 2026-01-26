package e2e

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	"github.com/hash-walker/giki-wallet/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)


// Local context key for testing
type contextKey string
const requestIDKey contextKey = "request_id"
// TestAuthFlow_RegisterAndLogin tests the complete user registration and login flow
func TestAuthFlow_RegisterAndLogin(t *testing.T) {
	// Setup
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://giki:giki_wallet@localhost:5432/giki_wallet_db?sslmode=disable"
	}

	dbPool, err := pgxpool.New(context.Background(), dbURL)
	require.NoError(t, err, "Failed to connect to database")
	defer dbPool.Close()

	// Initialize services
	userService := user.NewService(dbPool)
	authService := auth.NewService(dbPool)

	// Initialize handlers
	userHandler := user.NewHandler(userService)
	authHandler := auth.NewHandler(authService)

	// Test data
	timestamp := time.Now().Unix()
	testEmail := fmt.Sprintf("test.user%d@giki.edu.pk", timestamp)
	testPassword := "SecurePassword123!"
	testName := "Test User"
	testPhone := "03001234567"

	t.Run("Complete Flow: Register Student → Login → Verify Tokens", func(t *testing.T) {
		// Step 1: Register a new student user
		t.Log("Step 1: Registering new student user...")
		registerPayload := map[string]interface{}{
			"name":         testName,
			"email":        testEmail,
			"user_type":    "student",
			"reg_id":       "2024-CS-001",
			"password":     testPassword,
			"phone_number": testPhone,
		}

		registerBody, _ := json.Marshal(registerPayload)
		registerReq := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(registerBody))
		registerReq.Header.Set("Content-Type", "application/json")
		registerReq = registerReq.WithContext(context.WithValue(registerReq.Context(), requestIDKey, "test-register-001"))

		registerRec := httptest.NewRecorder()
		userHandler.Register(registerRec, registerReq)

		// Verify registration response
		assert.Equal(t, http.StatusCreated, registerRec.Code, "Registration should return 201 Created")

		var registerResp map[string]interface{}
		err := json.Unmarshal(registerRec.Body.Bytes(), &registerResp)
		require.NoError(t, err, "Should parse registration response")

		assert.Equal(t, testEmail, registerResp["email"], "Email should match")
		assert.Equal(t, testName, registerResp["name"], "Name should match")
		assert.NotEmpty(t, registerResp["id"], "User ID should be present")

		t.Logf("✓ User registered successfully: %s", registerResp["id"])

		// Step 2: Login with the registered credentials
		t.Log("Step 2: Logging in with registered credentials...")
		loginPayload := map[string]interface{}{
			"email":    testEmail,
			"password": testPassword,
		}

		loginBody, _ := json.Marshal(loginPayload)
		loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
		loginReq.Header.Set("Content-Type", "application/json")
		loginReq = loginReq.WithContext(context.WithValue(loginReq.Context(), requestIDKey, "test-login-001"))

		loginRec := httptest.NewRecorder()
		authHandler.Login(loginRec, loginReq)

		// Verify login response
		assert.Equal(t, http.StatusOK, loginRec.Code, "Login should return 200 OK")

		var loginResp map[string]interface{}
		err = json.Unmarshal(loginRec.Body.Bytes(), &loginResp)
		require.NoError(t, err, "Should parse login response")

		// Verify user data in login response
		assert.Equal(t, testEmail, loginResp["email"], "Email should match")
		assert.Equal(t, testName, loginResp["name"], "Name should match")

		// Verify auth tokens
		authData, ok := loginResp["auth"].(map[string]interface{})
		require.True(t, ok, "Auth data should be present")

		accessToken, ok := authData["access_token"].(string)
		require.True(t, ok && accessToken != "", "Access token should be present")

		refreshToken, ok := authData["refresh_token"].(string)
		require.True(t, ok && refreshToken != "", "Refresh token should be present")

		expiresAt, ok := authData["expires_at"].(float64)
		require.True(t, ok && expiresAt > 0, "Expires at should be present")

		t.Logf("✓ Login successful")
		t.Logf("  Access Token: %s...", accessToken[:20])
		t.Logf("  Refresh Token: %s...", refreshToken[:20])
		t.Logf("  Expires In: %.0f seconds", expiresAt/float64(time.Second))
	})

	t.Run("Register Employee User", func(t *testing.T) {
		employeeEmail := fmt.Sprintf("employee%d@giki.edu.pk", timestamp)

		registerPayload := map[string]interface{}{
			"name":         "Employee User",
			"email":        employeeEmail,
			"user_type":    "employee",
			"password":     testPassword,
			"phone_number": "03009876543",
		}

		registerBody, _ := json.Marshal(registerPayload)
		registerReq := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(registerBody))
		registerReq.Header.Set("Content-Type", "application/json")
		registerReq = registerReq.WithContext(context.WithValue(registerReq.Context(), requestIDKey, "test-register-employee"))

		registerRec := httptest.NewRecorder()
		userHandler.Register(registerRec, registerReq)

		assert.Equal(t, http.StatusCreated, registerRec.Code, "Employee registration should succeed")

		var registerResp map[string]interface{}
		err := json.Unmarshal(registerRec.Body.Bytes(), &registerResp)
		require.NoError(t, err)

		assert.Equal(t, employeeEmail, registerResp["email"])
		t.Logf("✓ Employee registered successfully: %s", registerResp["id"])
	})
}
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://giki:giki_wallet@localhost:5432/giki_wallet_db?sslmode=disable"
	}
	dbPool, err := pgxpool.New(context.Background(), dbURL)
func TestAuthFlow_ErrorCases(t *testing.T) {
	cfg := config.LoadConfig()
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	require.NoError(t, err)
	defer dbPool.Close()

	userService := user.NewService(dbPool)
	authService := auth.NewService(dbPool)
	userHandler := user.NewHandler(userService)
	authHandler := auth.NewHandler(authService)

	t.Run("Register: Invalid Email Domain", func(t *testing.T) {
		registerPayload := map[string]interface{}{
			"name":         "Test User",
			"email":        "test@gmail.com", // Wrong domain
			"user_type":    "student",
			"reg_id":       "2024-CS-002",
			"password":     "Password123!",
			"phone_number": "03001234567",
		}

		registerBody, _ := json.Marshal(registerPayload)
		registerReq := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(registerBody))
		registerReq.Header.Set("Content-Type", "application/json")
		registerReq = registerReq.WithContext(context.WithValue(registerReq.Context(), requestIDKey, "test-invalid-email"))

		registerRec := httptest.NewRecorder()
		userHandler.Register(registerRec, registerReq)

		assert.Equal(t, http.StatusForbidden, registerRec.Code, "Should reject non-GIKI email")

		var errorResp map[string]interface{}
		json.Unmarshal(registerRec.Body.Bytes(), &errorResp)
		assert.Equal(t, "EMAIL_RESTRICTED", errorResp["code"])
		t.Logf("✓ Correctly rejected non-GIKI email: %s", errorResp["message"])
	})

	t.Run("Register: Student Missing RegID", func(t *testing.T) {
		timestamp := time.Now().Unix()
		registerPayload := map[string]interface{}{
			"name":      "Test Student",
			"email":     fmt.Sprintf("student%d@giki.edu.pk", timestamp),
			"user_type": "student",
			// reg_id missing
			"password":     "Password123!",
			"phone_number": "03001234567",
		}

		registerBody, _ := json.Marshal(registerPayload)
		registerReq := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(registerBody))
		registerReq.Header.Set("Content-Type", "application/json")
		registerReq = registerReq.WithContext(context.WithValue(registerReq.Context(), requestIDKey, "test-missing-regid"))

		registerRec := httptest.NewRecorder()
		userHandler.Register(registerRec, registerReq)

		assert.Equal(t, http.StatusBadRequest, registerRec.Code, "Should reject student without RegID")

		var errorResp map[string]interface{}
		json.Unmarshal(registerRec.Body.Bytes(), &errorResp)
		assert.Equal(t, "MISSING_REG_ID", errorResp["code"])
		t.Logf("✓ Correctly rejected student without RegID")
	})

	t.Run("Register: Invalid User Type", func(t *testing.T) {
		timestamp := time.Now().Unix()
		registerPayload := map[string]interface{}{
			"name":         "Test User",
			"email":        fmt.Sprintf("invalid%d@giki.edu.pk", timestamp),
			"user_type":    "admin", // Invalid type
			"password":     "Password123!",
			"phone_number": "03001234567",
		}

		registerBody, _ := json.Marshal(registerPayload)
		registerReq := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(registerBody))
		registerReq.Header.Set("Content-Type", "application/json")
		registerReq = registerReq.WithContext(context.WithValue(registerReq.Context(), requestIDKey, "test-invalid-usertype"))

		registerRec := httptest.NewRecorder()
		userHandler.Register(registerRec, registerReq)

		assert.Equal(t, http.StatusBadRequest, registerRec.Code, "Should reject invalid user type")

		var errorResp map[string]interface{}
		json.Unmarshal(registerRec.Body.Bytes(), &errorResp)
		assert.Equal(t, "INVALID_USER_TYPE", errorResp["code"])
		t.Logf("✓ Correctly rejected invalid user type")
	})

	t.Run("Login: User Not Found", func(t *testing.T) {
		loginPayload := map[string]interface{}{
			"email":    "nonexistent@giki.edu.pk",
			"password": "Password123!",
		}

		loginBody, _ := json.Marshal(loginPayload)
		loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
		loginReq.Header.Set("Content-Type", "application/json")
		loginReq = loginReq.WithContext(context.WithValue(loginReq.Context(), requestIDKey, "test-user-not-found"))

		loginRec := httptest.NewRecorder()
		authHandler.Login(loginRec, loginReq)

		assert.Equal(t, http.StatusNotFound, loginRec.Code, "Should return 404 for non-existent user")

		var errorResp map[string]interface{}
		json.Unmarshal(loginRec.Body.Bytes(), &errorResp)
		assert.Equal(t, "USER_NOT_FOUND", errorResp["code"])
		t.Logf("✓ Correctly handled non-existent user")
	})

	t.Run("Login: Invalid Password", func(t *testing.T) {
		// First register a user
		timestamp := time.Now().Unix()
		testEmail := fmt.Sprintf("pwdtest%d@giki.edu.pk", timestamp)

		registerPayload := map[string]interface{}{
			"name":         "Password Test",
			"email":        testEmail,
			"user_type":    "employee",
			"password":     "CorrectPassword123!",
			"phone_number": "03001234567",
		}

		registerBody, _ := json.Marshal(registerPayload)
		registerReq := httptest.NewRequest(http.MethodPost, "/api/users/register", bytes.NewBuffer(registerBody))
		registerReq.Header.Set("Content-Type", "application/json")
		registerReq = registerReq.WithContext(context.WithValue(registerReq.Context(), requestIDKey, "test-pwd-setup"))

		registerRec := httptest.NewRecorder()
		userHandler.Register(registerRec, registerReq)
		require.Equal(t, http.StatusCreated, registerRec.Code)

		// Try to login with wrong password
		loginPayload := map[string]interface{}{
			"email":    testEmail,
			"password": "WrongPassword123!",
		}

		loginBody, _ := json.Marshal(loginPayload)
		loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
		loginReq.Header.Set("Content-Type", "application/json")
		loginReq = loginReq.WithContext(context.WithValue(loginReq.Context(), requestIDKey, "test-wrong-password"))

		loginRec := httptest.NewRecorder()
		authHandler.Login(loginRec, loginReq)

		assert.Equal(t, http.StatusUnauthorized, loginRec.Code, "Should return 401 for wrong password")

		var errorResp map[string]interface{}
		json.Unmarshal(loginRec.Body.Bytes(), &errorResp)
		assert.Equal(t, "INVALID_PASSWORD", errorResp["code"])
		t.Logf("✓ Correctly rejected invalid password")
	})

	t.Run("Login: Missing Fields", func(t *testing.T) {
		loginPayload := map[string]interface{}{
			"email": "test@giki.edu.pk",
			// password missing
		}

		loginBody, _ := json.Marshal(loginPayload)
		loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginBody))
		loginReq.Header.Set("Content-Type", "application/json")
		loginReq = loginReq.WithContext(context.WithValue(loginReq.Context(), requestIDKey, "test-missing-field"))

		loginRec := httptest.NewRecorder()
		authHandler.Login(loginRec, loginReq)

		assert.Equal(t, http.StatusBadRequest, loginRec.Code, "Should return 400 for missing fields")

		var errorResp map[string]interface{}
		json.Unmarshal(loginRec.Body.Bytes(), &errorResp)
		assert.Equal(t, "MISSING_FIELD", errorResp["code"])
		t.Logf("✓ Correctly rejected missing fields")
	})

	t.Run("Login: Invalid JSON", func(t *testing.T) {
		invalidJSON := []byte(`{"email": "test@giki.edu.pk", "password":`)

		loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(invalidJSON))
		loginReq.Header.Set("Content-Type", "application/json")
		loginReq = loginReq.WithContext(context.WithValue(loginReq.Context(), requestIDKey, "test-invalid-json"))

		loginRec := httptest.NewRecorder()
		authHandler.Login(loginRec, loginReq)

		assert.Equal(t, http.StatusBadRequest, loginRec.Code, "Should return 400 for invalid JSON")

		var errorResp map[string]interface{}
		json.Unmarshal(loginRec.Body.Bytes(), &errorResp)
		assert.Equal(t, "INVALID_JSON", errorResp["code"])
		t.Logf("✓ Correctly rejected invalid JSON")
	})
}
