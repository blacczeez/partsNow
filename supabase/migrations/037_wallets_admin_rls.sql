-- Admins could not read customer wallets (only owners had SELECT) — admin Customers UI showed ₦0.

CREATE POLICY "Admins can view all wallets" ON wallets
  FOR SELECT
  USING (public.is_admin());
