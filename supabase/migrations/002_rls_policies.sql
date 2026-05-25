-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_floats ENABLE ROW LEVEL SECURITY;
ALTER TABLE runner_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.user_type = 'admin'
    )
  );

-- ============================================
-- WALLET POLICIES
-- ============================================

CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wallets w
      WHERE w.id = wallet_transactions.wallet_id
      AND w.user_id = auth.uid()
    )
  );

-- ============================================
-- ORDERS POLICIES
-- ============================================

CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Runners can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_assignments
      WHERE order_assignments.order_id = orders.id
      AND order_assignments.assignee_id = auth.uid()
    )
  );

CREATE POLICY "Riders can view assigned orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_assignments
      WHERE order_assignments.order_id = orders.id
      AND order_assignments.assignee_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

-- ============================================
-- ORDER ITEMS POLICIES
-- ============================================

CREATE POLICY "Users can view order items for their orders" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Assignees can view order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM order_assignments
      WHERE order_assignments.order_id = order_items.order_id
      AND order_assignments.assignee_id = auth.uid()
    )
  );

-- ============================================
-- VEHICLES POLICIES
-- ============================================

CREATE POLICY "Users can manage own vehicles" ON vehicles
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CLUSTERS POLICIES (Public read)
-- ============================================

CREATE POLICY "Anyone can view active clusters" ON clusters
  FOR SELECT USING (is_active = true);

-- ============================================
-- PARTS POLICIES (Public read)
-- ============================================

CREATE POLICY "Anyone can view active parts" ON parts
  FOR SELECT USING (is_active = true);

-- ============================================
-- VENDORS POLICIES
-- ============================================

CREATE POLICY "Admins can manage vendors" ON vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Runners can view vendors in their cluster" ON vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'runner'
      AND users.cluster_id = vendors.cluster_id
    )
  );

-- ============================================
-- RUNNER FLOATS POLICIES
-- ============================================

CREATE POLICY "Runners can view own float" ON runner_floats
  FOR SELECT USING (auth.uid() = runner_id);

-- ============================================
-- RUNNER SHIFTS POLICIES
-- ============================================

CREATE POLICY "Runners can view own shifts" ON runner_shifts
  FOR SELECT USING (auth.uid() = runner_id);

CREATE POLICY "Runners can manage own shifts" ON runner_shifts
  FOR INSERT WITH CHECK (auth.uid() = runner_id);

CREATE POLICY "Runners can update own shifts" ON runner_shifts
  FOR UPDATE USING (auth.uid() = runner_id);

-- ============================================
-- DELIVERY TRACKING POLICIES
-- ============================================

CREATE POLICY "Order customers can view tracking" ON delivery_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_tracking.order_id
      AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Riders can update own tracking" ON delivery_tracking
  FOR ALL USING (auth.uid() = rider_id);

-- ============================================
-- CREDIT PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can view own credit profile" ON credit_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- AUDIT LOG POLICIES
-- ============================================

CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );
