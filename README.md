# Giki Wallet: Modular Monolith

## The Story & Philosophy

This project evolved from our previous **Giki Transport System**. After months of manual development, we integrated **AI-assisted coding (Cursor)**. While powerful, the AI often introduced unnecessary "layers of solutions" for simple problems, creating a complex web that was difficult to debug.

**Our Core Principle:** To combat "AI layer-hell," we have shifted to a **Strict Modular Monolith**. We prioritize **separation at every level** (folders, logic, and database schemas). If a bug appears in the Transport module, you look at the Transport folder—not the entire app.

---

## Architecture Breakdown

### 1. Backend (Go)

The backend is structured to ensure that modules are logically isolated even while living in the same codebase.

* **`cmd/api/`**: The "Front Door." Contains `main.go`, initializes the server, and handles top-level routing.
* **`internal/common/`**: Shared infrastructure used by all modules (Middlewares, global error handling, and standardized JSON responses).
* **`internal/`**: The business logic, split into independent domains:
* **Wallet Module**: Handles identities, accounts, and the core ledger.
* **Transport Module**: Manages routes, schedules, and ticketing.


* **`sql/migrations/`**: Organized by schema to match our database isolation strategy.

### 2. Database (PostgreSQL)

We use a single PostgreSQL instance but enforce strict data boundaries using **Schemas**. This prevents "spaghetti data" and allows for easy migration to microservices later.

| Schema | System | Responsibility |
| --- | --- | --- |
| `giki_wallet` | **Wallet** | Users, Ledger, Transactions |
| `transport_system` | **Transport** | Routes, Schedules, Tickets |
| `giki_system` | **System** | Audit Logs, Global Configs, Permissions |

### 3. Tooling

* **SQLC**: Generates type-safe Go code from raw SQL. We use separate `sqlc.yaml` configurations to keep the generated repository code scoped to its specific module.
* **Docker & Docker Compose**: Orchestrates the environment.
* `infrastructure/postgres/bootstrap.sql`: Automatically initializes the database and all schemas on first run.
* `Dockerfile`: Uses **multi-stage builds** and **layer caching** for fast, tiny production images.



---

## Getting Started

1. **Environment Setup**: Copy `.env.example` to `.env` and fill in your secrets.
2. **Infrastructure**: Run the database setup.
```bash
docker-compose up -d db

```


3. **Generate Code**: Run SQLC to generate the repository layers.
```bash
sqlc generate

```


4. **Run App**: Start the backend and frontend.
```bash
docker-compose up

```



---

## Debugging Strategy

Because of our modular design, follow this flow when a problem arises:

1. **Is it a Database issue?** Check the specific schema in Postgres.
2. **Is it a Logic issue?** Go directly to `internal/modules/[module_name]`.
3. **Is it a Global issue?** Check `internal/common`.
