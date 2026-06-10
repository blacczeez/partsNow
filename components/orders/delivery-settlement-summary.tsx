import { formatCurrency } from '@/lib/utils/format';

interface SettlementBreakdown {
  recoverableParts?: number;
  returnHandlingFee?: number;
  amountReturnedToCustomer?: number;
  serviceFee?: number;
  deliveryFee?: number;
  isFullRefund?: boolean;
}

interface DeliverySettlementSummaryProps {
  settlementStatus: string | null;
  settlementRefundAmount: number | null;
  settlementBreakdown: SettlementBreakdown | null;
  paymentStatus: string;
}

export function DeliverySettlementSummary({
  settlementStatus,
  settlementRefundAmount,
  settlementBreakdown,
  paymentStatus,
}: DeliverySettlementSummaryProps) {
  if (!settlementStatus) return null;

  if (settlementStatus === 'completed' && settlementBreakdown) {
    const refund = settlementRefundAmount ?? settlementBreakdown.amountReturnedToCustomer ?? 0;

    return (
      <div className="rounded-card border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-slate-900">Settlement</h3>
        {settlementBreakdown.isFullRefund ? (
          <p className="text-sm text-slate-700">
            Full refund: <strong>{formatCurrency(refund)}</strong>
          </p>
        ) : (
          <div className="space-y-1 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Recoverable parts</span>
              <span>{formatCurrency(settlementBreakdown.recoverableParts ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Return & handling fee</span>
              <span>−{formatCurrency(settlementBreakdown.returnHandlingFee ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-medium text-slate-900">
              <span>Refund to you</span>
              <span>{formatCurrency(refund)}</span>
            </div>
            <p className="pt-2 text-xs text-slate-500">
              Service fee ({formatCurrency(settlementBreakdown.serviceFee ?? 0)}) and delivery
              fee ({formatCurrency(settlementBreakdown.deliveryFee ?? 0)}) are non-refundable
              after dispatch.
            </p>
          </div>
        )}
        {paymentStatus === 'partially_refunded' && (
          <p className="mt-2 text-xs text-slate-500">Partial refund processed.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-sm font-semibold text-amber-900">Settlement in progress</h3>
      <p className="mt-1 text-sm text-amber-800">
        We are processing your delivery failure settlement per our policy. Service and delivery
        fees may apply. You will be notified when the refund amount is finalized.
      </p>
    </div>
  );
}
