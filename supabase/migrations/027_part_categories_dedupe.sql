-- ============================================
-- Deduplicate part_categories after 025 backfill
--
-- Legacy parts.category stored display names ("Brakes") while seed rows
-- used slugs ("brakes"). Migration 025 created duplicate categories for
-- the same concept. This merges them and reassigns parts to the keeper.
-- ============================================

-- Reassign parts from duplicate categories to the canonical keeper row.
WITH keepers AS (
  SELECT DISTINCT ON (LOWER(slug))
    id AS keep_id,
    LOWER(slug) AS slug_key
  FROM part_categories
  ORDER BY
    LOWER(slug),
    sort_order ASC,
    CASE WHEN slug = LOWER(slug) THEN 0 ELSE 1 END,
    created_at ASC
),
dupes AS (
  SELECT
    pc.id AS remove_id,
    k.keep_id
  FROM part_categories pc
  JOIN keepers k ON LOWER(pc.slug) = k.slug_key
  WHERE pc.id <> k.keep_id
)
UPDATE parts p
SET category_id = d.keep_id
FROM dupes d
WHERE p.category_id = d.remove_id;

-- Remove duplicate category rows (safe to re-run when no dupes remain).
WITH keepers AS (
  SELECT DISTINCT ON (LOWER(slug))
    id AS keep_id,
    LOWER(slug) AS slug_key
  FROM part_categories
  ORDER BY
    LOWER(slug),
    sort_order ASC,
    CASE WHEN slug = LOWER(slug) THEN 0 ELSE 1 END,
    created_at ASC
),
dupes AS (
  SELECT
    pc.id AS remove_id,
    k.keep_id
  FROM part_categories pc
  JOIN keepers k ON LOWER(pc.slug) = k.slug_key
  WHERE pc.id <> k.keep_id
)
DELETE FROM part_categories pc
USING dupes d
WHERE pc.id = d.remove_id;

-- Normalize any remaining slugs to lowercase.
UPDATE part_categories
SET
  slug = LOWER(slug),
  updated_at = NOW()
WHERE slug <> LOWER(slug);
