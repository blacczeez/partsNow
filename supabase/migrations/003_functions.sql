-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_count INTEGER;
  date_part TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE order_number LIKE 'ORD-' || date_part || '-%';

  RETURN 'ORD-' || date_part || '-' || LPAD(today_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Wallet debit with validation
CREATE OR REPLACE FUNCTION debit_wallet(
  p_wallet_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- Lock the wallet row
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Debit wallet
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;

  -- Log transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference, description)
  VALUES (p_wallet_id, 'debit', p_amount, v_current_balance, v_current_balance - p_amount, p_reference, p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Wallet credit
CREATE OR REPLACE FUNCTION credit_wallet(
  p_wallet_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_before, balance_after, reference, description)
  VALUES (p_wallet_id, 'credit', p_amount, v_current_balance, v_current_balance + p_amount, p_reference, p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update loyalty tier based on order history
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET loyalty_tier = CASE
    WHEN total_orders >= 50 AND lifetime_spend >= 500000 THEN 'partner'::loyalty_tier
    WHEN total_orders >= 20 THEN 'trusted'::loyalty_tier
    WHEN total_orders >= 5 THEN 'verified'::loyalty_tier
    ELSE 'new'::loyalty_tier
  END,
  updated_at = NOW()
  WHERE id = NEW.customer_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_order_delivered
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
EXECUTE FUNCTION update_loyalty_tier();
