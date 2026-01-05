// ==========================================
// CORE 1: IDENTITY & AUTH (Shared)
// ==========================================

Table users {
  id bigint [pk, increment]

  // Auth Identity (Immutable)
  microsoft_oid uuid [not null, unique, note: "The Anchor. Never changes."]

  // Contact Info (Mutable)
  email varchar(254) [not null, unique]
  name varchar(150) [not null]
  phone_number varchar(20) [unique, note: "Crucial for Transport alerts"]

  // Authorization
  user_type varchar(20) [not null, note: "'STUDENT', 'EMPLOYEE', 'DRIVER', 'ADMIN'"]
  is_active boolean [default: true, note: "False = Banned/Left GIKI"]

  // Meta
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    email [name: "idx_users_email"]           // Fast Login
    microsoft_oid [name: "idx_users_oid"]     // Fast Sync with Graph
  }
}

Table student_profiles {
  user_id bigint [pk, note: "FK to users.id"]
  reg_id varchar(20) [not null, unique]
  degree_program varchar(50)
  batch_year integer
}

Table employee_profiles {
  user_id bigint [pk]
  designation varchar(100)
  department varchar(100)
}

// ==========================================
// CORE 2: GIKI WALLET (Financial Engine)
// ==========================================

Table wallets {
  id bigint [pk, increment]
  user_id bigint [not null, unique]
  status varchar(20) [default: 'ACTIVE']
  currency varchar(3) [default: 'PKR']
  created_at timestamptz [default: `now()`]
}

Table ledger {
  id bigint [pk, increment]
  wallet_id bigint [not null]

  // The Money (Immutable)
  amount bigint [not null, note: 'Positive (+) = Deposit, Negative (-) = Spend']

  // The Trace (Polymorphic)
  transaction_type varchar(50) [not null, note: 'JAZZCASH_DEPOSIT, TICKET_PURCHASE, CAFE_ORDER']
  reference_id varchar(100) [not null, note: 'ID of the Ticket, Order, or Gateway Txn']
  description text

  created_at timestamptz [default: `now()`]

  indexes {
    (transaction_type, reference_id) [unique, note: 'Global Idempotency']
    wallet_id [note: 'For Balance Calculation']
  }
}

Table gateway_transactions {
  id bigint [pk, increment]
  user_id bigint [not null, note: "Link to User"]

  // Core Identifiers (The minimal set to track a payment)
  order_id varchar(50) [not null, unique, note: "Our 'ORD-XXX'"]
  gateway_txn_id varchar(100) [note: "JazzCash pp_TxnRefNo"]
  gateway_rrn varchar(50) [note: "The RRN (Proof of Payment)"]

  // The Money
  amount bigint [not null, note: "Paisa"]
  status varchar(20) [default: 'PENDING', note: "PENDING, SUCCESS, FAILED"]
  payment_method varchar(20) [note: "MWALLET, CARD"]

  // Support Data (Just enough to help a student)
  account_number_used varchar(20) [note: "Masked Mobile or Card Last4"]

  // Technical Debugging
  response_code varchar(10) [note: "The raw error code (e.g. 121)"]
  raw_response jsonb [note: "Full payload for debugging"]

  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]
}

// ==========================================
// MODULE A: TRANSPORT (The Transport Dashboard)
// ==========================================

Table locations {
  id bigint [pk, increment]
  name varchar(100) [note: "e.g. 'GIKI Main Gate'"]
  short_code varchar(10)
}

Table vehicles {
  id bigint [pk, increment]
  plate_number varchar(20) [unique]
  capacity int [note: "Total seats"]
  is_active boolean [default: true]
}

Table trip_schedules {
  id bigint [pk, increment]
  vehicle_id bigint [not null]
  origin_id bigint [not null]
  destination_id bigint [not null]

  departure_time timestamptz [not null]
  ticket_price bigint [not null, note: "Price in Paisa"]
  status varchar(20) [default: 'SCHEDULED']
}

Table tickets {
  id bigint [pk, increment]
  user_id bigint [not null]
  schedule_id bigint [not null]
  seat_number int [not null]

  price_paid bigint [not null]
  status varchar(20) [default: 'CONFIRMED', note: "CONFIRMED, CANCELLED, USED"]
  qr_code varchar(255) [unique, note: "Secret for conductor scanning"]

  created_at timestamptz [default: `now()`]

  indexes {
    (schedule_id, seat_number) [unique, note: "No double booking"]
  }
}

// ==========================================
// RELATIONSHIPS
// ==========================================

// Auth
Ref: student_profiles.user_id - users.id [delete: cascade]
Ref: employee_profiles.user_id - users.id [delete: cascade]

// Finance
Ref: wallets.user_id - users.id [delete: cascade]
Ref: ledger.wallet_id > wallets.id [delete: restrict]
Ref: gateway_transactions.user_id > users.id [delete: cascade]

// Transport
Ref: trip_schedules.vehicle_id > vehicles.id
Ref: trip_schedules.origin_id > locations.id
Ref: trip_schedules.destination_id > locations.id
Ref: tickets.schedule_id > trip_schedules.id
Ref: tickets.user_id > users.id