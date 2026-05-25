'use client';

import { useRealtimeOrder } from '@/lib/hooks/use-realtime-order';
import { StatusBadge } from '@/components/ui/status-badge';
import { ORDER_STATUS_CONFIG } from '@/lib/constants/order-status';
import { cn } from '@/lib/utils/cn';
import type { OrderStatus } from '@/lib/types/database';

interface OrderStatusLiveProps {
  orderId: string;
  initialStatus: OrderStatus;
  onStatusChange?: (newStatus: OrderStatus) => void;
}

export function OrderStatusLive({
  orderId,
  initialStatus,
  onStatusChange,
}: OrderStatusLiveProps) {
  const { order, isConnected } = useRealtimeOrder(orderId);

  const currentStatus = order?.status ?? initialStatus;
  const isActive = !['delivered', 'cancelled', 'rejected', 'failed'].includes(
    currentStatus
  );

  // Notify parent of status changes
  if (order?.status && order.status !== initialStatus && onStatusChange) {
    onStatusChange(order.status);
  }

  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={currentStatus} />
      {isActive && (
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected ? 'animate-pulse bg-success' : 'bg-slate-300'
            )}
          />
          <span className="text-xs text-slate-400">
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      )}
    </div>
  );
}
