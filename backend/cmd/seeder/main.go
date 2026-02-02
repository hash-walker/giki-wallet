package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env from root or current directory
	// Assuming running from backend root
	_ = godotenv.Load()

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		// Try looking in parent directory just in case
		_ = godotenv.Load("../.env")
		dbURL = os.Getenv("DB_URL")
	}

	if dbURL == "" {
		log.Fatal("DB_URL not set in environment or .env file")
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// Check/Create Stops
	var stop1ID, stop2ID string
	err = pool.QueryRow(context.Background(), "SELECT id FROM giki_transport.stops LIMIT 1").Scan(&stop1ID)
	if err != nil {
		fmt.Println("No stops found, creating dummy stops...")
		err = pool.QueryRow(context.Background(), `
            INSERT INTO giki_transport.stops (id, address, created_at) VALUES 
            (gen_random_uuid(), 'Campus Stop', NOW()) RETURNING id
        `).Scan(&stop1ID)
		if err != nil {
			log.Fatalf("Failed to create stop 1: %v", err)
		}

		err = pool.QueryRow(context.Background(), `
            INSERT INTO giki_transport.stops (id, address, created_at) VALUES 
            (gen_random_uuid(), 'City Stop', NOW()) RETURNING id
        `).Scan(&stop2ID)
		if err != nil {
			log.Fatalf("Failed to create stop 2: %v", err)
		}
	} else {
		// Just get another one if possible, or create one
		err = pool.QueryRow(context.Background(), "SELECT id FROM giki_transport.stops WHERE id != $1 LIMIT 1", stop1ID).Scan(&stop2ID)
		if err != nil {
			err = pool.QueryRow(context.Background(), `
            INSERT INTO giki_transport.stops (id, address, created_at) VALUES 
            (gen_random_uuid(), 'City Stop', NOW()) RETURNING id
            `).Scan(&stop2ID)
			if err != nil {
				log.Fatalf("Failed to create stop 2: %v", err)
			}
		}
	}

	// Check/Create Route
	var routeID string
	err = pool.QueryRow(context.Background(), "SELECT id FROM giki_transport.routes LIMIT 1").Scan(&routeID)
	if err != nil {
		fmt.Println("No routes found, creating a dummy route...")
		err = pool.QueryRow(context.Background(), `
            INSERT INTO giki_transport.routes (id, name, origin_stop_id, destination_stop_id, is_active) 
            VALUES (gen_random_uuid(), 'Test Route', $1, $2, true) 
            RETURNING id
        `, stop1ID, stop2ID).Scan(&routeID)
		if err != nil {
			log.Fatalf("Failed to create dummy route: %v", err)
		}
	}

	fmt.Printf("Seeding deleted trips for route %s...\n", routeID)

	stmt := `
        INSERT INTO giki_transport.trip (
            id, route_id, bus_type, direction, 
            departure_time, booking_open_offset_hours, booking_close_offset_hours, 
            status, available_seats, total_capacity, base_price, updated_at
        ) VALUES (
            gen_random_uuid(), $1, 'Standard', 'Campus',
            $2, 24, 1,
            'DELETED', 50, 50, 10000, $3
        )
    `

	for i := 0; i < 200; i++ {
		departure := time.Now().Add(time.Duration(i*24) * time.Hour)
		updatedAt := time.Now().Add(-time.Duration(rand.Intn(24*30)) * time.Hour)

		_, err = pool.Exec(context.Background(), stmt,
			routeID,
			departure,
			updatedAt,
		)

		if err != nil {
			log.Printf("Failed to insert trip %d: %v", i, err)
		} else {
			if i%50 == 0 {
				fmt.Printf("Inserted %d trips...\n", i)
			}
		}
	}

	fmt.Println("Successfully seeded 200 deleted trips")
}
