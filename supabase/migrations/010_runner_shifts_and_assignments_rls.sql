-- Admin could not see active shifts (runner_shifts had runner-only SELECT).
-- order_assignments had RLS enabled but no policies — assignments failed silently.

CREATE POLICY "Admins can view all runner shifts" ON runner_shifts
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage all assignments" ON order_assignments
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Assignees can view own assignments" ON order_assignments
  FOR SELECT
  USING (auth.uid() = assignee_id);

CREATE POLICY "Assignees can update own assignments" ON order_assignments
  FOR UPDATE
  USING (auth.uid() = assignee_id)
  WITH CHECK (auth.uid() = assignee_id);
