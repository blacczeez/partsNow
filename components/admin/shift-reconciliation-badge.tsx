import { Badge } from '@/components/ui/badge';
import {
  getShiftReconciliationStatus,
  type ShiftReconciliationStatus,
} from '@/lib/utils/shift-reconciliation';

const STATUS_CONFIG: Record<
  ShiftReconciliationStatus,
  { label: string; variant: 'primary' | 'warning' | 'success' }
> = {
  active: { label: 'Active', variant: 'primary' },
  pending: { label: 'Pending review', variant: 'warning' },
  reconciled: { label: 'Reconciled', variant: 'success' },
};

interface ShiftReconciliationBadgeProps {
  endedAt: string | null;
  isReconciled: boolean;
}

export function ShiftReconciliationBadge({
  endedAt,
  isReconciled,
}: ShiftReconciliationBadgeProps) {
  const status = getShiftReconciliationStatus({
    ended_at: endedAt,
    is_reconciled: isReconciled,
  });
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
