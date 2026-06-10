import { config } from '@/lib/config';

export type SettlementFault = 'customer' | 'platform' | 'waived';

export const SETTLEMENT_STATUS = {
  PENDING_PARTS: 'pending_parts',
  PENDING_APPROVAL: 'pending_approval',
  COMPLETED: 'completed',
} as const;

export interface SettlementBreakdown {
  partsSubtotal: number;
  recoverableParts: number;
  serviceFee: number;
  deliveryFee: number;
  returnHandlingFee: number;
  amountReturnedToCustomer: number;
  amountRetainedByPlatform: number;
  totalPaid: number;
  isFullRefund: boolean;
  waiveReturnHandling: boolean;
  fault: SettlementFault;
  partsRecoveryRate: number;
}

export interface SettlementOrderInput {
  subtotal: number;
  markup_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  revised_total?: number | null;
}

export function getTotalPaid(order: SettlementOrderInput): number {
  return order.revised_total ?? order.total;
}

export function calculateReturnHandlingFee(
  partsSubtotal: number,
  waive: boolean
): number {
  if (waive) return 0;

  const { returnHandlingFeeFlat, returnHandlingPartsPercentage, returnHandlingFeeMin, returnHandlingFeeMax } =
    config.settlement;

  const raw =
    returnHandlingFeeFlat +
    partsSubtotal * (returnHandlingPartsPercentage / 100);

  return Math.min(returnHandlingFeeMax, Math.max(returnHandlingFeeMin, raw));
}

export function shouldWaiveReturnHandlingFee(
  totalOrders: number,
  loyaltyTier: string
): boolean {
  if (
    config.settlement.waiveReturnHandlingFirstOrder &&
    totalOrders <= 1
  ) {
    return true;
  }
  if (
    config.settlement.waiveReturnHandlingPartnerTier &&
    loyaltyTier === 'partner'
  ) {
    return true;
  }
  return false;
}

export function calculateDeliverySettlement(params: {
  order: SettlementOrderInput;
  fault: SettlementFault;
  partsRecoveryRate: number;
  waiveReturnHandling?: boolean;
}): SettlementBreakdown {
  const totalPaid = getTotalPaid(params.order);
  const serviceFee = params.order.markup_amount;
  const deliveryFee = params.order.delivery_fee;
  const partsSubtotal = params.order.subtotal;

  const waiveHandling =
    params.waiveReturnHandling ??
    (params.fault === 'platform' || params.fault === 'waived');

  if (params.fault === 'platform') {
    return {
      partsSubtotal,
      recoverableParts: partsSubtotal,
      serviceFee,
      deliveryFee,
      returnHandlingFee: 0,
      amountReturnedToCustomer: totalPaid,
      amountRetainedByPlatform: 0,
      totalPaid,
      isFullRefund: true,
      waiveReturnHandling: true,
      fault: 'platform',
      partsRecoveryRate: params.partsRecoveryRate,
    };
  }

  const effectiveFault: SettlementFault =
    params.fault === 'waived' ? 'waived' : 'customer';

  const returnHandlingFee = calculateReturnHandlingFee(
    partsSubtotal,
    waiveHandling
  );
  const recoverableParts = partsSubtotal * params.partsRecoveryRate;
  const amountReturnedToCustomer = Math.max(0, recoverableParts - returnHandlingFee);

  return {
    partsSubtotal,
    recoverableParts,
    serviceFee,
    deliveryFee,
    returnHandlingFee,
    amountReturnedToCustomer,
    amountRetainedByPlatform: totalPaid - amountReturnedToCustomer,
    totalPaid,
    isFullRefund: amountReturnedToCustomer >= totalPaid,
    waiveReturnHandling: waiveHandling,
    fault: effectiveFault,
    partsRecoveryRate: params.partsRecoveryRate,
  };
}

export function defaultFaultForFailureReason(
  reason: string
): SettlementFault | 'review' {
  switch (reason) {
    case 'customer_unavailable':
    case 'customer_refused':
      return 'customer';
    case 'wrong_address':
    case 'other':
      return 'review';
    default:
      return 'review';
  }
}

export function requiresManualSettlementApproval(totalPaid: number): boolean {
  return totalPaid >= config.settlement.highValueManualSettlement;
}
