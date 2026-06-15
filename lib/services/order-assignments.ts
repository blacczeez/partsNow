import type { createClient } from '@/lib/supabase/server';
import type { OrderAssignment } from '@/lib/types/database';

type DbClient = Awaited<ReturnType<typeof createClient>>;
type AssignmentStatus = OrderAssignment['status'];
type AssignmentRole = OrderAssignment['role'];

export async function findStaffAssignment(
  supabase: DbClient,
  assigneeId: string,
  orderId: string,
  role: AssignmentRole,
  statuses: AssignmentStatus[]
): Promise<{ id: string; status: AssignmentStatus } | null> {
  const { data, error } = await supabase
    .from('order_assignments')
    .select('id, status')
    .eq('assignee_id', assigneeId)
    .eq('order_id', orderId)
    .eq('role', role)
    .in('status', statuses)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: string; status: AssignmentStatus } | null;
}

export async function findStaffAssignmentFull(
  supabase: DbClient,
  assigneeId: string,
  orderId: string,
  role: AssignmentRole,
  statuses: AssignmentStatus[]
): Promise<OrderAssignment | null> {
  const { data, error } = await supabase
    .from('order_assignments')
    .select('*')
    .eq('assignee_id', assigneeId)
    .eq('order_id', orderId)
    .eq('role', role)
    .in('status', statuses)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as OrderAssignment | null;
}
