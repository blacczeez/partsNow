'use client';

import { ChevronRight, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeliveryTierBadge } from '@/components/orders/delivery-tier-badge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/format';
import Link from 'next/link';
import type { OrderStatus } from '@/lib/types/database';

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: OrderStatus;
    total: number;
    created_at: string;
    delivery_tier?: string | null;
    total_weight_kg?: number | null;
    order_items: Array<{
      description: string;
      quantity: number;
    }>;
  };
}

export function OrderCard({ order }: OrderCardProps) {
  const itemsSummary = order.order_items
    .map((item) => `${item.quantity}x ${item.description}`)
    .join(', ');

  return (
    <Link href={`/order/${order.id}`}>
      <div className="mb-4 rounded-card border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{order.order_number}</p>
            <p className="mt-0.5 font-semibold text-slate-900">
              {formatCurrency(order.total)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <p className="mb-2 line-clamp-2 text-sm text-slate-600">{itemsSummary}</p>

        {(order.delivery_tier || order.total_weight_kg != null) && (
          <div className="mb-3">
            <DeliveryTierBadge
              tier={order.delivery_tier}
              totalWeightKg={order.total_weight_kg}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatRelativeTime(order.created_at)}</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}
