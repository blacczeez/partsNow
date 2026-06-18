import { createServiceClient } from '@/lib/supabase/service';
import {
  sendTextMessage,
  sendInteractiveButtons,
  type WhatsAppIncomingMessage,
} from '@/lib/integrations/whatsapp';
import { normalizePhone } from '@/lib/utils/format';
import { getOrCreateConversation, type WhatsAppConversation } from './conversation';
import { handleRegistration, startRegistration } from './flows/registration';
import { handleOrdering, handleVoiceNote, startOrdering } from './flows/ordering';
import { handleWallet, isWalletCommand } from './flows/wallet';
import { handleRating } from './flows/rating';
import { handleClarification } from './flows/clarification';
import { handlePriceChangeButton } from './flows/price-change';
import type { User } from '@/lib/types/database';

export type { WhatsAppIncomingMessage };

async function getUserById(userId: string): Promise<User | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as unknown as User;
}

async function getUserByPhone(phone: string): Promise<User | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error || !data) return null;
  return data as unknown as User;
}

export async function routeIncomingMessage(
  payload: WhatsAppIncomingMessage
): Promise<void> {
  const phone = normalizePhone(payload.waId);
  const conversation = await getOrCreateConversation(phone);

  // Resolve text from either text field or button reply
  const text = payload.buttonReply?.id ?? payload.text ?? '';

  // Get user if conversation is linked
  let user: User | null = null;
  if (conversation.user_id) {
    user = await getUserById(conversation.user_id);
  } else {
    // Try to find user by phone
    user = await getUserByPhone(phone);
    if (user) {
      // Link conversation for future messages
      const supabase = createServiceClient();
      await supabase
        .from('whatsapp_conversations')
        .update({ user_id: user.id })
        .eq('id', conversation.id);
    }
  }

  // Handle voice notes (any state)
  if (payload.type === 'audio' && payload.media) {
    await handleVoiceNote(
      phone,
      payload.media.url,
      payload.media.id,
      conversation,
      user
    );
    return;
  }

  // Route based on conversation state
  switch (conversation.state) {
    case 'registering':
      await handleRegistration(phone, text, conversation);
      return;

    case 'ordering':
    case 'awaiting_confirmation':
      if (user) {
        await handleOrdering(phone, text, conversation, user);
      } else {
        await startRegistration(phone);
      }
      return;

    case 'awaiting_rating':
      if (user) {
        await handleRating(phone, text, conversation, user);
      }
      return;

    case 'awaiting_clarification':
      if (user) {
        await handleClarification(phone, text, conversation, user);
      }
      return;

    case 'idle':
    default:
      await handleIdleMessage(phone, text, conversation, user);
      return;
  }
}

async function handleIdleMessage(
  phone: string,
  text: string,
  conversation: WhatsAppConversation,
  user: User | null
): Promise<void> {
  // No user — start registration
  if (!user) {
    await startRegistration(phone);
    return;
  }

  const lowerText = text.toLowerCase().trim();

  // Price change buttons (mechanics / any WhatsApp customer)
  if (user && (text.startsWith('price_accept_') || text.startsWith('price_discard_'))) {
    const handled = await handlePriceChangeButton(phone, text, user);
    if (handled) return;
  }

  // Check wallet commands first
  if (isWalletCommand(text)) {
    await handleWallet(phone, text, user);
    return;
  }

  // Check for order intent
  if (
    lowerText.includes('order') ||
    lowerText.includes('buy') ||
    lowerText.includes('need') ||
    lowerText.includes('part') ||
    lowerText.includes('brake') ||
    lowerText.includes('engine') ||
    lowerText.includes('filter') ||
    lowerText.includes('belt') ||
    lowerText.includes('pad')
  ) {
    await startOrdering(phone);
    return;
  }

  // Check for help/menu
  if (lowerText === 'help' || lowerText === 'menu' || lowerText === 'hi' || lowerText === 'hello') {
    await sendInteractiveButtons(
      phone,
      `Hello ${user.full_name}! How can we help you today?`,
      [
        { id: 'start_order', title: 'Order Parts' },
        { id: 'check_balance', title: 'Wallet Balance' },
        { id: 'my_orders', title: 'My Orders' },
      ]
    );
    return;
  }

  // Handle button replies from help menu
  if (text === 'start_order') {
    await startOrdering(phone);
    return;
  }

  if (text === 'check_balance') {
    await handleWallet(phone, 'balance', user);
    return;
  }

  if (text === 'my_orders') {
    await showRecentOrders(phone, user);
    return;
  }

  // Unrecognized — treat as potential order
  await startOrdering(phone);
  // Immediately process their message as a part description
  const newConversation = await getOrCreateConversation(phone);
  await handleOrdering(phone, text, newConversation, user);
}

async function showRecentOrders(phone: string, user: User): Promise<void> {
  const supabase = createServiceClient();

  const { data: rawOrders } = await supabase
    .from('orders')
    .select('order_number, status, total, created_at')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const orders = rawOrders as Array<{ order_number: string; status: string; total: number; created_at: string }> | null;

  if (!orders || orders.length === 0) {
    await sendTextMessage(phone, 'You have no orders yet. Send a part name or voice note to get started!');
    return;
  }

  const orderList = orders
    .map((o) => `${o.order_number} — ${o.status.toUpperCase()}`)
    .join('\n');

  await sendTextMessage(
    phone,
    `Your recent orders:\n\n${orderList}\n\nNeed anything else? Type "order" to place a new one.`
  );
}
