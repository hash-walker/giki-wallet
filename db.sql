Project GIKI_Unified_System {
  database_type: 'PostgreSQL'
  Note: 'Merged Schema: Robust Identity/Wallet + Decoupled Transport'
}

// ==========================================
// 1. IDENTITY & AUTH (The "Old" System)
// ==========================================

Table users {
  id uuid [pk, default: `gen_random_uuid()`] 
  
  // Identity
  email varchar(254) [not null, unique]
  name varchar(150) [not null]
  phone_number varchar(20) [unique]
  
  // Auth & Role
  auth_provider varchar(20) [default: 'MICROSOFT'] 
  external_id varchar(255) [unique] 
  password_hash varchar(500) 
  is_active boolean [default: true]
  user_type varchar(20) [not null] // 'STUDENT', 'EMPLOYEE', 'ADMIN'
  
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]
}

Table student_profiles {
  user_id uuid [pk, ref: - users.id] 
  reg_id varchar(20) [not null, unique]
  degree_program varchar(50)
  batch_year integer
}

Table employee_profiles {
  user_id uuid [pk, ref: - users.id] 
  designation varchar(100)
  department varchar(100)
}

// ==========================================
// 2. ROBUST WALLET (The "Old" System)
// ==========================================

Table wallets {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, unique, ref: - users.id]
  
  name varchar(100) 
  type varchar(20) [default: 'PERSONAL'] // PERSONAL, SYS_REVENUE
  status varchar(20) [default: 'ACTIVE']
  currency varchar(3) [default: 'GIK'] 
  
  created_at timestamptz [default: `now()`]
}

Table ledger {
  id uuid [pk, default: `gen_random_uuid()`]
  wallet_id uuid [not null, ref: > wallets.id]
  
  // Financials
  amount bigint [not null, note: 'Positive (+) Credit, Negative (-) Debit']
  balance_after bigint [not null]
  transaction_group_id uuid [not null, note: 'Links Debit/Credit pair']
  
  // Audit
  transaction_type varchar(50) [not null] // TICKET_PURCHASE, JAZZCASH_TOPUP
  reference_id varchar(100) [not null] // Links to transport_ticket.id
  description text
  row_hash varchar(255) 
  
  created_at timestamptz [default: `now()`]

  indexes {
    (transaction_type, reference_id) [unique]
  }
}

Table gateway_transactions {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  
  txn_ref_no varchar(50) [not null, unique]
  status varchar(20) [default: 'PENDING']
  amount bigint [not null]
  
  created_at timestamptz [default: `now()`]
}

// ==========================================
// 3. TRANSPORT: STATIC DATA (Drivers & Stops)
// ==========================================

Table transport_driver {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(100) [not null]
  phone_number varchar(15)
  license_number varchar(50) [unique]
  is_active boolean [default: true]
}

Table transport_stop {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(150) [not null, note: 'e.g. Main Gate, Toll Plaza']
  latitude decimal(9,6)
  longitude decimal(9,6)
  type varchar(20) [default: 'BUS_STOP']
  is_active boolean [default: true]
}

// ==========================================
// 4. TRANSPORT: ROUTES (Templates)
// ==========================================

Table transport_route {
  id uuid [pk, default: `gen_random_uuid()`]
  name varchar(150) [not null, note: 'e.g. GIKI - Islamabad']
  origin_city varchar(100)
  destination_city varchar(100)
  is_active boolean [default: true]
  created_at timestamptz [default: `now()`]
}

// The "Master List" of stops for a route (The Template)
Table transport_route_master_stop {
  id uuid [pk, default: `gen_random_uuid()`]
  route_id uuid [not null, ref: > transport_route.id]
  stop_id uuid [not null, ref: > transport_stop.id]
  
  default_sequence_order int [not null]
  is_default_active boolean [default: true]

  indexes {
    (route_id, stop_id) [unique]
    (route_id, default_sequence_order) [unique]
  }
}

// ==========================================
// 5. TRANSPORT: TRIPS (The Schedule)
// ==========================================

// The specific instance (e.g., Friday 5 PM Bus)
Table transport_trip {
  id uuid [pk, default: `gen_random_uuid()`]
  route_id uuid [not null, ref: > transport_route.id]
  driver_id uuid [ref: > transport_driver.id]
  
  departure_time timestamptz [not null]
  estimated_arrival_time timestamptz
  
  vehicle_number varchar(20)
  total_capacity int [not null]
  available_seats int [not null]
  
  base_price decimal(10,2) [not null]
  status varchar(20) [default: 'SCHEDULED'] // SCHEDULED, BOARDING, COMPLETED
  created_at timestamptz [default: `now()`]
}

// The "Live" stops for this specific trip (Filtered from Master)
Table transport_trip_stop {
  id uuid [pk, default: `gen_random_uuid()`]
  trip_id uuid [not null, ref: > transport_trip.id]
  stop_id uuid [not null, ref: > transport_stop.id]
  
  sequence_order int [not null]
  scheduled_arrival_time timestamptz
  price_modifier decimal(10,2) [default: 0.00]

  indexes {
    (trip_id, stop_id) [unique]
    (trip_id, sequence_order) [unique]
  }
}

// ==========================================
// 6. TRANSPORT: TICKETING (The Bridge)
// ==========================================

Table transport_ticket {
  id uuid [pk, default: `gen_random_uuid()`]
  ticket_number varchar(30) [unique, not null]
  
  // 1. LINK TO IDENTITY (Using the "Old" table)
  user_id uuid [not null, ref: > users.id]
  
  // 2. LINK TO TRANSPORT
  trip_id uuid [not null, ref: > transport_trip.id]
  pickup_trip_stop_id uuid [ref: > transport_trip_stop.id]
  dropoff_trip_stop_id uuid [ref: > transport_trip_stop.id]
  
  // 3. LINK TO PAYMENT (Using the "Old" Ledger)
  // This points to the Debit transaction in the ledger
  ledger_transaction_id uuid [unique, ref: - ledger.id] 
  
  seat_number varchar(10)
  price_paid decimal(10,2) [not null]
  status varchar(20) [default: 'VALID']
  
  qr_code_data varchar(255) [not null]
  checked_in_at timestamptz
  booked_at timestamptz [default: `now()`]
  cancelled_at timestamptz
}

// ==========================================
// 7. SECURITY & OPS (The "Old" System)
    // ==========================================

Table login_attempts {
  id uuid [pk, default: `gen_random_uuid()`]
  ip_address varchar(45) [not null]
  email varchar(254) 
  attempt_count int [default: 1]
  locked_until timestamptz 
}

Table notifications {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  title varchar(100)
  body text
  status varchar(20) [default: 'PENDING']
}

Table support_tickets {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null, ref: > users.id]
  subject varchar(200)
  message text
  // Can link to a specific ticket issue
  related_ticket_id uuid [ref: > transport_ticket.id] 
  status varchar(20) [default: 'OPEN']
}