'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { RiderHistoryEntry } from '@/lib/services/rider';

interface RiderHistoryCardProps {
  delivery: RiderHistoryEntry;
}

export function RiderHistoryCard({ delivery }: RiderHistoryCardProps) {
  const isDelivered = delivery.status === 'delivered';
  const timestamp = delivery.delivered_at || delivery.completed_at;

  return (
    <div className="flex items-center gap-3 rounded-card border border-slate-200 bg-white p-4">
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          isDelivered ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        )}
      >
        {isDelivered ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <XCircle className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900">
            {delivery.order_number}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {formatCurrency(delivery.total)}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="truncate text-xs text-slate-500">
            {delivery.delivery_address}
          </p>
          {timestamp && (
            <p className="ml-2 flex-shrink-0 text-xs text-slate-400">
              {formatRelativeTime(timestamp)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
