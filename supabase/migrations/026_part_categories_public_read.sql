-- Public read for catalog (anonymous + logged-in customers browsing parts)
DROP POLICY IF EXISTS "Authenticated users can read active part_categories" ON part_categories;

CREATE POLICY "Anyone can view active part_categories" ON part_categories
  FOR SELECT USING (is_active = true);
