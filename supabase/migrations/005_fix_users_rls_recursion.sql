-- Fix infinite recursion: admin policies must not SELECT from users under RLS.
-- Use SECURITY DEFINER helpers so role checks bypass RLS on users.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND user_type = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_runner_cluster_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cluster_id
  FROM public.users
  WHERE id = auth.uid()
    AND user_type = 'runner';
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_runner_cluster_id() TO authenticated;

-- ============================================
-- USERS: allow signup + fix admin policies
-- ============================================

DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE
  USING (public.is_admin());

-- ============================================
-- WALLETS: allow wallet creation on profile setup
-- ============================================

CREATE POLICY "Users can insert own wallet" ON wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Replace other policies that subquery users
-- ============================================

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage vendors" ON vendors;
CREATE POLICY "Admins can manage vendors" ON vendors
  FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Runners can view vendors in their cluster" ON vendors;
CREATE POLICY "Runners can view vendors in their cluster" ON vendors
  FOR SELECT
  USING (
    public.auth_runner_cluster_id() IS NOT NULL
    AND public.auth_runner_cluster_id() = vendors.cluster_id
  );

DROP POLICY IF EXISTS "Admins can view audit log" ON audit_log;
CREATE POLICY "Admins can view audit log" ON audit_log
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all conversations" ON whatsapp_conversations;
CREATE POLICY "Admins can view all conversations" ON whatsapp_conversations
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view voice notes" ON voice_note_queue;
CREATE POLICY "Admins can view voice notes" ON voice_note_queue
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update voice notes" ON voice_note_queue;
CREATE POLICY "Admins can update voice notes" ON voice_note_queue
  FOR UPDATE
  USING (public.is_admin());
