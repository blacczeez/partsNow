import { NextRequest, NextResponse } from 'next/server';
import { verifyRiderAuth } from '@/lib/utils/rider-auth';
import { getRiderHistoryDetail } from '@/lib/services/rider';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyRiderAuth();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const delivery = await getRiderHistoryDetail(auth.user.id, id);
    return NextResponse.json({ delivery });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch delivery';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
