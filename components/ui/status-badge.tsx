import { cn } from '@/lib/utils/cn';
import { ORDER_STATUS_CONFIG } from '@/lib/constants/order-status';
import type { OrderStatus } from '@/lib/types/database';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  );
}
