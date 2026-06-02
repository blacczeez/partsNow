import { createServiceClient } from '@/lib/supabase/service';
import { sendTemplateMessage, sendTextMessage, sendInteractiveButtons } from '@/lib/integrations/wati';
import { formatCurrency } from '@/lib/utils/format';
import { config } from '@/lib/config';

interface OrderData {
  order_number: string;
  total: number;
  promised_delivery_minutes: number | null;
  customer_id: string;
  status: string;
}

interface CustomerData {
  phone: string;
  full_name: string;
}

async function getOrderWithCustomerPhone(orderId: string) {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from('orders')
    .select('order_number, total, promised_delivery_minutes, customer_id, status')
    .eq('id', orderId)
    .single();

  const typedOrder = order as OrderData | null;
  if (!typedOrder) return null;

  const { data: customer } = await supabase
    .from('users')
    .select('phone, full_name')
    .eq('id', typedOrder.customer_id)
    .single();

  const typedCustomer = customer as CustomerData | null;
  if (!typedCustomer) return null;

  return { order: typedOrder, customer: typedCustomer };
}

export async function notifyOrderConfirmed(orderId: string) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendTemplateMessage(data.customer.phone, 'order_confirmed', {
      '1': data.order.order_number,
      '2': formatCurrency(data.order.total),
      '3': String(data.order.promised_delivery_minutes ?? config.delivery.expressPromiseMinutes),
    });
  } catch (error) {
    console.error('Notification error (order_confirmed):', error);
  }
}

export async function notifyOrderSourcing(orderId: string) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendTextMessage(
      data.customer.phone,
      `Your order ${data.order.order_number} is being sourced! Our runner is at the market finding your parts.`
    );
  } catch (error) {
    console.error('Notification error (order_sourcing):', error);
  }
}

export async function notifyOrderPicked(orderId: string) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendTextMessage(
      data.customer.phone,
      `Parts for order ${data.order.order_number} have been collected! A rider is being assigned for delivery.`
    );
  } catch (error) {
    console.error('Notification error (order_picked):', error);
  }
}

export async function notifyOrderDispatched(
  orderId: string,
  riderName?: string,
  trackingUrl?: string
) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    // Look up rider info if not provided
    let resolvedRiderName = riderName ?? 'Your rider';
    let riderPhone = '';

    if (!riderName) {
      const supabase = createServiceClient();
      const { data: assignment } = await supabase
        .from('order_assignments')
        .select('assignee_id')
        .eq('order_id', orderId)
        .eq('role', 'rider')
        .in('status', ['assigned', 'accepted', 'in_progress'])
        .single();

      const typedAssignment = assignment as { assignee_id: string } | null;
      if (typedAssignment) {
        const { data: rider } = await supabase
          .from('users')
          .select('full_name, phone')
          .eq('id', typedAssignment.assignee_id)
          .single();

        const typedRider = rider as { full_name: string; phone: string } | null;
        if (typedRider) {
          resolvedRiderName = typedRider.full_name;
          riderPhone = typedRider.phone;
        }
      }
    }

    await sendTemplateMessage(data.customer.phone, 'order_dispatched', {
      '1': data.order.order_number,
      '2': resolvedRiderName,
      '3': String(config.delivery.expressPromiseMinutes),
      '4': trackingUrl ?? `${config.app.url}/order/${orderId}`,
      '5': riderPhone || 'N/A',
    });
  } catch (error) {
    console.error('Notification error (order_dispatched):', error);
  }
}

export async function notifyOrderNearby(orderId: string, etaMinutes: number) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendTextMessage(
      data.customer.phone,
      `Almost there! Your order ${data.order.order_number} will arrive in about ${etaMinutes} minute${etaMinutes === 1 ? '' : 's'}.`
    );
  } catch (error) {
    console.error('Notification error (order_nearby):', error);
  }
}

export async function notifyOrderDelivered(orderId: string) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendTemplateMessage(data.customer.phone, 'order_delivered', {
      '1': data.order.order_number,
    });
  } catch (error) {
    console.error('Notification error (order_delivered):', error);
  }
}

export async function notifyOrderCancelled(orderId: string, reason: string) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendTextMessage(
      data.customer.phone,
      `Order ${data.order.order_number} has been cancelled.\nReason: ${reason}\n\nIf you were charged, a refund will be processed to your wallet.`
    );
  } catch (error) {
    console.error('Notification error (order_cancelled):', error);
  }
}

export async function notifyWalletTopUp(
  userId: string,
  amount: number,
  newBalance: number
) {
  try {
    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from('users')
      .select('phone')
      .eq('id', userId)
      .single();

    const typedUser = user as { phone: string } | null;
    if (!typedUser) return;

    await sendTemplateMessage(typedUser.phone, 'wallet_topup_success', {
      '1': formatCurrency(amount),
      '2': formatCurrency(newBalance),
    });
  } catch (error) {
    console.error('Notification error (wallet_topup):', error);
  }
}

export async function notifyClarificationRequest(
  orderId: string,
  question: string
) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendInteractiveButtons(
      data.customer.phone,
      `Question about your order ${data.order.order_number}:\n\n${question}\n\nPlease reply with more details.`,
      [
        { id: `clarify_${orderId}`, title: 'Reply' },
        { id: `call_support`, title: 'Call Support' },
      ]
    );
  } catch (error) {
    console.error('Notification error (clarification_request):', error);
  }
}

export async function notifyDeliveryFailed(orderId: string, reason: string) {
  try {
    const data = await getOrderWithCustomerPhone(orderId);
    if (!data) return;

    await sendTextMessage(
      data.customer.phone,
      `Delivery update for order ${data.order.order_number}:\n\nWe were unable to complete the delivery. Reason: ${reason}\n\nOur team will reach out to reschedule.`
    );
  } catch (error) {
    console.error('Notification error (delivery_failed):', error);
  }
}
