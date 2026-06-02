import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';

export async function assignRunner(
  orderId: string,
  clusterId: string
): Promise<string | null> {
  const supabase = await createClient();

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

  const runnerIds = activeShifts.map((s) => s.runner_id);

  // Get runners who are active users
  const { data: runners } = await supabase
    .from('users')
    .select('id')
    .in('id', runnerIds)
    .eq('user_type', 'runner')
    .eq('is_active', true);

  if (!runners || runners.length === 0) return null;

  const activeRunnerIds = runners.map((r) => r.id);

  // Get runners with sufficient float
  const { data: floats } = await supabase
    .from('runner_floats')
    .select('runner_id')
    .in('runner_id', activeRunnerIds)
    .gte('balance', config.runner.minFloatToClockIn);

  if (!floats || floats.length === 0) return null;

  const fundedRunnerIds = floats.map((f) => f.runner_id);

  // Count active assignments per runner
  const { data: assignments } = await supabase
    .from('order_assignments')
    .select('assignee_id')
    .in('assignee_id', fundedRunnerIds)
    .eq('role', 'runner')
    .in('status', ['assigned', 'accepted', 'in_progress']);

  // Count assignments per runner
  const assignmentCounts: Record<string, number> = {};
  for (const id of fundedRunnerIds) {
    assignmentCounts[id] = 0;
  }
  if (assignments) {
    for (const a of assignments) {
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

  return assignment.id;
}

export async function assignRider(
  orderId: string,
  clusterId: string
): Promise<string | null> {
  const supabase = await createClient();

  // Find active riders in this cluster
  const { data: riders } = await supabase
    .from('users')
    .select('id')
    .eq('user_type', 'rider')
    .eq('is_active', true)
    .eq('cluster_id', clusterId);

  if (!riders || riders.length === 0) return null;

  const riderIds = riders.map((r) => r.id);

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
    for (const a of assignments) {
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

  return assignment.id;
}
