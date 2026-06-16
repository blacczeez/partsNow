import { config } from '@/lib/config';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { assignRunner } from '@/lib/services/dispatch';
import { notifyOrderCancelled } from '@/lib/services/notifications';
import { getRuntimeConfig } from '@/lib/services/runtime-config';
import { auditDetails, writeAuditLog } from '@/lib/services/audit-log';
import { createServiceClient } from '@/lib/supabase/service';

export interface RunnerAcceptTimeoutResult {
  processed: number;
  reassigned: number;
  failedReassign: number;
}

export interface PaymentHoldExpiryResult {
  cancelled: number;
}

interface StaleRunnerAssignment {
  id: string;
  order_id: string;
  assignee_id: string;
  orders: { status: string; cluster_id: string };
}

interface ExpiredPaymentHoldOrder {
  id: string;
  order_number: string;
  customer_id: string;
}

const PAYMENT_HOLD_CANCEL_REASON =
  'Payment was not completed within the allowed time.';

/**
 * Fail runner assignments that were never accepted within the configured window,
 * then auto-reassign when enabled.
 */
export async function processRunnerAcceptTimeouts(): Promise<RunnerAcceptTimeoutResult> {
  const runtime = await getRuntimeConfig();
  const acceptTimeoutMinutes = runtime.runner.acceptTimeoutMinutes;
  const autoReassign = config.runner.autoReassignEnabled;

  const cutoff = new Date(
    Date.now() - acceptTimeoutMinutes * 60 * 1000
  ).toISOString();

  const supabase = createServiceClient();
  const { data: staleRows, error } = await supabase
    .from('order_assignments')
    .select(
      `
      id,
      order_id,
      assignee_id,
      orders!inner (
        status,
        cluster_id
      )
    `
    )
    .eq('role', 'runner')
    .eq('status', 'assigned')
    .lt('assigned_at', cutoff);

  if (error) {
    throw new Error(`Failed to load stale runner assignments: ${error.message}`);
  }

  const staleAssignments = (staleRows ?? []) as StaleRunnerAssignment[];
  let reassigned = 0;
  let failedReassign = 0;

  for (const assignment of staleAssignments) {
    if (assignment.orders.status !== 'confirmed') continue;

    const { data: updated, error: updateError } = await supabase
      .from('order_assignments')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        rejection_reason: 'Accept timeout',
      })
      .eq('id', assignment.id)
      .eq('status', 'assigned')
      .select('id')
      .maybeSingle();

    if (updateError || !updated) continue;

    let didReassign = false;
    if (autoReassign && assignment.orders.cluster_id) {
      const nextAssignmentId = await assignRunner(
        assignment.order_id,
        assignment.orders.cluster_id,
        { excludeRunnerIds: [assignment.assignee_id] }
      );
      didReassign = nextAssignmentId !== null;
      if (didReassign) {
        reassigned++;
      } else {
        failedReassign++;
      }
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.ASSIGNMENT_REASSIGNED,
      entityType: 'order',
      entityId: assignment.order_id,
      oldValues: {
        assignmentId: assignment.id,
        runnerId: assignment.assignee_id,
      },
      newValues: auditDetails('Runner accept timeout', {
        acceptTimeoutMinutes,
        reassigned: didReassign,
        reason: 'Accept timeout',
      }),
    });
  }

  return {
    processed: staleAssignments.length,
    reassigned,
    failedReassign,
  };
}

/** Cancel unpaid card orders whose payment hold window has expired. */
export async function processExpiredPaymentHolds(): Promise<PaymentHoldExpiryResult> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: expiredRows, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_id')
    .eq('status', 'pending')
    .eq('payment_method', 'card')
    .eq('payment_status', 'pending')
    .not('payment_hold_expires_at', 'is', null)
    .lt('payment_hold_expires_at', now);

  if (error) {
    throw new Error(`Failed to load expired payment holds: ${error.message}`);
  }

  const expiredOrders = (expiredRows ?? []) as ExpiredPaymentHoldOrder[];
  let cancelled = 0;

  for (const order of expiredOrders) {
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        internal_notes: 'Auto-cancelled: payment hold expired',
      })
      .eq('id', order.id)
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .select('id')
      .maybeSingle();

    if (updateError || !updated) continue;

    cancelled++;

    await supabase
      .from('order_assignments')
      .update({
        status: 'failed',
        completed_at: now,
        rejection_reason: 'Order cancelled — payment hold expired',
      })
      .eq('order_id', order.id)
      .in('status', ['assigned', 'accepted', 'in_progress']);

    await writeAuditLog({
      userId: order.customer_id,
      action: AUDIT_ACTIONS.ORDER_CANCELLED,
      entityType: 'order',
      entityId: order.id,
      oldValues: { status: 'pending', paymentStatus: 'pending' },
      newValues: auditDetails(`Payment hold expired for ${order.order_number}`, {
        orderNumber: order.order_number,
        reason: PAYMENT_HOLD_CANCEL_REASON,
        automated: true,
      }),
    });

    notifyOrderCancelled(order.id, PAYMENT_HOLD_CANCEL_REASON).catch(() => {});
  }

  return { cancelled };
}

export async function runScheduledJobs(): Promise<{
  runnerAcceptTimeouts: RunnerAcceptTimeoutResult;
  paymentHoldExpiry: PaymentHoldExpiryResult;
}> {
  const [runnerAcceptTimeouts, paymentHoldExpiry] = await Promise.all([
    processRunnerAcceptTimeouts(),
    processExpiredPaymentHolds(),
  ]);

  return { runnerAcceptTimeouts, paymentHoldExpiry };
}
