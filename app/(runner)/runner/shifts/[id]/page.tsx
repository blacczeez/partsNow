'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Loader2,
  MapPin,
  Package,
  TrendingUp,
  Wallet,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { formatShiftDateRange, formatShiftDuration } from '@/lib/utils/shift';
import { config } from '@/lib/config';
import type { RunnerShiftDetail } from '@/lib/services/runner';

const assignmentStatusLabels: Record<string, string> = {
  assigned: 'New',
  accepted: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  failed: 'Rejected',
};

export default function RunnerShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [shift, setShift] = useState<RunnerShiftDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/runner/shifts/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load shift');
        setShift(data.shift);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load shift');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="py-16 text-center">
        <p className="text-error">{error || 'Shift not found'}</p>
        <Link
          href="/runner/shifts"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to shift history
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Link
          href="/runner/shifts"
          className="rounded-button p-1 hover:bg-slate-100"
          aria-label="Back to shift history"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">Shift details</h1>
          <p className="truncate text-sm text-slate-500">
            {formatShiftDateRange(shift.started_at, shift.ended_at)}
          </p>
        </div>
      </div>

      <div className="rounded-card border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {shift.is_active ? (
            <Badge variant="success">Active shift</Badge>
          ) : shift.is_reconciled ? (
            <Badge variant="success">Reconciled</Badge>
          ) : (
            <Badge variant="warning">Awaiting reconciliation</Badge>
          )}
          {shift.discrepancy_amount !== 0 && (
            <Badge variant="warning">
              {formatCurrency(Math.abs(shift.discrepancy_amount))} discrepancy
            </Badge>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{shift.cluster_name}</span>
          <span className="text-slate-300">·</span>
          <Clock className="h-4 w-4 shrink-0" />
          <span>{formatShiftDuration(shift.started_at, shift.ended_at)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Orders completed" value={String(shift.orders_completed)} icon={Package} />
          <Metric
            label="Commission"
            value={formatCurrency(shift.commission_earned)}
            icon={TrendingUp}
            valueClassName="text-success"
          />
          <Metric
            label="Total sourced"
            value={formatCurrency(shift.total_sourced)}
            icon={Wallet}
          />
          <Metric
            label="Orders / hour"
            value={shift.orders_per_hour != null ? String(shift.orders_per_hour) : '—'}
            icon={Clock}
          />
        </div>
      </div>

      <section className="rounded-card border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Performance</h2>
        <dl className="space-y-3 text-sm">
          <DetailRow
            label="Avg. sourced per order"
            value={
              shift.avg_sourced_per_order != null
                ? formatCurrency(shift.avg_sourced_per_order)
                : '—'
            }
          />
          <DetailRow
            label="Commission per order"
            value={formatCurrency(config.runner.commissionPerOrder)}
          />
          <DetailRow
            label="Assignments received"
            value={String(shift.assignments_total)}
          />
          <DetailRow
            label="Completed handoffs"
            value={String(shift.assignments_completed)}
          />
          <DetailRow
            label="Rejected assignments"
            value={String(shift.assignments_rejected)}
          />
          {shift.is_active && shift.assignments_in_progress > 0 && (
            <DetailRow
              label="Still in progress"
              value={String(shift.assignments_in_progress)}
            />
          )}
        </dl>
      </section>

      <section className="rounded-card border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Float</h2>
        <p className="mb-3 text-xs text-slate-500">
          {shift.is_active
            ? 'Balance when you clocked in vs your live float right now.'
            : 'Snapshot from when you clocked in and out.'}
        </p>
        <dl className="space-y-3 text-sm">
          <DetailRow
            label="At clock-in"
            value={formatCurrency(shift.starting_float)}
          />
          {shift.is_active ? (
            <DetailRow
              label="Current balance"
              value={
                shift.current_float != null
                  ? formatCurrency(shift.current_float)
                  : '—'
              }
            />
          ) : (
            <DetailRow
              label="At clock-out"
              value={
                shift.ending_float != null
                  ? formatCurrency(shift.ending_float)
                  : '—'
              }
            />
          )}
          {shift.float_spent != null && shift.float_spent > 0 && (
            <DetailRow
              label="Spent on sourcing this shift"
              value={formatCurrency(shift.float_spent)}
            />
          )}
          {shift.discrepancy_notes && (
            <div className="rounded-button bg-slate-50 px-3 py-2 text-slate-600">
              <p className="text-xs font-medium text-slate-500">Your notes</p>
              <p className="mt-1">{shift.discrepancy_notes}</p>
            </div>
          )}
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Orders this shift ({shift.orders.length})
        </h2>
        {shift.orders.length === 0 ? (
          <p className="rounded-card border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            No orders were assigned during this shift
          </p>
        ) : (
          <div className="space-y-2">
            {shift.orders.map((order) => (
              <div
                key={`${order.order_id}-${order.assigned_at}`}
                className="rounded-card border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/runner/order/${order.order_id}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {order.order_number}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      Assigned {formatRelativeTime(order.assigned_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      order.assignment_status === 'completed'
                        ? 'success'
                        : order.assignment_status === 'failed'
                          ? 'error'
                          : 'default'
                    }
                  >
                    {assignmentStatusLabels[order.assignment_status] ??
                      order.assignment_status}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  {order.assignment_status === 'completed' && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-success" />
                      Sourced {formatCurrency(order.total_sourced)}
                    </span>
                  )}
                  {order.assignment_status === 'failed' && (
                    <span className="flex items-center gap-1 text-error">
                      <XCircle className="h-4 w-4" />
                      {order.rejection_reason || 'Rejected'}
                    </span>
                  )}
                  {order.completed_at && (
                    <span className="text-xs text-slate-400">
                      Handed off {formatRelativeTime(order.completed_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-button bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-sm font-semibold text-slate-900 ${valueClassName ?? ''}`}>
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
