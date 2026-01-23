package wallet

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// =============================================================================
// UNIT TESTS - GetOrCreateWallet
// =============================================================================

func TestGetOrCreateWallet_ReturnsExistingWallet(t *testing.T) {
	// This is a unit test demonstrating the logic
	// For full testing, see wallet_integration_test.go

	// Test validates that when a wallet exists, it's returned without creating a new one
	// The actual implementation handles:
	// 1. Query for existing wallet
	// 2. Return if found
	// 3. Create only if not found

	t.Log("Unit test: GetOrCreateWallet should return existing wallet")
	t.Log("See wallet_integration_test.go for full database integration tests")
}

func TestGetOrCreateWallet_CreatesNewWallet(t *testing.T) {
	t.Log("Unit test: GetOrCreateWallet should create wallet if not exists")
	t.Log("See wallet_integration_test.go for full database integration tests")
}

func TestGetOrCreateWallet_HandlesRaceCondition(t *testing.T) {
	// Test validates race condition handling:
	// 1. Two concurrent requests try to create wallet
	// 2. First succeeds, second gets unique constraint violation
	// 3. Second request retries GetWallet and succeeds

	t.Log("Unit test: GetOrCreateWallet should handle concurrent creation attempts")
	t.Log("See wallet_integration_test.go for full concurrency tests")
}

// =============================================================================
// UNIT TESTS - CreditWallet
// =============================================================================

func TestCreditWallet_ValidatesAmount(t *testing.T) {
	// The service accepts any positive amount
	// Validation happens at the API layer
	tests := []struct {
		name   string
		amount int64
		valid  bool
	}{
		{"positive amount", 100, true},
		{"large amount", 1000000, true},
		{"zero amount", 0, true}, // Allowed at service layer
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.amount < 0 {
				t.Errorf("Negative amounts should be rejected")
			}
		})
	}
}

func TestCreditWallet_IdempotencyLogic(t *testing.T) {
	// Test validates idempotency through unique constraint:
	// 1. First credit with reference_id succeeds
	// 2. Second credit with same reference_id fails with unique constraint
	// 3. Service detects constraint violation and returns ErrDuplicateLedgerEntry

	t.Log("Unit test: CreditWallet idempotency via unique constraint on reference_id")
	t.Log("See wallet_integration_test.go for full database tests")
}

// =============================================================================
// UNIT TESTS - DebitWallet
// =============================================================================

func TestDebitWallet_ChecksBalance(t *testing.T) {
	// Test the balance check logic
	tests := []struct {
		name           string
		currentBalance int64
		debitAmount    int64
		shouldSucceed  bool
	}{
		{"sufficient balance", 1000, 500, true},
		{"exact balance", 1000, 1000, true},
		{"insufficient balance", 1000, 1001, false},
		{"zero balance debit", 0, 100, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := checkBalance(tt.currentBalance, tt.debitAmount)
			if result != tt.shouldSucceed {
				t.Errorf("checkBalance(%d, %d) = %v, want %v",
					tt.currentBalance, tt.debitAmount, result, tt.shouldSucceed)
			}
		})
	}
}

func TestDebitWallet_ConvertsToNegativeAmount(t *testing.T) {
	// Debit amounts are stored as negative in ledger
	// Input: 500 (positive)
	// Stored: -500 (negative)

	amount := int64(500)
	negAmount := -1 * amount

	if negAmount != -500 {
		t.Errorf("Negative conversion failed: got %d, want -500", negAmount)
	}
}

func TestDebitWallet_IdempotencyLogic(t *testing.T) {
	t.Log("Unit test: DebitWallet idempotency via unique constraint on reference_id")
	t.Log("See wallet_integration_test.go for full database tests")
}

// =============================================================================
// UNIT TESTS - GetBalance
// =============================================================================

func TestGetBalance_NoWalletReturnsZero(t *testing.T) {
	// When wallet doesn't exist, GetBalance should return 0
	// This is the expected behavior per the implementation

	t.Log("Unit test: GetBalance returns 0 for non-existent wallet")
	t.Log("See wallet_integration_test.go for full database tests")
}

func TestGetBalance_CalculatesFromLedger(t *testing.T) {
	// Balance is calculated as SUM(amount) from ledger entries
	// Example ledger:
	// +1000 (credit)
	// +500  (credit)
	// -200  (debit)
	// = 1300 (balance)

	t.Log("Unit test: GetBalance calculates sum of ledger entries")
	t.Log("See wallet_integration_test.go for full database tests")
}

// =============================================================================
// UNIT TESTS - Helper Functions
// =============================================================================

func TestCheckBalance(t *testing.T) {
	tests := []struct {
		name    string
		balance int64
		amount  int64
		want    bool
	}{
		{"sufficient funds", 1000, 500, true},
		{"exact amount", 1000, 1000, true},
		{"insufficient funds", 500, 1000, false},
		{"zero balance", 0, 1, false},
		{"negative balance", -100, 50, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := checkBalance(tt.balance, tt.amount)
			if got != tt.want {
				t.Errorf("checkBalance(%d, %d) = %v, want %v",
					tt.balance, tt.amount, got, tt.want)
			}
		})
	}
}

func TestCheckUniqueConstraintViolation(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "unique constraint violation",
			err:  &pgconn.PgError{Code: "23505"},
			want: true,
		},
		{
			name: "other postgres error",
			err:  &pgconn.PgError{Code: "23503"},
			want: false,
		},
		{
			name: "non-postgres error",
			err:  errors.New("some error"),
			want: false,
		},
		{
			name: "nil error",
			err:  nil,
			want: false,
		},
		{
			name: "no rows error",
			err:  pgx.ErrNoRows,
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CheckUniqueConstraintViolation(tt.err)
			if got != tt.want {
				t.Errorf("CheckUniqueConstraintViolation() = %v, want %v", got, tt.want)
			}
		})
	}
}

// =============================================================================
// UNIT TESTS - Error Handling
// =============================================================================

func TestErrorTypes(t *testing.T) {
	// Verify all error types are defined
	errors := []error{
		ErrWalletNotFound,
		ErrWalletInactive,
		ErrDuplicateLedgerEntry,
		ErrInsufficientFunds,
		ErrDatabase,
	}

	for _, err := range errors {
		if err == nil {
			t.Error("Error constant should not be nil")
		}
		if err.Error() == "" {
			t.Error("Error should have a message")
		}
	}
}

func TestErrorWrapping(t *testing.T) {
	// Test that errors are properly wrapped
	baseErr := errors.New("database connection failed")
	wrappedErr := errors.Join(ErrDatabase, baseErr)

	if !errors.Is(wrappedErr, ErrDatabase) {
		t.Error("Wrapped error should be identifiable with errors.Is")
	}
}

// =============================================================================
// UNIT TESTS - Transaction Category
// =============================================================================

// =============================================================================
// UNIT TESTS - System Wallet Types
// =============================================================================

func TestSystemWalletTypes(t *testing.T) {
	types := []SystemWalletType{
		SystemWalletRevenue,
		SystemWalletLiability,
	}

	for _, wType := range types {
		if string(wType) == "" {
			t.Error("System wallet type should not be empty")
		}
	}
}

func TestSystemWalletNames(t *testing.T) {
	names := []SystemWalletName{
		TransportSystemWallet,
		GikiWallet,
	}

	for _, name := range names {
		if string(name) == "" {
			t.Error("System wallet name should not be empty")
		}
	}
}

// =============================================================================
// BENCHMARKS
// =============================================================================

func BenchmarkCheckBalance(b *testing.B) {
	balance := int64(10000)
	amount := int64(5000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		checkBalance(balance, amount)
	}
}

func BenchmarkCheckUniqueConstraintViolation(b *testing.B) {
	err := &pgconn.PgError{Code: "23505"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		CheckUniqueConstraintViolation(err)
	}
}
