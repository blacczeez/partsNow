-- Admin full access on clusters (view inactive + create/update)
CREATE POLICY "Admins full access on clusters" ON clusters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.user_type = 'admin'
    )
  );
