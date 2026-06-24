-- Vendor reliability: incident workflow, customer part reports, score inputs.

ALTER TABLE public.vendor_incidents
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'rejected'));

ALTER TABLE public.vendor_incidents
  ADD COLUMN IF NOT EXISTS source TEXT
    CHECK (source IS NULL OR source IN ('customer', 'rider', 'runner', 'admin', 'system'));

ALTER TABLE public.vendor_incidents
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES public.users(id);

ALTER TABLE public.vendor_incidents
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE public.vendor_incidents
  ADD COLUMN IF NOT EXISTS issue_subtype TEXT;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS part_issue_reported BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vendor_incidents_vendor_status
  ON public.vendor_incidents (vendor_id, status, type)
  WHERE vendor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_incidents_order
  ON public.vendor_incidents (order_id, created_at DESC);

-- Backfill runner price escalations as confirmed system incidents
UPDATE public.vendor_incidents
SET
  status = 'confirmed',
  source = COALESCE(source, 'runner')
WHERE type = 'price_discrepancy'
  AND source IS NULL;

-- Customers can report part quality issues on delivered orders
DROP POLICY IF EXISTS "Customers can report part issues on own orders" ON public.vendor_incidents;
CREATE POLICY "Customers can report part issues on own orders" ON public.vendor_incidents
  FOR INSERT
  WITH CHECK (
    type = 'quality_issue'
    AND source = 'customer'
    AND status = 'pending'
    AND order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
        AND o.status = 'delivered'
    )
  );

DROP POLICY IF EXISTS "Customers can view incidents on own orders" ON public.vendor_incidents;
CREATE POLICY "Customers can view incidents on own orders" ON public.vendor_incidents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = vendor_incidents.order_id
        AND o.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Riders can report part issues on assigned orders" ON public.vendor_incidents;
CREATE POLICY "Riders can report part issues on assigned orders" ON public.vendor_incidents
  FOR INSERT
  WITH CHECK (
    type = 'quality_issue'
    AND source = 'rider'
    AND status = 'pending'
    AND public.user_assigned_to_order(order_id)
  );

DROP POLICY IF EXISTS "Runners can insert vendor incidents on assigned orders" ON public.vendor_incidents;
CREATE POLICY "Runners can insert vendor incidents on assigned orders" ON public.vendor_incidents
  FOR INSERT
  WITH CHECK (
    public.user_assigned_to_order(order_id)
    AND type IN ('price_discrepancy', 'out_of_stock')
    AND status IN ('pending', 'confirmed')
  );
