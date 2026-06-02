'use client';

import Link from 'next/link';
import { MapPin, ChevronRight, Banknote, ShieldAlert } from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
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

  return (
    <Link href={`/rider/delivery/${delivery.id}`}>
      <div className="rounded-card border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
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

        <div className="mb-3 flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="line-clamp-2">{delivery.delivery_address}</span>
        </div>

        <div className="mb-3 text-sm text-slate-600">
          <span className="text-slate-500">Customer:</span>{' '}
          {delivery.customer_name} &middot; {delivery.item_count} item
          {delivery.item_count !== 1 ? 's' : ''}
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
    </Link>
  );
}
