import Link from 'next/link';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { formatShiftDateRange, formatShiftDuration } from '@/lib/utils/shift';
import type { RunnerShiftListItem } from '@/lib/services/runner';

interface ShiftHistoryCardProps {
  shift: RunnerShiftListItem;
}

export function ShiftHistoryCard({ shift }: ShiftHistoryCardProps) {
  return (
    <Link href={`/runner/shifts/${shift.id}`}>
      <div className="mb-4 rounded-card border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {formatShiftDateRange(shift.started_at, shift.ended_at)}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{shift.cluster_name}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {shift.is_active ? (
              <Badge variant="success">Active</Badge>
            ) : shift.is_reconciled ? (
              <Badge variant="success">Reconciled</Badge>
            ) : (
              <Badge variant="warning">Pending review</Badge>
            )}
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Duration</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-900">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {formatShiftDuration(shift.started_at, shift.ended_at)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Orders</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {shift.orders_completed}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Sourced</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {formatCurrency(shift.total_sourced)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Commission</p>
            <p className="mt-0.5 text-sm font-medium text-success">
              {formatCurrency(shift.commission_earned)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
