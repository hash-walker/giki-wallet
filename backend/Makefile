.PHONY: run build test migrate-up migrate-down sqlc-generate clean docker-build docker-up docker-down docker-db docker-clean test-integration test-docker

# Run the server
run:
	go run cmd/server/main.go

# Build the application
build:
	go build -o bin/server cmd/server/main.go

# Run unit tests
test:
	go test ./...

# Run integration tests (requires running Docker services)
test-integration:
	@echo "Running integration tests..."
	@./tests/integration_test.sh

# Run full Docker test suite (starts services, runs tests, stops services)
test-docker:
	@echo "Starting Docker services..."
	@cd .. && docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Running integration tests..."
	@./tests/integration_test.sh || (cd .. && docker-compose down && exit 1)
	@echo "Stopping Docker services..."
	@cd .. && docker-compose down
	@echo "✓ All tests completed successfully"

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
	cd .. && docker-compose build

docker-up:
	cd .. && docker-compose up -d

docker-down:
	cd .. && docker-compose down

docker-logs:
	cd .. && docker-compose logs -f

docker-db:
	docker build -f Dockerfile.db -t transport-db .

docker-clean:
	cd .. && docker-compose down -v
	docker rmi transport-db transport-system-api || true

# Development helpers
dev:
	cd .. && docker-compose up

dev-rebuild:
	cd .. && docker-compose up --build
