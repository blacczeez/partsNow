-- system_config had RLS enabled (002) but no policies — admins could not read/write.

CREATE POLICY "Admins can view system config" ON system_config
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert system config" ON system_config
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update system config" ON system_config
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete system config" ON system_config
  FOR DELETE
  USING (public.is_admin());
