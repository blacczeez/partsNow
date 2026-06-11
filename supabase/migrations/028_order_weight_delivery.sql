-- ============================================
-- Weight-based delivery (order snapshots + config)
-- ============================================

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(6, 2);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight_kg DECIMAL(8, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_tier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_vehicle_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_breakdown JSONB;

-- Default Lagos weight tiers (admin-editable via system_config)
INSERT INTO system_config (key, value, description)
VALUES (
  'delivery_weight_tiers',
  '[
    {"id":"light","label":"Light","min_kg":0,"max_kg":5,"delivery_fee":1500,"vehicle_type":"bike","express_allowed":true,"promise_minutes":45,"sort_order":1,"is_active":true},
    {"id":"medium","label":"Medium","min_kg":5,"max_kg":15,"delivery_fee":2500,"vehicle_type":"car","express_allowed":true,"promise_minutes":45,"sort_order":2,"is_active":true},
    {"id":"heavy","label":"Heavy","min_kg":15,"max_kg":40,"delivery_fee":4000,"vehicle_type":"car","express_allowed":false,"promise_minutes":120,"sort_order":3,"is_active":true},
    {"id":"oversized","label":"Oversized","min_kg":40,"max_kg":null,"delivery_fee":6000,"vehicle_type":"van","express_allowed":false,"promise_minutes":120,"sort_order":4,"is_active":true}
  ]'::jsonb,
  'Weight-based delivery tiers for Lagos'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_config (key, value, description)
VALUES (
  'free_delivery_eligible_tiers',
  '["light","medium"]'::jsonb,
  'Delivery tiers eligible for free delivery when subtotal threshold is met'
)
ON CONFLICT (key) DO NOTHING;
