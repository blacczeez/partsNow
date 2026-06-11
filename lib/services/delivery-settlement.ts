import { createServiceClient } from '@/lib/supabase/service';
import { config } from '@/lib/config';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import {
  SETTLEMENT_STATUS,
  calculateDeliverySettlement,
  getTotalPaid,
  requiresManualSettlementApproval,
  shouldWaiveReturnHandlingFee,
  type SettlementBreakdown,
  type SettlementFault,
} from '@/lib/utils/delivery-settlement';
import { PARTS_CUSTODY } from '@/lib/constants/delivery-failure';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';
import { refundOrderPartial, refundOrderPayment } from './order-refund';
import { notifyDeliverySettlement } from './notifications';

interface SettlementOrderRow {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  subtotal: number;
  markup_amount: number;
  delivery_fee: number;
  discount_amount: number;
  total: number;
  revised_total: number | null;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
  parts_custody: string | null;
  settlement_status: string | null;
  settlement_fault: string | null;
  parts_recovery_rate: number | null;
  settlement_refund_amount: number | null;
}

async function loadSettlementOrder(orderId: string): Promise<SettlementOrderRow> {
  const db = createServiceClient();
  const { data, error } = await db
    .from('orders')
    .select(
      'id, order_number, customer_id, status, subtotal, markup_amount, delivery_fee, discount_amount, total, revised_total, payment_method, payment_status, payment_reference, parts_custody, settlement_status, settlement_fault, parts_recovery_rate, settlement_refund_amount'
    )
    .eq('id', orderId)
    .single();

  if (error || !data) throw new Error('Order not found');
  return data as SettlementOrderRow;
}

async function loadCustomerWaiveContext(customerId: string) {
  const db = createServiceClient();
  const { data } = await db
    .from('users')
    .select('total_orders, loyalty_tier')
    .eq('id', customerId)
    .single();

  return {
    totalOrders: data?.total_orders ?? 0,
    loyaltyTier: (data?.loyalty_tier as string) ?? 'new',
  };
}

export function previewSettlement(
  order: SettlementOrderRow,
  fault: SettlementFault,
  partsRecoveryRate: number,
  waiveReturnHandling?: boolean
): SettlementBreakdown {
  return calculateDeliverySettlement({
    order,
    fault,
    partsRecoveryRate,
    waiveReturnHandling,
  });
}

/** Start settlement after terminal delivery failure (no money moves yet). */
export async function initiateDeliverySettlement(
  orderId: string,
  defaultFault: SettlementFault,
  failureReason: string
): Promise<void> {
  const db = createServiceClient();
  const order = await loadSettlementOrder(orderId);

  if (order.settlement_status === SETTLEMENT_STATUS.COMPLETED) {
    return;
  }

  const { totalOrders, loyaltyTier } = await loadCustomerWaiveContext(
    order.customer_id
  );
  const waive = shouldWaiveReturnHandlingFee(totalOrders, loyaltyTier);
  const fault =
    defaultFault === 'customer' && waive ? 'waived' : defaultFault;

  const breakdown = calculateDeliverySettlement({
    order,
    fault,
    partsRecoveryRate: config.settlement.partsRecoveryRateDefault / 100,
    waiveReturnHandling: waive,
  });

  const { error } = await db
    .from('orders')
    .update({
      settlement_status: SETTLEMENT_STATUS.PENDING_PARTS,
      settlement_fault: fault,
      parts_recovery_rate: config.settlement.partsRecoveryRateDefault / 100,
      return_handling_fee: breakdown.returnHandlingFee,
      settlement_breakdown: { ...breakdown, failureReason },
    })
    .eq('id', orderId);

  throwIfSupabaseError(error, 'Failed to initiate settlement');

  await writeAuditLog({
    action: AUDIT_ACTIONS.ORDER_SETTLEMENT_INITIATED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails(`Settlement initiated — ${fault} fault`, {
      orderNumber: order.order_number,
      fault,
      failureReason,
      returnHandlingFee: breakdown.returnHandlingFee,
    }),
  });
}

export async function updateSettlementDraft(
  orderId: string,
  updates: {
    fault?: SettlementFault;
    partsRecoveryRate?: number;
  },
  actorId?: string
): Promise<SettlementBreakdown> {
  const db = createServiceClient();
  const order = await loadSettlementOrder(orderId);

  if (order.settlement_status === SETTLEMENT_STATUS.COMPLETED) {
    throw new Error('Settlement already completed');
  }

  const fault = (updates.fault ?? order.settlement_fault ?? 'customer') as SettlementFault;
  const partsRecoveryRate =
    updates.partsRecoveryRate ??
    order.parts_recovery_rate ??
    config.settlement.partsRecoveryRateDefault / 100;

  const { totalOrders, loyaltyTier } = await loadCustomerWaiveContext(
    order.customer_id
  );
  const autoWaive = shouldWaiveReturnHandlingFee(totalOrders, loyaltyTier);
  const waive = fault === 'waived' || fault === 'platform' || autoWaive;

  const breakdown = calculateDeliverySettlement({
    order,
    fault: fault === 'waived' ? 'waived' : fault,
    partsRecoveryRate,
    waiveReturnHandling: waive,
  });

  const nextStatus =
    order.parts_custody === PARTS_CUSTODY.AT_HUB ||
    !config.settlement.requiresPartsAtHub
      ? requiresManualSettlementApproval(getTotalPaid(order))
        ? SETTLEMENT_STATUS.PENDING_APPROVAL
        : SETTLEMENT_STATUS.PENDING_APPROVAL
      : SETTLEMENT_STATUS.PENDING_PARTS;

  const { error } = await db
    .from('orders')
    .update({
      settlement_fault: fault,
      parts_recovery_rate: partsRecoveryRate,
      return_handling_fee: breakdown.returnHandlingFee,
      settlement_breakdown: breakdown,
      settlement_status: order.settlement_status ?? nextStatus,
    })
    .eq('id', orderId);

  throwIfSupabaseError(error, 'Failed to update settlement draft');

  await writeAuditLog({
    userId: actorId ?? null,
    action: AUDIT_ACTIONS.ORDER_SETTLEMENT_UPDATED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails(`Settlement draft updated — ${fault} fault`, {
      orderNumber: order.order_number,
      fault,
      partsRecoveryRate,
      refundToCustomer: breakdown.amountReturnedToCustomer,
    }),
  });

  return breakdown;
}

export async function onPartsReturnedForSettlement(
  orderId: string,
  partsRecoveryRate?: number
): Promise<void> {
  const order = await loadSettlementOrder(orderId);

  if (!order.settlement_status || order.settlement_status === SETTLEMENT_STATUS.COMPLETED) {
    return;
  }

  const rate =
    partsRecoveryRate ??
    order.parts_recovery_rate ??
    config.settlement.partsRecoveryRateDefault / 100;

  await updateSettlementDraft(orderId, { partsRecoveryRate: rate });

  const db = createServiceClient();
  const totalPaid = getTotalPaid(order);
  const nextStatus = requiresManualSettlementApproval(totalPaid)
    ? SETTLEMENT_STATUS.PENDING_APPROVAL
    : SETTLEMENT_STATUS.PENDING_APPROVAL;

  await db
    .from('orders')
    .update({ settlement_status: nextStatus })
    .eq('id', orderId);

  if (!requiresManualSettlementApproval(totalPaid)) {
    try {
      await executeDeliverySettlement(orderId);
    } catch (err) {
      console.error('Auto settlement after parts return failed:', err);
    }
  }
}

/** Execute settlement — moves money per policy. */
export async function executeDeliverySettlement(
  orderId: string,
  actorId?: string
): Promise<SettlementBreakdown> {
  const db = createServiceClient();
  const order = await loadSettlementOrder(orderId);

  if (order.settlement_status === SETTLEMENT_STATUS.COMPLETED) {
    throw new Error('Settlement already completed');
  }

  if (
    config.settlement.requiresPartsAtHub &&
    order.parts_custody !== PARTS_CUSTODY.AT_HUB &&
    order.settlement_fault !== 'platform'
  ) {
    throw new Error('Parts must be returned to hub before settlement');
  }

  const fault = (order.settlement_fault ?? 'customer') as SettlementFault;
  const partsRecoveryRate =
    order.parts_recovery_rate ?? config.settlement.partsRecoveryRateDefault / 100;

  const { totalOrders, loyaltyTier } = await loadCustomerWaiveContext(
    order.customer_id
  );
  const autoWaive = shouldWaiveReturnHandlingFee(totalOrders, loyaltyTier);
  const breakdown = calculateDeliverySettlement({
    order,
    fault,
    partsRecoveryRate,
    waiveReturnHandling:
      fault === 'platform' || fault === 'waived' || autoWaive,
  });

  const refundAmount = breakdown.amountReturnedToCustomer;

  if (order.payment_method === 'cod') {
    // COD: no wallet/card movement
  } else if (order.payment_status === 'paid') {
    if (breakdown.isFullRefund) {
      await refundOrderPayment(
        orderId,
        `Full refund — delivery settlement for ${order.order_number}`,
        actorId
      );
    } else if (refundAmount > 0) {
      await refundOrderPartial(
        orderId,
        refundAmount,
        `Partial refund — delivery settlement for ${order.order_number}`,
        actorId
      );
    }
  }

  const newPaymentStatus =
    refundAmount <= 0
      ? order.payment_status
      : breakdown.isFullRefund
        ? 'refunded'
        : 'partially_refunded';

  const { error } = await db
    .from('orders')
    .update({
      settlement_status: SETTLEMENT_STATUS.COMPLETED,
      settlement_refund_amount: refundAmount,
      return_handling_fee: breakdown.returnHandlingFee,
      settlement_breakdown: breakdown,
      settlement_completed_at: new Date().toISOString(),
      payment_status:
        order.payment_method === 'cod' ? order.payment_status : newPaymentStatus,
    })
    .eq('id', orderId);

  throwIfSupabaseError(error, 'Failed to complete settlement');

  await db.from('payment_events').insert({
    order_id: orderId,
    type: 'delivery_failure_settlement',
    amount: refundAmount,
    provider: order.payment_method,
    status: 'success',
    raw_response: breakdown,
  });

  notifyDeliverySettlement(orderId, breakdown).catch(() => {});

  await writeAuditLog({
    userId: actorId ?? null,
    action: AUDIT_ACTIONS.ORDER_SETTLEMENT_EXECUTED,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails(
      `Settlement executed — refund ₦${refundAmount.toLocaleString('en-NG')}`,
      {
        orderNumber: order.order_number,
        fault,
        refundAmount,
        returnHandlingFee: breakdown.returnHandlingFee,
        isFullRefund: breakdown.isFullRefund,
      }
    ),
  });

  return breakdown;
}

/** Admin resolves wrong-address escalation to terminal + settlement. */
export async function finalizeAdminReviewSettlement(
  orderId: string,
  fault: SettlementFault,
  terminalStatus: 'failed' | 'rejected' | 'cancelled'
): Promise<void> {
  const db = createServiceClient();

  const { error } = await db
    .from('orders')
    .update({
      status: terminalStatus,
      delivery_resolution: null,
    })
    .eq('id', orderId);

  throwIfSupabaseError(error, 'Failed to update order status');

  if (fault === 'platform') {
    await initiateDeliverySettlement(orderId, 'platform', 'admin_review');
    await executeDeliverySettlement(orderId);
  } else {
    await initiateDeliverySettlement(orderId, fault, 'admin_review');
  }
}
