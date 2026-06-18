import { createServiceClient } from '@/lib/supabase/service';
import { sendTextMessage } from '@/lib/integrations/wati';
import {
  setConversationState,
  linkConversationToUser,
  resetConversation,
  type WhatsAppConversation,
} from '../conversation';

export async function handleRegistration(
  phone: string,
  text: string,
  conversation: WhatsAppConversation
): Promise<void> {
  const context = conversation.context as { step?: string; name?: string };
  const step = context.step ?? 'name';

  if (step === 'name') {
    const name = text.trim();
    if (name.length < 2) {
      await sendTextMessage(phone, 'Please enter your full name (at least 2 characters).');
      return;
    }

    await setConversationState(phone, 'registering', {
      step: 'address',
      name,
    });

    await sendTextMessage(
      phone,
      `Thanks, ${name}! Now please send your workshop address so we can deliver to you.`
    );
    return;
  }

  if (step === 'address') {
    const address = text.trim();
    if (address.length < 5) {
      await sendTextMessage(phone, 'Please enter a valid workshop address.');
      return;
    }

    const name = context.name!;

    // Create user and wallet
    const supabase = createServiceClient();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        phone,
        full_name: name,
        user_type: 'mechanic',
        profile: { workshop_address: address },
        loyalty_tier: 'new',
      })
      .select()
      .single();

    const user = userData as { id: string } | null;

    if (userError || !user) {
      console.error('Registration error:', userError);
      await sendTextMessage(
        phone,
        'Sorry, we had trouble creating your account. Please try again or contact support.'
      );
      await resetConversation(phone);
      return;
    }

    // Create wallet
    await supabase.from('wallets').insert({
      user_id: user.id,
      balance: 0,
      held_balance: 0,
      currency: 'NGN',
    });

    // Link conversation to user
    await linkConversationToUser(phone, user.id);
    await resetConversation(phone);

    await sendTextMessage(
      phone,
      `Welcome to PartsDey, ${name}! We run am for you.\n\nYou can now:\n- Send a voice note or text to order parts\n- Type "balance" to check your wallet\n- Type "topup" to add funds\n\nWhat parts do you need today?`
    );
  }
}

export async function startRegistration(phone: string): Promise<void> {
  await setConversationState(phone, 'registering', { step: 'name' });
  await sendTextMessage(
    phone,
    "Welcome to PartsDey! We run am for you — spare parts in 45 minutes.\n\nLet's set up your account. What's your full name?"
  );
}
