package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

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

	if strings.Contains(dbURL, "@db:") {
		dbURL = strings.Replace(dbURL, "@db:", "@localhost:", 1)
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	fmt.Println("Seeding 10 student users...")

	for i := 1; i <= 10; i++ {
		email := fmt.Sprintf("student%d@test.com", i)
		name := fmt.Sprintf("Student %d", i)
		phone := fmt.Sprintf("030000000%02d", i)

		_, err := pool.Exec(context.Background(), `
			INSERT INTO giki_wallet.users (name, email, phone_number, password_hash, is_active, is_verified, user_type)
			VALUES ($1, $2, $3, 'dummy_hash', true, true, 'student')
			ON CONFLICT (email) DO NOTHING
		`, name, email, phone)

		if err != nil {
			log.Printf("Failed to insert user %d: %v", i, err)
		}
	}

	fmt.Println("Successfully seeded student users")
}
