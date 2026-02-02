package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		_ = godotenv.Load("../.env")
		dbURL = os.Getenv("DB_URL")
	}
	if dbURL == "" {
		_ = godotenv.Load("../../.env")
		dbURL = os.Getenv("DB_URL")
	}
	if dbURL == "" {
		log.Fatal("DB_URL not set")
	}

	// Fallback to localhost if 'db' is in the URL and we are likely running outside containers
	if strings.Contains(dbURL, "@db:") {
		dbURL = strings.Replace(dbURL, "@db:", "@localhost:", 1)
	}

	pool, err := pgxpool.New(context.Background(), dbURL)

	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	ctx := context.Background()
	walletService := wallet.NewService(pool)

	// 1. Get or Create Transport Revenue Wallet
	revenueWalletID, err := walletService.GetSystemWalletByName(ctx, wallet.TransportSystemWallet, wallet.SystemWalletRevenue)
	if err != nil {
		log.Fatalf("Failed to get revenue wallet: %v", err)
	}

	liabilityWalletID, err := walletService.GetSystemWalletByName(ctx, wallet.GikiWallet, wallet.SystemWalletLiability)
	if err != nil {
		log.Fatalf("Failed to get liability wallet: %v", err)
	}

	// 2. Get some user wallets to simulate transactions
	rows, _ := pool.Query(ctx, "SELECT id FROM giki_wallet.users WHERE user_type = 'student' LIMIT 20")
	var userIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err == nil {
			userIDs = append(userIDs, id)
		}
	}
	rows.Close()

	if len(userIDs) == 0 {
		log.Fatal("No students found in DB to seed transactions for. Run user seeder first?")
	}

	userWallets := make([]uuid.UUID, 0)
	for _, uid := range userIDs {
		w, err := walletService.GetOrCreateWallet(ctx, nil, uid)
		if err == nil {
			userWallets = append(userWallets, w.ID)

			// Top up student wallet
			tx, _ := pool.Begin(ctx)
			walletService.ExecuteTransaction(ctx, tx, liabilityWalletID, w.ID, 1000000, "TOPUP", uuid.New().String(), "Initial seeding topup")
			tx.Commit(ctx)
		}
	}

	fmt.Printf("Seeding 100 transactions for revenue wallet %s...\n", revenueWalletID)

	txnTypes := []string{"TRANSPORT_BOOKING", "REFUND"}

	for i := 0; i < 100; i++ {
		userWalletID := userWallets[rand.Intn(len(userWallets))]
		amount := int64((rand.Intn(50) + 10) * 100) // 1000 to 6000 lowest units
		txnType := txnTypes[rand.Intn(len(txnTypes))]

		var sender, receiver uuid.UUID
		var description string
		if txnType == "TRANSPORT_BOOKING" {
			sender = userWalletID
			receiver = revenueWalletID
			description = fmt.Sprintf("Ticket booking #%d", i)
		} else {
			sender = revenueWalletID
			receiver = userWalletID
			description = fmt.Sprintf("Refund for cancelled trip #%d", i)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			log.Printf("Failed to begin tx: %v", err)
			continue
		}

		err = walletService.ExecuteTransaction(ctx, tx, sender, receiver, amount, txnType, uuid.New().String(), description)
		if err != nil {
			log.Printf("Failed to execute transaction %d: %v", i, err)
			tx.Rollback(ctx)
		} else {
			tx.Commit(ctx)
			if i%20 == 0 {
				fmt.Printf("Seeded %d transactions...\n", i)
			}
		}

		// Randomize timestamp slightly for better look in history
		// Note: ExecuteTransaction sets created_at to NOW() usually,
		// if we want old data we'd need to manually update it after.
	}

	fmt.Println("Successfully seeded 100 transactions")
}
