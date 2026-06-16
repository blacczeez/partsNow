'use client';

import Link from 'next/link';
import {
  Banknote,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  Phone,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils/format';
import { CustomerPhoneLink } from '@/components/rider/customer-phone-link';
import {
  riderHistoryOutcome,
  riderTransitMinutes,
} from '@/lib/utils/rider-history';
import { cn } from '@/lib/utils/cn';
import type { RiderHistoryEntry } from '@/lib/services/rider';

interface RiderHistoryCardProps {
  delivery: RiderHistoryEntry;
}

const outcomeBadgeVariant: Record<
  string,
  'success' | 'error' | 'warning' | 'default'
> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  neutral: 'default',
};

export function RiderHistoryCard({ delivery }: RiderHistoryCardProps) {
  const outcome = riderHistoryOutcome(delivery);
  const transitMins = riderTransitMinutes(delivery);
  const timestamp =
    delivery.delivered_at ?? delivery.completed_at ?? delivery.assigned_at;

  return (
    <article className="relative mb-4 mt-4 rounded-card border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={`/rider/history/${delivery.id}`}
        className="absolute inset-0 z-0 rounded-card"
        aria-label={`View delivery ${delivery.order_number}`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {delivery.order_number}
              </p>
              <Badge variant={outcomeBadgeVariant[outcome.variant]}>
                {outcome.label}
              </Badge>
              {delivery.payment_method === 'cod' && (
                <span className="inline-flex items-center gap-1 rounded-pill bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  <Banknote className="h-3 w-3" />
                  COD
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {timestamp ? formatRelativeTime(timestamp) : '—'}
              {timestamp ? ` · ${formatDateTime(timestamp)}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <p className="text-sm font-semibold text-slate-900">
              {formatCurrency(delivery.total)}
            </p>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </div>
        </div>

        <div className="mb-3 space-y-1.5 text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{delivery.customer_name}</span>
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            <CustomerPhoneLink phone={delivery.customer_phone} />
          </div>
          <div className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="line-clamp-2">{delivery.delivery_address}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="line-clamp-2">{delivery.items_summary}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
          <Metric label="Items" value={String(delivery.item_count)} />
          <Metric
            label="Payment"
            value={
              delivery.payment_method === 'cod'
                ? delivery.payment_status === 'paid'
                  ? 'COD collected'
                  : 'COD pending'
                : delivery.payment_status === 'paid'
                  ? 'Prepaid'
                  : delivery.payment_method
            }
          />
          <Metric
            label="Transit"
            value={transitMins != null ? `${transitMins} min` : '—'}
            icon={Clock}
          />
          <Metric
            label="Attempts"
            value={delivery.attempt_count > 0 ? String(delivery.attempt_count) : '1'}
          />
        </div>

        {(delivery.rejection_reason || delivery.last_failure_reason) && (
          <p
            className={cn(
              'mt-3 rounded-button px-3 py-2 text-xs',
              outcome.variant === 'error'
                ? 'bg-error-light text-error'
                : 'bg-slate-50 text-slate-600'
            )}
          >
            {delivery.rejection_reason ?? delivery.last_failure_reason}
          </p>
        )}
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Clock;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-900">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {value}
      </p>
    </div>
  );
}
