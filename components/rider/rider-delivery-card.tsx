'use client';

import Link from 'next/link';
import { MapPin, ChevronRight, Banknote, ShieldAlert, Phone } from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { riderPriceReviewBadgeLabel } from '@/components/rider/rider-price-status-banner';
import { CustomerPhoneLink } from '@/components/rider/customer-phone-link';
import { cn } from '@/lib/utils/cn';
import type { RiderDeliverySummary } from '@/lib/services/rider';

interface RiderDeliveryCardProps {
  delivery: RiderDeliverySummary;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  assigned: { label: 'New Pickup', color: 'text-amber-600 bg-amber-50' },
  accepted: { label: 'Accepted', color: 'text-blue-600 bg-blue-50' },
  in_progress: { label: 'In Transit', color: 'text-indigo-600 bg-indigo-50' },
};

export function RiderDeliveryCard({ delivery }: RiderDeliveryCardProps) {
  const status = statusLabels[delivery.assignment_status] || {
    label: delivery.assignment_status,
    color: 'text-slate-600 bg-slate-50',
  };
  const priceBadge = riderPriceReviewBadgeLabel(delivery);

  return (
    <article className="relative rounded-card border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={`/rider/delivery/${delivery.id}`}
        className="absolute inset-0 z-0 rounded-card"
        aria-label={`View delivery ${delivery.order_number}`}
      />
      <div className="relative z-10 pointer-events-none">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{delivery.order_number}</p>
            <p className="mt-0.5 font-semibold text-slate-900">
              {formatCurrency(delivery.total)}
            </p>
          </div>
          <span
            className={cn(
              'rounded-pill px-2.5 py-0.5 text-xs font-medium',
              status.color
            )}
          >
            {status.label}
          </span>
        </div>
        {priceBadge && (
          <span
            className={cn(
              'mb-3 inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium',
              priceBadge === 'Ready for pickup'
                ? 'bg-success-light text-success'
                : priceBadge === 'Cancelled'
                  ? 'bg-error-light text-error'
                  : 'bg-warning-light text-warning'
            )}
          >
            {priceBadge}
          </span>
        )}

        <div className="mb-3 flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="line-clamp-2">{delivery.delivery_address}</span>
        </div>

        <div className="mb-3 space-y-1 text-sm text-slate-600">
          <div>
            <span className="text-slate-500">Customer:</span>{' '}
            {delivery.customer_name} &middot; {delivery.item_count} item
            {delivery.item_count !== 1 ? 's' : ''}
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            <CustomerPhoneLink phone={delivery.customer_phone} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {delivery.payment_method === 'cod' && (
              <span className="flex items-center gap-1 rounded-pill bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                <Banknote className="h-3 w-3" />
                COD
              </span>
            )}
            {delivery.is_high_value && (
              <span className="flex items-center gap-1 rounded-pill bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                <ShieldAlert className="h-3 w-3" />
                High Value
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <span>{formatRelativeTime(delivery.assigned_at)}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </article>
  );
}
