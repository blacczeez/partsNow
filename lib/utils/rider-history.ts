import type { RiderHistoryEntry } from '@/lib/services/rider';

export type RiderHistoryOutcomeVariant = 'success' | 'error' | 'warning' | 'neutral';

export function riderHistoryOutcome(entry: {
  assignment_status: string;
  status: string;
  rejection_reason: string | null;
}): { label: string; variant: RiderHistoryOutcomeVariant } {
  if (entry.assignment_status === 'completed' && entry.status === 'delivered') {
    return { label: 'Delivered', variant: 'success' };
  }

  if (entry.assignment_status === 'failed') {
    const reason = (entry.rejection_reason ?? '').toLowerCase();
    if (reason.includes('declin') || reason.includes('reject')) {
      return { label: 'Declined', variant: 'warning' };
    }
    if (
      reason.includes('transfer') ||
      reason.includes('handed') ||
      reason.includes('logged out') ||
      reason.includes('reassigned')
    ) {
      return { label: 'Transferred', variant: 'neutral' };
    }
    return { label: 'Released', variant: 'warning' };
  }

  if (entry.status === 'cancelled') {
    return { label: 'Cancelled', variant: 'error' };
  }
  if (entry.status === 'rejected' || entry.status === 'failed') {
    return { label: 'Delivery failed', variant: 'error' };
  }

  return { label: 'Completed', variant: 'neutral' };
}

export function riderTransitMinutes(entry: {
  pickup_confirmed_at: string | null;
  delivered_at: string | null;
  actual_delivery_minutes: number | null;
}): number | null {
  if (entry.pickup_confirmed_at && entry.delivered_at) {
    const mins = Math.round(
      (new Date(entry.delivered_at).getTime() -
        new Date(entry.pickup_confirmed_at).getTime()) /
        60000
    );
    return mins >= 0 ? mins : null;
  }
  return entry.actual_delivery_minutes ?? null;
}

export function groupRiderHistoryByDate(
  entries: RiderHistoryEntry[]
): Array<{ label: string; items: RiderHistoryEntry[] }> {
  const groups = new Map<string, RiderHistoryEntry[]>();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  for (const entry of entries) {
    const date = new Date(entry.completed_at ?? entry.delivered_at ?? entry.assigned_at);
    let label: string;

    if (date >= startOfToday) {
      label = 'Today';
    } else if (date >= startOfYesterday) {
      label = 'Yesterday';
    } else if (date >= startOfWeek) {
      label = 'This week';
    } else {
      label = date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
    }

    const bucket = groups.get(label) ?? [];
    bucket.push(entry);
    groups.set(label, bucket);
  }

  const order = ['Today', 'Yesterday', 'This week'];
  const result: Array<{ label: string; items: RiderHistoryEntry[] }> = [];

  for (const label of order) {
    const items = groups.get(label);
    if (items?.length) result.push({ label, items });
    groups.delete(label);
  }

  for (const [label, items] of groups) {
    result.push({ label, items });
  }

  return result;
}
