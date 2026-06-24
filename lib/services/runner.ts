import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { getRuntimeConfig } from '@/lib/services/runtime-config';
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
import {
  incrementVendorOrderCount,
  resolveVendorForSourcing,
} from './runner-vendors';
import { shiftDurationMinutes } from '@/lib/utils/shift';
import { computeShiftDiscrepancy } from '@/lib/utils/shift-reconciliation';
import { runnerAssignmentReleaseAction } from '@/lib/utils/runner-assignments';
import { runnerOrderAwaitingExternalResolution } from '@/lib/utils/runner-price-review';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
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

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_SHIFT_STARTED,
    entityType: 'user',
    entityId: runnerId,
    newValues: auditDetails('Runner clocked in', {
      shiftId: shift.id,
      startingFloat: float.balance,
      clusterId: runner.cluster_id,
    }),
  });

  return shift as RunnerShift;
}

export async function endShift(
  runnerId: string,
  notes?: string
): Promise<{
  shift: RunnerShift;
  transferSummary: { transferred: number; reassigned: number; orphaned: number };
}> {
  const supabase = await createClient();

  const shift = await getActiveShift(runnerId);
  if (!shift) {
    throw new Error('No active shift found');
  }

  await cleanupStaleRunnerAssignments(runnerId);

  const transferSummary = await transferAwaitingOrdersOnShiftEnd(runnerId);

  // Check for active assignments
  const { data: activeAssignments } = await supabase
    .from('order_assignments')
    .select('id')
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  if (activeAssignments && activeAssignments.length > 0) {
    throw new Error(
      'You still have orders that need sourcing or handoff. Complete them or release them before ending your shift.'
    );
  }

  // Get current float
  const float = await getRunnerFloat(runnerId);
  const endingFloat = float?.balance ?? 0;
  const discrepancyAmount = computeShiftDiscrepancy({
    startingFloat: Number(shift.starting_float),
    totalSourced: Number(shift.total_sourced),
    endingFloat,
  });
  const autoReconcile = discrepancyAmount === 0;

  const { data: updated, error } = await supabase
    .from('runner_shifts')
    .update({
      ended_at: new Date().toISOString(),
      ending_float: endingFloat,
      discrepancy_amount: discrepancyAmount,
      discrepancy_notes: notes || null,
      ...(autoReconcile
        ? {
            is_reconciled: true,
            reconciled_at: new Date().toISOString(),
          }
        : {}),
    })
    .eq('id', shift.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_SHIFT_ENDED,
    entityType: 'user',
    entityId: runnerId,
    newValues: auditDetails('Runner clocked out', {
      shiftId: shift.id,
      endingFloat,
      discrepancyAmount,
      autoReconciled: autoReconcile,
      notes: notes ?? null,
      ordersTransferred: transferSummary.transferred,
      ordersOrphaned: transferSummary.orphaned,
    }),
  });

  return { shift: updated as RunnerShift, transferSummary };
}

export interface RunnerShiftListItem {
  id: string;
  started_at: string;
  ended_at: string | null;
  orders_completed: number;
  total_sourced: number;
  commission_earned: number;
  starting_float: number;
  ending_float: number | null;
  is_reconciled: boolean;
  discrepancy_amount: number;
  cluster_name: string;
  is_active: boolean;
  duration_minutes: number;
}

export interface RunnerShiftOrderActivity {
  order_id: string;
  order_number: string;
  order_status: string;
  assignment_status: string;
  assigned_at: string;
  completed_at: string | null;
  rejection_reason: string | null;
  total_sourced: number;
}

export interface RunnerShiftDetail extends RunnerShiftListItem {
  discrepancy_notes: string | null;
  /** Live wallet balance while shift is active; null after clock-out. */
  current_float: number | null;
  float_spent: number | null;
  orders_per_hour: number | null;
  avg_sourced_per_order: number | null;
  assignments_total: number;
  assignments_completed: number;
  assignments_rejected: number;
  assignments_in_progress: number;
  orders: RunnerShiftOrderActivity[];
}

export async function getRunnerShiftHistory(
  runnerId: string,
  options?: { page?: number; limit?: number }
): Promise<{ shifts: RunnerShiftListItem[]; total: number }> {
  const supabase = await createClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('runner_shifts')
    .select('*, clusters:cluster_id(name)', { count: 'exact' })
    .eq('runner_id', runnerId)
    .order('started_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const shifts: RunnerShiftListItem[] = (data ?? []).map((row) => {
    const cluster = row.clusters as { name: string } | null;
    return {
      id: row.id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      orders_completed: row.orders_completed,
      total_sourced: Number(row.total_sourced),
      commission_earned: Number(row.commission_earned),
      starting_float: Number(row.starting_float),
      ending_float: row.ending_float != null ? Number(row.ending_float) : null,
      is_reconciled: row.is_reconciled,
      discrepancy_amount: Number(row.discrepancy_amount ?? 0),
      cluster_name: cluster?.name ?? 'Unknown market',
      is_active: row.ended_at == null,
      duration_minutes: shiftDurationMinutes(row.started_at, row.ended_at),
    };
  });

  return { shifts, total: count ?? shifts.length };
}

export async function getRunnerShiftDetail(
  runnerId: string,
  shiftId: string
): Promise<RunnerShiftDetail | null> {
  const supabase = await createClient();

  const { data: shift, error } = await supabase
    .from('runner_shifts')
    .select('*, clusters:cluster_id(name)')
    .eq('id', shiftId)
    .eq('runner_id', runnerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!shift) return null;

  const windowEnd = shift.ended_at ?? new Date().toISOString();

  const { data: assignments } = await supabase
    .from('order_assignments')
    .select(
      `
      order_id,
      status,
      assigned_at,
      completed_at,
      rejection_reason,
      orders:order_id (
        order_number,
        status,
        order_items (vendor_price, is_found)
      )
    `
    )
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .gte('assigned_at', shift.started_at)
    .lte('assigned_at', windowEnd)
    .order('assigned_at', { ascending: false });

  const orders: RunnerShiftOrderActivity[] = (assignments ?? []).map((row) => {
    const order = row.orders as unknown as {
      order_number: string;
      status: string;
      order_items: Array<{ vendor_price: number | null; is_found: boolean }>;
    } | null;
    const items = order?.order_items ?? [];
    const totalSourced = items
      .filter((item) => item.is_found && item.vendor_price != null)
      .reduce((sum, item) => sum + Number(item.vendor_price), 0);

    return {
      order_id: row.order_id,
      order_number: order?.order_number ?? '—',
      order_status: order?.status ?? 'unknown',
      assignment_status: row.status,
      assigned_at: row.assigned_at,
      completed_at: row.completed_at,
      rejection_reason: row.rejection_reason,
      total_sourced: totalSourced,
    };
  });

  const assignmentsCompleted = orders.filter((o) => o.assignment_status === 'completed').length;
  const assignmentsRejected = orders.filter((o) => o.assignment_status === 'failed').length;
  const assignmentsInProgress = orders.filter((o) =>
    ['assigned', 'accepted', 'in_progress'].includes(o.assignment_status)
  ).length;

  const durationMinutes = shiftDurationMinutes(shift.started_at, shift.ended_at);
  const ordersCompleted = shift.orders_completed;
  const totalSourced = Number(shift.total_sourced);
  const startingFloat = Number(shift.starting_float);
  const endingFloat =
    shift.ending_float != null ? Number(shift.ending_float) : null;
  const cluster = shift.clusters as { name: string } | null;
  const isActive = shift.ended_at == null;

  let currentFloat: number | null = null;
  if (isActive) {
    const float = await getRunnerFloat(runnerId);
    currentFloat = float?.balance ?? null;
  }

  const floatSpent =
    endingFloat != null
      ? Math.max(0, startingFloat - endingFloat)
      : currentFloat != null
        ? Math.max(0, startingFloat - currentFloat)
        : null;

  return {
    id: shift.id,
    started_at: shift.started_at,
    ended_at: shift.ended_at,
    orders_completed: ordersCompleted,
    total_sourced: totalSourced,
    commission_earned: Number(shift.commission_earned),
    starting_float: startingFloat,
    ending_float: endingFloat,
    is_reconciled: shift.is_reconciled,
    discrepancy_amount: Number(shift.discrepancy_amount ?? 0),
    discrepancy_notes: shift.discrepancy_notes,
    cluster_name: cluster?.name ?? 'Unknown market',
    is_active: isActive,
    duration_minutes: durationMinutes,
    current_float: currentFloat,
    float_spent: floatSpent,
    orders_per_hour:
      durationMinutes > 0 && ordersCompleted > 0
        ? Math.round((ordersCompleted / durationMinutes) * 60 * 10) / 10
        : null,
    avg_sourced_per_order:
      ordersCompleted > 0 ? Math.round(totalSourced / ordersCompleted) : null,
    assignments_total: orders.length,
    assignments_completed: assignmentsCompleted,
    assignments_rejected: assignmentsRejected,
    assignments_in_progress: assignmentsInProgress,
    orders,
  };
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
  accepted_at: string | null;
  price_review_status: string;
  price_topup_amount: number;
  original_total: number | null;
  revised_total: number | null;
  clarification_status: string | null;
  sla_deadline_at: string | null;
  sla_paused_at: string | null;
  sla_pause_accumulated_seconds: number;
  sla_breached: boolean;
  order_items: OrderItem[];
}

export async function getRunnerOrders(runnerId: string): Promise<RunnerOrderSummary[]> {
  const supabase = await createClient();

  await cleanupStaleRunnerAssignments(runnerId);

  // Get active assignments for this runner
  const { data: assignments, error: assignError } = await supabase
    .from('order_assignments')
    .select('order_id, status, assigned_at, accepted_at, sla_deadline_at, sla_paused_at, sla_pause_accumulated_seconds, sla_breached')
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  if (assignError || !assignments || assignments.length === 0) return [];

  const orderIds = assignments.map((a) => a.order_id);

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, total, delivery_address, created_at, price_review_status, price_topup_amount, original_total, revised_total, clarification_status, order_items(*)'
    )
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (ordersError || !orders) return [];

  // Merge assignment data — use latest active assignment per order
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
    return {
      ...order,
      item_count: order.order_items?.length ?? 0,
      assignment_status: assignment.status,
      assigned_at: assignment.assigned_at,
      accepted_at: assignment.accepted_at ?? null,
      sla_deadline_at: assignment.sla_deadline_at ?? null,
      sla_paused_at: assignment.sla_paused_at ?? null,
      sla_pause_accumulated_seconds: assignment.sla_pause_accumulated_seconds ?? 0,
      sla_breached: assignment.sla_breached ?? false,
    };
  }) as RunnerOrderSummary[];
}

export interface RunnerOrderDetail extends OrderWithItems {
  assignment: OrderAssignment;
  customer_name: string;
  customer_phone: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    spec: string | null;
    nickname: string | null;
  } | null;
}

export async function getRunnerOrderDetail(
  runnerId: string,
  orderId: string
): Promise<RunnerOrderDetail> {
  const supabase = await createClient();

  await cleanupStaleRunnerAssignments(runnerId);

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

  let vehicle = null;
  if (order.vehicle_id) {
    const { data: vehicleRow } = await supabase
      .from('vehicles')
      .select('id, make, model, year, spec, nickname')
      .eq('id', order.vehicle_id)
      .maybeSingle();
    vehicle = vehicleRow;
  }

  const items = (order.order_items ?? []) as OrderItem[];
  const vendorIds = [
    ...new Set(
      items.map((i) => i.vendor_id).filter((id): id is string => id != null)
    ),
  ];

  let vendorNameMap: Record<string, string> = {};
  if (vendorIds.length > 0) {
    const { data: vendorRows } = await supabase
      .from('vendors')
      .select('id, name')
      .in('id', vendorIds);
    vendorNameMap = Object.fromEntries(
      (vendorRows ?? []).map((v) => [v.id, v.name])
    );
  }

  const orderItemsWithVendor = items.map((item) => ({
    ...item,
    vendor_name: item.vendor_id ? vendorNameMap[item.vendor_id] ?? null : null,
  }));

  return {
    ...order,
    order_items: orderItemsWithVendor,
    assignment: assignment as OrderAssignment,
    customer_name: customer?.full_name ?? 'Unknown',
    customer_phone: customer?.phone ?? '',
    vehicle,
  } as RunnerOrderDetail;
}

// ===== Order Actions =====

type RunnerAssignmentStatus = OrderAssignment['status'];

interface RunnerAssignmentRow {
  id: string;
  status: RunnerAssignmentStatus;
  accepted_at: string | null;
  sla_deadline_at: string | null;
  sla_paused_at: string | null;
  sla_pause_accumulated_seconds: number;
  sla_breached: boolean;
}

async function findRunnerAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runnerId: string,
  orderId: string,
  statuses: RunnerAssignmentStatus[]
): Promise<RunnerAssignmentRow | null> {
  const { data, error } = await supabase
    .from('order_assignments')
    .select('id, status, accepted_at, sla_deadline_at, sla_paused_at, sla_pause_accumulated_seconds, sla_breached')
    .eq('assignee_id', runnerId)
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', statuses)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as RunnerAssignmentRow | null;
}

const ACTIVE_RUNNER_ASSIGNMENT_STATUSES = ['assigned', 'accepted', 'in_progress'] as const;

type ActiveRunnerAssignmentRow = {
  id: string;
  order_id: string;
  orders:
    | { status: string; price_review_status: string | null }
    | { status: string; price_review_status: string | null }[];
};

function assignmentOrderMeta(
  row: ActiveRunnerAssignmentRow
): { status: string; price_review_status: string | null } {
  return Array.isArray(row.orders) ? row.orders[0] : row.orders;
}

/**
 * Close runner assignments that are still active but tied to orders that have
 * already been cancelled, completed, or otherwise moved past sourcing.
 */
export async function cleanupStaleRunnerAssignments(runnerId: string): Promise<number> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('order_assignments')
    .select('id, order_id, orders!inner(status, price_review_status)')
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', [...ACTIVE_RUNNER_ASSIGNMENT_STATUSES]);

  if (error) throw new Error(error.message);
  if (!rows?.length) return 0;

  let released = 0;
  const now = new Date().toISOString();

  for (const row of rows as ActiveRunnerAssignmentRow[]) {
    const order = assignmentOrderMeta(row);
    const action = runnerAssignmentReleaseAction(
      order.status,
      order.price_review_status
    );
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

export async function acceptOrder(runnerId: string, orderId: string): Promise<void> {
  const supabase = await createClient();
  const runtime = await getRuntimeConfig();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, ['assigned']);

  if (!assignment) throw new Error('Order not assigned to you');
  if (assignment.status !== 'assigned') throw new Error('Order already accepted or completed');

  // Check concurrent order limit
  const { count } = await supabase
    .from('order_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', ['accepted', 'in_progress']);

  if ((count ?? 0) >= runtime.runner.maxConcurrentOrders) {
    throw new Error(`You can only handle ${runtime.runner.maxConcurrentOrders} orders at a time`);
  }

  // Check float
  const float = await getRunnerFloat(runnerId);
  if (!float || float.balance < config.runner.minFloatToClockIn) {
    throw new Error('Insufficient float to accept order');
  }

  const now = new Date();
  const slaDeadline = new Date(now.getTime() + config.sourcing.slaMinutes * 60 * 1000);

  const { error: acceptAssignmentError } = await supabase
    .from('order_assignments')
    .update({
      status: 'accepted',
      accepted_at: now.toISOString(),
      sla_deadline_at: slaDeadline.toISOString(),
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

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_ORDER_ACCEPTED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner accepted order — sourcing started'),
  });

  // Fire-and-forget notification
  notifyOrderSourcing(orderId).catch(() => {});
}

export async function rejectOrder(
  runnerId: string,
  orderId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, ['assigned']);

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
      await assignRunner(orderId, order.cluster_id, {
        excludeRunnerIds: [runnerId],
      });
    }
  }

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_ORDER_REJECTED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner rejected order assignment', { reason }),
  });
}

/** Release a stuck assignment — cancelled orders, or withdraw before sourcing parts. */
export async function transferRunnerOrder(
  runnerId: string,
  orderId: string,
  reason: string
): Promise<{ reassigned: boolean }> {
  const supabase = await createClient();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, [
    'assigned',
    'accepted',
    'in_progress',
  ]);

  if (!assignment) throw new Error('Order not assigned to you');

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
  throwIfSupabaseError(failError, 'Failed to transfer assignment');

  let reassigned = false;
  if (config.runner.autoReassignEnabled && order.cluster_id) {
    const assignmentId = await assignRunner(orderId, order.cluster_id, {
      excludeRunnerIds: [runnerId],
    });
    reassigned = assignmentId !== null;
  }

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_ORDER_REJECTED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner transferred order to another runner', {
      reason,
      reassigned,
      priceReviewStatus: order.price_review_status,
    }),
  });

  return { reassigned };
}

/**
 * When a runner clocks out, orders waiting on admin/customer are transferred
 * so the runner is not blocked. If no other runner is on shift, the order
 * stays in sourcing until the next runner clocks in.
 */
export async function transferAwaitingOrdersOnShiftEnd(
  runnerId: string
): Promise<{ transferred: number; reassigned: number; orphaned: number }> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('order_assignments')
    .select('id, order_id, orders!inner(price_review_status)')
    .eq('assignee_id', runnerId)
    .eq('role', 'runner')
    .in('status', [...ACTIVE_RUNNER_ASSIGNMENT_STATUSES]);

  if (error) throw new Error(error.message);
  if (!rows?.length) {
    return { transferred: 0, reassigned: 0, orphaned: 0 };
  }

  let transferred = 0;
  let reassigned = 0;
  let orphaned = 0;

  for (const row of rows as Array<{
    id: string;
    order_id: string;
    orders:
      | { price_review_status: string | null }
      | { price_review_status: string | null }[];
  }>) {
    const orderMeta = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    if (!runnerOrderAwaitingExternalResolution({ price_review_status: orderMeta.price_review_status ?? '' })) {
      continue;
    }

    const result = await transferRunnerOrder(
      runnerId,
      row.order_id,
      'Runner ended shift while awaiting admin/customer'
    );
    transferred++;
    if (result.reassigned) reassigned++;
    else orphaned++;
  }

  return { transferred, reassigned, orphaned };
}

export async function releaseRunnerOrder(
  runnerId: string,
  orderId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, [
    'assigned',
    'accepted',
    'in_progress',
  ]);

  if (!assignment) throw new Error('Order not assigned to you');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('status, price_review_status, cluster_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('Order not found');

  const autoRelease = runnerAssignmentReleaseAction(
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
    throwIfSupabaseError(releaseError, 'Failed to release assignment');

    await writeAuditLog({
      userId: runnerId,
      action: AUDIT_ACTIONS.RUNNER_ORDER_REJECTED,
      entityType: 'order',
      entityId: orderId,
      newValues: auditDetails('Runner released stale order assignment', {
        orderStatus: order.status,
      }),
    });
    return;
  }

  if (runnerOrderAwaitingExternalResolution(order)) {
    await transferRunnerOrder(
      runnerId,
      orderId,
      reason?.trim() || 'Runner handed off while awaiting admin/customer'
    );
    return;
  }

  if (assignment.status === 'assigned') {
    if (!reason?.trim()) throw new Error('Reason is required');
    await rejectOrder(runnerId, orderId, reason.trim());
    return;
  }

  if (!reason?.trim()) {
    throw new Error('Reason is required to release an order you have accepted');
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('is_found')
    .eq('order_id', orderId);

  if (items?.some((item) => item.is_found)) {
    throw new Error(
      'Cannot release after sourcing parts. Complete handoff or contact ops.'
    );
  }

  const { error: failError } = await supabase
    .from('order_assignments')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      rejection_reason: reason.trim(),
    })
    .eq('id', assignment.id);
  throwIfSupabaseError(failError, 'Failed to release assignment');

  if (order.status === 'sourcing') {
    const { error: revertError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        sourcing_started_at: null,
      })
      .eq('id', orderId);
    throwIfSupabaseError(revertError, 'Failed to revert order status');
  }

  if (config.runner.autoReassignEnabled && order.cluster_id) {
    await assignRunner(orderId, order.cluster_id, {
      excludeRunnerIds: [runnerId],
    });
  }

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_ORDER_REJECTED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner withdrew from accepted order', { reason: reason.trim() }),
  });
}

export async function markItemFound(
  runnerId: string,
  orderId: string,
  itemId: string,
  data: {
    vendorId?: string;
    quickAddVendor?: { name: string; locationInMarket?: string };
    vendorPrice: number;
    qcImageUrl: string;
  }
): Promise<PriceEscalationResult> {
  const supabase = await createClient();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, [
    'accepted',
    'in_progress',
  ]);

  if (!assignment) throw new Error('Order not assigned to you or not in progress');

  const { data: orderRow } = await supabase
    .from('orders')
    .select('cluster_id')
    .eq('id', orderId)
    .single();

  if (!orderRow?.cluster_id) throw new Error('Order cluster not found');

  const resolvedVendorId = await resolveVendorForSourcing({
    runnerId,
    clusterId: orderRow.cluster_id,
    vendorId: data.vendorId,
    quickAddVendor: data.quickAddVendor,
  });

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
      vendor_id: resolvedVendorId,
      vendor_price: data.vendorPrice,
      qc_image_url: data.qcImageUrl,
      is_found: true,
      is_unavailable: false,
    })
    .eq('id', itemId);
  throwIfSupabaseError(updateItemError, 'Failed to mark item as found');

  await incrementVendorOrderCount(resolvedVendorId);

  const escalation = await handleVendorPriceEntry(supabase, {
    orderId,
    itemId,
    sellingPrice: item.selling_price,
    vendorPrice: data.vendorPrice,
    vendorId: resolvedVendorId,
    description: item.description,
    actorId: runnerId,
  });

  // Fire-and-forget: record vendor-part price; under-budget punches update catalog directly
  if (item.part_id) {
    recordVendorPartPrice(resolvedVendorId, item.part_id, data.vendorPrice, runnerId, {
      catalogPriceMode: escalation.escalated ? 'weighted' : 'direct',
    }).catch((err) => console.error('Price feedback failed:', err));
  }

  if (assignment.status === 'accepted') {
    const { error: progressError } = await supabase
      .from('order_assignments')
      .update({ status: 'in_progress' })
      .eq('id', assignment.id);
    throwIfSupabaseError(progressError, 'Failed to update assignment progress');
  }

  return escalation;
}

export async function markItemUnavailable(
  runnerId: string,
  orderId: string,
  itemId: string,
  reason: string
) {
  const supabase = await createClient();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, [
    'accepted',
    'in_progress',
  ]);

  if (!assignment) throw new Error('Order not assigned to you or not in progress');

  const { data: item } = await supabase
    .from('order_items')
    .select('description')
    .eq('id', itemId)
    .eq('order_id', orderId)
    .single();

  if (!item) throw new Error('Item not found');

  const { handleRunnerItemUnavailable } = await import('./runner-unavailable');

  return handleRunnerItemUnavailable({
    runnerId,
    orderId,
    itemId,
    reason,
    itemDescription: item.description,
  });
}

export async function requestClarification(
  runnerId: string,
  orderId: string,
  message: string
): Promise<void> {
  const supabase = await createClient();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, [
    'accepted',
    'in_progress',
  ]);

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

  // Pause SLA while waiting for customer
  const { pauseSlaTimer } = await import('./sla');
  pauseSlaTimer(orderId).catch(() => {});

  // Fire-and-forget notification
  notifyClarificationRequest(orderId, message).catch(() => {});
}

export async function completeOrder(runnerId: string, orderId: string): Promise<void> {
  const supabase = await createClient();

  const assignment = await findRunnerAssignment(supabase, runnerId, orderId, [
    'accepted',
    'in_progress',
  ]);

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
    const runtime = await getRuntimeConfig();
    await supabase
      .from('runner_shifts')
      .update({
        orders_completed: shift.orders_completed + 1,
        total_sourced: shift.total_sourced + totalVendorCost,
        commission_earned: shift.commission_earned + runtime.runner.commissionPerOrder,
      })
      .eq('id', shift.id);
  }

  // Check SLA breach on completion
  const { computeSlaTimerState } = await import('@/lib/utils/sla-timer');
  const { markSlaBreached } = await import('./sla');
  const slaState = computeSlaTimerState(
    assignment.sla_deadline_at ?? null,
    assignment.sla_paused_at ?? null,
    assignment.sla_pause_accumulated_seconds ?? 0,
    assignment.accepted_at ?? null,
    assignment.sla_breached ?? false,
    config.sourcing.slaWarningAmberPercent,
    config.sourcing.slaWarningRedPercent
  );
  if (slaState && slaState.remainingSeconds <= 0 && !assignment.sla_breached) {
    markSlaBreached(assignment.id, orderId, runnerId).catch(() => {});
  }

  await writeAuditLog({
    userId: runnerId,
    action: AUDIT_ACTIONS.RUNNER_ORDER_COMPLETED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner completed sourcing — parts at gate', {
      totalVendorCost,
      status: 'picked',
    }),
  });
}
