//go:build integration

package wallet

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	wallet_db "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// =============================================================================
// TEST SETUP
// =============================================================================

var (
	testDBPool            *pgxpool.Pool
	testWalletSvc         *Service
	testUserID1           uuid.UUID
	testUserID2           uuid.UUID
	systemLiabilityWallet uuid.UUID
	systemRevenueWallet   uuid.UUID
)

// TestMain sets up the test environment
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

	// Generate test user IDs
	testUserID1 = uuid.New()
	testUserID2 = uuid.New()

	// Create test users
	if err := createTestUsers(); err != nil {
		fmt.Printf("Failed to create test users: %v\n", err)
		os.Exit(1)
	}

	// Create wallet service
	testWalletSvc = NewService(testDBPool)

	// Get system wallets
	ctx := context.Background()
	var err1, err2 error
	systemLiabilityWallet, err1 = testWalletSvc.GetSystemWalletByName(ctx, GikiWallet, SystemWalletLiability)
	systemRevenueWallet, err2 = testWalletSvc.GetSystemWalletByName(ctx, TransportSystemWallet, SystemWalletRevenue)

	if err1 != nil || err2 != nil {
		// Try to seed system wallets if any are missing
		fmt.Printf("System wallets missing (liability: %v, revenue: %v), attempting to seed...\n", err1, err2)
		if seedErr := seedSystemWallets(ctx, testDBPool); seedErr != nil {
			fmt.Printf("Failed to seed system wallets: %v\n", seedErr)
			os.Exit(1)
		}

		// Try getting again to confirm
		systemLiabilityWallet, err = testWalletSvc.GetSystemWalletByName(ctx, GikiWallet, SystemWalletLiability)
		if err != nil {
			fmt.Printf("Failed to get system liability wallet after seeding: %v\n", err)
			os.Exit(1)
		}
		systemRevenueWallet, err = testWalletSvc.GetSystemWalletByName(ctx, TransportSystemWallet, SystemWalletRevenue)
		if err != nil {
			fmt.Printf("Failed to get system revenue wallet after seeding: %v\n", err)
			os.Exit(1)
		}
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

func cleanupTestData() {
	if os.Getenv("SKIP_TEST_CLEANUP") == "1" {
		fmt.Printf("\n⚠️  SKIP_TEST_CLEANUP=1: Data left in DB\n")
		return
	}

	ctx := context.Background()
	for _, userID := range []uuid.UUID{testUserID1, testUserID2} {
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", common.GoogleUUIDtoPgUUID(userID, true))
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", common.GoogleUUIDtoPgUUID(userID, true))
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.users WHERE id = $1", userID)
	}
}

func cleanupTestWallets(t *testing.T) {
	ctx := context.Background()
	for _, userID := range []uuid.UUID{testUserID1, testUserID2} {
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.ledger WHERE wallet_id IN (SELECT id FROM giki_wallet.wallets WHERE user_id = $1)", common.GoogleUUIDtoPgUUID(userID, true))
		testDBPool.Exec(ctx, "DELETE FROM giki_wallet.wallets WHERE user_id = $1", common.GoogleUUIDtoPgUUID(userID, true))
	}
	// Clean up all ledger entries and transaction headers (TRUNCATE is faster and more complete)
	_, err := testDBPool.Exec(ctx, "TRUNCATE giki_wallet.ledger, giki_wallet.transactions CASCADE")
	if err != nil {
		t.Logf("Cleanup (TRUNCATE) failed: %v", err)
	}
}

// =============================================================================
// INTEGRATION TESTS - Wallet Creation
// =============================================================================

func TestIntegration_GetOrCreateWallet_CreatesNewWallet(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()
	tx, err := testDBPool.Begin(ctx)
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}
	defer tx.Rollback(ctx)

	wallet, err := testWalletSvc.GetOrCreateWallet(ctx, tx, testUserID1)
	if err != nil {
		t.Fatalf("GetOrCreateWallet failed: %v", err)
	}

	if wallet.UserID != testUserID1 {
		t.Errorf("Wallet user_id mismatch: got %s, want %s", wallet.UserID, testUserID1)
	}

	tx.Commit(ctx)
}

// Helper to check wallet ID for a ledger entry
func getLedgerEntryWalletID(ctx context.Context, entryID uuid.UUID) (uuid.UUID, error) {
	var walletID uuid.UUID
	err := testDBPool.QueryRow(ctx, "SELECT wallet_id FROM giki_wallet.ledger WHERE id = $1", entryID).Scan(&walletID)
	return walletID, err
}

func TestIntegration_GetOrCreateWallet_ReturnsExisting(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create wallet first
	tx1, _ := testDBPool.Begin(ctx)
	wallet1, err := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	if err != nil {
		t.Fatalf("First GetOrCreateWallet failed: %v", err)
	}
	tx1.Commit(ctx)

	// Try to get it again
	tx2, _ := testDBPool.Begin(ctx)
	wallet2, err := testWalletSvc.GetOrCreateWallet(ctx, tx2, testUserID1)
	if err != nil {
		t.Fatalf("Second GetOrCreateWallet failed: %v", err)
	}
	tx2.Commit(ctx)

	if wallet1.ID != wallet2.ID {
		t.Errorf("Should return same wallet: got %s and %s", wallet1.ID, wallet2.ID)
	}
}

func TestIntegration_GetOrCreateWallet_ConcurrentCreation(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()
	var wg sync.WaitGroup
	walletIDs := make(chan uuid.UUID, 5)
	errors := make(chan error, 5)

	// Try to create wallet concurrently
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			tx, err := testDBPool.Begin(ctx)
			if err != nil {
				errors <- err
				return
			}
			defer tx.Rollback(ctx)

			wallet, err := testWalletSvc.GetOrCreateWallet(ctx, tx, testUserID1)
			if err != nil {
				errors <- err
				return
			}

			tx.Commit(ctx)
			walletIDs <- wallet.ID
		}()
	}

	wg.Wait()
	close(walletIDs)
	close(errors)

	// Check for errors
	for err := range errors {
		t.Errorf("Concurrent creation error: %v", err)
	}

	// All should have same wallet ID
	var firstID uuid.UUID
	count := 0
	for id := range walletIDs {
		if count == 0 {
			firstID = id
		} else if id != firstID {
			t.Errorf("Different wallet IDs created: %s and %s", firstID, id)
		}
		count++
	}

	if count != 5 {
		t.Errorf("Expected 5 wallet IDs, got %d", count)
	}
}

// =============================================================================
// INTEGRATION TESTS - Double-Entry Transactions
// =============================================================================

func TestIntegration_ExecuteTransaction_TopUp(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, err := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	if err != nil {
		t.Fatalf("Failed to create user wallet: %v", err)
	}
	tx1.Commit(ctx)

	// Execute top-up transaction (system liability -> user wallet)
	tx2, _ := testDBPool.Begin(ctx)
	err = testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"TEST_TOPUP_001",
		"Test top-up",
	)
	if err != nil {
		tx2.Rollback(ctx)
		t.Fatalf("ExecuteTransaction failed: %v", err)
	}
	tx2.Commit(ctx)

	// Verify ledger entries were created
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, "TEST_TOPUP_001")
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	// Should have 2 entries (debit from system, credit to user)
	if len(entries) != 2 {
		t.Fatalf("Expected 2 ledger entries (double-entry), got %d", len(entries))
	}

	// Verify one debit and one credit
	var hasDebit, hasCredit bool
	for _, entry := range entries {
		walletID, _ := getLedgerEntryWalletID(ctx, entry.ID)

		if entry.Amount < 0 {
			hasDebit = true
			if walletID != systemLiabilityWallet {
				t.Error("Debit should be from system liability wallet")
			}
		} else {
			hasCredit = true
			if walletID != userWallet.ID {
				t.Error("Credit should be to user wallet")
			}
		}
	}

	if !hasDebit || !hasCredit {
		t.Error("Should have both debit and credit entries")
	}
}

func TestIntegration_ExecuteTransaction_InsufficientFunds(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create two user wallets
	tx1, _ := testDBPool.Begin(ctx)
	wallet1, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	wallet2, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID2)
	tx1.Commit(ctx)

	// Try to transfer from wallet1 (balance=0) to wallet2
	tx2, _ := testDBPool.Begin(ctx)
	err := testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		wallet1.ID,
		wallet2.ID,
		100,
		"TRANSFER",
		"TEST_TRANSFER_001",
		"Test transfer",
	)
	if err == nil {
		tx2.Commit(ctx)
		t.Fatal("ExecuteTransaction should have failed with insufficient funds")
	}
	tx2.Rollback(ctx)

	if err != ErrInsufficientFunds {
		t.Errorf("Expected ErrInsufficientFunds, got: %v", err)
	}
}

func TestIntegration_ExecuteTransaction_IdempotencyPrevention(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()
	txnRef := "TEST_IDEMPOTENT_001"

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// First transaction
	tx2, _ := testDBPool.Begin(ctx)
	err := testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		500,
		"JAZZCASH_DEPOSIT",
		txnRef,
		"Test top-up",
	)
	if err != nil {
		tx2.Rollback(ctx)
		t.Fatalf("First ExecuteTransaction failed: %v", err)
	}
	tx2.Commit(ctx)

	// Second transaction with same reference - should fail
	tx3, _ := testDBPool.Begin(ctx)
	err = testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		systemLiabilityWallet,
		userWallet.ID,
		500,
		"JAZZCASH_DEPOSIT",
		txnRef,
		"Test top-up duplicate",
	)
	if err == nil {
		tx3.Commit(ctx)
		t.Fatal("Duplicate transaction should have been prevented")
	}
	tx3.Rollback(ctx)

	// Verify only 2 ledger entries exist (from first transaction)
	walletQ := wallet_db.New(testDBPool)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, txnRef)
	if len(entries) != 2 {
		t.Errorf("Expected 2 ledger entries (not duplicated), got %d", len(entries))
	}
}

// =============================================================================
// INTEGRATION TESTS - Balance Calculation
// =============================================================================

func TestIntegration_GetBalance_AfterTopUp(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet and top up
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"TEST_BALANCE_001",
		"Test top-up",
	)
	tx2.Commit(ctx)

	// Get balance using internal method
	walletQ := wallet_db.New(testDBPool)
	balance, err := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if err != nil {
		t.Fatalf("GetWalletBalanceSnapshot failed: %v", err)
	}

	if balance != 1000 {
		t.Errorf("Balance mismatch: got %d, want 1000", balance)
	}
}

func TestIntegration_MultipleTransactions_CorrectBalance(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Top up 1000
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"TEST_MULTI_001",
		"First top-up",
	)
	tx2.Commit(ctx)

	// Top up another 500
	tx3, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		systemLiabilityWallet,
		userWallet.ID,
		500,
		"JAZZCASH_DEPOSIT",
		"TEST_MULTI_002",
		"Second top-up",
	)
	tx3.Commit(ctx)

	// Check balance
	walletQ := wallet_db.New(testDBPool)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)

	if balance != 1500 {
		t.Errorf("Balance mismatch: got %d, want 1500", balance)
	}
}

// =============================================================================
// INTEGRATION TESTS - Multi-User Isolation
// =============================================================================

func TestIntegration_MultipleUsers_WalletIsolation(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create wallets for both users
	tx1, _ := testDBPool.Begin(ctx)
	wallet1, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	wallet2, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID2)
	tx1.Commit(ctx)

	// Top up user 1
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		wallet1.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"USER1_TOPUP",
		"User 1 top-up",
	)
	tx2.Commit(ctx)

	// Top up user 2
	tx3, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		systemLiabilityWallet,
		wallet2.ID,
		2000,
		"JAZZCASH_DEPOSIT",
		"USER2_TOPUP",
		"User 2 top-up",
	)
	tx3.Commit(ctx)

	// Verify balances are isolated
	walletQ := wallet_db.New(testDBPool)
	balance1, _ := walletQ.GetWalletBalanceSnapshot(ctx, wallet1.ID)
	balance2, _ := walletQ.GetWalletBalanceSnapshot(ctx, wallet2.ID)

	if balance1 != 1000 {
		t.Errorf("User 1 balance: got %d, want 1000", balance1)
	}
	if balance2 != 2000 {
		t.Errorf("User 2 balance: got %d, want 2000", balance2)
	}
}

// =============================================================================
// INTEGRATION TESTS - Transaction Rollback
// =============================================================================

func TestIntegration_TransactionRollback_NoPartialCredit(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Execute transaction but rollback
	tx2, _ := testDBPool.Begin(ctx)
	err := testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"TEST_ROLLBACK",
		"Test rollback",
	)
	if err != nil {
		t.Fatalf("ExecuteTransaction failed: %v", err)
	}

	// Rollback instead of commit
	tx2.Rollback(ctx)

	// Balance should still be 0
	walletQ := wallet_db.New(testDBPool)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance != 0 {
		t.Errorf("Balance should be 0 after rollback, got %d", balance)
	}

	// No ledger entries should exist
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, "TEST_ROLLBACK")
	if len(entries) != 0 {
		t.Errorf("No ledger entries should exist after rollback, got %d", len(entries))
	}
}

// =============================================================================
// BENCHMARKS
// =============================================================================

func BenchmarkIntegration_ExecuteTransaction(b *testing.B) {
	cleanupTestWallets(&testing.T{})
	defer cleanupTestWallets(&testing.T{})

	ctx := context.Background()

	// Create user wallet
	tx, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx, testUserID1)
	tx.Commit(ctx)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tx, _ := testDBPool.Begin(ctx)
		ref := fmt.Sprintf("BENCH_TXN_%d_%d", time.Now().UnixNano(), i)
		testWalletSvc.ExecuteTransaction(
			ctx, tx,
			systemLiabilityWallet,
			userWallet.ID,
			100,
			"JAZZCASH_DEPOSIT",
			ref,
			"Benchmark transaction",
		)
		tx.Commit(ctx)
	}
}

func BenchmarkIntegration_GetBalance(b *testing.B) {
	cleanupTestWallets(&testing.T{})
	defer cleanupTestWallets(&testing.T{})

	ctx := context.Background()

	// Create user wallet and add some transactions
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	for i := 0; i < 10; i++ {
		tx, _ := testDBPool.Begin(ctx)
		ref := fmt.Sprintf("SETUP_TXN_%d", i)
		testWalletSvc.ExecuteTransaction(
			ctx, tx,
			systemLiabilityWallet,
			userWallet.ID,
			100,
			"JAZZCASH_DEPOSIT",
			ref,
			"Setup transaction",
		)
		tx.Commit(ctx)
	}

	walletQ := wallet_db.New(testDBPool)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	}
}

func seedSystemWallets(ctx context.Context, pool *pgxpool.Pool) error {
	wallets := []struct {
		Name     string
		Type     string
		Status   string
		Currency string
	}{
		{string(GikiWallet), string(SystemWalletLiability), "ACTIVE", "PKR"},
		{string(TransportSystemWallet), string(SystemWalletRevenue), "ACTIVE", "PKR"},
	}

	for _, w := range wallets {
		// Use a fixed UUID for system user if needed, or leave it null/generic
		// For now assuming existing user_id column constraints
		// Create a system user first just in case
		sysUserID := uuid.New()
		pool.Exec(ctx, `
			INSERT INTO giki_wallet.users (id, name, email, phone_number, auth_provider, is_active, is_verified, user_type, password_hash, password_algo)
			VALUES ($1, 'System', 'system_' || $1 || '@giki.edu.pk', '00000000000', 'system', true, true, 'admin', 'test_hash', 'bcrypt')
			ON CONFLICT (email) DO NOTHING
			`, sysUserID)

		// Check if user already exists to reuse ID
		var existingID uuid.UUID
		err := pool.QueryRow(ctx, "SELECT id FROM giki_wallet.users WHERE email = $1", "system_"+sysUserID.String()+"@giki.edu.pk").Scan(&existingID)
		if err == nil {
			sysUserID = existingID
		} else {
			// Insert new user if not found
			// Use random phone number to avoid unique constraint violation
			phoneSuffixStr := fmt.Sprintf("%07d", sysUserID.ID()%10000000)
			_, err = pool.Exec(ctx, `
			INSERT INTO giki_wallet.users (id, name, email, phone_number, auth_provider, is_active, is_verified, user_type, password_hash, password_algo)
			VALUES ($1, 'System', 'system_' || CAST($2 AS TEXT) || '@giki.edu.pk', '0300' || $3, 'system', true, true, 'admin', 'test_hash', 'bcrypt')
			`, sysUserID, sysUserID, phoneSuffixStr)
			if err != nil {
				return fmt.Errorf("failed to insert system user: %w", err)
			}
		}

		// Check if wallet exists or insert new one
		var walletID uuid.UUID
		err = pool.QueryRow(ctx, "SELECT id FROM giki_wallet.wallets WHERE name = $1 AND type = $2", w.Name, w.Type).Scan(&walletID)
		if err != nil {
			// Not found, insert
			err = pool.QueryRow(ctx, `
				INSERT INTO giki_wallet.wallets (user_id, name, type, status, currency)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING id
			`, sysUserID, w.Name, w.Type, w.Status, w.Currency).Scan(&walletID)

			if err != nil {
				return fmt.Errorf("failed to insert wallet %s: %w", w.Name, err)
			}
		}

		// Assign to global variables
		if w.Name == string(GikiWallet) {
			systemLiabilityWallet = walletID
		} else if w.Name == string(TransportSystemWallet) {
			systemRevenueWallet = walletID
		}
	}
	return nil
}
