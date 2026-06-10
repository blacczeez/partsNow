-- Runners/riders could SELECT assigned orders but not UPDATE status (sourcing → delivered).
-- delivery_attempts had RLS enabled with no policies.

CREATE POLICY "Runners can update assigned orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_assignments
      WHERE order_assignments.order_id = orders.id
        AND order_assignments.assignee_id = auth.uid()
        AND order_assignments.role = 'runner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.order_assignments
      WHERE order_assignments.order_id = orders.id
        AND order_assignments.assignee_id = auth.uid()
        AND order_assignments.role = 'runner'
    )
  );

CREATE POLICY "Riders can update assigned orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_assignments
      WHERE order_assignments.order_id = orders.id
        AND order_assignments.assignee_id = auth.uid()
        AND order_assignments.role = 'rider'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.order_assignments
      WHERE order_assignments.order_id = orders.id
        AND order_assignments.assignee_id = auth.uid()
        AND order_assignments.role = 'rider'
    )
  );

CREATE POLICY "Riders can insert own delivery attempts" ON delivery_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Riders can view own delivery attempts" ON delivery_attempts
  FOR SELECT
  USING (auth.uid() = rider_id);

CREATE POLICY "Customers can view delivery attempts for own orders" ON delivery_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = delivery_attempts.order_id
        AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all delivery attempts" ON delivery_attempts
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Assignees can view delivery attempts on assigned orders" ON delivery_attempts
  FOR SELECT
  USING (public.user_assigned_to_order(order_id));
