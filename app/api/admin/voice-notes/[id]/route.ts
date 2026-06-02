import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { processVoiceNote } from '@/lib/services/whatsapp/voice-note';
import { z } from 'zod';

const processVoiceNoteSchema = z.object({
  transcription: z.string().min(1, 'Transcription is required'),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = processVoiceNoteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const voiceNote = await processVoiceNote(id, result.data.transcription, auth.user.id);
    return NextResponse.json(voiceNote);
  } catch (error) {
    console.error('Process voice note error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process voice note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
