package wallet

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/common"
	commonerrors "github.com/hash-walker/giki-wallet/internal/common/errors"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	wallet "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q      *wallet.Queries
	dbPool *pgxpool.Pool
}

func NewService(dbPool *pgxpool.Pool) *Service {
	return &Service{
		q:      wallet.New(dbPool),
		dbPool: dbPool,
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

	// lock both wallets (prevent race conditions)
	senderWallet, err := walletQ.GetWalletForUpdate(ctx, senderWalletID)
	if err != nil {
		return commonerrors.Wrap(ErrDatabase, err)
	}

	_, err = walletQ.GetWalletForUpdate(ctx, receiverWalletID)

	if err != nil {
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

	debitHash := calculateRowHash(
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
		return commonerrors.Wrap(ErrDatabase, err)
	}

	creditHash := calculateRowHash(
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
		Balance:  balance,
		Currency: w.Currency,
	}, nil
}

func (s *Service) GetUserHistory(ctx context.Context, userID uuid.UUID) ([]TransactionHistoryItem, error) {
	w, err := s.GetOrCreateWallet(ctx, nil, userID)
	if err != nil {
		return nil, err
	}

	entries, err := s.q.GetLedgerEntriesByWallet(ctx, w.ID)
	if err != nil {
		return nil, commonerrors.Wrap(ErrDatabase, err)
	}

	items := make([]TransactionHistoryItem, 0, len(entries))
	for _, e := range entries {
		items = append(items, TransactionHistoryItem{
			ID:           e.ID,
			Amount:       e.Amount,
			BalanceAfter: e.BalanceAfter,
			Type:         e.Type,
			ReferenceID:  e.ReferenceID,
			Description:  common.TextToString(e.Description),
			CreatedAt:    e.CreatedAt,
		})
	}

	return items, nil
}

func (s *Service) GetSystemWalletByName(ctx context.Context, walletName SystemWalletName, walletType SystemWalletType) (uuid.UUID, error) {

	walletQ := s.q

	sysWallet, err := walletQ.GetSystemWalletByName(ctx, wallet.GetSystemWalletByNameParams{
		Name: common.StringToText(string(walletName)),
		Type: common.StringToText(string(walletType)),
	})

	if err != nil {
		return uuid.Nil, commonerrors.Wrap(ErrSystemWalletNotFound, err)
	}

	return sysWallet.ID, nil
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

func calculateRowHash(
	walletID uuid.UUID,
	amount int64,
	transactionID uuid.UUID,
	balanceAfter int64,
	createdAt time.Time,
) string {

	// get secret key from environment
	secretKey := os.Getenv("LEDGER_HASH_SECRET")

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
