-- debit_wallet / credit_wallet ran as INVOKER: RLS blocked UPDATE wallets + INSERT wallet_transactions.
-- UI showed balance (SELECT ok) but payment failed with misleading "Insufficient wallet balance".

CREATE OR REPLACE FUNCTION debit_wallet(
  p_wallet_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- Only the wallet owner can debit (customer paying for an order)
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
    wallet_id, type, amount, balance_before, balance_after, reference, description
  )
  VALUES (
    p_wallet_id,
    'debit',
    p_amount,
    v_current_balance,
    v_current_balance - p_amount,
    p_reference,
    p_description
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION credit_wallet(
  p_wallet_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- Wallet owner (top-up, cancel refund to self) or admin (refunds)
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
    wallet_id, type, amount, balance_before, balance_after, reference, description
  )
  VALUES (
    p_wallet_id,
    'credit',
    p_amount,
    v_current_balance,
    v_current_balance + p_amount,
    p_reference,
    p_description
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION debit_wallet(UUID, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION credit_wallet(UUID, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION debit_wallet(UUID, DECIMAL, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION credit_wallet(UUID, DECIMAL, TEXT, TEXT) TO service_role;
