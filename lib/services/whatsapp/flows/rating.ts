import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage } from '@/lib/integrations/whatsapp';
import { resetConversation, type WhatsAppConversation } from '../conversation';
import type { User } from '@/lib/types/database';

export async function handleRating(
  phone: string,
  text: string,
  conversation: WhatsAppConversation,
  user: User
): Promise<void> {
  const context = conversation.context as { orderId?: string };
  const orderId = context.orderId;

  if (!orderId) {
    await resetConversation(phone);
    await sendTextMessage(phone, 'Sorry, we could not find the order to rate. Please try again.');
    return;
  }

  // Parse rating (1-5)
  const trimmed = text.trim();
  const rating = parseInt(trimmed.charAt(0), 10);

  if (isNaN(rating) || rating < 1 || rating > 5) {
    await sendTextMessage(
      phone,
      'Please reply with a number from 1 to 5:\n1 - Poor\n2 - Fair\n3 - Good\n4 - Very Good\n5 - Excellent'
    );
    return;
  }

  // Extract optional comment (everything after the number)
  const comment = trimmed.length > 1 ? trimmed.slice(1).trim().replace(/^[-–—:.\s]+/, '') : null;

  const supabase = createServiceClient();

  await supabase
    .from('orders')
    .update({
      rating,
      rating_comment: comment,
    })
    .eq('id', orderId);

  await resetConversation(phone);

  const stars = '⭐'.repeat(rating);
  let message = `Thank you for your ${stars} rating!`;
  if (rating >= 4) {
    message += ' We appreciate your support.';
  } else {
    message += ' We will work to improve your experience.';
  }

  await sendTextMessage(phone, message);
}
