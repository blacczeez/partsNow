import { sendTextMessage } from '@/lib/integrations/whatsapp';
import {
  acceptPriceChangeFromWhatsApp,
  discardPriceChangeFromWhatsApp,
} from '@/lib/services/price-review';
import type { User } from '@/lib/types/database';

export async function handlePriceChangeButton(
  phone: string,
  buttonId: string,
  user: User
): Promise<boolean> {
  const acceptMatch = buttonId.match(/^price_accept_(.+)$/);
  const discardMatch = buttonId.match(/^price_discard_(.+)$/);

  if (acceptMatch) {
    const orderId = acceptMatch[1];
    try {
      await acceptPriceChangeFromWhatsApp(user.id, orderId);
      await sendTextMessage(
        phone,
        'Got it — we are processing your approval. If any extra payment is needed, we will send a link.'
      );
    } catch (err) {
      await sendTextMessage(
        phone,
        err instanceof Error ? err.message : 'Could not accept price update. Open the order link in the app.'
      );
    }
    return true;
  }

  if (discardMatch) {
    const orderId = discardMatch[1];
    try {
      await discardPriceChangeFromWhatsApp(user.id, orderId);
      await sendTextMessage(
        phone,
        'Order cancelled. A full refund has been credited to your wallet.'
      );
    } catch (err) {
      await sendTextMessage(
        phone,
        err instanceof Error ? err.message : 'Could not cancel order. Please contact support.'
      );
    }
    return true;
  }

  return false;
}
