import { createServiceClient } from '@/lib/supabase/service';
import { isSlaPaused } from '@/lib/utils/sla-timer';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

/**
 * Pause the SLA timer for the active runner assignment on an order.
 * Idempotent — no-op if already paused.
 */
export async function pauseSlaTimer(orderId: string): Promise<void> {
  const db = createServiceClient();

  const { data: assignment } = await db
    .from('order_assignments')
    .select('id, sla_paused_at')
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment || assignment.sla_paused_at) return;

  await db
    .from('order_assignments')
    .update({ sla_paused_at: new Date().toISOString() })
    .eq('id', assignment.id);
}

/**
 * Resume the SLA timer for the active runner assignment on an order.
 * Accumulates elapsed pause time. Idempotent — no-op if not paused.
 */
export async function resumeSlaTimer(orderId: string): Promise<void> {
  const db = createServiceClient();

  const { data: assignment } = await db
    .from('order_assignments')
    .select('id, sla_paused_at, sla_pause_accumulated_seconds')
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment || !assignment.sla_paused_at) return;

  const pausedAtMs = new Date(assignment.sla_paused_at).getTime();
  const elapsedPauseSeconds = Math.round((Date.now() - pausedAtMs) / 1000);

  await db
    .from('order_assignments')
    .update({
      sla_paused_at: null,
      sla_pause_accumulated_seconds:
        (assignment.sla_pause_accumulated_seconds ?? 0) + elapsedPauseSeconds,
    })
    .eq('id', assignment.id);
}

/**
 * Sync the SLA pause state based on current order status fields.
 * Call after any change to price_review_status or clarification_status.
 */
export async function syncSlaPauseState(
  orderId: string,
  priceReviewStatus: string | null,
  clarificationStatus: string | null
): Promise<void> {
  const shouldPause = isSlaPaused({
    price_review_status: priceReviewStatus,
    clarification_status: clarificationStatus,
  });

  if (shouldPause) {
    await pauseSlaTimer(orderId);
  } else {
    await resumeSlaTimer(orderId);
  }
}

/**
 * Mark an assignment as SLA-breached and write an audit log entry.
 */
export async function markSlaBreached(
  assignmentId: string,
  orderId: string,
  runnerId: string
): Promise<void> {
  const db = createServiceClient();

  await db
    .from('order_assignments')
    .update({ sla_breached: true })
    .eq('id', assignmentId);

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_SLA_BREACHED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner sourcing SLA breached', {
      assignmentId,
      runnerId,
    }),
  });
}
