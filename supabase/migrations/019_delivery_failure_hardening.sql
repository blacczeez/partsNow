-- Delivery failure workflow: retry windows, admin review, parts custody, attempt metadata

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_resolution TEXT,
  ADD COLUMN IF NOT EXISTS delivery_retry_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parts_custody TEXT;

COMMENT ON COLUMN public.orders.delivery_resolution IS
  'null | retry | admin_review | return_pending';
COMMENT ON COLUMN public.orders.parts_custody IS
  'null | with_rider | at_hub';

ALTER TABLE public.delivery_attempts
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS call_attempts_made INTEGER NOT NULL DEFAULT 0;

-- Attempt numbers are unique per order (not per rider)
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_attempts_order_attempt
  ON public.delivery_attempts(order_id, attempt_number);
