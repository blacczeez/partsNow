'use client';

import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import {
  getRunnerPriceReviewPhase,
  type RunnerPriceReviewPhase,
} from '@/lib/utils/runner-price-review';
import { cn } from '@/lib/utils/cn';

interface RiderPriceStatusBannerProps {
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
    title: 'Price accepted — ready for pickup',
    tone: 'border-success/30 bg-success-light text-success',
  },
  cancelled: {
    icon: XCircle,
    title: 'Order cancelled',
    tone: 'border-error/30 bg-error-light text-error',
  },
};

export function RiderPriceStatusBanner({ order, className }: RiderPriceStatusBannerProps) {
  const phase = getRunnerPriceReviewPhase(order);
  if (phase === 'none') return null;

  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-card border px-4 py-3', config.tone, className)}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-semibold">{config.title}</p>

          {phase === 'admin_review' && (
            <p>
              Parts are held at the hub pending ops review. Do not confirm pickup until
              this is resolved. You can decline or hand off this delivery.
            </p>
          )}

          {phase === 'customer_decision' && (
            <>
              <p>
                The customer must accept the updated price before pickup. You can hand
                this off to another rider while waiting.
              </p>
              {(order.price_topup_amount ?? 0) > 0 && (
                <p className="text-xs opacity-90">
                  Customer top-up: {formatCurrency(order.price_topup_amount!)}
                </p>
              )}
            </>
          )}

          {phase === 'approved' && (
            <p>The customer accepted the updated price. You can confirm pickup.</p>
          )}

          {phase === 'cancelled' && (
            <p>
              This order was cancelled after a price dispute. Release the delivery and
              return to your dashboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function riderPriceReviewBadgeLabel(
  order: RiderPriceStatusBannerProps['order']
): string | null {
  const phase = getRunnerPriceReviewPhase(order);
  switch (phase) {
    case 'admin_review':
      return 'Admin review';
    case 'customer_decision':
      return 'Awaiting customer';
    case 'approved':
      return 'Ready for pickup';
    case 'cancelled':
      return 'Cancelled';
    default:
      return null;
  }
}
