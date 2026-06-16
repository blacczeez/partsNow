import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage } from '@/lib/integrations/wati';
import { resetConversation, type WhatsAppConversation } from '../conversation';
import type { User } from '@/lib/types/database';

export async function handleClarification(
  phone: string,
  text: string,
  conversation: WhatsAppConversation,
  user: User
): Promise<void> {
  const context = conversation.context as { orderId?: string };
  const orderId = context.orderId;

  if (!orderId) {
    await resetConversation(phone);
    await sendTextMessage(phone, 'Sorry, we could not find the order. Please try again.');
    return;
  }

  const response = text.trim();
  if (response.length < 1) {
    await sendTextMessage(phone, 'Please provide more details to help our runner find the right part.');
    return;
  }

  const supabase = createServiceClient();

  // Get current thread
  const { data: rawOrder } = await supabase
    .from('orders')
    .select('clarification_thread, order_number')
    .eq('id', orderId)
    .single();

  const order = rawOrder as { clarification_thread: unknown[]; order_number: string } | null;

  if (!order) {
    await resetConversation(phone);
    await sendTextMessage(phone, 'Order not found. Please contact support.');
    return;
  }

  const thread = Array.isArray(order.clarification_thread)
    ? order.clarification_thread
    : [];

  thread.push({
    from: 'customer',
    message: response,
    timestamp: new Date().toISOString(),
  });

  await supabase
    .from('orders')
    .update({
      clarification_thread: thread,
      clarification_status: 'responded',
    })
    .eq('id', orderId);

  // Resume SLA timer — customer responded
  const { resumeSlaTimer } = await import('@/lib/services/sla');
  resumeSlaTimer(orderId).catch(() => {});

  await resetConversation(phone);

  await sendTextMessage(
    phone,
    `Thanks! Your response for order ${order.order_number} has been sent to the runner.`
  );
}
