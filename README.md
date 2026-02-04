# Giki Wallet: Modular Monolith

[![Go Version](https://img.shields.io/github/go-mod/go-version/hash-walker/giki-wallet?filename=backend%2Fgo.mod)](https://golang.org)
[![React](https://img.shields.io/badge/Frontend-React%2019-blue)](https://react.dev)
[![Docker](https://img.shields.io/badge/Infrastructure-Docker-blue)](https://www.docker.com)

Giki Wallet is a unified platform for managing digital transactions and transport services at GIKI. It is built as a **Strict Modular Monolith**, prioritizing separation of concerns at every level—from code structure to database schemas—to avoid "AI layer-hell" and ensure long-term maintainability.

---

## 🚀 Tech Stack

### Backend
- **Language**: [Go (Golang)](https://go.dev/)
- **Database Tooling**: [SQLC](https://sqlc.dev/) (Type-safe SQL) & [Goose](https://github.com/pressly/goose) (Migrations)
- **Integrations**: MS Graph API (Email), JazzCash SDK (Payments)
- **Architecture**: Modular Monolith with Domain-Driven Design (DDD) principles.

### Frontend
- **Framework**: [React 19](https://react.dev/) via [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
- **Icons**: [Lucide React](https://lucide.dev/)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (serving frontend assets and proxying API requests)
- **Database**: PostgreSQL (Multi-schema isolation)

---

## 🏗 Architecture Breakdown

### 1. Backend Domain Modules (`backend/internal/`)
Each module is self-contained with its own logic, types, and database queries.
- **`auth`**: Authentication and session management.
- **`wallet`**: Core ledger, accounts, and balance management.
- **`payment`**: JazzCash gateway integration and transaction reconciliation.
- **`transport`**: Bus routes, schedules, and seat reservations.
- **`user`**: Profile management and identity.
- **`audit`**: Global logging and system activity tracking.
- **`mailer`**: Email notifications using Microsoft Graph.

### 2. Database Isolation Strategy
We use separate PostgreSQL schemas to ensure data boundaries:
| Schema | Responsibility |
| --- | --- |
| `giki_wallet` | User accounts, transactions, and ledger. |
| `transport_system` | Routes, stop timings, and bookings. |
| `giki_system` | Shared configurations, audit logs, and permissions. |

### 3. Frontend Views (`frontend/src/`)
- **`client/`**: The primary user-facing wallet and transport booking application.
- **`admin/`**: Administrative dashboard for managing routes, users, and monitoring payments.
- **`shared/`**: Reusable UI components and utility functions.

---

## 🛠 Getting Started

### Prerequisites
- Docker & Docker Compose
- Go 1.22+ (for local development)
- Node.js & npm (for local frontend development)

### 1. Setup Environment
Copy the example environment file and update your secrets:
```bash
cp .env.example .env
```

### 2. Launch with Docker
The easiest way to get the entire system running including Nginx, Backend, Frontend, and Database:
```bash
docker-compose up --build
```
The app will be available at `http://localhost`.

### 3. Development Commands (Makefile)
Located in `backend/Makefile`:
- `make sqlc-generate`: Update Go code after modifying `.sql` queries.
- `make migrate-up`: Run database migrations.
- `make run`: Run the backend server locally.
- `make test`: Run unit tests.

---

## 📁 Repository Structure
```text
.
├── backend/            # Go source code, migrations, and dockerfile
├── frontend/           # React application (Vite, Tailwind)
├── infrastructure/     # Nginx configs, Postgres bootstrap scripts
├── certs/              # SSL certificates for production
└── docker-compose.yml  # System orchestration
```

---

## 🧠 Philosophy: Modular Monolith over Microservices
We chose a modular monolith to reduce networking overhead and deployment complexity while maintaining the clean boundaries of microservices. If a domain (like Transport) grows too large, its isolated nature allows it to be extracted into a standalone service with minimal effort.
