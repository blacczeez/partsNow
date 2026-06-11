import { createServiceClient } from '@/lib/supabase/service';
import { config } from '@/lib/config';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

export async function assignRunner(
  orderId: string,
  clusterId: string
): Promise<string | null> {
  const supabase = createServiceClient();

  // Find eligible runners:
  // - Same cluster
  // - Active shift (ended_at IS NULL)
  // - Active (is_active = true, user_type = 'runner')
  // - Float >= minFloatForAssignment (50000)
  // - Active assignments < maxConcurrentOrders (3)

  // Get runners with active shifts in this cluster
  const { data: activeShifts } = await supabase
    .from('runner_shifts')
    .select('runner_id')
    .eq('cluster_id', clusterId)
    .is('ended_at', null);

  if (!activeShifts || activeShifts.length === 0) return null;

  const runnerIds = activeShifts.map((s: { runner_id: string }) => s.runner_id);

  // Get runners who are active users
  const { data: runners } = await supabase
    .from('users')
    .select('id')
    .in('id', runnerIds)
    .eq('user_type', 'runner')
    .eq('is_active', true);

  if (!runners || runners.length === 0) return null;

  const activeRunnerIds = runners.map((r: { id: string }) => r.id);

  // Get runners with sufficient float
  const { data: floats } = await supabase
    .from('runner_floats')
    .select('runner_id')
    .in('runner_id', activeRunnerIds)
    .gte('balance', config.runner.minFloatToClockIn);

  if (!floats || floats.length === 0) return null;

  const fundedRunnerIds: string[] = floats.map(
    (f: { runner_id: string }) => f.runner_id
  );

  // Skip if this order already has an active runner assignment
  const { data: existingAssignment } = await supabase
    .from('order_assignments')
    .select('id')
    .eq('order_id', orderId)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress'])
    .maybeSingle();

  if (existingAssignment) return null;

  // Count active assignments per runner
  const { data: assignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .in('assignee_id', fundedRunnerIds)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  const assignmentCounts: Record<string, number> = {};
  for (const id of fundedRunnerIds) {
    assignmentCounts[id] = 0;
  }
  if (assignments) {
    for (const a of (assignments ?? []) as { assignee_id: string }[]) {
      assignmentCounts[a.assignee_id] = (assignmentCounts[a.assignee_id] || 0) + 1;
    }
  }

  // Find eligible runners (under max concurrent) sorted by fewest assignments
  const eligible = fundedRunnerIds
    .filter((id) => (assignmentCounts[id] || 0) < config.runner.maxConcurrentOrders)
    .sort((a, b) => (assignmentCounts[a] || 0) - (assignmentCounts[b] || 0));

  if (eligible.length === 0) return null;

  const selectedRunnerId = eligible[0];

  // Create assignment
  const { data: assignment, error } = await supabase
    .from('order_assignments')
    .insert({
      order_id: orderId,
      assignee_id: selectedRunnerId,
      role: 'runner',
      status: 'assigned',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create runner assignment:', error.message);
    return null;
  }

  await writeAuditLog({
    userId: selectedRunnerId,
    action: AUDIT_ACTIONS.ASSIGNMENT_RUNNER_ASSIGNED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Runner auto-assigned to order', {
      runnerId: selectedRunnerId,
      assignmentId: assignment.id,
    }),
  });

  return assignment.id as string;
}

/** Assign confirmed orders in a cluster that have no active runner yet. */
export async function assignUnassignedOrdersInCluster(
  clusterId: string
): Promise<number> {
  const supabase = createServiceClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('cluster_id', clusterId)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: true });

  if (!orders?.length) return 0;

  const orderIds = orders.map((o: { id: string }) => o.id);
  const { data: activeAssignments } = await supabase
    .from('order_assignments')
    .select('order_id')
    .in('order_id', orderIds)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  const assignedOrderIds = new Set(
    (activeAssignments ?? []).map((a: { order_id: string }) => a.order_id)
  );

  let assignedCount = 0;
  for (const order of orders as { id: string }[]) {
    if (assignedOrderIds.has(order.id)) continue;
    const assignmentId = await assignRunner(order.id, clusterId);
    if (assignmentId) assignedCount++;
  }

  return assignedCount;
}

export async function assignRider(
  orderId: string,
  clusterId: string
): Promise<string | null> {
  const supabase = createServiceClient();

  // Find active riders in this cluster
  const { data: riders } = await supabase
    .from('users')
    .select('id')
    .eq('user_type', 'rider')
    .eq('is_active', true)
    .eq('cluster_id', clusterId);

  if (!riders || riders.length === 0) return null;

  const riderIds: string[] = riders.map((r: { id: string }) => r.id);

  // Count active assignments per rider
  const { data: assignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .in('assignee_id', riderIds)
    .eq('role', 'rider')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  const assignmentCounts: Record<string, number> = {};
  for (const id of riderIds) {
    assignmentCounts[id] = 0;
  }
  if (assignments) {
    for (const a of (assignments ?? []) as { assignee_id: string }[]) {
      assignmentCounts[a.assignee_id] = (assignmentCounts[a.assignee_id] || 0) + 1;
    }
  }

  // Find eligible riders under max concurrent deliveries, sorted by fewest assignments
  const eligible = riderIds
    .filter((id) => (assignmentCounts[id] || 0) < config.dispatch.riderMaxConcurrentDeliveries)
    .sort((a, b) => (assignmentCounts[a] || 0) - (assignmentCounts[b] || 0));

  if (eligible.length === 0) return null;

  const selectedRiderId = eligible[0];

  // Create assignment
  const { data: assignment, error } = await supabase
    .from('order_assignments')
    .insert({
      order_id: orderId,
      assignee_id: selectedRiderId,
      role: 'rider',
      status: 'assigned',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create rider assignment:', error.message);
    return null;
  }

  await writeAuditLog({
    userId: selectedRiderId,
    action: AUDIT_ACTIONS.ASSIGNMENT_RIDER_ASSIGNED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails('Rider auto-assigned to order', {
      riderId: selectedRiderId,
      assignmentId: assignment.id,
    }),
  });

  return assignment.id as string;
}
