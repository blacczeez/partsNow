-- ============================================
-- vendor_parts junction table
-- ============================================

CREATE TABLE vendor_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  part_id UUID NOT NULL REFERENCES parts(id),
  last_price DECIMAL(12,2) NOT NULL,
  price_count INTEGER NOT NULL DEFAULT 1,
  average_price DECIMAL(12,2) NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vendor_id, part_id)
);

CREATE INDEX idx_vendor_parts_vendor ON vendor_parts(vendor_id);
CREATE INDEX idx_vendor_parts_part ON vendor_parts(part_id);

-- ============================================
-- RLS for vendor_parts
-- ============================================

ALTER TABLE vendor_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on vendor_parts" ON vendor_parts
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin'));

CREATE POLICY "Runners can read vendor_parts" ON vendor_parts
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'runner'));

-- ============================================
-- Admin RLS for parts table
-- ============================================

CREATE POLICY "Admins full access on parts" ON parts
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin'));

CREATE POLICY "Authenticated users can read active parts" ON parts
  FOR SELECT USING (is_active = true);
