package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/hash-walker/giki-wallet/internal/api"
	"github.com/hash-walker/giki-wallet/internal/auth"
	"github.com/hash-walker/giki-wallet/internal/config"
	"github.com/hash-walker/giki-wallet/internal/mailer"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	"github.com/hash-walker/giki-wallet/internal/payment"
	"github.com/hash-walker/giki-wallet/internal/payment/gateway"
	"github.com/hash-walker/giki-wallet/internal/transport"
	"github.com/hash-walker/giki-wallet/internal/user"
	"github.com/hash-walker/giki-wallet/internal/wallet"
	"github.com/hash-walker/giki-wallet/internal/worker"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	ctx := context.Background()

	_ = godotenv.Load()

	cfg := config.LoadConfig()

	jazzCashClient := gateway.NewJazzCashClient(
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

	newMailer := mailer.NewGraphSender(
		cfg.Mailer.ClientID,
		cfg.Mailer.TenantID,
		cfg.Mailer.ClientSecret,
		cfg.Mailer.SenderEmail,
	)

	dbConfig, err := pgxpool.ParseConfig(cfg.Database.DbURL)
	if err != nil {
		middleware.LogAppError(err, "Unable to parse database connection string")
	}

	dbConfig.MaxConns = 50
	dbConfig.MinConns = 10
	dbConfig.MaxConnLifetime = 1 * time.Hour
	dbConfig.MaxConnIdleTime = 30 * time.Minute
	dbConfig.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, dbConfig)

	if err != nil {
		middleware.LogAppError(err, "Unable to connect to database")
	}
	defer pool.Close()

	inquiryRateLimiter := payment.NewRateLimiter(10)

	// Initialize Worker first
	newWorker := worker.NewWorker(pool, newMailer)
	go newWorker.StartJobTicker(ctx, 10)
	go newWorker.StartStatusTicker(ctx)

	// Initialize Services with dependencies
	userService := user.NewService(pool, newWorker)
	userHandler := user.NewHandler(userService)
	authService := auth.NewService(pool)
	authHandler := auth.NewHandler(authService)
	walletService := wallet.NewService(pool)
	walletHandler := wallet.NewHandler(walletService)
	paymentService := payment.NewService(pool, jazzCashClient, walletService, inquiryRateLimiter, cfg.Server.AppURL)
	paymentHandler := payment.NewHandler(paymentService, walletService)
	transportService := transport.NewService(pool, walletService, newWorker)
	transportHandler := transport.NewHandler(transportService)

	srv := api.NewServer(userHandler, authHandler, paymentHandler, transportHandler, walletHandler)
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
	// start the worker
	transport.StartCleanupWorker(pool, 30*time.Second)

	log.Printf("Server starting on port %s\n", port)
	log.Fatal(server.ListenAndServe())

}
