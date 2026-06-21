import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { config } from '@/lib/config';
import { assignRunner } from '@/lib/services/dispatch';
import { refundOrderPartial } from '@/lib/services/order-refund';
import {
  notifyAdminSourcingEscalation,
  notifySourcingDifficulty,
} from '@/lib/services/notifications';
import { recalculateOrderTotalsExcludingUnavailable } from '@/lib/utils/order-repricing';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import {
  RUNNER_UNAVAILABLE_REJECTION_PREFIX,
  isRunnerUnavailableRejection,
} from '@/lib/constants/runner-unavailable';
import {
  markOrderSourcingEscalated,
} from '@/lib/utils/sourcing-escalation';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

export interface MarkItemUnavailableResult {
  reassigned: boolean;
  unavailableRunnerCount: number;
  allItemsUnavailable: boolean;
  partialRefundAmount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export async function countRunnersWhoMarkedUnavailable(
  supabase: SupabaseClient,
  orderId: string
): Promise<number> {
  const { data: rows } = await supabase
    .from('order_assignments')
    .select('assignee_id, rejection_reason')
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .eq('status', 'failed');

  const runnerIds = new Set<string>();
  for (const row of rows ?? []) {
    if (isRunnerUnavailableRejection(row.rejection_reason)) {
      runnerIds.add(row.assignee_id);
    }
  }
  return runnerIds.size;
}

async function repriceOrderAfterUnavailableMark(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ previousTotal: number; newTotal: number; partialRefundAmount: number }> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'order_number, subtotal, markup_amount, delivery_fee, discount_amount, total, revised_total, payment_status, payment_method'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('quantity, selling_price, is_unavailable')
    .eq('order_id', orderId);

  throwIfSupabaseError(itemsError, 'Failed to load order items');

  const repriced = recalculateOrderTotalsExcludingUnavailable(items ?? [], {
    deliveryFee: order.delivery_fee,
    discountAmount: order.discount_amount,
  });

  const previousTotal = order.revised_total ?? order.total;
  const newTotal = repriced.total;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      subtotal: repriced.subtotal,
      markup_amount: repriced.markupAmount,
      total: repriced.total,
      revised_total: repriced.total,
    })
    .eq('id', orderId);

  throwIfSupabaseError(updateError, 'Failed to update order totals');

  let partialRefundAmount = 0;
  if (
    order.payment_status === 'paid' &&
    previousTotal > newTotal
  ) {
    partialRefundAmount = previousTotal - newTotal;
    await refundOrderPartial(
      orderId,
      partialRefundAmount,
      `Partial refund — unavailable part removed from order ${order.order_number}`
    );
  }

  return { previousTotal, newTotal, partialRefundAmount };
}

export async function handleRunnerItemUnavailable(params: {
  runnerId: string;
  orderId: string;
  itemId: string;
  reason: string;
  itemDescription: string;
}): Promise<MarkItemUnavailableResult> {
  const supabase = await createClient();
  const { runnerId, orderId, itemId, reason, itemDescription } = params;

  const { data: item, error: itemError } = await supabase
    .from('order_items')
    .select('id, description, is_found, is_unavailable')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();

  if (itemError || !item) throw new Error('Item not found');
  if (item.is_found) throw new Error('Cannot mark a sourced item as unavailable');
  if (item.is_unavailable) throw new Error('Item is already marked unavailable');

  const { error: updateItemError } = await supabase
    .from('order_items')
    .update({
      is_unavailable: true,
      is_found: false,
      unavailable_reason: reason.trim(),
      vendor_price: null,
      qc_image_url: null,
    })
    .eq('id', itemId)
    .eq('order_id', orderId);

  throwIfSupabaseError(updateItemError, 'Failed to mark item as unavailable');

  const { data: allItems } = await supabase
    .from('order_items')
    .select('is_unavailable')
    .eq('order_id', orderId);

  const allItemsUnavailable =
    (allItems?.length ?? 0) > 0 &&
    (allItems ?? []).every((row) => row.is_unavailable);

  const { partialRefundAmount } = await repriceOrderAfterUnavailableMark(supabase, orderId);

  const { data: order } = await supabase
    .from('orders')
    .select('cluster_id, order_number')
    .eq('id', orderId)
    .single();

  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('order_id', orderId)
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress'])
    .maybeSingle();

  const rejectionReason = `${RUNNER_UNAVAILABLE_REJECTION_PREFIX}:${itemId}:${reason.trim()}`;

  if (assignment) {
    const { error: failError } = await supabase
      .from('order_assignments')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq('id', assignment.id);

    throwIfSupabaseError(failError, 'Failed to release runner assignment');
  }

  const unavailableRunnerCount = await countRunnersWhoMarkedUnavailable(supabase, orderId);

  let reassigned = false;
  if (
    !allItemsUnavailable &&
    order?.cluster_id &&
    config.runner.autoReassignEnabled
  ) {
    const assignmentId = await assignRunner(orderId, order.cluster_id, {
      excludeRunnerIds: [runnerId],
    });
    reassigned = assignmentId !== null;
  }

  notifySourcingDifficulty(orderId, itemDescription, reason.trim(), {
    reassigned,
    allItemsUnavailable,
  }).catch(() => {});

  if (!reassigned && !allItemsUnavailable) {
    const escalationReason = 'No runner on shift to continue sourcing';
    await markOrderSourcingEscalated(supabase, orderId, escalationReason);
    notifyAdminSourcingEscalation(
      orderId,
      escalationReason,
      `Item marked unavailable: ${itemDescription}. Reason: ${reason.trim()}`
    ).catch(() => {});
  }

  if (unavailableRunnerCount >= 2 || allItemsUnavailable) {
    const adminReason = allItemsUnavailable
      ? 'All order items marked unavailable — manual intervention required'
      : `${unavailableRunnerCount} runners could not source this order — manual intervention required`;

    await markOrderSourcingEscalated(supabase, orderId, adminReason);
    notifyAdminSourcingEscalation(
      orderId,
      adminReason,
      `Latest item: ${itemDescription}. Reason: ${reason.trim()}`
    ).catch(() => {});
  }

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_ITEM_UNAVAILABLE,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner marked order item unavailable', {
      itemId,
      reason: reason.trim(),
      reassigned,
      unavailableRunnerCount,
      allItemsUnavailable,
      partialRefundAmount,
    }),
  });

  return {
    reassigned,
    unavailableRunnerCount,
    allItemsUnavailable,
    partialRefundAmount,
  };
}

/** Service-role helper for tests. */
export async function countRunnersWhoMarkedUnavailableForOrder(
  orderId: string
): Promise<number> {
  const supabase = createServiceClient();
  return countRunnersWhoMarkedUnavailable(supabase, orderId);
}
