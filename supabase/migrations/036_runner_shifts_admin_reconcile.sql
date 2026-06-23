-- Admins could view runner_shifts but not update is_reconciled (reconcile button no-op).

CREATE POLICY "Admins can update runner shifts" ON runner_shifts
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
