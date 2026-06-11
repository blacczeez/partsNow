-- ============================================
-- Deduplicate part_categories after 025 backfill
--
-- Legacy parts.category stored display names ("Brakes") while seed rows
-- used slugs ("brakes"). Migration 025 created duplicate categories for
-- the same concept. This merges them and reassigns parts to the keeper.
-- ============================================

BEGIN;

-- One keeper per lowercase slug: prefer seeded order, then proper lowercase slug.
CREATE TEMP TABLE _category_keepers ON COMMIT DROP AS
SELECT DISTINCT ON (LOWER(slug))
  id AS keep_id,
  LOWER(slug) AS slug_key
FROM part_categories
ORDER BY
  LOWER(slug),
  sort_order ASC,
  CASE WHEN slug = LOWER(slug) THEN 0 ELSE 1 END,
  created_at ASC;

CREATE TEMP TABLE _category_dupes ON COMMIT DROP AS
SELECT
  pc.id AS remove_id,
  k.keep_id
FROM part_categories pc
JOIN _category_keepers k ON LOWER(pc.slug) = k.slug_key
WHERE pc.id <> k.keep_id;

-- Point all parts at the canonical category row.
UPDATE parts p
SET category_id = d.keep_id
FROM _category_dupes d
WHERE p.category_id = d.remove_id;

-- Remove duplicate category rows (parts FK is satisfied above).
DELETE FROM part_categories pc
USING _category_dupes d
WHERE pc.id = d.remove_id;

-- Normalize any remaining slugs to lowercase.
UPDATE part_categories
SET
  slug = LOWER(slug),
  updated_at = NOW()
WHERE slug <> LOWER(slug);

COMMIT;
