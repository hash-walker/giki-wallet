//go:build integration

package wallet

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	wallet_db "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
)

// =============================================================================
// LEDGER ENTRY TESTS - Top-Up Scenarios
// =============================================================================

func TestLedger_TopUp_CreatesCorrectEntry(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()
	txnRef := "TOPUP_TXN_001"
	amount := int64(1000)

	// Create user wallet first
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, err := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	if err != nil {
		t.Fatalf("Failed to create user wallet: %v", err)
	}
	tx1.Commit(ctx)

	// Perform top-up (credit wallet) using double-entry
	tx2, _ := testDBPool.Begin(ctx)
	err = testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		amount,
		"JAZZCASH_DEPOSIT",
		txnRef,
		"Test top-up",
	)
	if err != nil {
		tx2.Rollback(ctx)
		t.Fatalf("ExecuteTransaction failed: %v", err)
	}
	tx2.Commit(ctx)

	// Verify ledger entries were created
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, txnRef)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	// Should be 2 entries (debit from system, credit to user)
	if len(entries) != 2 {
		t.Fatalf("Expected 2 ledger entries, got %d", len(entries))
	}

	// Find the user's credit entry
	var creditEntry wallet_db.GetLedgerEntriesByReferenceRow
	foundCredit := false
	for _, e := range entries {
		walletID, _ := getLedgerEntryWalletID(ctx, e.ID)
		if walletID == userWallet.ID {
			creditEntry = e
			foundCredit = true
			break
		}
	}

	if !foundCredit {
		t.Fatal("User credit entry not found")
	}

	// Verify entry details
	if creditEntry.Amount != amount {
		t.Errorf("Ledger amount: got %d, want %d", creditEntry.Amount, amount)
	}
}

func TestLedger_MultipleTopUps_CreatesMultipleEntries(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	topups := []struct {
		amount int64
		ref    string
	}{
		{500, "TOPUP_1"},
		{1000, "TOPUP_2"},
		{250, "TOPUP_3"},
	}

	// Perform multiple top-ups
	for _, topup := range topups {
		tx, _ := testDBPool.Begin(ctx)
		err := testWalletSvc.ExecuteTransaction(
			ctx, tx,
			systemLiabilityWallet,
			userWallet.ID,
			topup.amount,
			"JAZZCASH_DEPOSIT",
			topup.ref,
			"Test top-up",
		)
		if err != nil {
			tx.Rollback(ctx)
			t.Fatalf("ExecuteTransaction failed for %s: %v", topup.ref, err)
		}
		tx.Commit(ctx)
	}

	// Verify ledger entries exist for each
	walletQ := wallet_db.New(testDBPool)
	for _, topup := range topups {
		entries, err := walletQ.GetLedgerEntriesByReference(ctx, topup.ref)
		if err != nil {
			t.Fatalf("Failed to get ledger entries for %s: %v", topup.ref, err)
		}

		if len(entries) != 2 {
			t.Errorf("Expected 2 entries for %s, got %d", topup.ref, len(entries))
		}
	}

	// Verify total balance matches sum of top-ups
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	expectedBalance := int64(1750) // 500 + 1000 + 250
	if balance != expectedBalance {
		t.Errorf("Total balance: got %d, want %d", balance, expectedBalance)
	}
}

func TestLedger_TopUpIdempotency_PreventsDuplicateEntries(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()
	txnRef := "TOPUP_IDEMPOTENT"
	amount := int64(500)

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// First top-up
	tx2, _ := testDBPool.Begin(ctx)
	err := testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		amount,
		"JAZZCASH_DEPOSIT",
		txnRef,
		"Test top-up",
	)
	if err != nil {
		tx2.Rollback(ctx)
		t.Fatalf("First transaction failed: %v", err)
	}
	tx2.Commit(ctx)

	// Attempt duplicate top-up with same reference
	tx3, _ := testDBPool.Begin(ctx)
	err = testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		systemLiabilityWallet,
		userWallet.ID,
		amount,
		"JAZZCASH_DEPOSIT",
		txnRef,
		"Test top-up duplicate",
	)
	if err == nil {
		tx3.Commit(ctx)
		t.Fatal("Duplicate top-up should have been prevented")
	}
	tx3.Rollback(ctx)

	// Verify only 2 ledger entries exist (from first transaction)
	walletQ := wallet_db.New(testDBPool)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, txnRef)
	if len(entries) != 2 {
		t.Errorf("Expected 2 ledger entries (idempotent), got %d", len(entries))
	}

	// Verify balance is correct (not double-credited)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)
	if balance != amount {
		t.Errorf("Balance should be %d (not double-credited), got %d", amount, balance)
	}
}

// =============================================================================
// LEDGER ENTRY TESTS - Purchase/Debit Scenarios
// =============================================================================

func TestLedger_Purchase_CreatesNegativeEntry(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Top-up first
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"TOPUP",
		"Initial top-up",
	)
	tx2.Commit(ctx)

	// Make a purchase (transfer to revenue wallet)
	purchaseRef := "PURCHASE_001"
	purchaseAmount := int64(300)

	// Ensure system revenue wallet exists
	if systemRevenueWallet == uuid.Nil {
		// Try to get it again or create dummy
		var err error
		systemRevenueWallet, err = testWalletSvc.GetSystemWalletByName(ctx, TransportSystemWallet, SystemWalletRevenue)
		if err != nil {
			t.Log("Using dummy revenue wallet as system revenue wallet not found")
			// Use system liability wallet as destination just for test structure
			systemRevenueWallet = systemLiabilityWallet
		}
	}

	tx3, _ := testDBPool.Begin(ctx)
	err := testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		userWallet.ID,
		systemRevenueWallet,
		purchaseAmount,
		"TICKET_PURCHASE",
		purchaseRef,
		"Ticket purchase",
	)
	if err != nil {
		tx3.Rollback(ctx)
		t.Fatalf("Purchase transaction failed: %v", err)
	}
	tx3.Commit(ctx)

	// Verify ledger entries
	walletQ := wallet_db.New(testDBPool)
	entries, err := walletQ.GetLedgerEntriesByReference(ctx, purchaseRef)
	if err != nil {
		t.Fatalf("Failed to get ledger entries: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("Expected 2 ledger entries, got %d", len(entries))
	}

	// Find the user's debit entry
	var debitEntry wallet_db.GetLedgerEntriesByReferenceRow
	foundDebit := false
	for _, e := range entries {
		walletID, _ := getLedgerEntryWalletID(ctx, e.ID)
		if walletID == userWallet.ID {
			debitEntry = e
			foundDebit = true
			break
		}
	}

	if !foundDebit {
		t.Fatal("User debit entry not found")
	}

	// Verify amount is negative
	expectedAmount := -1 * purchaseAmount
	if debitEntry.Amount != expectedAmount {
		t.Errorf("Ledger amount: got %d, want %d (negative)", debitEntry.Amount, expectedAmount)
	}
}

// =============================================================================
// LEDGER ENTRY TESTS - Transaction Types
// =============================================================================

func TestLedger_TransactionTypes_HeadersCreated(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	txnTypes := []string{"JAZZCASH_DEPOSIT", "TICKET_PURCHASE", "REFUND"}

	for i, txType := range txnTypes {
		ref := uuid.New().String()

		tx, _ := testDBPool.Begin(ctx)
		// For simplicity, just doing transfers between user and system liability
		// In real scenarios, different flows use different wallets, but we're testing headers here
		var err error
		if i%2 == 0 {
			err = testWalletSvc.ExecuteTransaction(ctx, tx, systemLiabilityWallet, userWallet.ID, 100, txType, ref, "Test")
		} else {
			// Top up first for debit test
			txPre, _ := testDBPool.Begin(ctx)
			testWalletSvc.ExecuteTransaction(ctx, txPre, systemLiabilityWallet, userWallet.ID, 1000, "SETUP", uuid.New().String(), "Setup")
			txPre.Commit(ctx)

			err = testWalletSvc.ExecuteTransaction(ctx, tx, userWallet.ID, systemLiabilityWallet, 100, txType, ref, "Test")
		}

		if err != nil {
			tx.Rollback(ctx)
			t.Fatalf("Transaction %s failed: %v", txType, err)
		}
		tx.Commit(ctx)

		// Verify ledger entries exist
		walletQ := wallet_db.New(testDBPool)
		entries, _ := walletQ.GetLedgerEntriesByReference(ctx, ref)
		if len(entries) != 2 {
			t.Errorf("Expected 2 entries for %s", txType)
		}
	}
}

// =============================================================================
// LEDGER ENTRY TESTS - Wallet Association
// =============================================================================

func TestLedger_EntriesLinkedToCorrectWallet(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create wallets
	tx1, _ := testDBPool.Begin(ctx)
	wallet1, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	wallet2, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID2)
	tx1.Commit(ctx)

	// Transfer between wallets
	tx2, _ := testDBPool.Begin(ctx)
	// Wallet 1 gets funds first
	testWalletSvc.ExecuteTransaction(ctx, tx2, systemLiabilityWallet, wallet1.ID, 1000, "TOPUP", "SETUP_1", "Setup")
	tx2.Commit(ctx)

	// Wallet 1 sends to Wallet 2
	tx3, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx3,
		wallet1.ID,
		wallet2.ID,
		500,
		"TRANSFER",
		"TRANSFER_1",
		"Test transfer",
	)
	tx3.Commit(ctx)

	// Verify entries match correct wallets
	walletQ := wallet_db.New(testDBPool)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, "TRANSFER_1")

	for _, entry := range entries {
		walletID, _ := getLedgerEntryWalletID(ctx, entry.ID)

		if walletID == wallet1.ID {
			if entry.Amount >= 0 {
				t.Error("Sender wallet should have negative amount")
			}
		} else if walletID == wallet2.ID {
			if entry.Amount <= 0 {
				t.Error("Receiver wallet should have positive amount")
			}
		} else {
			t.Error("Ledger entry linked to unknown wallet")
		}
	}
}

// =============================================================================
// LEDGER ENTRY TESTS - Timestamps
// =============================================================================

func TestLedger_Timestamps_SetCorrectly(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	beforeTime := time.Now()

	// Create ledger entry
	tx2, _ := testDBPool.Begin(ctx)
	testWalletSvc.ExecuteTransaction(
		ctx, tx2,
		systemLiabilityWallet,
		userWallet.ID,
		1000,
		"JAZZCASH_DEPOSIT",
		"TIMESTAMP_TEST",
		"Timestamp test",
	)
	tx2.Commit(ctx)

	afterTime := time.Now()

	// Verify timestamp
	walletQ := wallet_db.New(testDBPool)
	entries, _ := walletQ.GetLedgerEntriesByReference(ctx, "TIMESTAMP_TEST")

	if len(entries) > 0 {
		entry := entries[0]

		if entry.CreatedAt.Before(beforeTime) {
			t.Error("Ledger created_at is before transaction started")
		}

		if entry.CreatedAt.After(afterTime) {
			t.Error("Ledger created_at is after transaction completed")
		}
	}
}

// =============================================================================
// LEDGER ENTRY TESTS - Balance Calculation
// =============================================================================

func TestLedger_BalanceCalculation_SumsAllEntries(t *testing.T) {
	cleanupTestWallets(t)
	defer cleanupTestWallets(t)

	ctx := context.Background()

	// Create user wallet
	tx1, _ := testDBPool.Begin(ctx)
	userWallet, _ := testWalletSvc.GetOrCreateWallet(ctx, tx1, testUserID1)
	tx1.Commit(ctx)

	// Create multiple transactions
	transactions := []struct {
		amount int64 // Positive means credit to user, negative means debit from user
		ref    string
	}{
		{1000, "ENTRY_1"},
		{500, "ENTRY_2"},
		{-200, "ENTRY_3"},
		{300, "ENTRY_4"},
		{-150, "ENTRY_5"},
	}

	for _, txn := range transactions {
		tx, _ := testDBPool.Begin(ctx)
		var err error
		if txn.amount > 0 {
			err = testWalletSvc.ExecuteTransaction(ctx, tx, systemLiabilityWallet, userWallet.ID, txn.amount, "CREDIT", txn.ref, "Credit")
		} else {
			// For debit, user is sender
			err = testWalletSvc.ExecuteTransaction(ctx, tx, userWallet.ID, systemLiabilityWallet, -txn.amount, "DEBIT", txn.ref, "Debit")
		}

		if err != nil {
			tx.Rollback(ctx)
			t.Fatalf("Transaction %s failed: %v", txn.ref, err)
		}
		tx.Commit(ctx)
	}

	// Calculate expected balance
	expectedBalance := int64(1000 + 500 - 200 + 300 - 150) // = 1450

	// Get actual balance
	walletQ := wallet_db.New(testDBPool)
	balance, _ := walletQ.GetWalletBalanceSnapshot(ctx, userWallet.ID)

	if balance != expectedBalance {
		t.Errorf("Balance calculation: got %d, want %d", balance, expectedBalance)
	}
}
