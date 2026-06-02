import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage, sendInteractiveButtons } from '@/lib/integrations/wati';
import { formatCurrency } from '@/lib/utils/format';
import { config } from '@/lib/config';
import {
  setConversationState,
  resetConversation,
  type WhatsAppConversation,
} from '../conversation';
import { queueVoiceNote } from '../voice-note';
import type { User } from '@/lib/types/database';

interface OrderingContext {
  step?: string;
  items?: Array<{ description: string; price: number; quantity: number }>;
  deliveryAddress?: string;
}

export async function handleOrdering(
  phone: string,
  text: string,
  conversation: WhatsAppConversation,
  user: User
): Promise<void> {
  const context = conversation.context as OrderingContext;
  const step = context.step ?? 'describe_parts';

  if (step === 'describe_parts') {
    // User is describing parts they need
    const description = text.trim();
    if (description.length < 3) {
      await sendTextMessage(phone, 'Please describe the part you need in more detail.');
      return;
    }

    // For MVP, we create a single-item order with price TBD (runner will source)
    // In a more advanced flow, we'd do catalog lookup
    const items = [{ description, price: 0, quantity: 1 }];

    await setConversationState(phone, 'ordering', {
      step: 'confirm_address',
      items,
    });

    // Get saved address from profile
    const workshopAddress = (user.profile as Record<string, unknown>)?.workshop_address;

    if (workshopAddress) {
      await sendInteractiveButtons(
        phone,
        `Got it! You need: ${description}\n\nDeliver to: ${workshopAddress}?`,
        [
          { id: 'confirm_address', title: 'Yes, deliver here' },
          { id: 'change_address', title: 'Different address' },
        ]
      );
    } else {
      await setConversationState(phone, 'ordering', {
        step: 'enter_address',
        items,
      });
      await sendTextMessage(phone, 'Where should we deliver? Please send your address.');
    }
    return;
  }

  if (step === 'confirm_address') {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('yes') || lowerText.includes('confirm') || text === 'confirm_address') {
      const workshopAddress = (user.profile as Record<string, unknown>)?.workshop_address as string;
      await createOrderFromConversation(phone, user, context.items ?? [], workshopAddress);
    } else if (lowerText.includes('different') || lowerText.includes('change') || text === 'change_address') {
      await setConversationState(phone, 'ordering', {
        ...context,
        step: 'enter_address',
      });
      await sendTextMessage(phone, 'Please send the delivery address.');
    } else {
      await sendInteractiveButtons(
        phone,
        'Please confirm the delivery address:',
        [
          { id: 'confirm_address', title: 'Yes, deliver here' },
          { id: 'change_address', title: 'Different address' },
        ]
      );
    }
    return;
  }

  if (step === 'enter_address') {
    const address = text.trim();
    if (address.length < 5) {
      await sendTextMessage(phone, 'Please enter a valid delivery address.');
      return;
    }

    await createOrderFromConversation(phone, user, context.items ?? [], address);
    return;
  }
}

async function createOrderFromConversation(
  phone: string,
  user: User,
  items: Array<{ description: string; price: number; quantity: number }>,
  address: string
): Promise<void> {
  const supabase = createServiceClient();

  try {
    // Generate order number
    const { data: rawOrderNumber } = await supabase.rpc('generate_order_number');
    const orderNumber = rawOrderNumber as string;

    // Calculate pricing (price TBD by runner for voice/text orders)
    const deliveryFee = config.business.standardDeliveryFee;

    // Create order with pending price (runner will fill in vendor prices)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        cluster_id: await getDefaultClusterId(),
        status: 'confirmed',
        delivery_address: address,
        delivery_type: 'express',
        subtotal: 0,
        markup_amount: 0,
        delivery_fee: deliveryFee,
        discount_amount: 0,
        total: deliveryFee,
        payment_method: 'wallet',
        payment_status: 'pending',
        source_channel: 'whatsapp',
        confirmed_at: new Date().toISOString(),
        promised_delivery_minutes: config.delivery.expressPromiseMinutes,
        customer_notes: items.map((i) => i.description).join('; '),
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const typedOrder = order as unknown as { id: string };

    // Insert order items
    const orderItems = items.map((item) => ({
      order_id: typedOrder.id,
      description: item.description,
      quantity: item.quantity,
      selling_price: 0,
    }));

    await supabase.from('order_items').insert(orderItems);

    // Auto-assign runner
    const clusterId = await getDefaultClusterId();
    const { data: rawShifts } = await supabase
      .from('runner_shifts')
      .select('runner_id')
      .eq('cluster_id', clusterId)
      .is('ended_at', null)
      .limit(1);

    const activeShifts = rawShifts as Array<{ runner_id: string }> | null;

    if (activeShifts && activeShifts.length > 0) {
      await supabase.from('order_assignments').insert({
        order_id: typedOrder.id,
        assignee_id: activeShifts[0].runner_id,
        role: 'runner',
        status: 'assigned',
      });

      await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', typedOrder.id);
    }

    await resetConversation(phone);

    await sendTextMessage(
      phone,
      `Order placed! ${orderNumber}\n\nParts: ${items.map((i) => i.description).join(', ')}\nDelivery to: ${address}\nDelivery fee: ${formatCurrency(deliveryFee)}\n\nA runner is sourcing your parts now. We'll update you on progress!`
    );
  } catch (error) {
    console.error('WhatsApp order creation error:', error);
    await resetConversation(phone);
    await sendTextMessage(
      phone,
      'Sorry, there was a problem placing your order. Please try again or contact support.'
    );
  }
}

async function getDefaultClusterId(): Promise<string> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('clusters')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  const typed = data as { id: string } | null;
  if (!typed) throw new Error('No active cluster found');
  return typed.id;
}

export async function handleVoiceNote(
  phone: string,
  mediaUrl: string,
  mediaId: string | undefined,
  conversation: WhatsAppConversation,
  user: User | null
): Promise<void> {
  await queueVoiceNote(phone, user?.id ?? null, mediaUrl, mediaId);

  await sendTextMessage(
    phone,
    'Got your voice note! Our team is processing it and will get back to you shortly with a quote.'
  );

  // Reset to idle — admin will handle voice note manually
  await resetConversation(phone);
}

export async function startOrdering(phone: string): Promise<void> {
  await setConversationState(phone, 'ordering', { step: 'describe_parts' });
  await sendTextMessage(
    phone,
    'What parts do you need? Describe the part, vehicle make/model/year, and any other details.\n\nYou can also send a voice note or photo.'
  );
}
