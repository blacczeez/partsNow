-- Track orders that need admin intervention during sourcing (runner unavailable, no runner on shift, etc.)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS sourcing_escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sourcing_escalation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_sourcing_escalated
  ON orders (sourcing_escalated_at)
  WHERE sourcing_escalated_at IS NOT NULL;
