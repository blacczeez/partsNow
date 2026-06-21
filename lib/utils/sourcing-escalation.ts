import { isRunnerUnavailableRejection } from '@/lib/constants/runner-unavailable';

export function getSourcingEscalationOrderUrl(orderId: string): string {
  return `/admin/orders?attention=sourcing_escalated&order=${orderId}`;
}

export interface SourcingEscalationSummary {
  isEscalated: boolean;
  reason: string | null;
  escalatedAt: string | null;
  unavailableRunnerCount: number;
  hasActiveRunner: boolean;
  unavailableItemCount: number;
  pendingItemCount: number;
  allItemsUnavailable: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export async function markOrderSourcingEscalated(
  supabase: SupabaseClient,
  orderId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      sourcing_escalated_at: new Date().toISOString(),
      sourcing_escalation_reason: reason.trim(),
    })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}

export async function clearOrderSourcingEscalation(
  supabase: SupabaseClient,
  orderId: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      sourcing_escalated_at: null,
      sourcing_escalation_reason: null,
    })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}

export async function buildSourcingEscalationSummary(
  supabase: SupabaseClient,
  order: {
    id: string;
    sourcing_escalated_at?: string | null;
    sourcing_escalation_reason?: string | null;
  }
): Promise<SourcingEscalationSummary> {
  const [{ data: items }, { data: assignments }, { data: failedAssignments }] =
    await Promise.all([
      supabase
        .from('order_items')
        .select('is_found, is_unavailable')
        .eq('order_id', order.id),
      supabase
        .from('order_assignments')
        .select('id')
        .eq('order_id', order.id)
        .eq('role', 'runner')
        .in('status', ['assigned', 'accepted', 'in_progress']),
      supabase
        .from('order_assignments')
        .select('assignee_id, rejection_reason')
        .eq('order_id', order.id)
        .eq('role', 'runner')
        .eq('status', 'failed'),
    ]);

  const itemRows = (items ?? []) as Array<{
    is_found: boolean;
    is_unavailable: boolean;
  }>;
  const unavailableItemCount = itemRows.filter((i) => i.is_unavailable).length;
  const pendingItemCount = itemRows.filter(
    (i) => !i.is_found && !i.is_unavailable
  ).length;
  const allItemsUnavailable =
    itemRows.length > 0 && itemRows.every((i) => i.is_unavailable);

  const runnerIds = new Set<string>();
  for (const row of failedAssignments ?? []) {
    if (isRunnerUnavailableRejection(row.rejection_reason)) {
      runnerIds.add(row.assignee_id);
    }
  }

  return {
    isEscalated: Boolean(order.sourcing_escalated_at),
    reason: order.sourcing_escalation_reason ?? null,
    escalatedAt: order.sourcing_escalated_at ?? null,
    unavailableRunnerCount: runnerIds.size,
    hasActiveRunner: (assignments?.length ?? 0) > 0,
    unavailableItemCount,
    pendingItemCount,
    allItemsUnavailable,
  };
}
