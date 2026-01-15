package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/hash-walker/giki-wallet/internal/api"
	"github.com/hash-walker/giki-wallet/internal/auth"
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

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	userService := user.NewService(pool)
	userHandler := user.NewHandler(userService)
	authService := auth.NewService(pool)
	authHandler := auth.NewHandler(authService)

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
