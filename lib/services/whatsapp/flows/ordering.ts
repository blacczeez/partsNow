import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage, sendInteractiveButtons } from '@/lib/integrations/whatsapp';
import { formatCurrency } from '@/lib/utils/format';
import { assignRunner } from '@/lib/services/dispatch';
import {
  setConversationState,
  resetConversation,
  type WhatsAppConversation,
} from '../conversation';
import { queueVoiceNote } from '../voice-note';
import {
  buildWhatsAppDeliveryQuote,
  formatWhatsAppDeliveryQuoteMessage,
  totalWeightFromItems,
  type WhatsAppDeliveryQuote,
} from '../delivery-quote';
import { formatWhatsAppLoyaltyLine } from '@/lib/services/loyalty';
import { getLoyaltyThresholds } from '@/lib/services/loyalty-config';
import { getRuntimeConfig } from '@/lib/services/runtime-config';
import type { User } from '@/lib/types/database';

interface OrderingItem {
  description: string;
  price: number;
  quantity: number;
  weightKg?: number | null;
}

interface OrderingContext {
  step?: string;
  items?: OrderingItem[];
  deliveryAddress?: string;
  quote?: WhatsAppDeliveryQuote;
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
    const description = text.trim();
    if (description.length < 3) {
      await sendTextMessage(phone, 'Please describe the part you need in more detail.');
      return;
    }

    const items: OrderingItem[] = [{ description, price: 0, quantity: 1 }];
    const quote = await buildWhatsAppDeliveryQuote(description, 0);
    const [loyaltyThresholds, runtime] = await Promise.all([
      getLoyaltyThresholds(),
      getRuntimeConfig(),
    ]);
    const loyaltyLine = formatWhatsAppLoyaltyLine(user, loyaltyThresholds, {
      defaultMarkupPercentage: runtime.business.defaultMarkupPercentage,
      loyaltyDiscountsEnabled: runtime.features.loyaltyDiscounts,
    });

    await setConversationState(phone, 'ordering', {
      step: 'confirm_quote',
      items: items.map((item) => ({
        ...item,
        weightKg: quote.weight.totalWeightKg,
      })),
      quote,
    });

    await sendInteractiveButtons(
      phone,
      formatWhatsAppDeliveryQuoteMessage(
        description,
        quote,
        loyaltyLine
      ),
      [
        { id: 'confirm_quote', title: 'Continue' },
        { id: 'cancel_order', title: 'Cancel' },
      ]
    );
    return;
  }

  if (step === 'confirm_quote') {
    if (text === 'cancel_order') {
      await resetConversation(phone);
      await sendTextMessage(phone, 'Order cancelled. Send a message anytime to order again.');
      return;
    }

    if (
      text !== 'confirm_quote' &&
      !text.toLowerCase().includes('continue') &&
      !text.toLowerCase().includes('yes')
    ) {
      await sendInteractiveButtons(
        phone,
        'Please confirm the delivery quote to continue:',
        [
          { id: 'confirm_quote', title: 'Continue' },
          { id: 'cancel_order', title: 'Cancel' },
        ]
      );
      return;
    }

    const workshopAddress = (user.profile as Record<string, unknown>)?.workshop_address;

    if (workshopAddress) {
      await setConversationState(phone, 'ordering', {
        ...context,
        step: 'confirm_address',
      });
      await sendInteractiveButtons(
        phone,
        `Deliver to: ${workshopAddress}?`,
        [
          { id: 'confirm_address', title: 'Yes, deliver here' },
          { id: 'change_address', title: 'Different address' },
        ]
      );
    } else {
      await setConversationState(phone, 'ordering', {
        ...context,
        step: 'enter_address',
      });
      await sendTextMessage(phone, 'Where should we deliver? Please send your address.');
    }
    return;
  }

  if (step === 'confirm_address') {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('yes') || lowerText.includes('confirm') || text === 'confirm_address') {
      const workshopAddress = (user.profile as Record<string, unknown>)?.workshop_address as string;
      await createOrderFromConversation(phone, user, context.items ?? [], workshopAddress, context.quote);
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

    await createOrderFromConversation(phone, user, context.items ?? [], address, context.quote);
    return;
  }
}

async function createOrderFromConversation(
  phone: string,
  user: User,
  items: OrderingItem[],
  address: string,
  quote?: WhatsAppDeliveryQuote
): Promise<void> {
  const supabase = createServiceClient();

  try {
    const resolvedQuote =
      quote ??
      (await buildWhatsAppDeliveryQuote(items.map((i) => i.description).join('; '), 0));

    const { data: rawOrderNumber } = await supabase.rpc('generate_order_number');
    const orderNumber = rawOrderNumber as string;

    const totalWeightKg = totalWeightFromItems(items);
    const deliveryFee = resolvedQuote.deliveryFee;
    const clusterId = await getDefaultClusterId();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        cluster_id: clusterId,
        status: 'confirmed',
        delivery_address: address,
        delivery_type: resolvedQuote.deliveryType,
        total_weight_kg: totalWeightKg,
        delivery_tier: resolvedQuote.tierId,
        delivery_vehicle_type: resolvedQuote.vehicleType,
        delivery_fee_breakdown: resolvedQuote.breakdown,
        subtotal: 0,
        markup_amount: 0,
        delivery_fee: deliveryFee,
        discount_amount: 0,
        total: deliveryFee,
        payment_method: 'wallet',
        payment_status: 'pending',
        source_channel: 'whatsapp',
        confirmed_at: new Date().toISOString(),
        promised_delivery_minutes: resolvedQuote.promisedMinutes,
        customer_notes: items.map((i) => i.description).join('; '),
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const typedOrder = order as unknown as { id: string };

    const orderItems = items.map((item) => ({
      order_id: typedOrder.id,
      description: item.description,
      quantity: item.quantity,
      selling_price: 0,
      weight_kg: item.weightKg ?? resolvedQuote.weight.totalWeightKg,
    }));

    await supabase.from('order_items').insert(orderItems);

    await assignRunner(typedOrder.id, clusterId);

    await resetConversation(phone);

    const tierLine = `${resolvedQuote.tierLabel} · ~${totalWeightKg} kg`;
    const feeLine = resolvedQuote.freeDeliveryApplied
      ? 'Delivery: FREE'
      : `Delivery fee: ${formatCurrency(deliveryFee)} (${tierLine})`;

    await sendTextMessage(
      phone,
      `Order placed! ${orderNumber}\n\n` +
        `Parts: ${items.map((i) => i.description).join(', ')}\n` +
        `Deliver to: ${address}\n` +
        `${feeLine}\n` +
        `Parts price will be confirmed after sourcing.\n\n` +
        `A runner is sourcing your parts now. We'll update you on progress!`
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

  await resetConversation(phone);
}

export async function startOrdering(phone: string): Promise<void> {
  await setConversationState(phone, 'ordering', { step: 'describe_parts' });
  await sendTextMessage(
    phone,
    'What parts do you need? Describe the part, vehicle make/model/year, and any other details.\n\nYou can also send a voice note or photo.'
  );
}
