import { formatCurrency } from '@/lib/utils/format';
import { getLoyaltyServiceFeeLabel } from '@/lib/utils/loyalty';
import type { PricingBreakdown } from '@/lib/types/orders';

interface PricingSummaryProps {
  pricing: PricingBreakdown;
  /** checkout: base + service fee rows. order: parts total only (service fee included in parts). */
  variant?: 'checkout' | 'order';
}

export function PricingSummary({ pricing, variant = 'checkout' }: PricingSummaryProps) {
  const showServiceFee = variant === 'checkout' && pricing.markupAmount > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {variant === 'order' ? 'Parts' : 'Subtotal'}
        </span>
        <span className="text-slate-700">{formatCurrency(pricing.subtotal)}</span>
      </div>
      {showServiceFee && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {pricing.loyaltyTier
              ? getLoyaltyServiceFeeLabel(
                  pricing.loyaltyTier,
                  undefined,
                  pricing.markupPercentage
                )
              : 'Service fee'}
          </span>
          <span className="text-slate-700">{formatCurrency(pricing.markupAmount)}</span>
        </div>
      )}
      {showServiceFee && (pricing.loyaltySavings ?? 0) > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-success">Loyalty savings</span>
          <span className="text-success">
            -{formatCurrency(pricing.loyaltySavings!)}
          </span>
        </div>
      )}
      {pricing.totalWeightKg != null && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Weight
            {pricing.deliveryTierLabel ? ` (${pricing.deliveryTierLabel})` : ''}
          </span>
          <span className="text-slate-700">{pricing.totalWeightKg} kg</span>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {pricing.deliveryFeeLabel ?? 'Delivery fee'}
        </span>
        <span className="text-slate-700">
          {pricing.deliveryFee === 0
            ? 'FREE'
            : formatCurrency(pricing.deliveryFee)}
        </span>
      </div>
      {pricing.discountAmount > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-success">Discount</span>
          <span className="text-success">
            -{formatCurrency(pricing.discountAmount)}
          </span>
        </div>
      )}
      <div className="border-t border-slate-200 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(pricing.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
