import { formatCurrency } from '@/lib/utils/format';
import type { PricingBreakdown } from '@/lib/types/orders';

interface PricingSummaryProps {
  pricing: PricingBreakdown;
}

export function PricingSummary({ pricing }: PricingSummaryProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Subtotal</span>
        <span className="text-slate-700">{formatCurrency(pricing.subtotal)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Service fee</span>
        <span className="text-slate-700">{formatCurrency(pricing.markupAmount)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Delivery fee</span>
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
