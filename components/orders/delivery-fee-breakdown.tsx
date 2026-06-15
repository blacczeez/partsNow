import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';
import type { DeliveryFeeBreakdown } from '@/lib/types/delivery';

interface DeliveryFeeBreakdownPanelProps {
  breakdown: DeliveryFeeBreakdown | Record<string, unknown> | null;
  deliveryFee: number;
  className?: string;
  returnTo?: string;
}

function asBreakdown(
  value: DeliveryFeeBreakdown | Record<string, unknown> | null
): DeliveryFeeBreakdown | null {
  if (!value || typeof value !== 'object') return null;
  if ('totalWeightKg' in value && 'tierLabel' in value) {
    return value as DeliveryFeeBreakdown;
  }
  return null;
}

export function DeliveryFeeBreakdownPanel({
  breakdown,
  deliveryFee,
  className,
  returnTo,
}: DeliveryFeeBreakdownPanelProps) {
  const data = asBreakdown(breakdown);

  return (
    <div className={className}>
      <h4 className="mb-2 text-sm font-medium text-slate-900">How delivery was calculated</h4>
      {data ? (
        <ul className="space-y-1.5 text-sm text-slate-600">
          <li>
            Total package weight: <strong>{data.totalWeightKg} kg</strong>
          </li>
          <li>
            Weight tier: <strong>{data.tierLabel}</strong>
          </li>
          <li>
            Base tier fee: <strong>{formatCurrency(data.baseFee)}</strong>
          </li>
          {data.freeDeliveryApplied ? (
            <li className="text-success">
              Free delivery applied (order value + light/medium tier)
            </li>
          ) : null}
          <li>
            Charged delivery fee:{' '}
            <strong>{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}</strong>
          </li>
          <li>
            Delivery type:{' '}
            <strong>{data.deliveryType === 'express' ? 'Express' : 'Standard'}</strong>
            {data.promisedMinutes ? ` (~${data.promisedMinutes} min)` : ''}
          </li>
          <li>
            Vehicle: <strong>{data.vehicleType}</strong>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          Delivery fee: {deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}
        </p>
      )}
      <Link
        href={
          returnTo
            ? `/how-delivery-works?returnTo=${encodeURIComponent(returnTo)}`
            : '/how-delivery-works?from=cart'
        }
        className="mt-2 inline-block text-sm text-primary hover:underline"
      >
        How delivery pricing works
      </Link>
    </div>
  );
}
