import { createServiceClient } from '@/lib/supabase/service';

export interface VoiceNote {
  id: string;
  phone: string;
  user_id: string | null;
  media_url: string;
  media_id: string | null;
  transcription: string | null;
  status: 'pending' | 'transcribed';
  order_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
}

export async function queueVoiceNote(
  phone: string,
  userId: string | null,
  mediaUrl: string,
  mediaId?: string
): Promise<VoiceNote> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('voice_note_queue')
    .insert({
      phone,
      user_id: userId,
      media_url: mediaUrl,
      media_id: mediaId ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to queue voice note: ${error.message}`);
  return data as unknown as VoiceNote;
}

export async function getVoiceNoteQueue(
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ voiceNotes: VoiceNote[]; total: number }> {
  const supabase = createServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('voice_note_queue')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);
  return { voiceNotes: (data ?? []) as unknown as VoiceNote[], total: count ?? 0 };
}

export async function processVoiceNote(
  voiceNoteId: string,
  transcription: string,
  adminId: string
): Promise<VoiceNote> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('voice_note_queue')
    .update({
      transcription,
      status: 'transcribed',
      processed_by: adminId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', voiceNoteId)
    .select()
    .single();

  if (error) throw new Error(`Failed to process voice note: ${error.message}`);
  return data as unknown as VoiceNote;
}
