-- Admins could not read runner_floats (only runners had SELECT) — admin UI showed ₦0.
-- Runners also need UPDATE to deduct float when completing orders.

CREATE POLICY "Admins can view all runner floats" ON runner_floats
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can manage runner floats" ON runner_floats
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Runners can update own float" ON runner_floats
  FOR UPDATE
  USING (auth.uid() = runner_id)
  WITH CHECK (auth.uid() = runner_id);
