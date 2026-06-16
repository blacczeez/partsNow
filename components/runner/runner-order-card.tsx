'use client';

import { Package, ChevronRight, Clock, MapPin } from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { runnerSourcingTargetTotal } from '@/lib/utils/order-pricing-display';
import { runnerPriceReviewBadgeLabel } from '@/components/runner/runner-price-status-banner';
import { SlaCountdown } from '@/components/runner/sla-countdown';
import { useSlaCountdown } from '@/lib/hooks/use-sla-countdown';
import { cn } from '@/lib/utils/cn';
import Link from 'next/link';
import type { RunnerOrderSummary } from '@/lib/services/runner';

interface RunnerOrderCardProps {
  order: RunnerOrderSummary;
}

const assignmentStatusLabels: Record<string, { label: string; color: string }> = {
  assigned: { label: 'New', color: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Active', color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
};

export function RunnerOrderCard({ order }: RunnerOrderCardProps) {
  const statusInfo = assignmentStatusLabels[order.assignment_status] ?? {
    label: order.assignment_status,
    color: 'bg-slate-100 text-slate-800',
  };
  const sourcingTarget = runnerSourcingTargetTotal(order.order_items ?? []);
  const priceBadge = runnerPriceReviewBadgeLabel(order);
  const slaState = useSlaCountdown({
    slaDeadlineAt: order.sla_deadline_at,
    slaPausedAt: order.sla_paused_at,
    slaPauseAccumulatedSeconds: order.sla_pause_accumulated_seconds,
    acceptedAt: order.accepted_at,
    slaBreached: order.sla_breached,
    priceReviewStatus: order.price_review_status,
    clarificationStatus: order.clarification_status,
  });
  const showSla = order.assignment_status !== 'assigned' && slaState;

  return (
    <Link href={`/runner/order/${order.id}`}>
      <div
        className={cn(
          'rounded-card mt-4 border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
          order.assignment_status === 'assigned' && 'border-amber-300 bg-amber-50/30'
        )}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{order.order_number}</p>
            <p className="mt-0.5 font-semibold text-slate-900">
              {formatCurrency(sourcingTarget)}
            </p>
            <p className="text-xs text-slate-500">Target budget — negotiate at or below</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                'rounded-pill px-2.5 py-0.5 text-xs font-medium',
                statusInfo.color
              )}
            >
              {statusInfo.label}
            </span>
            {priceBadge && (
              <span
                className={cn(
                  'rounded-pill px-2.5 py-0.5 text-xs font-medium',
                  priceBadge === 'Price accepted'
                    ? 'bg-success-light text-success'
                    : priceBadge === 'Cancelled'
                      ? 'bg-error-light text-error'
                      : 'bg-warning-light text-warning'
                )}
              >
                {priceBadge}
              </span>
            )}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4 flex-shrink-0" />
            <span>{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
          </div>
          {showSla && <SlaCountdown state={slaState} compact />}
        </div>

        <div className="mb-3 flex items-start gap-1.5 text-sm text-slate-500">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-1">{order.delivery_address}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatRelativeTime(order.assigned_at)}</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}
