package wallet

import (
	"net/http"

	"github.com/hash-walker/giki-wallet/internal/common/errors"
)

var (
	// Wallet Errors
	ErrWalletNotFound      = errors.New("WALLET_NOT_FOUND", http.StatusNotFound, "Wallet not found")
	ErrWalletInactive      = errors.New("WALLET_INACTIVE", http.StatusForbidden, "Wallet is inactive")
	ErrInsufficientBalance = errors.New("INSUFFICIENT_BALANCE", http.StatusBadRequest, "Insufficient wallet balance")
	ErrInsufficientFunds   = errors.New("INSUFFICIENT_FUNDS", http.StatusBadRequest, "Insufficient funds")

	// Ledger Errors
	ErrDuplicateLedgerEntry = errors.New("DUPLICATE_LEDGER_ENTRY", http.StatusConflict, "Duplicate ledger entry")

	// System Wallet Errors
	ErrSystemWalletNotFound = errors.New("SYSTEM_WALLET_NOT_FOUND", http.StatusInternalServerError, "System wallet not found")

	// Database Errors
	ErrDatabase = errors.New("WALLET_DATABASE_ERROR", http.StatusInternalServerError, "Wallet database operation failed")
)
