-- Checkout failed: customers could INSERT orders but not order_items (or UPDATE/DELETE orders).

-- Helper: runner/rider assigned to an order
CREATE OR REPLACE FUNCTION public.user_assigned_to_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_assignments
    WHERE order_id = p_order_id
      AND assignee_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_assigned_to_order(uuid) TO authenticated;

-- ============================================
-- ORDER ITEMS
-- ============================================

CREATE POLICY "Customers can insert order items for own orders" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can delete order items for own orders" ON order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "Assignees can update order items on assigned orders" ON order_items
  FOR UPDATE
  USING (public.user_assigned_to_order(order_id))
  WITH CHECK (public.user_assigned_to_order(order_id));

CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- ORDERS (customer checkout follow-up)
-- ============================================

CREATE POLICY "Customers can update own orders" ON orders
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can delete own pending orders" ON orders
  FOR DELETE
  USING (auth.uid() = customer_id AND status = 'pending');
