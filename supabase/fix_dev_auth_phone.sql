-- ============================================
-- FIX: "Database error finding user" on dev phone login
-- ============================================
-- Run once in Supabase SQL Editor if you already ran an older seed_dev_users.sql.
--
-- Cause: auth.identities.provider_id for phone must be the user's UUID,
-- not the phone number. Missing empty-string token columns can also break GoTrue.
-- ============================================

DO $$
DECLARE
  dev_ids uuid[] := ARRAY[
    'd1000000-0000-0000-0000-000000000001'::uuid,
    'd1000000-0000-0000-0000-000000000002'::uuid,
    'd1000000-0000-0000-0000-000000000003'::uuid,
    'd1000000-0000-0000-0000-000000000004'::uuid
  ];
BEGIN
  -- confirmed_at is a generated column on hosted Supabase — do not set it
  UPDATE auth.users
  SET
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    confirmation_sent_at = COALESCE(confirmation_sent_at, phone_confirmed_at, NOW()),
    phone_confirmed_at = COALESCE(phone_confirmed_at, NOW())
  WHERE id = ANY (dev_ids);

  UPDATE auth.identities AS i
  SET
    provider_id = i.user_id::text,
    identity_data = jsonb_build_object(
      'sub', i.user_id::text,
      'phone', u.phone,
      'email_verified', false,
      'phone_verified', true
    )
  FROM auth.users AS u
  WHERE i.user_id = u.id
    AND i.provider = 'phone'
    AND i.user_id = ANY (dev_ids);
END $$;
