package wallet

import (
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	walletdb "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
)

type SystemWalletType string

const (
	SystemWalletRevenue   SystemWalletType = "SYS_REVENUE"   // Where ticket money goes
	SystemWalletLiability SystemWalletType = "SYS_LIABILITY" // Where top-up money comes from
)

type SystemWalletName string

const (
	TransportSystemWallet SystemWalletName = "Transport Revenue"
	GikiWallet            SystemWalletName = "GIKI Wallet"
)

type Wallet struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Status    string    `json:"status"`
	Currency  string    `json:"currency"`
	CreatedAt time.Time `json:"created_at"`
}

func MapDBWalletToWallet(dbWallet walletdb.GikiWalletWallet) *Wallet {
	return &Wallet{
		ID:        dbWallet.ID,
		UserID:    dbWallet.UserID.Bytes,
		Name:      common.TextToString(dbWallet.Name),
		Type:      common.TextToString(dbWallet.Type),
		Status:    dbWallet.Status,
		Currency:  dbWallet.Currency,
		CreatedAt: dbWallet.CreatedAt,
	}
}

type BalanceResponse struct {
	Balance  float64 `json:"balance"`
	Currency string  `json:"currency"`
}

type TransactionHistoryItem struct {
	ID           uuid.UUID `json:"id"`
	Amount       float64   `json:"amount"`
	BalanceAfter float64   `json:"balance_after"`
	Type         string    `json:"type"`
	ReferenceID  string    `json:"reference_id"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
}

type LedgerHistoryWithPagination struct {
	Data       []TransactionHistoryItem `json:"data"`
	TotalCount int64                    `json:"total_count"`
	Page       int                      `json:"page"`
	PageSize   int                      `json:"page_size"`
}
