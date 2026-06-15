-- Canonical loyalty stats: count orders + spend on delivery (paid), then recalculate tier.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_stats_applied_at TIMESTAMPTZ;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS loyalty_tier_locked BOOLEAN NOT NULL DEFAULT false;

-- Seed admin-configurable loyalty thresholds (defaults match lib/config.ts)
INSERT INTO system_config (key, value, description)
VALUES
  (
    'loyalty_verified_min_orders',
    '5'::jsonb,
    'Minimum delivered paid orders for Verified tier'
  ),
  (
    'loyalty_trusted_min_orders',
    '20'::jsonb,
    'Minimum delivered paid orders for Trusted tier'
  ),
  (
    'loyalty_partner_min_orders',
    '50'::jsonb,
    'Minimum delivered paid orders for Partner tier'
  ),
  (
    'loyalty_partner_min_lifetime_spend',
    '500000'::jsonb,
    'Minimum lifetime spend (NGN) for Partner tier'
  )
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.loyalty_config_int(p_key TEXT, p_default INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT (value)::text::integer
      FROM system_config
      WHERE key = p_key
    ),
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION public.calculate_loyalty_tier(
  p_total_orders INTEGER,
  p_lifetime_spend DECIMAL
)
RETURNS loyalty_tier
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_total_orders >= public.loyalty_config_int('loyalty_partner_min_orders', 50)
      AND p_lifetime_spend >= public.loyalty_config_int('loyalty_partner_min_lifetime_spend', 500000)::decimal
      THEN 'partner'::loyalty_tier
    WHEN p_total_orders >= public.loyalty_config_int('loyalty_trusted_min_orders', 20)
      THEN 'trusted'::loyalty_tier
    WHEN p_total_orders >= public.loyalty_config_int('loyalty_verified_min_orders', 5)
      THEN 'verified'::loyalty_tier
    ELSE 'new'::loyalty_tier
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_customer_delivery_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_orders INTEGER;
  v_lifetime_spend DECIMAL(12, 2);
  v_new_tier loyalty_tier;
  v_locked BOOLEAN;
BEGIN
  IF NEW.status IS DISTINCT FROM 'delivered'::order_status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'delivered'::order_status THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM 'paid'::payment_status THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_stats_applied_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE users
  SET
    total_orders = total_orders + 1,
    lifetime_spend = lifetime_spend + NEW.total,
    updated_at = NOW()
  WHERE id = NEW.customer_id
  RETURNING total_orders, lifetime_spend, loyalty_tier_locked
  INTO v_total_orders, v_lifetime_spend, v_locked;

  IF NOT COALESCE(v_locked, false) THEN
    v_new_tier := public.calculate_loyalty_tier(v_total_orders, v_lifetime_spend);
    UPDATE users
    SET loyalty_tier = v_new_tier, updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  NEW.customer_stats_applied_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_order_delivered ON orders;
DROP TRIGGER IF EXISTS before_order_delivered_stats ON orders;

CREATE TRIGGER before_order_delivered_stats
BEFORE UPDATE OF status ON orders
FOR EACH ROW
WHEN (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered')
EXECUTE FUNCTION public.record_customer_delivery_stats();

-- Backfill: recompute counters from delivered + paid orders
WITH delivered_stats AS (
  SELECT
    customer_id,
    COUNT(*)::integer AS order_count,
    COALESCE(SUM(total), 0)::decimal(12, 2) AS spend_total
  FROM orders
  WHERE status = 'delivered'
    AND payment_status = 'paid'
  GROUP BY customer_id
)
UPDATE users u
SET
  total_orders = COALESCE(ds.order_count, 0),
  lifetime_spend = COALESCE(ds.spend_total, 0),
  loyalty_tier = CASE
    WHEN u.loyalty_tier_locked THEN u.loyalty_tier
    ELSE public.calculate_loyalty_tier(
      COALESCE(ds.order_count, 0),
      COALESCE(ds.spend_total, 0)
    )
  END,
  updated_at = NOW()
FROM delivered_stats ds
WHERE u.id = ds.customer_id;

UPDATE users u
SET
  total_orders = 0,
  lifetime_spend = 0,
  loyalty_tier = CASE
    WHEN u.loyalty_tier_locked THEN u.loyalty_tier
    ELSE 'new'::loyalty_tier
  END,
  updated_at = NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = u.id
    AND o.status = 'delivered'
    AND o.payment_status = 'paid'
);

UPDATE orders
SET customer_stats_applied_at = COALESCE(delivered_at, updated_at, NOW())
WHERE status = 'delivered'
  AND payment_status = 'paid'
  AND customer_stats_applied_at IS NULL;

DROP FUNCTION IF EXISTS public.update_loyalty_tier();
