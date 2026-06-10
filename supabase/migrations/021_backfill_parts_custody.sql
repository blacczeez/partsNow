-- Backfill parts_custody for terminal delivery failures created before custody tracking

UPDATE public.orders
SET parts_custody = 'with_rider'
WHERE status IN ('failed', 'rejected')
  AND parts_custody IS NULL
  AND (
    settlement_status IS NOT NULL
    OR delivery_resolution = 'return_pending'
    OR picked_at IS NOT NULL
  );
