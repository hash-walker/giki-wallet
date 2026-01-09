package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/hash-walker/giki-wallet/internal/api"
	"github.com/hash-walker/giki-wallet/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/joho/godotenv"
)

func main() {

	ctx := context.Background()
	godotenv.Load()

	dbURL := os.Getenv("DB_URL")

	pool, err := pgxpool.New(ctx, dbURL)

	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	userService := user.NewService(pool)
	userHandler := user.NewHandler(userService)

	srv := api.NewServer(userHandler)
	srv.MountRoutes()

	server := &http.Server{
		Addr:    ":8080",
		Handler: srv.Router,
	}

	log.Fatal(server.ListenAndServe())
}
