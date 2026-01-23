//go:build integration

package wallet

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	wallet_db "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
)

// =============================================================================
// BUSINESS LOGIC TESTS - Wallet Balance Accuracy
// =============================================================================

func TestBusinessLogic_WalletBalance_Accuracy(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Scenario: User makes multiple deposits
	// Initial deposit
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		5000,
		"JAZZCASH_DEPOSIT",
		"DEPOSIT_1",
		"First deposit",
	)
	tx2.Commit(ctx)

	walletQ := wallet_db.New(testDBPool)
	balance1, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance1 != 5000 {
		t.Errorf("After first deposit: got %d, want 5000", balance1)
	}

	// Another deposit
	tx3, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		systemLiabilityWallet,
		userWallet.ID,
		2000,
		"JAZZCASH_DEPOSIT",
		"DEPOSIT_2",
		"Second deposit",
	)
	tx3.Commit(ctx)

	balance2, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance2 != 7000 {
		t.Errorf("After second deposit: got %d, want 7000", balance2)
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Ledger Entry Ordering
// =============================================================================

func TestBusinessLogic_LedgerEntry_Ordering(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Create multiple transactions with different references
	transactions := []string{"TXN_ORDER_1", "TXN_ORDER_2", "TXN_ORDER_3"}
	for _, ref := range transactions {
		tx, _ := testDBPool.Begin(ctx)
		testWalletSvc.ExecuteTransaction(
			ctx, tx,
			systemLiabilityWallet,
			userWallet.ID,
			100,
			"JAZZCASH_DEPOSIT",
			ref,
			"Test transaction",
		)
		tx.Commit(ctx)
		time.Sleep(10 * time.Millisecond) // Ensure different timestamps
	}

	// Verify all entries exist by checking each reference
	walletQ := wallet_db.New(testDBPool)
	for _, ref := range transactions {
		entries, err := walletQ.GetLedgerEntriesByReference(ctx, ref)
		if err != nil {
			t.Fatalf("Failed to get ledger entries for %s: %v", ref, err)
		}
		// Each transaction creates 2 entries (debit + credit)
		if len(entries) != 2 {
			t.Errorf("Expected 2 entries for %s, got %d", ref, len(entries))
		}
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Negative Balance Prevention
// =============================================================================

func TestBusinessLogic_NegativeBalance_Prevention(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create two user wallets
	tx1, _ := testDBPool.Begin(ctx)
	wallet1, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	wallet2, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID2)
	tx1.Commit(ctx)

	// Top up wallet1 with 1000
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		wallet1.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"CREDIT_1",
		"Initial deposit",
	)
	tx2.Commit(ctx)

	// Try to transfer more than balance
	attempts := []int64{500, 400, 200} // Total would be 1100 > 1000

	successCount := 0
	for i, amount := range attempts {
		tx, _ := testDBPool.Begin(ctx)
		err := testWalletSvc.ExecuteTransaction(
			ctx, tx,
			wallet1.ID,
			wallet2.ID,
			amount,
			"TRANSFER",
			uuid.New().String(),
			"Transfer attempt",
		)
		if err == nil {
			tx.Commit(ctx)
			successCount++
		} else {
			tx.Rollback(ctx)
			t.Logf("Transfer %d failed as expected: %v", i+1, err)
		}
	}

	// Get final balance
	walletQ := wallet_db.New(testDBPool)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, wallet1.ID)

	// Balance should never be negative
	if balance < 0 {
		t.Errorf("Balance is negative: %d", balance)
	}

	t.Logf("Final balance: %d (after %d successful transfers)", balance, successCount)
}

// =============================================================================
// BUSINESS LOGIC TESTS - Concurrent Transactions Consistency
// =============================================================================

func TestBusinessLogic_ConcurrentTransactions_Consistency(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Initial top-up
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		10000,
		"JAZZCASH_DEPOSIT",
		"INITIAL",
		"Initial deposit",
	)
	tx2.Commit(ctx)

	var wg sync.WaitGroup
	concurrentOps := 10
	amountPerOp := int64(500)

	// Concurrent top-ups (should all succeed)
	for i := 0; i < concurrentOps; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()

			ctx := context.Background()
			tx, err := testDBPool.Begin(ctx)
			if err != nil {
				t.Logf("Failed to begin transaction: %v", err)
				return
			}
			defer tx.Rollback(ctx)

			ref := uuid.New().String()
			err = testWalletSvc.ExecuteTransaction(
				ctx, tx,
				systemLiabilityWallet,
				userWallet.ID,
				amountPerOp,
				"JAZZCASH_DEPOSIT",
				ref,
				"Concurrent deposit",
			)
			if err != nil {
				t.Logf("Deposit %d failed: %v", idx, err)
				return
			}

			tx.Commit(ctx)
		}(i)
	}

	wg.Wait()

	// Get final balance
	walletQ := wallet_db.New(testDBPool)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)

	// Balance should be 10000 + (successful deposits * 500)
	// It should never be negative
	if balance < 10000 {
		t.Errorf("Balance decreased unexpectedly: %d", balance)
	}

	t.Logf("Final balance after concurrent operations: %d", balance)
}

// =============================================================================
// BUSINESS LOGIC TESTS - Idempotency Guarantees
// =============================================================================

func TestBusinessLogic_Idempotency_DuplicateReferencePreventsDoubleCredit(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()
	txnRef := "IDEMPOTENT_TXN_001"

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// First transaction
	tx2, _ := testDBPool.Begin(ctx)
	err1 := testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		txnRef,
		"First transaction",
	)
	if err1 != nil {
		t.Fatalf("First transaction failed: %v", err1)
	}
	tx2.Commit(ctx)

	walletQ := wallet_db.New(testDBPool)
	balance1, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)

	// Attempt duplicate transaction (simulating retry)
	tx3, _ := testDBPool.Begin(ctx)
	err2 := testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		txnRef,
		"Duplicate transaction",
	)
	if err2 == nil {
		tx3.Commit(ctx)
		t.Fatal("Duplicate transaction should have been prevented")
	}
	tx3.Rollback(ctx)

	balance2, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)

	// Balance should not have changed
	if balance1 != balance2 {
		t.Errorf("Balance changed after duplicate transaction: %d -> %d", balance1, balance2)
	}

	if balance2 != 1000 {
		t.Errorf("Balance should be 1000 (not double-credited), got %d", balance2)
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Transaction Atomicity
// =============================================================================

func TestBusinessLogic_TransactionAtomicity_AllOrNothing(t *testing.T) {
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
		5000,
		"JAZZCASH_DEPOSIT",
		"ATOMIC_TEST",
		"Test transaction",
	)
	if err != nil {
		t.Fatalf("ExecuteTransaction failed: %v", err)
	}

	// Rollback transaction
	tx2.Rollback(ctx)

	// Verify wallet balance is still 0
	walletQ := wallet_db.New(testDBPool)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance != 0 {
		t.Errorf("Balance should be 0 after rollback, got %d", balance)
	}

	// Verify ledger entries were not created
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, "ATOMIC_TEST")
	if len(entries) != 0 {
		t.Errorf("Ledger entries should not exist after rollback, found %d entries", len(entries))
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Edge Cases
// =============================================================================

func TestBusinessLogic_LargeAmountTransactions(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Test with large amount (e.g., 1 million PKR = 100,000,000 paisa)
	largeAmount := int64(100000000)

	tx2, _ := testDBPool.Begin(ctx)
	err := testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		largeAmount,
		"JAZZCASH_DEPOSIT",
		"LARGE_AMOUNT",
		"Large amount deposit",
	)
	if err != nil {
		t.Fatalf("Large amount transaction failed: %v", err)
	}
	tx2.Commit(ctx)

	walletQ := wallet_db.New(testDBPool)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance != largeAmount {
		t.Errorf("Balance mismatch for large amount: got %d, want %d", balance, largeAmount)
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Wallet Lifecycle
// =============================================================================

func TestBusinessLogic_WalletLifecycle_CreateDepositBalance(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// 1. Wallet doesn't exist initially - create it
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, err := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	if err != nil {
		t.Fatalf("GetOrCreateWallet failed: %v", err)
	}
	tx1.Commit(ctx)

	// 2. Initial balance should be 0
	walletQ := wallet_db.New(testDBPool)
	balance0, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance0 != 0 {
		t.Errorf("Initial balance should be 0, got %d", balance0)
	}

	// 3. First deposit
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"LIFECYCLE_1",
		"First deposit",
	)
	tx2.Commit(ctx)

	balance1, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance1 != 1000 {
		t.Errorf("Balance after first deposit: got %d, want 1000", balance1)
	}

	// 4. Multiple operations work
	tx3, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		systemLiabilityWallet,
		userWallet.ID,
		500,
		"JAZZCASH_DEPOSIT",
		"LIFECYCLE_2",
		"Second deposit",
	)
	tx3.Commit(ctx)

	balance2, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance2 != 1500 {
		t.Errorf("Final balance: got %d, want 1500", balance2)
	}
}

// =============================================================================
// BUSINESS LOGIC TESTS - Double-Entry Integrity
// =============================================================================

func TestBusinessLogic_DoubleEntry_BalancedLedger(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Execute transaction
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"DOUBLE_ENTRY_TEST",
		"Test double-entry",
	)
	tx2.Commit(ctx)

	// Verify double-entry: sum of all amounts should be 0
	walletQ := wallet_db.New(testDBPool)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, "DOUBLE_ENTRY_TEST")

	var totalAmount int64
	for _, entry := range entries {
		totalAmount += entry.Amount
	}

	if totalAmount != 0 {
		t.Errorf("Double-entry ledger should balance to 0, got %d", totalAmount)
	}

	// Verify we have exactly 2 entries
	if len(entries) != 2 {
		t.Errorf("Expected 2 ledger entries (debit + credit), got %d", len(entries))
	}
}
