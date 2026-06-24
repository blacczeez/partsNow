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
import {
  VENDOR_INCIDENT_SOURCES,
  VENDOR_INCIDENT_STATUSES,
  VENDOR_INCIDENT_TYPES,
} from '@/lib/constants/vendor-incidents';
import type { PaymentStatus } from '@/lib/types/database';

export interface MarkItemUnavailableResult {
  reassigned: boolean;
  unavailableRunnerCount: number;
  allItemsUnavailable: boolean;
  partialRefundAmount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface OrderItemForUnavailableReprice {
  id: string;
  quantity: number;
  selling_price: number;
  is_unavailable: boolean;
}

interface OrderForUnavailableReprice {
  order_number: string;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  revised_total: number | null;
  payment_status: PaymentStatus;
}

export function computePartialRefundForUnavailableMark(
  previousTotal: number,
  newTotal: number,
  paymentStatus: PaymentStatus
): number {
  const isPrepaid =
    paymentStatus === 'paid' || paymentStatus === 'partially_refunded';
  if (!isPrepaid || newTotal >= previousTotal) return 0;
  return previousTotal - newTotal;
}

export function itemsAfterUnavailableMark(
  items: OrderItemForUnavailableReprice[],
  itemId: string
): Array<{ quantity: number; selling_price: number; is_unavailable: boolean }> {
  return items.map((row) => ({
    quantity: row.quantity,
    selling_price: row.selling_price,
    is_unavailable: row.id === itemId ? true : row.is_unavailable,
  }));
}

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

async function refundUnavailableMark(
  orderId: string,
  order: OrderForUnavailableReprice,
  previousTotal: number,
  partialRefundAmount: number,
  actorId: string
): Promise<void> {
  if (partialRefundAmount <= 0) return;

  await refundOrderPartial(
    orderId,
    partialRefundAmount,
    `Partial refund — unavailable part removed from order ${order.order_number}`,
    actorId,
    { maxRefundAmount: previousTotal }
  );
}

async function persistUnavailableRepricing(
  supabase: SupabaseClient,
  orderId: string,
  order: OrderForUnavailableReprice,
  repriced: ReturnType<typeof recalculateOrderTotalsExcludingUnavailable>,
  partialRefundAmount: number
): Promise<void> {
  const paymentStatus: PaymentStatus =
    partialRefundAmount > 0 &&
    (order.payment_status === 'paid' || order.payment_status === 'partially_refunded')
      ? 'partially_refunded'
      : order.payment_status;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      subtotal: repriced.subtotal,
      markup_amount: repriced.markupAmount,
      total: repriced.total,
      revised_total: repriced.total,
      payment_status: paymentStatus,
    })
    .eq('id', orderId);

  throwIfSupabaseError(updateError, 'Failed to update order totals');
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
    .select('id, description, is_found, is_unavailable, vendor_id')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();

  if (itemError || !item) throw new Error('Item not found');
  if (item.is_found) throw new Error('Cannot mark a sourced item as unavailable');
  if (item.is_unavailable) throw new Error('Item is already marked unavailable');

  const [{ data: order, error: orderError }, { data: allItems, error: itemsError }] =
    await Promise.all([
      supabase
        .from('orders')
        .select(
          'order_number, delivery_fee, discount_amount, total, revised_total, payment_status, cluster_id'
        )
        .eq('id', orderId)
        .single(),
      supabase
        .from('order_items')
        .select('id, quantity, selling_price, is_unavailable')
        .eq('order_id', orderId),
    ]);

  if (orderError || !order) throw new Error('Order not found');
  throwIfSupabaseError(itemsError, 'Failed to load order items');

  const itemRows = (allItems ?? []) as OrderItemForUnavailableReprice[];
  const repricedItems = itemsAfterUnavailableMark(itemRows, itemId);
  const repriced = recalculateOrderTotalsExcludingUnavailable(repricedItems, {
    deliveryFee: order.delivery_fee,
    discountAmount: order.discount_amount,
  });

  const previousTotal = order.revised_total ?? order.total;
  const newTotal = repriced.total;
  const partialRefundAmount = computePartialRefundForUnavailableMark(
    previousTotal,
    newTotal,
    order.payment_status
  );

  const allItemsUnavailable =
    repricedItems.length > 0 && repricedItems.every((row) => row.is_unavailable);

  await refundUnavailableMark(
    orderId,
    order,
    previousTotal,
    partialRefundAmount,
    runnerId
  );

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

  if (item.vendor_id) {
    const db = createServiceClient();
    const { error: oosError } = await db.from('vendor_incidents').insert({
      vendor_id: item.vendor_id,
      order_id: orderId,
      order_item_id: itemId,
      type: VENDOR_INCIDENT_TYPES.OUT_OF_STOCK,
      status: VENDOR_INCIDENT_STATUSES.CONFIRMED,
      source: VENDOR_INCIDENT_SOURCES.RUNNER,
      reported_by: runnerId,
      description: `Runner marked unavailable: ${itemDescription}. Reason: ${reason.trim()}`,
    });
    throwIfSupabaseError(oosError, 'Failed to record out-of-stock incident');

    const { recalculateVendorReliability } = await import('@/lib/services/vendor-reliability');
    recalculateVendorReliability(item.vendor_id).catch(() => {});
  }

  await persistUnavailableRepricing(supabase, orderId, order, repriced, partialRefundAmount);

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
    order.cluster_id &&
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
