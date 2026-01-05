# Identity, Authentication, Wallet & Operations System

**Database Design Documentation**

This document describes the complete database schema for:

* Identity & Authentication
* Wallet & Payments (Ledger-based)
* Security, Abuse Prevention & Operations

The system is designed with **security-first principles**, **auditability**, **financial correctness**, and **operational resilience**.

---

## CHAPTER 1: Identity & Authentication

### 1.1 Users

The `users` table is the **root identity entity**.
Every actor in the system—students, employees, admins, and system actors—maps to exactly one user.

#### Responsibilities

* Identity resolution
* Authentication strategy selection
* Account lifecycle control
* Role enforcement

#### Table: `users`

| Field           | Type         | Description                                  |
| --------------- | ------------ | -------------------------------------------- |
| `id`            | UUID         | Primary user identifier                      |
| `email`         | varchar(254) | Unique email                                 |
| `name`          | varchar(150) | Full name                                    |
| `phone_number`  | varchar(20)  | Optional, unique                             |
| `auth_provider` | varchar(20)  | Authentication source (default: `MICROSOFT`) |
| `external_id`   | varchar(255) | OAuth / external provider ID                 |
| `password_hash` | varchar(500) | Legacy password support                      |
| `password_algo` | varchar(20)  | Hashing algorithm                            |
| `is_active`     | boolean      | Soft-disable flag                            |
| `is_verified`   | boolean      | Verification status                          |
| `user_type`     | varchar(20)  | Role (`STUDENT`, `EMPLOYEE`, `ADMIN`)        |
| `created_at`    | timestamptz  | Creation time                                |
| `updated_at`    | timestamptz  | Last update                                  |

#### Indexes

* `email`
* `(auth_provider, external_id)`

---

### 1.2 Student Profiles

Extends `users` with **student-only metadata**.

#### Table: `student_profiles`

| Field            | Type        | Description            |
| ---------------- | ----------- | ---------------------- |
| `user_id`        | UUID        | PK & FK → `users.id`   |
| `reg_id`         | varchar(20) | Unique registration ID |
| `degree_program` | varchar(50) | Degree                 |
| `batch_year`     | integer     | Batch                  |

---

### 1.3 Employee Profiles

Extends `users` with **employee-only metadata**.

#### Table: `employee_profiles`

| Field         | Type         | Description          |
| ------------- | ------------ | -------------------- |
| `user_id`     | UUID         | PK & FK → `users.id` |
| `designation` | varchar(100) | Job title            |
| `department`  | varchar(100) | Department           |

---

### 1.4 Refresh Tokens

Manages long-lived sessions with **rotation and revocation**.

#### Security Properties

* Tokens stored as hashes
* Device & IP binding
* Rotation support

#### Table: `refresh_tokens`

| Field               | Type         | Description     |
| ------------------- | ------------ | --------------- |
| `id`                | UUID         | Token ID        |
| `user_id`           | UUID         | Owner           |
| `token_hash`        | varchar(255) | Hashed token    |
| `device_info`       | varchar(255) | Client metadata |
| `ip_address`        | varchar(45)  | IPv4 / IPv6     |
| `expires_at`        | timestamptz  | Expiry          |
| `revoked_at`        | timestamptz  | Revocation time |
| `replaced_by_token` | varchar(255) | Rotation chain  |
| `created_at`        | timestamptz  | Issued at       |

---

### 1.5 Auth Tokens

Short-lived, **single-purpose tokens**.

Used for:

* Email verification
* Password reset
* Magic links

#### Table: `auth_tokens`

| Field        | Type         | Description    |
| ------------ | ------------ | -------------- |
| `id`         | UUID         | Token ID       |
| `user_id`    | UUID         | Owner          |
| `token_hash` | varchar(255) | Hashed token   |
| `type`       | varchar(20)  | Token purpose  |
| `expires_at` | timestamptz  | Expiry         |
| `used_at`    | timestamptz  | One-time usage |
| `created_at` | timestamptz  | Issued at      |

---

## CHAPTER 2: GIKI Wallet & Payments

A **ledger-based internal wallet system** implementing:

* Double-entry accounting
* Tamper detection
* Idempotent payment processing
* O(1) balance reads

---

### 2.1 Wallets

Each user (and system entity) owns **exactly one wallet**.

#### Design Goals

* Separate user funds from system revenue
* Support operational freezing
* Enable audit-friendly naming

#### Table: `wallets`

| Field        | Type         | Description                                |
| ------------ | ------------ | ------------------------------------------ |
| `id`         | UUID         | Wallet ID                                  |
| `user_id`    | UUID         | Owner (unique)                             |
| `name`       | varchar(100) | Display/debug name                         |
| `type`       | varchar(20)  | `PERSONAL`, `SYS_REVENUE`, `SYS_LIABILITY` |
| `status`     | varchar(20)  | `ACTIVE`, `FROZEN`                         |
| `currency`   | varchar(3)   | `GIK` (1:1 with PKR)                       |
| `created_at` | timestamptz  | Creation time                              |

---

### 2.2 Ledger (Source of Truth)

The ledger is **append-only** and immutable.

> Balances are never updated directly.
> They are derived from ledger entries.

#### Key Guarantees

* Double-entry consistency
* Cryptographic tamper detection
* Idempotency enforcement

#### Table: `ledger`

| Field                  | Type         | Description            |
| ---------------------- | ------------ | ---------------------- |
| `id`                   | UUID         | Ledger entry           |
| `wallet_id`            | UUID         | Wallet affected        |
| `amount`               | bigint       | `+credit`, `-debit`    |
| `balance_after`        | bigint       | Snapshot after txn     |
| `transaction_group_id` | UUID         | Links debit & credit   |
| `transaction_type`     | varchar(50)  | Business action        |
| `reference_id`         | varchar(100) | External reference     |
| `description`          | text         | Human-readable context |
| `row_hash`             | varchar(255) | HMAC integrity hash    |
| `created_at`           | timestamptz  | Timestamp              |

#### Indexes

* `(transaction_type, reference_id)` → prevents double spending
* `wallet_id`
* `transaction_group_id`

---

### 2.3 Gateway Transactions

Tracks **payment gateway attempts**, not balances.

#### Responsibilities

* Idempotency enforcement
* Gateway reconciliation
* Audit trail

#### Table: `gateway_transactions`

| Field             | Type         | Description                    |
| ----------------- | ------------ | ------------------------------ |
| `id`              | UUID         | Transaction ID                 |
| `user_id`         | UUID         | Initiator                      |
| `idempotency_key` | varchar(255) | Client-side dedupe             |
| `bill_ref_id`     | varchar(50)  | Order reference                |
| `txn_ref_no`      | varchar(50)  | Gateway attempt ID             |
| `gateway_rrn`     | varchar(50)  | Bank reference                 |
| `status`          | varchar(20)  | `PENDING`, `SUCCESS`, `FAILED` |
| `amount`          | bigint       | Amount in GIK                  |
| `raw_response`    | jsonb        | Gateway payload                |
| `created_at`      | timestamptz  | Timestamp                      |

---

## CHAPTER 3: Security & Operations

This chapter protects the system against **abuse, fraud, and operational failures**.

---

### 3.1 Login Attempts (Rate Limiting)

Tracks authentication attempts across **IP, email, and device**.

Designed specifically for **shared mobile networks** (Jazz, Zong, etc.).

#### Table: `login_attempts`

| Field             | Type         | Description           |
| ----------------- | ------------ | --------------------- |
| `id`              | UUID         | Record ID             |
| `ip_address`      | varchar(45)  | Source IP             |
| `email`           | varchar(254) | Target email          |
| `device_id`       | varchar(255) | Frontend sticky token |
| `attempt_count`   | int          | Attempt counter       |
| `last_attempt_at` | timestamptz  | Last attempt          |
| `locked_until`    | timestamptz  | Temporary lock        |
| `user_agent`      | text         | Client fingerprint    |

---

### 3.2 IP Whitelist

Prevents accidental blocking of **trusted infrastructure**.

#### Table: `ip_whitelist`

| Field         | Type         | Description    |
| ------------- | ------------ | -------------- |
| `id`          | UUID         | Entry ID       |
| `ip_address`  | varchar(45)  | Whitelisted IP |
| `description` | varchar(255) | Context        |
| `created_at`  | timestamptz  | Added at       |

---

### 3.3 Security Blacklist

System-wide ban mechanism.

Can block:

* IP address
* Device ID
* Or both

#### Table: `security_blacklist`

| Field        | Type         | Description |
| ------------ | ------------ | ----------- |
| `id`         | UUID         | Entry ID    |
| `ip_address` | varchar(45)  | Nullable    |
| `device_id`  | varchar(255) | Nullable    |
| `reason`     | varchar(255) | Ban reason  |
| `blocked_at` | timestamptz  | Block start |
| `expires_at` | timestamptz  | Auto-expiry |

---

### 3.4 Notifications

Unified notification delivery queue.

Supports:

* Web push
* Email
* SMS (future)

#### Table: `notifications`

| Field         | Type         | Description     |
| ------------- | ------------ | --------------- |
| `id`          | UUID         | Notification ID |
| `user_id`     | UUID         | Recipient       |
| `type`        | varchar(50)  | Event type      |
| `channel`     | varchar(20)  | Delivery medium |
| `destination` | varchar(255) | Address         |
| `title`       | varchar(100) | Title           |
| `body`        | text         | Message         |
| `data`        | jsonb        | Payload         |
| `status`      | varchar(20)  | Delivery state  |
| `error_log`   | text         | Failure reason  |
| `created_at`  | timestamptz  | Created         |
| `sent_at`     | timestamptz  | Delivered       |

---

### 3.5 App Versions & Maintenance

Controls **forced upgrades** and **maintenance mode**.

#### Table: `app_versions`

| Field              | Type        | Description             |
| ------------------ | ----------- | ----------------------- |
| `id`               | UUID        | Record ID               |
| `platform`         | varchar(20) | `ANDROID`, `IOS`, `WEB` |
| `min_version`      | varchar(20) | Minimum allowed         |
| `latest_version`   | varchar(20) | Current                 |
| `maintenance_mode` | boolean     | Global lock             |
| `message`          | text        | User-facing notice      |
| `updated_at`       | timestamptz | Last change             |

---

### 3.6 Support Tickets

User-to-admin support channel.

#### Table: `support_tickets`

| Field                    | Type         | Description      |
| ------------------------ | ------------ | ---------------- |
| `id`                     | UUID         | Ticket ID        |
| `user_id`                | UUID         | Creator          |
| `subject`                | varchar(200) | Summary          |
| `message`                | text         | User message     |
| `related_transaction_id` | UUID         | Optional         |
| `status`                 | varchar(20)  | `OPEN`, `CLOSED` |
| `admin_response`         | text         | Resolution       |
| `created_at`             | timestamptz  | Submitted        |

---

## System-Wide Guarantees

This architecture ensures:

*  Financial correctness
*  Strong audit trails
*  Abuse resistance
*  Operational safety
*  Scalable authentication
*  Clear separation of concerns


