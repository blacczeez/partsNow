-- Customer-funded price changes (no platform absorption).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS original_total DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS price_topup_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revised_total DECIMAL(12, 2);

UPDATE public.orders SET original_total = total WHERE original_total IS NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_price_review_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_price_review_status_check
  CHECK (price_review_status IN ('none', 'pending', 'awaiting_customer', 'resolved', 'cancelled'));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_price_review_status_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_price_review_status_check
  CHECK (
    price_review_status IS NULL
    OR price_review_status IN ('pending', 'awaiting_customer', 'customer_approved', 'rejected')
  );

-- Migrate legacy admin-approved rows to customer-approved (already past review)
UPDATE public.order_items
SET price_review_status = 'customer_approved'
WHERE price_review_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_orders_awaiting_customer_price
  ON public.orders (price_review_status)
  WHERE price_review_status = 'awaiting_customer';
