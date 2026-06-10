-- CASE literals are text; loyalty_tier column is an enum — cast explicitly.
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
