import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';
import { ORDER_STATUS_CONFIG } from '@/lib/constants/order-status';
import type { OrderStatus } from '@/lib/types/database';

const TIMELINE_STEPS: Array<{
  status: OrderStatus;
  label: string;
}> = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'sourcing', label: 'Sourcing Parts' },
  { status: 'picked', label: 'Parts Collected' },
  { status: 'dispatched', label: 'On the Way' },
  { status: 'delivered', label: 'Delivered' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  sourcing: 2,
  picked: 3,
  dispatched: 4,
  delivered: 5,
};

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  timestamps: {
    created_at: string;
    confirmed_at: string | null;
    sourcing_started_at: string | null;
    picked_at: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    cancelled_at: string | null;
  };
}

export function OrderTimeline({ currentStatus, timestamps }: OrderTimelineProps) {
  const isCancelled = ['cancelled', 'rejected', 'failed'].includes(currentStatus);
  const currentIdx = STATUS_ORDER[currentStatus] ?? -1;

  const timestampMap: Record<string, string | null> = {
    pending: timestamps.created_at,
    confirmed: timestamps.confirmed_at,
    sourcing: timestamps.sourcing_started_at,
    picked: timestamps.picked_at,
    dispatched: timestamps.dispatched_at,
    delivered: timestamps.delivered_at,
  };

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, idx) => {
        const isCompleted = currentIdx > idx || (currentIdx === idx && currentStatus === 'delivered');
        const isCurrent = currentIdx === idx && !isCancelled;
        const isPending = currentIdx < idx;
        const timestamp = timestampMap[step.status];

        return (
          <div key={step.status} className="flex gap-3">
            {/* Line + Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                  isCompleted
                    ? 'border-success bg-success text-white'
                    : isCurrent
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 bg-white'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isCurrent ? (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                ) : (
                  <Clock className="h-3 w-3 text-slate-300" />
                )}
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-6',
                    isCompleted ? 'bg-success' : 'bg-slate-200'
                  )}
                />
              )}
            </div>

            {/* Label + Time */}
            <div className="pb-4 pt-0.5">
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'
                )}
              >
                {step.label}
              </p>
              {timestamp && (isCompleted || isCurrent) && (
                <p className="text-xs text-slate-400">
                  {formatRelativeTime(timestamp)}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Cancellation status */}
      {isCancelled && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-error bg-error text-white">
              <span className="text-xs font-bold">!</span>
            </div>
          </div>
          <div className="pt-0.5">
            <p className="text-sm font-medium text-error">
              {ORDER_STATUS_CONFIG[currentStatus].label}
            </p>
            {timestamps.cancelled_at && (
              <p className="text-xs text-slate-400">
                {formatRelativeTime(timestamps.cancelled_at)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
