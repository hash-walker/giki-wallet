//go:build integration

package transport

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/transport/transport_db"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/jackc/pgx/v5/pgxpool"
)

// =============================================================================
// TEST SETUP
// =============================================================================

var (
	testDBPool            *pgxpool.Pool
	testTransportSvc      *Service
	testWalletSvc         *wallet.Service
	testUserID1           uuid.UUID
	testUserID2           uuid.UUID
	testRouteID           uuid.UUID
	testTripID            uuid.UUID
	testStopID1           uuid.UUID
	testStopID2           uuid.UUID
	testStopID3           uuid.UUID
	systemRevenueWallet   uuid.UUID
	systemLiabilityWallet uuid.UUID
)

func TestMain(m *testing.M) {
	// Get database URL from environment
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://giki:giki_wallet@localhost:5432/giki_wallet_db?sslmode=disable"
	}

	// Set ledger hash secret for testing
	if os.Getenv("LEDGER_HASH_SECRET") == "" {
		os.Setenv("LEDGER_HASH_SECRET", "test_secret_key_for_integration_tests")
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

	// Generate test IDs
	testUserID1 = uuid.New()
	testUserID2 = uuid.New()

	// Create test users
	if err := createTestUsers(); err != nil {
		fmt.Printf("Failed to create test users: %v\n", err)
		os.Exit(1)
	}

	// Create system wallets
	if err := createSystemWallets(); err != nil {
		fmt.Printf("Failed to create system wallets: %v\n", err)
		os.Exit(1)
	}

	// Create services
	testWalletSvc = wallet.NewService(testDBPool)
	testTransportSvc = NewService(testDBPool, testWalletSvc)

	// Get system wallets
	ctx := context.Background()
	systemLiabilityWallet, err = testWalletSvc.GetSystemWalletByName(ctx, wallet.GikiWallet, wallet.SystemWalletLiability)
	if err != nil {
		fmt.Printf("Failed to get system liability wallet: %v\n", err)
		os.Exit(1)
	}

	systemRevenueWallet, err = testWalletSvc.GetSystemWalletByName(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)
	if err != nil {
		fmt.Printf("Failed to get system revenue wallet: %v\n", err)
		os.Exit(1)
	}

	// Create test transport data
	if err := createTestTransportData(); err != nil {
		fmt.Printf("Failed to create test transport data: %v\n", err)
		os.Exit(1)
	}

	// Run tests
	code := m.Run()

	// Cleanup
	cleanupTestData()
	testDBPool.Close()

	os.Exit(code)
}

func createTestUsers() error {
	ctx := context.Background()

	users := []struct {
		id    uuid.UUID
		email string
		phone string
	}{
		{testUserID1, fmt.Sprintf("test1_%s@giki.edu.pk", testUserID1.String()[:8]), fmt.Sprintf("0300%s", testUserID1.String()[:7])},
		{testUserID2, fmt.Sprintf("test2_%s@giki.edu.pk", testUserID2.String()[:8]), fmt.Sprintf("0301%s", testUserID2.String()[:7])},
	}

	for _, u := range users {
		_, err := testDBPool.Exec(ctx, `
			INSERT INTO giki_wallet.users (id, name, email, phone_number, auth_provider, password_hash, password_algo, is_active, is_verified, user_type)
			VALUES ($1, $2, $3, $4, 'local', 'test_hash', 'bcrypt', true, true, 'student')
			ON CONFLICT (id) DO NOTHING
		`, u.id, "Test User", u.email, u.phone)
		if err != nil {
			return err
		}
	}
	return nil
}

func createSystemWallets() error {
	ctx := context.Background()

	wallets := []struct {
		name  string
		wType string
		email string
		phone string
	}{
		{"GIKI Wallet", "SYS_LIABILITY", "liability@giki.edu.pk", "00000000001"},
		{"Transport Revenue", "SYS_REVENUE", "revenue@giki.edu.pk", "00000000002"},
	}

	for _, w := range wallets {
		// 1. Get or Create User for this wallet
		var sysUserID uuid.UUID
		err := testDBPool.QueryRow(ctx, "SELECT id FROM giki_wallet.users WHERE email = $1", w.email).Scan(&sysUserID)
		if err != nil {
			// Create
			sysUserID = uuid.New()
			_, err = testDBPool.Exec(ctx, `
				INSERT INTO giki_wallet.users (id, name, email, phone_number, auth_provider, password_hash, password_algo, is_active, is_verified, user_type)
				VALUES ($1, 'System', $2, $3, 'local', 'hash', 'bcrypt', true, true, 'system')
			`, sysUserID, w.email, w.phone)
			if err != nil {
				return fmt.Errorf("failed to create system user for %s: %w", w.name, err)
			}
		}

		// 2. Create Wallet if not exists
		var exists bool
		err = testDBPool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM giki_wallet.wallets WHERE name=$1 AND type=$2)", w.name, w.wType).Scan(&exists)
		if err != nil {
			return err
		}

		if !exists {
			_, err = testDBPool.Exec(ctx, `
				INSERT INTO giki_wallet.wallets (id, user_id, name, type, status, currency, created_at)
				VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', 'PKR', NOW())
			`, sysUserID, w.name, w.wType)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func createTestTransportData() error {
	ctx := context.Background()

	// Create stops
	testStopID1 = uuid.New()
	testStopID2 = uuid.New()
	testStopID3 = uuid.New()

	stops := []struct {
		id      uuid.UUID
		address string
	}{
		{testStopID1, "GIKI Main Gate"},
		{testStopID2, "Topi Chowk"},
		{testStopID3, "Islamabad Zero Point"},
	}

	for _, s := range stops {
		_, err := testDBPool.Exec(ctx, `
			INSERT INTO giki_transport.stops (id, address)
			VALUES ($1, $2)
			ON CONFLICT (id) DO NOTHING
		`, s.id, s.address)
		if err != nil {
			return err
		}
	}

	// Create route
	testRouteID = uuid.New()
	_, err := testDBPool.Exec(ctx, `
		INSERT INTO giki_transport.routes (id, name, origin_stop_id, destination_stop_id, is_active, default_booking_open_offset_hours, default_booking_close_offset_hours)
		VALUES ($1, 'GIKI to Islamabad', $2, $3, true, 24, 1)
		ON CONFLICT (id) DO NOTHING
	`, testRouteID, testStopID1, testStopID3)
	if err != nil {
		return err
	}

	// Create route master stops
	for i, stopID := range []uuid.UUID{testStopID1, testStopID2, testStopID3} {
		_, err := testDBPool.Exec(ctx, `
			INSERT INTO giki_transport.route_master_stops (route_id, stop_id, default_sequence_order, is_default_active)
			VALUES ($1, $2, $3, true)
			ON CONFLICT DO NOTHING
		`, testRouteID, stopID, i+1)
		if err != nil {
			return err
		}
	}

	// Create or get existing driver
	var driverID uuid.UUID
	err = testDBPool.QueryRow(ctx, "SELECT id FROM giki_transport.driver WHERE license_number = 'LIC123'").Scan(&driverID)
	if err != nil {
		// Driver doesn't exist, create it
		driverID = uuid.New()
		_, err = testDBPool.Exec(ctx, `
			INSERT INTO giki_transport.driver (id, name, phone_number, license_number, is_active)
			VALUES ($1, 'Test Driver', '03001234567', 'LIC123', true)
		`, driverID)
		if err != nil {
			return err
		}
	}

	// Create trip with direction
	testTripID = uuid.New()
	departureTime := time.Now().Add(24 * time.Hour)
	// bookingOpensAt := time.Now().Add(-1 * time.Hour) // Removed
	// bookingClosesAt := time.Now().Add(23 * time.Hour) // Removed

	_, err = testDBPool.Exec(ctx, `
		INSERT INTO giki_transport.trip (id, route_id, driver_id, departure_time, booking_open_offset_hours, booking_close_offset_hours, direction, total_capacity, available_seats, base_price, status, bus_type)
		VALUES ($1, $2, $3, $4, 24, 1, 'OUTBOUND', 10, 10, 500, 'SCHEDULED', 'LUXURY')
		ON CONFLICT (id) DO NOTHING
	`, testTripID, testRouteID, driverID, departureTime)
	if err != nil {
		return err
	}

	// Create trip stops
	for i, stopID := range []uuid.UUID{testStopID1, testStopID2, testStopID3} {
		_, err := testDBPool.Exec(ctx, `
			INSERT INTO giki_transport.trip_stops (trip_id, stop_id, sequence_order)
			VALUES ($1, $2, $3)
			ON CONFLICT DO NOTHING
		`, testTripID, stopID, i+1)
		if err != nil {
			return err
		}
	}

	// Create quota rules for testing
	quotaRules := []struct {
		userRole              string
		direction             string
		weeklyLimit           int
		allowDependentBooking bool
	}{
		{"STUDENT", "OUTBOUND", 5, true},
		{"STUDENT", "INBOUND", 5, true},
		{"EMPLOYEE", "OUTBOUND", 10, false},
		{"EMPLOYEE", "INBOUND", 10, false},
	}

	for _, rule := range quotaRules {
		_, err := testDBPool.Exec(ctx, `
			INSERT INTO giki_transport.quota_rules (user_role, direction, weekly_limit, allow_dependent_booking)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (user_role, direction) DO UPDATE 
			SET weekly_limit = EXCLUDED.weekly_limit, 
			    allow_dependent_booking = EXCLUDED.allow_dependent_booking
		`, rule.userRole, rule.direction, rule.weeklyLimit, rule.allowDependentBooking)
		if err != nil {
			return err
		}
	}

	return nil
}

func cleanupTestData() {
	if os.Getenv("SKIP_TEST_CLEANUP") == "1" {
		fmt.Printf("\n⚠️  SKIP_TEST_CLEANUP=1: Data left in DB\n")
		return
	}

	ctx := context.Background()

	// Clean transport data
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.tickets WHERE trip_id = $1", testTripID)
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.trip_holds WHERE trip_id = $1", testTripID)
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.trip_stops WHERE trip_id = $1", testTripID)
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.trip WHERE id = $1", testTripID)
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.route_master_stops WHERE route_id = $1", testRouteID)
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.routes WHERE id = $1", testRouteID)
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.stops WHERE id IN ($1, $2, $3)", testStopID1, testStopID2, testStopID3)

	// Clean wallet data
	for _, userID := range []uuid.UUID{testUserID1, testUserID2} {
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", common.GoogleUUIDtoPgUUID(userID, true))
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", common.GoogleUUIDtoPgUUID(userID, true))
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.users WHERE id = $1", userID)
	}
}

func cleanupTestBookings(t *testing.T) {
	ctx := context.Background()
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.tickets WHERE trip_id = $1", testTripID)
	testDBPool.Exec(ctx, "DELETE FROM giki_transport.trip_holds WHERE trip_id = $1", testTripID)

	// Reset trip seats
	testDBPool.Exec(ctx, "UPDATE giki_transport.trip SET available_seats = 10 WHERE id = $1", testTripID)

	// Clean wallet ledger
	testDBPool.Exec(ctx, "TRUNCATE giki_wallet.ledger, giki_wallet.transactions CASCADE")
}

// =============================================================================
// INTEGRATION TESTS - Hold Ticket (BATCH)
// =============================================================================

func TestIntegration_HoldSeats_Success(t *testing.T) {
	cleanupTestBookings(t)
	defer cleanupTestBookings(t)

	ctx := context.Background()

	req := HoldSeatsRequest{
		TripID:        testTripID,
		PickupStopID:  testStopID1,
		DropoffStopID: testStopID3,
		Count:         1,
	}

	resp, err := testTransportSvc.HoldSeats(ctx, testUserID1, "STUDENT", req)
	if err != nil {
		t.Fatalf("HoldSeats failed: %v", err)
	}

	if len(resp.Holds) != 1 {
		t.Errorf("Expected 1 hold, got %d", len(resp.Holds))
	}

	hold := resp.Holds[0]
	if hold.HoldID == uuid.Nil {
		t.Error("HoldID should not be nil")
	}

	if hold.ExpiresAt.Before(time.Now()) {
		t.Error("ExpiresAt should be in the future")
	}

	// Verify seat was decremented
	var availableSeats int32
	err = testDBPool.QueryRow(ctx, "SELECT available_seats FROM giki_transport.trip WHERE id = $1", testTripID).Scan(&availableSeats)
	if err != nil {
		t.Fatalf("Failed to query available seats: %v", err)
	}

	if availableSeats != 9 {
		t.Errorf("Available seats should be 9, got %d", availableSeats)
	}
}

func TestIntegration_HoldSeats_NoSeatsAvailable(t *testing.T) {
	cleanupTestBookings(t)
	defer cleanupTestBookings(t)

	ctx := context.Background()

	// Set available seats to 0
	_, err := testDBPool.Exec(ctx, "UPDATE giki_transport.trip SET available_seats = 0 WHERE id = $1", testTripID)
	if err != nil {
		t.Fatalf("Failed to update seats: %v", err)
	}

	req := HoldSeatsRequest{
		TripID:        testTripID,
		PickupStopID:  testStopID1,
		DropoffStopID: testStopID3,
		Count:         1,
	}

	_, err = testTransportSvc.HoldSeats(ctx, testUserID1, "STUDENT", req)
	if err != ErrTripFull {
		t.Errorf("Expected ErrTripFull, got: %v", err)
	}
}

// =============================================================================
// INTEGRATION TESTS - Confirm Ticket (BATCH)
// =============================================================================

func TestIntegration_ConfirmBatch_Success(t *testing.T) {
	cleanupTestBookings(t)
	defer cleanupTestBookings(t)

	ctx := context.Background()

	// Top up user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(ctx, tx2, systemLiabilityWallet, userWallet.ID, 1000, "JAZZCASH_DEPOSIT", "TEST_TOPUP", "Test top-up")
	tx2.Commit(ctx)

	// Hold ticket (Batch)
	holdReq := HoldSeatsRequest{
		TripID:        testTripID,
		PickupStopID:  testStopID1,
		DropoffStopID: testStopID3,
		Count:         1,
	}
	holdResp, _ := testTransportSvc.HoldSeats(ctx, testUserID1, "STUDENT", holdReq)
	holdID := holdResp.Holds[0].HoldID

	// Confirm ticket (Batch)
	confirmItems := []ConfirmItem{
		{
			HoldID:            holdID,
			PassengerName:     "Test User",
			PassengerRelation: "SELF",
		},
	}

	confirmResp, err := testTransportSvc.ConfirmBatch(ctx, testUserID1, "STUDENT", confirmItems)
	if err != nil {
		t.Fatalf("ConfirmBatch failed: %v", err)
	}

	if len(confirmResp.Tickets) != 1 {
		t.Errorf("Expected 1 ticket, got %d", len(confirmResp.Tickets))
	}

	ticket := confirmResp.Tickets[0]
	if ticket.TicketID == uuid.Nil {
		t.Error("TicketID should not be nil")
	}

	if ticket.Status != "CONFIRMED" {
		t.Errorf("Status should be CONFIRMED, got %s", ticket.Status)
	}

	// Verify hold was deleted
	var holdCount int
	err = testDBPool.QueryRow(ctx, "SELECT COUNT(*) FROM giki_transport.trip_holds WHERE id = $1", holdID).Scan(&holdCount)
	if err != nil {
		t.Fatalf("Failed to query holds: %v", err)
	}

	if holdCount != 0 {
		t.Error("Hold should have been deleted")
	}

	// Verify ticket was created
	var ticketStatus string
	err = testDBPool.QueryRow(ctx, "SELECT status FROM giki_transport.tickets WHERE id = $1", ticket.TicketID).Scan(&ticketStatus)
	if err != nil {
		t.Fatalf("Failed to query ticket: %v", err)
	}

	if ticketStatus != "CONFIRMED" {
		t.Errorf("Ticket status should be CONFIRMED, got %s", ticketStatus)
	}
}

func TestIntegration_ConfirmBatch_ExpiredHold(t *testing.T) {
	cleanupTestBookings(t)
	defer cleanupTestBookings(t)

	ctx := context.Background()

	// Create expired hold manually
	expiredHoldID := uuid.New()
	expiresAt := time.Now().Add(-1 * time.Minute) // Expired 1 minute ago

	_, err := testDBPool.Exec(ctx, `
		INSERT INTO giki_transport.trip_holds (id, trip_id, user_id, pickup_stop_id, dropoff_stop_id, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, expiredHoldID, testTripID, testUserID1, testStopID1, testStopID3, expiresAt)
	if err != nil {
		t.Fatalf("Failed to create expired hold: %v", err)
	}

	// Try to confirm expired hold
	items := []ConfirmItem{
		{
			HoldID:            expiredHoldID,
			PassengerName:     "Test User",
			PassengerRelation: "SELF",
		},
	}

	_, err = testTransportSvc.ConfirmBatch(ctx, testUserID1, "STUDENT", items)
	// ConfirmBatch might return partial success or fail entire batch if error is critical?
	// Implementation usually returns error if any item fails OR returns error per item?
	// Checking ConfirmBatch implementation: it loops. If checking hold fails, it returns error immediately.
	// So we expect ErrHoldExpired or similar.

	if err != ErrHoldExpired {
		t.Errorf("Expected ErrHoldExpired, got: %v", err)
	}
}

// =============================================================================
// INTEGRATION TESTS - Cancel Ticket
// =============================================================================

func TestIntegration_CancelTicket_Success(t *testing.T) {
	cleanupTestBookings(t)
	defer cleanupTestBookings(t)

	ctx := context.Background()

	// Setup: Top up wallet, hold, and confirm ticket
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(ctx, tx2, systemLiabilityWallet, userWallet.ID, 1000, "JAZZCASH_DEPOSIT", "TEST_TOPUP_CANCEL", "Test top-up")
	tx2.Commit(ctx)

	// Hold (Batch)
	holdReq := HoldSeatsRequest{
		TripID:        testTripID,
		PickupStopID:  testStopID1,
		DropoffStopID: testStopID3,
		Count:         1,
	}
	holdResp, _ := testTransportSvc.HoldSeats(ctx, testUserID1, "STUDENT", holdReq)

	// Confirm (Batch)
	confirmItems := []ConfirmItem{
		{
			HoldID:            holdResp.Holds[0].HoldID,
			PassengerName:     "Test User",
			PassengerRelation: "SELF",
		},
	}
	confirmResp, _ := testTransportSvc.ConfirmBatch(ctx, testUserID1, "STUDENT", confirmItems)
	ticketID := confirmResp.Tickets[0].TicketID

	// Cancel ticket
	err := testTransportSvc.CancelTicketWithRole(ctx, ticketID, "STUDENT")
	if err != nil {
		t.Fatalf("CancelTicket failed: %v", err)
	}

	// Verify ticket status
	var ticketStatus string
	err = testDBPool.QueryRow(ctx, "SELECT status FROM giki_transport.tickets WHERE id = $1", ticketID).Scan(&ticketStatus)
	if err != nil {
		t.Fatalf("Failed to query ticket: %v", err)
	}

	if ticketStatus != "CANCELLED" {
		t.Errorf("Ticket status should be CANCELLED, got %s", ticketStatus)
	}

	// Verify seat was returned
	var availableSeats int32
	err = testDBPool.QueryRow(ctx, "SELECT available_seats FROM giki_transport.trip WHERE id = $1", testTripID).Scan(&availableSeats)
	if err != nil {
		t.Fatalf("Failed to query available seats: %v", err)
	}

	if availableSeats != 10 {
		t.Errorf("Available seats should be 10 (returned), got %d", availableSeats)
	}

	// Verify refund was processed
	// Verify refund was processed
	var ledgerBalance int64
	testDBPool.QueryRow(ctx, "SELECT COALESCE(SUM(amount), 0) FROM giki_wallet.ledger WHERE wallet_id = $1", userWallet.ID).Scan(&ledgerBalance)

	if ledgerBalance != 1000 {
		t.Errorf("Balance should be 1000. Got %d", ledgerBalance)
	}

	// Let's rely on ledger sum just like E2E test to be safe
	var initialLedgerSum int64
	testDBPool.QueryRow(ctx, "SELECT COALESCE(SUM(amount), 0) FROM giki_wallet.ledger WHERE wallet_id = $1 AND created_at < NOW()", userWallet.ID).Scan(&initialLedgerSum) // Approximate
	// Or just hardcode expectations: 1000 start, -500 ticket, +500 refund => 1000.

	if ledgerBalance != 1000 {
		t.Errorf("Balance should be 1000. Got %d", ledgerBalance)
	}
}

// =============================================================================
// INTEGRATION TESTS - Concurrent Booking (Batch)
// =============================================================================

func TestIntegration_ConcurrentBooking_LastSeat(t *testing.T) {
	cleanupTestBookings(t)
	defer cleanupTestBookings(t)

	ctx := context.Background()

	// Set available seats to 1
	_, err := testDBPool.Exec(ctx, "UPDATE giki_transport.trip SET available_seats = 1 WHERE id = $1", testTripID)
	if err != nil {
		t.Fatalf("Failed to update seats: %v", err)
	}

	var wg sync.WaitGroup
	successCount := 0
	failCount := 0
	var mu sync.Mutex

	// 5 concurrent attempts to book the last seat
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(userID uuid.UUID) {
			defer wg.Done()

			req := HoldSeatsRequest{
				TripID:        testTripID,
				PickupStopID:  testStopID1,
				DropoffStopID: testStopID3,
				Count:         1,
			}

			_, err := testTransportSvc.HoldSeats(ctx, userID, "STUDENT", req)

			mu.Lock()
			if err == nil {
				successCount++
			} else {
				failCount++
			}
			mu.Unlock()
		}(testUserID1)
	}

	wg.Wait()

	// Only 1 should succeed
	if successCount != 1 {
		t.Errorf("Expected exactly 1 success, got %d", successCount)
	}

	if failCount != 4 {
		t.Errorf("Expected exactly 4 failures, got %d", failCount)
	}

	// Verify final seat count
	var availableSeats int32
	err = testDBPool.QueryRow(ctx, "SELECT available_seats FROM giki_transport.trip WHERE id = $1", testTripID).Scan(&availableSeats)
	if err != nil {
		t.Fatalf("Failed to query available seats: %v", err)
	}

	if availableSeats != 0 {
		t.Errorf("Available seats should be 0, got %d", availableSeats)
	}
}

// =============================================================================
// INTEGRATION TESTS - Cleanup Worker
// =============================================================================

func TestIntegration_CleanupExpiredHolds(t *testing.T) {
	cleanupTestBookings(t)
	defer cleanupTestBookings(t)

	ctx := context.Background()

	// Create expired holds with different users to avoid unique constraint
	users := []uuid.UUID{testUserID1, testUserID2}
	stops := []struct{ pickup, dropoff uuid.UUID }{
		{testStopID1, testStopID3},
		{testStopID1, testStopID2},
	}

	for i := 0; i < 2; i++ {
		holdID := uuid.New()
		expiresAt := time.Now().Add(-1 * time.Minute)

		_, err := testDBPool.Exec(ctx, `
			INSERT INTO giki_transport.trip_holds (id, trip_id, user_id, pickup_stop_id, dropoff_stop_id, expires_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, holdID, testTripID, users[i], stops[i].pickup, stops[i].dropoff, expiresAt)
		if err != nil {
			t.Fatalf("Failed to create expired hold: %v", err)
		}

		// Decrement seat for each hold
		_, err = testDBPool.Exec(ctx, "UPDATE giki_transport.trip SET available_seats = available_seats - 1 WHERE id = $1", testTripID)
		if err != nil {
			t.Fatalf("Failed to decrement seat: %v", err)
		}
	}

	// Verify seats were decremented
	var seatsBefore int32
	testDBPool.QueryRow(ctx, "SELECT available_seats FROM giki_transport.trip WHERE id = $1", testTripID).Scan(&seatsBefore)
	if seatsBefore != 8 {
		t.Errorf("Seats before cleanup should be 8, got %d", seatsBefore)
	}

	// Run cleanup
	q := transport_db.New(testDBPool)
	CleanupExpiredHolds(testDBPool, q)

	// Verify holds were deleted
	var holdCount int
	testDBPool.QueryRow(ctx, "SELECT COUNT(*) FROM giki_transport.trip_holds WHERE trip_id = $1", testTripID).Scan(&holdCount)
	if holdCount != 0 {
		t.Errorf("All expired holds should be deleted, found %d", holdCount)
	}

	// Verify seats were returned
	var seatsAfter int32
	testDBPool.QueryRow(ctx, "SELECT available_seats FROM giki_transport.trip WHERE id = $1", testTripID).Scan(&seatsAfter)
	if seatsAfter != 10 {
		t.Errorf("Seats after cleanup should be 10, got %d", seatsAfter)
	}
}
