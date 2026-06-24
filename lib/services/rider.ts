import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import { canRiderConfirmPickup } from '@/lib/constants/order-status';
import { riderAssignmentReleaseAction } from '@/lib/utils/rider-assignments';
import { riderHistoryOutcome } from '@/lib/utils/rider-history';
import { runnerOrderAwaitingExternalResolution } from '@/lib/utils/runner-price-review';
import { assignRider, assignUnassignedDeliveriesInCluster } from './dispatch';
import { findStaffAssignment, findStaffAssignmentFull } from './order-assignments';
import {
  notifyOrderDispatched,
  notifyOrderDelivered,
  notifyOrderNearby,
} from './notifications';
import {
  reportDeliveryFailure as reportDeliveryFailureCore,
  type ReportDeliveryFailureInput,
} from './delivery-failure';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { notifyLoyaltyTierUpgradeIfNeeded } from '@/lib/services/loyalty';
import type { LoyaltyTier } from '@/lib/types/database';
import type {
  OrderWithItems,
  OrderAssignment,
  OrderItem,
  DeliveryTracking,
  DeliveryAttempt,
} from '@/lib/types/database';

// ===== Types =====

export interface RiderDeliverySummary {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_address: string;
  delivery_notes: string | null;
  payment_method: string;
  payment_status: string;
  created_at: string;
  item_count: number;
  assignment_status: string;
  assigned_at: string;
  customer_name: string;
  customer_phone: string;
  is_high_value: boolean;
  price_review_status: string;
  order_items: OrderItem[];
}

export interface RiderDeliveryDetail extends OrderWithItems {
  assignment: OrderAssignment;
  customer_name: string;
  customer_phone: string;
  is_high_value: boolean;
  tracking: DeliveryTracking | null;
  delivery_attempts: DeliveryAttempt[];
}

export interface RiderHistoryEntry {
  id: string;
  assignment_id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_address: string;
  payment_method: string;
  payment_status: string;
  assignment_status: string;
  assigned_at: string;
  pickup_confirmed_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  dispatched_at: string | null;
  actual_delivery_minutes: number | null;
  rejection_reason: string | null;
  customer_name: string;
  customer_phone: string;
  item_count: number;
  items_summary: string;
  attempt_count: number;
  last_failure_reason: string | null;
  is_high_value: boolean;
}

export interface RiderHistoryStats {
  total: number;
  delivered: number;
  declined: number;
  failed: number;
}

export interface RiderHistoryDetail extends RiderHistoryEntry {
  delivery_notes: string | null;
  delivery_attempts: DeliveryAttempt[];
}

const ACTIVE_RIDER_ASSIGNMENT_STATUSES = ['assigned', 'accepted', 'in_progress'] as const;

type ActiveRiderAssignmentRow = {
  id: string;
  order_id: string;
  orders:
    | { status: string; price_review_status: string | null }
    | { status: string; price_review_status: string | null }[];
};

function assignmentOrderMeta(
  row: ActiveRiderAssignmentRow
): { status: string; price_review_status: string | null } {
  return Array.isArray(row.orders) ? row.orders[0] : row.orders;
}

/** Close rider assignments tied to orders that have already finished or been cancelled. */
export async function cleanupStaleRiderAssignments(riderId: string): Promise<number> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('order_assignments')
    .select('id, order_id, orders!inner(status, price_review_status)')
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .in('status', [...ACTIVE_RIDER_ASSIGNMENT_STATUSES]);

  if (error) throw new Error(error.message);
  if (!rows?.length) return 0;

  let released = 0;
  const now = new Date().toISOString();

  for (const row of rows as ActiveRiderAssignmentRow[]) {
    const order = assignmentOrderMeta(row);
    const action = riderAssignmentReleaseAction(order.status, order.price_review_status);
    if (!action) continue;

    const update =
      action === 'complete'
        ? { status: 'completed' as const, completed_at: now }
        : {
            status: 'failed' as const,
            completed_at: now,
            rejection_reason:
              order.price_review_status === 'cancelled'
                ? 'Order cancelled after price review'
                : `Order ${order.status} — assignment auto-released`,
          };

    const { error: updateError } = await supabase
      .from('order_assignments')
      .update(update)
      .eq('id', row.id);

    if (!updateError) released++;
  }

  return released;
}

// ===== Orders =====

export async function getRiderOrders(riderId: string): Promise<RiderDeliverySummary[]> {
  const supabase = await createClient();

  await cleanupStaleRiderAssignments(riderId);

  const { data: rider } = await supabase
    .from('users')
    .select('cluster_id')
    .eq('id', riderId)
    .single();

  if (rider?.cluster_id) {
    await assignUnassignedDeliveriesInCluster(rider.cluster_id);
  }

  // Get active assignments for this rider
  const { data: assignments, error: assignError } = await supabase
    .from('order_assignments')
    .select('order_id, status, assigned_at')
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .in('status', [...ACTIVE_RIDER_ASSIGNMENT_STATUSES]);

  if (assignError || !assignments || assignments.length === 0) return [];

  const orderIds = assignments.map((a) => a.order_id);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, total, delivery_address, delivery_notes, payment_method, payment_status, created_at, customer_id, price_review_status, order_items(*)'
    )
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (ordersError || !orders) return [];

  // Get customer info for all orders
  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  const { data: customers } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .in('id', customerIds);

  const customerMap = new Map(customers?.map((c) => [c.id, c]) || []);

  const assignmentMap = new Map<string, (typeof assignments)[0]>();
  for (const assignment of assignments) {
    const existing = assignmentMap.get(assignment.order_id);
    if (
      !existing ||
      new Date(assignment.assigned_at).getTime() >
        new Date(existing.assigned_at).getTime()
    ) {
      assignmentMap.set(assignment.order_id, assignment);
    }
  }

  return orders.map((order) => {
    const assignment = assignmentMap.get(order.id)!;
    const customer = customerMap.get(order.customer_id);

    return {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total: order.total,
      delivery_address: order.delivery_address,
      delivery_notes: order.delivery_notes,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      created_at: order.created_at,
      item_count: order.order_items?.length ?? 0,
      assignment_status: assignment.status,
      assigned_at: assignment.assigned_at,
      customer_name: customer?.full_name ?? 'Unknown',
      customer_phone: customer?.phone ?? '',
      is_high_value: order.total >= config.dispatch.highValueThreshold,
      price_review_status: order.price_review_status ?? 'none',
      order_items: order.order_items ?? [],
    };
  }) as RiderDeliverySummary[];
}

export async function getRiderDeliveryDetail(
  riderId: string,
  orderId: string
): Promise<RiderDeliveryDetail> {
  const supabase = await createClient();

  await cleanupStaleRiderAssignments(riderId);

  const assignment = await findStaffAssignmentFull(supabase, riderId, orderId, 'rider', [
    'assigned',
    'accepted',
    'in_progress',
    'failed',
  ]);

  if (!assignment) {
    throw new Error('Delivery not assigned to you');
  }

  // Get order with items
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error('Order not found');
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('users')
    .select('full_name, phone')
    .eq('id', order.customer_id)
    .single();

  // Get tracking data
  const { data: tracking } = await supabase
    .from('delivery_tracking')
    .select('*')
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .maybeSingle();

  // Get delivery attempts (all riders on this order)
  const { data: attempts } = await supabase
    .from('delivery_attempts')
    .select('*')
    .eq('order_id', orderId)
    .order('attempt_number', { ascending: true });

  return {
    ...order,
    assignment,
    customer_name: customer?.full_name ?? 'Unknown',
    customer_phone: customer?.phone ?? '',
    is_high_value: order.total >= config.dispatch.highValueThreshold,
    tracking: (tracking as DeliveryTracking) ?? null,
    delivery_attempts: (attempts as DeliveryAttempt[]) ?? [],
  } as RiderDeliveryDetail;
}

// ===== Actions =====

export async function transferRiderDelivery(
  riderId: string,
  orderId: string,
  reason: string
): Promise<{ reassigned: boolean }> {
  const supabase = await createClient();

  const assignment = await findStaffAssignment(supabase, riderId, orderId, 'rider', [
    'assigned',
    'accepted',
    'in_progress',
  ]);

  if (!assignment) throw new Error('Delivery not assigned to you');
  if (assignment.status === 'in_progress') {
    throw new Error('Cannot transfer while delivery is in progress. Report an issue instead.');
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('status, price_review_status, cluster_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  const { error: failError } = await supabase
    .from('order_assignments')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', assignment.id);
  throwIfSupabaseError(failError, 'Failed to transfer delivery');

  let reassigned = false;
  if (order.cluster_id) {
    const assignmentId = await assignRider(orderId, order.cluster_id, {
      excludeRiderIds: [riderId],
    });
    reassigned = assignmentId !== null;
  }

  await writeAuditLog({
    userId: riderId,
    action: AUDIT_ACTIONS.RIDER_DELIVERY_DECLINED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Rider transferred delivery to another rider', {
      reason,
      reassigned,
      orderStatus: order.status,
    }),
  });

  return { reassigned };
}

export async function rejectRiderDelivery(
  riderId: string,
  orderId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findStaffAssignment(supabase, riderId, orderId, 'rider', [
    'assigned',
  ]);

  if (!assignment) throw new Error('Delivery not assigned to you');
  if (assignment.status !== 'assigned') {
    throw new Error('Can only decline before pickup is confirmed');
  }

  await transferRiderDelivery(riderId, orderId, reason);
}

/** Release or decline a delivery before pickup. */
export async function releaseRiderDelivery(
  riderId: string,
  orderId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findStaffAssignment(supabase, riderId, orderId, 'rider', [
    'assigned',
    'accepted',
    'in_progress',
  ]);

  if (!assignment) throw new Error('Delivery not assigned to you');

  if (assignment.status === 'in_progress') {
    throw new Error('Cannot release while delivery is in progress. Report an issue instead.');
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('status, price_review_status, cluster_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  const autoRelease = riderAssignmentReleaseAction(
    order.status,
    order.price_review_status
  );

  if (autoRelease) {
    const now = new Date().toISOString();
    const update =
      autoRelease === 'complete'
        ? { status: 'completed' as const, completed_at: now }
        : {
            status: 'failed' as const,
            completed_at: now,
            rejection_reason:
              order.price_review_status === 'cancelled'
                ? 'Order cancelled after price review'
                : `Order ${order.status}`,
          };

    const { error: releaseError } = await supabase
      .from('order_assignments')
      .update(update)
      .eq('id', assignment.id);
    throwIfSupabaseError(releaseError, 'Failed to release delivery');
    return;
  }

  if (runnerOrderAwaitingExternalResolution(order)) {
    await transferRiderDelivery(
      riderId,
      orderId,
      reason?.trim() || 'Rider released delivery while awaiting admin/customer'
    );
    return;
  }

  if (!reason?.trim()) {
    throw new Error('Reason is required to decline this delivery');
  }

  await transferRiderDelivery(riderId, orderId, reason.trim());
}

/** Release assigned (not in-transit) deliveries before logout. */
export async function releaseAssignedDeliveriesForLogout(
  riderId: string
): Promise<{ released: number; reassigned: number }> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('order_assignments')
    .select('order_id')
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .eq('status', 'assigned');

  if (error) throw new Error(error.message);
  if (!rows?.length) return { released: 0, reassigned: 0 };

  let released = 0;
  let reassigned = 0;

  for (const row of rows) {
    const result = await transferRiderDelivery(
      riderId,
      row.order_id,
      'Rider logged out — delivery reassigned'
    );
    released++;
    if (result.reassigned) reassigned++;
  }

  return { released, reassigned };
}

export async function confirmPickup(
  riderId: string,
  orderId: string,
  pickupPhotoUrl?: string
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findStaffAssignment(supabase, riderId, orderId, 'rider', [
    'assigned',
  ]);

  if (!assignment) throw new Error('Delivery not assigned to you');
  if (assignment.status !== 'assigned') throw new Error('Pickup already confirmed');

  // Get order to check high-value requirement and price review
  const { data: order } = await supabase
    .from('orders')
    .select('total, price_review_status, status')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');

  if (!canRiderConfirmPickup(order.status)) {
    throw new Error('Parts are not at the gate yet — pickup is not available');
  }

  if (order.price_review_status === 'pending') {
    throw new Error('Order has items pending admin price approval — pickup blocked');
  }

  if (order.price_review_status === 'awaiting_customer') {
    throw new Error('Customer has not accepted the updated price — pickup blocked');
  }

  const isHighValue = order.total >= config.dispatch.highValueThreshold;
  if (isHighValue && config.dispatch.highValueRequiresPhoto && !pickupPhotoUrl) {
    throw new Error('Photo confirmation required for high-value orders');
  }

  const { error: assignmentUpdateError } = await supabase
    .from('order_assignments')
    .update({
      status: 'in_progress',
      pickup_confirmed_at: new Date().toISOString(),
      pickup_photo_url: pickupPhotoUrl || null,
    })
    .eq('id', assignment.id);
  throwIfSupabaseError(assignmentUpdateError, 'Failed to update rider assignment');

  // Update order status to dispatched
  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  throwIfSupabaseError(orderUpdateError, 'Failed to update order to dispatched');

  // Create initial delivery tracking record
  const { error: trackingError } = await supabase
    .from('delivery_tracking')
    .upsert(
      {
        order_id: orderId,
        rider_id: riderId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    );

  if (trackingError) {
    console.error('Failed to create delivery tracking:', trackingError.message);
  }

  // Fire-and-forget notification
  notifyOrderDispatched(orderId).catch(() => {});

  await writeAuditLog({
    userId: riderId,
    action: AUDIT_ACTIONS.RIDER_PICKUP_CONFIRMED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Rider confirmed pickup — order dispatched', {
      pickupPhotoUrl: pickupPhotoUrl ?? null,
    }),
  });
}

export async function updateLocation(
  riderId: string,
  orderId: string,
  latitude: number,
  longitude: number,
  etaMinutes?: number
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findStaffAssignment(supabase, riderId, orderId, 'rider', [
    'in_progress',
  ]);

  if (!assignment) throw new Error('No active delivery for this order');

  // Upsert tracking record
  await supabase
    .from('delivery_tracking')
    .upsert(
      {
        order_id: orderId,
        rider_id: riderId,
        current_latitude: latitude,
        current_longitude: longitude,
        eta_minutes: etaMinutes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' }
    );

  // Notify customer when nearby
  if (etaMinutes !== undefined && etaMinutes <= 5 && etaMinutes > 0) {
    notifyOrderNearby(orderId, etaMinutes).catch(() => {});
  }
}

export async function confirmDelivery(
  riderId: string,
  orderId: string,
  data: { photoUrl?: string; codAmountCollected?: number }
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findStaffAssignment(supabase, riderId, orderId, 'rider', [
    'in_progress',
  ]);

  if (!assignment) throw new Error('No active delivery for this order');

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('total, payment_method, payment_status, customer_id, created_at')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');

  const { data: customerBefore } = await supabase
    .from('users')
    .select('loyalty_tier')
    .eq('id', order.customer_id)
    .single();
  const previousTier = (customerBefore?.loyalty_tier as LoyaltyTier) ?? 'new';

  // If COD, mark paid before delivery stats trigger runs
  if (order.payment_method === 'cod' && order.payment_status !== 'paid') {
    const { error: codError } = await supabase
      .from('orders')
      .update({ payment_status: 'paid' })
      .eq('id', orderId);
    throwIfSupabaseError(codError, 'Failed to update COD payment status');
  }

  const { count } = await supabase
    .from('delivery_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId);

  const { error: attemptError } = await supabase.from('delivery_attempts').insert({
    order_id: orderId,
    rider_id: riderId,
    attempt_number: (count ?? 0) + 1,
    status: 'completed',
    photo_url: data.photoUrl || null,
  });
  throwIfSupabaseError(attemptError, 'Failed to record delivery attempt');

  // Update assignment to completed
  const { error: assignmentCompleteError } = await supabase
    .from('order_assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', assignment.id);
  throwIfSupabaseError(assignmentCompleteError, 'Failed to complete rider assignment');

  // Calculate actual delivery minutes
  const createdAt = new Date(order.created_at);
  const now = new Date();
  const actualMinutes = Math.round((now.getTime() - createdAt.getTime()) / 60000);

  const { error: deliveredError } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      delivered_at: now.toISOString(),
      actual_delivery_minutes: actualMinutes,
    })
    .eq('id', orderId);
  throwIfSupabaseError(deliveredError, 'Failed to mark order as delivered');

  // Fire-and-forget notifications (stats + tier via DB trigger on delivered)
  notifyOrderDelivered(orderId).catch(() => {});
  notifyLoyaltyTierUpgradeIfNeeded(order.customer_id, previousTier).catch(() => {});

  await writeAuditLog({
    userId: riderId,
    action: AUDIT_ACTIONS.RIDER_DELIVERY_COMPLETED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Rider confirmed delivery — order delivered', {
      paymentMethod: order.payment_method,
      codAmountCollected: data.codAmountCollected ?? null,
      actualDeliveryMinutes: actualMinutes,
    }),
  });
}

export async function reportDeliveryFailure(
  riderId: string,
  orderId: string,
  data: ReportDeliveryFailureInput
): Promise<{ outcome: 'retry' | 'admin_review' | 'terminal' }> {
  return reportDeliveryFailureCore(riderId, orderId, data);
}

// ===== History =====

function summarizeOrderItems(
  items: Array<{ description: string; quantity: number }> | null | undefined
): { count: number; summary: string } {
  if (!items?.length) return { count: 0, summary: 'No items' };
  const count = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const summary = items
    .slice(0, 2)
    .map((item) => `${item.quantity}× ${item.description}`)
    .join(', ');
  const suffix = items.length > 2 ? ` +${items.length - 2} more` : '';
  return { count, summary: summary + suffix };
}

export async function getRiderHistoryStats(
  riderId: string
): Promise<RiderHistoryStats> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('order_assignments')
    .select('status, rejection_reason, orders!inner(status)')
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .in('status', ['completed', 'failed']);

  const stats: RiderHistoryStats = {
    total: rows?.length ?? 0,
    delivered: 0,
    declined: 0,
    failed: 0,
  };

  for (const row of rows ?? []) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const outcome = riderHistoryOutcome({
      assignment_status: row.status,
      status: order?.status ?? '',
      rejection_reason: row.rejection_reason,
    });

    if (outcome.label === 'Delivered') stats.delivered++;
    else if (outcome.label === 'Declined' || outcome.label === 'Transferred' || outcome.label === 'Released') {
      stats.declined++;
    } else stats.failed++;
  }

  return stats;
}

export async function getRiderHistory(
  riderId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ deliveries: RiderHistoryEntry[]; total: number }> {
  const supabase = await createClient();

  const { data: assignments, count, error } = await supabase
    .from('order_assignments')
    .select(
      'id, order_id, status, assigned_at, pickup_confirmed_at, completed_at, rejection_reason',
      { count: 'exact' }
    )
    .eq('assignee_id', riderId)
    .eq('role', 'rider')
    .in('status', ['completed', 'failed'])
    .order('completed_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error || !assignments || assignments.length === 0) {
    return { deliveries: [], total: count ?? 0 };
  }

  const orderIds = assignments.map((a) => a.order_id);

  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, total, delivery_address, delivery_notes, payment_method, payment_status, delivered_at, dispatched_at, created_at, actual_delivery_minutes, customer_id, order_items(description, quantity)'
    )
    .in('id', orderIds);

  if (!orders) return { deliveries: [], total: count ?? 0 };

  const customerIds = [...new Set(orders.map((o) => o.customer_id))];
  const { data: customers } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .in('id', customerIds);

  const { data: attempts } = await supabase
    .from('delivery_attempts')
    .select('order_id, status, failure_reason, attempt_number')
    .in('order_id', orderIds)
    .eq('rider_id', riderId)
    .order('attempt_number', { ascending: false });

  const customerMap = new Map(customers?.map((c) => [c.id, c]) ?? []);
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const assignmentMap = new Map(assignments.map((a) => [a.order_id, a]));

  const attemptsByOrder = new Map<string, typeof attempts>();
  for (const attempt of attempts ?? []) {
    const list = attemptsByOrder.get(attempt.order_id) ?? [];
    list.push(attempt);
    attemptsByOrder.set(attempt.order_id, list);
  }

  const deliveries = orderIds
    .map((orderId) => {
      const order = orderMap.get(orderId);
      const assignment = assignmentMap.get(orderId);
      if (!order || !assignment) return null;

      const orderAttempts = attemptsByOrder.get(orderId) ?? [];
      const failedAttempt = orderAttempts.find((a) => a.status !== 'completed');
      const { count: item_count, summary: items_summary } = summarizeOrderItems(
        order.order_items as Array<{ description: string; quantity: number }> | undefined
      );

      return {
        id: order.id,
        assignment_id: assignment.id,
        order_number: order.order_number,
        status: order.status,
        total: order.total,
        delivery_address: order.delivery_address,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        assignment_status: assignment.status,
        assigned_at: assignment.assigned_at,
        pickup_confirmed_at: assignment.pickup_confirmed_at,
        completed_at: assignment.completed_at,
        delivered_at: order.delivered_at,
        dispatched_at: order.dispatched_at,
        actual_delivery_minutes: order.actual_delivery_minutes,
        rejection_reason: assignment.rejection_reason,
        customer_name: customerMap.get(order.customer_id)?.full_name ?? 'Unknown',
        customer_phone: customerMap.get(order.customer_id)?.phone ?? '',
        item_count,
        items_summary,
        attempt_count: orderAttempts.length,
        last_failure_reason: failedAttempt?.failure_reason ?? null,
        is_high_value: order.total >= config.dispatch.highValueThreshold,
      };
    })
    .filter(Boolean) as RiderHistoryEntry[];

  return { deliveries, total: count ?? 0 };
}

export async function getRiderHistoryDetail(
  riderId: string,
  orderId: string
): Promise<RiderHistoryDetail> {
  const supabase = await createClient();

  const { data: assignment, error: assignError } = await supabase
    .from('order_assignments')
    .select(
      'id, order_id, status, assigned_at, pickup_confirmed_at, completed_at, rejection_reason'
    )
    .eq('assignee_id', riderId)
    .eq('order_id', orderId)
    .eq('role', 'rider')
    .in('status', ['completed', 'failed'])
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignError || !assignment) {
    throw new Error('Delivery history not found');
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      '*, order_items(description, quantity)'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  const { data: customer } = await supabase
    .from('users')
    .select('full_name, phone')
    .eq('id', order.customer_id)
    .single();

  const { data: attempts } = await supabase
    .from('delivery_attempts')
    .select('*')
    .eq('order_id', orderId)
    .eq('rider_id', riderId)
    .order('attempt_number', { ascending: true });

  const failedAttempt = (attempts ?? []).find((a) => a.status !== 'completed');
  const { count: item_count, summary: items_summary } = summarizeOrderItems(
    order.order_items as Array<{ description: string; quantity: number }> | undefined
  );

  return {
    id: order.id,
    assignment_id: assignment.id,
    order_number: order.order_number,
    status: order.status,
    total: order.total,
    delivery_address: order.delivery_address,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    assignment_status: assignment.status,
    assigned_at: assignment.assigned_at,
    pickup_confirmed_at: assignment.pickup_confirmed_at,
    completed_at: assignment.completed_at,
    delivered_at: order.delivered_at,
    dispatched_at: order.dispatched_at,
    actual_delivery_minutes: order.actual_delivery_minutes,
    rejection_reason: assignment.rejection_reason,
    customer_name: customer?.full_name ?? 'Unknown',
    customer_phone: customer?.phone ?? '',
    delivery_notes: order.delivery_notes,
    item_count,
    items_summary,
    attempt_count: attempts?.length ?? 0,
    last_failure_reason: failedAttempt?.failure_reason ?? null,
    is_high_value: order.total >= config.dispatch.highValueThreshold,
    delivery_attempts: (attempts ?? []) as DeliveryAttempt[],
  };
}
