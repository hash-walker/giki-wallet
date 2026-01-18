package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/hash-walker/giki-wallet/internal/api"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/config"
	"github.com/hash-walker/giki-wallet/internal/payment"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	"github.com/hash-walker/giki-wallet/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	ctx := context.Background()

	// Load .env file if it exists (for local development)
	// In Docker, environment variables come from docker-compose.yml
	_ = godotenv.Load()

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		log.Fatal("DB_URL environment variable is required")
	}

	cfg := config.LoadConfig()

	jazzcashClient := gateway.NewJazzCashClient(
		cfg.Jazzcash.MerchantID,
		cfg.Jazzcash.Password,
		cfg.Jazzcash.IntegritySalt,
		cfg.Jazzcash.MerchantMPIN,
		cfg.Jazzcash.CardCallbackURL,
		cfg.Jazzcash.BaseURL,
		cfg.Jazzcash.WalletPaymentURl,
		cfg.Jazzcash.CardPaymentURL,
		cfg.Jazzcash.StatusInquiryURL,
	)

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	inquiryRateLimiter := payment.NewRateLimiter(10)
	userService := user.NewService(pool)
	userHandler := user.NewHandler(userService)
	authService := auth.NewService(pool)
	authHandler := auth.NewHandler(authService)
	paymentService := payment.NewService(pool, jazzcashClient, inquiryRateLimiter)
	_ = payment.NewHandler(paymentService)

	srv := api.NewServer(userHandler, authHandler)
	srv.MountRoutes()

	c := cors.New(cors.Options{
		// Allow any origin in development (for production, use AllowedOrigins with specific domains)
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Content-Type", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
		Debug:            true, // Enable Debugging for testing, consider disabling in production
	})

	handler := c.Handler(srv.Router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default port
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
	}

	log.Printf("Server starting on port %s\n", port)
	log.Fatal(server.ListenAndServe())
}
