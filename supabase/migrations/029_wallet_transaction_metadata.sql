-- Wallet transaction metadata on ledger writes + backfill kind for filtering

CREATE OR REPLACE FUNCTION debit_wallet(
  p_wallet_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM wallets WHERE id = p_wallet_id AND user_id = auth.uid()
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;

  INSERT INTO wallet_transactions (
    wallet_id, type, amount, balance_before, balance_after, reference, description, metadata
  )
  VALUES (
    p_wallet_id,
    'debit',
    p_amount,
    v_current_balance,
    v_current_balance - p_amount,
    p_reference,
    p_description,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION credit_wallet(
  p_wallet_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  IF auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM wallets WHERE id = p_wallet_id AND user_id = auth.uid()
    )
    AND NOT public.is_admin()
  THEN
    RETURN FALSE;
  END IF;

  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;

  INSERT INTO wallet_transactions (
    wallet_id, type, amount, balance_before, balance_after, reference, description, metadata
  )
  VALUES (
    p_wallet_id,
    'credit',
    p_amount,
    v_current_balance,
    v_current_balance + p_amount,
    p_reference,
    p_description,
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION debit_wallet(UUID, DECIMAL, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION credit_wallet(UUID, DECIMAL, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION debit_wallet(UUID, DECIMAL, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION credit_wallet(UUID, DECIMAL, TEXT, TEXT, JSONB) TO service_role;

-- Backfill kind for existing rows (enables server-side filtering)
UPDATE wallet_transactions
SET metadata = metadata || jsonb_build_object('kind', 'topup')
WHERE COALESCE(metadata->>'kind', '') = ''
  AND type = 'credit'
  AND (
    reference LIKE 'topup_%'
    OR description ILIKE '%top-up%'
    OR description ILIKE '%topup%'
  );

UPDATE wallet_transactions
SET metadata = metadata || jsonb_build_object('kind', 'order_payment')
WHERE COALESCE(metadata->>'kind', '') = ''
  AND type = 'debit'
  AND (
    description ILIKE 'Order ORD-%'
    OR reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

UPDATE wallet_transactions
SET metadata = metadata || jsonb_build_object('kind', 'refund')
WHERE COALESCE(metadata->>'kind', '') = ''
  AND type = 'credit'
  AND description ILIKE '%refund%';

CREATE INDEX IF NOT EXISTS idx_wallet_tx_metadata_kind
  ON wallet_transactions ((metadata->>'kind'));

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_created
  ON wallet_transactions (wallet_id, created_at DESC);
