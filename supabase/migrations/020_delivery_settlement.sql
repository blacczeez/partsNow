-- Delivery failure settlement (Return & handling fee, partial refunds)

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'partially_refunded';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS settlement_status TEXT,
  ADD COLUMN IF NOT EXISTS settlement_fault TEXT,
  ADD COLUMN IF NOT EXISTS parts_recovery_rate DECIMAL(5, 4),
  ADD COLUMN IF NOT EXISTS return_handling_fee DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS settlement_refund_amount DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS settlement_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS settlement_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.settlement_status IS
  'null | pending_parts | pending_approval | completed';
COMMENT ON COLUMN public.orders.settlement_fault IS
  'customer | platform | waived';
COMMENT ON COLUMN public.orders.parts_recovery_rate IS
  '0.0000 to 1.0000 — share of parts subtotal recoverable from vendor';
