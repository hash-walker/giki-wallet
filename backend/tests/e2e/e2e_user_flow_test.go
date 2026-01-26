package e2e

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/config"
	"github.com/hash-walker/giki-wallet/internal/payment"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	"github.com/hash-walker/giki-wallet/internal/transport"
	"github.com/hash-walker/giki-wallet/internal/user"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	testDBPool *pgxpool.Pool
)

func TestMain(m *testing.M) {
	// Setup DB connection
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://giki:giki_wallet@localhost:5432/giki_wallet_db?sslmode=disable"
		os.Setenv("DB_URL", dbURL) // Ensure LoadConfig can see it
	}

	if os.Getenv("LEDGER_HASH_SECRET") == "" {
		os.Setenv("LEDGER_HASH_SECRET", "test_secret")
	}

	var err error
	testDBPool, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		fmt.Printf("Unable to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer testDBPool.Close()

	// Run tests
	code := m.Run()

	os.Exit(code)
}

func TestE2E_FullUserJourney(t *testing.T) {
	ctx := context.Background()

	// Initialize Config (mock/env) - Set ALL required env vars to avoid panic
	os.Setenv("JAZZCASH_MERCHANT_ID", "mock_merchant")
	os.Setenv("JAZZCASH_PASSWORD", "mock_pass")
	os.Setenv("JAZZCASH_HASH_KEY", "mock_key")
	os.Setenv("JAZZCASH_INTEGRITY_SALT", "mock_salt")
	os.Setenv("JAZZCASH_MERCHANT_MPIN", "mock_mpin")
	os.Setenv("JAZZCASH_BASE_URL", "http://sandbox.jazzcash.com.pk")
	os.Setenv("JAZZCASH_RETURN_URL", "http://localhost:8080/payment/callback")
	os.Setenv("JAZZCASH_WALLET_PAYMENT_URL", "http://sandbox.jazzcash.com.pk/mw")
	os.Setenv("JAZZCASH_CARD_PAYMENT_URL", "http://sandbox.jazzcash.com.pk/card")
	os.Setenv("JAZZCASH_STATUS_INQUIRY_URL", "http://sandbox.jazzcash.com.pk/inquiry")

	// Initialize Services
	userService := user.NewService(testDBPool)
	authService := auth.NewService(testDBPool)
	walletService := wallet.NewService(testDBPool)

	// Payment deps
	cfg := config.LoadConfig()
	jcClient := gateway.NewJazzCashClient(
		cfg.Jazzcash.MerchantID,
		cfg.Jazzcash.Password,
		cfg.Jazzcash.IntegritySalt,
		cfg.Jazzcash.MerchantMPIN,
		cfg.Jazzcash.CardCallbackURL,
		cfg.Jazzcash.BaseURL,
		cfg.Jazzcash.WalletPaymentURl, // Corrected typo
		cfg.Jazzcash.CardPaymentURL,
		cfg.Jazzcash.StatusInquiryURL,
	)
	rateLimiter := payment.NewRateLimiter(10)
	paymentService := payment.NewService(testDBPool, jcClient, walletService, rateLimiter)

	transportService := transport.NewService(testDBPool, walletService)

	// Clean up previous test runs
	cleanup(ctx, t)

	// --- Step 1: User Registration ---
	t.Log("Step 1: User Registration")

	dbTx, err := testDBPool.Begin(ctx)
	require.NoError(t, err)

	regID := fmt.Sprintf("2022%d", time.Now().Unix()%10000) // Unique Reg ID
	email := fmt.Sprintf("student_%s@giki.edu.pk", uuid.New().String()[:8])

	// Ensure rollback if we fail early
	defer dbTx.Rollback(ctx)

	userPayload := user.CreateUserParams{
		Name:        "E2E Test Student",
		Email:       email,
		PhoneNumber: fmt.Sprintf("0300%d", time.Now().Unix()%10000000),
		Password:    "SecurePass123!",
		UserType:    "STUDENT",
	}

	createdUser, err := userService.CreateUser(ctx, dbTx, userPayload)
	require.NoError(t, err, "Failed to create user")

	_, err = userService.CreateStudent(ctx, dbTx, user.CreateStudentParams{
		UserID: createdUser.ID,
		RegID:  regID,
	})
	require.NoError(t, err, "Failed to create student profile")

	err = dbTx.Commit(ctx)
	require.NoError(t, err)

	// Manual Activation
	_, err = testDBPool.Exec(ctx, "UPDATE giki_wallet.users SET is_active = true, is_verified = true WHERE id = $1", createdUser.ID)
	require.NoError(t, err, "Failed to activate user")

	t.Logf("Created User: %s (%s)", createdUser.Email, createdUser.ID)

	// --- Step 2: Authentication ---
	t.Log("Step 2: Authentication")

	authTx, err := testDBPool.Begin(ctx)
	require.NoError(t, err)

	loginResult, err := authService.AuthenticateAndIssueTokens(ctx, authTx, email, "SecurePass123!")
	require.NoError(t, err, "Login failed")
	require.NotEmpty(t, loginResult.Tokens.AccessToken, "Access token missing")

	err = authTx.Commit(ctx)
	require.NoError(t, err)
	t.Log("Login Successful")

	// --- Step 3: Wallet Setup & Top-up ---
	t.Log("Step 3: Wallet Top-up")

	// Create wallet (idempotent)
	walletTx, err := testDBPool.Begin(ctx)
	require.NoError(t, err)

	userWallet, err := walletService.GetOrCreateWallet(ctx, walletTx, createdUser.ID)
	require.NoError(t, err, "Failed to get/create wallet")
	err = walletTx.Commit(ctx)
	require.NoError(t, err)

	// Simulate JazzCash Payment
	topUpAmount := int64(5000) // PKR
	paymentRef := uuid.New().String()

	// Inject UserID into context
	payCtx := auth.SetUserIDInContext(ctx, createdUser.ID)

	// Use Public InitiatePayment
	idempotencyKey := uuid.New()
	_, err = paymentService.InitiatePayment(payCtx, payment.TopUpRequest{
		Amount:         topUpAmount,
		PhoneNumber:    "03001234567",
		CNICLast6:      "890123", // Last 6 only
		Method:         payment.PaymentMethodMWallet,
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		t.Logf("InitiatePayment (external) failed as expected (network/mock): %v", err)
	}

	// Direct System Topup
	sysWalletTx, err := testDBPool.Begin(ctx)
	require.NoError(t, err)
	liabilityWalletID, err := walletService.GetSystemWalletByName(ctx, wallet.GikiWallet, wallet.SystemWalletLiability)
	if err != nil {
		t.Logf("System wallet failed: %v", err)
	}
	require.NoError(t, err)
	sysWalletTx.Commit(ctx)

	// Execute Top-up on Ledger
	txnTx, err := testDBPool.Begin(ctx)
	require.NoError(t, err)
	err = walletService.ExecuteTransaction(ctx, txnTx, liabilityWalletID, userWallet.ID, topUpAmount, "TOPUP", paymentRef, "JazzCash Topup")
	require.NoError(t, err, "Top-up transaction failed")
	err = txnTx.Commit(ctx)
	require.NoError(t, err)

	t.Logf("Wallet topped up. New Balance: %d", topUpAmount)

	// --- Step 4: Setup Transport (Route/Trip) ---
	t.Log("Step 4: Create Trip")

	setupTx, err := testDBPool.Begin(ctx)
	require.NoError(t, err)

	routeID := uuid.New()
	tripID := uuid.New()

	// Setup Stops FIRST (needed for route)
	stopID1 := uuid.New()
	stopID3 := uuid.New()

	_, err = setupTx.Exec(ctx, "INSERT INTO giki_transport.stops (id, address) VALUES ($1, 'GIKI Topi'), ($2, 'Islamabad F-10')", stopID1, stopID3)
	require.NoError(t, err, "Stop insert failed")

	// Setup Route (Referencing stops)
	_, err = setupTx.Exec(ctx, "INSERT INTO giki_transport.routes (id, name, origin_stop_id, destination_stop_id, is_active) VALUES ($1, 'E2E Route', $2, $3, true)", routeID, stopID1, stopID3)
	require.NoError(t, err, "Route insert failed")

	// Create Trip
	depTime := time.Now().Add(24 * time.Hour)
	_, err = setupTx.Exec(ctx, `
		INSERT INTO giki_transport.trip (
			id, route_id, departure_time, booking_opens_at, booking_closes_at, 
			direction, total_capacity, available_seats, base_price, status, booking_status
		) VALUES (
			$1, $2, $3, NOW(), NOW() + INTERVAL '2 days', 
			'OUTBOUND', 40, 40, 500, 'SCHEDULED', 'OPEN'
		)`, tripID, routeID, depTime)
	require.NoError(t, err, "Create Trip failed")

	// Create Quota Rules
	_, err = setupTx.Exec(ctx, `
		INSERT INTO giki_transport.quota_rules (user_role, direction, weekly_limit, allow_dependent_booking)
		VALUES ('STUDENT', 'OUTBOUND', 5, true)
		ON CONFLICT (user_role, direction) DO NOTHING
	`)
	require.NoError(t, err)

	err = setupTx.Commit(ctx)
	require.NoError(t, err)

	// --- Step 5: Book Ticket ---
	t.Log("Step 5: Book Ticket")

	// 5a. Hold Seats
	holdReq := transport.HoldSeatsRequest{
		TripID:        tripID,
		PickupStopID:  stopID1,
		DropoffStopID: stopID3,
		Count:         1,
	}

	holdResp, err := transportService.HoldSeats(ctx, createdUser.ID, "STUDENT", holdReq)
	require.NoError(t, err, "HoldSeats failed")
	require.Len(t, holdResp.Holds, 1)
	holdID := holdResp.Holds[0].HoldID
	t.Logf("Seat Held: %s", holdID)

	// 5b. Confirm Booking
	items := []transport.ConfirmItem{
		{
			HoldID:            holdID,
			PassengerName:     "E2E User",
			PassengerRelation: "SELF",
		},
	}

	confirmResp, err := transportService.ConfirmBatch(ctx, createdUser.ID, "STUDENT", items)
	require.NoError(t, err, "ConfirmBatch failed")
	require.NotNil(t, confirmResp)
	t.Log("Ticket Confirmed")

	// --- Step 6: Verify Balance ---
	t.Log("Step 6: Verify Balance")

	// Check wallet balance
	var finalBalance int64
	err = testDBPool.QueryRow(ctx, "SELECT COALESCE(SUM(amount), 0) FROM giki_wallet.ledger WHERE wallet_id = $1", userWallet.ID).Scan(&finalBalance)
	require.NoError(t, err)

	expectedBalance := topUpAmount - 500 // 5000 - 500 = 4500
	assert.Equal(t, expectedBalance, finalBalance, "Balance should be deducted correctly")
	t.Logf("Final Balance: %d (Expected: %d)", finalBalance, expectedBalance)

	// --- Step 7: Cancellation (Optional) ---
	t.Log("Step 7: Cancel Ticket")

	var ticketID uuid.UUID
	err = testDBPool.QueryRow(ctx, "SELECT id FROM giki_transport.tickets WHERE user_id = $1 AND status = 'CONFIRMED'", createdUser.ID).Scan(&ticketID)
	require.NoError(t, err)

	err = transportService.CancelTicket(ctx, ticketID, "STUDENT")
	require.NoError(t, err, "CancelTicket failed")

	// Check Refund
	err = testDBPool.QueryRow(ctx, "SELECT COALESCE(SUM(amount), 0) FROM giki_wallet.ledger WHERE wallet_id = $1", userWallet.ID).Scan(&finalBalance)
	require.NoError(t, err)
	assert.Equal(t, topUpAmount, finalBalance, "Balance should be refunded fully")
	t.Logf("Refund Verified. Balance: %d", finalBalance)

}

func cleanup(ctx context.Context, t *testing.T) {
	// Truncate relevant tables to ensure clean slate
	_, err := testDBPool.Exec(ctx, `
		TRUNCATE TABLE giki_transport.tickets CASCADE;
		TRUNCATE TABLE giki_transport.trip_holds CASCADE;
		TRUNCATE TABLE giki_transport.trip CASCADE;
		TRUNCATE TABLE giki_transport.routes CASCADE;
		TRUNCATE TABLE giki_transport.stops CASCADE;
		TRUNCATE TABLE giki_wallet.transactions CASCADE;
		DELETE FROM giki_wallet.wallets WHERE type = 'PERSONAL';
		DELETE FROM giki_wallet.student_profiles;
		DELETE FROM giki_wallet.users WHERE email LIKE 'student_%@giki.edu.pk' OR email = 'e2e_test_student@giki.edu.pk';
	`)
	if err != nil {
		t.Logf("Cleanup warning: %v", err)
	}
}
