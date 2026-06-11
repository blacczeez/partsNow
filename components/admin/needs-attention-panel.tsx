'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, Scale, Truck, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  ATTENTION_DESCRIPTIONS,
  ATTENTION_LABELS,
  getAttentionQueueHref,
  type AttentionType,
} from '@/lib/constants/admin-attention';
import type { AdminAttentionInbox } from '@/lib/services/admin-attention';
import type { OrderStatus } from '@/lib/types/database';

const ATTENTION_ICONS: Record<AttentionType, ComponentType<{ className?: string }>> = {
  sla_breach: AlertTriangle,
  delivery_escalated: Truck,
  price_review: Scale,
  settlement_pending: Wallet,
};

const ATTENTION_VARIANTS: Record<
  AttentionType,
  'error' | 'warning' | 'info'
> = {
  sla_breach: 'error',
  delivery_escalated: 'warning',
  price_review: 'warning',
  settlement_pending: 'info',
};

function AttentionOrderRow({
  type,
  order,
}: {
  type: AttentionType;
  order: {
    order_number: string;
    status: string;
    minutes_overdue?: number;
    promised_delivery_minutes?: number;
  };
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <span className="font-medium text-slate-900">{order.order_number}</span>
        <StatusBadge status={order.status as OrderStatus} className="ml-2" />
      </div>
      {type === 'sla_breach' && order.minutes_overdue != null && (
        <span className="shrink-0 text-sm font-medium text-error">
          {Math.round(order.minutes_overdue)}m overdue
        </span>
      )}
    </div>
  );
}

interface NeedsAttentionPanelProps {
  attention: AdminAttentionInbox;
}

export function NeedsAttentionPanel({ attention }: NeedsAttentionPanelProps) {
  if (attention.totalCount === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Needs Attention
          <span className="ml-2 text-base font-normal text-slate-500">
            ({attention.totalCount})
          </span>
        </h2>
      </div>

      <div className="space-y-4">
        {attention.groups.map((group) => {
          const Icon = ATTENTION_ICONS[group.type];
          const variant = ATTENTION_VARIANTS[group.type];
          const borderClass =
            variant === 'error'
              ? 'border-error/30 bg-error-light'
              : variant === 'warning'
                ? 'border-warning/30 bg-warning-light'
                : 'border-info/30 bg-info-light';

          return (
            <section
              key={group.type}
              className={`overflow-hidden rounded-card border ${borderClass}`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      variant === 'error'
                        ? 'text-error'
                        : variant === 'warning'
                          ? 'text-warning'
                          : 'text-info'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {ATTENTION_LABELS[group.type]}
                    </p>
                    <p className="truncate text-sm text-slate-600">
                      {ATTENTION_DESCRIPTIONS[group.type]}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={variant}>{group.count}</Badge>
                  <Link
                    href={getAttentionQueueHref(group.type)}
                    className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline"
                  >
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {group.preview.length > 0 && (
                <div className="divide-y divide-black/5 bg-white/60">
                  {group.preview.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders?search=${encodeURIComponent(order.order_number)}`}
                      className="block hover:bg-white/80"
                    >
                      <AttentionOrderRow type={group.type} order={order} />
                    </Link>
                  ))}
                </div>
              )}

              {group.hasMore && (
                <Link
                  href={getAttentionQueueHref(group.type)}
                  className="block border-t border-black/5 bg-white/40 px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-white/60"
                >
                  + {group.count - group.preview.length} more — view queue
                </Link>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
