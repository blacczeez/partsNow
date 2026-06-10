-- Target budget only: max_vendor_price equals expected (no platform-funded tolerance band).
UPDATE order_items
SET max_vendor_price = expected_vendor_price
WHERE max_vendor_price IS DISTINCT FROM expected_vendor_price
  AND expected_vendor_price IS NOT NULL;

-- Backfill expected/max from selling price where missing (15% markup, no tolerance).
UPDATE order_items
SET
  expected_vendor_price = ROUND(selling_price / 1.15),
  max_vendor_price = ROUND(selling_price / 1.15)
WHERE expected_vendor_price IS NULL
   OR max_vendor_price IS NULL;
