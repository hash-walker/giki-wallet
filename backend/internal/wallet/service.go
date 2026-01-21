package wallet

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/google/uuid"
	wallet "github.com/hash-walker/giki-wallet/internal/wallet/wallet_db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrWalletNotFound       = errors.New("wallet not found")
	ErrWalletInactive       = errors.New("wallet inactive")
	ErrDuplicateLedgerEntry = errors.New("duplicate ledger entry")
	ErrInsufficientFunds    = errors.New("insufficient funds")
	ErrDatabase             = errors.New("wallet database error")
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

func (s *Service) GetOrCreateWallet(ctx context.Context, walletQ *wallet.Queries, userID uuid.UUID) (wallet.GikiWalletWallet, error) {

	w, err := walletQ.GetWallet(ctx, userID)
	if err == nil {
		return w, nil
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		log.Printf("error getting wallet: %v", err)
		return wallet.GikiWalletWallet{}, fmt.Errorf("%w: %v", ErrDatabase, err)
	}

	w, err = s.q.CreateWallet(ctx, userID)
	if err != nil {

		check := CheckUniqueConstraintViolation(err)

		if check {
			w, err = walletQ.GetWallet(ctx, userID)
			if err != nil {
				return wallet.GikiWalletWallet{}, fmt.Errorf("%w: %v", ErrDatabase, err)
			}
			return w, nil
		} else {
			log.Printf("error creating wallet: %v", err)
			return wallet.GikiWalletWallet{}, fmt.Errorf("%w: %v", ErrDatabase, err)
		}
	}

	return w, nil
}

func (s *Service) CreditWallet(ctx context.Context, tx pgx.Tx, userID uuid.UUID, amount int64, txnRefNo string, creditType string) error {
	walletQ := s.q.WithTx(tx)

	w, err := s.GetOrCreateWallet(ctx, walletQ, userID)

	if err != nil {
		return err
	}

	_, err = walletQ.CreateLedgerEntry(ctx, wallet.CreateLedgerEntryParams{
		WalletID:        w.ID,
		Amount:          amount,
		TransactionType: wallet.GikiWalletTransactionCategoryType(creditType),
		ReferenceID:     txnRefNo,
	})

	if err != nil {
		if check := CheckUniqueConstraintViolation(err); check {
			log.Printf("duplicate ledger entry for txnRefNo %s (already credited)", txnRefNo)
			return fmt.Errorf("%w: %s", ErrDuplicateLedgerEntry, txnRefNo)
		} else {
			log.Printf("error creating ledger entry: %v", err)
			return fmt.Errorf("%w: %v", ErrDatabase, err)
		}
	}

	return nil
}

func (s *Service) DebitWallet(ctx context.Context, tx pgx.Tx, userID uuid.UUID, amount int64, txnRefNo string, debitType string) error {
	walletQ := s.q.WithTx(tx)

	w, err := s.GetOrCreateWallet(ctx, walletQ, userID)

	if err != nil {
		return err
	}

	balance, err := s.GetBalance(ctx, userID)

	if err != nil {
		log.Printf("error getting balance: %v", err)
		return fmt.Errorf("%w: %v", ErrDatabase, err)
	}

	var negAmount int64
	balanceCheck := checkBalance(balance, amount)

	if balanceCheck {
		// amount should be negative here
		negAmount = -1 * amount
	} else {
		log.Printf("error insufficient balance: %v", err)
		return fmt.Errorf("%w: %v", ErrInsufficientFunds, err)
	}

	_, err = walletQ.CreateLedgerEntry(ctx, wallet.CreateLedgerEntryParams{
		WalletID:        w.ID,
		Amount:          negAmount,
		TransactionType: wallet.GikiWalletTransactionCategoryType(debitType),
		ReferenceID:     txnRefNo,
	})

	if err != nil {
		if check := CheckUniqueConstraintViolation(err); check {
			log.Printf("duplicate ledger entry for txnRefNo %s (already credited)", txnRefNo)
			return fmt.Errorf("%w: %s", ErrDuplicateLedgerEntry, txnRefNo)
		} else {
			log.Printf("error creating ledger entry: %v", err)
			return fmt.Errorf("%w: %v", ErrDatabase, err)
		}
	}

	return nil
}

func creditOrDebit(ctx context.Context, walletQ *wallet.Queries, amount int64, txnRefNo, debitType string) {

}

func (s *Service) GetBalance(ctx context.Context, userID uuid.UUID) (int64, error) {
	w, err := s.q.GetWallet(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil // No wallet = 0 balance
		}
		return 0, fmt.Errorf("%w: %v", ErrDatabase, err)
	}

	balance, err := s.q.GetWalletBalance(ctx, w.ID)

	if err != nil {
		return 0, fmt.Errorf("%w: %v", ErrDatabase, err)
	}

	return balance, nil
}

func checkBalance(balance int64, amount int64) bool {
	if balance < amount {
		return false
	}

	return true
}

func CheckUniqueConstraintViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return true
	}
	return false
}
