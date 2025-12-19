# Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Prerequisites

```bash
# Install sqlc
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Or use package manager
# macOS: brew install sqlc
# Linux: See https://docs.sqlc.dev/en/latest/overview/install.html
```

### Step 2: Install Dependencies

```bash
go mod download
```

### Step 3: Set Up Environment

Create a `.env` file:

```bash
PORT=8080
ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=transport_system
DB_SSLMODE=disable
```

### Step 4: Set Up Database

#### Option A: PostgreSQL

```bash
# Create database
createdb transport_system

# Install golang-migrate if needed
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Run migrations
migrate -path internal/database/migrations -database "postgres://postgres:postgres@localhost/transport_system?sslmode=disable" up
```

#### Option B: SQLite (Quick Test)

```bash
# In .env, change:
DB_DRIVER=sqlite
DB_PATH=./transport.db
```

### Step 5: Generate sqlc Code

```bash
sqlc generate
```

This creates type-safe Go code from your SQL queries in `internal/database/`.

### Step 6: Run the Server

```bash
go run cmd/server/main.go
```

Or use the Makefile:

```bash
make run
```

### Step 7: Test the API

```bash
# Health check
curl http://localhost:8080/health

# List users
curl http://localhost:8080/api/v1/users

# Create a user
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","role":"passenger"}'
```

## 📝 Development Workflow

### Adding a New Endpoint

1. **Add SQL query** in `internal/database/queries/your_table.sql`:
   ```sql
   -- name: GetRoute :one
   SELECT * FROM routes WHERE id = $1;
   ```

2. **Generate code**:
   ```bash
   sqlc generate
   ```

3. **Create handler** in `internal/api/handlers/`

4. **Add route** in `internal/api/routes.go`

### Running Migrations

```bash
# Up
make migrate-up

# Down  
make migrate-down
```

## 🐛 Troubleshooting

### sqlc generate fails
- Make sure your SQL syntax is correct
- Check `sqlc.yaml` configuration
- Ensure migrations are in the schema path

### Database connection fails
- Check `.env` file exists and has correct values
- Verify database is running
- Check database credentials

### Import errors
- Run `sqlc generate` first
- Run `go mod tidy`
- Make sure all dependencies are installed

## 📚 Next Steps

- Read the [README.md](README.md) for full documentation
- Check [TECHNOLOGY_CHOICES.md](TECHNOLOGY_CHOICES.md) for tech stack details
- Review [SQLC_ALTERNATIVES.md](SQLC_ALTERNATIVES.md) for database options

