import { createServiceClient } from '@/lib/supabase/service';

export type ConversationState =
  | 'idle'
  | 'registering'
  | 'ordering'
  | 'awaiting_confirmation'
  | 'awaiting_payment'
  | 'awaiting_rating'
  | 'awaiting_clarification';

export interface WhatsAppConversation {
  id: string;
  phone: string;
  user_id: string | null;
  state: ConversationState;
  context: Record<string, unknown>;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export async function getOrCreateConversation(
  phone: string
): Promise<WhatsAppConversation> {
  const supabase = createServiceClient();

  // Try to get existing conversation
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .single();

  const typedExisting = existing as WhatsAppConversation | null;
  if (typedExisting) {
    // Update last_message_at
    await supabase
      .from('whatsapp_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', typedExisting.id);

    return typedExisting;
  }

  // Create new conversation
  const { data: created, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      phone,
      state: 'idle',
      context: {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return created as unknown as WhatsAppConversation;
}

export async function setConversationState(
  phone: string,
  state: ConversationState,
  context?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();

  const update: Record<string, unknown> = {
    state,
    updated_at: new Date().toISOString(),
  };

  if (context !== undefined) {
    update.context = context;
  }

  await supabase
    .from('whatsapp_conversations')
    .update(update)
    .eq('phone', phone);
}

export async function resetConversation(phone: string): Promise<void> {
  await setConversationState(phone, 'idle', {});
}

export async function linkConversationToUser(
  phone: string,
  userId: string
): Promise<void> {
  const supabase = createServiceClient();

  await supabase
    .from('whatsapp_conversations')
    .update({
      user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('phone', phone);
}
