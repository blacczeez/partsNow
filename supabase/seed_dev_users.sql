-- ============================================
-- DEV TEST USERS (optional)
-- ============================================
-- Run in Supabase SQL Editor AFTER migrations 001–005 and seed.sql.
--
-- 1. Authentication → Phone → Test OTP, add (one line per phone):
--      2348010000001=123456
--      2348010000002=123456
--      2348010000003=123456
--      2348010000004=123456
--
-- 2. Log in at /login with the "App login" number below, OTP 123456
--
-- | Role     | App login   | Dashboard              |
-- |----------|-------------|------------------------|
-- | Customer | 08010000001 | /                      |
-- | Admin    | 08010000002 | /admin/dashboard       |
-- | Runner   | 08010000003 | /runner/dashboard      |
-- | Rider    | 08010000004 | /rider/dashboard       |
--
-- If you get "Database error finding user", run fix_dev_auth_phone.sql
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  dev_ids uuid[] := ARRAY[
    'd1000000-0000-0000-0000-000000000001'::uuid,
    'd1000000-0000-0000-0000-000000000002'::uuid,
    'd1000000-0000-0000-0000-000000000003'::uuid,
    'd1000000-0000-0000-0000-000000000004'::uuid
  ];
  dev_phones text[] := ARRAY[
    '2348010000001',
    '2348010000002',
    '2348010000003',
    '2348010000004'
  ];
  dev_names text[] := ARRAY[
    'Demo Customer',
    'Demo Admin',
    'Demo Runner',
    'Demo Rider'
  ];
  ladipo_cluster uuid := 'c1000000-0000-0000-0000-000000000001';
  dummy_pw text := crypt('dev-only-not-used', gen_salt('bf'));
  i int;
  uid uuid;
  ph text;
BEGIN
  -- Remove previous dev rows (idempotent)
  DELETE FROM runner_floats WHERE runner_id = ANY (dev_ids);
  DELETE FROM wallets WHERE user_id = ANY (dev_ids);
  DELETE FROM vehicles WHERE user_id = ANY (dev_ids);
  DELETE FROM public.users WHERE id = ANY (dev_ids);
  DELETE FROM auth.identities WHERE user_id = ANY (dev_ids);
  DELETE FROM auth.users WHERE id = ANY (dev_ids);

  -- Also remove duplicate auth rows for the same phones (failed OTP attempts)
  DELETE FROM auth.identities
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE phone = ANY (dev_phones)
      AND id <> ALL (dev_ids)
  );
  DELETE FROM auth.users
  WHERE phone = ANY (dev_phones)
    AND id <> ALL (dev_ids);

  FOR i IN 1..4 LOOP
    uid := dev_ids[i];
    ph := dev_phones[i];

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      phone,
      phone_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      NULL,
      dummy_pw,
      NULL,
      NULL,
      NOW(),
      ph,
      NOW(),
      NOW(),
      '{"provider":"phone","providers":["phone"]}'::jsonb,
      jsonb_build_object('full_name', dev_names[i]),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- For phone provider, provider_id MUST be auth.users.id (not the phone number)
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      uid,
      uid,
      uid::text,
      jsonb_build_object(
        'sub', uid::text,
        'phone', ph,
        'email_verified', false,
        'phone_verified', true
      ),
      'phone',
      NOW(),
      NOW(),
      NOW()
    );
  END LOOP;

  -- ---------- public profiles ----------
  INSERT INTO public.users (id, phone, email, full_name, user_type, cluster_id, profile) VALUES
    (
      dev_ids[1],
      '2348010000001',
      'customer@partsdey.test',
      'Demo Customer',
      'car_owner',
      NULL,
      '{"delivery_address":"12 Allen Avenue, Ikeja, Lagos"}'::jsonb
    ),
    (
      dev_ids[2],
      '2348010000002',
      'admin@partsdey.test',
      'Demo Admin',
      'admin',
      NULL,
      '{}'::jsonb
    ),
    (
      dev_ids[3],
      '2348010000003',
      'runner@partsdey.test',
      'Demo Runner',
      'runner',
      ladipo_cluster,
      '{"workshop_address":"Ladipo Market Gate"}'::jsonb
    ),
    (
      dev_ids[4],
      '2348010000004',
      'rider@partsdey.test',
      'Demo Rider',
      'rider',
      ladipo_cluster,
      '{}'::jsonb
    );

  INSERT INTO public.wallets (user_id, balance, held_balance, currency) VALUES
    (dev_ids[1], 100000, 0, 'NGN'),
    (dev_ids[2], 0, 0, 'NGN'),
    (dev_ids[3], 0, 0, 'NGN'),
    (dev_ids[4], 0, 0, 'NGN');

  INSERT INTO public.runner_floats (runner_id, balance, daily_limit) VALUES
    (dev_ids[3], 200000, 200000);

  INSERT INTO public.vehicles (user_id, make, model, year, spec, nickname, is_primary) VALUES
    (dev_ids[1], 'Toyota', 'Camry', 2018, 'Nigerian', 'Workshop Camry', true);
END $$;
