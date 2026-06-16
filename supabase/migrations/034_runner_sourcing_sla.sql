-- ============================================
-- Runner Sourcing SLA Timer
-- ============================================

-- Add SLA tracking columns to order_assignments
ALTER TABLE order_assignments
  ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_pause_accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT false;

-- Index for admin breach queries
CREATE INDEX IF NOT EXISTS idx_assignments_sla_breached
  ON order_assignments (assignee_id)
  WHERE role = 'runner' AND sla_breached = true;

-- Admin metrics function: SLA stats for a runner
CREATE OR REPLACE FUNCTION admin_runner_sla_stats(p_runner_id UUID)
RETURNS TABLE (
  total_completed BIGINT,
  total_breached BIGINT,
  breach_rate NUMERIC,
  avg_sourcing_seconds NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT AS total_completed,
    COUNT(*) FILTER (WHERE sla_breached)::BIGINT AS total_breached,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND(COUNT(*) FILTER (WHERE sla_breached)::NUMERIC / COUNT(*)::NUMERIC * 100, 1)
      ELSE 0
    END AS breach_rate,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND(
        AVG(
          EXTRACT(EPOCH FROM (completed_at - accepted_at)) - sla_pause_accumulated_seconds
        )::NUMERIC,
        0
      )
      ELSE 0
    END AS avg_sourcing_seconds
  FROM order_assignments
  WHERE assignee_id = p_runner_id
    AND role = 'runner'
    AND status = 'completed'
    AND accepted_at IS NOT NULL
    AND completed_at IS NOT NULL;
$$;
