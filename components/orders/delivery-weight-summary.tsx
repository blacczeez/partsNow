import { Scale, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { PricingBreakdown } from '@/lib/types/orders';

interface DeliveryWeightSummaryProps {
  pricing: Pick<
    PricingBreakdown,
    | 'totalWeightKg'
    | 'deliveryTierLabel'
    | 'deliveryFee'
    | 'deliveryFeeLabel'
    | 'freeDeliveryApplied'
    | 'deliveryType'
  >;
  compact?: boolean;
}

export function DeliveryWeightSummary({ pricing, compact = false }: DeliveryWeightSummaryProps) {
  if (pricing.totalWeightKg == null) return null;

  if (compact) {
    return (
      <p className="text-xs text-slate-500">
        {pricing.totalWeightKg} kg
        {pricing.deliveryTierLabel ? ` · ${pricing.deliveryTierLabel}` : ''}
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <Scale className="h-4 w-4 text-slate-400" />
        <span>
          Total weight: <strong>{pricing.totalWeightKg} kg</strong>
          {pricing.deliveryTierLabel ? ` (${pricing.deliveryTierLabel})` : ''}
        </span>
      </div>
      {pricing.deliveryType && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Truck className="h-4 w-4 text-slate-400" />
          <span>
            {pricing.deliveryType === 'express' ? 'Express delivery' : 'Standard delivery'}
            {pricing.deliveryFeeLabel ? ` — ${pricing.deliveryFeeLabel}` : ''}
          </span>
        </div>
      )}
      <p className="text-sm text-slate-600">
        Delivery fee:{' '}
        <strong>
          {pricing.deliveryFee === 0 ? 'FREE' : formatCurrency(pricing.deliveryFee)}
        </strong>
        {pricing.freeDeliveryApplied ? ' (order value discount)' : ''}
      </p>
    </div>
  );
}
