import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import {
  handleVendorPriceEntry,
  assertNoPendingPriceReview,
  type PriceEscalationResult,
} from './price-review';
import { calculateDistance } from './orders';
import { assignRunner, assignRider, assignUnassignedOrdersInCluster } from './dispatch';
import {
  notifyOrderSourcing,
  notifyOrderPicked,
  notifyClarificationRequest,
} from './notifications';
import { recordVendorPartPrice } from './vendor-parts';
import type {
  RunnerFloat,
  RunnerShift,
  OrderWithItems,
  OrderAssignment,
  OrderItem,
} from '@/lib/types/database';

// ===== Float =====

export async function getRunnerFloat(runnerId: string): Promise<RunnerFloat | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('runner_floats')
    .select('*')
    .eq('runner_id', runnerId)
    .single();

  if (error || !data) return null;
  return data as RunnerFloat;
}

// ===== Shift =====

export async function getActiveShift(runnerId: string): Promise<RunnerShift | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('runner_shifts')
    .select('*')
    .eq('runner_id', runnerId)
    .is('ended_at', null)
    .single();

  if (error || !data) return null;
  return data as RunnerShift;
}

export async function startShift(
  runnerId: string,
  latitude: number,
  longitude: number
): Promise<RunnerShift> {
  const supabase = await createClient();

  // Check no active shift
  const existing = await getActiveShift(runnerId);
  if (existing) {
    throw new Error('You already have an active shift');
  }

  // Check float balance
  const float = await getRunnerFloat(runnerId);
  if (!float || float.balance < config.runner.minFloatToClockIn) {
    throw new Error(
      `Insufficient float. Minimum ₦${config.runner.minFloatToClockIn.toLocaleString()} required to start shift`
    );
  }

  // Get runner's cluster and validate GPS proximity
  const { data: runner } = await supabase
    .from('users')
    .select('cluster_id')
    .eq('id', runnerId)
    .single();

  if (!runner?.cluster_id) {
    throw new Error('Runner is not assigned to a cluster');
  }

  const { data: cluster } = await supabase
    .from('clusters')
    .select('latitude, longitude')
    .eq('id', runner.cluster_id)
    .single();

  if (cluster && !config.runner.skipClockInGeoCheck) {
    const distanceKm = calculateDistance(
      latitude,
      longitude,
      cluster.latitude,
      cluster.longitude
    );
    const distanceMeters = distanceKm * 1000;
    const maxMeters = config.runner.clockInRadiusMeters;

    if (distanceMeters > maxMeters) {
      throw new Error(
        `You must be within ${maxMeters}m of the market to start your shift`
      );
    }
  }

  // Create shift
  const { data: shift, error } = await supabase
    .from('runner_shifts')
    .insert({
      runner_id: runnerId,
      cluster_id: runner.cluster_id,
      starting_float: float.balance,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  try {
    await assignUnassignedOrdersInCluster(runner.cluster_id);
  } catch {
    // Backlog assignment should not block shift start
  }

  return shift as RunnerShift;
}

export async function endShift(
  runnerId: string,
  notes?: string
): Promise<RunnerShift> {
  const supabase = await createClient();

  const shift = await getActiveShift(runnerId);
  if (!shift) {
    throw new Error('No active shift found');
  }

  // Check for active assignments
  const { data: activeAssignments } = await supabase
    .from('order_assignments')
    .select('id')
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  if (activeAssignments && activeAssignments.length > 0) {
    throw new Error('You have active orders. Complete or reject them before ending your shift');
  }

  // Get current float
  const float = await getRunnerFloat(runnerId);

  const { data: updated, error } = await supabase
    .from('runner_shifts')
    .update({
      ended_at: new Date().toISOString(),
      ending_float: float?.balance ?? 0,
      discrepancy_notes: notes || null,
    })
    .eq('id', shift.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated as RunnerShift;
}

// ===== Orders =====

export interface RunnerOrderSummary {
  id: string;
  order_number: string;
  status: string;
  total: number;
  delivery_address: string;
  created_at: string;
  item_count: number;
  assignment_status: string;
  assigned_at: string;
  price_review_status: string;
  price_topup_amount: number;
  original_total: number | null;
  revised_total: number | null;
  order_items: OrderItem[];
}

export async function getRunnerOrders(runnerId: string): Promise<RunnerOrderSummary[]> {
  const supabase = await createClient();

  // Get active assignments for this runner
  const { data: assignments, error: assignError } = await supabase
    .from('order_assignments')
    .select('order_id, status, assigned_at')
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  if (assignError || !assignments || assignments.length === 0) return [];

  const orderIds = assignments.map((a) => a.order_id);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, total, delivery_address, created_at, price_review_status, price_topup_amount, original_total, revised_total, order_items(*)'
    )
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (ordersError || !orders) return [];

  // Merge assignment data
  const assignmentMap = new Map(assignments.map((a) => [a.order_id, a]));

  return orders.map((order) => {
    const assignment = assignmentMap.get(order.id)!;
    return {
      ...order,
      item_count: order.order_items?.length ?? 0,
      assignment_status: assignment.status,
      assigned_at: assignment.assigned_at,
    };
  }) as RunnerOrderSummary[];
}

export interface RunnerOrderDetail extends OrderWithItems {
  assignment: OrderAssignment;
  customer_name: string;
  customer_phone: string;
}

export async function getRunnerOrderDetail(
  runnerId: string,
  orderId: string
): Promise<RunnerOrderDetail> {
  const supabase = await createClient();

  // Include failed assignments so runner can see cancellation after price decline
  const { data: assignment, error: assignError } = await supabase
    .from('order_assignments')
    .select('*')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress', 'failed'])
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignError || !assignment) {
    throw new Error('Order not assigned to you');
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

  return {
    ...order,
    assignment: assignment as OrderAssignment,
    customer_name: customer?.full_name ?? 'Unknown',
    customer_phone: customer?.phone ?? '',
  } as RunnerOrderDetail;
}

// ===== Order Actions =====

export async function acceptOrder(runnerId: string, orderId: string): Promise<void> {
  const supabase = await createClient();

  // Get assignment
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .single();

  if (!assignment) throw new Error('Order not assigned to you');
  if (assignment.status !== 'assigned') throw new Error('Order already accepted or completed');

  // Check concurrent order limit
  const { count } = await supabase
    .from('order_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress']);

  if ((count ?? 0) >= config.runner.maxConcurrentOrders) {
    throw new Error(`You can only handle ${config.runner.maxConcurrentOrders} orders at a time`);
  }

  // Check float
  const float = await getRunnerFloat(runnerId);
  if (!float || float.balance < config.runner.minFloatToClockIn) {
    throw new Error('Insufficient float to accept order');
  }

  const { error: acceptAssignmentError } = await supabase
    .from('order_assignments')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', assignment.id);
  throwIfSupabaseError(acceptAssignmentError, 'Failed to accept assignment');

  const { error: sourcingError } = await supabase
    .from('orders')
    .update({
      status: 'sourcing',
      sourcing_started_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  throwIfSupabaseError(sourcingError, 'Failed to update order to sourcing');

  // Fire-and-forget notification
  notifyOrderSourcing(orderId).catch(() => {});
}

export async function rejectOrder(
  runnerId: string,
  orderId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .single();

  if (!assignment) throw new Error('Order not assigned to you');
  if (assignment.status !== 'assigned') throw new Error('Can only reject pending assignments');

  // Mark assignment as failed
  await supabase
    .from('order_assignments')
    .update({
      status: 'failed',
      rejection_reason: reason,
    })
    .eq('id', assignment.id);

  // Attempt auto-reassign
  if (config.runner.autoReassignEnabled) {
    const { data: order } = await supabase
      .from('orders')
      .select('cluster_id')
      .eq('id', orderId)
      .single();

    if (order) {
      await assignRunner(orderId, order.cluster_id);
    }
  }
}

export async function markItemFound(
  runnerId: string,
  orderId: string,
  itemId: string,
  data: { vendorId?: string; vendorPrice: number; qcImageUrl: string }
): Promise<PriceEscalationResult> {
  const supabase = await createClient();

  // Verify assignment
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('status')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress'])
    .single();

  if (!assignment) throw new Error('Order not assigned to you or not in progress');

  // Get item to check vendor price against target budget
  const { data: item } = await supabase
    .from('order_items')
    .select('selling_price, description, part_id')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();

  if (!item) throw new Error('Item not found');

  if (data.vendorPrice > item.selling_price) {
    throw new Error(
      `Vendor price cannot exceed ${item.selling_price} (customer part price per unit)`
    );
  }

  const { error: updateItemError } = await supabase
    .from('order_items')
    .update({
      vendor_id: data.vendorId || null,
      vendor_price: data.vendorPrice,
      qc_image_url: data.qcImageUrl,
      is_found: true,
      is_unavailable: false,
    })
    .eq('id', itemId);
  throwIfSupabaseError(updateItemError, 'Failed to mark item as found');

  // Fire-and-forget: record vendor-part price for catalogue feedback
  if (data.vendorId && item.part_id) {
    recordVendorPartPrice(data.vendorId, item.part_id, data.vendorPrice)
      .catch(err => console.error('Price feedback failed:', err));
  }

  const escalation = await handleVendorPriceEntry(supabase, {
    orderId,
    itemId,
    sellingPrice: item.selling_price,
    vendorPrice: data.vendorPrice,
    vendorId: data.vendorId,
    description: item.description,
  });

  if (assignment.status === 'accepted') {
    const { error: progressError } = await supabase
      .from('order_assignments')
      .update({ status: 'in_progress' })
      .eq('assignee_id', runnerId)
      .eq('order_id', orderId)
      .eq('role', 'runner');
    throwIfSupabaseError(progressError, 'Failed to update assignment progress');
  }

  return escalation;
}

export async function markItemUnavailable(
  runnerId: string,
  orderId: string,
  itemId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  // Verify assignment
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('status')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress'])
    .single();

  if (!assignment) throw new Error('Order not assigned to you or not in progress');

  await supabase
    .from('order_items')
    .update({
      is_unavailable: true,
      is_found: false,
      unavailable_reason: reason,
    })
    .eq('id', itemId)
    .eq('order_id', orderId);

  // Update assignment to in_progress if accepted
  if (assignment.status === 'accepted') {
    await supabase
      .from('order_assignments')
      .update({ status: 'in_progress' })
      .eq('assignee_id', runnerId)
      .eq('order_id', orderId)
      .eq('role', 'runner');
  }
}

export async function requestClarification(
  runnerId: string,
  orderId: string,
  message: string
): Promise<void> {
  const supabase = await createClient();

  // Verify assignment
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('status')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress'])
    .single();

  if (!assignment) throw new Error('Order not assigned to you or not in progress');

  // Get current thread
  const { data: order } = await supabase
    .from('orders')
    .select('clarification_thread, clarification_status')
    .eq('id', orderId)
    .single();

  if (!order) throw new Error('Order not found');

  const thread = Array.isArray(order.clarification_thread)
    ? order.clarification_thread
    : [];

  thread.push({
    from: 'runner',
    message,
    timestamp: new Date().toISOString(),
  });

  await supabase
    .from('orders')
    .update({
      clarification_thread: thread,
      clarification_status: 'requested',
    })
    .eq('id', orderId);

  // Fire-and-forget notification
  notifyClarificationRequest(orderId, message).catch(() => {});
}

export async function completeOrder(runnerId: string, orderId: string): Promise<void> {
  const supabase = await createClient();

  // Verify assignment
  const { data: assignment } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress'])
    .single();

  if (!assignment) throw new Error('Order not assigned to you or not in progress');

  // Check all items are resolved (found or unavailable)
  const { data: items } = await supabase
    .from('order_items')
    .select('id, is_found, is_unavailable, vendor_price')
    .eq('order_id', orderId);

  if (!items || items.length === 0) throw new Error('No items in order');

  const unresolvedItems = items.filter((i) => !i.is_found && !i.is_unavailable);
  if (unresolvedItems.length > 0) {
    throw new Error(`${unresolvedItems.length} item(s) still need to be resolved`);
  }

  await assertNoPendingPriceReview(
    supabase,
    orderId,
    'Cannot complete order'
  );

  // Calculate total vendor cost for found items
  const totalVendorCost = items
    .filter((i) => i.is_found && i.vendor_price)
    .reduce((sum, i) => sum + (i.vendor_price ?? 0), 0);

  // Deduct float
  if (totalVendorCost > 0) {
    const { data: currentFloat } = await supabase
      .from('runner_floats')
      .select('balance')
      .eq('runner_id', runnerId)
      .single();

    if (!currentFloat) throw new Error('Runner float not found');

    const newBalance = currentFloat.balance - totalVendorCost;
    if (newBalance < 0) throw new Error('Insufficient float to complete order');

    await supabase
      .from('runner_floats')
      .update({ balance: newBalance })
      .eq('runner_id', runnerId);
  }

  // Update assignment
  await supabase
    .from('order_assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', assignment.id);

  const { error: pickedError } = await supabase
    .from('orders')
    .update({
      status: 'picked',
      picked_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  throwIfSupabaseError(pickedError, 'Failed to update order to picked');

  // Fire-and-forget notification
  notifyOrderPicked(orderId).catch(() => {});

  // Auto-assign rider for delivery
  const { data: orderData } = await supabase
    .from('orders')
    .select('cluster_id')
    .eq('id', orderId)
    .single();

  if (orderData) {
    try {
      await assignRider(orderId, orderData.cluster_id);
    } catch {
      // Non-blocking: rider assignment failure doesn't fail the runner's completion
    }
  }

  // Update shift stats
  const shift = await getActiveShift(runnerId);
  if (shift) {
    await supabase
      .from('runner_shifts')
      .update({
        orders_completed: shift.orders_completed + 1,
        total_sourced: shift.total_sourced + totalVendorCost,
        commission_earned: shift.commission_earned + config.runner.commissionPerOrder,
      })
      .eq('id', shift.id);
  }
}
