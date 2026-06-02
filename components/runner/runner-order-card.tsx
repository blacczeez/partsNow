'use client';

import { Package, ChevronRight, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
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

  return (
    <Link href={`/runner/order/${order.id}`}>
      <div
        className={cn(
          'rounded-card border bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
          order.assignment_status === 'assigned' && 'border-amber-300 bg-amber-50/30'
        )}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{order.order_number}</p>
            <p className="mt-0.5 font-semibold text-slate-900">
              {formatCurrency(order.total)}
            </p>
          </div>
          <span
            className={cn(
              'rounded-pill px-2.5 py-0.5 text-xs font-medium',
              statusInfo.color
            )}
          >
            {statusInfo.label}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-600">
          <Package className="h-4 w-4 flex-shrink-0" />
          <span>{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
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
