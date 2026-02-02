package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load() // try current dir
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		_ = godotenv.Load(".env")
		_ = godotenv.Load("../.env")
		_ = godotenv.Load("../../.env")
		_ = godotenv.Load("../../../.env")
		dbURL = os.Getenv("DB_URL")
	}

	if strings.Contains(dbURL, "@db:") {
		dbURL = strings.Replace(dbURL, "@db:", "@localhost:", 1)
	}

	fmt.Printf("Connecting to %s\n", dbURL)

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	ctx := context.Background()

	// 1. Get a user
	var userID uuid.UUID
	err = pool.QueryRow(ctx, "SELECT id FROM giki_wallet.users LIMIT 1").Scan(&userID)
	if err != nil {
		log.Fatalf("No user found: %v. Please seed users first.", err)
	}

	// 2. Get/Create a trip for the current week
	var tripID uuid.UUID
	now := time.Now()
	err = pool.QueryRow(ctx, "SELECT id FROM giki_transport.trip WHERE departure_time >= $1 AND departure_time < $2 LIMIT 1",
		now.AddDate(0, 0, -int(now.Weekday())),
		now.AddDate(0, 0, 7-int(now.Weekday()))).Scan(&tripID)

	if err != nil {
		fmt.Println("No trip found for current week, creating one...")
		// Get a route
		var routeID uuid.UUID
		err = pool.QueryRow(ctx, "SELECT id FROM giki_transport.routes LIMIT 1").Scan(&routeID)
		if err != nil {
			log.Fatal("No route found. Please seed routes first.")
		}

		tripID = uuid.New()
		_, err = pool.Exec(ctx, `
			INSERT INTO giki_transport.trip (
				id, route_id, bus_type, direction, departure_time, 
				booking_open_offset_hours, booking_close_offset_hours, 
				status, available_seats, total_capacity, base_price
			) VALUES ($1, $2, 'Student', 'Campus', $3, 24, 1, 'OPEN', 50, 50, 200)
		`, tripID, routeID, time.Now().Add(24*time.Hour))
		if err != nil {
			log.Fatalf("Failed to create trip: %v", err)
		}
	}

	// 3. Get stops
	var pickupID, dropoffID uuid.UUID
	err = pool.QueryRow(ctx, "SELECT id FROM giki_transport.stops LIMIT 1").Scan(&pickupID)
	if err != nil {
		log.Fatal("No stops found.")
	}
	err = pool.QueryRow(ctx, "SELECT id FROM giki_transport.stops WHERE id != $1 LIMIT 1", pickupID).Scan(&dropoffID)
	if err != nil {
		dropoffID = pickupID // Fallback
	}

	// 4. Seed Confirmed Tickets (for Tickets Page)
	fmt.Println("Seeding confirmed tickets...")
	for i := 0; i < 25; i++ {
		_, err = pool.Exec(ctx, `
			INSERT INTO giki_transport.tickets (
				id, user_id, trip_id, pickup_stop_id, dropoff_stop_id,
				passenger_name, passenger_relation, serial_no, ticket_code, status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONFIRMED')
			ON CONFLICT (trip_id, ticket_code) DO NOTHING
		`, uuid.New(), userID, tripID, pickupID, dropoffID,
			fmt.Sprintf("Confirmed %d", i), "Self", i+1, fmt.Sprintf("C%03d", i+1))
		if err != nil {
			log.Printf("Failed to insert confirmed ticket %d: %v", i, err)
		}
	}

	// 5. Seed Cancelled/Deleted Tickets (for History Page)
	fmt.Println("Seeding history tickets...")
	for i := 0; i < 15; i++ {
		status := "CANCELLED"
		if i%2 == 0 {
			status = "DELETED"
		}
		_, err = pool.Exec(ctx, `
			INSERT INTO giki_transport.tickets (
				id, user_id, trip_id, pickup_stop_id, dropoff_stop_id,
				passenger_name, passenger_relation, serial_no, ticket_code, status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (trip_id, ticket_code) DO NOTHING
		`, uuid.New(), userID, tripID, pickupID, dropoffID,
			fmt.Sprintf("History %d", i), "Family", i+100, fmt.Sprintf("H%03d", i+1), status)
		if err != nil {
			log.Printf("Failed to insert history ticket %d: %v", i, err)
		}
	}

	fmt.Println("Successfully seeded tickets!")
}
