.PHONY: run build test migrate-up migrate-down sqlc-generate clean docker-build docker-up docker-down docker-db docker-clean

# Run the server
run:
	go run cmd/server/main.go

# Build the application
build:
	go build -o bin/server cmd/server/main.go

# Run tests
test:
	go test ./...

# Generate sqlc code
sqlc-generate:
	sqlc generate

# Run migrations up
migrate-up:
	migrate -path internal/database/migrations -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)" up

# Run migrations down
migrate-down:
	migrate -path internal/database/migrations -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)" down

# Clean generated files
clean:
	rm -rf bin/
	rm -rf internal/database/*.go
	rm -f *.db

# Install dependencies
deps:
	go mod download
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Docker commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-db:
	docker build -f Dockerfile.db -t transport-db .

docker-clean:
	docker-compose down -v
	docker rmi transport-db transport-system-api || true

