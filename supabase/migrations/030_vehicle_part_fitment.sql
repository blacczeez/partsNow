-- Vehicle fitment helpers for catalogue search

CREATE OR REPLACE FUNCTION public.part_fits_vehicle(
  p_compatible jsonb,
  p_make text,
  p_model text,
  p_year integer,
  p_spec text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN p_compatible IS NULL OR jsonb_typeof(p_compatible) <> 'array' OR jsonb_array_length(p_compatible) = 0 THEN
        false
      ELSE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_compatible) AS elem
        WHERE lower(trim(elem->>'make')) = lower(trim(p_make))
          AND lower(trim(elem->>'model')) = lower(trim(p_model))
          AND p_year >= (elem->>'year_start')::integer
          AND p_year <= (elem->>'year_end')::integer
          AND (
            p_spec IS NULL OR trim(p_spec) = ''
            OR elem->>'spec' IS NULL OR trim(elem->>'spec') = ''
            OR lower(trim(elem->>'spec')) = lower(trim(p_spec))
          )
      )
    END;
$$;

CREATE OR REPLACE FUNCTION public.search_catalog_parts(
  p_q text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_make text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_year integer DEFAULT NULL,
  p_spec text DEFAULT NULL,
  p_for_vehicle boolean DEFAULT false,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  oem_code text,
  name text,
  category_id uuid,
  subcategory text,
  compatible_vehicles jsonb,
  average_price numeric,
  weight_kg numeric,
  image_url text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  category_slug text,
  category_name text,
  total_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT
      p.id,
      p.oem_code,
      p.name,
      p.category_id,
      p.subcategory,
      p.compatible_vehicles,
      p.average_price,
      p.weight_kg,
      p.image_url,
      p.is_active,
      p.created_at,
      p.updated_at,
      pc.slug AS category_slug,
      pc.name AS category_name
    FROM parts p
    INNER JOIN part_categories pc ON pc.id = p.category_id
    WHERE p.is_active = true
      AND pc.is_active = true
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (
        p_q IS NULL OR trim(p_q) = ''
        OR to_tsvector('english', p.name) @@ websearch_to_tsquery('english', p_q)
      )
      AND (
        NOT p_for_vehicle
        OR (
          p_make IS NOT NULL
          AND p_model IS NOT NULL
          AND p_year IS NOT NULL
          AND public.part_fits_vehicle(p.compatible_vehicles, p_make, p_model, p_year, p_spec)
        )
      )
  ),
  counted AS (
    SELECT count(*)::bigint AS cnt FROM base
  )
  SELECT
    b.id,
    b.oem_code,
    b.name,
    b.category_id,
    b.subcategory,
    b.compatible_vehicles,
    b.average_price,
    b.weight_kg,
    b.image_url,
    b.is_active,
    b.created_at,
    b.updated_at,
    b.category_slug,
    b.category_name,
    c.cnt AS total_count
  FROM base b
  CROSS JOIN counted c
  ORDER BY b.name ASC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.part_fits_vehicle(jsonb, text, text, integer, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.search_catalog_parts(text, uuid, text, text, integer, text, boolean, integer, integer) TO authenticated, anon;
