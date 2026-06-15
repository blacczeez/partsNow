-- Admin-configurable Trusted / Partner markup discount points

INSERT INTO system_config (key, value, description)
VALUES
  (
    'loyalty_trusted_discount_percentage',
    '5'::jsonb,
    'Percentage points off default markup for Trusted tier'
  ),
  (
    'loyalty_partner_discount_percentage',
    '8'::jsonb,
    'Percentage points off default markup for Partner tier'
  )
ON CONFLICT (key) DO NOTHING;
