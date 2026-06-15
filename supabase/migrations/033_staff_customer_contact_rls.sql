-- Runners and riders need customer name/phone on orders they are assigned to.
-- Without this, SELECT on users for the order's customer_id returns nothing under RLS.

CREATE POLICY "Staff can view customers on assigned orders" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_assignments oa
      INNER JOIN public.orders o ON o.id = oa.order_id
      WHERE o.customer_id = users.id
        AND oa.assignee_id = auth.uid()
        AND oa.role IN ('runner', 'rider')
    )
  );
