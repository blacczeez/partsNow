-- Price discrepancy workflow: item budgets, review status, vendor incidents.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS price_review_status TEXT NOT NULL DEFAULT 'none'
    CHECK (price_review_status IN ('none', 'pending', 'resolved'));

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS expected_vendor_price DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS max_vendor_price DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS price_review_status TEXT
    CHECK (price_review_status IS NULL OR price_review_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.vendor_incidents
  ALTER COLUMN vendor_id DROP NOT NULL;

ALTER TABLE public.vendor_incidents
  ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id);

CREATE INDEX IF NOT EXISTS idx_orders_price_review_status
  ON public.orders (price_review_status)
  WHERE price_review_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_order_items_price_review
  ON public.order_items (order_id, price_review_status)
  WHERE price_review_status = 'pending';

-- vendor_incidents had RLS enabled (002) with no policies
DROP POLICY IF EXISTS "Admins can view vendor incidents" ON vendor_incidents;
CREATE POLICY "Admins can view vendor incidents" ON vendor_incidents
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage vendor incidents" ON vendor_incidents;
CREATE POLICY "Admins can manage vendor incidents" ON vendor_incidents
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Runners can insert vendor incidents on assigned orders" ON vendor_incidents;
CREATE POLICY "Runners can insert vendor incidents on assigned orders" ON vendor_incidents
  FOR INSERT
  WITH CHECK (
    public.user_assigned_to_order(order_id)
    AND type = 'price_discrepancy'
  );

-- Backfill vendor budgets on existing items
UPDATE public.order_items
SET
  expected_vendor_price = ROUND(selling_price / 1.15),
  max_vendor_price = ROUND(selling_price / 1.15 * 1.10)
WHERE expected_vendor_price IS NULL;

-- Backfill pending review on orders already flagged in internal_notes
UPDATE public.order_items oi
SET price_review_status = 'pending'
FROM public.orders o
WHERE oi.order_id = o.id
  AND o.internal_notes LIKE '%[PRICE ESCALATION]%'
  AND oi.is_found = true
  AND oi.price_review_status IS NULL
  AND oi.vendor_price IS NOT NULL
  AND oi.vendor_price > COALESCE(
    oi.max_vendor_price,
    ROUND(oi.selling_price / 1.15 * 1.10)
  );

UPDATE public.orders
SET price_review_status = 'pending'
WHERE price_review_status = 'none'
  AND id IN (
    SELECT DISTINCT order_id FROM public.order_items WHERE price_review_status = 'pending'
  );
