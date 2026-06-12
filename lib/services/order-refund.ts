import { createServiceClient } from '@/lib/supabase/service';
import { refundTransaction } from '@/lib/integrations/paystack';
import { creditWalletAsService } from './wallet';
import { throwIfSupabaseError } from '@/lib/utils/supabase-errors';
import { AUDIT_ACTIONS } from '@/lib/constants/audit-log';
import { writeAuditLog, auditDetails } from '@/lib/services/audit-log';

interface RefundableOrder {
  id: string;
  customer_id: string;
  order_number: string;
  total: number;
  revised_total: number | null;
  payment_method: string;
  payment_status: string;
  payment_reference: string | null;
}

export function getOrderRefundAmount(order: {
  total: number;
  revised_total?: number | null;
}): number {
  return order.revised_total ?? order.total;
}

/**
 * Refund a paid order to the original payment method (wallet credit or Paystack card refund).
 */
export async function refundOrderPayment(
  orderId: string,
  description?: string,
  actorId?: string
): Promise<{ refunded: boolean; amount: number }> {
  const db = createServiceClient();

  const { data: order, error } = await db
    .from('orders')
    .select(
      'id, customer_id, order_number, total, revised_total, payment_method, payment_status, payment_reference'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('Order not found');

  const typed = order as RefundableOrder;

  if (typed.payment_status !== 'paid') {
    return { refunded: false, amount: 0 };
  }

  const amount = getOrderRefundAmount(typed);
  const refundDescription =
    description ?? `Refund for order ${typed.order_number}`;

  let provider = 'wallet';

  if (typed.payment_method === 'card' && typed.payment_reference) {
    await refundTransaction(typed.payment_reference, amount);
    provider = 'paystack';
  } else if (
    typed.payment_method === 'wallet' ||
    typed.payment_method === 'bank_transfer' ||
    typed.payment_method === 'card'
  ) {
    await creditWalletAsService(
      typed.customer_id,
      amount,
      `refund_${orderId}`,
      refundDescription,
      {
        metadata: {
          kind: 'refund',
          source: 'refund',
          order_id: orderId,
          order_number: typed.order_number,
        },
      }
    );
    provider = typed.payment_method === 'card' ? 'wallet_fallback' : 'wallet';
  } else {
    return { refunded: false, amount: 0 };
  }

  const { error: updateError } = await db
    .from('orders')
    .update({ payment_status: 'refunded' })
    .eq('id', orderId)
    .eq('payment_status', 'paid');

  throwIfSupabaseError(updateError, 'Failed to update payment status after refund');

  await db.from('payment_events').insert({
    order_id: orderId,
    type: 'refund_completed',
    amount,
    provider,
    provider_reference: typed.payment_reference,
    status: 'success',
  });

  await writeAuditLog({
    userId: actorId ?? null,
    action: AUDIT_ACTIONS.PAYMENT_REFUNDED,
    entityType: 'order',
    entityId: orderId,
    oldValues: { paymentStatus: 'paid' },
    newValues: auditDetails(
      `Full refund ₦${amount.toLocaleString('en-NG')} for ${typed.order_number}`,
      {
        orderNumber: typed.order_number,
        amount,
        paymentMethod: typed.payment_method,
        provider,
      }
    ),
  });

  return { refunded: true, amount };
}

/**
 * Partial refund for delivery failure settlement (wallet credit or Paystack partial).
 */
export async function refundOrderPartial(
  orderId: string,
  amount: number,
  description?: string,
  actorId?: string
): Promise<{ refunded: boolean; amount: number }> {
  if (amount <= 0) {
    return { refunded: false, amount: 0 };
  }

  const db = createServiceClient();

  const { data: order, error } = await db
    .from('orders')
    .select(
      'id, customer_id, order_number, total, revised_total, payment_method, payment_status, payment_reference'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('Order not found');

  const typed = order as RefundableOrder;

  if (typed.payment_status !== 'paid') {
    return { refunded: false, amount: 0 };
  }

  const totalPaid = getOrderRefundAmount(typed);
  if (amount > totalPaid) {
    throw new Error('Partial refund exceeds amount paid');
  }

  const refundDescription =
    description ?? `Partial refund for order ${typed.order_number}`;

  let provider = 'wallet';

  if (typed.payment_method === 'card' && typed.payment_reference) {
    await refundTransaction(typed.payment_reference, amount);
    provider = 'paystack';
  } else if (
    typed.payment_method === 'wallet' ||
    typed.payment_method === 'bank_transfer' ||
    typed.payment_method === 'card'
  ) {
    await creditWalletAsService(
      typed.customer_id,
      amount,
      `partial_refund_${orderId}_${Date.now()}`,
      refundDescription,
      {
        metadata: {
          kind: 'partial_refund',
          source: 'refund',
          order_id: orderId,
          order_number: typed.order_number,
        },
      }
    );
    provider = typed.payment_method === 'card' ? 'wallet_fallback' : 'wallet';
  } else {
    return { refunded: false, amount: 0 };
  }

  await db.from('payment_events').insert({
    order_id: orderId,
    type: 'refund_completed',
    amount,
    provider,
    provider_reference: typed.payment_reference,
    status: 'success',
  });

  await writeAuditLog({
    userId: actorId ?? null,
    action: AUDIT_ACTIONS.PAYMENT_REFUNDED_PARTIAL,
    entityType: 'order',
    entityId: orderId,
    newValues: auditDetails(
      `Partial refund ₦${amount.toLocaleString('en-NG')} for ${typed.order_number}`,
      {
        orderNumber: typed.order_number,
        amount,
        paymentMethod: typed.payment_method,
        provider,
      }
    ),
  });

  return { refunded: true, amount };
}
