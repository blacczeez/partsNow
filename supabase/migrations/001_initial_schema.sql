-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_type AS ENUM ('mechanic', 'car_owner', 'runner', 'rider', 'admin');
CREATE TYPE loyalty_tier AS ENUM ('new', 'verified', 'trusted', 'partner');
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'sourcing', 'picked',
  'dispatched', 'delivered', 'cancelled', 'rejected', 'failed'
);
CREATE TYPE payment_method AS ENUM ('wallet', 'card', 'bank_transfer', 'cod');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE source_channel AS ENUM ('whatsapp', 'web', 'app');
CREATE TYPE delivery_type AS ENUM ('express', 'standard');
CREATE TYPE assignment_role AS ENUM ('runner', 'rider');
CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'in_progress', 'completed', 'failed');
CREATE TYPE wallet_transaction_type AS ENUM ('credit', 'debit', 'hold', 'release');
CREATE TYPE credit_tier AS ENUM ('starter', 'standard', 'premium');

-- ============================================
-- MARKET CLUSTERS
-- ============================================

CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  delivery_radius_km INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT NOT NULL,
  user_type user_type NOT NULL,
  cluster_id UUID REFERENCES clusters(id),
  profile JSONB DEFAULT '{}',
  loyalty_tier loyalty_tier NOT NULL DEFAULT 'new',
  total_orders INTEGER NOT NULL DEFAULT 0,
  lifetime_spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_cluster ON users(cluster_id);

-- ============================================
-- WALLETS
-- ============================================

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  held_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_held CHECK (held_balance >= 0)
);

CREATE UNIQUE INDEX idx_wallets_user ON wallets(user_id);

-- ============================================
-- WALLET TRANSACTIONS
-- ============================================

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type wallet_transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_reference ON wallet_transactions(reference);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at);

-- ============================================
-- RUNNER FLOATS
-- ============================================

CREATE TABLE runner_floats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES users(id),
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  daily_limit DECIMAL(12, 2) NOT NULL DEFAULT 200000,
  last_topped_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT positive_float CHECK (balance >= 0)
);

CREATE UNIQUE INDEX idx_runner_floats_runner ON runner_floats(runner_id);

-- ============================================
-- CREDIT PROFILES
-- ============================================

CREATE TABLE credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  credit_tier credit_tier NOT NULL DEFAULT 'starter',
  credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 30000,
  credit_used DECIMAL(12, 2) NOT NULL DEFAULT 0,
  credit_available DECIMAL(12, 2) GENERATED ALWAYS AS (credit_limit - credit_used) STORED,
  repayment_window_hours INTEGER NOT NULL DEFAULT 48,
  late_fee_percentage DECIMAL(5, 2) NOT NULL DEFAULT 2,
  credit_score INTEGER NOT NULL DEFAULT 100,
  total_credit_extended DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_repaid_on_time DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_repaid_late DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_written_off DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_credit_profiles_user ON credit_profiles(user_id);

-- ============================================
-- CREDIT EVENTS
-- ============================================

CREATE TABLE credit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_profile_id UUID NOT NULL REFERENCES credit_profiles(id),
  type TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  order_id UUID,
  due_at TIMESTAMPTZ,
  repaid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_events_profile ON credit_events(credit_profile_id);

-- ============================================
-- VENDORS
-- ============================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  location_in_market TEXT,
  specializations TEXT[] DEFAULT '{}',
  payment_terms TEXT DEFAULT 'cash',
  reliability_score INTEGER NOT NULL DEFAULT 100,
  total_orders INTEGER NOT NULL DEFAULT 0,
  quality_issues INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_cluster ON vendors(cluster_id);
CREATE INDEX idx_vendors_active ON vendors(is_active);

-- ============================================
-- VENDOR INCIDENTS
-- ============================================

CREATE TABLE vendor_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  order_id UUID,
  type TEXT NOT NULL,
  description TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_incidents_vendor ON vendor_incidents(vendor_id);

-- ============================================
-- PARTS CATALOG
-- ============================================

CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oem_code TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  compatible_vehicles JSONB DEFAULT '[]',
  average_price DECIMAL(12, 2),
  weight_kg DECIMAL(6, 2),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_category ON parts(category);
CREATE INDEX idx_parts_oem ON parts(oem_code);
CREATE INDEX idx_parts_name ON parts USING gin(to_tsvector('english', name));

-- ============================================
-- VEHICLES
-- ============================================

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  spec TEXT,
  nickname TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_user ON vehicles(user_id);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  cluster_id UUID NOT NULL REFERENCES clusters(id),
  vehicle_id UUID REFERENCES vehicles(id),

  -- Status
  status order_status NOT NULL DEFAULT 'pending',
  clarification_status TEXT,
  clarification_thread JSONB DEFAULT '[]',

  -- Delivery
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_type delivery_type NOT NULL DEFAULT 'express',
  delivery_notes TEXT,

  -- Pricing
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  markup_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Payment
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  payment_hold_expires_at TIMESTAMPTZ,

  -- Source
  source_channel source_channel NOT NULL,
  whatsapp_conversation_id TEXT,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  sourcing_started_at TIMESTAMPTZ,
  picked_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Metrics
  promised_delivery_minutes INTEGER,
  actual_delivery_minutes INTEGER,
  rating INTEGER,
  rating_comment TEXT
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_cluster ON orders(cluster_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id),
  vendor_id UUID REFERENCES vendors(id),

  -- Part details
  description TEXT NOT NULL,
  oem_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Pricing
  vendor_price DECIMAL(12, 2),
  selling_price DECIMAL(12, 2) NOT NULL,

  -- Verification
  customer_image_url TEXT,
  qc_image_url TEXT,

  -- Status
  is_found BOOLEAN NOT NULL DEFAULT false,
  is_unavailable BOOLEAN NOT NULL DEFAULT false,
  unavailable_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- ORDER ASSIGNMENTS
-- ============================================

CREATE TABLE order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  assignee_id UUID NOT NULL REFERENCES users(id),
  role assignment_role NOT NULL,
  status assignment_status NOT NULL DEFAULT 'assigned',

  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  rejection_reason TEXT,
  notes TEXT,

  -- For riders
  pickup_confirmed_at TIMESTAMPTZ,
  pickup_photo_url TEXT
);

CREATE INDEX idx_assignments_order ON order_assignments(order_id);
CREATE INDEX idx_assignments_assignee ON order_assignments(assignee_id);

-- ============================================
-- DELIVERY TRACKING
-- ============================================

CREATE TABLE delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  rider_id UUID NOT NULL REFERENCES users(id),

  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  eta_minutes INTEGER,

  partner_tracking_url TEXT,
  partner_reference TEXT,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_order ON delivery_tracking(order_id);

-- ============================================
-- DELIVERY ATTEMPTS
-- ============================================

CREATE TABLE delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  rider_id UUID NOT NULL REFERENCES users(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,

  status TEXT NOT NULL,
  failure_reason TEXT,
  photo_url TEXT,
  notes TEXT,

  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_attempts_order ON delivery_attempts(order_id);

-- ============================================
-- PAYMENT EVENTS
-- ============================================

CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  wallet_id UUID REFERENCES wallets(id),

  type TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  provider TEXT,
  provider_reference TEXT,
  status TEXT NOT NULL,

  raw_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_events_order ON payment_events(order_id);
CREATE INDEX idx_payment_events_reference ON payment_events(provider_reference);

-- ============================================
-- RUNNER SHIFTS
-- ============================================

CREATE TABLE runner_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES users(id),
  cluster_id UUID NOT NULL REFERENCES clusters(id),

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  starting_float DECIMAL(12, 2) NOT NULL,
  ending_float DECIMAL(12, 2),

  orders_completed INTEGER NOT NULL DEFAULT 0,
  total_sourced DECIMAL(12, 2) NOT NULL DEFAULT 0,
  commission_earned DECIMAL(12, 2) NOT NULL DEFAULT 0,

  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES users(id),
  discrepancy_amount DECIMAL(12, 2) DEFAULT 0,
  discrepancy_notes TEXT
);

CREATE INDEX idx_shifts_runner ON runner_shifts(runner_id);
CREATE INDEX idx_shifts_date ON runner_shifts(started_at);

-- ============================================
-- SYSTEM CONFIG
-- ============================================

CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
