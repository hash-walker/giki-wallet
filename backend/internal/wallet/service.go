package wallet

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	wallet "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q            *wallet.Queries
	dbPool       *pgxpool.Pool
	ledgerSecret string
}

func NewService(dbPool *pgxpool.Pool, ledgerSecret string) *Service {
	return &Service{
		q:            wallet.New(dbPool),
		dbPool:       dbPool,
		ledgerSecret: ledgerSecret,
	}
}

func (s *Service) executeDoubleEntryTransaction(
	ctx context.Context,
	tx pgx.Tx,
	senderWalletID uuid.UUID,
	receiverWalletID uuid.UUID,
	amount int64,
	txnType string,
	referenceID string,
	description string,
) error {

	walletQ := s.q.WithTx(tx)

	if amount <= 0 {
		return commonerrors.Wrap(commonerrors.ErrInvalidInput, fmt.Errorf("transaction amount must be positive"))
	}

	// lock both wallets (prevent race conditions)
	senderWallet, err := walletQ.GetWalletForUpdate(ctx, senderWalletID)
	if err != nil {
		fmt.Printf("[DEBUG] Failed to lock sender wallet: %v\n", err)
		return commonerrors.Wrap(ErrDatabase, err)
	}

	_, err = walletQ.GetWalletForUpdate(ctx, receiverWalletID)

	if err != nil {
		fmt.Printf("[DEBUG] Failed to lock receiver wallet: %v\n", err)
		return commonerrors.Wrap(ErrDatabase, err)
	}

	// check sender balance (if not system wallet)
	if common.TextToString(senderWallet.Type) != string(SystemWalletLiability) && common.TextToString(senderWallet.Type) != string(SystemWalletRevenue) {
		balance, err := s.getWalletBalance(ctx, walletQ, senderWalletID)
		if err != nil {
			return err
		}

		balanceCheck := checkBalance(balance, amount)

		if !balanceCheck {
			return ErrInsufficientFunds
		}
	}

	txnHeader, err := walletQ.CreateTransactionHeader(ctx, wallet.CreateTransactionHeaderParams{
		Type:        txnType,
		ReferenceID: referenceID,
		Description: common.StringToText(description),
	})

	if err != nil {
		return commonerrors.Wrap(ErrDatabase, err)
	}

	// get current balances
	senderBalance, _ := s.getWalletBalance(ctx, walletQ, senderWalletID)
	receiverBalance, _ := s.getWalletBalance(ctx, walletQ, receiverWalletID)

	debitHash := s.CalculateRowHash(
		senderWalletID,
		-amount,
		txnHeader.ID,
		senderBalance-amount,
		txnHeader.CreatedAt,
	)

	_, err = walletQ.CreateLedgerEntry(ctx, wallet.CreateLedgerEntryParams{
		WalletID:      senderWalletID,
		Amount:        -amount,
		TransactionID: txnHeader.ID,
		BalanceAfter:  senderBalance - amount,
		RowHash:       debitHash,
	})

	if err != nil {
		fmt.Printf("[DEBUG] Failed to create debit entry: %v\n", err)
		return commonerrors.Wrap(ErrDatabase, err)
	}

	creditHash := s.CalculateRowHash(
		receiverWalletID,
		amount,
		txnHeader.ID,
		receiverBalance+amount,
		txnHeader.CreatedAt,
	)

	// create CREDIT entry (receiver gains money)
	_, err = walletQ.CreateLedgerEntry(ctx, wallet.CreateLedgerEntryParams{
		WalletID:      receiverWalletID,
		Amount:        amount,
		TransactionID: txnHeader.ID,
		BalanceAfter:  receiverBalance + amount,
		RowHash:       creditHash,
	})

	if err != nil {
		fmt.Printf("[DEBUG] Failed to create credit entry: %v\n", err)
		return commonerrors.Wrap(ErrDatabase, err)
	}

	return nil
}

func (s *Service) ExecuteTransaction(
	ctx context.Context,
	tx pgx.Tx,
	senderWalletID uuid.UUID,
	receiverWalletID uuid.UUID,
	amount int64,
	txnType string,
	referenceID string,
	description string,
) error {

	return s.executeDoubleEntryTransaction(
		ctx, tx, senderWalletID, receiverWalletID, amount,
		txnType, referenceID, description,
	)

}

func (s *Service) RefundTicket(ctx context.Context, tx pgx.Tx, userID uuid.UUID, amount int64, referenceID string, description string) error {
	// 1. Get Transport Revenue Wallet
	transportWalletID, err := s.GetSystemWalletByName(ctx, TransportSystemWallet, SystemWalletRevenue)
	if err != nil {
		return err
	}

	// 2. Get User Wallet
	userWallet, err := s.GetOrCreateWallet(ctx, tx, userID)
	if err != nil {
		return err
	}

	// 3. Execute Transaction
	return s.ExecuteTransaction(ctx, tx, transportWalletID, userWallet.ID, amount, "REFUND", referenceID, description)
}

func (s *Service) GetOrCreateWallet(ctx context.Context, tx pgx.Tx, userID uuid.UUID) (*Wallet, error) {

	walletQ := s.q
	if tx != nil {
		walletQ = s.q.WithTx(tx)
	}

	w, err := walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(userID, true))

	if err == nil {
		return MapDBWalletToWallet(w), nil
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		middleware.LogAppError(commonerrors.Wrap(ErrDatabase, err), "wallet-get-"+userID.String())
		return nil, commonerrors.Wrap(ErrDatabase, err)
	}

	w, err = s.q.CreateWallet(ctx, wallet.CreateWalletParams{
		UserID: common.GoogleUUIDtoPgUUID(userID, true),
		Type:   common.StringToText("PERSONAL"),
		Status: "ACTIVE",
	})

	if err != nil {

		check := CheckUniqueConstraintViolation(err)

		if check {
			w, err = walletQ.GetWallet(ctx, common.GoogleUUIDtoPgUUID(userID, true))
			if err != nil {
				return nil, commonerrors.Wrap(ErrDatabase, err)
			}
			return MapDBWalletToWallet(w), nil
		} else {
			middleware.LogAppError(commonerrors.Wrap(ErrDatabase, err), "wallet-create-"+userID.String())
			return nil, commonerrors.Wrap(ErrDatabase, err)
		}
	}

	return MapDBWalletToWallet(w), nil
}

func (s *Service) GetUserBalance(ctx context.Context, userID uuid.UUID) (*BalanceResponse, error) {
	w, err := s.GetOrCreateWallet(ctx, nil, userID)
	if err != nil {
		return nil, err
	}

	balance, err := s.getWalletBalance(ctx, s.q, w.ID)
	if err != nil {
		return nil, err
	}

	return &BalanceResponse{
		Balance:  float64(balance) / 100.0,
		Currency: w.Currency,
	}, nil
}

func (s *Service) GetUserHistory(ctx context.Context, userID uuid.UUID) ([]TransactionHistoryItem, error) {
	w, err := s.GetOrCreateWallet(ctx, nil, userID)
	if err != nil {
		return nil, err
	}

	history, err := s.GetWalletHistory(ctx, w.ID, 1, 100)
	if err != nil {
		return nil, err
	}
	return history.Data, nil
}

func (s *Service) GetWalletHistory(ctx context.Context, walletID uuid.UUID, page, pageSize int) (*LedgerHistoryWithPagination, error) {
	offset := (page - 1) * pageSize
	entries, err := s.q.GetLedgerEntriesByWallet(ctx, wallet.GetLedgerEntriesByWalletParams{
		WalletID: walletID,
		Limit:    int32(pageSize),
		Offset:   int32(offset),
	})
	if err != nil {
		return nil, commonerrors.Wrap(ErrDatabase, err)
	}

	var totalCount int64 = 0
	if len(entries) > 0 {
		totalCount = entries[0].TotalCount
	}

	items := make([]TransactionHistoryItem, 0, len(entries))
	for _, e := range entries {
		items = append(items, TransactionHistoryItem{
			ID:           e.ID,
			Amount:       float64(e.Amount) / 100.0,
			BalanceAfter: float64(e.BalanceAfter) / 100.0,
			Type:         e.Type,
			ReferenceID:  e.ReferenceID,
			Description:  common.TextToString(e.Description),
			CreatedAt:    e.CreatedAt,
		})
	}

	return &LedgerHistoryWithPagination{
		Data:       items,
		TotalCount: totalCount,
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (s *Service) GetAdminRevenueTransactions(ctx context.Context, page, pageSize int, startDate, endDate time.Time, search string) ([]wallet.GetAdminRevenueTransactionsRow, int64, error) {

	revWalletID, err := s.GetSystemWalletByName(ctx, TransportSystemWallet, SystemWalletRevenue)
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize

	txns, err := s.q.GetAdminRevenueTransactions(ctx, wallet.GetAdminRevenueTransactionsParams{
		WalletID:  revWalletID,
		StartDate: startDate,
		EndDate:   endDate,
		Limit:     int32(pageSize),
		Offset:    int32(offset),
		Search:    search,
	})
	if err != nil {
		return nil, 0, commonerrors.Wrap(ErrDatabase, err)
	}

	var totalCount int64 = 0
	if len(txns) > 0 {
		totalCount = txns[0].TotalCount
	} else {
		txns = []wallet.GetAdminRevenueTransactionsRow{}
	}

	return txns, totalCount, nil
}

func (s *Service) GetWeeklyStats(ctx context.Context, startDate, endDate time.Time) (*wallet.GetWeeklyWalletStatsRow, error) {
	revWalletID, err := s.GetSystemWalletByName(ctx, TransportSystemWallet, SystemWalletRevenue)
	if err != nil {
		return nil, err
	}

	stats, err := s.q.GetWeeklyWalletStats(ctx, wallet.GetWeeklyWalletStatsParams{
		WalletID:  revWalletID,
		StartDate: startDate,
		EndDate:   endDate,
	})
	if err != nil {
		return nil, commonerrors.Wrap(ErrDatabase, err)
	}

	return &stats, nil
}

func (s *Service) GetSystemWalletByName(ctx context.Context, walletName SystemWalletName, walletType SystemWalletType) (uuid.UUID, error) {

	walletQ := s.q

	sysWallet, err := walletQ.GetSystemWalletByName(ctx, wallet.GetSystemWalletByNameParams{
		Name: common.StringToText(string(walletName)),
		Type: common.StringToText(string(walletType)),
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			sysWallet, createErr := walletQ.CreateWallet(ctx, wallet.CreateWalletParams{
				UserID:  pgtype.UUID{Valid: false},
				Column2: common.StringToText(string(walletName)),
				Type:    common.StringToText(string(walletType)),
				Status:  "ACTIVE",
			})
			if createErr != nil {
				return uuid.Nil, commonerrors.Wrap(ErrDatabase, createErr)
			}
			return sysWallet.ID, nil
		}
		return uuid.Nil, commonerrors.Wrap(ErrSystemWalletNotFound, err)
	}

	return sysWallet.ID, nil
}

func (s *Service) GetSystemWalletBalance(ctx context.Context, walletName SystemWalletName, walletType SystemWalletType) (float64, error) {
	walletID, err := s.GetSystemWalletByName(ctx, walletName, walletType)
	if err != nil {
		return 0, err
	}

	balance, err := s.getWalletBalance(ctx, s.q, walletID)
	if err != nil {
		return 0, err
	}

	return float64(balance) / 100.0, nil
}

func (s *Service) getWalletBalance(ctx context.Context, walletQ *wallet.Queries, walletID uuid.UUID) (int64, error) {

	balance, err := walletQ.GetWalletBalanceSnapshot(ctx, walletID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, commonerrors.Wrap(ErrDatabase, err)
	}

	return balance, nil
}

func checkBalance(balance int64, amount int64) bool {
	if balance < amount {
		return false
	}

	return true
}

func (s *Service) CalculateRowHash(
	walletID uuid.UUID,
	amount int64,
	transactionID uuid.UUID,
	balanceAfter int64,
	createdAt time.Time,
) string {

	// use centralized secret
	secretKey := s.ledgerSecret

	// Build message: concatenate all fields that should be immutable
	message := fmt.Sprintf(
		"%s|%d|%s|%d|%s",
		walletID.String(),
		amount,
		transactionID.String(),
		balanceAfter,
		createdAt.Format(time.RFC3339Nano),
	)

	// Compute HMAC-SHA256
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write([]byte(message))
	hash := mac.Sum(nil)

	// Return uppercase hex string (64 characters for SHA256)
	return strings.ToUpper(hex.EncodeToString(hash))
}

func CheckUniqueConstraintViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return true
	}
	return false
}
