-- ============================================
-- Part categories (admin-managed)
-- ============================================

CREATE TABLE part_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_part_categories_active ON part_categories(is_active);
CREATE INDEX idx_part_categories_sort ON part_categories(sort_order, name);

-- Seed legacy hardcoded categories
INSERT INTO part_categories (slug, name, sort_order) VALUES
  ('brakes', 'Brakes', 1),
  ('engine', 'Engine', 2),
  ('battery', 'Battery', 3),
  ('suspension', 'Suspension', 4),
  ('electrical', 'Electrical', 5),
  ('body', 'Body', 6),
  ('transmission', 'Transmission', 7),
  ('cooling', 'Cooling', 8),
  ('exhaust', 'Exhaust', 9),
  ('interior', 'Interior', 10);

ALTER TABLE parts ADD COLUMN category_id UUID REFERENCES part_categories(id);

-- Backfill from existing text category slugs
UPDATE parts p
SET category_id = c.id
FROM part_categories c
WHERE p.category IS NOT NULL AND c.slug = p.category;

-- Create categories for any legacy slug not in seed list
INSERT INTO part_categories (slug, name, sort_order)
SELECT DISTINCT
  p.category,
  INITCAP(REPLACE(p.category, '-', ' ')),
  100
FROM parts p
WHERE p.category IS NOT NULL
  AND p.category_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM part_categories c WHERE c.slug = p.category);

UPDATE parts p
SET category_id = c.id
FROM part_categories c
WHERE p.category_id IS NULL AND p.category IS NOT NULL AND c.slug = p.category;

-- Fallback for parts with no category
INSERT INTO part_categories (slug, name, sort_order)
VALUES ('uncategorized', 'Uncategorized', 9999)
ON CONFLICT (slug) DO NOTHING;

UPDATE parts
SET category_id = (SELECT id FROM part_categories WHERE slug = 'uncategorized')
WHERE category_id IS NULL;

ALTER TABLE parts ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE parts DROP COLUMN category;

DROP INDEX IF EXISTS idx_parts_category;
CREATE INDEX idx_parts_category_id ON parts(category_id);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE part_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on part_categories" ON part_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Authenticated users can read active part_categories" ON part_categories
  FOR SELECT USING (is_active = true);
