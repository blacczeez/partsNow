'use client';

import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import {
  getRunnerPriceReviewPhase,
  type RunnerPriceReviewPhase,
} from '@/lib/utils/runner-price-review';
import { cn } from '@/lib/utils/cn';

interface RunnerPriceStatusBannerProps {
  order: {
    status: string;
    price_review_status: string;
    price_topup_amount?: number | null;
    original_total?: number | null;
    revised_total?: number | null;
    order_items?: Array<{
      price_review_status?: string | null;
      description?: string;
      vendor_price?: number | null;
      expected_vendor_price?: number | null;
    }>;
  };
  className?: string;
}

const phaseConfig: Record<
  Exclude<RunnerPriceReviewPhase, 'none'>,
  {
    icon: typeof AlertTriangle;
    title: string;
    tone: string;
  }
> = {
  admin_review: {
    icon: Clock,
    title: 'Waiting for admin',
    tone: 'border-warning/30 bg-warning-light text-warning',
  },
  customer_decision: {
    icon: Clock,
    title: 'Waiting for customer',
    tone: 'border-warning/30 bg-warning-light text-warning',
  },
  approved: {
    icon: CheckCircle,
    title: 'Customer accepted new price',
    tone: 'border-success/30 bg-success-light text-success',
  },
  cancelled: {
    icon: XCircle,
    title: 'Order cancelled',
    tone: 'border-error/30 bg-error-light text-error',
  },
};

export function RunnerPriceStatusBanner({ order, className }: RunnerPriceStatusBannerProps) {
  const phase = getRunnerPriceReviewPhase(order);
  if (phase === 'none') return null;

  const config = phaseConfig[phase];
  const Icon = config.icon;
  const reviewItems =
    order.order_items?.filter((i) =>
      ['pending', 'awaiting_customer', 'customer_approved', 'rejected'].includes(
        i.price_review_status ?? ''
      )
    ) ?? [];

  return (
    <div className={cn('rounded-card border px-4 py-3', config.tone, className)}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-semibold">{config.title}</p>

          {phase === 'admin_review' && (
            <p>
              You entered a vendor price above target. Ops is reviewing and will notify
              the customer if needed. Do not hand off until this is resolved.
            </p>
          )}

          {phase === 'customer_decision' && (
            <>
              <p>
                Admin notified the customer about the market price change. They must pay
                the difference or cancel for a full refund.
              </p>
              {(order.price_topup_amount ?? 0) > 0 && (
                <p className="text-xs opacity-90">
                  Customer top-up requested:{' '}
                  <span className="font-medium">
                    {formatCurrency(order.price_topup_amount!)}
                  </span>
                  {order.revised_total != null && order.original_total != null && (
                    <>
                      {' '}
                      (order {formatCurrency(order.original_total!)} →{' '}
                      {formatCurrency(order.revised_total!)})
                    </>
                  )}
                </p>
              )}
            </>
          )}

          {phase === 'approved' && (
            <p>
              The customer accepted the updated price. You can complete and hand off to
              the rider.
            </p>
          )}

          {phase === 'cancelled' && (
            <p>
              The customer rejected the price update. This order is cancelled — stop
              sourcing and return any parts if already purchased.
            </p>
          )}

          {reviewItems.length > 0 && phase !== 'cancelled' && (
            <ul className="mt-2 space-y-1 text-xs opacity-90">
              {reviewItems.map((item, idx) => (
                <li key={idx}>
                  {item.description}
                  {item.vendor_price != null && item.expected_vendor_price != null && (
                    <>
                      {' '}
                      — vendor {formatCurrency(item.vendor_price)} vs target{' '}
                      {formatCurrency(item.expected_vendor_price)}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function runnerPriceReviewBadgeLabel(
  order: RunnerPriceStatusBannerProps['order']
): string | null {
  const phase = getRunnerPriceReviewPhase(order);
  switch (phase) {
    case 'admin_review':
      return 'Admin review';
    case 'customer_decision':
      return 'Awaiting customer';
    case 'approved':
      return 'Price accepted';
    case 'cancelled':
      return 'Cancelled';
    default:
      return null;
  }
}
