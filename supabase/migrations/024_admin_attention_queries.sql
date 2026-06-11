-- Efficient admin dashboard / queue queries for ops attention items.

CREATE OR REPLACE FUNCTION admin_count_sla_breaches()
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM orders
  WHERE status IN ('confirmed', 'sourcing', 'picked', 'dispatched')
    AND promised_delivery_minutes IS NOT NULL
    AND created_at + (promised_delivery_minutes * INTERVAL '1 minute') < NOW();
$$;

CREATE OR REPLACE FUNCTION admin_list_sla_breach_orders(p_limit int, p_offset int)
RETURNS TABLE (
  id uuid,
  order_number text,
  status order_status,
  total numeric,
  payment_method payment_method,
  payment_status payment_status,
  created_at timestamptz,
  customer_id uuid,
  source_channel source_channel,
  price_review_status text,
  promised_delivery_minutes int,
  minutes_overdue numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    o.id,
    o.order_number,
    o.status,
    o.total,
    o.payment_method,
    o.payment_status,
    o.created_at,
    o.customer_id,
    o.source_channel,
    o.price_review_status,
    o.promised_delivery_minutes,
    ROUND(
      EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 60 - o.promised_delivery_minutes,
      0
    ) AS minutes_overdue
  FROM orders o
  WHERE o.status IN ('confirmed', 'sourcing', 'picked', 'dispatched')
    AND o.promised_delivery_minutes IS NOT NULL
    AND o.created_at + (o.promised_delivery_minutes * INTERVAL '1 minute') < NOW()
  ORDER BY minutes_overdue DESC, o.created_at ASC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE INDEX IF NOT EXISTS idx_orders_active_sla_scan
  ON orders (created_at ASC)
  WHERE status IN ('confirmed', 'sourcing', 'picked', 'dispatched')
    AND promised_delivery_minutes IS NOT NULL;

GRANT EXECUTE ON FUNCTION admin_count_sla_breaches() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_sla_breach_orders(int, int) TO authenticated;
