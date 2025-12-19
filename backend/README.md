# Transport System API

A RESTful API built with Go, Chi router, and sqlc for type-safe database queries.

## 🚀 Tech Stack

- **Go 1.21+** - Programming language
- **Chi** - Lightweight HTTP router
- **sqlc** - Type-safe SQL code generation
- **PostgreSQL** - Database (SQLite for development)
- **golang-migrate** - Database migrations

## 📋 Prerequisites

- Go 1.21 or higher
- PostgreSQL (or SQLite for development)
- sqlc CLI tool

## 🛠️ Setup

### 1. Install sqlc

```bash
# macOS
brew install sqlc

# Linux
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Or download from: https://github.com/sqlc-dev/sqlc/releases
```

### 2. Install Dependencies

```bash
go mod download
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Set Up Database

#### Option A: PostgreSQL (Recommended for production)

```bash
# Create database
createdb transport

# Run migrations
migrate -path internal/database/schema -database "postgres://user:password@localhost/transport?sslmode=disable" up
```

#### Option B: SQLite (For development)

```bash
# In .env, set:
DB_DRIVER=sqlite
DB_PATH=./transport.db

# Run migrations (you'll need a SQLite migration tool or convert migrations)
```

### 5. Generate sqlc Code

```bash
sqlc generate
```

This will generate type-safe Go code from your SQL queries in `internal/database/`.

### 6. Run the Server

```bash
go run cmd/server/main.go
```

The server will start on `http://localhost:8080`

## 📁 Project Structure

```
transport-system/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── api/                     # HTTP handlers and routes
│   │   ├── routes.go
│   │   ├── cors.go
│   │   └── response.go
│   ├── config/                  # Configuration
│   │   └── config.go
│   ├── database/                # Database layer
│   │   ├── connection.go
│   │   ├── queries/             # SQL query files
│   │   │   └── users.sql
│   │   └── schema/          # Database migrations
│   │       ├── 001_initial.up.sql
│   │       └── 001_initial.down.sql
│   └── models/                  # Domain models (if needed)
├── sqlc.yaml                    # sqlc configuration
├── go.mod
└── README.md
```

## 🔧 Development Workflow

### Adding a New Endpoint

1. **Write SQL queries** in `internal/database/queries/`
   ```sql
   -- name: GetRoute :one
   SELECT * FROM routes WHERE id = $1;
   ```

2. **Generate Go code**
   ```bash
   sqlc generate
   ```

3. **Create handler** in `internal/api/`
   ```go
   func handleGetRoute(db *sql.DB) http.HandlerFunc {
       return func(w http.ResponseWriter, r *http.Request) {
           // Use generated sqlc code
       }
   }
   ```

4. **Add route** in `internal/api/routes.go`

### Running Migrations

```bash
# Up
migrate -path internal/database/migrations -database "postgres://..." up

# Down
migrate -path internal/database/migrations -database "postgres://..." down
```

## 📚 API Endpoints

### Health Check
```
GET /health
```

### API Routes
All API routes are prefixed with `/api/v1`

## 🧪 Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...
```

## 🐳 Docker (Optional)

```bash
# Build
docker build -t transport-api .

# Run
docker run -p 8080:8080 transport-api
```

## 📖 Resources

- [Chi Router Documentation](https://github.com/go-chi/chi)
- [sqlc Documentation](https://docs.sqlc.dev/)
- [Go Best Practices](https://go.dev/doc/effective_go)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## 📝 License

MIT

