import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/utils/admin-auth';
import { getVoiceNoteQueue } from '@/lib/services/whatsapp/voice-note';

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await getVoiceNoteQueue(status, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get voice notes error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch voice notes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
